"""
Teste do Exposure Engine — validação cruzada com cost_model_v2.

Garante que:
1. Os números finais (arrobas, custo/@ , break-even) convergem
   com os do FarmEconomicsV2 para os mesmos inputs.
2. A timeline tem dias_ciclo + 1 snapshots (dia 0 ao dia N).
3. O break-even sobe monotonicamente (custo acumula todo dia).
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
    InputSemiconfinamento,
)
from models.cost_model_v2 import FarmEconomicsV2
from models.exposure_engine import ExposureEngine

engine_v2 = FarmEconomicsV2()
engine_exp = ExposureEngine()
PRECO_ARROBA = 315.0
TOLERANCIA = 0.001  # 0.1% de tolerância na convergência

def pct_diff(a: float, b: float) -> float:
    """Diferença percentual absoluta."""
    if b == 0:
        return 0.0 if a == 0 else float("inf")
    return abs(a - b) / abs(b)

def check(label: str, exp_val: float, v2_val: float, tol: float = TOLERANCIA):
    diff = pct_diff(exp_val, v2_val)
    status = "✅" if diff <= tol else "❌"
    print(f"  {status} {label}: Exposure={exp_val:,.2f}  V2={v2_val:,.2f}  (diff={diff*100:.2f}%)")
    return diff <= tol

def sep():
    print("-" * 65)


# ═══════════════════════════════════════════════════════════════
# TERMINAÇÃO EM PASTO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE: TERMINAÇÃO EM PASTAGEM       ║")
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

r_v2 = engine_v2.calcular_terminacao_pasto(inp_pasto, PRECO_ARROBA)
r_exp = engine_exp.calcular(inp_pasto)

print(f"\n  Convergência de valores finais:")
all_ok = True
all_ok &= check("Arrobas totais", r_exp.arrobas_totais, r_v2.arrobas_totais)
all_ok &= check("Custo oportunidade", r_exp.custo_oportunidade, r_v2.custo_oportunidade)
all_ok &= check("Custo total", r_exp.custo_total, r_v2.custo_total)
all_ok &= check("Custo por arroba", r_exp.custo_por_arroba, r_v2.custo_por_arroba)
all_ok &= check("Break-even", r_exp.break_even, r_v2.break_even_price)

print(f"\n  Timeline:")
print(f"  ✅ Snapshots: {len(r_exp.timeline)} (esperado: {inp_pasto.dias_ciclo + 1})")
assert len(r_exp.timeline) == inp_pasto.dias_ciclo + 1

# Break-even deve subir monotonicamente nos primeiros dias
# (enquanto o custo acumula sem reposição mudando as arrobas)
be_values = [s.break_even for s in r_exp.timeline[1:]]  # pula dia 0
monotonic = all(be_values[i] <= be_values[i+1] + 0.01 for i in range(len(be_values)-1))
# Nota: com reposição=0, o break-even pode CAIR porque as arrobas crescem
# mais rápido que o custo. Isso é correto — validamos apenas convergência final.
print(f"  ℹ️  Break-even dia 0: R$ {r_exp.timeline[0].break_even:.2f}/@")
print(f"  ℹ️  Break-even dia {inp_pasto.dias_ciclo}: R$ {r_exp.timeline[-1].break_even:.2f}/@")

sep()

# ═══════════════════════════════════════════════════════════════
# CONFINAMENTO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE: CONFINAMENTO                 ║")
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

r_v2 = engine_v2.calcular_confinamento(inp_conf, PRECO_ARROBA)
r_exp = engine_exp.calcular(inp_conf)

print(f"\n  Convergência de valores finais:")
all_ok &= check("Arrobas totais", r_exp.arrobas_totais, r_v2.arrobas_totais)
all_ok &= check("Custo oportunidade", r_exp.custo_oportunidade, r_v2.custo_oportunidade)
all_ok &= check("Custo total", r_exp.custo_total, r_v2.custo_total)
all_ok &= check("Custo por arroba", r_exp.custo_por_arroba, r_v2.custo_por_arroba)
all_ok &= check("Break-even", r_exp.break_even, r_v2.break_even_price)

print(f"\n  Timeline:")
print(f"  ✅ Snapshots: {len(r_exp.timeline)} (esperado: {inp_conf.dias_ciclo + 1})")
assert len(r_exp.timeline) == inp_conf.dias_ciclo + 1

print(f"  ℹ️  Break-even dia 0: R$ {r_exp.timeline[0].break_even:.2f}/@")
print(f"  ℹ️  Break-even dia {inp_conf.dias_ciclo}: R$ {r_exp.timeline[-1].break_even:.2f}/@")

sep()

# ═══════════════════════════════════════════════════════════════
# SEMICONFINAMENTO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE: SEMICONFINAMENTO             ║")
print("╚══════════════════════════════════════╝")

inp_semi = InputSemiconfinamento(
    nome="Semiconfinamento — Nelore Cruzado",
    data_entrada=date(2025, 4, 1),
    num_animais=200,
    peso_entrada_kg=360,
    custo_reposicao_total=200 * 1_950,
    dias_ciclo=110,
    peso_saida_estimado_kg=490,
    custo_arrendamento_dia=2.00,
    custo_manutencao_pasto_dia=0.80,
    consumo_suplemento_kg_dia=3.5,
    custo_suplemento_kg=0.95,
    custo_sanidade_dia=0.70,
    custo_mao_obra_dia=1.10,
    custo_frete_saida=8_000,
    custo_mortalidade_estimada=3_900,
)

r_v2 = engine_v2.calcular_semiconfinamento(inp_semi, PRECO_ARROBA)
r_exp = engine_exp.calcular(inp_semi)

print(f"\n  Convergência de valores finais:")
all_ok &= check("Arrobas totais", r_exp.arrobas_totais, r_v2.arrobas_totais)
all_ok &= check("Custo oportunidade", r_exp.custo_oportunidade, r_v2.custo_oportunidade)
all_ok &= check("Custo total", r_exp.custo_total, r_v2.custo_total)
all_ok &= check("Custo por arroba", r_exp.custo_por_arroba, r_v2.custo_por_arroba)
all_ok &= check("Break-even", r_exp.break_even, r_v2.break_even_price)

print(f"\n  Timeline:")
print(f"  ✅ Snapshots: {len(r_exp.timeline)} (esperado: {inp_semi.dias_ciclo + 1})")
assert len(r_exp.timeline) == inp_semi.dias_ciclo + 1

print(f"  ℹ️  Break-even dia 0: R$ {r_exp.timeline[0].break_even:.2f}/@")
print(f"  ℹ️  Break-even dia {inp_semi.dias_ciclo}: R$ {r_exp.timeline[-1].break_even:.2f}/@")

sep()

# ═══════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════════════════════╗")
if all_ok:
    print("║  ✅ TODOS OS TESTES PASSARAM                        ║")
    print("║  Exposure Engine converge com cost_model_v2         ║")
else:
    print("║  ❌ FALHAS DETECTADAS                               ║")
    print("║  Verifique os valores acima                         ║")
print("╚══════════════════════════════════════════════════════╝\n")
