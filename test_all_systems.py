"""
Teste do Farm Economics Engine v2 — todos os sistemas produtivos.
Execute: python test_all_systems.py
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from datetime import date
from models.production_systems import (
    InputCria, InputRecria, InputTerminacaoPasto,
    InputConfinamento, InputSemiconfinamento,
)
from models.cost_model_v2 import FarmEconomicsV2

engine = FarmEconomicsV2()
PRECO_ARROBA = 315.0

def pct(v): return f"{v*100:.1f}%"
def rs(v):  return f"R$ {v:,.0f}".replace(",",".")
def rsa(v): return f"R$ {v:,.2f}/@".replace(",","X").replace(".",",").replace("X",".")
def sep():  print("-" * 55)

# ─── CRIA ───────────────────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  SISTEMA: CRIA                       ║")
print("╚══════════════════════════════════════╝")
cria = InputCria(
    nome="Rebanho Cria — Nelore", data_referencia=date(2025, 1, 1),
    num_matrizes=400, taxa_natalidade=0.80, taxa_desmama=0.90,
    peso_desmama_kg=195, valor_matriz=4_800,
    custo_nutricao_ua_ano=480, custo_sanidade_ua_ano=120,
    custo_reproducao_ua_ano=180, custo_mao_obra_ua_ano=200,
    custo_arrendamento_ua_ano=350, outros_custos_ua_ano=80,
)
rc = engine.calcular_cria(cria)
print(f"  Matrizes:              {rc.num_matrizes}")
print(f"  Bezerros desmamados:   {rc.bezerros_desmamados}")
print(f"  Custo total/ano:       {rs(rc.custo_total_ano)}")
print(f"  ► Custo/bezerro prod.: {rs(rc.custo_por_bezerro_produzido)}  ← indicador central")

# ─── RECRIA ─────────────────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  SISTEMA: RECRIA                     ║")
print("╚══════════════════════════════════════╝")
recria = InputRecria(
    nome="Recria Bezerros", data_entrada=date(2025, 3, 1),
    num_animais=280, peso_entrada_kg=195, custo_aquisicao_total=0,
    dias_ciclo=210, peso_saida_estimado_kg=370,
    custo_nutricao_dia=3.20, custo_sanidade_dia=0.70,
    custo_mao_obra_dia=0.90, custo_arrendamento_dia=1.80,
)
rr = engine.calcular_recria(recria)
print(f"  Animais:               {rr.num_animais}")
print(f"  GMD:                   {rr.gmd_estimado} kg/dia")
print(f"  ► Custo/kg ganho:      R$ {rr.custo_por_kg_ganho:.2f}/kg  ← indicador central")

# ─── TERMINAÇÃO PASTO ───────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  SISTEMA: TERMINAÇÃO EM PASTAGEM     ║")
print("╚══════════════════════════════════════╝")
term_pasto = InputTerminacaoPasto(
    nome="Terminação Pastagem — Nelore", data_entrada=date(2025, 6, 1),
    num_animais=280, peso_entrada_kg=370, custo_reposicao_total=0,
    dias_ciclo=120, peso_saida_estimado_kg=490,
    custo_suplementacao_dia=5.50, custo_sanidade_dia=0.60,
    custo_mao_obra_dia=1.00, custo_arrendamento_dia=2.20,
    custo_frete_saida=11_200, custo_mortalidade_estimada=4_200,
)
rtp = engine.calcular_terminacao_pasto(term_pasto, PRECO_ARROBA)
print(f"  Animais:               {rtp.num_animais}")
print(f"  Arrobas totais:        {rtp.arrobas_totais} @")
print(f"  ► Custo/@:             {rsa(rtp.custo_por_arroba)}  ← indicador central")
print(f"  Break-even:            {rsa(rtp.break_even_price)}")
print(f"  Margem @ R$315:        {pct(rtp.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rtp.roi_anualizado)}")

# ─── CONFINAMENTO ───────────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  SISTEMA: CONFINAMENTO               ║")
print("╚══════════════════════════════════════╝")
conf = InputConfinamento(
    nome="Confinamento — Cruzado", data_entrada=date(2025, 3, 1),
    num_animais=500, peso_entrada_kg=380, custo_reposicao_total=500 * 2_100,
    dias_ciclo=100, peso_saida_estimado_kg=510,
    consumo_ms_pct_pv=0.024, custo_dieta_kg_ms=0.68,
    custo_sanidade_dia=0.90, custo_mao_obra_dia=1.50, custo_instalacoes_dia=0.80,
    custo_frete_entrada=18_000, custo_frete_saida=20_000, custo_mortalidade_estimada=8_400,
)
rcf = engine.calcular_confinamento(conf, PRECO_ARROBA)
print(f"  Animais:               {rcf.num_animais}")
print(f"  Custo dieta total:     {rs(rcf.custo_dieta_total)} ({pct(rcf.participacao_dieta_pct)} do custo)")
print(f"  ► Custo/@:             {rsa(rcf.custo_por_arroba)}  ← indicador central")
print(f"  Margem @ R$315:        {pct(rcf.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rcf.roi_anualizado)}")

# ─── SEMICONFINAMENTO ───────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  SISTEMA: SEMICONFINAMENTO           ║")
print("╚══════════════════════════════════════╝")
semi = InputSemiconfinamento(
    nome="Semiconfinamento — Nelore Cruzado", data_entrada=date(2025, 4, 1),
    num_animais=200, peso_entrada_kg=360, custo_reposicao_total=200 * 1_950,
    dias_ciclo=110, peso_saida_estimado_kg=490,
    custo_arrendamento_dia=2.00, custo_manutencao_pasto_dia=0.80,
    consumo_suplemento_kg_dia=3.5, custo_suplemento_kg=0.95,
    custo_sanidade_dia=0.70, custo_mao_obra_dia=1.10,
    custo_frete_saida=8_000, custo_mortalidade_estimada=3_900,
)
rsc = engine.calcular_semiconfinamento(semi, PRECO_ARROBA)
print(f"  Animais:               {rsc.num_animais}")
print(f"  ► Custo/@:             {rsa(rsc.custo_por_arroba)}  ← indicador central")
print(f"  Margem @ R$315:        {pct(rsc.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rsc.roi_anualizado)}")

# ─── COMPARATIVO ────────────────────────────────────────────
print("\n╔══════════════════════════════════════════════════════╗")
print("║  COMPARATIVO — SISTEMAS DE TERMINAÇÃO               ║")
print("╚══════════════════════════════════════════════════════╝")
print(f"{'Sistema':<22} {'Custo/@':>10} {'Break-even':>12} {'Margem':>8} {'ROI anual':>10}")
sep()
for label, r in [("Terminação Pasto", rtp), ("Confinamento", rcf), ("Semiconfinamento", rsc)]:
    print(f"{label:<22} {rsa(r.custo_por_arroba):>10} {rsa(r.break_even_price):>12} {pct(r.margem_percentual):>8} {pct(r.roi_anualizado):>10}")
print()
