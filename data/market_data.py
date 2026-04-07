"""
Terminal — Market Data (Streamlit wrapper)
============================================
Thin wrappers que importam da base e aplicam @st.cache_data.
O dashboard/app.py continua importando daqui sem mudanças.
Para uso sem Streamlit (FastAPI), importar de market_data_base.
"""

from __future__ import annotations

import streamlit as st

from data.market_data_base import (
    _buscar_dolar_ptax,
    _buscar_arroba_boi_cepea,
    _buscar_milho_esalq,
    _buscar_cdi_anual,
    _buscar_historico_dolar,
    _buscar_futuros_bgi,
    _buscar_cotacoes,
    CotacaoMercado,
    cotacoes_ficticias,
    futuros_bgi_ficticios,
    TTL_COTACAO,
    TTL_HISTORICO,
    TTL_CDI,
)

# Re-export para manter compatibilidade com imports existentes
from models.hedge_engine import ContratoFuturo, CurvaFuturos  # noqa: F401

__all__ = [
    "buscar_dolar_ptax",
    "buscar_arroba_boi_cepea",
    "buscar_milho_esalq",
    "buscar_cdi_anual",
    "buscar_historico_dolar",
    "buscar_futuros_bgi",
    "buscar_cotacoes",
    "CotacaoMercado",
    "cotacoes_ficticias",
    "futuros_bgi_ficticios",
    "ContratoFuturo",
    "CurvaFuturos",
]


@st.cache_data(ttl=TTL_COTACAO, show_spinner=False)
def buscar_dolar_ptax():
    return _buscar_dolar_ptax()


@st.cache_data(ttl=TTL_COTACAO, show_spinner=False)
def buscar_arroba_boi_cepea():
    return _buscar_arroba_boi_cepea()


@st.cache_data(ttl=TTL_COTACAO, show_spinner=False)
def buscar_milho_esalq():
    return _buscar_milho_esalq()


@st.cache_data(ttl=TTL_CDI, show_spinner=False)
def buscar_cdi_anual():
    return _buscar_cdi_anual()


@st.cache_data(ttl=TTL_HISTORICO, show_spinner=False)
def buscar_historico_dolar(dias: int = 30):
    return _buscar_historico_dolar(dias)


@st.cache_data(ttl=TTL_COTACAO, show_spinner=False)
def buscar_futuros_bgi():
    return _buscar_futuros_bgi()


@st.cache_data(ttl=TTL_COTACAO, show_spinner="Buscando cotações de mercado...")
def buscar_cotacoes() -> CotacaoMercado:
    return _buscar_cotacoes()
