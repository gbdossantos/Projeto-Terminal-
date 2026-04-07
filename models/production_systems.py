"""
Terminal — Sistemas de Produção
================================
Define os inputs para cada sistema produtivo da pecuária de corte.
Cada dataclass é imutável (frozen=True) e fortemente tipada.

Sistemas suportados:
    - InputCria           — vaca + bezerro até desmama
    - InputRecria         — desmame até categoria
    - InputTerminacaoPasto — engorda exclusiva em pastagem
    - InputConfinamento   — engorda intensiva em confinamento
    - InputSemiconfinamento — pasto + suplementação intensiva
    - InputCicloCompleto  — cria + recria + terminação integradas
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


# ---------------------------------------------------------------------------
# Constantes de domínio
# ---------------------------------------------------------------------------

RENDIMENTO_PASTO        = 0.52
RENDIMENTO_CONFINAMENTO = 0.54
RENDIMENTO_SEMI         = 0.53
TAXA_OPORTUNIDADE       = 0.0108   # ~13% a.a. / 1,08% a.m.
CONSUMO_MS_PV           = 0.025    # 2,5% do peso vivo em matéria seca


# ---------------------------------------------------------------------------
# Enum de sistemas produtivos
# ---------------------------------------------------------------------------

class SistemaProducao(str, Enum):
    """Sistemas produtivos reconhecidos pelo Terminal."""

    CRIA             = "cria"
    RECRIA           = "recria"
    TERMINACAO_PASTO = "terminacao_pasto"
    CONFINAMENTO     = "confinamento"
    SEMICONFINAMENTO = "semiconfinamento"
    CICLO_COMPLETO   = "ciclo_completo"


# ---------------------------------------------------------------------------
# Cria
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputCria:
    """
    Fase de cria: do acasalamento ao desmame.

    Produto final: bezerro desmamado (~180–210 kg).
    Indicador central: custo do bezerro produzido (R$/cabeça).
    """

    nome: str
    data_referencia: date

    # Rebanho
    num_matrizes: int
    taxa_natalidade: float          # ex: 0.80 = 80%
    taxa_desmama: float             # ex: 0.90 = 90%
    peso_desmama_kg: float

    # Custos anuais por UA
    custo_nutricao_ua_ano: float    # sal mineral + suplementação
    custo_sanidade_ua_ano: float    # vacinas + vermifugação
    custo_reproducao_ua_ano: float  # IATF + touro + material
    custo_mao_obra_ua_ano: float
    custo_arrendamento_ua_ano: float

    # Patrimônio
    valor_matriz: float             # valor médio de mercado da vaca (R$)

    # Opcionais com defaults
    outros_custos_ua_ano: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE


# ---------------------------------------------------------------------------
# Recria
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputRecria:
    """
    Fase de recria: do desmame até categoria.

    Produto final: novilho/novilha pronto para terminação (~300–380 kg).
    Indicador central: custo por kg de peso vivo ganho (R$/kg).
    """

    nome: str
    data_entrada: date

    num_animais: int
    peso_entrada_kg: float
    custo_aquisicao_total: float    # 0 se vem da cria própria
    dias_ciclo: int
    peso_saida_estimado_kg: float

    # Custos diários por cabeça
    custo_nutricao_dia: float       # pastagem + suplementação proteica
    custo_sanidade_dia: float
    custo_mao_obra_dia: float
    custo_arrendamento_dia: float

    # Opcionais com defaults
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE


# ---------------------------------------------------------------------------
# Terminação em Pasto
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputTerminacaoPasto:
    """
    Terminação exclusiva em pastagem.

    Produto final: boi gordo (~16–18 arrobas).
    Indicador central: custo por arroba produzida (R$/@).
    """

    nome: str
    data_entrada: date

    num_animais: int
    peso_entrada_kg: float
    custo_reposicao_total: float    # 0 se produção própria
    dias_ciclo: int
    peso_saida_estimado_kg: float

    # Custos diários por cabeça
    custo_suplementacao_dia: float  # sal mineral + proteico na seca
    custo_sanidade_dia: float
    custo_mao_obra_dia: float
    custo_arrendamento_dia: float

    # Opcionais com defaults
    rendimento_carcaca: float = RENDIMENTO_PASTO
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE


# ---------------------------------------------------------------------------
# Confinamento
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputConfinamento:
    """
    Confinamento intensivo.

    Produto final: boi gordo de alto acabamento (~18–22 arrobas).
    Indicador central: custo por arroba + participação da dieta (60–70% do custo).

    O giro rápido do capital (90–120 dias) é o principal driver de ROI.
    """

    nome: str
    data_entrada: date

    num_animais: int
    peso_entrada_kg: float
    custo_reposicao_total: float
    dias_ciclo: int                 # tipicamente 90–120 dias
    peso_saida_estimado_kg: float

    # Dieta (componente dominante do custo)
    consumo_ms_pct_pv: float        # consumo de MS como % do peso vivo
    custo_dieta_kg_ms: float        # R$ por kg de matéria seca

    # Outros custos diários por cabeça
    custo_sanidade_dia: float
    custo_mao_obra_dia: float
    custo_instalacoes_dia: float    # depreciação do confinamento

    # Opcionais com defaults
    rendimento_carcaca: float = RENDIMENTO_CONFINAMENTO
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE


# ---------------------------------------------------------------------------
# Semiconfinamento
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputSemiconfinamento:
    """
    Semiconfinamento: pastagem + suplementação volumosa/concentrada.

    Produto final: boi gordo (~17–19 arrobas).
    Indicador central: custo incremental da suplementação por arroba.
    """

    nome: str
    data_entrada: date

    num_animais: int
    peso_entrada_kg: float
    custo_reposicao_total: float
    dias_ciclo: int
    peso_saida_estimado_kg: float

    # Pastagem
    custo_arrendamento_dia: float
    custo_manutencao_pasto_dia: float   # adubação + reforma rateados

    # Suplementação
    consumo_suplemento_kg_dia: float    # kg/cab/dia
    custo_suplemento_kg: float          # R$/kg

    # Outros custos diários
    custo_sanidade_dia: float
    custo_mao_obra_dia: float

    # Opcionais com defaults
    rendimento_carcaca: float = RENDIMENTO_SEMI
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE


# ---------------------------------------------------------------------------
# Ciclo Completo
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InputCicloCompleto:
    """
    Ciclo completo: cria + recria + terminação na mesma operação.

    Produto final: boi gordo produzido do nascimento ao abate.
    Indicador central: custo total por arroba (nascimento → frigorífico).

    Permite comparar se produzir o bezerro internamente é mais eficiente
    do que comprar no mercado.
    """

    nome: str
    data_referencia: date

    # Fase cria (composição com InputCria)
    cria: InputCria

    # Fase recria
    dias_recria: int
    peso_entrada_recria_kg: float       # = peso ao desmame
    peso_saida_recria_kg: float
    custo_nutricao_recria_dia: float
    custo_sanidade_recria_dia: float
    custo_mao_obra_recria_dia: float
    custo_arrendamento_recria_dia: float

    # Fase terminação
    sistema_terminacao: str             # "pasto" | "confinamento" | "semi"
    dias_terminacao: int
    peso_entrada_terminacao_kg: float
    peso_saida_terminacao_kg: float
    custo_nutricao_terminacao_dia: float
    custo_sanidade_terminacao_dia: float
    custo_mao_obra_terminacao_dia: float
    custo_arrendamento_terminacao_dia: float

    # Opcionais com defaults
    rendimento_carcaca: float = RENDIMENTO_PASTO
    outros_terminacao_dia: float = 0.0
    custo_frete_saida: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE
