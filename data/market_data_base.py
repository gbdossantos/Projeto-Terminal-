"""
Terminal — Market Data Base (sem dependência de Streamlit)
============================================================
Funções puras de fetch de cotações. Sem @st.cache_data, sem import streamlit.
Consumido pela API FastAPI e pelo wrapper Streamlit (market_data.py).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional

import requests

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from models.constants import MESES_BGI
from models.hedge_engine import ContratoFuturo, CurvaFuturos

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

TIMEOUT_SEGUNDOS = 10
TTL_COTACAO     = 900
TTL_HISTORICO   = 3600
TTL_CDI         = 3600

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}


# ---------------------------------------------------------------------------
# Dataclass de resultado
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CotacaoMercado:
    """Snapshot das cotações de mercado relevantes para pecuária de corte."""

    arroba_boi_gordo: Optional[float] = None
    dolar_ptax: Optional[float] = None
    milho_esalq: Optional[float] = None
    cdi_anual: Optional[float] = None
    timestamp: Optional[datetime] = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now())


# ---------------------------------------------------------------------------
# Dólar — API PTAX Banco Central
# ---------------------------------------------------------------------------

def _buscar_dolar_ptax() -> Optional[float]:
    for dias_atras in range(5):
        data = date.today() - timedelta(days=dias_atras)
        data_fmt = data.strftime("%m-%d-%Y")
        url = (
            f"https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
            f"CotacaoDolarDia(dataCotacao=@dataCotacao)"
            f"?@dataCotacao='{data_fmt}'&$format=json&$select=cotacaoVenda"
        )
        try:
            resp = requests.get(url, timeout=TIMEOUT_SEGUNDOS)
            resp.raise_for_status()
            valores = resp.json().get("value", [])
            if valores:
                return float(valores[-1]["cotacaoVenda"])
        except Exception as e:
            logger.warning("PTAX erro (tentativa %d): %s", dias_atras, e)
            continue
    return None


# ---------------------------------------------------------------------------
# Arroba do Boi Gordo
# ---------------------------------------------------------------------------

def _buscar_arroba_boi_cepea() -> Optional[float]:
    if BeautifulSoup is None:
        logger.warning("bs4 não instalado — scraping de arroba indisponível")
        return None

    # Fonte 1: CEPEA direto
    try:
        url = "https://cepea.org.br/br/indicador/boi-gordo.aspx"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        tabela = soup.find("table", {"id": "imagenet-indicador1"})
        if tabela:
            primeira_linha = tabela.find("tbody").find("tr")
            celulas = primeira_linha.find_all("td")
            if len(celulas) >= 2:
                valor_str = celulas[1].text.strip().replace(".", "").replace(",", ".")
                valor = float(valor_str)
                if 100 < valor < 1000:
                    return valor
    except Exception as e:
        logger.warning("CEPEA boi direto falhou: %s", e)

    # Fonte 2: Notícias Agrícolas
    try:
        url = "https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/boi-gordo-indicador-esalq-bmf"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup.find_all(["span", "td", "div"]):
            text = tag.get_text(strip=True)
            if "R$" in text and "/@" not in text:
                num_str = text.replace("R$", "").replace(".", "").replace(",", ".").strip()
                try:
                    valor = float(num_str)
                    if 100 < valor < 1000:
                        return valor
                except ValueError:
                    continue
    except Exception as e:
        logger.warning("Notícias Agrícolas boi falhou: %s", e)

    logger.error("Arroba boi gordo: TODAS as fontes falharam — retornando None")
    return None


# ---------------------------------------------------------------------------
# Milho ESALQ
# ---------------------------------------------------------------------------

def _buscar_milho_esalq() -> Optional[float]:
    if BeautifulSoup is None:
        logger.warning("bs4 não instalado — scraping de milho indisponível")
        return None

    try:
        url = "https://cepea.org.br/br/indicador/milho.aspx"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        tabela = soup.find("table", {"id": "imagenet-indicador1"})
        if tabela:
            primeira_linha = tabela.find("tbody").find("tr")
            celulas = primeira_linha.find_all("td")
            if len(celulas) >= 2:
                valor_str = celulas[1].text.strip().replace(".", "").replace(",", ".")
                valor = float(valor_str)
                if 20 < valor < 300:
                    return valor
    except Exception as e:
        logger.warning("CEPEA milho direto falhou: %s", e)

    try:
        url = "https://www.noticiasagricolas.com.br/cotacoes/milho/indicador-milho-esalq-bmfbovespa"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup.find_all(["span", "td", "div"]):
            text = tag.get_text(strip=True)
            if "R$" in text:
                num_str = text.replace("R$", "").replace(".", "").replace(",", ".").strip()
                try:
                    valor = float(num_str)
                    if 20 < valor < 300:
                        return valor
                except ValueError:
                    continue
    except Exception as e:
        logger.warning("Notícias Agrícolas milho falhou: %s", e)

    logger.error("Milho ESALQ: TODAS as fontes falharam — retornando None")
    return None


# ---------------------------------------------------------------------------
# CDI — API SGS do Banco Central
# ---------------------------------------------------------------------------

def _buscar_cdi_anual() -> Optional[float]:
    try:
        url = (
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1"
            "?formato=json"
        )
        resp = requests.get(url, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        dados = resp.json()
        if dados:
            return float(dados[-1]["valor"]) / 100
    except Exception as e:
        logger.warning("CDI SGS erro: %s", e)
    return None


# ---------------------------------------------------------------------------
# Histórico do dólar — AwesomeAPI
# ---------------------------------------------------------------------------

def _buscar_historico_dolar(dias: int = 30) -> list[dict]:
    try:
        url = f"https://economia.awesomeapi.com.br/json/daily/USD-BRL/{dias}"
        resp = requests.get(url, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        dados = resp.json()
        historico = []
        for item in reversed(dados):
            ts = datetime.fromtimestamp(int(item["timestamp"]))
            historico.append({
                "data": ts.strftime("%d/%m"),
                "valor": float(item["bid"]),
            })
        return historico
    except Exception as e:
        logger.warning("AwesomeAPI histórico dólar erro: %s", e)
    return []


# ---------------------------------------------------------------------------
# Historico CEPEA — Boi Gordo (scraping da pagina de indicador)
# ---------------------------------------------------------------------------

def _buscar_historico_arroba(dias: int = 180) -> list[dict]:
    """Busca historico do indicador CEPEA boi gordo via scraping da pagina de series."""
    if BeautifulSoup is None:
        return []

    try:
        # Tenta pegar a tabela de historico da pagina do CEPEA
        url = "https://cepea.org.br/br/indicador/boi-gordo.aspx"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        tabela = soup.find("table", {"id": "imagenet-indicador1"})
        if not tabela:
            return []

        historico = []
        tbody = tabela.find("tbody")
        if tbody:
            for row in tbody.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) >= 2:
                    data_str = cells[0].get_text(strip=True)
                    valor_str = cells[1].get_text(strip=True).replace(".", "").replace(",", ".")
                    try:
                        valor = float(valor_str)
                        if 100 < valor < 1000:
                            historico.append({"data": data_str, "valor": valor})
                    except ValueError:
                        continue
        return list(reversed(historico[:dias]))  # mais antigo primeiro (para grafico)
    except Exception as e:
        logger.warning("Historico CEPEA arroba falhou: %s", e)
    return []


def _buscar_historico_milho(dias: int = 180) -> list[dict]:
    """Busca historico do indicador CEPEA milho via scraping."""
    if BeautifulSoup is None:
        return []

    try:
        url = "https://cepea.org.br/br/indicador/milho.aspx"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        tabela = soup.find("table", {"id": "imagenet-indicador1"})
        if not tabela:
            return []

        historico = []
        tbody = tabela.find("tbody")
        if tbody:
            for row in tbody.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) >= 2:
                    data_str = cells[0].get_text(strip=True)
                    valor_str = cells[1].get_text(strip=True).replace(".", "").replace(",", ".")
                    try:
                        valor = float(valor_str)
                        if 20 < valor < 300:
                            historico.append({"data": data_str, "valor": valor})
                    except ValueError:
                        continue
        return list(reversed(historico[:dias]))  # mais antigo primeiro (para grafico)
    except Exception as e:
        logger.warning("Historico CEPEA milho falhou: %s", e)
    return []


# ---------------------------------------------------------------------------
# Futuros B3 — Boi Gordo (BGI)
# ---------------------------------------------------------------------------

def _parsear_vencimento_bgi(codigo: str) -> date | None:
    try:
        codigo = codigo.strip().upper().replace(" ", "")
        for i, ch in enumerate(codigo):
            if ch in MESES_BGI:
                mes = MESES_BGI[ch]
                ano_str = codigo[i + 1:]
                ano = int(ano_str)
                if ano < 100:
                    ano += 2000
                if mes == 12:
                    return date(ano + 1, 1, 1) - timedelta(days=1)
                return date(ano, mes + 1, 1) - timedelta(days=1)
    except (ValueError, IndexError):
        pass
    return None


_MESES_PT = {
    "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
    "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
}

# Mapa mês → letra BGI
_MES_PARA_LETRA = {
    1: "F", 2: "G", 3: "H", 4: "J", 5: "K", 6: "M",
    7: "N", 8: "Q", 9: "U", 10: "V", 11: "X", 12: "Z",
}


def _buscar_futuros_scot() -> Optional[CurvaFuturos]:
    """Busca futuros BGI via Scot Consultoria (fonte primária, cloud-friendly)."""
    if BeautifulSoup is None:
        return None

    try:
        url = "https://www.scotconsultoria.com.br/cotacoes/mercado-futuro/"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        contratos = []
        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            venc_text = cells[0].get_text(strip=True).lower()
            # Formato: "Abr/26", "Mai/26", etc.
            if "/" not in venc_text:
                continue

            parts = venc_text.split("/")
            if len(parts) != 2:
                continue

            mes_str = parts[0].strip()[:3]
            ano_str = parts[1].strip()

            if mes_str not in _MESES_PT:
                continue

            try:
                mes = _MESES_PT[mes_str]
                ano = int(ano_str)
                if ano < 100:
                    ano += 2000
            except ValueError:
                continue

            # Preço de ajuste — segunda coluna
            preco_str = cells[1].get_text(strip=True).replace(".", "").replace(",", ".")
            try:
                preco = float(preco_str)
            except ValueError:
                continue
            if not (200 < preco < 600):
                continue

            # Vencimento: último dia do mês
            if mes == 12:
                venc_date = date(ano + 1, 1, 1) - timedelta(days=1)
            else:
                venc_date = date(ano, mes + 1, 1) - timedelta(days=1)

            letra = _MES_PARA_LETRA[mes]
            codigo = f"BGI{letra}{ano % 100:02d}"

            # Volume (contratos abertos) — pode estar em outra coluna
            volume = 0
            if len(cells) >= 4:
                vol_str = cells[3].get_text(strip=True).replace(".", "").replace(",", ".")
                try:
                    volume = int(float(vol_str))
                except ValueError:
                    pass

            contratos.append(ContratoFuturo(
                codigo=codigo,
                vencimento=venc_date,
                preco_ajuste=preco,
                volume=volume,
            ))

        if contratos:
            logger.info("Scot Consultoria: %d contratos BGI carregados", len(contratos))
            return CurvaFuturos(
                contratos=tuple(sorted(contratos, key=lambda c: c.vencimento)),
                fonte="scot_consultoria",
            )
    except Exception as e:
        logger.warning("Scot Consultoria futuros BGI falhou: %s", e)

    return None


def _buscar_futuros_bgi() -> Optional[CurvaFuturos]:
    if BeautifulSoup is None:
        logger.warning("bs4 não instalado — scraping de futuros indisponível")
        return None

    # Fonte 0: Scot Consultoria (primária, cloud-friendly)
    result = _buscar_futuros_scot()
    if result:
        return result

    # Fonte 1: Notícias Agrícolas
    try:
        url = "https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/boi-gordo-b3-pregao-regular"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        contratos = []
        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 3:
                nome = cells[0].get_text(strip=True)
                if "BGI" not in nome.upper() and "/" not in nome:
                    continue
                preco_str = cells[1].get_text(strip=True).replace(".", "").replace(",", ".")
                try:
                    preco = float(preco_str)
                except ValueError:
                    continue
                if not (200 < preco < 600):
                    continue
                codigo = nome.strip().split()[0] if nome.strip() else nome
                venc = _parsear_vencimento_bgi(codigo)
                if venc is None:
                    continue
                contratos.append(ContratoFuturo(codigo=codigo, vencimento=venc, preco_ajuste=preco))
        if contratos:
            return CurvaFuturos(
                contratos=tuple(sorted(contratos, key=lambda c: c.vencimento)),
                fonte="noticias_agricolas",
            )
    except Exception as e:
        logger.warning("Notícias Agrícolas futuros BGI falhou: %s", e)

    # Fonte 2: ADVFN
    try:
        url = "https://br.advfn.com/investimentos/futuros/boi-gordo/cotacoes"
        resp = requests.get(url, headers=_HEADERS, timeout=TIMEOUT_SEGUNDOS)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        contratos = []
        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                nome = cells[0].get_text(strip=True)
                if "BGI" not in nome.upper():
                    continue
                preco_str = cells[1].get_text(strip=True).replace(".", "").replace(",", ".")
                try:
                    preco = float(preco_str)
                except ValueError:
                    continue
                if not (200 < preco < 600):
                    continue
                venc = _parsear_vencimento_bgi(nome)
                if venc is None:
                    continue
                contratos.append(ContratoFuturo(
                    codigo=nome.strip().split()[0], vencimento=venc, preco_ajuste=preco,
                ))
        if contratos:
            return CurvaFuturos(
                contratos=tuple(sorted(contratos, key=lambda c: c.vencimento)),
                fonte="advfn",
            )
    except Exception as e:
        logger.warning("ADVFN futuros BGI falhou: %s", e)

    logger.error("Futuros BGI: TODAS as fontes falharam — retornando None")
    return None


# ---------------------------------------------------------------------------
# Cotações consolidadas
# ---------------------------------------------------------------------------

def _buscar_cotacoes() -> CotacaoMercado:
    return CotacaoMercado(
        arroba_boi_gordo=_buscar_arroba_boi_cepea(),
        dolar_ptax=_buscar_dolar_ptax(),
        milho_esalq=_buscar_milho_esalq(),
        cdi_anual=_buscar_cdi_anual(),
    )


# ---------------------------------------------------------------------------
# Fallback fictício
# ---------------------------------------------------------------------------

def cotacoes_ficticias() -> CotacaoMercado:
    return CotacaoMercado(
        arroba_boi_gordo=315.0,
        dolar_ptax=5.75,
        milho_esalq=68.50,
        cdi_anual=0.1265,
    )


def futuros_bgi_ficticios() -> CurvaFuturos:
    hoje = date.today()
    return CurvaFuturos(
        contratos=tuple([
            ContratoFuturo(
                codigo=f"BGI{letra}{(hoje.year % 100) + (1 if mes <= hoje.month else 0):02d}",
                vencimento=date(hoje.year + (1 if mes <= hoje.month else 0), mes, 28),
                preco_ajuste=preco,
            )
            for letra, mes, preco in [
                ("V", 10, 325.0), ("X", 11, 330.0), ("Z", 12, 335.0), ("G", 2, 340.0),
            ]
            if date(hoje.year + (1 if mes <= hoje.month else 0), mes, 28) > hoje
        ]),
        fonte="ficticio",
    )
