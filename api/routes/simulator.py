"""Endpoint do simulador de cenarios multi-variavel."""

from fastapi import APIRouter

from api.schemas import (
    SimulatorRequest,
    SimulatorResponse,
    SimulatorScenarioOutput,
)
from models.simulator_engine import SimulatorEngine, SimulatorInput, ScenarioInput

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
