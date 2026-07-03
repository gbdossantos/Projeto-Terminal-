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

# "Tarifa única" (emolumentos + tarifa de registro combinados) — tabela
# degressiva por ADV mensal do INVESTIDOR (p.12, seção 1.3.2.1: apurado por
# CPF/CNPJ, consolidado entre todas as corretoras onde ele opera — não é
# volume da corretora, não sofre markup por essa via). A B3 rateia
# internamente 35% emolumentos / 65% tarifa de registro (p.15, seção
# 1.3.2.5), mas o valor total cobrado do investidor é a tarifa única cheia.
# Usamos a faixa ADV 1-5, a mais cara: é o perfil do produto (fazenda
# hedgeando poucos contratos, esporadicamente), escolha conservadora que
# nunca subestima custo. Corretagem da corretora é custo à parte, já
# modelado separadamente via `corretagem_por_contrato`.
EMOLUMENTOS_BGI_ADV_1_5 = 2.74  # R$/contrato ("tarifa única", ADV 1-5)

# Limite de oscilação diária do BGI — B3, documento "Oscilação Diária de
# Negociação" (versão canônica, atualizada in-place pela B3 — não a versão
# arquivada com data no nome do arquivo). Vigência confirmada 04/05/2026 na
# página oficial de Regras de Negociação do PUMA Trading System: 4,5% sobre
# o preço de ajuste do dia anterior. É o hard limit da bolsa para um único
# pregão, não uma previsão de volatilidade realizada — usado apenas como
# referência conservadora para estimar o capital necessário para suportar
# um ajuste diário adverso (risco de chamada de margem), nunca como
# estimativa de risco de preço.
# https://www.b3.com.br/data/files/FC/42/52/0E/97B6E610B60806E6AC094EA8/Oscila%C3%A7%C3%A3o%20Di%C3%A1ria%20de%20Negocia%C3%A7%C3%A3o.pdf
# https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/regras-e-parametros-de-negociacao/regras-de-negociacao/
LIMITE_OSCILACAO_DIARIA_BGI_PCT = 0.045
