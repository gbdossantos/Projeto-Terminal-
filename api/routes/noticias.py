"""
Endpoint GET /api/noticias-do-dia.

Devolve as 3 noticias relevantes mais recentes (ultimas 24h) com:
  - imagem/titulo/fonte/url/categoria/publicado_em
  - delta_correlato: variacao do dia das variaveis relevantes a categoria
    (sem atribuicao causal — decisao de produto: produtor faz a conexao)

Por categoria:
  - cambio          → arroba_pct + dolar_pct
  - demanda_externa → arroba_pct + dolar_pct
  - oferta_interna  → arroba_pct
  - insumos         → milho_pct + arroba_pct
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter

from api.deps import (
    get_historico_arroba,
    get_historico_dolar,
    get_historico_milho,
)
from api.db.noticias import list_noticias_recentes, ultima_atualizacao

router = APIRouter()


def _ultima_variacao_pct(historico: list[dict]) -> Optional[float]:
    """
    Retorna a variacao percentual entre os 2 ultimos pontos do historico.
    None se historico insuficiente.
    """
    if not historico or len(historico) < 2:
        return None
    try:
        atual = float(historico[-1].get("valor"))
        anterior = float(historico[-2].get("valor"))
        if anterior <= 0:
            return None
        return ((atual - anterior) / anterior) * 100.0
    except (TypeError, ValueError):
        return None


def _delta_correlato_por_categoria(
    categoria: str,
    delta_arroba: Optional[float],
    delta_dolar: Optional[float],
    delta_milho: Optional[float],
) -> dict[str, Optional[float]]:
    """Monta o dict { arroba_pct, dolar_pct, milho_pct } baseado na categoria."""
    base: dict[str, Optional[float]] = {
        "arroba_pct": None,
        "dolar_pct": None,
        "milho_pct": None,
    }
    if categoria == "cambio":
        base["arroba_pct"] = delta_arroba
        base["dolar_pct"] = delta_dolar
    elif categoria == "demanda_externa":
        base["arroba_pct"] = delta_arroba
        base["dolar_pct"] = delta_dolar
    elif categoria == "oferta_interna":
        base["arroba_pct"] = delta_arroba
    elif categoria == "insumos":
        base["milho_pct"] = delta_milho
        base["arroba_pct"] = delta_arroba
    return base


@router.get("/noticias-do-dia")
def noticias_do_dia():
    """
    Top 3 noticias relevantes das ultimas 24h + delta de mercado correlato.

    Sem atribuicao causal (R$/@ por noticia). Frontend exibe lado a lado.
    """
    # Calcula deltas do dia uma vez (cache global TTL ja gerencia os fetches)
    delta_arroba = _ultima_variacao_pct(get_historico_arroba())
    delta_dolar = _ultima_variacao_pct(get_historico_dolar(30))
    delta_milho = _ultima_variacao_pct(get_historico_milho())

    noticias_raw = list_noticias_recentes(limit=3, horas=24)
    noticias = [
        {
            "id": n["id"],
            "titulo": n["titulo"],
            "fonte": n["fonte"],
            "url": n["url"],
            "imagem": n["imagem"],
            "categoria": n["categoria"],
            "publicado_em": n["publicado_em"],
            "delta_correlato": _delta_correlato_por_categoria(
                n["categoria"], delta_arroba, delta_dolar, delta_milho,
            ),
        }
        for n in noticias_raw
    ]

    return {
        "ultima_atualizacao": ultima_atualizacao(),
        "noticias": noticias,
        "delta_dia": {
            "arroba_pct": delta_arroba,
            "dolar_pct": delta_dolar,
            "milho_pct": delta_milho,
        },
    }
