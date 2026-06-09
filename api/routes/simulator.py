"""Endpoints do simulador: stress test multi-variavel + simulador historico."""

from datetime import date

from fastapi import APIRouter, HTTPException

from api.deps import get_cotacoes
from api.routes.lotes import _to_terminacao
from api.schemas import (
    SimulatorRequest,
    SimulatorResponse,
    SimulatorScenarioOutput,
    SimuladorHistoricoRequest,
    SimuladorHistoricoResponse,
    SimuladorHistoricoPresets,
    HistoricoPresetSchema,
    SimuladorCustomRequest,
    SimuladorCustomResponse,
)
from models.simulator_engine import SimulatorEngine, SimulatorInput, ScenarioInput
from models import simulador_historico as sh

router = APIRouter()
sim_engine = SimulatorEngine()


@router.post("/simulador/calcular", response_model=SimulatorResponse)
def simular(req: SimulatorRequest):
    """Roda cenarios multi-variavel sobre um lote."""

    inp = SimulatorInput(
        arrobas_totais=req.arrobas_totais,
        custo_total=req.custo_total,
        dias_ciclo=req.dias_ciclo,
        custo_dieta_total=req.custo_dieta_total,
        custo_nao_dieta=req.custo_nao_dieta,
        preco_arroba=req.preco_arroba,
        preco_milho_saca=req.preco_milho_saca,
        dolar_ptax=req.dolar_ptax,
    )

    cenarios = [
        ScenarioInput(
            nome=c.nome,
            var_arroba_pct=c.var_arroba_pct,
            var_milho_pct=c.var_milho_pct,
            var_dolar_pct=c.var_dolar_pct,
            hedge_arroba=c.hedge_arroba,
            preco_hedge_arroba=c.preco_hedge_arroba,
            hedge_milho=c.hedge_milho,
            preco_hedge_milho=c.preco_hedge_milho,
        )
        for c in req.cenarios
    ]

    report = sim_engine.simular(inp, cenarios)

    return SimulatorResponse(
        cenarios=[SimulatorScenarioOutput.from_dataclass(c) for c in report.cenarios],
        cenario_base=SimulatorScenarioOutput.from_dataclass(report.cenario_base),
        pior_cenario=SimulatorScenarioOutput.from_dataclass(report.pior_cenario),
        melhor_cenario=SimulatorScenarioOutput.from_dataclass(report.melhor_cenario),
    )


# ---------------------------------------------------------------------------
# Simulador Histórico — lote real × situação histórica (redesign /simulador)
# ---------------------------------------------------------------------------

def _milho_atual_ou_erro() -> float:
    """
    Preço atual do milho (R$/sc 60kg) das cotações de mercado — denominador
    do delta de cenário. §10.6: fonte sistêmica indisponível → erro tipado,
    nunca número fabricado/stale.
    """
    milho = get_cotacoes().milho_esalq
    if milho is None or milho <= 0:
        raise HTTPException(
            status_code=503,
            detail="cotacao_milho_indisponivel: sem preço atual de milho para "
                   "ancorar os cenários históricos. Tente novamente em instantes.",
        )
    return float(milho)


@router.post("/simulador/historico", response_model=SimuladorHistoricoResponse)
def simulador_historico(req: SimuladorHistoricoRequest):
    """
    Gera os presets históricos (até 4 temporais + até 2 eventos) para um lote
    real de terminação. Margem de cada cenário recomputada no engine.
    """
    inp = _to_terminacao(req.inputs)
    regiao = req.inputs.regiao
    milho_atual = _milho_atual_ou_erro()

    # "Hoje" = margem no spot atual do lote (arroba=preco_venda, milho=atual).
    atual = sh.calcular_cenario(inp, req.inputs.preco_venda, milho_atual, milho_atual)

    temporais = sh.gerar_presets_temporais(inp, milho_atual, date.today(), regiao)
    eventos = sh.gerar_presets_eventos(inp, milho_atual, regiao)

    return SimuladorHistoricoResponse(
        unidade="R$/@",
        break_even=atual.break_even,
        margem_atual=atual.margem_cenario,
        presets=SimuladorHistoricoPresets(
            temporais=[HistoricoPresetSchema.from_dataclass(p) for p in temporais],
            eventos=[HistoricoPresetSchema.from_dataclass(p) for p in eventos],
        ),
    )


@router.post("/simulador/historico/custom", response_model=SimuladorCustomResponse)
def simulador_historico_custom(req: SimuladorCustomRequest):
    """
    Cenário custom: arroba + milho em valor absoluto. Margem recomputada no
    engine (mesmo núcleo dos presets).
    """
    inp = _to_terminacao(req.inputs)
    milho_atual = _milho_atual_ou_erro()

    cenario = sh.calcular_cenario(inp, req.arroba, req.milho, milho_atual)

    return SimuladorCustomResponse(
        unidade="R$/@",
        break_even=cenario.break_even,
        margem_cenario=cenario.margem_cenario,
        margem_cenario_brl=cenario.margem_cenario_brl,
        margem_pct=cenario.margem_pct,
    )
