"""
Terminal — Loader de série histórica + clima (simulador histórico)
===================================================================
Duas responsabilidades, ambas read-only:

  1. Série mensal de arroba/milho — lê os CSV commitados em data/historico/
     (gerados por scripts/gerar_historico_cepea.py a partir do CEPEA SP).
     NUNCA puxa o CEPEA em runtime (bloqueio de IP em cloud — ver CLAUDE.md).

  2. Clima histórico (precipitação/temperatura) — Open-Meteo Archive API
     (ERA5, gratuita, sem chave). Mapeamento região → coordenadas da capital/
     polo pecuário (decisão Fase 1, Portão 1).

Princípio: funções puras de fetch/leitura. Dado ausente → None (nunca
fabricado). O engine traduz None em `indisponivel`/erro tipado (§10.6).
"""

from __future__ import annotations

import csv
import logging
import os
import statistics
from functools import lru_cache

import requests

logger = logging.getLogger(__name__)

_HISTORICO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "historico")

ARQUIVO_ARROBA = os.path.join(_HISTORICO_DIR, "cepea_arroba.csv")
ARQUIVO_MILHO = os.path.join(_HISTORICO_DIR, "cepea_milho.csv")

_TIMEOUT = 12


# ---------------------------------------------------------------------------
# Série mensal de preços (CSV no repo)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=4)
def _carregar_csv(caminho: str) -> dict[str, float]:
    """Lê {mes_iso: valor_brl} de um CSV (mes_iso,valor_brl). Cacheado em memória."""
    serie: dict[str, float] = {}
    try:
        with open(caminho, newline="", encoding="utf-8") as f:
            for linha in csv.DictReader(f):
                try:
                    serie[linha["mes_iso"]] = float(linha["valor_brl"])
                except (KeyError, ValueError):
                    continue
    except FileNotFoundError:
        logger.error("Série histórica ausente: %s", caminho)
    return serie


def serie_arroba() -> dict[str, float]:
    """Série mensal da arroba (R$/@, CEPEA/ESALQ SP). {mes_iso: valor}."""
    return _carregar_csv(ARQUIVO_ARROBA)


def serie_milho() -> dict[str, float]:
    """Série mensal do milho (R$/sc 60kg, ESALQ SP). {mes_iso: valor}."""
    return _carregar_csv(ARQUIVO_MILHO)


def media_janela(serie: dict[str, float], ano: int, mes: int, n_meses: int) -> float | None:
    """
    Média da série sobre uma janela de `n_meses` a partir de (ano, mes).

    Devolve None se NENHUM mês da janela existir na série (dado ausente →
    o engine marca o card como indisponível). Meses faltantes individuais
    são simplesmente omitidos da média (janela parcial é aceitável).
    """
    valores: list[float] = []
    y, m = ano, mes
    for _ in range(n_meses):
        chave = f"{y}-{m:02d}"
        if chave in serie:
            valores.append(serie[chave])
        m += 1
        if m > 12:
            m = 1
            y += 1
    if not valores:
        return None
    return round(statistics.mean(valores), 2)


def valor_mes(serie: dict[str, float], ano: int, mes: int) -> float | None:
    """Valor de um mês específico. None se ausente."""
    return serie.get(f"{ano}-{mes:02d}")


# ---------------------------------------------------------------------------
# Clima histórico — Open-Meteo Archive (ERA5)
# ---------------------------------------------------------------------------

# Região (basis) → (lat, lon) da capital/polo pecuário. Default: MS.
# Decisão Fase 1, Portão 1 (aprovada GB).
COORDENADAS_REGIAO: dict[str, tuple[float, float]] = {
    "MS": (-20.4697, -54.6201),   # Campo Grande
    "MT": (-12.6819, -56.9211),   # Sorriso
    "GO": (-16.6869, -49.2648),   # Goiânia
    "MG": (-18.5122, -44.5550),   # Sete Lagoas
    "PA": (-3.1191, -52.2099),    # Redenção
    "TO": (-10.2128, -48.3598),   # Palmas
    "RO": (-11.5057, -61.9982),   # Vilhena
}
_COORD_DEFAULT = COORDENADAS_REGIAO["MS"]


def coordenadas(regiao: str) -> tuple[float, float]:
    """(lat, lon) de referência da região. Default MS se não mapeada."""
    return COORDENADAS_REGIAO.get((regiao or "").upper().strip(), _COORD_DEFAULT)


@lru_cache(maxsize=256)
def clima_janela(
    regiao: str, ano: int, mes: int, n_meses: int,
) -> tuple[float | None, float | None]:
    """
    Clima médio na janela: (precipitacao_mm, temperatura_c).

    precipitacao_mm = soma mensal média (mm/mês), temperatura_c = média do
    período. Qualquer falha de fonte ou ausência de dado → (None, None) —
    o card trata por precipitacao_mm/temperatura_c nulos (entrega sem
    disclaimer, ou oculta). NUNCA valor fabricado.
    """
    lat, lon = coordenadas(regiao)

    # Janela de datas (primeiro dia do mês inicial → último dia do mês final)
    y_ini, m_ini = ano, mes
    y_fim, m_fim = ano, mes
    for _ in range(n_meses - 1):
        m_fim += 1
        if m_fim > 12:
            m_fim = 1
            y_fim += 1
    ultimo_dia = _ultimo_dia_mes(y_fim, m_fim)
    start = f"{y_ini}-{m_ini:02d}-01"
    end = f"{y_fim}-{m_fim:02d}-{ultimo_dia:02d}"

    try:
        resp = requests.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": start,
                "end_date": end,
                "daily": "precipitation_sum,temperature_2m_mean",
                "timezone": "America/Sao_Paulo",
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        daily = resp.json().get("daily", {})
        precip = [p for p in daily.get("precipitation_sum", []) if p is not None]
        temp = [t for t in daily.get("temperature_2m_mean", []) if t is not None]
        if not precip and not temp:
            return None, None
        # Precipitação: total do período normalizado por mês (soma / n_meses)
        precip_mm = round(sum(precip) / n_meses, 1) if precip else None
        temp_c = round(statistics.mean(temp), 1) if temp else None
        return precip_mm, temp_c
    except Exception as e:
        logger.warning("Open-Meteo clima falhou (%s %d-%02d): %s", regiao, ano, mes, e)
        return None, None


def _ultimo_dia_mes(ano: int, mes: int) -> int:
    if mes == 12:
        return 31
    import datetime
    return (datetime.date(ano, mes + 1, 1) - datetime.timedelta(days=1)).day
