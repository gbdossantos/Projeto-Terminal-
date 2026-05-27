"""
Terminal — Exposure Engine (pós-refactor fase/sistema)
========================================================
Projeta a timeline econômica de um lote de TERMINAÇÃO dia a dia.

Cobertura: apenas Fase.TERMINACAO. Cria/Recria não têm exposure path
(não produzem arrobas — output é R$/bezerro e R$/kg ganho, não R$/@).

Para cada dia do ciclo, calcula:
    - Peso projetado do animal
    - Custo acumulado até aquele dia
    - Arrobas projetadas na data de venda
    - Break-even dinâmico (que muda conforme o custo acumula)
    - Exposição em R$ ao preço de mercado

Dispatch de fórmulas por sistema vive em `parametros_sistema`. Este engine
não tem `isinstance` nem `if sistema == ...` — chama `ps.custo_diario_por_cab`
e ponto.

Convergência com cost_model_v2.calcular_terminacao: 0.00% testada.

Classes:
    DailySnapshot   — estado econômico do lote em um dia específico
    LotExposure     — exposição completa do lote com timeline
    ExposureEngine  — engine de cálculo (stateless, puro)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from models.constants import KG_POR_ARROBA
from models.production_systems import (
    Fase,
    Sistema,
    LoteInputTerminacao,
)
from models import parametros_sistema as ps


# ---------------------------------------------------------------------------
# Dataclasses de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DailySnapshot:
    """
    Estado econômico do lote em um dia específico do ciclo.

    Cada snapshot é uma foto: 'se eu vendesse hoje, qual seria minha
    situação econômica?'
    """

    dia: int                            # dia do ciclo (0 = entrada)
    data: date                          # data calendário

    # Produção
    peso_medio_kg: float
    arrobas_projetadas: float

    # Custos
    custo_acumulado: float
    custo_diario_lote: float
    custo_por_arroba: float

    # Indicador de decisão
    break_even: float


@dataclass(frozen=True)
class LotExposure:
    """
    Exposição completa de um lote de terminação.

    Pós-refactor: `fase` e `sistema` são tipados (enum), substituindo o
    `sistema: str` livre da versão anterior. `fase` é sempre Fase.TERMINACAO
    enquanto Exposure não cobre cria/recria.
    """

    # Identificação
    nome: str
    fase: Fase                       # sempre Fase.TERMINACAO
    sistema: Sistema                 # tipado (substitui str livre antigo)
    num_animais: int
    data_entrada: date
    data_venda_projetada: date
    dias_ciclo: int
    dias_restantes: int

    # Produção projetada na venda
    peso_entrada_kg: float
    peso_saida_kg: float
    rendimento_carcaca: float
    arrobas_totais: float

    # Custos consolidados na venda
    custo_reposicao: float
    custo_operacional_total: float
    custo_oportunidade: float
    custo_total: float
    custo_por_arroba: float
    break_even: float

    # Exposição ao preço
    exposicao_arrobas: float
    exposicao_brl_por_real_arroba: float

    # Timeline (1 snapshot por dia)
    timeline: list[DailySnapshot] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class ExposureEngine:
    """
    Projeta a exposição econômica de um lote de terminação ao longo do tempo.

    Stateless. Aceita apenas LoteInputTerminacao (fase=TERMINACAO).

    Uso:
        engine = ExposureEngine()
        exposure = engine.calcular(lote_terminacao)
    """

    # ------------------------------------------------------------------
    # Método público principal
    # ------------------------------------------------------------------

    def calcular(
        self,
        inp: LoteInputTerminacao,
        data_referencia: date | None = None,
    ) -> LotExposure:
        """
        Calcula a exposição completa do lote.

        Validação:
        - inp.fase deve ser Fase.TERMINACAO (já garantido no __post_init__
          do LoteInputTerminacao, mas re-validamos pra defesa em profundidade).
        """
        if inp.fase != Fase.TERMINACAO:
            raise ValueError(
                f"ExposureEngine só aceita Fase.TERMINACAO, recebeu {inp.fase}"
            )
        if data_referencia is None:
            data_referencia = date.today()

        # Parâmetros — única fonte (parametros_sistema)
        rendimento = ps.rendimento_carcaca(inp)
        custo_dia_cab = ps.custo_diario_por_cab(inp)
        custo_fixo = (
            inp.custo_frete_entrada
            + inp.custo_frete_saida
            + inp.custo_mortalidade_estimada
        )

        # Timeline dia a dia
        timeline = self._construir_timeline(
            inp=inp, rendimento=rendimento,
            custo_dia_cab=custo_dia_cab, custo_fixo=custo_fixo,
        )
        snapshot_final = timeline[-1]

        # Custo de oportunidade (base operacional pura — sem custo fixo,
        # mesma lógica do cost_model_v2 pra convergir 0.00%)
        custo_op_puro = custo_dia_cab * inp.num_animais * inp.dias_ciclo
        custo_oportunidade = self._custo_oportunidade(
            capital_base=inp.custo_reposicao_total,
            custo_operacional=custo_op_puro,
            taxa_mensal=inp.taxa_oportunidade_mensal,
            dias=inp.dias_ciclo,
        )

        custo_total = snapshot_final.custo_acumulado + custo_oportunidade

        # ⚠️ Precisão de cálculo ≠ precisão de display.
        # snapshot_final.arrobas_projetadas é round(_, 1) — display da timeline.
        # Usar isso aqui como divisor injetava ruído no custo_por_arroba quando
        # `peso × rendimento / 15` cai em dízima (ex: semiconfinamento). Bug
        # latente no engine antigo, mascarado pela tolerância 0.1% do teste
        # pré-refactor; exposto pelo critério 0.00% literal.
        # Correção: recomputar arrobas_brutas direto dos inputs, mesma fórmula
        # e ordem de operações que cost_model_v2 usa.
        arrobas = (
            inp.peso_saida_estimado_kg * rendimento / KG_POR_ARROBA * inp.num_animais
        )
        custo_por_arroba = custo_total / arrobas if arrobas > 0 else 0.0

        # Dias restantes (até data de venda)
        data_venda = inp.data_entrada + timedelta(days=inp.dias_ciclo)
        dias_restantes = max(0, (data_venda - data_referencia).days)

        return LotExposure(
            nome=inp.nome,
            fase=inp.fase,
            sistema=inp.sistema,
            num_animais=inp.num_animais,
            data_entrada=inp.data_entrada,
            data_venda_projetada=data_venda,
            dias_ciclo=inp.dias_ciclo,
            dias_restantes=dias_restantes,
            peso_entrada_kg=inp.peso_entrada_kg,
            peso_saida_kg=inp.peso_saida_estimado_kg,
            rendimento_carcaca=rendimento,
            arrobas_totais=round(arrobas, 1),
            custo_reposicao=round(inp.custo_reposicao_total, 2),
            custo_operacional_total=round(
                snapshot_final.custo_acumulado - inp.custo_reposicao_total, 2
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
    # Construção da timeline
    # ------------------------------------------------------------------

    def _construir_timeline(
        self,
        inp: LoteInputTerminacao,
        rendimento: float,
        custo_dia_cab: float,
        custo_fixo: float,
    ) -> list[DailySnapshot]:
        """
        Premissas:
            - Ganho de peso linear (GMD constante). Simplificação aceitável
              pra projeção econômica; erro marginal em custo/@.
            - Custos diários constantes (sem sazonalidade de insumo).
            - Custos fixos (frete, mortalidade) rateados linearmente no ciclo.
            - Reposição entra no dia 0 como custo afundado.
        """
        n = inp.num_animais
        dias = inp.dias_ciclo
        peso_i = inp.peso_entrada_kg
        peso_f = inp.peso_saida_estimado_kg

        if dias <= 0:
            raise ValueError(f"dias_ciclo deve ser > 0, recebeu {dias}")

        gmd = (peso_f - peso_i) / dias
        custo_diario_lote = custo_dia_cab * n
        custo_fixo_diario = custo_fixo / dias

        timeline: list[DailySnapshot] = []
        for d in range(dias + 1):
            peso_dia = peso_i + gmd * d
            arrobas = (peso_dia * rendimento / KG_POR_ARROBA) * n

            custo_op_acum = custo_diario_lote * d
            custo_fixo_acum = custo_fixo_diario * d
            custo_acum = inp.custo_reposicao_total + custo_op_acum + custo_fixo_acum

            custo_por_arroba = custo_acum / arrobas if arrobas > 0 else 0.0

            timeline.append(DailySnapshot(
                dia=d,
                data=inp.data_entrada + timedelta(days=d),
                peso_medio_kg=round(peso_dia, 1),
                arrobas_projetadas=round(arrobas, 1),
                custo_acumulado=round(custo_acum, 2),
                custo_diario_lote=round(custo_diario_lote + custo_fixo_diario, 2),
                custo_por_arroba=round(custo_por_arroba, 2),
                break_even=round(custo_por_arroba, 2),
            ))

        return timeline

    # ------------------------------------------------------------------
    # Custo de oportunidade (mesma lógica de cost_model_v2 — convergência)
    # ------------------------------------------------------------------

    @staticmethod
    def _custo_oportunidade(
        capital_base: float,
        custo_operacional: float,
        taxa_mensal: float,
        dias: int,
    ) -> float:
        """Capital operacional entra progressivamente — 50% como média."""
        capital_medio = capital_base + custo_operacional * 0.5
        meses = dias / 30
        return capital_medio * taxa_mensal * meses
