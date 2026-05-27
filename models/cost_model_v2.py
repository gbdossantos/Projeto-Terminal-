"""
Terminal — Farm Economics Engine v3 (pós-refactor fase/sistema)
=================================================================
Engine de cálculo econômico por fase.

Métodos públicos:
    calcular_cria(LoteInputCria)               -> ResultCria
    calcular_recria(LoteInputRecria)           -> ResultRecria
    calcular_terminacao(LoteInputTerminacao, preco_venda) -> ResultTerminacao

Cria e Recria são sistema-agnósticas (briefing GB — Portão 1). O campo
`sistema` no input vira apenas meta-tag no Result, sem entrar em fórmula.

Terminação tem 1 método unificado que dispatcha por `inp.sistema` via
parametros_sistema (única fonte da fórmula que varia).

Princípio: Model first, AI second. Cálculos puros, sem efeitos colaterais.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from models.constants import KG_POR_ARROBA
from models.production_systems import (
    Fase,
    Sistema,
    LoteInputCria,
    LoteInputRecria,
    LoteInputTerminacao,
)
from models import parametros_sistema as ps


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

CDI_ANUAL_REFERENCIA   = 0.12    # 12% a.a. — benchmark de custo de oportunidade
MARGEM_MINIMA_SAUDAVEL = 0.08    # margem < 8% → alerta


# ---------------------------------------------------------------------------
# Dataclasses de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ResultCria:
    """Resultado da fase de cria. Output central: custo/bezerro produzido."""

    nome: str
    fase: Fase                       # sempre Fase.CRIA
    sistema: Sistema                 # meta-tag (não afeta cálculo)
    num_matrizes: int

    # Produtividade
    bezerros_desmamados: int
    taxa_natalidade: float
    taxa_desmama: float
    peso_desmama_kg: float
    kg_produzido_por_matriz: float

    # Custos
    custo_operacional_ano: float
    custo_oportunidade: float
    custo_total_ano: float
    custo_por_matriz_ano: float
    custo_por_bezerro_produzido: float  # ← indicador central

    # Patrimônio
    capital_rebanho: float


@dataclass(frozen=True)
class ResultRecria:
    """Resultado da fase de recria. Output central: custo/kg ganho."""

    nome: str
    fase: Fase                       # sempre Fase.RECRIA
    sistema: Sistema                 # meta-tag (não afeta cálculo)
    num_animais: int
    dias_ciclo: int

    # Produção
    gmd_estimado: float              # ganho médio diário (kg/dia)
    kg_ganho_total: float

    # Custos
    custo_operacional: float
    custo_oportunidade: float
    custo_total: float
    custo_por_cabeca: float
    custo_por_kg_ganho: float        # ← indicador central

    # Capital
    capital_empregado: float


@dataclass(frozen=True)
class ResultTerminacao:
    """
    Resultado da fase de terminação — 1 dataclass unificado pros 3 sistemas.

    Breakdowns específicos por sistema vivem como Optional[float]:
      - custo_dieta_*: só CONFINAMENTO
      - custo_pastagem / custo_suplementacao_*: só SEMICONFINAMENTO
      - custo_operacional (componente único): sempre presente

    Indicadores centrais (custo/@, break-even, margem, ROI, exposicao) são
    sempre presentes, independente do sistema.
    """

    nome: str
    fase: Fase                       # sempre Fase.TERMINACAO
    sistema: Sistema                 # afeta cálculo
    num_animais: int
    dias_ciclo: int

    # Produção
    arrobas_totais: float
    gmd_estimado: float
    rendimento_carcaca: float

    # Custos — agregados (sempre presentes)
    custo_reposicao: float
    custo_operacional: float         # custo_diario × n × dias_ciclo
    custo_fixo: float                # frete entrada + saída + mortalidade
    custo_oportunidade: float
    custo_total: float

    # Indicadores
    custo_por_arroba: float          # ← indicador central
    custo_por_cabeca: float
    break_even_price: float

    # Capital
    capital_empregado: float

    # Resultado financeiro
    receita_estimada: float
    margem_bruta: float
    margem_percentual: float
    roi_ciclo: float
    roi_anualizado: float

    # Análise de risco
    exposicao_preco: float           # R$ por R$1/@ de variação
    impacto_queda_10pct: float
    impacto_queda_20pct: float

    # Alertas
    margem_apertada: bool            # margem < 8%
    roi_abaixo_cdi: bool             # ROI anualizado < CDI

    # Breakdowns sparse por sistema (Optional — None quando não aplicável)
    custo_dieta_total: Optional[float] = None              # CONFINAMENTO
    custo_dieta_por_arroba: Optional[float] = None         # CONFINAMENTO
    participacao_dieta_pct: Optional[float] = None         # CONFINAMENTO
    custo_pastagem: Optional[float] = None                 # SEMICONFINAMENTO
    custo_suplementacao: Optional[float] = None            # SEMICONFINAMENTO
    custo_suplementacao_por_arroba: Optional[float] = None # SEMICONFINAMENTO


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class FarmEconomicsV2:
    """
    Engine principal de cálculo econômico.

    Cada método é puro: recebe um LoteInput* e devolve o Result correspondente.
    Sem estado interno, sem side effects.

    Uso:
        engine = FarmEconomicsV2()
        result_cria = engine.calcular_cria(lote_cria)
        result_term = engine.calcular_terminacao(lote_term, preco_venda=315.0)
    """

    # ------------------------------------------------------------------
    # Helpers privados (puros)
    # ------------------------------------------------------------------

    @staticmethod
    def _arrobas(peso_saida_kg: float, rendimento: float, num_animais: int) -> float:
        return (peso_saida_kg * rendimento / KG_POR_ARROBA) * num_animais

    @staticmethod
    def _gmd(peso_entrada: float, peso_saida: float, dias: int) -> float:
        if dias <= 0:
            raise ValueError(f"dias_ciclo deve ser > 0, recebeu {dias}")
        return (peso_saida - peso_entrada) / dias

    @staticmethod
    def _custo_oportunidade(
        capital_base: float,
        custo_operacional: float,
        taxa_mensal: float,
        dias: int,
    ) -> float:
        """
        Capital operacional entra progressivamente — usa 50% como aproximação
        do capital médio investido (mesma fórmula do v2 anterior).
        """
        capital_medio = capital_base + custo_operacional * 0.5
        meses = dias / 30
        return capital_medio * taxa_mensal * meses

    @staticmethod
    def _resultado_financeiro(
        arrobas: float, custo_total: float, capital_empregado: float,
        preco_venda: float, dias_ciclo: int,
    ) -> dict:
        receita = arrobas * preco_venda
        margem = receita - custo_total
        margem_pct = margem / receita if receita > 0 else 0.0
        roi = margem / capital_empregado if capital_empregado > 0 else 0.0
        roi_anual = roi * (365 / dias_ciclo) if dias_ciclo > 0 else 0.0
        return {
            "receita": receita,
            "margem": margem,
            "margem_pct": margem_pct,
            "roi": roi,
            "roi_anual": roi_anual,
        }

    @staticmethod
    def _risco(arrobas: float, preco_venda: float) -> dict:
        return {
            "exposicao":  arrobas,
            "queda_10pct": arrobas * preco_venda * 0.10,
            "queda_20pct": arrobas * preco_venda * 0.20,
        }

    # ------------------------------------------------------------------
    # Cria
    # ------------------------------------------------------------------

    def calcular_cria(self, inp: LoteInputCria) -> ResultCria:
        """
        Calcula resultado da fase de cria. Sistema-agnóstico.

        Mesma fórmula do engine v2 anterior, com inp.sistema repassado
        como meta-tag pro Result.
        """
        bezerros = int(inp.num_matrizes * inp.taxa_natalidade * inp.taxa_desmama)
        ua_total = float(inp.num_matrizes)

        custo_op = (
            inp.custo_nutricao_ua_ano
            + inp.custo_sanidade_ua_ano
            + inp.custo_reproducao_ua_ano
            + inp.custo_mao_obra_ua_ano
            + inp.custo_arrendamento_ua_ano
            + inp.outros_custos_ua_ano
        ) * ua_total

        capital_rebanho = inp.num_matrizes * inp.valor_matriz
        custo_op_capital = capital_rebanho * inp.taxa_oportunidade_mensal * 12

        custo_total = custo_op + custo_op_capital
        kg_por_matriz = (bezerros * inp.peso_desmama_kg) / inp.num_matrizes

        return ResultCria(
            nome=inp.nome,
            fase=inp.fase,
            sistema=inp.sistema,
            num_matrizes=inp.num_matrizes,
            bezerros_desmamados=bezerros,
            taxa_natalidade=inp.taxa_natalidade,
            taxa_desmama=inp.taxa_desmama,
            peso_desmama_kg=inp.peso_desmama_kg,
            kg_produzido_por_matriz=round(kg_por_matriz, 1),
            custo_operacional_ano=round(custo_op, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total_ano=round(custo_total, 2),
            custo_por_matriz_ano=round(custo_total / inp.num_matrizes, 2),
            custo_por_bezerro_produzido=round(
                custo_total / bezerros if bezerros > 0 else 0, 2
            ),
            capital_rebanho=round(capital_rebanho, 2),
        )

    # ------------------------------------------------------------------
    # Recria
    # ------------------------------------------------------------------

    def calcular_recria(self, inp: LoteInputRecria) -> ResultRecria:
        """Resultado da recria. Sistema-agnóstico (`inp.sistema` só ecoa)."""
        custo_diario_total = (
            inp.custo_nutricao_dia
            + inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + inp.custo_arrendamento_dia
            + inp.outros_custos_dia
        )
        custo_op = custo_diario_total * inp.num_animais * inp.dias_ciclo
        custo_fixo = inp.custo_frete_entrada + inp.custo_frete_saida

        capital_empregado = inp.custo_aquisicao_total + custo_op + custo_fixo
        custo_op_capital = self._custo_oportunidade(
            inp.custo_aquisicao_total, custo_op,
            inp.taxa_oportunidade_mensal, inp.dias_ciclo,
        )
        custo_total = inp.custo_aquisicao_total + custo_op + custo_fixo + custo_op_capital

        kg_ganho = (inp.peso_saida_estimado_kg - inp.peso_entrada_kg) * inp.num_animais
        gmd = self._gmd(inp.peso_entrada_kg, inp.peso_saida_estimado_kg, inp.dias_ciclo)

        return ResultRecria(
            nome=inp.nome,
            fase=inp.fase,
            sistema=inp.sistema,
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            gmd_estimado=round(gmd, 3),
            kg_ganho_total=round(kg_ganho, 0),
            custo_operacional=round(custo_op, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            custo_por_cabeca=round(custo_total / inp.num_animais, 2),
            custo_por_kg_ganho=round(
                custo_total / kg_ganho if kg_ganho > 0 else 0, 2
            ),
            capital_empregado=round(capital_empregado, 2),
        )

    # ------------------------------------------------------------------
    # Terminação — unificado, dispatch interno por inp.sistema
    # ------------------------------------------------------------------

    def calcular_terminacao(
        self, inp: LoteInputTerminacao, preco_venda: float,
    ) -> ResultTerminacao:
        """
        Resultado da terminação. Dispatch interno por `inp.sistema` via
        `parametros_sistema.custo_diario_por_cab` — única fonte do que
        muda por sistema.

        Fórmulas idênticas às dos 3 métodos antigos (calcular_terminacao_pasto,
        calcular_confinamento, calcular_semiconfinamento) — convergência testada.
        """
        rendimento = ps.rendimento_carcaca(inp)
        arrobas = self._arrobas(inp.peso_saida_estimado_kg, rendimento, inp.num_animais)
        gmd = self._gmd(inp.peso_entrada_kg, inp.peso_saida_estimado_kg, inp.dias_ciclo)

        # Custo operacional via única fonte (parametros_sistema)
        custo_dia_cab = ps.custo_diario_por_cab(inp)
        custo_op = custo_dia_cab * inp.num_animais * inp.dias_ciclo

        custo_fixo = (
            inp.custo_frete_entrada
            + inp.custo_frete_saida
            + inp.custo_mortalidade_estimada
        )
        capital_empregado = inp.custo_reposicao_total + custo_op + custo_fixo
        custo_op_capital = self._custo_oportunidade(
            inp.custo_reposicao_total, custo_op,
            inp.taxa_oportunidade_mensal, inp.dias_ciclo,
        )
        custo_total = inp.custo_reposicao_total + custo_op + custo_fixo + custo_op_capital

        custo_por_arroba = custo_total / arrobas if arrobas > 0 else 0.0
        fin = self._resultado_financeiro(
            arrobas, custo_total, capital_empregado, preco_venda, inp.dias_ciclo,
        )
        risco = self._risco(arrobas, preco_venda)

        # Breakdowns sparse por sistema (None quando não aplicável)
        custo_dieta_total = None
        custo_dieta_por_arroba = None
        participacao_dieta = None
        custo_pastagem = None
        custo_suplementacao = None
        custo_suplementacao_por_arroba = None

        if inp.sistema == Sistema.CONFINAMENTO:
            custo_dieta_total = ps.custo_dieta_total_confinamento(inp)
            custo_dieta_por_arroba = (
                custo_dieta_total / arrobas if arrobas > 0 else 0.0
            )
            participacao_dieta = (
                custo_dieta_total / custo_total if custo_total > 0 else 0.0
            )

        elif inp.sistema == Sistema.SEMICONFINAMENTO:
            custo_pastagem = ps.custo_pastagem_total_semi(inp)
            custo_suplementacao = ps.custo_suplementacao_total_semi(inp)
            custo_suplementacao_por_arroba = (
                custo_suplementacao / arrobas if arrobas > 0 else 0.0
            )

        return ResultTerminacao(
            nome=inp.nome,
            fase=inp.fase,
            sistema=inp.sistema,
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            arrobas_totais=round(arrobas, 1),
            gmd_estimado=round(gmd, 3),
            rendimento_carcaca=round(rendimento, 4),
            custo_reposicao=round(inp.custo_reposicao_total, 2),
            custo_operacional=round(custo_op, 2),
            custo_fixo=round(custo_fixo, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            custo_por_arroba=round(custo_por_arroba, 2),
            custo_por_cabeca=round(custo_total / inp.num_animais, 2),
            break_even_price=round(custo_por_arroba, 2),
            capital_empregado=round(capital_empregado, 2),
            receita_estimada=round(fin["receita"], 2),
            margem_bruta=round(fin["margem"], 2),
            margem_percentual=round(fin["margem_pct"], 4),
            roi_ciclo=round(fin["roi"], 4),
            roi_anualizado=round(fin["roi_anual"], 4),
            exposicao_preco=round(risco["exposicao"], 1),
            impacto_queda_10pct=round(risco["queda_10pct"], 2),
            impacto_queda_20pct=round(risco["queda_20pct"], 2),
            margem_apertada=fin["margem_pct"] < MARGEM_MINIMA_SAUDAVEL,
            roi_abaixo_cdi=fin["roi_anual"] < CDI_ANUAL_REFERENCIA,
            custo_dieta_total=(
                round(custo_dieta_total, 2) if custo_dieta_total is not None else None
            ),
            custo_dieta_por_arroba=(
                round(custo_dieta_por_arroba, 2)
                if custo_dieta_por_arroba is not None else None
            ),
            participacao_dieta_pct=(
                round(participacao_dieta, 4)
                if participacao_dieta is not None else None
            ),
            custo_pastagem=(
                round(custo_pastagem, 2) if custo_pastagem is not None else None
            ),
            custo_suplementacao=(
                round(custo_suplementacao, 2)
                if custo_suplementacao is not None else None
            ),
            custo_suplementacao_por_arroba=(
                round(custo_suplementacao_por_arroba, 2)
                if custo_suplementacao_por_arroba is not None else None
            ),
        )
