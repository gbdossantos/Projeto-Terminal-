"""
Terminal — Exposure Engine
============================
Projeta a timeline econômica de um lote de terminação,
transformando um snapshot estático em um filme contínuo.

Para cada dia do ciclo, calcula:
    - Peso projetado do animal
    - Custo acumulado até aquele dia
    - Arrobas projetadas na data de venda
    - Break-even dinâmico (que muda conforme o custo acumula)
    - Exposição em R$ ao preço de mercado

Consome os Inputs existentes em production_systems.py.
Não altera nem substitui o cost_model_v2 — complementa.

Princípio: o risco não é estático. Todo dia que passa, o custo
afundado aumenta e o break-even sobe. O produtor precisa ver isso.

Classes:
    DailySnapshot   — estado econômico do lote em um dia específico
    LotExposure     — exposição completa do lote com timeline
    ExposureEngine  — engine de cálculo (stateless, puro)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Union

from models.production_systems import (
    InputConfinamento,
    InputSemiconfinamento,
    InputTerminacaoPasto,
    RENDIMENTO_PASTO,
    RENDIMENTO_CONFINAMENTO,
    RENDIMENTO_SEMI,
)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

from models.constants import KG_POR_ARROBA

# Type alias para os inputs de terminação aceitos
InputTerminacao = Union[
    InputTerminacaoPasto,
    InputConfinamento,
    InputSemiconfinamento,
]


# ---------------------------------------------------------------------------
# Dataclasses de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DailySnapshot:
    """
    Estado econômico do lote em um dia específico do ciclo.

    Cada snapshot é uma foto: 'se eu vendesse hoje,
    qual seria minha situação econômica?'
    """

    dia: int                            # dia do ciclo (0 = entrada)
    data: date                          # data calendário

    # Produção
    peso_medio_kg: float                # peso médio projetado do animal
    arrobas_projetadas: float           # arrobas totais do lote na venda

    # Custos
    custo_acumulado: float              # R$ total gasto até este dia
    custo_diario_lote: float            # R$/dia do lote inteiro
    custo_por_arroba: float             # custo/@ acumulado até aqui

    # Indicadores de decisão
    break_even: float                   # preço mínimo da @ para empatar


@dataclass(frozen=True)
class LotExposure:
    """
    Exposição completa de um lote de terminação.

    Contém a timeline dia a dia e o snapshot consolidado
    na data projetada de venda.

    Este é o objeto que a Economic Impact Layer consome.
    """

    # Identificação
    nome: str
    sistema: str                        # "pasto" | "confinamento" | "semi"
    num_animais: int
    data_entrada: date
    data_venda_projetada: date
    dias_ciclo: int
    dias_restantes: int                 # dias até a venda a partir de hoje

    # Produção projetada na venda
    peso_entrada_kg: float
    peso_saida_kg: float
    rendimento_carcaca: float
    arrobas_totais: float               # arrobas na data de venda

    # Custos consolidados na venda
    custo_reposicao: float              # capital de compra dos animais
    custo_operacional_total: float      # custos diários acumulados
    custo_oportunidade: float           # custo de oportunidade do capital
    custo_total: float                  # tudo somado
    custo_por_arroba: float             # custo/@ final
    break_even: float                   # = custo_por_arroba

    # Exposição ao preço
    exposicao_arrobas: float            # = arrobas_totais
    exposicao_brl_por_real_arroba: float # R$ de impacto por R$1/@ de variação

    # Timeline completa (1 snapshot por dia)
    timeline: list[DailySnapshot] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Engine de cálculo
# ---------------------------------------------------------------------------

class ExposureEngine:
    """
    Projeta a exposição econômica de um lote de terminação ao longo do tempo.

    Stateless — cada chamada é pura, sem efeitos colaterais.

    Aceita qualquer Input de terminação (pasto, confinamento, semi)
    e retorna um LotExposure completo.

    Uso:
        engine = ExposureEngine()
        exposure = engine.calcular(lote_input)
    """

    # ------------------------------------------------------------------
    # Método público principal
    # ------------------------------------------------------------------

    def calcular(
        self,
        inp: InputTerminacao,
        data_referencia: date | None = None,
    ) -> LotExposure:
        """
        Calcula a exposição completa do lote.

        Args:
            inp: Input de qualquer sistema de terminação.
            data_referencia: Data de 'hoje' para cálculo de dias restantes.
                             Default: date.today().

        Returns:
            LotExposure com timeline e snapshot consolidado.
        """
        if data_referencia is None:
            data_referencia = date.today()

        # --- Extrair parâmetros normalizados do input ---
        params = self._normalizar_input(inp)

        # --- Construir timeline dia a dia ---
        timeline = self._construir_timeline(params)

        # --- Snapshot consolidado na data de venda ---
        snapshot_final = timeline[-1]

        # --- Custo de oportunidade (mesma base do cost_model_v2) ---
        # O v2 usa apenas custo_diário × animais × dias como base operacional,
        # excluindo custo fixo (frete, mortalidade) da base de oportunidade.
        custo_op_puro = params["custo_dia_cab"] * params["num_animais"] * params["dias_ciclo"]
        custo_oportunidade = self._custo_oportunidade(
            capital_base=params["custo_reposicao"],
            custo_operacional=custo_op_puro,
            taxa_mensal=params["taxa_oportunidade_mensal"],
            dias=params["dias_ciclo"],
        )

        custo_total = snapshot_final.custo_acumulado + custo_oportunidade
        arrobas = snapshot_final.arrobas_projetadas
        custo_por_arroba = custo_total / arrobas if arrobas > 0 else 0.0

        # --- Dias restantes ---
        data_venda = params["data_entrada"] + timedelta(days=params["dias_ciclo"])
        dias_restantes = max(0, (data_venda - data_referencia).days)

        return LotExposure(
            nome=inp.nome,
            sistema=params["sistema"],
            num_animais=params["num_animais"],
            data_entrada=params["data_entrada"],
            data_venda_projetada=data_venda,
            dias_ciclo=params["dias_ciclo"],
            dias_restantes=dias_restantes,
            peso_entrada_kg=params["peso_entrada_kg"],
            peso_saida_kg=params["peso_saida_kg"],
            rendimento_carcaca=params["rendimento"],
            arrobas_totais=round(arrobas, 1),
            custo_reposicao=round(params["custo_reposicao"], 2),
            custo_operacional_total=round(
                snapshot_final.custo_acumulado - params["custo_reposicao"], 2
            ),
            custo_oportunidade=round(custo_oportunidade, 2),
            custo_total=round(custo_total, 2),
            custo_por_arroba=round(custo_por_arroba, 2),
            break_even=round(custo_por_arroba, 2),
            exposicao_arrobas=round(arrobas, 1),
            exposicao_brl_por_real_arroba=round(arrobas, 1),
            timeline=timeline,
        )

    # ------------------------------------------------------------------
    # Normalização de inputs
    # ------------------------------------------------------------------

    def _normalizar_input(self, inp: InputTerminacao) -> dict:
        """
        Extrai parâmetros comuns de qualquer Input de terminação
        em um dict normalizado.

        Cada sistema tem estrutura de custos diferente, mas todos
        compartilham: animais, pesos, dias, rendimento, reposição.
        O custo diário por cabeça é calculado de forma específica.
        """
        if isinstance(inp, InputTerminacaoPasto):
            custo_dia_cab = (
                inp.custo_suplementacao_dia
                + inp.custo_sanidade_dia
                + inp.custo_mao_obra_dia
                + inp.custo_arrendamento_dia
                + inp.outros_custos_dia
            )
            custo_fixo = (
                inp.custo_frete_entrada
                + inp.custo_frete_saida
                + inp.custo_mortalidade_estimada
            )
            return {
                "sistema": "pasto",
                "num_animais": inp.num_animais,
                "data_entrada": inp.data_entrada,
                "peso_entrada_kg": inp.peso_entrada_kg,
                "peso_saida_kg": inp.peso_saida_estimado_kg,
                "dias_ciclo": inp.dias_ciclo,
                "rendimento": inp.rendimento_carcaca,
                "custo_reposicao": inp.custo_reposicao_total,
                "custo_dia_cab": custo_dia_cab,
                "custo_fixo": custo_fixo,
                "taxa_oportunidade_mensal": inp.taxa_oportunidade_mensal,
            }

        elif isinstance(inp, InputConfinamento):
            # Dieta calculada sobre peso médio do ciclo
            # (mesma lógica do cost_model_v2.calcular_confinamento)
            peso_medio = (inp.peso_entrada_kg + inp.peso_saida_estimado_kg) / 2
            custo_dieta_dia = peso_medio * inp.consumo_ms_pct_pv * inp.custo_dieta_kg_ms
            custo_dia_cab = (
                custo_dieta_dia
                + inp.custo_sanidade_dia
                + inp.custo_mao_obra_dia
                + inp.custo_instalacoes_dia
                + inp.outros_custos_dia
            )
            custo_fixo = (
                inp.custo_frete_entrada
                + inp.custo_frete_saida
                + inp.custo_mortalidade_estimada
            )
            return {
                "sistema": "confinamento",
                "num_animais": inp.num_animais,
                "data_entrada": inp.data_entrada,
                "peso_entrada_kg": inp.peso_entrada_kg,
                "peso_saida_kg": inp.peso_saida_estimado_kg,
                "dias_ciclo": inp.dias_ciclo,
                "rendimento": inp.rendimento_carcaca,
                "custo_reposicao": inp.custo_reposicao_total,
                "custo_dia_cab": custo_dia_cab,
                "custo_fixo": custo_fixo,
                "taxa_oportunidade_mensal": inp.taxa_oportunidade_mensal,
            }

        elif isinstance(inp, InputSemiconfinamento):
            custo_dia_cab = (
                inp.custo_arrendamento_dia
                + inp.custo_manutencao_pasto_dia
                + (inp.consumo_suplemento_kg_dia * inp.custo_suplemento_kg)
                + inp.custo_sanidade_dia
                + inp.custo_mao_obra_dia
                + inp.outros_custos_dia
            )
            custo_fixo = (
                inp.custo_frete_entrada
                + inp.custo_frete_saida
                + inp.custo_mortalidade_estimada
            )
            return {
                "sistema": "semi",
                "num_animais": inp.num_animais,
                "data_entrada": inp.data_entrada,
                "peso_entrada_kg": inp.peso_entrada_kg,
                "peso_saida_kg": inp.peso_saida_estimado_kg,
                "dias_ciclo": inp.dias_ciclo,
                "rendimento": inp.rendimento_carcaca,
                "custo_reposicao": inp.custo_reposicao_total,
                "custo_dia_cab": custo_dia_cab,
                "custo_fixo": custo_fixo,
                "taxa_oportunidade_mensal": inp.taxa_oportunidade_mensal,
            }

        else:
            raise TypeError(
                f"Input não suportado: {type(inp).__name__}. "
                "Use InputTerminacaoPasto, InputConfinamento ou InputSemiconfinamento."
            )

    # ------------------------------------------------------------------
    # Construção da timeline
    # ------------------------------------------------------------------

    def _construir_timeline(self, params: dict) -> list[DailySnapshot]:
        """
        Constrói a timeline dia a dia do lote.

        Premissas:
            - Ganho de peso linear (GMD constante ao longo do ciclo).
              Simplificação aceitável para projeção econômica — modelos
              zootécnicos mais precisos usariam curvas sigmoidais, mas
              o erro na projeção de custo/@ é marginal.
            - Custos diários constantes (sem sazonalidade de preço de insumo).
            - Custos fixos (frete, mortalidade) rateados linearmente no ciclo.
            - Reposição entra no dia 0 como custo afundado.
        """
        n = params["num_animais"]
        dias = params["dias_ciclo"]
        peso_i = params["peso_entrada_kg"]
        peso_f = params["peso_saida_kg"]
        rendimento = params["rendimento"]
        custo_repos = params["custo_reposicao"]
        custo_dia_cab = params["custo_dia_cab"]
        custo_fixo = params["custo_fixo"]
        data_entrada = params["data_entrada"]

        if dias <= 0:
            raise ValueError(f"dias_ciclo deve ser > 0, recebeu {dias}")

        gmd = (peso_f - peso_i) / dias
        custo_diario_lote = custo_dia_cab * n
        custo_fixo_diario = custo_fixo / dias

        timeline: list[DailySnapshot] = []

        for d in range(dias + 1):
            peso_dia = peso_i + gmd * d
            arrobas = (peso_dia * rendimento / KG_POR_ARROBA) * n

            # Custo acumulado: reposição (dia 0) + operacional + fixo rateado
            custo_op_acum = custo_diario_lote * d
            custo_fixo_acum = custo_fixo_diario * d
            custo_acum = custo_repos + custo_op_acum + custo_fixo_acum

            custo_por_arroba = custo_acum / arrobas if arrobas > 0 else 0.0

            timeline.append(DailySnapshot(
                dia=d,
                data=data_entrada + timedelta(days=d),
                peso_medio_kg=round(peso_dia, 1),
                arrobas_projetadas=round(arrobas, 1),
                custo_acumulado=round(custo_acum, 2),
                custo_diario_lote=round(custo_diario_lote + custo_fixo_diario, 2),
                custo_por_arroba=round(custo_por_arroba, 2),
                break_even=round(custo_por_arroba, 2),
            ))

        return timeline

    # ------------------------------------------------------------------
    # Custo de oportunidade (replica lógica do cost_model_v2)
    # ------------------------------------------------------------------

    @staticmethod
    def _custo_oportunidade(
        capital_base: float,
        custo_operacional: float,
        taxa_mensal: float,
        dias: int,
    ) -> float:
        """
        Custo de oportunidade do capital imobilizado.

        Mesma lógica do FarmEconomicsV2._custo_oportunidade:
        capital operacional entra progressivamente → usa 50% como
        aproximação do capital médio investido.
        """
        capital_medio = capital_base + custo_operacional * 0.5
        meses = dias / 30
        return capital_medio * taxa_mensal * meses
