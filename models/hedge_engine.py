"""
Terminal — Hedge Engine (Futuros B3)
======================================
Calcula a economia de travar o preço via futuros de boi gordo (BGI)
na B3, comparando cenários hedged vs unhedged.

O produtor vê: "quanto eu garanto no bolso?" e "o que eu perco se
não travar?". O engine entrega esses números — sem opinião de mercado.

Princípio: Model first, AI second.
Cálculos determinísticos e auditáveis.

Classes:
    HedgeEngine: Engine principal de cálculo (stateless, puro).
    HedgeResult: Resultado completo da análise de hedge (frozen).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from models.constants import ARROBAS_POR_CONTRATO, MARGEM_GARANTIA_PCT_DEFAULT
from models.exposure_engine import LotExposure


# ---------------------------------------------------------------------------
# Dataclasses de mercado — futuros B3
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ContratoFuturo:
    """Um contrato futuro de boi gordo na B3."""
    codigo: str                     # ex: "BGIV26"
    vencimento: date                # último dia útil do mês
    preco_ajuste: float             # R$/@
    volume: int = 0                 # contratos negociados
    data_cotacao: Optional[date] = None

    def __post_init__(self):
        if self.data_cotacao is None:
            object.__setattr__(self, "data_cotacao", date.today())


@dataclass(frozen=True)
class CurvaFuturos:
    """Curva de futuros BGI — todos os vencimentos disponíveis."""
    contratos: tuple[ContratoFuturo, ...]
    timestamp: Optional[datetime] = None
    fonte: str = "manual"

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now())


# ---------------------------------------------------------------------------
# Dataclass de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class HedgeResult:
    """
    Resultado completo da análise de hedge com futuros B3.

    Compara cenários com e sem proteção, em linguagem
    que o produtor entende: receita, lucro, custo da proteção.
    """

    # --- Sizing ---
    arrobas_totais: float
    contratos_necessarios: int
    arrobas_hedgeadas: float
    cobertura_pct: float
    arrobas_descobertas: float

    # --- Pricing ---
    preco_futuro: float             # preço do contrato selecionado
    basis_estimado: float           # desconto praça local vs SP
    preco_travado: float            # preço efetivo travado (futuro - |basis|)
    preco_spot: float               # preço atual de mercado

    # --- Economia COM hedge ---
    receita_hedgeada: float
    custo_total: float
    custo_hedge: float              # custo de oportunidade da margem
    margem_hedgeada_brl: float
    margem_hedgeada_pct: float
    roi_hedgeado_anualizado: float

    # --- Economia SEM hedge (comparação) ---
    receita_spot: float
    margem_spot_brl: float
    margem_spot_pct: float
    roi_spot_anualizado: float

    # --- Trade-off ---
    preco_indiferenca: float        # spot onde hedge = não-hedge
    upside_abdicado_pct: float      # % de upside que abre mão
    downside_protegido_pct: float   # % de downside protegido

    # --- Cenários comparativos (para gráfico) ---
    cenarios_grafico: list[dict]    # [{cenario, sem_hedge, com_hedge}, ...]

    # --- Decisão ---
    margem_garantia_total: float    # R$ imobilizado como colateral
    semaforo_hedge: str             # "recomendado" | "opcional" | "desnecessario"
    justificativa: str              # frase em português para o produtor
    contrato_selecionado: ContratoFuturo


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class HedgeEngine:
    """
    Calcula a economia de hedge com futuros B3.

    Stateless — cada chamada é pura, sem efeitos colaterais.

    Uso:
        engine = HedgeEngine()
        contrato = engine.selecionar_contrato(curva, data_venda)
        result = engine.calcular(exposure, contrato, preco_spot=350.0)
    """

    # ------------------------------------------------------------------
    # Seleção de contrato
    # ------------------------------------------------------------------

    def selecionar_contrato(
        self,
        curva: CurvaFuturos,
        data_venda: date,
    ) -> ContratoFuturo | None:
        """
        Seleciona o melhor contrato futuro para o lote.

        Prioridade:
        1. Match exato do mês da venda
        2. Primeiro contrato que vence DEPOIS da data de venda
        3. Contrato mais próximo disponível (fallback)
        """
        if not curva.contratos:
            return None

        # 1. Match exato do mês
        for c in curva.contratos:
            if (c.vencimento.year == data_venda.year
                    and c.vencimento.month == data_venda.month):
                return c

        # 2. Próximo contrato após a data de venda
        futuros_apos = [
            c for c in curva.contratos if c.vencimento >= data_venda
        ]
        if futuros_apos:
            return futuros_apos[0]  # já ordenado por vencimento

        # 3. Fallback: último contrato disponível
        return curva.contratos[-1]

    # ------------------------------------------------------------------
    # Cálculo principal
    # ------------------------------------------------------------------

    def calcular(
        self,
        exposure: LotExposure,
        contrato: ContratoFuturo,
        preco_spot: float,
        basis_estimado: float = 0.0,
        cdi_anual: float = 0.1415,
        margem_garantia_pct: float = MARGEM_GARANTIA_PCT_DEFAULT,
    ) -> HedgeResult:
        """
        Calcula a economia completa de hedge vs não-hedge.

        Args:
            exposure: LotExposure do exposure_engine.
            contrato: ContratoFuturo selecionado.
            preco_spot: Preço atual da @ no mercado.
            basis_estimado: Desconto da praça local vs SP (R$/@, negativo).
            cdi_anual: CDI a.a. para custo de oportunidade.
            margem_garantia_pct: % do nocional exigido como margem.

        Returns:
            HedgeResult com comparativo completo.
        """
        arrobas = exposure.arrobas_totais
        custo = exposure.custo_total
        dias = exposure.dias_restantes
        dias_ciclo = exposure.dias_ciclo

        # --- Sizing ---
        contratos = self._calcular_contratos(arrobas)
        arrobas_hedgeadas = contratos * ARROBAS_POR_CONTRATO
        arrobas_descobertas = arrobas - arrobas_hedgeadas
        cobertura = arrobas_hedgeadas / arrobas if arrobas > 0 else 0.0

        # --- Pricing ---
        preco_travado = contrato.preco_ajuste - abs(basis_estimado)

        # --- Custo do hedge (oportunidade da margem de garantia) ---
        margem_garantia_total = (
            contrato.preco_ajuste * arrobas_hedgeadas * margem_garantia_pct
        )
        custo_hedge = self._custo_oportunidade_margem(
            margem_garantia_total, cdi_anual, dias,
        )

        # --- Economia COM hedge ---
        receita_hedgeada = (
            preco_travado * arrobas_hedgeadas
            + preco_spot * arrobas_descobertas
        )
        margem_hedge_brl = receita_hedgeada - custo - custo_hedge
        margem_hedge_pct = (
            margem_hedge_brl / receita_hedgeada if receita_hedgeada > 0 else 0.0
        )
        roi_hedge_ciclo = margem_hedge_brl / custo if custo > 0 else 0.0
        roi_hedge_anual = (
            roi_hedge_ciclo * (365 / dias_ciclo) if dias_ciclo > 0 else 0.0
        )

        # --- Economia SEM hedge ---
        receita_spot = arrobas * preco_spot
        margem_spot_brl = receita_spot - custo
        margem_spot_pct = (
            margem_spot_brl / receita_spot if receita_spot > 0 else 0.0
        )
        roi_spot_ciclo = margem_spot_brl / custo if custo > 0 else 0.0
        roi_spot_anual = (
            roi_spot_ciclo * (365 / dias_ciclo) if dias_ciclo > 0 else 0.0
        )

        # --- Trade-off ---
        preco_indiferenca = preco_travado + (
            custo_hedge / arrobas if arrobas > 0 else 0.0
        )
        upside_abdicado = (
            (preco_spot - preco_travado) / preco_spot
            if preco_spot > preco_travado else 0.0
        )
        downside_protegido = (
            (preco_spot - exposure.break_even) / preco_spot
            if preco_spot > 0 else 0.0
        )

        # --- Cenários comparativos (para gráfico) ---
        cenarios = []
        for var_pct, label in [(-0.20, "Arroba cai 20%"), (0.0, "Preço estável"), (0.20, "Arroba sobe 20%")]:
            preco_cenario = preco_spot * (1 + var_pct)
            # Sem hedge: tudo ao preço de mercado do cenário
            receita_sem = arrobas * preco_cenario
            margem_sem = receita_sem - custo
            # Com hedge: hedgeado ao preço travado, descoberto ao cenário
            receita_com = (
                preco_travado * arrobas_hedgeadas
                + preco_cenario * arrobas_descobertas
            )
            margem_com = receita_com - custo - custo_hedge
            cenarios.append({
                "cenario": label,
                "sem_hedge": round(margem_sem, 0),
                "com_hedge": round(margem_com, 0),
            })

        # --- Semáforo ---
        semaforo = self._classificar_hedge(
            exposure.break_even, preco_spot,
        )
        justificativa = self._gerar_justificativa(
            semaforo=semaforo,
            contrato=contrato,
            contratos_n=contratos,
            preco_travado=preco_travado,
            margem_hedge_brl=margem_hedge_brl,
            custo_hedge=custo_hedge,
            margem_spot_pct=margem_spot_pct,
        )

        return HedgeResult(
            arrobas_totais=round(arrobas, 1),
            contratos_necessarios=contratos,
            arrobas_hedgeadas=round(arrobas_hedgeadas, 1),
            cobertura_pct=round(cobertura, 4),
            arrobas_descobertas=round(arrobas_descobertas, 1),
            preco_futuro=round(contrato.preco_ajuste, 2),
            basis_estimado=round(basis_estimado, 2),
            preco_travado=round(preco_travado, 2),
            preco_spot=round(preco_spot, 2),
            receita_hedgeada=round(receita_hedgeada, 2),
            custo_total=round(custo, 2),
            custo_hedge=round(custo_hedge, 2),
            margem_hedgeada_brl=round(margem_hedge_brl, 2),
            margem_hedgeada_pct=round(margem_hedge_pct, 4),
            roi_hedgeado_anualizado=round(roi_hedge_anual, 4),
            receita_spot=round(receita_spot, 2),
            margem_spot_brl=round(margem_spot_brl, 2),
            margem_spot_pct=round(margem_spot_pct, 4),
            roi_spot_anualizado=round(roi_spot_anual, 4),
            preco_indiferenca=round(preco_indiferenca, 2),
            upside_abdicado_pct=round(upside_abdicado, 4),
            downside_protegido_pct=round(downside_protegido, 4),
            cenarios_grafico=cenarios,
            margem_garantia_total=round(margem_garantia_total, 2),
            semaforo_hedge=semaforo,
            justificativa=justificativa,
            contrato_selecionado=contrato,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _calcular_contratos(arrobas: float) -> int:
        """
        Calcula número de contratos necessários.

        Usa round() — não ceil() — para não criar exposição especulativa.
        Se arrobas < 165 (metade de um contrato), retorna 0.
        """
        if arrobas < ARROBAS_POR_CONTRATO / 2:
            return 0
        return round(arrobas / ARROBAS_POR_CONTRATO)

    @staticmethod
    def _custo_oportunidade_margem(
        margem_garantia: float,
        cdi_anual: float,
        dias: int,
    ) -> float:
        """Custo de oportunidade do capital imobilizado como margem."""
        if dias <= 0:
            return 0.0
        return margem_garantia * cdi_anual * (dias / 365)

    @staticmethod
    def _classificar_hedge(break_even: float, preco_spot: float) -> str:
        """
        Semáforo de proteção.

        - recomendado: margem apertada (break-even > 85% do spot)
        - desnecessario: margem gorda (break-even < 65% do spot)
        - opcional: entre os dois
        """
        if preco_spot <= 0:
            return "opcional"
        ratio = break_even / preco_spot
        if ratio > 0.85:
            return "recomendado"
        elif ratio < 0.65:
            return "desnecessario"
        return "opcional"

    @staticmethod
    def _gerar_justificativa(
        semaforo: str,
        contrato: ContratoFuturo,
        contratos_n: int,
        preco_travado: float,
        margem_hedge_brl: float,
        custo_hedge: float,
        margem_spot_pct: float,
    ) -> str:
        """Gera frase de decisão em português, linguagem de produtor."""
        if semaforo == "recomendado":
            return (
                f"Ao travar {contratos_n} contrato(s) {contrato.codigo}, "
                f"você garante R$ {margem_hedge_brl:,.0f} de lucro "
                f"mesmo que a arroba caia abaixo de R$ {preco_travado:,.0f}. "
                f"O custo dessa proteção é R$ {custo_hedge:,.0f} "
                f"(oportunidade da margem de garantia)."
            )
        elif semaforo == "desnecessario":
            return (
                f"Com margem de {margem_spot_pct * 100:.0f}%, "
                f"mesmo uma queda forte mantém seu lote no lucro. "
                f"Proteção com futuros é opcional."
            )
        else:
            return (
                f"Travar {contratos_n} contrato(s) {contrato.codigo} "
                f"garante R$ {margem_hedge_brl:,.0f} de lucro "
                f"a R$ {preco_travado:,.0f}/@. "
                f"Avalie se a proteção compensa o custo de R$ {custo_hedge:,.0f}."
            )
