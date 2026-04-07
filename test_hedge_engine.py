"""
Teste do Hedge Engine — validação dos cálculos de hedge com futuros B3.

Valida que:
1. O sizing de contratos está correto (round, não ceil).
2. A seleção de contrato respeita a data de venda.
3. Os cálculos de economia hedgeada convergem.
4. O basis impacta corretamente o preço travado.
5. Edge cases não crasham.
6. O semáforo classifica corretamente.
"""

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from datetime import date, datetime
from models.exposure_engine import ExposureEngine, LotExposure
from models.hedge_engine import HedgeEngine, HedgeResult, ContratoFuturo, CurvaFuturos
from models.production_systems import InputTerminacaoPasto
from models.constants import ARROBAS_POR_CONTRATO

hedge_engine = HedgeEngine()
exp_engine = ExposureEngine()


def sep():  print("-" * 65)


# ═══════════════════════════════════════════════════════════════
# TESTE 1: SIZING DE CONTRATOS
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 1: SIZING DE CONTRATOS        ║")
print("╚══════════════════════════════════════╝")

# 1000@ → round(1000/330) = round(3.03) = 3 contratos
assert hedge_engine._calcular_contratos(1000) == 3, "1000@ deveria ser 3 contratos"
assert 3 * 330 == 990, "3 contratos = 990@"

# 164@ → menos que metade de um contrato
assert hedge_engine._calcular_contratos(164) == 0, "164@ (< metade contrato) deveria ser 0"

# 165@ → exatamente metade, Python round(0.5)=0 (banker's rounding)
assert hedge_engine._calcular_contratos(165) == 0, "165@ (= metade exata) → 0 por banker's rounding"

# 200@ → round(200/330) = round(0.606) = 1
assert hedge_engine._calcular_contratos(200) == 1, "200@ deveria ser 1 contrato"

# 500@ → round(500/330) = round(1.515) = 2
assert hedge_engine._calcular_contratos(500) == 2, "500@ deveria ser 2 contratos"

# 330@ → exatamente 1
assert hedge_engine._calcular_contratos(330) == 1, "330@ deveria ser 1 contrato"

print("  ✅ Sizing de contratos OK")


# ═══════════════════════════════════════════════════════════════
# TESTE 2: SELEÇÃO DE CONTRATO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 2: SELEÇÃO DE CONTRATO        ║")
print("╚══════════════════════════════════════╝")

curva = CurvaFuturos(
    contratos=tuple([
        ContratoFuturo(codigo="BGIQ26", vencimento=date(2026, 8, 31), preco_ajuste=340.0),
        ContratoFuturo(codigo="BGIV26", vencimento=date(2026, 10, 31), preco_ajuste=345.0),
        ContratoFuturo(codigo="BGIZ26", vencimento=date(2026, 12, 31), preco_ajuste=350.0),
    ]),
    fonte="teste",
)

# Venda em setembro → sem match exato, seleciona Out (próximo após)
c = hedge_engine.selecionar_contrato(curva, date(2026, 9, 20))
assert c.codigo == "BGIV26", f"Deveria selecionar BGIV26, selecionou {c.codigo}"
print(f"  ✅ Venda Set → selecionou {c.codigo} (Out)")

# Venda em outubro → match exato
c = hedge_engine.selecionar_contrato(curva, date(2026, 10, 15))
assert c.codigo == "BGIV26", f"Deveria selecionar BGIV26, selecionou {c.codigo}"
print(f"  ✅ Venda Out → selecionou {c.codigo} (match exato)")

# Venda em agosto → match exato
c = hedge_engine.selecionar_contrato(curva, date(2026, 8, 10))
assert c.codigo == "BGIQ26", f"Deveria selecionar BGIQ26, selecionou {c.codigo}"
print(f"  ✅ Venda Ago → selecionou {c.codigo} (match exato)")

# Venda muito futura → fallback último contrato
c = hedge_engine.selecionar_contrato(curva, date(2027, 6, 1))
assert c.codigo == "BGIZ26", f"Deveria selecionar BGIZ26, selecionou {c.codigo}"
print(f"  ✅ Venda Jun/27 → fallback {c.codigo} (último disponível)")

# Curva vazia
c = hedge_engine.selecionar_contrato(
    CurvaFuturos(contratos=(), fonte="vazio"), date(2026, 10, 1)
)
assert c is None, "Curva vazia deveria retornar None"
print("  ✅ Curva vazia → None")


# ═══════════════════════════════════════════════════════════════
# TESTE 3: ECONOMIA DO HEDGE
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 3: ECONOMIA DO HEDGE          ║")
print("╚══════════════════════════════════════╝")

# Criar exposure de teste com valores conhecidos
inp = InputTerminacaoPasto(
    nome="Teste Hedge",
    data_entrada=date(2026, 6, 1),
    num_animais=280,
    peso_entrada_kg=370,
    custo_reposicao_total=280 * 2200,  # R$ 616.000
    dias_ciclo=120,
    peso_saida_estimado_kg=490,
    custo_suplementacao_dia=5.50,
    custo_sanidade_dia=0.60,
    custo_mao_obra_dia=1.00,
    custo_arrendamento_dia=2.20,
    custo_frete_saida=11_200,
    custo_mortalidade_estimada=4_200,
)

exposure = exp_engine.calcular(inp, data_referencia=date(2026, 6, 1))
contrato = ContratoFuturo(
    codigo="BGIV26", vencimento=date(2026, 10, 31), preco_ajuste=345.0,
)
preco_spot = 350.0
basis = -5.0

result = hedge_engine.calcular(
    exposure=exposure,
    contrato=contrato,
    preco_spot=preco_spot,
    basis_estimado=basis,
    cdi_anual=0.14,
    margem_garantia_pct=0.05,
)

print(f"  Arrobas totais: {result.arrobas_totais}")
print(f"  Contratos: {result.contratos_necessarios}")
print(f"  Arrobas hedgeadas: {result.arrobas_hedgeadas}")
print(f"  Cobertura: {result.cobertura_pct * 100:.1f}%")
print(f"  Preço travado: R$ {result.preco_travado}/@")
print(f"  Margem com hedge: R$ {result.margem_hedgeada_brl:,.0f}")
print(f"  Margem sem hedge: R$ {result.margem_spot_brl:,.0f}")
print(f"  Custo do hedge: R$ {result.custo_hedge:,.0f}")
print(f"  Semáforo: {result.semaforo_hedge}")
sep()

# Validações
assert result.preco_travado == 340.0, f"Preço travado deveria ser 340 (345-5), é {result.preco_travado}"
assert result.arrobas_hedgeadas % ARROBAS_POR_CONTRATO == 0, "Arrobas hedgeadas deve ser múltiplo de 330"
assert result.custo_hedge > 0, "Custo do hedge deve ser positivo"
assert result.receita_hedgeada > 0, "Receita hedgeada deve ser positiva"
assert result.cobertura_pct <= 1.0, "Cobertura não pode exceder 100%"
assert len(result.cenarios_grafico) == 3, "Deve ter 3 cenários para o gráfico"
print("  ✅ Economia do hedge OK")


# ═══════════════════════════════════════════════════════════════
# TESTE 4: IMPACTO DO BASIS
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 4: IMPACTO DO BASIS            ║")
print("╚══════════════════════════════════════╝")

r_sem_basis = hedge_engine.calcular(
    exposure=exposure, contrato=contrato,
    preco_spot=preco_spot, basis_estimado=0.0,
)
r_com_basis = hedge_engine.calcular(
    exposure=exposure, contrato=contrato,
    preco_spot=preco_spot, basis_estimado=-10.0,
)

diff = r_sem_basis.preco_travado - r_com_basis.preco_travado
assert abs(diff - 10.0) < 0.01, f"Diferença de basis deveria ser 10, é {diff}"
print(f"  Sem basis: R$ {r_sem_basis.preco_travado}/@")
print(f"  Com basis -10: R$ {r_com_basis.preco_travado}/@")
print(f"  Diferença: R$ {diff}")
print("  ✅ Impacto do basis OK")


# ═══════════════════════════════════════════════════════════════
# TESTE 5: SEMÁFORO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 5: SEMÁFORO                    ║")
print("╚══════════════════════════════════════╝")

# Break-even 90% do spot → recomendado
s = hedge_engine._classificar_hedge(break_even=315, preco_spot=350)
assert s == "recomendado", f"BE 90% → deveria ser recomendado, é {s}"
print(f"  ✅ BE=315, Spot=350 (90%) → {s}")

# Break-even 60% do spot → desnecessario
s = hedge_engine._classificar_hedge(break_even=210, preco_spot=350)
assert s == "desnecessario", f"BE 60% → deveria ser desnecessario, é {s}"
print(f"  ✅ BE=210, Spot=350 (60%) → {s}")

# Break-even 75% do spot → opcional
s = hedge_engine._classificar_hedge(break_even=262, preco_spot=350)
assert s == "opcional", f"BE 75% → deveria ser opcional, é {s}"
print(f"  ✅ BE=262, Spot=350 (75%) → {s}")


# ═══════════════════════════════════════════════════════════════
# TESTE 6: CENÁRIOS DO GRÁFICO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════╗")
print("║  TESTE 6: CENÁRIOS DO GRÁFICO         ║")
print("╚══════════════════════════════════════╝")

for c in result.cenarios_grafico:
    emoji = "🟢" if c["com_hedge"] > 0 else "🔴"
    print(f"  {c['cenario']:<20} Sem hedge: R$ {c['sem_hedge']:>10,.0f}  Com hedge: R$ {c['com_hedge']:>10,.0f}  {emoji}")

# Na queda de 20%, hedge deve ser melhor que sem hedge
queda = result.cenarios_grafico[0]
assert queda["com_hedge"] > queda["sem_hedge"], "Com hedge deve ser melhor na queda"

# Na alta de 20%, sem hedge deve ser melhor
alta = result.cenarios_grafico[2]
assert alta["sem_hedge"] > alta["com_hedge"], "Sem hedge deve ser melhor na alta"
print("  ✅ Cenários do gráfico OK")


# ═══════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════
print("\n╔══════════════════════════════════════════════════════╗")
print("║  ✅ HEDGE ENGINE — TODOS OS TESTES OK                ║")
print("╚══════════════════════════════════════════════════════╝\n")
