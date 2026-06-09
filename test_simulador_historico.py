"""
Testes — Simulador Histórico (Fase 3)
======================================
1. IDENTIDADE (obrigatório, 0.00% literal): quando arroba_cenario == arroba_atual
   e milho_cenario == milho_atual, calcular_cenario bate
   cost_model_v2.calcular_terminacao(input, preco_venda=arroba_atual) em todos
   os indicadores (break_even, margem/@, margem total, margem %). Nas 3
   combinações de terminação (pasto, semi, confinamento).

2. SANIDADE (não-absurdo): direção e escala do efeito de arroba e milho.

Rodar:
    python3 test_simulador_historico.py
"""

from datetime import date

from models.cost_model_v2 import FarmEconomicsV2
from models.production_systems import Fase, Sistema, LoteInputTerminacao
from models import simulador_historico as sh

engine = FarmEconomicsV2()

# Tolerância de identidade: 0.00% literal. Comparamos os valores arredondados
# que o próprio engine produz (mesmas casas), então a diferença deve ser 0.0.
EPS = 1e-9


def _lote_pasto() -> LoteInputTerminacao:
    return LoteInputTerminacao(
        fase=Fase.TERMINACAO, sistema=Sistema.PASTO,
        nome="Pasto", data_entrada=date(2026, 1, 1),
        num_animais=100, peso_entrada_kg=380, custo_reposicao_total=600_000,
        dias_ciclo=120, peso_saida_estimado_kg=540,
        custo_sanidade_dia=0.35, custo_mao_obra_dia=0.80,
        custo_suplementacao_dia=2.50, custo_arrendamento_dia=1.20,
    )


def _lote_semi() -> LoteInputTerminacao:
    return LoteInputTerminacao(
        fase=Fase.TERMINACAO, sistema=Sistema.SEMICONFINAMENTO,
        nome="Semi", data_entrada=date(2026, 1, 1),
        num_animais=100, peso_entrada_kg=380, custo_reposicao_total=600_000,
        dias_ciclo=110, peso_saida_estimado_kg=550,
        custo_sanidade_dia=0.40, custo_mao_obra_dia=1.00,
        custo_arrendamento_dia=1.50, custo_manutencao_pasto_dia=0.60,
        consumo_suplemento_kg_dia=4.0, custo_suplemento_kg=1.30,
    )


def _lote_conf() -> LoteInputTerminacao:
    return LoteInputTerminacao(
        fase=Fase.TERMINACAO, sistema=Sistema.CONFINAMENTO,
        nome="Conf", data_entrada=date(2026, 1, 1),
        num_animais=100, peso_entrada_kg=400, custo_reposicao_total=650_000,
        dias_ciclo=100, peso_saida_estimado_kg=560,
        custo_sanidade_dia=0.50, custo_mao_obra_dia=1.20,
        consumo_ms_pct_pv=0.022, custo_dieta_kg_ms=1.45,
        custo_instalacoes_dia=2.00,
    )


def _check(nome, esperado, obtido):
    delta = abs(esperado - obtido)
    pct = (delta / abs(esperado) * 100) if esperado else (0.0 if delta < EPS else 100.0)
    ok = delta < EPS
    flag = "OK " if ok else "FALHA"
    print(f"    [{flag}] {nome}: engine={esperado} cenario={obtido} Δ={delta:.10f} ({pct:.4f}%)")
    return ok


def test_identidade():
    print("\n=== TESTE 1: IDENTIDADE (0.00% literal) ===")
    arroba_atual = 315.0
    milho_atual = 68.50

    todos_ok = True
    for nome, lote in [("PASTO", _lote_pasto()), ("SEMI", _lote_semi()), ("CONFINAMENTO", _lote_conf())]:
        print(f"\n  {nome} (arroba={arroba_atual}, milho={milho_atual}):")
        ref = engine.calcular_terminacao(lote, preco_venda=arroba_atual)
        cen = sh.calcular_cenario(lote, arroba_atual, milho_atual, milho_atual)

        margem_arroba_ref = round(ref.margem_bruta / ref.arrobas_totais, 2)

        todos_ok &= _check("break_even", ref.break_even_price, cen.break_even)
        todos_ok &= _check("margem/@", margem_arroba_ref, cen.margem_cenario)
        todos_ok &= _check("margem_total_brl", ref.margem_bruta, cen.margem_cenario_brl)
        todos_ok &= _check("margem_pct", ref.margem_percentual, cen.margem_pct)

    return todos_ok


def test_sanidade():
    print("\n=== TESTE 2: SANIDADE (direção/escala) ===")
    arroba_atual = 315.0
    milho_atual = 68.50
    todos_ok = True

    # 2a. Arroba 30% menor → margem materialmente menor (conf)
    conf = _lote_conf()
    base = sh.calcular_cenario(conf, arroba_atual, milho_atual, milho_atual)
    arroba_baixa = sh.calcular_cenario(conf, arroba_atual * 0.70, milho_atual, milho_atual)
    ok = arroba_baixa.margem_cenario < base.margem_cenario
    print(f"    [{'OK ' if ok else 'FALHA'}] arroba -30%: margem/@ {base.margem_cenario} → {arroba_baixa.margem_cenario} (deve cair)")
    todos_ok &= ok

    # 2b. Milho +50% em confinamento → custo sobe, break_even sobe, margem cai
    milho_alto_conf = sh.calcular_cenario(conf, arroba_atual, milho_atual * 1.50, milho_atual)
    ok = milho_alto_conf.break_even > base.break_even and milho_alto_conf.margem_cenario < base.margem_cenario
    print(f"    [{'OK ' if ok else 'FALHA'}] milho +50% (conf): break_even {base.break_even} → {milho_alto_conf.break_even}, margem/@ {base.margem_cenario} → {milho_alto_conf.margem_cenario}")
    todos_ok &= ok

    # 2c. Milho +50% em pasto → quase nenhum efeito (fator 0)
    pasto = _lote_pasto()
    base_p = sh.calcular_cenario(pasto, arroba_atual, milho_atual, milho_atual)
    milho_alto_pasto = sh.calcular_cenario(pasto, arroba_atual, milho_atual * 1.50, milho_atual)
    ok = abs(milho_alto_pasto.break_even - base_p.break_even) < EPS
    print(f"    [{'OK ' if ok else 'FALHA'}] milho +50% (pasto): break_even {base_p.break_even} → {milho_alto_pasto.break_even} (deve ser idêntico, fator 0)")
    todos_ok &= ok

    # 2d. Milho +50% em semi → efeito intermediário (menor que conf, maior que pasto)
    semi = _lote_semi()
    base_s = sh.calcular_cenario(semi, arroba_atual, milho_atual, milho_atual)
    milho_alto_semi = sh.calcular_cenario(semi, arroba_atual, milho_atual * 1.50, milho_atual)
    delta_semi = base_s.break_even - milho_alto_semi.break_even  # negativo (be sobe)
    ok = milho_alto_semi.break_even > base_s.break_even
    print(f"    [{'OK ' if ok else 'FALHA'}] milho +50% (semi): break_even {base_s.break_even} → {milho_alto_semi.break_even} (deve subir)")
    todos_ok &= ok

    return todos_ok


def main():
    ok1 = test_identidade()
    ok2 = test_sanidade()
    print("\n" + "=" * 60)
    if ok1 and ok2:
        print("TODOS OS TESTES PASSARAM ✓")
        return 0
    print(f"FALHAS: identidade={'OK' if ok1 else 'FALHOU'}, sanidade={'OK' if ok2 else 'FALHOU'}")
    return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
