"""
Terminal — Constantes compartilhadas
======================================
Fonte única de verdade para constantes usadas por múltiplos módulos.
Evita duplicação e risco de drift silencioso.
"""

KG_POR_ARROBA = 15.0

# ---------------------------------------------------------------------------
# Hedge — Futuros B3 (Boi Gordo BGI)
# ---------------------------------------------------------------------------

ARROBAS_POR_CONTRATO = 330  # contrato padrão BGI na B3

MARGEM_GARANTIA_PCT_DEFAULT = 0.05  # 5% do valor nocional

MESES_BGI = {
    "F": 1, "G": 2, "H": 3, "J": 4, "K": 5, "M": 6,
    "N": 7, "Q": 8, "U": 9, "V": 10, "X": 11, "Z": 12,
}

# Basis estimado por região (R$/@ desconto vs SP)
# Produtor pode ajustar manualmente no dashboard
BASIS_REGIAO = {
    "SP": 0.0,
    "MS": -5.0,
    "MT": -10.0,
    "GO": -7.0,
    "MG": -3.0,
    "PA": -15.0,
    "TO": -12.0,
    "RO": -15.0,
}

# ---------------------------------------------------------------------------
# Hedge — custos reais B3 (contrato BGI, boi gordo)
# Fonte: B3, "Tarifação: Regras de Cálculo e Tabelas de Preços" V3.2,
# seção 1.4.4.1 "Boi Gordo" (p.37).
# https://www.b3.com.br/data/files/DE/A1/2F/A3/B79EE8100E866AE8AC094EA8/Tarifacao_V3.2_PT.pdf
# ---------------------------------------------------------------------------

# Tarifa de liquidação — valor fixo por contrato, cobrado no vencimento.
TAXA_LIQUIDACAO_BGI = 2.08  # R$/contrato

# Emolumentos (tarifa de negociação/registro) — tabela degressiva por ADV
# (volume médio diário do cliente, em contratos). Usamos a faixa ADV 1-5,
# a mais cara: é o perfil do produto (fazenda hedgeando poucos contratos,
# esporadicamente), e é a escolha conservadora (nunca subestima custo).
EMOLUMENTOS_BGI_ADV_1_5 = 2.74  # R$/contrato

# Limite de oscilação diária do BGI — B3, "Oscilação Diária de Negociação"
# (documento vigente 21/11/2025): 3,85% sobre o preço de ajuste do dia
# anterior. É o hard limit da bolsa para um único pregão, não uma previsão
# de volatilidade realizada — usado apenas como referência conservadora
# para estimar o capital necessário para suportar um ajuste diário adverso
# (risco de chamada de margem), nunca como estimativa de risco de preço.
# https://www.b3.com.br/data/files/57/31/0B/84/577BA9105B12E5A9AC094EA8/Oscilacao%20Maxima%20Diaria%20-%20PT%20-%2021112025.pdf
LIMITE_OSCILACAO_DIARIA_BGI_PCT = 0.0385
