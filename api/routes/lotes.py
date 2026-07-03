"""
Endpoint único de cálculo de lote (pós-refactor fase/sistema).

POST /lotes/calcular aceita LoteInputUnion (discriminated por `fase`) e
devolve LoteCalculoResponse correspondente. Dispatch interno por fase
no handler.

Substitui os 5 endpoints antigos (terminacao-pasto, confinamento,
semiconfinamento, cria, recria) que foram consolidados.
"""

from datetime import date

from fastapi import APIRouter, Body

from api.deps import (
    farm_engine,
    exposure_engine,
    impact_engine,
    hedge_engine,
    get_cotacoes,
    get_futuros,
)
from api.schemas import (
    LoteInputUnion,
    LoteInputCriaSchema,
    LoteInputRecriaSchema,
    LoteInputTerminacaoSchema,
    LoteCriaResponse,
    LoteRecriaResponse,
    LoteTerminacaoResponse,
    ResultCriaSchema,
    ResultRecriaSchema,
    ResultTerminacaoSchema,
    LotExposureSchema,
    EconomicImpactReportSchema,
    HedgeResultSchema,
    CotacaoMercadoSchema,
)
from models.production_systems import (
    Fase,
    LoteInputCria,
    LoteInputRecria,
    LoteInputTerminacao,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers de conversão schema → dataclass
# ---------------------------------------------------------------------------

def _to_cria(req: LoteInputCriaSchema) -> LoteInputCria:
    return LoteInputCria(
        fase=req.fase,
        sistema=req.sistema,
        nome=req.nome,
        data_referencia=req.data_referencia or date.today(),
        num_matrizes=req.num_matrizes,
        taxa_natalidade=req.taxa_natalidade,
        taxa_desmama=req.taxa_desmama,
        peso_desmama_kg=req.peso_desmama_kg,
        custo_nutricao_ua_ano=req.custo_nutricao_ua_ano,
        custo_sanidade_ua_ano=req.custo_sanidade_ua_ano,
        custo_reproducao_ua_ano=req.custo_reproducao_ua_ano,
        custo_mao_obra_ua_ano=req.custo_mao_obra_ua_ano,
        custo_arrendamento_ua_ano=req.custo_arrendamento_ua_ano,
        valor_matriz=req.valor_matriz,
        outros_custos_ua_ano=req.outros_custos_ua_ano,
    )


def _to_recria(req: LoteInputRecriaSchema) -> LoteInputRecria:
    return LoteInputRecria(
        fase=req.fase,
        sistema=req.sistema,
        nome=req.nome,
        data_entrada=req.data_entrada or date.today(),
        num_animais=req.num_animais,
        peso_entrada_kg=req.peso_entrada_kg,
        custo_aquisicao_total=req.custo_aquisicao_total,
        dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_nutricao_dia=req.custo_nutricao_dia,
        custo_sanidade_dia=req.custo_sanidade_dia,
        custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada,
        custo_frete_saida=req.custo_frete_saida,
    )


def _to_terminacao(req: LoteInputTerminacaoSchema) -> LoteInputTerminacao:
    return LoteInputTerminacao(
        fase=req.fase,
        sistema=req.sistema,
        nome=req.nome,
        data_entrada=req.data_entrada or date.today(),
        num_animais=req.num_animais,
        peso_entrada_kg=req.peso_entrada_kg,
        custo_reposicao_total=req.custo_reposicao_total,
        dias_ciclo=req.dias_ciclo,
        peso_saida_estimado_kg=req.peso_saida_estimado_kg,
        custo_sanidade_dia=req.custo_sanidade_dia,
        custo_mao_obra_dia=req.custo_mao_obra_dia,
        custo_suplementacao_dia=req.custo_suplementacao_dia,
        custo_arrendamento_dia=req.custo_arrendamento_dia,
        consumo_ms_pct_pv=req.consumo_ms_pct_pv,
        custo_dieta_kg_ms=req.custo_dieta_kg_ms,
        custo_instalacoes_dia=req.custo_instalacoes_dia,
        custo_manutencao_pasto_dia=req.custo_manutencao_pasto_dia,
        consumo_suplemento_kg_dia=req.consumo_suplemento_kg_dia,
        custo_suplemento_kg=req.custo_suplemento_kg,
        rendimento_carcaca=req.rendimento_carcaca,
        outros_custos_dia=req.outros_custos_dia,
        custo_frete_entrada=req.custo_frete_entrada,
        custo_frete_saida=req.custo_frete_saida,
        custo_mortalidade_estimada=req.custo_mortalidade_estimada,
    )


def _calcular_hedge(exposicao, preco_venda, basis, cdi, margem_pct, corretagem):
    """Cadeia de hedge — reaproveita exposure; só pra terminação."""
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
        corretagem_por_contrato=corretagem,
    )


# ---------------------------------------------------------------------------
# Endpoint único
# ---------------------------------------------------------------------------

@router.post("/lotes/calcular", response_model=None)
def calcular_lote(req: LoteInputUnion = Body(...)):
    """
    Calcula um lote em qualquer fase. Discriminated union por `fase`:

      - fase=cria        → LoteCriaResponse {resultado, cotacoes}
      - fase=recria      → LoteRecriaResponse {resultado, cotacoes}
      - fase=terminacao  → LoteTerminacaoResponse {resultado, exposicao,
                            impacto, hedge?, cotacoes}

    Response model é tipado como union, mas FastAPI não consegue inferir
    response_model do union annotated com discriminator quando o handler
    retorna instâncias variadas — por isso response_model=None + return
    explicitamente tipado.
    """
    cotacoes = get_cotacoes()

    # CRIA
    if req.fase == Fase.CRIA:
        assert isinstance(req, LoteInputCriaSchema)
        inp = _to_cria(req)
        resultado = farm_engine.calcular_cria(inp)
        return LoteCriaResponse(
            fase=Fase.CRIA,
            resultado=ResultCriaSchema.from_dataclass(resultado),
            cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
        )

    # RECRIA
    if req.fase == Fase.RECRIA:
        assert isinstance(req, LoteInputRecriaSchema)
        inp = _to_recria(req)
        resultado = farm_engine.calcular_recria(inp)
        return LoteRecriaResponse(
            fase=Fase.RECRIA,
            resultado=ResultRecriaSchema.from_dataclass(resultado),
            cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
        )

    # TERMINAÇÃO — cadeia completa
    assert isinstance(req, LoteInputTerminacaoSchema)
    inp = _to_terminacao(req)
    resultado = farm_engine.calcular_terminacao(inp, req.preco_venda)
    exposicao = exposure_engine.calcular(inp)
    cdi = cotacoes.cdi_anual or 0.1415
    impacto = impact_engine.calcular(
        exposicao, preco_mercado=req.preco_venda, cdi_referencia=cdi,
    )
    hedge_result = _calcular_hedge(
        exposicao, req.preco_venda, req.basis_estimado, cdi, req.margem_garantia_pct,
        req.corretagem_por_contrato,
    )

    return LoteTerminacaoResponse(
        fase=Fase.TERMINACAO,
        resultado=ResultTerminacaoSchema.from_dataclass(resultado),
        exposicao=LotExposureSchema.from_dataclass(exposicao),
        impacto=EconomicImpactReportSchema.from_dataclass(impacto),
        hedge=HedgeResultSchema.from_dataclass(hedge_result) if hedge_result else None,
        cotacoes=CotacaoMercadoSchema.from_dataclass(cotacoes),
    )
