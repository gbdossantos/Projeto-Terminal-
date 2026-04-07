"""
Terminal — Economic Impact Layer
==================================
Traduz exposição quantificada em impacto econômico real.

Esta é a camada que separa risk metrics (internas) de
economic impact (o que o produtor vê). O produtor nunca
vê 'exposição em arrobas' — vê 'sua margem cai de 18% para -4%'.

Recebe um LotExposure + preço de mercado e gera um report
com cenários de downside e semáforos de decisão.

Princípio: o sistema não calcula risco e depois traduz —
calcula impacto econômico diretamente.

Classes:
    ScenarioResult       — resultado de um cenário específico
    EconomicImpactReport — report completo com todos os cenários
    EconomicImpactEngine — engine de cálculo (stateless, puro)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from models.exposure_engine import LotExposure


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

# Semáforo de margem (configurável pelo produtor no futuro)
MARGEM_VERDE = 0.15       # acima de 15% → verde
MARGEM_AMARELO = 0.05     # entre 5% e 15% → amarelo
                           # abaixo de 5% → vermelho

CDI_REFERENCIA = 0.1415  # fallback — chamador deve passar o CDI real via buscar_cdi_anual()

# Cenários padrão de queda
CENARIOS_PADRAO = [0.0, -0.10, -0.20, -0.30]


# ---------------------------------------------------------------------------
# Dataclasses de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ScenarioResult:
    """
    Resultado econômico de um cenário específico de preço.

    Cada cenário responde: 'se a arroba for R$ X,
    qual é minha situação econômica neste lote?'
    """

    # Cenário
    label: str                      # "Preço atual", "Queda 10%", etc.
    variacao_pct: float             # 0.0, -0.10, -0.20, -0.30
    preco_arroba: float             # preço da @ neste cenário

    # Resultado econômico
    receita: float                  # receita bruta do lote
    custo_total: float              # custo total do lote
    margem_brl: float               # receita - custo
    margem_pct: float               # margem / receita
    roi_anualizado: float           # ROI anualizado neste cenário

    # Impacto vs cenário base
    perda_vs_base_brl: float        # quanto perde vs preço atual (R$)

    # Semáforo
    semaforo: str                   # "verde", "amarelo", "vermelho"


@dataclass(frozen=True)
class EconomicImpactReport:
    """
    Report completo de impacto econômico do lote.

    Contém os cenários de downside, o resumo do lote,
    e a 'pergunta invertida' para o painel de decisão.
    """

    # Identificação do lote
    nome: str
    sistema: str
    num_animais: int
    arrobas_totais: float
    dias_restantes: int

    # Cenário base (preço atual)
    preco_atual: float
    margem_atual_pct: float
    roi_atual: float

    # Cenários de downside
    cenarios: list[ScenarioResult] = field(default_factory=list)

    # Pergunta invertida (gerada pelo engine, não pela IA)
    pergunta_invertida: str = ""

    # Pior cenário antes de entrar no vermelho
    queda_max_antes_vermelho_pct: float = 0.0


# ---------------------------------------------------------------------------
# Engine de cálculo
# ---------------------------------------------------------------------------

class EconomicImpactEngine:
    """
    Calcula o impacto econômico de cenários de preço sobre um lote.

    Stateless — cada chamada é pura, sem efeitos colaterais.

    Uso:
        engine = EconomicImpactEngine()
        report = engine.calcular(exposure, preco_mercado=355.0)
    """

    def calcular(
        self,
        exposure: LotExposure,
        preco_mercado: float,
        cenarios_pct: list[float] | None = None,
        cdi_referencia: float = CDI_REFERENCIA,
        margem_verde: float = MARGEM_VERDE,
        margem_amarelo: float = MARGEM_AMARELO,
    ) -> EconomicImpactReport:
        """
        Calcula o impacto econômico para múltiplos cenários de preço.

        Args:
            exposure: LotExposure do exposure_engine.
            preco_mercado: Preço atual da @ (CEPEA ou manual).
            cenarios_pct: Lista de variações percentuais.
                          Default: [0%, -10%, -20%, -30%].
            cdi_referencia: CDI a.a. para comparação de ROI.
            margem_verde: Threshold de margem para semáforo verde.
            margem_amarelo: Threshold de margem para semáforo amarelo.

        Returns:
            EconomicImpactReport com cenários e pergunta invertida.
        """
        if cenarios_pct is None:
            cenarios_pct = CENARIOS_PADRAO

        arrobas = exposure.arrobas_totais
        custo = exposure.custo_total
        dias_ciclo = exposure.dias_ciclo

        # --- Calcular cada cenário ---
        resultados: list[ScenarioResult] = []
        receita_base = arrobas * preco_mercado

        for var_pct in cenarios_pct:
            preco_cenario = preco_mercado * (1 + var_pct)
            receita = arrobas * preco_cenario
            margem_brl = receita - custo
            margem_pct = margem_brl / receita if receita > 0 else 0.0
            roi_ciclo = margem_brl / custo if custo > 0 else 0.0
            roi_anual = roi_ciclo * (365 / dias_ciclo) if dias_ciclo > 0 else 0.0
            perda = receita - receita_base

            # Semáforo
            if margem_pct >= margem_verde:
                semaforo = "verde"
            elif margem_pct >= margem_amarelo:
                semaforo = "amarelo"
            else:
                semaforo = "vermelho"

            # Label
            if var_pct == 0:
                label = "Preço atual"
            else:
                label = f"Queda {abs(var_pct)*100:.0f}%"

            resultados.append(ScenarioResult(
                label=label,
                variacao_pct=var_pct,
                preco_arroba=round(preco_cenario, 2),
                receita=round(receita, 2),
                custo_total=round(custo, 2),
                margem_brl=round(margem_brl, 2),
                margem_pct=round(margem_pct, 4),
                roi_anualizado=round(roi_anual, 4),
                perda_vs_base_brl=round(perda, 2),
                semaforo=semaforo,
            ))

        # --- Cenário base ---
        base = resultados[0]

        # --- Queda máxima antes de vermelho ---
        # Encontra o % de queda exato onde margem = margem_amarelo
        # margem_pct = (arrobas * preco * (1+x) - custo) / (arrobas * preco * (1+x))
        # Resolvendo: preco_limite = custo / (arrobas * (1 - margem_amarelo))
        if arrobas > 0 and preco_mercado > 0:
            preco_limite = custo / (arrobas * (1 - margem_amarelo))
            queda_max = (preco_limite - preco_mercado) / preco_mercado
            queda_max = max(queda_max, -1.0)  # não pode cair mais que 100%
        else:
            queda_max = 0.0

        # --- Pergunta invertida ---
        # Encontra o primeiro cenário vermelho para construir a frase
        primeiro_vermelho = next(
            (c for c in resultados if c.semaforo == "vermelho"),
            None,
        )

        if primeiro_vermelho:
            pergunta = (
                f"Ao não proteger este lote, você aceita que uma queda de "
                f"{abs(primeiro_vermelho.variacao_pct)*100:.0f}% na arroba "
                f"transforme sua margem de {base.margem_pct*100:.1f}% "
                f"em {primeiro_vermelho.margem_pct*100:.1f}% "
                f"(perda de R$ {abs(primeiro_vermelho.perda_vs_base_brl):,.0f})."
            )
        else:
            pergunta = (
                f"Mesmo com queda de 30%, sua margem se mantém em "
                f"{resultados[-1].margem_pct*100:.1f}%. "
                f"Risco de preço controlado neste lote."
            )

        return EconomicImpactReport(
            nome=exposure.nome,
            sistema=exposure.sistema,
            num_animais=exposure.num_animais,
            arrobas_totais=exposure.arrobas_totais,
            dias_restantes=exposure.dias_restantes,
            preco_atual=preco_mercado,
            margem_atual_pct=round(base.margem_pct, 4),
            roi_atual=round(base.roi_anualizado, 4),
            cenarios=resultados,
            pergunta_invertida=pergunta,
            queda_max_antes_vermelho_pct=round(queda_max, 4),
        )
