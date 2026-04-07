"""
Terminal API — Pydantic Schemas
=================================
Espelham os frozen dataclasses dos models/ para serialização JSON.
Cada schema tem um classmethod from_dataclass() para conversão.
"""

from __future__ import annotations

import dataclasses
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class TerminacaoPastoRequest(BaseModel):
    num_animais: int = Field(..., gt=0, le=10000)
    peso_entrada_kg: float = Field(..., gt=0, le=600)
    custo_reposicao_total: float = Field(..., ge=0)
    dias_ciclo: int = Field(..., gt=0, le=365)
    peso_saida_estimado_kg: float = Field(..., gt=0, le=700)
    custo_suplementacao_dia: float = Field(..., ge=0)
    custo_sanidade_dia: float = Field(..., ge=0)
    custo_mao_obra_dia: float = Field(..., ge=0)
    custo_arrendamento_dia: float = Field(..., ge=0)
    preco_venda: float = Field(..., gt=0, le=600, description="R$/@ para cálculo")
    # Opcionais com defaults
    rendimento_carcaca: float = 0.52
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    outros_custos_dia: float = 0.0
    # Hedge
    regiao: str = "MS"
    basis_estimado: float = -5.0
    margem_garantia_pct: float = 0.05


# ---------------------------------------------------------------------------
# Response — Cotações
# ---------------------------------------------------------------------------

class CotacaoMercadoSchema(BaseModel):
    arroba_boi_gordo: Optional[float] = None
    dolar_ptax: Optional[float] = None
    milho_esalq: Optional[float] = None
    cdi_anual: Optional[float] = None
    timestamp: Optional[str] = None

    @classmethod
    def from_dataclass(cls, dc):
        return cls(
            arroba_boi_gordo=dc.arroba_boi_gordo,
            dolar_ptax=dc.dolar_ptax,
            milho_esalq=dc.milho_esalq,
            cdi_anual=dc.cdi_anual,
            timestamp=dc.timestamp.isoformat() if dc.timestamp else None,
        )


# ---------------------------------------------------------------------------
# Response — Resultado Terminação Pasto
# ---------------------------------------------------------------------------

class ResultTerminacaoPastoSchema(BaseModel):
    nome: str
    num_animais: int
    dias_ciclo: int
    arrobas_totais: float
    gmd_estimado: float
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

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


# ---------------------------------------------------------------------------
# Response — Exposure
# ---------------------------------------------------------------------------

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
    sistema: str
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


# ---------------------------------------------------------------------------
# Response — Economic Impact
# ---------------------------------------------------------------------------

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
    sistema: str
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


# ---------------------------------------------------------------------------
# Response — Hedge
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Response composta — tudo de uma vez
# ---------------------------------------------------------------------------

class TerminacaoPastoResponse(BaseModel):
    resultado: ResultTerminacaoPastoSchema
    exposicao: LotExposureSchema
    impacto: EconomicImpactReportSchema
    hedge: Optional[HedgeResultSchema] = None
    cotacoes: CotacaoMercadoSchema


# ---------------------------------------------------------------------------
# Request — Confinamento
# ---------------------------------------------------------------------------

class ConfinamentoRequest(BaseModel):
    num_animais: int = Field(..., gt=0, le=10000)
    peso_entrada_kg: float = Field(..., gt=0, le=600)
    custo_reposicao_total: float = Field(..., ge=0)
    dias_ciclo: int = Field(..., gt=0, le=365)
    peso_saida_estimado_kg: float = Field(..., gt=0, le=700)
    consumo_ms_pct_pv: float = Field(..., gt=0, le=0.10)
    custo_dieta_kg_ms: float = Field(..., ge=0)
    custo_sanidade_dia: float = Field(..., ge=0)
    custo_mao_obra_dia: float = Field(..., ge=0)
    custo_instalacoes_dia: float = Field(..., ge=0)
    preco_venda: float = Field(..., gt=0, le=600)
    rendimento_carcaca: float = 0.54
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    regiao: str = "MS"
    basis_estimado: float = -5.0
    margem_garantia_pct: float = 0.05


class ResultConfinamentoSchema(BaseModel):
    nome: str
    num_animais: int
    dias_ciclo: int
    arrobas_totais: float
    gmd_estimado: float
    custo_reposicao: float
    custo_dieta_total: float
    custo_dieta_por_arroba: float
    custo_outros_operacional: float
    custo_fixo: float
    custo_oportunidade: float
    custo_total: float
    participacao_dieta_pct: float
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

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class ConfinamentoResponse(BaseModel):
    resultado: ResultConfinamentoSchema
    exposicao: LotExposureSchema
    impacto: EconomicImpactReportSchema
    hedge: Optional[HedgeResultSchema] = None
    cotacoes: CotacaoMercadoSchema


# ---------------------------------------------------------------------------
# Request — Semiconfinamento
# ---------------------------------------------------------------------------

class SemiconfinamentoRequest(BaseModel):
    num_animais: int = Field(..., gt=0, le=10000)
    peso_entrada_kg: float = Field(..., gt=0, le=600)
    custo_reposicao_total: float = Field(..., ge=0)
    dias_ciclo: int = Field(..., gt=0, le=365)
    peso_saida_estimado_kg: float = Field(..., gt=0, le=700)
    custo_arrendamento_dia: float = Field(..., ge=0)
    custo_manutencao_pasto_dia: float = Field(..., ge=0)
    consumo_suplemento_kg_dia: float = Field(..., ge=0)
    custo_suplemento_kg: float = Field(..., ge=0)
    custo_sanidade_dia: float = Field(..., ge=0)
    custo_mao_obra_dia: float = Field(..., ge=0)
    preco_venda: float = Field(..., gt=0, le=600)
    rendimento_carcaca: float = 0.53
    outros_custos_dia: float = 0.0
    custo_frete_entrada: float = 0.0
    custo_frete_saida: float = 0.0
    custo_mortalidade_estimada: float = 0.0
    regiao: str = "MS"
    basis_estimado: float = -5.0
    margem_garantia_pct: float = 0.05


class ResultSemiconfinamentoSchema(BaseModel):
    nome: str
    num_animais: int
    dias_ciclo: int
    arrobas_totais: float
    gmd_estimado: float
    custo_reposicao: float
    custo_pastagem: float
    custo_suplementacao: float
    custo_suplementacao_por_arroba: float
    custo_outros: float
    custo_oportunidade: float
    custo_total: float
    custo_por_arroba: float
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

    @classmethod
    def from_dataclass(cls, dc):
        return cls(**dataclasses.asdict(dc))


class SemiconfinamentoResponse(BaseModel):
    resultado: ResultSemiconfinamentoSchema
    exposicao: LotExposureSchema
    impacto: EconomicImpactReportSchema
    hedge: Optional[HedgeResultSchema] = None
    cotacoes: CotacaoMercadoSchema


# ---------------------------------------------------------------------------
# Request — Cria
# ---------------------------------------------------------------------------

class CriaRequest(BaseModel):
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


class ResultCriaSchema(BaseModel):
    nome: str
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


class CriaResponse(BaseModel):
    resultado: ResultCriaSchema
    cotacoes: CotacaoMercadoSchema


# ---------------------------------------------------------------------------
# Request — Recria
# ---------------------------------------------------------------------------

class RecriaRequest(BaseModel):
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


class ResultRecriaSchema(BaseModel):
    nome: str
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


class RecriaResponse(BaseModel):
    resultado: ResultRecriaSchema
    cotacoes: CotacaoMercadoSchema
