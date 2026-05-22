"""
Pipeline de ingestao da feed "O que moveu a linha hoje".

3 fontes RSS legalmente limpas (uso jornalistico):
  1. Agencia Brasil — Creative Commons, RSS oficial
  2. Noticias Agricolas — RSS aberto
  3. AgFeed — RSS aberto

Filtros (keywords PT-BR) e categorizacao:
  - cambio: dolar, USD, BRL, PTAX, real fraco/forte, paridade
  - demanda_externa: exportacao carne, China, UE, Egito, embargo, Secex
  - oferta_interna: confinamento, abate, frigorifico, JBS, Marfrig, BRF, Minerva, oferta
  - insumos: milho, soja, dieta, racao

Prioridade quando matcha mais de uma categoria:
  demanda_externa > oferta_interna > insumos > cambio
  (mais especifico vence o mais generico)

Se nenhum match → noticia ignorada.

Roda via APScheduler 6x/dia (07, 10, 13, 16, 19, 22h America/Sao_Paulo).
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Iterable, Optional

import feedparser  # type: ignore[import-untyped]

from api.db.noticias import init_schema, upsert_noticia, cleanup_antigas

logger = logging.getLogger(__name__)


# ── Fontes RSS ──────────────────────────────────────────────────
FONTES: list[tuple[str, str]] = [
    # (nome_exibicao, url do RSS)
    ("Agencia Brasil", "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml"),
    ("Noticias Agricolas", "https://www.noticiasagricolas.com.br/rss/bovinos.xml"),
    ("AgFeed", "https://agfeed.com.br/feed"),
]


# ── Keywords por categoria (PT-BR, case-insensitive) ───────────
# Ordem aqui = ordem de checagem (primeira que bater leva, pra resolver overlap).
CATEGORIAS: list[tuple[str, list[str]]] = [
    (
        "demanda_externa",
        [
            r"\bexportac[aã]o\b.*\bcarne\b",
            r"\bcarne\b.*\bexportac[aã]o\b",
            r"\bChina\b.*\b(carne|boi|bovin)",
            r"\b(boi|bovin|carne)\b.*\bChina\b",
            r"\b(uni[aã]o\s+europeia|UE)\b.*\b(carne|boi)",
            r"\b(Egito|R[uú]ssia|Arabia|Hong\s*Kong)\b.*\b(carne|boi)",
            r"\b(embargo|cota|tarifa)\b.*\b(carne|boi)",
            r"\b(carne|boi)\b.*\b(embargo|cota|tarifa)",
            r"\b(Secex|embarques?\s+semanais?)\b",
        ],
    ),
    (
        "oferta_interna",
        [
            r"\bconfinamento\b",
            r"\babate\b",
            r"\bfrigor[ií]fico\b",
            r"\b(JBS|Marfrig|Minerva|BRF)\b",
            r"\b(oferta|estoque)\b.*\b(boi|carne|bovin)",
            r"\b(boi|carne|bovin)\b.*\b(oferta|estoque)",
            r"\b(Anu[aá]rio|Assocon|IMEA)\b",
        ],
    ),
    (
        "insumos",
        [
            r"\bmilho\b",
            r"\bsafrinha\b",
            r"\boferta\s+(de\s+)?milho\b",
            r"\bUSDA\b",
            r"\bESALQ\b.*\b(milho|soja)",
            r"\b(milho|soja|farelo)\b.*\bESALQ\b",
            r"\bsoja\b.*\b(farelo|rac[aã]o|dieta)\b",
            r"\b(farelo|rac[aã]o|dieta)\b.*\bsoja\b",
            r"\bcusto\b.*\b(dieta|rac[aã]o)\b",
            r"\b(dieta|rac[aã]o)\b.*\bcusto\b",
            r"\bCEPEA\b.*\b(milho|soja)\b",
            r"\bsafra\s+americana\b",
        ],
    ),
    (
        "cambio",
        [
            r"\bd[oó]lar\b",
            r"\bUSD\b",
            r"\bPTAX\b",
            r"\breal\b.*\b(fraco|forte|valoriza|desvaloriza)",
            r"\bc[aâ]mbio\b",
            r"\bparidade\b.*\b(exporta|carne)",
        ],
    ),
]


# Pre-compila padroes pra performance
_CATEGORIAS_COMPILED: list[tuple[str, list[re.Pattern[str]]]] = [
    (cat, [re.compile(p, re.IGNORECASE) for p in patterns])
    for cat, patterns in CATEGORIAS
]


def categorizar(titulo: str, sumario: str = "") -> Optional[str]:
    """
    Retorna a categoria mais especifica que matcha titulo+sumario.
    None se nada bater (noticia ignorada).
    """
    texto = f"{titulo} {sumario}"
    for categoria, patterns in _CATEGORIAS_COMPILED:
        for p in patterns:
            if p.search(texto):
                return categoria
    return None


def _extrair_imagem(entry) -> Optional[str]:
    """
    Pega imagem da entry de RSS. Ordem de preferencia:
    1. media:content / media:thumbnail
    2. enclosure
    3. <img> dentro do summary/description (regex simples)
    """
    # 1. media_content (feedparser normaliza)
    mc = getattr(entry, "media_content", None) or []
    if mc and isinstance(mc, list):
        url = mc[0].get("url")
        if url:
            return url

    mt = getattr(entry, "media_thumbnail", None) or []
    if mt and isinstance(mt, list):
        url = mt[0].get("url")
        if url:
            return url

    # 2. enclosure
    enclosures = getattr(entry, "enclosures", None) or []
    for enc in enclosures:
        mime = enc.get("type", "")
        if mime.startswith("image/"):
            return enc.get("href") or enc.get("url")

    # 3. img dentro do summary
    summary = getattr(entry, "summary", "") or ""
    m = re.search(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', summary, re.IGNORECASE)
    if m:
        return m.group(1)

    return None


def _normalizar_data(entry) -> str:
    """Retorna ISO 8601 com timezone. Preferencia: published > updated > now."""
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                dt = datetime(*t[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except (TypeError, ValueError):
                continue
    return datetime.now(timezone.utc).isoformat()


def _coletar_da_fonte(nome_fonte: str, url_rss: str) -> Iterable[dict]:
    """Yielda noticias relevantes (ja categorizadas) de uma fonte."""
    try:
        feed = feedparser.parse(url_rss)
    except Exception as e:
        logger.warning("RSS %s falhou: %s", url_rss, e)
        return

    entries = getattr(feed, "entries", []) or []
    for entry in entries:
        titulo = (getattr(entry, "title", "") or "").strip()
        if not titulo:
            continue
        sumario = (getattr(entry, "summary", "") or "").strip()
        link = (getattr(entry, "link", "") or "").strip()
        if not link:
            continue

        categoria = categorizar(titulo, sumario)
        if not categoria:
            continue  # irrelevante, fora

        yield {
            "titulo": titulo,
            "fonte": nome_fonte,
            "url": link,
            "imagem": _extrair_imagem(entry),
            "categoria": categoria,
            "publicado_em": _normalizar_data(entry),
        }


def ingestar_feed() -> dict:
    """
    Ingere todas as fontes em uma rodada.
    Retorna estatisticas: { 'inseridas': N, 'por_fonte': {...}, 'por_categoria': {...} }.

    Chamada pelo cron do APScheduler.
    """
    init_schema()
    stats = {
        "inseridas": 0,
        "por_fonte": {},
        "por_categoria": {},
        "removidas_antigas": 0,
    }

    for nome, url_rss in FONTES:
        contador = 0
        for noticia in _coletar_da_fonte(nome, url_rss):
            try:
                upsert_noticia(**noticia)
                contador += 1
                cat = noticia["categoria"]
                stats["por_categoria"][cat] = stats["por_categoria"].get(cat, 0) + 1
            except Exception as e:
                logger.warning("Upsert falhou para %s: %s", noticia.get("url"), e)
        stats["por_fonte"][nome] = contador
        stats["inseridas"] += contador

    # Limpeza retroativa: 30 dias rolling
    try:
        stats["removidas_antigas"] = cleanup_antigas(dias=30)
    except Exception as e:
        logger.warning("Cleanup falhou: %s", e)

    logger.info("Ingestao concluida: %s", stats)
    return stats
