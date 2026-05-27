"""
Terminal — Sistemas de Produção (v3)
======================================
Modelo de lote pós-refactor: `fase` e `sistema` são campos independentes,
ambos obrigatórios. 9 combinações no contrato; em cálculo, sistema só afeta
a estrutura de custo da fase de TERMINAÇÃO (cria/recria são sistema-agnósticas).

Estrutura:
    - Enum Fase: cria | recria | terminacao
    - Enum Sistema: pasto | semiconfinamento | confinamento
    - 3 dataclasses (frozen) — uma por fase:
        - LoteInputCria
        - LoteInputRecria
        - LoteInputTerminacao  (união sparse dos 3 sistemas antigos)

Princípio: frozen dataclasses, cálculos puros, sem side effects.
Validação: __post_init__ confirma que `fase` bate com a classe.

NOTA: "Ciclo Completo" foi REMOVIDO do modelo (briefing GB). Uma fazenda
em ciclo completo opera N lotes simultâneos em fases diferentes.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Fase(str, Enum):
    """Fase do ciclo pecuário."""
    CRIA       = "cria"
    RECRIA     = "recria"
    TERMINACAO = "terminacao"


class Sistema(str, Enum):
    """Sistema de produção (independente da fase)."""
    PASTO            = "pasto"
    SEMICONFINAMENTO = "semiconfinamento"
    CONFINAMENTO     = "confinamento"


# ---------------------------------------------------------------------------
# Constantes de domínio
# ---------------------------------------------------------------------------

TAXA_OPORTUNIDADE = 0.0108   # ~13% a.a. / 1,08% a.m.
CONSUMO_MS_PV     = 0.025    # 2,5% do peso vivo em matéria seca (referência)


# ---------------------------------------------------------------------------
# LoteInputCria — fase de cria (acasalamento ao desmame)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LoteInputCria:
    """
    Lote em fase de Cria. Produto final: bezerro desmamado (~180-210 kg).
    Indicador central: custo do bezerro produzido (R$/cabeça).

    O campo `sistema` é meta-tag pra contexto/UX/relatório — não entra em
    nenhum cálculo. Cria é estruturalmente sistema-agnóstica.
    """

    # Discriminadores (obrigatórios)
    fase: Fase                       # validado == Fase.CRIA
    sistema: Sistema

    # Identificação
    nome: str
    data_referencia: date

    # Rebanho
    num_matrizes: int
    taxa_natalidade: float           # ex: 0.80 = 80%
    taxa_desmama: float              # ex: 0.90 = 90%
    peso_desmama_kg: float

    # Custos anuais por UA
    custo_nutricao_ua_ano: float     # sal mineral + suplementação
    custo_sanidade_ua_ano: float     # vacinas + vermifugação
    custo_reproducao_ua_ano: float   # IATF + touro + material
    custo_mao_obra_ua_ano: float
    custo_arrendamento_ua_ano: float

    # Patrimônio
    valor_matriz: float              # valor médio de mercado da vaca (R$)

    # Opcionais com defaults
    outros_custos_ua_ano: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE

    def __post_init__(self):
        if self.fase != Fase.CRIA:
            raise ValueError(
                f"LoteInputCria exige fase=Fase.CRIA, recebeu {self.fase}"
            )


# ---------------------------------------------------------------------------
# LoteInputRecria — fase de recria (desmama à categoria)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LoteInputRecria:
    """
    Lote em fase de Recria. Produto: novilho pronto pra terminação (~300-380 kg).
    Indicador central: custo por kg de peso vivo ganho (R$/kg).

    `sistema` é meta-tag — não afeta cálculo. Recria é sistema-agnóstica.
    """

    fase: Fase                       # validado == Fase.RECRIA
    sistema: Sistema

    nome: str
    data_entrada: date

    num_animais: int
    peso_entrada_kg: float
    custo_aquisicao_total: float     # 0 se vem da cria própria
    dias_ciclo: int
    peso_saida_estimado_kg: float

    # Custos diários por cabeça
    custo_nutricao_dia: float        # pastagem + suplementação proteica
    custo_sanidade_dia: float
    custo_mao_obra_dia: float
    custo_arrendamento_dia: float

    # Opcionais com defaults
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE

    def __post_init__(self):
        if self.fase != Fase.RECRIA:
            raise ValueError(
                f"LoteInputRecria exige fase=Fase.RECRIA, recebeu {self.fase}"
            )


# ---------------------------------------------------------------------------
# LoteInputTerminacao — fase de terminação (engorda final)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LoteInputTerminacao:
    """
    Lote em fase de Terminação. Produto: boi gordo. Indicador: custo/@.

    `sistema` AFETA cálculo: define a estrutura de custo operacional
    (suplementacao_dia em pasto, dieta calculada em conf, suplemento+pasto
    em semi). Campos opcionais são sparse: cada sistema usa um subconjunto.

    Validação de campos requeridos por sistema acontece em
    parametros_sistema.custo_diario_por_cab — única fonte de truth.

    `rendimento_carcaca` é Optional: se None, default vem de
    parametros_sistema.RENDIMENTO_CARCACA_POR_SISTEMA[sistema].
    """

    fase: Fase                       # validado == Fase.TERMINACAO
    sistema: Sistema

    nome: str
    data_entrada: date

    # Comuns aos 3 sistemas
    num_animais: int
    peso_entrada_kg: float
    custo_reposicao_total: float
    dias_ciclo: int
    peso_saida_estimado_kg: float
    custo_sanidade_dia: float
    custo_mao_obra_dia: float

    # Sparse — específicos de PASTO
    custo_suplementacao_dia: float | None = None      # obrigatório em pasto

    # Sparse — PASTO + SEMI compartilham arrendamento_dia
    custo_arrendamento_dia: float | None = None       # pasto + semi

    # Sparse — CONFINAMENTO
    consumo_ms_pct_pv: float | None = None
    custo_dieta_kg_ms: float | None = None
    custo_instalacoes_dia: float | None = None

    # Sparse — SEMICONFINAMENTO
    custo_manutencao_pasto_dia: float | None = None
    consumo_suplemento_kg_dia: float | None = None
    custo_suplemento_kg: float | None = None

    # Opcionais (todos os sistemas)
    rendimento_carcaca: float | None = None            # default vem do lookup
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    taxa_oportunidade_mensal: float = TAXA_OPORTUNIDADE

    def __post_init__(self):
        if self.fase != Fase.TERMINACAO:
            raise ValueError(
                f"LoteInputTerminacao exige fase=Fase.TERMINACAO, recebeu {self.fase}"
            )
