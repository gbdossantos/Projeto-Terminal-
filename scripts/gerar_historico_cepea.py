"""
Gerador de série histórica mensal — CEPEA/ESALQ (boi gordo e milho, base SP)
=============================================================================
Roda em DEV (onde o CEPEA responde — IP residencial). NÃO roda em produção:
o CEPEA bloqueia IP de datacenter (problema conhecido — ver CLAUDE.md).

Fluxo:
  1. Baixa a planilha Excel da série histórica completa do CEPEA (.xls OLE2).
  2. Agrega para média mensal (mes_iso, valor_brl à vista R$).
  3. Escreve data/historico/cepea_arroba.csv e cepea_milho.csv.

Produção lê só o CSV commitado (loader puro em data/historico_loader.py).
Atualização: rodar este script e commitar os CSVs.

Uso:
    python3 scripts/gerar_historico_cepea.py

Decisão de fonte (Fase 1, Portão 1 — aprovada GB):
  - Boi gordo: indicador CEPEA/ESALQ SP, série id=2 (À vista R$/@).
  - Milho:     indicador ESALQ/BM&FBOVESPA SP, série id=77 (À vista R$/sc 60kg).
  Base SP em ambos (decisão GB: "sempre usar SP como base").
"""

from __future__ import annotations

import csv
import io
import os
import statistics
import sys
from collections import defaultdict

import requests

try:
    import xlrd
except ImportError:
    sys.exit("xlrd não instalado. Rode: pip install xlrd")


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(ROOT, "data", "historico")

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}

# (nome_arquivo, url_serie, referer)
SERIES = {
    "cepea_arroba.csv": (
        "https://cepea.org.br/br/indicador/series/boi-gordo.aspx?id=2",
        "https://cepea.org.br/br/indicador/boi-gordo.aspx",
    ),
    "cepea_milho.csv": (
        "https://cepea.org.br/br/indicador/series/milho.aspx?id=77",
        "https://cepea.org.br/br/indicador/milho.aspx",
    ),
}


def _baixar_mensal(url: str, referer: str) -> dict[str, float]:
    """Baixa a planilha .xls do CEPEA e devolve {mes_iso: media_mensal}."""
    resp = requests.get(url, headers={**_HEADERS, "Referer": referer}, timeout=30)
    resp.raise_for_status()
    if resp.content[:4] != b"\xd0\xcf\x11\xe0":
        raise RuntimeError(f"Resposta não é Excel OLE2 (CEPEA bloqueou?): {url}")

    # .xls do CEPEA tem corrupção benigna no header OLE — xlrd lê com a flag.
    book = xlrd.open_workbook(file_contents=resp.content, ignore_workbook_corruption=True)
    sheet = book.sheet_by_index(0)

    # Localiza a linha de header (col 0 == "Data")
    inicio = None
    for i in range(sheet.nrows):
        if str(sheet.cell_value(i, 0)).strip() == "Data":
            inicio = i + 1
            break
    if inicio is None:
        raise RuntimeError(f"Header 'Data' não encontrado em {url}")

    diario_por_mes: dict[str, list[float]] = defaultdict(list)
    for i in range(inicio, sheet.nrows):
        data_str = str(sheet.cell_value(i, 0)).strip()
        valor = sheet.cell_value(i, 1)  # coluna "À vista R$"
        if "/" not in data_str or not isinstance(valor, (int, float)) or valor <= 0:
            continue
        dia, mes, ano = data_str.split("/")
        diario_por_mes[f"{ano}-{mes.zfill(2)}"].append(float(valor))

    return {
        mes: round(statistics.mean(vals), 2)
        for mes, vals in diario_por_mes.items()
    }


def main() -> None:
    os.makedirs(DESTINO, exist_ok=True)
    for arquivo, (url, referer) in SERIES.items():
        print(f"Baixando {arquivo} ← {url}")
        mensal = _baixar_mensal(url, referer)
        caminho = os.path.join(DESTINO, arquivo)
        with open(caminho, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["mes_iso", "valor_brl"])
            for mes in sorted(mensal):
                writer.writerow([mes, f"{mensal[mes]:.2f}"])
        print(f"  → {caminho}: {len(mensal)} meses ({min(mensal)} a {max(mensal)})")


if __name__ == "__main__":
    main()
