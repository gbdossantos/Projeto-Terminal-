"""
Terminal API — Pydantic Schemas (pós-refactor fase/sistema)
=============================================================
Espelham os frozen dataclasses dos models/ para serialização JSON.

Pós-refactor (briefing GB):
  - 3 schemas Request (1 por fase) num discriminated union LoteInputUnion
  - 1 endpoint POST /lotes/calcular aceita LoteInputUnion
  - 3 schemas Response (1 por fase) com Literal[fase] como discriminador
  - LotExposureSchema e EconomicImpactReportSchema ganham `fase` e usam
    `sistema` como string do enum (snake_case)
  - REMOVIDOS: TerminacaoPastoRequest/Response, ConfinamentoRequest/Response,
    SemiconfinamentoRequest/Response (consolidados em LoteInputTerminacaoSchema)
  - REMOVIDOS: ResultTerminacao{Pasto,Confinamento,Semi}Schema → ResultTerminacaoSchema único
"""

from __future__ import annotations

import dataclasses
from datetime import date
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator

from models.production_systems import Fase, Sistema


# ===========================================================================
# REQUEST — discriminated union por `fase`
# ===========================================================================

class LoteInputCriaSchema(BaseModel):
    """Lote em fase de Cria. Sistema-agnóstico em cálculo (meta-tag só)."""
    fase: Literal[Fase.CRIA] = Fase.CRIA
    sistema: Sistema

    nome: str = "Cria"
    data_referencia: Optional[date] = None  # default: hoje (set na rota)

    num_matrizes: int = Field(..., gt=0, le=10000)
    taxa_natalidade: float = Field(..., gt=0, le=1.0)
    taxa_desmama: float = Field(..., gt=0, le=1.0)
    peso_desmama_kg: float = Field(..., gt=0, le=300)
    custo_nutricao_ua_ano: float = Field(..., ge=0)
    custo_sanidade_ua_ano: float = Field(..., ge=0)
    custo_reproducao_ua_ano: float = Field(..., ge=0)
    custo_mao_obra_ua_ano: float = Field(..., ge=0)
    custo_arrendamento_ua_ano: float = Field(..., ge=0)
    valor_matriz: float = Field(..., ge=0)
    outros_custos_ua_ano: float = 0.0


class LoteInputRecriaSchema(BaseModel):
    """Lote em fase de Recria. Sistema-agnóstico em cálculo."""
    fase: Literal[Fase.RECRIA] = Fase.RECRIA
    sistema: Sistema

    nome: str = "Recria"
    data_entrada: Optional[date] = None

    num_animais: int = Field(..., gt=0, le=10000)
    peso_entrada_kg: float = Field(..., gt=0, le=400)
    custo_aquisicao_total: float = Field(..., ge=0)
    dias_ciclo: int = Field(..., gt=0, le=400)
    peso_saida_estimado_kg: float = Field(..., gt=0, le=500)
    custo_nutricao_dia: float = Field(..., ge=0)
    custo_sanidade_dia: float = Field(..., ge=0)
    custo_mao_obra_dia: float = Field(..., ge=0)
    custo_arrendamento_dia: float = Field(..., ge=0)
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0


class LoteInputTerminacaoSchema(BaseModel):
    """
    Lote em fase de Terminação. Sistema AFETA cálculo (estrutura de custo varia).
    Campos sparse: cada sistema usa um subconjunto.

    Validação:
      - sistema PASTO exige custo_suplementacao_dia + custo_arrendamento_dia
      - sistema CONFINAMENTO exige consumo_ms_pct_pv + custo_dieta_kg_ms + custo_instalacoes_dia
      - sistema SEMICONFINAMENTO exige custo_arrendamento_dia + custo_manutencao_pasto_dia +
        consumo_suplemento_kg_dia + custo_suplemento_kg
    """
    fase: Literal[Fase.TERMINACAO] = Fase.TERMINACAO
    sistema: Sistema

    nome: str = "Terminacao"
    data_entrada: Optional[date] = None

    # Comuns
    num_animais: int = Field(..., gt=0, le=10000)
    peso_entrada_kg: float = Field(..., gt=0, le=600)
    custo_reposicao_total: float = Field(..., ge=0)
    dias_ciclo: int = Field(..., gt=0, le=365)
    peso_saida_estimado_kg: float = Field(..., gt=0, le=700)
    custo_sanidade_dia: float = Field(..., ge=0)
    custo_mao_obra_dia: float = Field(..., ge=0)

    # Sparse — PASTO
    custo_suplementacao_dia: Optional[float] = Field(None, ge=0)

    # Sparse — PASTO + SEMI
    custo_arrendamento_dia: Optional[float] = Field(None, ge=0)

    # Sparse — CONFINAMENTO
    consumo_ms_pct_pv: Optional[float] = Field(None, gt=0, le=0.10)
    custo_dieta_kg_ms: Optional[float] = Field(None, ge=0)
    custo_instalacoes_dia: Optional[float] = Field(None, ge=0)

    # Sparse — SEMI
    custo_manutencao_pasto_dia: Optional[float] = Field(None, ge=0)
    consumo_suplemento_kg_dia: Optional[float] = Field(None, ge=0)
    custo_suplemento_kg: Optional[float] = Field(None, ge=0)

    # Opcionais comuns
    rendimento_carcaca: Optional[float] = Field(None, gt=0, le=1.0)
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0

    # Hedge (parâmetros da rota — não vão pro engine)
    preco_venda: float = Field(..., gt=0, le=600, description="R$/@ para cálculo")
    regiao: str = "MS"
    basis_estimado: float = -5.0
    margem_garantia_pct: float = 0.05

    @model_validator(mode="after")
    def _validar_campos_por_sistema(self) -> "LoteInputTerminacaoSchema":
        faltando: list[str] = []
        if self.sistema == Sistema.PASTO:
            req = ("custo_suplementacao_dia", "custo_arrendamento_dia")
        elif self.sistema == Sistema.CONFINAMENTO:
            req = ("consumo_ms_pct_pv", "custo_dieta_kg_ms", "custo_instalacoes_dia")
        elif self.sistema == Sistema.SEMICONFINAMENTO:
            req = (
                "custo_arrendamento_dia", "custo_manutencao_pasto_dia",
                "consumo_suplemento_kg_dia", "custo_suplemento_kg",
            )
        else:
            req = ()
        for campo in req:
            if getattr(self, campo) is None:
                faltando.append(campo)
        if faltando:
            raise ValueError(
                f"sistema={self.sistema.value} exige campos: {', '.join(faltando)}"
            )
        return self


# Discriminated union — usado como tipo do request body
LoteInputUnion = Annotated[
    Union[LoteInputCriaSchema, LoteInputRecriaSchema, LoteInputTerminacaoSchema],
    Field(discriminator="fase"),
]


# ===========================================================================
# RESPONSE — Result schemas
# ===========================================================================

class ResultCriaSchema(BaseModel):
    nome: str
    fase: Fase
    sistema: Sistema
    num_matrizes: int
    bezerros_desmamados: int
    taxa_natalidade: float
    taxa_desmama: float
    peso_desmama_kg: float
    kg_produzido_por_matriz: float
    custo_operacional_ano: float
    custo_oportunidade: float
    custo_total_ano: float
    custo_por_matriz_ano: float
    custo_por_bezerro_produzido: float
    capital_rebanho: float

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class ResultRecriaSchema(BaseModel):
    nome: str
    fase: Fase
    sistema: Sistema
    num_animais: int
    dias_ciclo: int
    gmd_estimado: float
    kg_ganho_total: float
    custo_operacional: float
    custo_oportunidade: float
    custo_total: float
    custo_por_cabeca: float
    custo_por_kg_ganho: float
    capital_empregado: float

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class ResultTerminacaoSchema(BaseModel):
    """Resultado unificado da terminação. Breakdowns sparse por sistema."""
    nome: str
    fase: Fase
    sistema: Sistema
    num_animais: int
    dias_ciclo: int

    arrobas_totais: float
    gmd_estimado: float
    rendimento_carcaca: float

    custo_reposicao: float
    custo_operacional: float
    custo_fixo: float
    custo_oportunidade: float
    custo_total: float

    custo_por_arroba: float
    custo_por_cabeca: float
    break_even_price: float
    capital_empregado: float

    receita_estimada: float
    margem_bruta: float
    margem_percentual: float
    roi_ciclo: float
    roi_anualizado: float

    exposicao_preco: float
    impacto_queda_10pct: float
    impacto_queda_20pct: float

    margem_apertada: bool
    roi_abaixo_cdi: bool

    # Breakdowns sparse
    custo_dieta_total: Optional[float] = None
    custo_dieta_por_arroba: Optional[float] = None
    participacao_dieta_pct: Optional[float] = None
    custo_pastagem: Optional[float] = None
    custo_suplementacao: Optional[float] = None
    custo_suplementacao_por_arroba: Optional[float] = None

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


# ===========================================================================
# Cotações (inalterado)
# ===========================================================================

class CotacaoMercadoSchema(BaseModel):
    arroba_boi_gordo: Optional[float] = None
    dolar_ptax: Optional[float] = None
    milho_esalq: Optional[float] = None
    cdi_anual: Optional[float] = None
    bezerro_cepea: Optional[float] = None
    soja_esalq: Optional[float] = None
    ibov: Optional[float] = None
    ibov_delta_pct: Optional[float] = None
    timestamp: Optional[str] = None

    @classmethod
    def from_dataclass(cls, dc):
        return cls(
            arroba_boi_gordo=dc.arroba_boi_gordo,
            dolar_ptax=dc.dolar_ptax,
            milho_esalq=dc.milho_esalq,
            cdi_anual=dc.cdi_anual,
            bezerro_cepea=getattr(dc, "bezerro_cepea", None),
            soja_esalq=getattr(dc, "soja_esalq", None),
            ibov=getattr(dc, "ibov", None),
            ibov_delta_pct=getattr(dc, "ibov_delta_pct", None),
            timestamp=dc.timestamp.isoformat() if dc.timestamp else None,
        )


# ===========================================================================
# Exposure (fase + sistema tipados)
# ===========================================================================

class DailySnapshotSchema(BaseModel):
    dia: int
    data: str
    peso_medio_kg: float
    arrobas_projetadas: float
    custo_acumulado: float
    custo_diario_lote: float
    custo_por_arroba: float
    break_even: float


class LotExposureSchema(BaseModel):
    nome: str
    fase: Fase
    sistema: Sistema
    num_animais: int
    data_entrada: str
    data_venda_projetada: str
    dias_ciclo: int
    dias_restantes: int
    peso_entrada_kg: float
    peso_saida_kg: float
    rendimento_carcaca: float
    arrobas_totais: float
    custo_reposicao: float
    custo_operacional_total: float
    custo_oportunidade: float
    custo_total: float
    custo_por_arroba: float
    break_even: float
    exposicao_arrobas: float
    exposicao_brl_por_real_arroba: float
    timeline: list[DailySnapshotSchema] = []

    @classmethod
    def from_dataclass(cls, dc, include_timeline: bool = True):
        timeline = []
        if include_timeline:
            for snap in dc.timeline:
                timeline.append(DailySnapshotSchema(
                    dia=snap.dia,
                    data=snap.data.isoformat(),
                    peso_medio_kg=snap.peso_medio_kg,
                    arrobas_projetadas=snap.arrobas_projetadas,
                    custo_acumulado=snap.custo_acumulado,
                    custo_diario_lote=snap.custo_diario_lote,
                    custo_por_arroba=snap.custo_por_arroba,
                    break_even=snap.break_even,
                ))
        return cls(
            nome=dc.nome,
            fase=dc.fase,
            sistema=dc.sistema,
            num_animais=dc.num_animais,
            data_entrada=dc.data_entrada.isoformat(),
            data_venda_projetada=dc.data_venda_projetada.isoformat(),
            dias_ciclo=dc.dias_ciclo,
            dias_restantes=dc.dias_restantes,
            peso_entrada_kg=dc.peso_entrada_kg,
            peso_saida_kg=dc.peso_saida_kg,
            rendimento_carcaca=dc.rendimento_carcaca,
            arrobas_totais=dc.arrobas_totais,
            custo_reposicao=dc.custo_reposicao,
            custo_operacional_total=dc.custo_operacional_total,
            custo_oportunidade=dc.custo_oportunidade,
            custo_total=dc.custo_total,
            custo_por_arroba=dc.custo_por_arroba,
            break_even=dc.break_even,
            exposicao_arrobas=dc.exposicao_arrobas,
            exposicao_brl_por_real_arroba=dc.exposicao_brl_por_real_arroba,
            timeline=timeline,
        )


# ===========================================================================
# Economic Impact (fase + sistema tipados)
# ===========================================================================

class ScenarioResultSchema(BaseModel):
    label: str
    variacao_pct: float
    preco_arroba: float
    receita: float
    custo_total: float
    margem_brl: float
    margem_pct: float
    roi_anualizado: float
    perda_vs_base_brl: float
    semaforo: str

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class EconomicImpactReportSchema(BaseModel):
    nome: str
    fase: Fase
    sistema: Sistema
    num_animais: int
    arrobas_totais: float
    dias_restantes: int
    preco_atual: float
    margem_atual_pct: float
    roi_atual: float
    cenarios: list[ScenarioResultSchema] = []
    pergunta_invertida: str = ""
    queda_max_antes_vermelho_pct: float = 0.0

    @classmethod
    def from_dataclass(cls, dc):
        cenarios = [ScenarioResultSchema.from_dataclass(c) for c in dc.cenarios]
        return cls(
            nome=dc.nome,
            fase=dc.fase,
            sistema=dc.sistema,
            num_animais=dc.num_animais,
            arrobas_totais=dc.arrobas_totais,
            dias_restantes=dc.dias_restantes,
            preco_atual=dc.preco_atual,
            margem_atual_pct=dc.margem_atual_pct,
            roi_atual=dc.roi_atual,
            cenarios=cenarios,
            pergunta_invertida=dc.pergunta_invertida,
            queda_max_antes_vermelho_pct=dc.queda_max_antes_vermelho_pct,
        )


# ===========================================================================
# Hedge (inalterado — agnóstico ao sistema)
# ===========================================================================

class ContratoFuturoSchema(BaseModel):
    codigo: str
    vencimento: str
    preco_ajuste: float
    volume: int = 0

    @classmethod
    def from_dataclass(cls, dc):
        return cls(
            codigo=dc.codigo,
            vencimento=dc.vencimento.isoformat(),
            preco_ajuste=dc.preco_ajuste,
            volume=dc.volume,
        )


class CurvaFuturosSchema(BaseModel):
    contratos: list[ContratoFuturoSchema] = []
    timestamp: Optional[str] = None
    fonte: str = "manual"

    @classmethod
    def from_dataclass(cls, dc):
        return cls(
            contratos=[ContratoFuturoSchema.from_dataclass(c) for c in dc.contratos],
            timestamp=dc.timestamp.isoformat() if dc.timestamp else None,
            fonte=dc.fonte,
        )


class CenarioGraficoSchema(BaseModel):
    cenario: str
    sem_hedge: float
    com_hedge: float


class HedgeResultSchema(BaseModel):
    arrobas_totais: float
    contratos_necessarios: int
    arrobas_hedgeadas: float
    cobertura_pct: float
    arrobas_descobertas: float
    preco_futuro: float
    basis_estimado: float
    preco_travado: float
    preco_spot: float
    receita_hedgeada: float
    custo_total: float
    custo_hedge: float
    margem_hedgeada_brl: float
    margem_hedgeada_pct: float
    roi_hedgeado_anualizado: float
    receita_spot: float
    margem_spot_brl: float
    margem_spot_pct: float
    roi_spot_anualizado: float
    preco_indiferenca: float
    upside_abdicado_pct: float
    downside_protegido_pct: float
    cenarios_grafico: list[CenarioGraficoSchema] = []
    margem_garantia_total: float
    semaforo_hedge: str
    justificativa: str
    contrato_selecionado: ContratoFuturoSchema

    @classmethod
    def from_dataclass(cls, dc):
        return cls(
            arrobas_totais=dc.arrobas_totais,
            contratos_necessarios=dc.contratos_necessarios,
            arrobas_hedgeadas=dc.arrobas_hedgeadas,
            cobertura_pct=dc.cobertura_pct,
            arrobas_descobertas=dc.arrobas_descobertas,
            preco_futuro=dc.preco_futuro,
            basis_estimado=dc.basis_estimado,
            preco_travado=dc.preco_travado,
            preco_spot=dc.preco_spot,
            receita_hedgeada=dc.receita_hedgeada,
            custo_total=dc.custo_total,
            custo_hedge=dc.custo_hedge,
            margem_hedgeada_brl=dc.margem_hedgeada_brl,
            margem_hedgeada_pct=dc.margem_hedgeada_pct,
            roi_hedgeado_anualizado=dc.roi_hedgeado_anualizado,
            receita_spot=dc.receita_spot,
            margem_spot_brl=dc.margem_spot_brl,
            margem_spot_pct=dc.margem_spot_pct,
            roi_spot_anualizado=dc.roi_spot_anualizado,
            preco_indiferenca=dc.preco_indiferenca,
            upside_abdicado_pct=dc.upside_abdicado_pct,
            downside_protegido_pct=dc.downside_protegido_pct,
            cenarios_grafico=[
                CenarioGraficoSchema(**c) for c in dc.cenarios_grafico
            ],
            margem_garantia_total=dc.margem_garantia_total,
            semaforo_hedge=dc.semaforo_hedge,
            justificativa=dc.justificativa,
            contrato_selecionado=ContratoFuturoSchema.from_dataclass(dc.contrato_selecionado),
        )


# ===========================================================================
# RESPONSE — discriminated union por `fase`
# ===========================================================================

class LoteCriaResponse(BaseModel):
    fase: Literal[Fase.CRIA] = Fase.CRIA
    resultado: ResultCriaSchema
    cotacoes: CotacaoMercadoSchema


class LoteRecriaResponse(BaseModel):
    fase: Literal[Fase.RECRIA] = Fase.RECRIA
    resultado: ResultRecriaSchema
    cotacoes: CotacaoMercadoSchema


class LoteTerminacaoResponse(BaseModel):
    fase: Literal[Fase.TERMINACAO] = Fase.TERMINACAO
    resultado: ResultTerminacaoSchema
    exposicao: LotExposureSchema
    impacto: EconomicImpactReportSchema
    hedge: Optional[HedgeResultSchema] = None
    cotacoes: CotacaoMercadoSchema


LoteCalculoResponse = Annotated[
    Union[LoteCriaResponse, LoteRecriaResponse, LoteTerminacaoResponse],
    Field(discriminator="fase"),
]


# ===========================================================================
# Simulator (inalterado — agnóstico)
# ===========================================================================

class SimulatorScenarioInput(BaseModel):
    nome: str
    var_arroba_pct: float = 0.0
    var_milho_pct: float = 0.0
    var_dolar_pct: float = 0.0
    hedge_arroba: bool = False
    preco_hedge_arroba: float = 0.0
    hedge_milho: bool = False
    preco_hedge_milho: float = 0.0


class SimulatorRequest(BaseModel):
    arrobas_totais: float = Field(..., gt=0)
    custo_total: float = Field(..., gt=0)
    dias_ciclo: int = Field(..., gt=0)
    custo_dieta_total: float = Field(..., ge=0)
    custo_nao_dieta: float = Field(..., ge=0)
    preco_arroba: float = Field(..., gt=0)
    preco_milho_saca: float = Field(..., gt=0)
    dolar_ptax: float = Field(..., gt=0)
    cenarios: list[SimulatorScenarioInput]


class SimulatorScenarioOutput(BaseModel):
    nome: str
    preco_arroba_cenario: float
    preco_milho_cenario: float
    dolar_cenario: float
    receita_sem_hedge: float
    custo_cenario: float
    margem_sem_hedge: float
    margem_pct_sem_hedge: float
    receita_com_hedge: float
    custo_com_hedge: float
    margem_com_hedge: float
    margem_pct_com_hedge: float
    variacao_margem: float
    tem_hedge_arroba: bool
    tem_hedge_milho: bool

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class SimulatorResponse(BaseModel):
    cenarios: list[SimulatorScenarioOutput]
    cenario_base: SimulatorScenarioOutput
    pior_cenario: SimulatorScenarioOutput
    melhor_cenario: SimulatorScenarioOutput
