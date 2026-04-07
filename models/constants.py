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
