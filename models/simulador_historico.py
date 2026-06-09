"""
Terminal — Simulador Histórico (engine puro)
=============================================
Núcleo do redesign do /simulador: pega um lote real de terminação e mostra
como ele se comportaria sob uma situação histórica reconhecível.

Dois geradores de presets + um núcleo de cálculo, todos puros:

  - calcular_cenario(inp, arroba, milho_brl_sc, milho_atual)  → ResultadoCenario
        Recomputa a margem do lote sob preços (arroba/milho) de um cenário.
        Quando arroba/milho == atuais, converge 0.00% com
        cost_model_v2.calcular_terminacao (teste de identidade — Fase 3).

  - gerar_presets_temporais(inp, milho_atual, hoje)  → list[HistoricoPreset]
        "Mesmo mês dos últimos anos" — até 4 anos anteriores ao atual.

  - gerar_presets_eventos(inp, milho_atual)  → list[HistoricoPreset]
        Eventos curados marcados como MVP (até 2).

Decisões de modelagem (Fase 1/2, Portão 1 — GB):
  - "Atual" de arroba = inp.preco_venda (spot do lote no contrato do frontend).
  - "Atual" de milho = cotação de mercado, injetada pela rota (milho_atual_brl_sc).
  - Sensibilidade da dieta ao milho via parametros_sistema.fator_milho_na_dieta:
        confinamento → custo_dieta_kg_ms ; semi → custo_suplemento_kg ; pasto → nada.
  - Dado ausente (mês não raspado, clima sem retorno) → indisponivel=True por card.

Princípio: frozen dataclasses, cálculos puros, sem side effects. O engine NÃO
fabrica número — preço ausente vira card indisponível (§10.6).
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date

from models.cost_model_v2 import FarmEconomicsV2
from models.production_systems import LoteInputTerminacao, Sistema
from models import parametros_sistema as ps
from models.eventos_curados import EventoCurado, eventos_mvp
from data import historico_loader as hist


_engine = FarmEconomicsV2()


# ---------------------------------------------------------------------------
# Resultados (frozen)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ResultadoCenario:
    """Saída do núcleo de cálculo de um cenário de preços."""

    margem_cenario: float        # R$/@ — valor do hero
    margem_cenario_brl: float    # R$ — margem total do lote no cenário
    margem_pct: float            # 0-1 — margem percentual
    break_even: float            # R$/@ — custo por arroba (não depende do preço)


@dataclass(frozen=True)
class HistoricoPreset:
    """Um card do simulador (temporal ou evento). Espelha o contrato do frontend."""

    id: str
    tipo: str                    # "temporal" | "evento"
    titulo: str
    periodo: str                 # rótulo opaco decidido aqui no backend
    narrativa: str | None
    arroba: float                # R$/@ do período
    milho: float                 # R$/sc 60kg do período
    precipitacao_mm: float | None
    temperatura_c: float | None
    margem_cenario: float        # R$/@ (hero)
    margem_cenario_brl: float
    margem_pct: float
    footnote: str | None
    indisponivel: bool


# Preset vazio (dado de preço ausente) — frontend trata como card de erro.
def _preset_indisponivel(
    id_: str, tipo: str, titulo: str, periodo: str,
    narrativa: str | None, footnote: str | None,
) -> HistoricoPreset:
    return HistoricoPreset(
        id=id_, tipo=tipo, titulo=titulo, periodo=periodo,
        narrativa=narrativa,
        arroba=0.0, milho=0.0,
        precipitacao_mm=None, temperatura_c=None,
        margem_cenario=0.0, margem_cenario_brl=0.0, margem_pct=0.0,
        footnote=footnote, indisponivel=True,
    )


# ---------------------------------------------------------------------------
# Núcleo de cálculo
# ---------------------------------------------------------------------------

def calcular_cenario(
    inp: LoteInputTerminacao,
    arroba: float,
    milho_brl_sc: float,
    milho_atual_brl_sc: float | None,
) -> ResultadoCenario:
    """
    Recomputa a margem do lote sob (arroba, milho) de um cenário.

    O milho entra sensibilizando o custo do insumo concentrado pelo
    fator milho-na-dieta do sistema:

        delta_milho   = milho_cenario / milho_atual - 1
        delta_custo   = delta_milho * fator_milho
        custo_insumo' = custo_insumo * (1 + delta_custo)

    Campo sensibilizado por sistema:
        confinamento → custo_dieta_kg_ms
        semi         → custo_suplemento_kg
        pasto        → nenhum (fator 0)

    Identidade (Fase 3): se milho_cenario == milho_atual (ou fator 0, ou
    milho_atual ausente), o multiplicador é exatamente 1.0 → input intacto →
    calcular_terminacao(inp, preco_venda=arroba) na íntegra.
    """
    fator = ps.fator_milho_na_dieta(inp.sistema)

    multiplicador = 1.0
    if fator > 0 and milho_atual_brl_sc and milho_atual_brl_sc > 0:
        delta_milho = (milho_brl_sc - milho_atual_brl_sc) / milho_atual_brl_sc
        multiplicador = 1.0 + delta_milho * fator

    inp_cenario = _aplicar_multiplicador_dieta(inp, multiplicador)

    result = _engine.calcular_terminacao(inp_cenario, preco_venda=arroba)

    margem_por_arroba = (
        result.margem_bruta / result.arrobas_totais
        if result.arrobas_totais > 0 else 0.0
    )
    return ResultadoCenario(
        margem_cenario=round(margem_por_arroba, 2),
        margem_cenario_brl=result.margem_bruta,
        margem_pct=result.margem_percentual,
        break_even=result.break_even_price,
    )


def _aplicar_multiplicador_dieta(
    inp: LoteInputTerminacao, multiplicador: float,
) -> LoteInputTerminacao:
    """Aplica o multiplicador de custo no campo de insumo certo por sistema."""
    if multiplicador == 1.0:
        return inp
    if inp.sistema == Sistema.CONFINAMENTO and inp.custo_dieta_kg_ms is not None:
        return replace(inp, custo_dieta_kg_ms=inp.custo_dieta_kg_ms * multiplicador)
    if inp.sistema == Sistema.SEMICONFINAMENTO and inp.custo_suplemento_kg is not None:
        return replace(inp, custo_suplemento_kg=inp.custo_suplemento_kg * multiplicador)
    return inp


# ---------------------------------------------------------------------------
# Presets temporais — "mesmo mês dos últimos anos"
# ---------------------------------------------------------------------------

_MESES_PT = (
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
)


def gerar_presets_temporais(
    inp: LoteInputTerminacao,
    milho_atual_brl_sc: float | None,
    hoje: date,
    regiao: str = "MS",
    max_cards: int = 4,
) -> list[HistoricoPreset]:
    """
    Um card por ano, para o MESMO MÊS de `hoje`, até `max_cards` anos atrás
    (anteriores ao ano corrente). Card vira indisponível se faltar arroba
    ou milho daquele mês. `regiao` mapeia clima (o dataclass de input não
    carrega região — vem do schema da rota).
    """
    arroba_serie = hist.serie_arroba()
    milho_serie = hist.serie_milho()
    mes = hoje.month
    mes_nome = _MESES_PT[mes - 1]

    presets: list[HistoricoPreset] = []
    for delta in range(1, max_cards + 1):
        ano = hoje.year - delta
        periodo = f"{mes_nome} {ano}"
        titulo = f"{mes_nome} {ano}"
        id_ = f"temporal_{ano}_{mes:02d}"

        arroba = hist.valor_mes(arroba_serie, ano, mes)
        milho = hist.valor_mes(milho_serie, ano, mes)

        if arroba is None or milho is None:
            presets.append(_preset_indisponivel(
                id_, "temporal", titulo, periodo,
                narrativa=None, footnote=None,
            ))
            continue

        precip, temp = hist.clima_janela(regiao, ano, mes, 1)
        cenario = calcular_cenario(inp, arroba, milho, milho_atual_brl_sc)

        presets.append(HistoricoPreset(
            id=id_, tipo="temporal", titulo=titulo, periodo=periodo,
            narrativa=None,
            arroba=arroba, milho=milho,
            precipitacao_mm=precip, temperatura_c=temp,
            margem_cenario=cenario.margem_cenario,
            margem_cenario_brl=cenario.margem_cenario_brl,
            margem_pct=cenario.margem_pct,
            footnote=None,
            indisponivel=False,
        ))
    return presets


# ---------------------------------------------------------------------------
# Presets de eventos curados
# ---------------------------------------------------------------------------

def gerar_presets_eventos(
    inp: LoteInputTerminacao,
    milho_atual_brl_sc: float | None,
    regiao: str = "MS",
    max_cards: int = 2,
) -> list[HistoricoPreset]:
    """
    Um card por evento MVP (até `max_cards`). Valores = média na janela
    do evento. Card indisponível se faltar a série de preços na janela.
    """
    arroba_serie = hist.serie_arroba()
    milho_serie = hist.serie_milho()

    presets: list[HistoricoPreset] = []
    for evento in eventos_mvp()[:max_cards]:
        ano, mes = _parse_mes_iso(evento.data_inicio)
        periodo = _rotulo_janela(ano, mes, evento.janela_meses)
        id_ = f"evento_{evento.id}"

        arroba = hist.media_janela(arroba_serie, ano, mes, evento.janela_meses)
        milho = hist.media_janela(milho_serie, ano, mes, evento.janela_meses)

        if arroba is None or milho is None:
            presets.append(_preset_indisponivel(
                id_, "evento", evento.titulo, periodo,
                narrativa=evento.narrativa, footnote=evento.footnote,
            ))
            continue

        precip, temp = hist.clima_janela(regiao, ano, mes, evento.janela_meses)
        cenario = calcular_cenario(inp, arroba, milho, milho_atual_brl_sc)

        presets.append(HistoricoPreset(
            id=id_, tipo="evento", titulo=evento.titulo, periodo=periodo,
            narrativa=evento.narrativa,
            arroba=arroba, milho=milho,
            precipitacao_mm=precip, temperatura_c=temp,
            margem_cenario=cenario.margem_cenario,
            margem_cenario_brl=cenario.margem_cenario_brl,
            margem_pct=cenario.margem_pct,
            footnote=evento.footnote,
            indisponivel=False,
        ))
    return presets


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_mes_iso(mes_iso: str) -> tuple[int, int]:
    ano, mes = mes_iso.split("-")
    return int(ano), int(mes)


def _rotulo_janela(ano: int, mes: int, n_meses: int) -> str:
    """Rótulo opaco da janela: 'Abr–Set 2021' ou 'Jun 2021' se 1 mês."""
    if n_meses <= 1:
        return f"{_MES_ABREV[mes - 1]} {ano}"
    y_fim, m_fim = ano, mes
    for _ in range(n_meses - 1):
        m_fim += 1
        if m_fim > 12:
            m_fim = 1
            y_fim += 1
    if y_fim == ano:
        return f"{_MES_ABREV[mes - 1]}–{_MES_ABREV[m_fim - 1]} {ano}"
    return f"{_MES_ABREV[mes - 1]}/{ano}–{_MES_ABREV[m_fim - 1]}/{y_fim}"


_MES_ABREV = (
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
)
