"""
Dependências compartilhadas — singletons de engines e cache de cotações.
"""

from models.cost_model_v2 import FarmEconomicsV2
from models.exposure_engine import ExposureEngine
from models.economic_impact import EconomicImpactEngine
from models.hedge_engine import HedgeEngine
from data.market_data_base import (
    _buscar_cotacoes,
    _buscar_futuros_bgi,
    _buscar_historico_dolar,
    _buscar_historico_arroba,
    _buscar_historico_milho,
    cotacoes_ficticias,
    futuros_bgi_ficticios,
    TTL_COTACAO,
    TTL_HISTORICO,
)
from api.cache import cached_call

# Engine singletons — stateless, safe to share
farm_engine = FarmEconomicsV2()
exposure_engine = ExposureEngine()
impact_engine = EconomicImpactEngine()
hedge_engine = HedgeEngine()


def get_cotacoes():
    result = cached_call("cotacoes", TTL_COTACAO, _buscar_cotacoes)
    # Se todas as fontes falharam, fallback para fictícias
    if result.arroba_boi_gordo is None and result.dolar_ptax is None:
        return cotacoes_ficticias()
    return result


def get_futuros():
    result = cached_call("futuros", TTL_COTACAO, _buscar_futuros_bgi)
    if result is None:
        return futuros_bgi_ficticios()
    return result


def get_historico_dolar(dias: int = 30):
    return cached_call(f"hist_dolar_{dias}", TTL_HISTORICO, _buscar_historico_dolar, dias)


def get_historico_arroba():
    return cached_call("hist_arroba", TTL_HISTORICO, _buscar_historico_arroba, 180)


def get_historico_milho():
    return cached_call("hist_milho", TTL_HISTORICO, _buscar_historico_milho, 180)
