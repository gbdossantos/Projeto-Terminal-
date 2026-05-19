"""Endpoints de cotações de mercado."""

import math

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


@router.get("/volatilidade-arroba")
def volatilidade_arroba(janela_dias: int = 90):
    """
    Volatilidade historica da arroba (boi gordo CEPEA).

    Calcula sigma dos retornos log diarios na janela solicitada e anualiza
    com sqrt(252). Endpoint de leitura — nao toca engines de calculo.

    Args:
        janela_dias: tamanho da janela em dias uteis (default 90).

    Returns:
        sigma_diario: desvio padrao dos retornos log do dia.
        sigma_anualizado: sigma_diario * sqrt(252).
        media_diaria: retorno medio diario (drift).
        n_observations: numero de retornos calculados.
        period_days: janela solicitada.
        source: fonte do historico (CEPEA, scot, etc) — None se indisponivel.
    """
    hist = get_historico_arroba()
    if not hist or len(hist) < 2:
        return {
            "sigma_diario": None,
            "sigma_anualizado": None,
            "media_diaria": None,
            "n_observations": 0,
            "period_days": janela_dias,
            "source": None,
        }

    # Pega os ultimos N pontos da serie
    pontos = hist[-janela_dias:] if len(hist) > janela_dias else hist
    valores = [float(p["valor"]) for p in pontos if p.get("valor") is not None]

    # Retornos log
    retornos = []
    for i in range(1, len(valores)):
        if valores[i - 1] > 0 and valores[i] > 0:
            retornos.append(math.log(valores[i] / valores[i - 1]))

    if len(retornos) < 2:
        return {
            "sigma_diario": None,
            "sigma_anualizado": None,
            "media_diaria": None,
            "n_observations": len(retornos),
            "period_days": janela_dias,
            "source": "CEPEA",
        }

    n = len(retornos)
    media = sum(retornos) / n
    var = sum((r - media) ** 2 for r in retornos) / (n - 1)  # amostral (n-1)
    sigma_diario = math.sqrt(var)
    sigma_anualizado = sigma_diario * math.sqrt(252)

    return {
        "sigma_diario": sigma_diario,
        "sigma_anualizado": sigma_anualizado,
        "media_diaria": media,
        "n_observations": n,
        "period_days": janela_dias,
        "source": "CEPEA",
    }
