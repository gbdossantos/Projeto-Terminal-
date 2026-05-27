"""
Teste do Farm Economics Engine v3 — todos os sistemas pós-refactor.

Cobre:
1. Cálculo das 5 categorias originais com os novos LoteInput*.
2. Bateria de regressão cria/recria × sistema (6 combinações):
   garante que `sistema` é meta-tag e NÃO altera o output numérico
   (consequência direta da Decisão 1 de Portão 1).

Execute: ./venv/bin/python test_all_systems.py
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from datetime import date

from models.production_systems import (
    Fase, Sistema,
    LoteInputCria, LoteInputRecria, LoteInputTerminacao,
)
from models.cost_model_v2 import FarmEconomicsV2

engine = FarmEconomicsV2()
PRECO_ARROBA = 315.0


def pct(v): return f"{v*100:.1f}%"
def rs(v):  return f"R$ {v:,.0f}".replace(",", ".")
def rsa(v): return f"R$ {v:,.2f}/@".replace(",", "X").replace(".", ",").replace("X", ".")
def sep():  print("-" * 55)


# ─── CRIA ───────────────────────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  FASE: CRIA                          ║")
print("╚══════════════════════════════════════╝")
cria = LoteInputCria(
    fase=Fase.CRIA, sistema=Sistema.PASTO,    # sistema é meta-tag aqui
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
print("║  FASE: RECRIA                        ║")
print("╚══════════════════════════════════════╝")
recria = LoteInputRecria(
    fase=Fase.RECRIA, sistema=Sistema.PASTO,
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
print("║  FASE: TERMINAÇÃO · SISTEMA PASTO    ║")
print("╚══════════════════════════════════════╝")
term_pasto = LoteInputTerminacao(
    fase=Fase.TERMINACAO, sistema=Sistema.PASTO,
    nome="Terminação Pastagem — Nelore", data_entrada=date(2025, 6, 1),
    num_animais=280, peso_entrada_kg=370, custo_reposicao_total=0,
    dias_ciclo=120, peso_saida_estimado_kg=490,
    custo_suplementacao_dia=5.50, custo_sanidade_dia=0.60,
    custo_mao_obra_dia=1.00, custo_arrendamento_dia=2.20,
    custo_frete_saida=11_200, custo_mortalidade_estimada=4_200,
)
rtp = engine.calcular_terminacao(term_pasto, PRECO_ARROBA)
print(f"  Animais:               {rtp.num_animais}")
print(f"  Arrobas totais:        {rtp.arrobas_totais} @")
print(f"  ► Custo/@:             {rsa(rtp.custo_por_arroba)}  ← indicador central")
print(f"  Break-even:            {rsa(rtp.break_even_price)}")
print(f"  Margem @ R$315:        {pct(rtp.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rtp.roi_anualizado)}")

# ─── TERMINAÇÃO CONFINAMENTO ─────────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  FASE: TERMINAÇÃO · CONFINAMENTO     ║")
print("╚══════════════════════════════════════╝")
conf = LoteInputTerminacao(
    fase=Fase.TERMINACAO, sistema=Sistema.CONFINAMENTO,
    nome="Confinamento — Cruzado", data_entrada=date(2025, 3, 1),
    num_animais=500, peso_entrada_kg=380, custo_reposicao_total=500 * 2_100,
    dias_ciclo=100, peso_saida_estimado_kg=510,
    consumo_ms_pct_pv=0.024, custo_dieta_kg_ms=0.68,
    custo_sanidade_dia=0.90, custo_mao_obra_dia=1.50, custo_instalacoes_dia=0.80,
    custo_frete_entrada=18_000, custo_frete_saida=20_000, custo_mortalidade_estimada=8_400,
)
rcf = engine.calcular_terminacao(conf, PRECO_ARROBA)
print(f"  Animais:               {rcf.num_animais}")
print(f"  Custo dieta total:     {rs(rcf.custo_dieta_total)} ({pct(rcf.participacao_dieta_pct)} do custo)")
print(f"  ► Custo/@:             {rsa(rcf.custo_por_arroba)}  ← indicador central")
print(f"  Margem @ R$315:        {pct(rcf.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rcf.roi_anualizado)}")

# ─── TERMINAÇÃO SEMICONFINAMENTO ─────────────────────────────
print("\n╔══════════════════════════════════════╗")
print("║  FASE: TERMINAÇÃO · SEMI             ║")
print("╚══════════════════════════════════════╝")
semi = LoteInputTerminacao(
    fase=Fase.TERMINACAO, sistema=Sistema.SEMICONFINAMENTO,
    nome="Semiconfinamento — Nelore Cruzado", data_entrada=date(2025, 4, 1),
    num_animais=200, peso_entrada_kg=360, custo_reposicao_total=200 * 1_950,
    dias_ciclo=110, peso_saida_estimado_kg=490,
    custo_arrendamento_dia=2.00, custo_manutencao_pasto_dia=0.80,
    consumo_suplemento_kg_dia=3.5, custo_suplemento_kg=0.95,
    custo_sanidade_dia=0.70, custo_mao_obra_dia=1.10,
    custo_frete_saida=8_000, custo_mortalidade_estimada=3_900,
)
rsc = engine.calcular_terminacao(semi, PRECO_ARROBA)
print(f"  Animais:               {rsc.num_animais}")
print(f"  ► Custo/@:             {rsa(rsc.custo_por_arroba)}  ← indicador central")
print(f"  Margem @ R$315:        {pct(rsc.margem_percentual)}")
print(f"  ROI anualizado:        {pct(rsc.roi_anualizado)}")

# ─── COMPARATIVO ────────────────────────────────────────────
print("\n╔══════════════════════════════════════════════════════╗")
print("║  COMPARATIVO — SISTEMAS DE TERMINAÇÃO                ║")
print("╚══════════════════════════════════════════════════════╝")
print(f"{'Sistema':<22} {'Custo/@':>10} {'Break-even':>12} {'Margem':>8} {'ROI anual':>10}")
sep()
for label, r in [("Pasto", rtp), ("Confinamento", rcf), ("Semiconfinamento", rsc)]:
    print(f"{label:<22} {rsa(r.custo_por_arroba):>10} {rsa(r.break_even_price):>12} {pct(r.margem_percentual):>8} {pct(r.roi_anualizado):>10}")


# ════════════════════════════════════════════════════════════
# BATERIA DE REGRESSÃO — Decisão 1 do Portão 1
# Cria e Recria são sistema-agnósticas: o output numérico não pode
# variar com o `sistema` declarado. Testamos as 6 combinações.
# ════════════════════════════════════════════════════════════

print("\n\n╔══════════════════════════════════════════════════════╗")
print("║  REGRESSÃO: CRIA/RECRIA × SISTEMA (agnosticismo)     ║")
print("╚══════════════════════════════════════════════════════╝")

cria_base_kwargs = dict(
    fase=Fase.CRIA,
    nome="Cria Regressão", data_referencia=date(2025, 1, 1),
    num_matrizes=400, taxa_natalidade=0.80, taxa_desmama=0.90,
    peso_desmama_kg=195, valor_matriz=4_800,
    custo_nutricao_ua_ano=480, custo_sanidade_ua_ano=120,
    custo_reproducao_ua_ano=180, custo_mao_obra_ua_ano=200,
    custo_arrendamento_ua_ano=350, outros_custos_ua_ano=80,
)
recria_base_kwargs = dict(
    fase=Fase.RECRIA,
    nome="Recria Regressão", data_entrada=date(2025, 3, 1),
    num_animais=280, peso_entrada_kg=195, custo_aquisicao_total=0,
    dias_ciclo=210, peso_saida_estimado_kg=370,
    custo_nutricao_dia=3.20, custo_sanidade_dia=0.70,
    custo_mao_obra_dia=0.90, custo_arrendamento_dia=1.80,
)

cria_pasto = engine.calcular_cria(LoteInputCria(sistema=Sistema.PASTO, **cria_base_kwargs))
cria_semi  = engine.calcular_cria(LoteInputCria(sistema=Sistema.SEMICONFINAMENTO, **cria_base_kwargs))
cria_conf  = engine.calcular_cria(LoteInputCria(sistema=Sistema.CONFINAMENTO, **cria_base_kwargs))

recr_pasto = engine.calcular_recria(LoteInputRecria(sistema=Sistema.PASTO, **recria_base_kwargs))
recr_semi  = engine.calcular_recria(LoteInputRecria(sistema=Sistema.SEMICONFINAMENTO, **recria_base_kwargs))
recr_conf  = engine.calcular_recria(LoteInputRecria(sistema=Sistema.CONFINAMENTO, **recria_base_kwargs))


def check_agnostico(label, valor_pasto, valor_outro, sistema_outro):
    """Output numérico deve ser idêntico (sistema é meta-tag)."""
    ok = valor_pasto == valor_outro
    status = "✅" if ok else "❌"
    print(f"  {status} {label} pasto={valor_pasto} vs {sistema_outro}={valor_outro}")
    return ok


print("\n  Cria — 3 combinações com mesmos inputs numéricos:")
all_ok = True
for indicador in [
    "bezerros_desmamados",
    "custo_total_ano",
    "custo_por_bezerro_produzido",
    "custo_por_matriz_ano",
    "capital_rebanho",
]:
    vp = getattr(cria_pasto, indicador)
    vs = getattr(cria_semi, indicador)
    vc = getattr(cria_conf, indicador)
    all_ok &= check_agnostico(f"cria.{indicador}", vp, vs, "semi")
    all_ok &= check_agnostico(f"cria.{indicador}", vp, vc, "conf")

print("\n  Recria — 3 combinações com mesmos inputs numéricos:")
for indicador in [
    "gmd_estimado",
    "kg_ganho_total",
    "custo_total",
    "custo_por_cabeca",
    "custo_por_kg_ganho",
    "capital_empregado",
]:
    vp = getattr(recr_pasto, indicador)
    vs = getattr(recr_semi, indicador)
    vc = getattr(recr_conf, indicador)
    all_ok &= check_agnostico(f"recria.{indicador}", vp, vs, "semi")
    all_ok &= check_agnostico(f"recria.{indicador}", vp, vc, "conf")

print(f"\n  Meta-tag sistema preservado nos outputs:")
print(f"    cria(pasto).sistema = {cria_pasto.sistema.value}")
print(f"    cria(semi).sistema  = {cria_semi.sistema.value}")
print(f"    cria(conf).sistema  = {cria_conf.sistema.value}")

print()
if all_ok:
    print("  ✅ Regressão OK: sistema é meta-tag para cria/recria (output 100% idêntico)")
else:
    print("  ❌ Regressão QUEBROU: sistema afetou output de cria/recria — Portão 2")
    sys.exit(1)
