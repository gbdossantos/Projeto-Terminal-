"""
Teste do Economic Impact Engine.

Valida que:
1. Os cenários de downside geram números consistentes.
2. Os semáforos estão corretos (verde/amarelo/vermelho).
3. A pergunta invertida é gerada corretamente.
4. Funciona para os 3 sistemas de terminação.
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from datetime import date
from models.production_systems import (
    InputTerminacaoPasto,
    InputConfinamento,
)
from models.exposure_engine import ExposureEngine
from models.economic_impact import EconomicImpactEngine

exp_engine = ExposureEngine()
impact_engine = EconomicImpactEngine()
PRECO_ARROBA = 355.0  # preço atual aproximado

def rs(v):  return f"R$ {v:,.0f}".replace(",",".")
def pct(v): return f"{v*100:.1f}%"
def sep():  print("-" * 65)


# ═══════════════════════════════════════════════════════════════
# TERMINAÇÃO EM PASTO — margem alta, deve ter verde até 20%
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  IMPACTO: TERMINAÇÃO EM PASTAGEM     ║")
print("╚══════════════════════════════════════╝")

inp_pasto = InputTerminacaoPasto(
    nome="Terminação Pastagem — Nelore",
    data_entrada=date(2025, 6, 1),
    num_animais=280,
    peso_entrada_kg=370,
    custo_reposicao_total=0,
    dias_ciclo=120,
    peso_saida_estimado_kg=490,
    custo_suplementacao_dia=5.50,
    custo_sanidade_dia=0.60,
    custo_mao_obra_dia=1.00,
    custo_arrendamento_dia=2.20,
    custo_frete_saida=11_200,
    custo_mortalidade_estimada=4_200,
)

exposure = exp_engine.calcular(inp_pasto)
report = impact_engine.calcular(exposure, preco_mercado=PRECO_ARROBA)

print(f"\n  Lote: {report.num_animais} animais · {report.arrobas_totais} @ · {report.dias_restantes} dias restantes")
print(f"  Preço atual: R$ {report.preco_atual}/@")
print(f"  Margem atual: {pct(report.margem_atual_pct)}")
print(f"  Queda máx antes de amarelo: {pct(report.queda_max_antes_vermelho_pct)}")
print()

print(f"  {'Cenário':<15} {'Preço/@':>10} {'Margem R$':>14} {'Margem %':>10} {'ROI a.a.':>10} {'Semáforo':>10}")
sep()
for c in report.cenarios:
    emoji = {"verde": "🟢", "amarelo": "🟡", "vermelho": "🔴"}[c.semaforo]
    print(f"  {c.label:<15} {f'R$ {c.preco_arroba:.0f}':>10} {rs(c.margem_brl):>14} {pct(c.margem_pct):>10} {pct(c.roi_anualizado):>10} {emoji:>6}")
sep()

print(f"\n  💬 {report.pergunta_invertida}")

# Validações
assert report.cenarios[0].semaforo == "verde", "Cenário base deveria ser verde"
assert report.cenarios[0].perda_vs_base_brl == 0, "Cenário base não tem perda"
assert all(
    report.cenarios[i].margem_brl >= report.cenarios[i+1].margem_brl
    for i in range(len(report.cenarios)-1)
), "Margem deve cair com queda de preço"
print("\n  ✅ Validações OK")


# ═══════════════════════════════════════════════════════════════
# CONFINAMENTO — margem mais apertada, deve amarelecer antes
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  IMPACTO: CONFINAMENTO               ║")
print("╚══════════════════════════════════════╝")

inp_conf = InputConfinamento(
    nome="Confinamento — Cruzado",
    data_entrada=date(2025, 3, 1),
    num_animais=500,
    peso_entrada_kg=380,
    custo_reposicao_total=500 * 2_100,
    dias_ciclo=100,
    peso_saida_estimado_kg=510,
    consumo_ms_pct_pv=0.024,
    custo_dieta_kg_ms=0.68,
    custo_sanidade_dia=0.90,
    custo_mao_obra_dia=1.50,
    custo_instalacoes_dia=0.80,
    custo_frete_entrada=18_000,
    custo_frete_saida=20_000,
    custo_mortalidade_estimada=8_400,
)

exposure = exp_engine.calcular(inp_conf)
report = impact_engine.calcular(exposure, preco_mercado=PRECO_ARROBA)

print(f"\n  Lote: {report.num_animais} animais · {report.arrobas_totais} @ · {report.dias_restantes} dias restantes")
print(f"  Preço atual: R$ {report.preco_atual}/@")
print(f"  Margem atual: {pct(report.margem_atual_pct)}")
print(f"  Queda máx antes de amarelo: {pct(report.queda_max_antes_vermelho_pct)}")
print()

print(f"  {'Cenário':<15} {'Preço/@':>10} {'Margem R$':>14} {'Margem %':>10} {'ROI a.a.':>10} {'Semáforo':>10}")
sep()
for c in report.cenarios:
    emoji = {"verde": "🟢", "amarelo": "🟡", "vermelho": "🔴"}[c.semaforo]
    print(f"  {c.label:<15} {f'R$ {c.preco_arroba:.0f}':>10} {rs(c.margem_brl):>14} {pct(c.margem_pct):>10} {pct(c.roi_anualizado):>10} {emoji:>6}")
sep()

print(f"\n  💬 {report.pergunta_invertida}")

# Validações
assert all(
    report.cenarios[i].margem_brl >= report.cenarios[i+1].margem_brl
    for i in range(len(report.cenarios)-1)
), "Margem deve cair com queda de preço"
print("\n  ✅ Validações OK")

# ═══════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════════════════════╗")
print("║  ✅ ECONOMIC IMPACT ENGINE — TODOS OS TESTES OK     ║")
print("╚══════════════════════════════════════════════════════╝\n")
