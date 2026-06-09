"""
Terminal — Parâmetros e fórmulas por sistema (terminação)
===========================================================
Tabela central + funções de lookup pra tudo que varia por `Sistema`
dentro da fase de TERMINAÇÃO. Substitui os 3 ramos `isinstance` que
viviam no exposure_engine e o dispatch implícito por método separado
que vivia no cost_model_v2.

Cria e Recria são sistema-agnósticas por decisão (briefing GB, Portão 1).
Não há lookup pra elas neste módulo.

Princípio: única fonte de verdade pra "o que muda por sistema". Engines
chamam essas funções; não embutem nenhuma constante de sistema interna.
"""

from __future__ import annotations

from models.production_systems import LoteInputTerminacao, Sistema


# ---------------------------------------------------------------------------
# Constantes que variam por sistema
# ---------------------------------------------------------------------------

# Rendimento de carcaça — usado quando LoteInputTerminacao.rendimento_carcaca é None
RENDIMENTO_CARCACA_POR_SISTEMA: dict[Sistema, float] = {
    Sistema.PASTO:            0.52,
    Sistema.SEMICONFINAMENTO: 0.53,
    Sistema.CONFINAMENTO:     0.54,
}


# ---------------------------------------------------------------------------
# Fator milho-na-dieta — sensibilidade do custo do insumo ao preço do milho
# ---------------------------------------------------------------------------
#
# Fração do custo unitário do insumo energético/concentrado determinada pelo
# preço do milho. Usado pelo simulador histórico para projetar o custo de
# dieta sob um preço de milho diferente do atual:
#
#     delta_custo_insumo = (milho_cenario / milho_atual - 1) * fator
#
# Valores aprovados na Fase 1 (Portão 1, GB). Ancorados em:
#   - CONFINAMENTO 0.55: ração de terminação ~70-80% concentrado, do qual o
#     milho grão é ~55-65% do custo. EMBRAPA Gado de Corte (Sistema de Produção 1);
#     referência ABIEC/JBS de custo de confinamento 2022-2023. Range 0.45-0.65.
#   - SEMICONFINAMENTO 0.45: suplemento concentrado ~35-55% milho por custo.
#     EMBRAPA Gado de Corte (Circular Técnica 14); Scot Consultoria. Range 0.35-0.55.
#   - PASTO 0.0: suplementação é proteico-mineral (ureia + sal), sem milho
#     energético na definição padrão de pasto extensivo. EMBRAPA Circular Técnica 37.
#
# ►►► PONTO DE AJUSTE: GB pode revisar estes valores sem tocar em engine. ◄◄◄
FATOR_MILHO_NA_DIETA: dict[Sistema, float] = {
    Sistema.PASTO:            0.00,
    Sistema.SEMICONFINAMENTO: 0.45,
    Sistema.CONFINAMENTO:     0.55,
}


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

def rendimento_carcaca(inp: LoteInputTerminacao) -> float:
    """
    Resolve o rendimento de carcaça do lote.

    Se `inp.rendimento_carcaca` foi fornecido explicitamente, usa ele.
    Caso contrário, default do sistema.
    """
    if inp.rendimento_carcaca is not None:
        return inp.rendimento_carcaca
    return RENDIMENTO_CARCACA_POR_SISTEMA[inp.sistema]


def fator_milho_na_dieta(sistema: Sistema) -> float:
    """
    Fração do custo do insumo concentrado/energético atribuível ao milho.

    Usado pelo simulador histórico para sensibilizar o custo da dieta ao
    preço do milho de um período. Pasto retorna 0.0 (sem milho na fórmula).
    Ver FATOR_MILHO_NA_DIETA para fontes e ranges.
    """
    return FATOR_MILHO_NA_DIETA[sistema]


# ---------------------------------------------------------------------------
# Validação por sistema — campos requeridos
# ---------------------------------------------------------------------------

# Mapa sistema → lista de campos obrigatórios (além dos comuns).
# Campos comuns (num_animais, peso_entrada_kg, peso_saida_estimado_kg, dias_ciclo,
# custo_reposicao_total, custo_sanidade_dia, custo_mao_obra_dia) já são
# obrigatórios estruturalmente no dataclass; aqui validamos só os sparse.
_CAMPOS_REQUERIDOS: dict[Sistema, tuple[str, ...]] = {
    Sistema.PASTO: (
        "custo_suplementacao_dia",
        "custo_arrendamento_dia",
    ),
    Sistema.CONFINAMENTO: (
        "consumo_ms_pct_pv",
        "custo_dieta_kg_ms",
        "custo_instalacoes_dia",
    ),
    Sistema.SEMICONFINAMENTO: (
        "custo_arrendamento_dia",
        "custo_manutencao_pasto_dia",
        "consumo_suplemento_kg_dia",
        "custo_suplemento_kg",
    ),
}


def validar_campos_sistema(inp: LoteInputTerminacao) -> None:
    """
    Confirma que o lote tem todos os campos sparse exigidos pelo seu sistema.
    Lança ValueError com mensagem específica se faltar.
    """
    faltando = []
    for campo in _CAMPOS_REQUERIDOS[inp.sistema]:
        if getattr(inp, campo) is None:
            faltando.append(campo)
    if faltando:
        raise ValueError(
            f"LoteInputTerminacao(sistema={inp.sistema.value}) "
            f"exige os campos: {', '.join(faltando)}"
        )


# ---------------------------------------------------------------------------
# Custo operacional diário por cabeça — dispatch por sistema
# ---------------------------------------------------------------------------

def custo_diario_por_cab(inp: LoteInputTerminacao) -> float:
    """
    Calcula o custo operacional R$/cab/dia conforme o sistema do lote.

    Esta é a ÚNICA função onde a fórmula de custo dispatcha por sistema.
    Tanto cost_model_v2 quanto exposure_engine consomem daqui — garante
    convergência 0.00% (mesma fonte numérica).

    Pasto: suplementação + sanidade + mao_obra + arrendamento + outros
    Confinamento: dieta_calculada + sanidade + mao_obra + instalacoes + outros
    Semi: arrendamento + manutencao_pasto + suplemento + sanidade + mao_obra + outros

    No confinamento a dieta é dinâmica: peso médio do ciclo × consumo MS% PV × custo/kg MS.
    Isso é único do confinamento — pasto e semi têm custo fixo por dia.
    """
    validar_campos_sistema(inp)

    if inp.sistema == Sistema.PASTO:
        return (
            (inp.custo_suplementacao_dia or 0.0)
            + inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + (inp.custo_arrendamento_dia or 0.0)
            + inp.outros_custos_dia
        )

    if inp.sistema == Sistema.CONFINAMENTO:
        peso_medio = (inp.peso_entrada_kg + inp.peso_saida_estimado_kg) / 2
        custo_dieta_dia = (
            peso_medio
            * (inp.consumo_ms_pct_pv or 0.0)
            * (inp.custo_dieta_kg_ms or 0.0)
        )
        return (
            custo_dieta_dia
            + inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + (inp.custo_instalacoes_dia or 0.0)
            + inp.outros_custos_dia
        )

    if inp.sistema == Sistema.SEMICONFINAMENTO:
        custo_suplemento_dia = (
            (inp.consumo_suplemento_kg_dia or 0.0)
            * (inp.custo_suplemento_kg or 0.0)
        )
        return (
            (inp.custo_arrendamento_dia or 0.0)
            + (inp.custo_manutencao_pasto_dia or 0.0)
            + custo_suplemento_dia
            + inp.custo_sanidade_dia
            + inp.custo_mao_obra_dia
            + inp.outros_custos_dia
        )

    raise ValueError(f"Sistema não suportado: {inp.sistema}")


# ---------------------------------------------------------------------------
# Breakdown de custos por componente (pra Result detalhado)
# ---------------------------------------------------------------------------

def custo_dieta_total_confinamento(inp: LoteInputTerminacao) -> float:
    """
    Custo total da dieta no ciclo inteiro do lote (só faz sentido em CONFINAMENTO).

    Devolve 0 se sistema != CONFINAMENTO. Usado pelo cost_model_v2 pra preencher
    o breakdown `custo_dieta_total` / `participacao_dieta_pct` do ResultTerminacao.
    """
    if inp.sistema != Sistema.CONFINAMENTO:
        return 0.0
    peso_medio = (inp.peso_entrada_kg + inp.peso_saida_estimado_kg) / 2
    custo_dieta_dia = (
        peso_medio
        * (inp.consumo_ms_pct_pv or 0.0)
        * (inp.custo_dieta_kg_ms or 0.0)
    )
    return custo_dieta_dia * inp.num_animais * inp.dias_ciclo


def custo_pastagem_total_semi(inp: LoteInputTerminacao) -> float:
    """
    Custo total da pastagem (arrendamento + manutenção) no ciclo (só em SEMI).
    Devolve 0 se sistema != SEMICONFINAMENTO.
    """
    if inp.sistema != Sistema.SEMICONFINAMENTO:
        return 0.0
    return (
        ((inp.custo_arrendamento_dia or 0.0) + (inp.custo_manutencao_pasto_dia or 0.0))
        * inp.num_animais
        * inp.dias_ciclo
    )


def custo_suplementacao_total_semi(inp: LoteInputTerminacao) -> float:
    """
    Custo total do suplemento concentrado no ciclo (só em SEMI).
    Devolve 0 se sistema != SEMICONFINAMENTO.
    """
    if inp.sistema != Sistema.SEMICONFINAMENTO:
        return 0.0
    return (
        (inp.consumo_suplemento_kg_dia or 0.0)
        * (inp.custo_suplemento_kg or 0.0)
        * inp.num_animais
        * inp.dias_ciclo
    )
