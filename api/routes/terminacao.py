"""
Endpoint principal — cadeia completa de cálculo para Terminação em Pasto.
"""

from datetime import date

from fastapi import APIRouter

from api.deps import (
    farm_engine,
    exposure_engine,
    impact_engine,
    hedge_engine,
    get_cotacoes,
    get_futuros,
)
from api.schemas import (
    TerminacaoPastoRequest,
    TerminacaoPastoResponse,
    ResultTerminacaoPastoSchema,
    LotExposureSchema,
    EconomicImpactReportSchema,
    HedgeResultSchema,
    CotacaoMercadoSchema,
)
from models.production_systems import InputTerminacaoPasto

router = APIRouter()


@router.post("/terminacao-pasto/calcular", response_model=TerminacaoPastoResponse)
def calcular_terminacao_pasto(req: TerminacaoPastoRequest):
    """
    Roda a cadeia completa de cálculo:
    1. FarmEconomicsV2 → custo/@, margem, ROI
    2. ExposureEngine → timeline, break-even dinâmico
    3. EconomicImpactEngine → cenários de queda
    4. HedgeEngine → comparativo hedged vs unhedged

    Retorna tudo em uma única resposta.
    """

    # 1. Montar frozen dataclass
    inp = InputTerminacaoPasto(
        nome="Terminação Pasto",
        data_entrada=date.today(),
        num_animais=req.num_animais,
        peso_entrada_kg=req.peso_entrada_kg,
        custo_reposicao_total=req.custo_reposicao_total,
        dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_suplementacao_dia=req.custo_suplementacao_dia,
        custo_sanidade_dia=req.custo_sanidade_dia,
        custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        rendimento_carcaca=req.rendimento_carcaca,
        outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada,
        custo_frete_saida=req.custo_frete_saida,
        custo_mortalidade_estimada=req.custo_mortalidade_estimada,
    )

    # 2. Cadeia de cálculo
    resultado = farm_engine.calcular_terminacao_pasto(inp, req.preco_venda)
    exposicao = exposure_engine.calcular(inp)

    cotacoes = get_cotacoes()
    cdi = cotacoes.cdi_anual or 0.1415

    impacto = impact_engine.calcular(
        exposicao, preco_mercado=req.preco_venda, cdi_referencia=cdi,
    )

    # 3. Hedge (opcional — depende do tamanho do lote)
    hedge_result = None
    if exposicao.arrobas_totais >= 165:
        curva = get_futuros()
        contrato = hedge_engine.selecionar_contrato(curva, exposicao.data_venda_projetada)
        if contrato:
            hedge_result = hedge_engine.calcular(
                exposure=exposicao,
                contrato=contrato,
                preco_spot=req.preco_venda,
                basis_estimado=req.basis_estimado,
                cdi_anual=cdi,
                margem_garantia_pct=req.margem_garantia_pct,
            )

    # 4. Montar resposta
    return TerminacaoPastoResponse(
        resultado=ResultTerminacaoPastoSchema.from_dataclass(resultado),
        exposicao=LotExposureSchema.from_dataclass(exposicao),
        impacto=EconomicImpactReportSchema.from_dataclass(impacto),
        hedge=HedgeResultSchema.from_dataclass(hedge_result) if hedge_result else None,
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )
