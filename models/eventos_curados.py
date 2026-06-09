"""
Terminal — Registry de eventos históricos curados (simulador)
==============================================================
Eventos brasileiros marcantes dos últimos anos que moveram materialmente
arroba e/ou milho. Cada evento define sua PRÓPRIA janela em meses (decisão
GB, Portão 1 — janela por-evento, valores do card = média sobre a janela).

Canal 1 apenas (decisão GB): o evento é capturado VIA PREÇO (arroba/milho do
período). Efeitos operacionais de clima (mortalidade, performance, ciclo)
ficam fora do MVP. Cada card de evento carrega uma footnote honesta sobre isso.

Princípio: frozen dataclasses, dados imutáveis, sem side effects. Este módulo
é só o registry — o cálculo dos presets vive em models/simulador_historico.py.

MVP (decisão GB, Portão 1): apenas os 2 eventos com `mvp=True`:
  - crise_milho_lanina_2021
  - queda_arroba_2023
Os demais ficam no registry como candidatos curados (GB pode promover depois
trocando o flag — sem mexer em código de engine).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class EventoCurado:
    """Um evento histórico curado. Janela por-evento; valores = média na janela."""

    id: str
    titulo: str                              # registro seco (Bloomberg/Linear), não coloquial
    data_inicio: str                         # "YYYY-MM" — primeiro mês da janela
    janela_meses: int                        # varia por evento
    narrativa: str                           # 1-2 linhas, descritiva (§9-A: nunca prescritiva)
    expectativa: Literal["arroba", "milho", "ambos"]  # variável que o evento mais moveu
    footnote: str                            # nota honesta (Canal 1: efeito via preço)
    mvp: bool = False                        # True → entra na resposta do endpoint


# Footnote padrão para eventos de clima (Canal 1 — efeito só via preço)
_FOOTNOTE_CLIMA = (
    "Efeito climático capturado apenas via preço (arroba/milho do período). "
    "Impactos operacionais (mortalidade, performance, duração do ciclo) não "
    "entram neste cenário."
)
_FOOTNOTE_MERCADO = (
    "Cenário reconstruído a partir dos preços médios CEPEA/ESALQ (base SP) "
    "no período do evento."
)


# Ordem do registry = prioridade de curadoria. Os 2 primeiros são o MVP.
REGISTRY: tuple[EventoCurado, ...] = (
    EventoCurado(
        id="crise_milho_lanina_2021",
        titulo="Crise do Milho — La Niña 2021",
        data_inicio="2021-04",
        janela_meses=6,
        narrativa=(
            "A estiagem La Niña destruiu a safrinha 2021 do Centro-Oeste. "
            "O milho ESALQ ultrapassou R$ 95/sc, elevando o custo da dieta "
            "de confinamento em dois dígitos num único ciclo."
        ),
        expectativa="milho",
        footnote=_FOOTNOTE_CLIMA,
        mvp=True,
    ),
    EventoCurado(
        id="queda_arroba_2023",
        titulo="Queda da Arroba 2023",
        data_inicio="2023-01",
        janela_meses=5,
        narrativa=(
            "Excesso de oferta e demanda externa fraca derrubaram a arroba "
            "de patamares de R$ 290 para a casa dos R$ 260 ao longo do primeiro "
            "semestre, pressionando a margem de quem vendeu no período."
        ),
        expectativa="arroba",
        footnote=_FOOTNOTE_MERCADO,
        mvp=True,
    ),
    # ----- Candidatos curados (não-MVP) — GB pode promover trocando mvp=True -----
    EventoCurado(
        id="covid_pandemia_2020",
        titulo="COVID-19 — Choque de 2020",
        data_inicio="2020-03",
        janela_meses=6,
        narrativa=(
            "A pandemia travou turnos de frigoríficos e a exportação em março-abril; "
            "a arroba recuou e depois disparou com a retomada da demanda e o dólar alto."
        ),
        expectativa="ambos",
        footnote=_FOOTNOTE_MERCADO,
    ),
    EventoCurado(
        id="superciclo_boi_2021",
        titulo="Superciclo do Boi 2021",
        data_inicio="2021-07",
        janela_meses=5,
        narrativa=(
            "Demanda chinesa, câmbio alto e retenção de fêmeas levaram a arroba "
            "ao topo de 2021. Reposição cara nesse período descasou da saída em 2023."
        ),
        expectativa="arroba",
        footnote=_FOOTNOTE_MERCADO,
    ),
    EventoCurado(
        id="el_nino_safrinha_2023",
        titulo="El Niño — Safrinha 2023",
        data_inicio="2023-03",
        janela_meses=4,
        narrativa=(
            "O El Niño desorganizou o regime de chuvas no Sul/Centro-Oeste e "
            "pressionou o milho da safrinha 2023, com reflexo no custo de dieta."
        ),
        expectativa="milho",
        footnote=_FOOTNOTE_CLIMA,
    ),
    EventoCurado(
        id="seca_extrema_ms_2024",
        titulo="Seca Extrema MS/MT 2024",
        data_inicio="2024-08",
        janela_meses=4,
        narrativa=(
            "A pior seca registrada em MS/MT desde 1998 atingiu pastagens entre "
            "agosto e novembro de 2024; a compressão de oferta sustentou a arroba."
        ),
        expectativa="arroba",
        footnote=_FOOTNOTE_CLIMA,
    ),
)


def eventos_mvp() -> tuple[EventoCurado, ...]:
    """Eventos marcados para o MVP (até 2). Ordem = prioridade do registry."""
    return tuple(e for e in REGISTRY if e.mvp)
