"""
Terminal — Farm Economics Engine v2
=====================================
Calcula indicadores econômicos para cada sistema produtivo,
respeitando a estrutura de custo específica de cada um.

Princípio: Model first, AI second.
Os cálculos são determinísticos e auditáveis — a IA interpreta,
nunca inventa os números.

Classes:
    FarmEconomicsV2: Engine principal de cálculo.

Dataclasses de resultado:
    ResultCria, ResultRecria, ResultTerminacaoPasto,
    ResultConfinamento, ResultSemiconfinamento, ResultCicloCompleto.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from models.production_systems import (
    InputCicloCompleto,
    InputConfinamento,
    InputCria,
    InputRecria,
    InputSemiconfinamento,
    InputTerminacaoPasto,
)


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

CDI_ANUAL_REFERENCIA = 0.12    # 12% a.a. como benchmark de custo de oportunidade
MARGEM_MINIMA_SAUDAVEL = 0.08  # abaixo de 8% → alerta de margem apertada

from models.constants import KG_POR_ARROBA


# ---------------------------------------------------------------------------
# Dataclasses de resultado — imutáveis e fortemente tipadas
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ResultCria:
    """Resultado do cálculo econômico da fase de cria."""

    nome: str
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
    custo_por_bezerro_produzido: float  # indicador central

    # Patrimônio
    capital_rebanho: float


@dataclass(frozen=True)
class ResultRecria:
    """Resultado do cálculo econômico da fase de recria."""

    nome: str
    num_animais: int
    dias_ciclo: int

    # Produção
    gmd_estimado: float             # ganho médio diário (kg/dia)
    kg_ganho_total: float

    # Custos
    custo_operacional: float
    custo_oportunidade: float
    custo_total: float
    custo_por_cabeca: float
    custo_por_kg_ganho: float       # indicador central

    # Capital
    capital_empregado: float


@dataclass(frozen=True)
class ResultTerminacaoPasto:
    """Resultado do cálculo econômico da terminação em pastagem."""

    nome: str
    num_animais: int
    dias_ciclo: int

    # Produção
    arrobas_totais: float
    gmd_estimado: float

    # Custos detalhados
    custo_reposicao: float
    custo_operacional: float
    custo_fixo: float
    custo_oportunidade: float
    custo_total: float

    # Indicadores por unidade
    custo_por_arroba: float         # indicador central
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
    exposicao_preco: float          # R$ por R$1/@ de variação
    impacto_queda_10pct: float
    impacto_queda_20pct: float

    # Alertas
    margem_apertada: bool           # margem < 8%
    roi_abaixo_cdi: bool            # ROI anualizado < 12% a.a.


@dataclass(frozen=True)
class ResultConfinamento:
    """Resultado do cálculo econômico do confinamento."""

    nome: str
    num_animais: int
    dias_ciclo: int

    # Produção
    arrobas_totais: float
    gmd_estimado: float

    # Custos detalhados
    custo_reposicao: float
    custo_dieta_total: float        # dominante — 60–70% do custo operacional
    custo_dieta_por_arroba: float
    custo_outros_operacional: float
    custo_fixo: float
    custo_oportunidade: float
    custo_total: float
    participacao_dieta_pct: float   # % do custo total que é dieta

    # Indicadores por unidade
    custo_por_arroba: float         # indicador central
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
    exposicao_preco: float
    impacto_queda_10pct: float
    impacto_queda_20pct: float

    # Alertas
    margem_apertada: bool
    roi_abaixo_cdi: bool


@dataclass(frozen=True)
class ResultSemiconfinamento:
    """Resultado do cálculo econômico do semiconfinamento."""

    nome: str
    num_animais: int
    dias_ciclo: int

    # Produção
    arrobas_totais: float
    gmd_estimado: float

    # Custos detalhados
    custo_reposicao: float
    custo_pastagem: float
    custo_suplementacao: float
    custo_suplementacao_por_arroba: float  # indicador de eficiência
    custo_outros: float
    custo_oportunidade: float
    custo_total: float

    # Indicadores por unidade
    custo_por_arroba: float         # indicador central
    break_even_price: float
    capital_empregado: float

    # Resultado financeiro
    receita_estimada: float
    margem_bruta: float
    margem_percentual: float
    roi_ciclo: float
    roi_anualizado: float

    # Análise de risco
    exposicao_preco: float
    impacto_queda_10pct: float
    impacto_queda_20pct: float

    # Alertas
    margem_apertada: bool
    roi_abaixo_cdi: bool


@dataclass(frozen=True)
class ResultCicloCompleto:
    """Resultado do cálculo econômico do ciclo completo."""

    nome: str

    # Custo por fase
    custo_fase_cria: float
    custo_fase_recria: float
    custo_fase_terminacao: float
    custo_oportunidade_total: float
    custo_total: float

    # Indicador central
    custo_por_arroba: float
    break_even_price: float

    # Comparativo com compra de bezerro
    custo_bezerro_mercado_total: float
    vantagem_producao_propria: float    # positivo = vantagem interna

    # Resultado financeiro
    arrobas_totais: float
    receita_estimada: float
    margem_bruta: float
    margem_percentual: float
    roi_ciclo: float
    roi_anualizado: float


# ---------------------------------------------------------------------------
# Engine de cálculo
# ---------------------------------------------------------------------------

class FarmEconomicsV2:
    """
    Engine principal de cálculo econômico.

    Cada método público recebe um Input* e retorna o Result* correspondente.
    Os cálculos são puros — sem efeitos colaterais, sem estado interno.

    Uso:
        engine = FarmEconomicsV2()
        resultado = engine.calcular_terminacao_pasto(lote, preco_venda=315.0)
    """

    # ------------------------------------------------------------------
    # Helpers privados
    # ------------------------------------------------------------------

    @staticmethod
    def _arrobas(peso_saida_kg: float, rendimento: float, num_animais: int) -> float:
        """Calcula arrobas totais do lote."""
        return (peso_saida_kg * rendimento / KG_POR_ARROBA) * num_animais

    @staticmethod
    def _gmd(peso_entrada: float, peso_saida: float, dias: int) -> float:
        """Calcula ganho médio diário (kg/dia)."""
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
        Calcula o custo de oportunidade do capital imobilizado.

        O capital operacional entra progressivamente (não todo no dia 1),
        por isso usa-se 50% como aproximação do capital médio investido.
        """
        capital_medio = capital_base + custo_operacional * 0.5
        meses = dias / 30
        return capital_medio * taxa_mensal * meses

    @staticmethod
    def _resultado_financeiro(
        arrobas: float,
        custo_total: float,
        capital_empregado: float,
        preco_venda: float,
        dias_ciclo: int,
    ) -> dict:
        """Calcula receita, margem e ROI padronizados."""
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
        """Calcula métricas de exposição ao risco de preço."""
        return {
            "exposicao": arrobas,
            "queda_10pct": arrobas * preco_venda * 0.10,
            "queda_20pct": arrobas * preco_venda * 0.20,
        }

    # ------------------------------------------------------------------
    # Cria
    # ------------------------------------------------------------------

    def calcular_cria(self, inp: InputCria) -> ResultCria:
        """Calcula o resultado econômico da fase de cria."""
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
            custo_por_bezerro_produzido=round(custo_total / bezerros if bezerros > 0 else 0, 2),
            capital_rebanho=round(capital_rebanho, 2),
        )

    # ------------------------------------------------------------------
    # Recria
    # ------------------------------------------------------------------

    def calcular_recria(self, inp: InputRecria) -> ResultRecria:
        """Calcula o resultado econômico da fase de recria."""
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
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            gmd_estimado=round(gmd, 3),
            kg_ganho_total=round(kg_ganho, 0),
            custo_operacional=round(custo_op, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            custo_por_cabeca=round(custo_total / inp.num_animais, 2),
            custo_por_kg_ganho=round(custo_total / kg_ganho if kg_ganho > 0 else 0, 2),
            capital_empregado=round(capital_empregado, 2),
        )

    # ------------------------------------------------------------------
    # Terminação em Pasto
    # ------------------------------------------------------------------

    def calcular_terminacao_pasto(
        self, inp: InputTerminacaoPasto, preco_venda: float
    ) -> ResultTerminacaoPasto:
        """Calcula o resultado econômico da terminação em pastagem."""
        arrobas = self._arrobas(inp.peso_saida_estimado_kg, inp.rendimento_carcaca, inp.num_animais)
        gmd = self._gmd(inp.peso_entrada_kg, inp.peso_saida_estimado_kg, inp.dias_ciclo)

        custo_diario_total = (
            inp.custo_suplementacao_dia
            + inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + inp.custo_arrendamento_dia
            + inp.outros_custos_dia
        )
        custo_op = custo_diario_total * inp.num_animais * inp.dias_ciclo
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
        fin = self._resultado_financeiro(arrobas, custo_total, capital_empregado, preco_venda, inp.dias_ciclo)
        risco = self._risco(arrobas, preco_venda)

        return ResultTerminacaoPasto(
            nome=inp.nome,
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            arrobas_totais=round(arrobas, 1),
            gmd_estimado=round(gmd, 3),
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
        )

    # ------------------------------------------------------------------
    # Confinamento
    # ------------------------------------------------------------------

    def calcular_confinamento(
        self, inp: InputConfinamento, preco_venda: float
    ) -> ResultConfinamento:
        """Calcula o resultado econômico do confinamento."""
        arrobas = self._arrobas(inp.peso_saida_estimado_kg, inp.rendimento_carcaca, inp.num_animais)
        gmd = self._gmd(inp.peso_entrada_kg, inp.peso_saida_estimado_kg, inp.dias_ciclo)

        # Dieta calculada sobre o peso médio do ciclo
        peso_medio = (inp.peso_entrada_kg + inp.peso_saida_estimado_kg) / 2
        custo_dieta_dia = peso_medio * inp.consumo_ms_pct_pv * inp.custo_dieta_kg_ms
        custo_dieta_total = custo_dieta_dia * inp.num_animais * inp.dias_ciclo

        custo_outros_dia = (
            inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + inp.custo_instalacoes_dia
            + inp.outros_custos_dia
        )
        custo_outros_op = custo_outros_dia * inp.num_animais * inp.dias_ciclo
        custo_fixo = (
            inp.custo_frete_entrada
            + inp.custo_frete_saida
            + inp.custo_mortalidade_estimada
        )

        capital_empregado = inp.custo_reposicao_total + custo_dieta_total + custo_outros_op + custo_fixo
        custo_op_capital = self._custo_oportunidade(
            inp.custo_reposicao_total, custo_dieta_total + custo_outros_op,
            inp.taxa_oportunidade_mensal, inp.dias_ciclo,
        )
        custo_total = capital_empregado + custo_op_capital

        custo_por_arroba = custo_total / arrobas if arrobas > 0 else 0.0
        participacao_dieta = custo_dieta_total / custo_total if custo_total > 0 else 0.0
        fin = self._resultado_financeiro(arrobas, custo_total, capital_empregado, preco_venda, inp.dias_ciclo)
        risco = self._risco(arrobas, preco_venda)

        return ResultConfinamento(
            nome=inp.nome,
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            arrobas_totais=round(arrobas, 1),
            gmd_estimado=round(gmd, 3),
            custo_reposicao=round(inp.custo_reposicao_total, 2),
            custo_dieta_total=round(custo_dieta_total, 2),
            custo_dieta_por_arroba=round(custo_dieta_total / arrobas if arrobas > 0 else 0, 2),
            custo_outros_operacional=round(custo_outros_op, 2),
            custo_fixo=round(custo_fixo, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            participacao_dieta_pct=round(participacao_dieta, 4),
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
        )

    # ------------------------------------------------------------------
    # Semiconfinamento
    # ------------------------------------------------------------------

    def calcular_semiconfinamento(
        self, inp: InputSemiconfinamento, preco_venda: float
    ) -> ResultSemiconfinamento:
        """Calcula o resultado econômico do semiconfinamento."""
        arrobas = self._arrobas(inp.peso_saida_estimado_kg, inp.rendimento_carcaca, inp.num_animais)
        gmd = self._gmd(inp.peso_entrada_kg, inp.peso_saida_estimado_kg, inp.dias_ciclo)

        custo_pastagem = (
            inp.custo_arrendamento_dia + inp.custo_manutencao_pasto_dia
        ) * inp.num_animais * inp.dias_ciclo

        custo_supl = (
            inp.consumo_suplemento_kg_dia * inp.custo_suplemento_kg
        ) * inp.num_animais * inp.dias_ciclo

        custo_outros = (
            inp.custo_sanidade_dia + inp.custo_mao_obra_dia + inp.outros_custos_dia
        ) * inp.num_animais * inp.dias_ciclo

        custo_fixo = (
            inp.custo_frete_entrada
            + inp.custo_frete_saida
            + inp.custo_mortalidade_estimada
        )
        capital_empregado = inp.custo_reposicao_total + custo_pastagem + custo_supl + custo_outros + custo_fixo
        custo_op_capital = self._custo_oportunidade(
            inp.custo_reposicao_total, custo_pastagem + custo_supl + custo_outros,
            inp.taxa_oportunidade_mensal, inp.dias_ciclo,
        )
        custo_total = capital_empregado + custo_op_capital

        custo_por_arroba = custo_total / arrobas if arrobas > 0 else 0.0
        fin = self._resultado_financeiro(arrobas, custo_total, capital_empregado, preco_venda, inp.dias_ciclo)
        risco = self._risco(arrobas, preco_venda)

        return ResultSemiconfinamento(
            nome=inp.nome,
            num_animais=inp.num_animais,
            dias_ciclo=inp.dias_ciclo,
            arrobas_totais=round(arrobas, 1),
            gmd_estimado=round(gmd, 3),
            custo_reposicao=round(inp.custo_reposicao_total, 2),
            custo_pastagem=round(custo_pastagem, 2),
            custo_suplementacao=round(custo_supl, 2),
            custo_suplementacao_por_arroba=round(custo_supl / arrobas if arrobas > 0 else 0, 2),
            custo_outros=round(custo_outros, 2),
            custo_oportunidade=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            custo_por_arroba=round(custo_por_arroba, 2),
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
        )

    # ------------------------------------------------------------------
    # Ciclo Completo
    # ------------------------------------------------------------------

    def calcular_ciclo_completo(
        self,
        inp: InputCicloCompleto,
        preco_venda: float,
        custo_bezerro_mercado: Optional[float] = None,
    ) -> ResultCicloCompleto:
        """Calcula o resultado econômico do ciclo completo."""
        result_cria = self.calcular_cria(inp.cria)
        num_animais = result_cria.bezerros_desmamados

        # Recria
        custo_recria_dia = (
            inp.custo_nutricao_recria_dia
            + inp.custo_sanidade_recria_dia
            + inp.custo_mao_obra_recria_dia
            + inp.custo_arrendamento_recria_dia
        )
        custo_recria = custo_recria_dia * num_animais * inp.dias_recria

        # Terminação
        custo_term_dia = (
            inp.custo_nutricao_terminacao_dia
            + inp.custo_sanidade_terminacao_dia
            + inp.custo_mao_obra_terminacao_dia
            + inp.custo_arrendamento_terminacao_dia
            + inp.outros_terminacao_dia
        )
        custo_term = custo_term_dia * num_animais * inp.dias_terminacao + inp.custo_frete_saida

        # Custo de oportunidade sobre todo o ciclo
        dias_total = inp.dias_recria + inp.dias_terminacao
        capital_base = result_cria.capital_rebanho
        custo_op_capital = self._custo_oportunidade(
            capital_base, (custo_recria + custo_term) * 0.5,
            inp.taxa_oportunidade_mensal, dias_total,
        )

        custo_total = (
            result_cria.custo_total_ano
            + custo_recria
            + custo_term
            + custo_op_capital
        )

        arrobas = self._arrobas(inp.peso_saida_terminacao_kg, inp.rendimento_carcaca, num_animais)
        receita = arrobas * preco_venda
        margem = receita - custo_total
        margem_pct = margem / receita if receita > 0 else 0.0
        roi = margem / custo_total if custo_total > 0 else 0.0
        roi_anual = roi * (365 / (365 + dias_total))

        custo_mercado_total = (custo_bezerro_mercado or 0.0) * num_animais
        vantagem = custo_mercado_total - result_cria.custo_total_ano

        return ResultCicloCompleto(
            nome=inp.nome,
            custo_fase_cria=round(result_cria.custo_total_ano, 2),
            custo_fase_recria=round(custo_recria, 2),
            custo_fase_terminacao=round(custo_term, 2),
            custo_oportunidade_total=round(custo_op_capital, 2),
            custo_total=round(custo_total, 2),
            custo_por_arroba=round(custo_total / arrobas if arrobas > 0 else 0, 2),
            break_even_price=round(custo_total / arrobas if arrobas > 0 else 0, 2),
            custo_bezerro_mercado_total=round(custo_mercado_total, 2),
            vantagem_producao_propria=round(vantagem, 2),
            arrobas_totais=round(arrobas, 1),
            receita_estimada=round(receita, 2),
            margem_bruta=round(margem, 2),
            margem_percentual=round(margem_pct, 4),
            roi_ciclo=round(roi, 4),
            roi_anualizado=round(roi_anual, 4),
        )
