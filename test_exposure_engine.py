"""
Teste do Exposure Engine — convergência cruzada com cost_model_v2.

Pós-refactor (Fase 4 / Portão 1): bateria das 3 combinações de TERMINAÇÃO.
Critério: 0.00% de diferença em custo/@, break-even, custo total, custo
oportunidade e arrobas. Se quebrar → parar (Portão 2).

Garante também:
  - Timeline tem dias_ciclo + 1 snapshots
  - Funciona pros 3 sistemas (pasto, conf, semi) via mesmo
    LoteInputTerminacao + lookup central em parametros_sistema
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from datetime import date

from models.production_systems import (
    Fase, Sistema, LoteInputTerminacao,
)
from models.cost_model_v2 import FarmEconomicsV2
from models.exposure_engine import ExposureEngine

engine_v2 = FarmEconomicsV2()
engine_exp = ExposureEngine()
PRECO_ARROBA = 315.0

# Critério Portão 1: 0.00% — qualquer diferença numérica é falha.
TOLERANCIA = 0.0


def pct_diff(a: float, b: float) -> float:
    """Diferença percentual absoluta."""
    if b == 0:
        return 0.0 if a == 0 else float("inf")
    return abs(a - b) / abs(b)


def check(label: str, exp_val: float, v2_val: float, tol: float = TOLERANCIA):
    diff = pct_diff(exp_val, v2_val)
    status = "✅" if diff <= tol else "❌"
    print(f"  {status} {label}: Exposure={exp_val:,.2f}  V2={v2_val:,.2f}  (diff={diff*100:.4f}%)")
    return diff <= tol


def sep():
    print("-" * 65)


CENARIOS = [
    {
        "label": "TERMINAÇÃO · PASTO",
        "inp": LoteInputTerminacao(
            fase=Fase.TERMINACAO, sistema=Sistema.PASTO,
            nome="Terminação Pastagem — Nelore",
            data_entrada=date(2025, 6, 1),
            num_animais=280, peso_entrada_kg=370, peso_saida_estimado_kg=490,
            custo_reposicao_total=0, dias_ciclo=120,
            custo_suplementacao_dia=5.50, custo_arrendamento_dia=2.20,
            custo_sanidade_dia=0.60, custo_mao_obra_dia=1.00,
            custo_frete_saida=11_200, custo_mortalidade_estimada=4_200,
        ),
    },
    {
        "label": "TERMINAÇÃO · CONFINAMENTO",
        "inp": LoteInputTerminacao(
            fase=Fase.TERMINACAO, sistema=Sistema.CONFINAMENTO,
            nome="Confinamento — Cruzado",
            data_entrada=date(2025, 3, 1),
            num_animais=500, peso_entrada_kg=380, peso_saida_estimado_kg=510,
            custo_reposicao_total=500 * 2_100, dias_ciclo=100,
            consumo_ms_pct_pv=0.024, custo_dieta_kg_ms=0.68,
            custo_sanidade_dia=0.90, custo_mao_obra_dia=1.50,
            custo_instalacoes_dia=0.80,
            custo_frete_entrada=18_000, custo_frete_saida=20_000,
            custo_mortalidade_estimada=8_400,
        ),
    },
    {
        "label": "TERMINAÇÃO · SEMICONFINAMENTO",
        "inp": LoteInputTerminacao(
            fase=Fase.TERMINACAO, sistema=Sistema.SEMICONFINAMENTO,
            nome="Semiconfinamento — Nelore Cruzado",
            data_entrada=date(2025, 4, 1),
            num_animais=200, peso_entrada_kg=360, peso_saida_estimado_kg=490,
            custo_reposicao_total=200 * 1_950, dias_ciclo=110,
            custo_arrendamento_dia=2.00, custo_manutencao_pasto_dia=0.80,
            consumo_suplemento_kg_dia=3.5, custo_suplemento_kg=0.95,
            custo_sanidade_dia=0.70, custo_mao_obra_dia=1.10,
            custo_frete_saida=8_000, custo_mortalidade_estimada=3_900,
        ),
    },
]


all_ok = True
for cen in CENARIOS:
    print(f"\n╔══════════════════════════════════════╗")
    print(f"║  {cen['label']:<36}║")
    print(f"╚══════════════════════════════════════╝")

    inp = cen["inp"]
    r_v2 = engine_v2.calcular_terminacao(inp, PRECO_ARROBA)
    r_exp = engine_exp.calcular(inp)

    print(f"\n  Convergência de valores finais (critério: 0.0000%):")
    all_ok &= check("Arrobas totais",      r_exp.arrobas_totais,    r_v2.arrobas_totais)
    all_ok &= check("Custo oportunidade",  r_exp.custo_oportunidade, r_v2.custo_oportunidade)
    all_ok &= check("Custo total",         r_exp.custo_total,       r_v2.custo_total)
    all_ok &= check("Custo por arroba",    r_exp.custo_por_arroba,  r_v2.custo_por_arroba)
    all_ok &= check("Break-even",          r_exp.break_even,        r_v2.break_even_price)

    print(f"\n  Timeline:")
    snaps_esperados = inp.dias_ciclo + 1
    if len(r_exp.timeline) == snaps_esperados:
        print(f"  ✅ Snapshots: {len(r_exp.timeline)} (esperado: {snaps_esperados})")
    else:
        print(f"  ❌ Snapshots: {len(r_exp.timeline)} ≠ {snaps_esperados}")
        all_ok = False
    print(f"  ℹ️  Break-even dia 0:   R$ {r_exp.timeline[0].break_even:.2f}/@")
    print(f"  ℹ️  Break-even dia {inp.dias_ciclo}: R$ {r_exp.timeline[-1].break_even:.2f}/@")
    print(f"  ℹ️  Fase declarada: {r_exp.fase.value}  Sistema: {r_exp.sistema.value}")

    sep()


print(f"\n╔══════════════════════════════════════════════════════╗")
if all_ok:
    print(f"║  ✅ CONVERGÊNCIA 0.0000% NAS 3 COMBINAÇÕES            ║")
    print(f"║  Exposure ↔ cost_model_v2.calcular_terminacao OK     ║")
else:
    print(f"║  ❌ PORTÃO 2 — convergência quebrou                  ║")
    print(f"║  Verifique deltas acima. Não ajustar fórmula.        ║")
print(f"╚══════════════════════════════════════════════════════╝\n")

sys.exit(0 if all_ok else 1)
