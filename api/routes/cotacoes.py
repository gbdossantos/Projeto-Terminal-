"""Endpoints de cotações de mercado."""

from fastapi import APIRouter

from api.deps import get_cotacoes, get_futuros, get_historico_dolar, get_historico_arroba, get_historico_milho
from api.schemas import CotacaoMercadoSchema, CurvaFuturosSchema

router = APIRouter()


@router.get("/cotacoes", response_model=CotacaoMercadoSchema)
def cotacoes():
    """Retorna snapshot de todas as cotações de mercado."""
    return CotacaoMercadoSchema.from_dataclass(get_cotacoes())


@router.get("/futuros", response_model=CurvaFuturosSchema)
def futuros():
    """Retorna curva de futuros BGI da B3."""
    return CurvaFuturosSchema.from_dataclass(get_futuros())


@router.get("/historico-dolar")
def historico_dolar(dias: int = 30):
    """Retorna histórico diário do dólar."""
    return get_historico_dolar(dias)


@router.get("/historico-arroba")
def historico_arroba():
    """Retorna histórico do indicador CEPEA boi gordo."""
    return get_historico_arroba()


@router.get("/historico-milho")
def historico_milho():
    """Retorna histórico do indicador CEPEA milho."""
    return get_historico_milho()
