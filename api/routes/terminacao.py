"""
Endpoints de calculo — todos os sistemas produtivos.
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
    TerminacaoPastoRequest, TerminacaoPastoResponse, ResultTerminacaoPastoSchema,
    ConfinamentoRequest, ConfinamentoResponse, ResultConfinamentoSchema,
    SemiconfinamentoRequest, SemiconfinamentoResponse, ResultSemiconfinamentoSchema,
    CriaRequest, CriaResponse, ResultCriaSchema,
    RecriaRequest, RecriaResponse, ResultRecriaSchema,
    LotExposureSchema, EconomicImpactReportSchema, HedgeResultSchema, CotacaoMercadoSchema,
)
from models.production_systems import (
    InputTerminacaoPasto, InputConfinamento, InputSemiconfinamento,
    InputCria, InputRecria,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper — cadeia de hedge (reutilizado por todos os sistemas de terminacao)
# ---------------------------------------------------------------------------

def _calcular_hedge(exposicao, preco_venda, basis, cdi, margem_pct):
    if exposicao.arrobas_totais < 165:
        return None
    curva = get_futuros()
    contrato = hedge_engine.selecionar_contrato(curva, exposicao.data_venda_projetada)
    if not contrato:
        return None
    return hedge_engine.calcular(
        exposure=exposicao, contrato=contrato,
        preco_spot=preco_venda, basis_estimado=basis,
        cdi_anual=cdi, margem_garantia_pct=margem_pct,
    )


# ---------------------------------------------------------------------------
# Terminacao em Pasto
# ---------------------------------------------------------------------------

@router.post("/terminacao-pasto/calcular", response_model=TerminacaoPastoResponse)
def calcular_terminacao_pasto(req: TerminacaoPastoRequest):
    inp = InputTerminacaoPasto(
        nome="Terminacao Pasto", data_entrada=date.today(),
        num_animais=req.num_animais, peso_entrada_kg=req.peso_entrada_kg,
        custo_reposicao_total=req.custo_reposicao_total, dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_suplementacao_dia=req.custo_suplementacao_dia,
        custo_sanidade_dia=req.custo_sanidade_dia, custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        rendimento_carcaca=req.rendimento_carcaca, outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada, custo_frete_saida=req.custo_frete_saida,
        custo_mortalidade_estimada=req.custo_mortalidade_estimada,
    )
    resultado = farm_engine.calcular_terminacao_pasto(inp, req.preco_venda)
    exposicao = exposure_engine.calcular(inp)
    cotacoes = get_cotacoes()
    cdi = cotacoes.cdi_anual or 0.1415
    impacto = impact_engine.calcular(exposicao, preco_mercado=req.preco_venda, cdi_referencia=cdi)
    hedge_result = _calcular_hedge(exposicao, req.preco_venda, req.basis_estimado, cdi, req.margem_garantia_pct)

    return TerminacaoPastoResponse(
        resultado=ResultTerminacaoPastoSchema.from_dataclass(resultado),
        exposicao=LotExposureSchema.from_dataclass(exposicao),
        impacto=EconomicImpactReportSchema.from_dataclass(impacto),
        hedge=HedgeResultSchema.from_dataclass(hedge_result) if hedge_result else None,
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )


# ---------------------------------------------------------------------------
# Confinamento
# ---------------------------------------------------------------------------

@router.post("/confinamento/calcular", response_model=ConfinamentoResponse)
def calcular_confinamento(req: ConfinamentoRequest):
    inp = InputConfinamento(
        nome="Confinamento", data_entrada=date.today(),
        num_animais=req.num_animais, peso_entrada_kg=req.peso_entrada_kg,
        custo_reposicao_total=req.custo_reposicao_total, dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        consumo_ms_pct_pv=req.consumo_ms_pct_pv, custo_dieta_kg_ms=req.custo_dieta_kg_ms,
        custo_sanidade_dia=req.custo_sanidade_dia, custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_instalacoes_dia=req.custo_instalacoes_dia,
        rendimento_carcaca=req.rendimento_carcaca, outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada, custo_frete_saida=req.custo_frete_saida,
        custo_mortalidade_estimada=req.custo_mortalidade_estimada,
    )
    resultado = farm_engine.calcular_confinamento(inp, req.preco_venda)
    exposicao = exposure_engine.calcular(inp)
    cotacoes = get_cotacoes()
    cdi = cotacoes.cdi_anual or 0.1415
    impacto = impact_engine.calcular(exposicao, preco_mercado=req.preco_venda, cdi_referencia=cdi)
    hedge_result = _calcular_hedge(exposicao, req.preco_venda, req.basis_estimado, cdi, req.margem_garantia_pct)

    return ConfinamentoResponse(
        resultado=ResultConfinamentoSchema.from_dataclass(resultado),
        exposicao=LotExposureSchema.from_dataclass(exposicao),
        impacto=EconomicImpactReportSchema.from_dataclass(impacto),
        hedge=HedgeResultSchema.from_dataclass(hedge_result) if hedge_result else None,
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )


# ---------------------------------------------------------------------------
# Semiconfinamento
# ---------------------------------------------------------------------------

@router.post("/semiconfinamento/calcular", response_model=SemiconfinamentoResponse)
def calcular_semiconfinamento(req: SemiconfinamentoRequest):
    inp = InputSemiconfinamento(
        nome="Semiconfinamento", data_entrada=date.today(),
        num_animais=req.num_animais, peso_entrada_kg=req.peso_entrada_kg,
        custo_reposicao_total=req.custo_reposicao_total, dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        custo_manutencao_pasto_dia=req.custo_manutencao_pasto_dia,
        consumo_suplemento_kg_dia=req.consumo_suplemento_kg_dia,
        custo_suplemento_kg=req.custo_suplemento_kg,
        custo_sanidade_dia=req.custo_sanidade_dia, custo_mao_obra_dia=req.custo_mao_obra_dia,
        rendimento_carcaca=req.rendimento_carcaca, outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada, custo_frete_saida=req.custo_frete_saida,
        custo_mortalidade_estimada=req.custo_mortalidade_estimada,
    )
    resultado = farm_engine.calcular_semiconfinamento(inp, req.preco_venda)
    exposicao = exposure_engine.calcular(inp)
    cotacoes = get_cotacoes()
    cdi = cotacoes.cdi_anual or 0.1415
    impacto = impact_engine.calcular(exposicao, preco_mercado=req.preco_venda, cdi_referencia=cdi)
    hedge_result = _calcular_hedge(exposicao, req.preco_venda, req.basis_estimado, cdi, req.margem_garantia_pct)

    return SemiconfinamentoResponse(
        resultado=ResultSemiconfinamentoSchema.from_dataclass(resultado),
        exposicao=LotExposureSchema.from_dataclass(exposicao),
        impacto=EconomicImpactReportSchema.from_dataclass(impacto),
        hedge=HedgeResultSchema.from_dataclass(hedge_result) if hedge_result else None,
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )


# ---------------------------------------------------------------------------
# Cria
# ---------------------------------------------------------------------------

@router.post("/cria/calcular", response_model=CriaResponse)
def calcular_cria(req: CriaRequest):
    inp = InputCria(
        nome="Cria", data_referencia=date.today(),
        num_matrizes=req.num_matrizes, taxa_natalidade=req.taxa_natalidade,
        taxa_desmama=req.taxa_desmama, peso_desmama_kg=req.peso_desmama_kg,
        custo_nutricao_ua_ano=req.custo_nutricao_ua_ano,
        custo_sanidade_ua_ano=req.custo_sanidade_ua_ano,
        custo_reproducao_ua_ano=req.custo_reproducao_ua_ano,
        custo_mao_obra_ua_ano=req.custo_mao_obra_ua_ano,
        custo_arrendamento_ua_ano=req.custo_arrendamento_ua_ano,
        valor_matriz=req.valor_matriz,
        outros_custos_ua_ano=req.outros_custos_ua_ano,
    )
    resultado = farm_engine.calcular_cria(inp)
    cotacoes = get_cotacoes()

    return CriaResponse(
        resultado=ResultCriaSchema.from_dataclass(resultado),
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )


# ---------------------------------------------------------------------------
# Recria
# ---------------------------------------------------------------------------

@router.post("/recria/calcular", response_model=RecriaResponse)
def calcular_recria(req: RecriaRequest):
    inp = InputRecria(
        nome="Recria", data_entrada=date.today(),
        num_animais=req.num_animais, peso_entrada_kg=req.peso_entrada_kg,
        custo_aquisicao_total=req.custo_aquisicao_total, dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_nutricao_dia=req.custo_nutricao_dia,
        custo_sanidade_dia=req.custo_sanidade_dia,
        custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada,
        custo_frete_saida=req.custo_frete_saida,
    )
    resultado = farm_engine.calcular_recria(inp)
    cotacoes = get_cotacoes()

    return RecriaResponse(
        resultado=ResultRecriaSchema.from_dataclass(resultado),
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )
