// Terminal API types — mirrors Python Pydantic schemas

export interface CotacaoMercado {
  arroba_boi_gordo: number | null;
  dolar_ptax: number | null;
  milho_esalq: number | null;
  cdi_anual: number | null;
  timestamp: string | null;
}

export interface TerminacaoPastoRequest {
  num_animais: number;
  peso_entrada_kg: number;
  custo_reposicao_total: number;
  dias_ciclo: number;
  peso_saida_estimado_kg: number;
  custo_suplementacao_dia: number;
  custo_sanidade_dia: number;
  custo_mao_obra_dia: number;
  custo_arrendamento_dia: number;
  preco_venda: number;
  rendimento_carcaca?: number;
  custo_frete_entrada?: number;
  custo_frete_saida?: number;
  custo_mortalidade_estimada?: number;
  outros_custos_dia?: number;
  regiao?: string;
  basis_estimado?: number;
  margem_garantia_pct?: number;
}

export interface ResultTerminacaoPasto {
  nome: string;
  num_animais: number;
  dias_ciclo: number;
  arrobas_totais: number;
  gmd_estimado: number;
  custo_reposicao: number;
  custo_operacional: number;
  custo_fixo: number;
  custo_oportunidade: number;
  custo_total: number;
  custo_por_arroba: number;
  custo_por_cabeca: number;
  break_even_price: number;
  capital_empregado: number;
  receita_estimada: number;
  margem_bruta: number;
  margem_percentual: number;
  roi_ciclo: number;
  roi_anualizado: number;
  exposicao_preco: number;
  impacto_queda_10pct: number;
  impacto_queda_20pct: number;
  margem_apertada: boolean;
  roi_abaixo_cdi: boolean;
}

export interface ScenarioResult {
  label: string;
  variacao_pct: number;
  preco_arroba: number;
  receita: number;
  custo_total: number;
  margem_brl: number;
  margem_pct: number;
  roi_anualizado: number;
  perda_vs_base_brl: number;
  semaforo: "verde" | "amarelo" | "vermelho";
}

export interface EconomicImpactReport {
  nome: string;
  sistema: string;
  num_animais: number;
  arrobas_totais: number;
  dias_restantes: number;
  preco_atual: number;
  margem_atual_pct: number;
  roi_atual: number;
  cenarios: ScenarioResult[];
  pergunta_invertida: string;
  queda_max_antes_vermelho_pct: number;
}

export interface CenarioGrafico {
  cenario: string;
  sem_hedge: number;
  com_hedge: number;
}

export interface HedgeResult {
  arrobas_totais: number;
  contratos_necessarios: number;
  arrobas_hedgeadas: number;
  cobertura_pct: number;
  arrobas_descobertas: number;
  preco_futuro: number;
  basis_estimado: number;
  preco_travado: number;
  preco_spot: number;
  receita_hedgeada: number;
  custo_total: number;
  custo_hedge: number;
  margem_hedgeada_brl: number;
  margem_hedgeada_pct: number;
  roi_hedgeado_anualizado: number;
  receita_spot: number;
  margem_spot_brl: number;
  margem_spot_pct: number;
  roi_spot_anualizado: number;
  preco_indiferenca: number;
  upside_abdicado_pct: number;
  downside_protegido_pct: number;
  cenarios_grafico: CenarioGrafico[];
  margem_garantia_total: number;
  semaforo_hedge: "recomendado" | "opcional" | "desnecessario";
  justificativa: string;
  contrato_selecionado: {
    codigo: string;
    vencimento: string;
    preco_ajuste: number;
  };
}

export interface TerminacaoPastoResponse {
  resultado: ResultTerminacaoPasto;
  exposicao: {
    nome: string;
    sistema: string;
    num_animais: number;
    arrobas_totais: number;
    custo_total: number;
    break_even: number;
    dias_restantes: number;
    dias_ciclo: number;
  };
  impacto: EconomicImpactReport;
  hedge: HedgeResult | null;
  cotacoes: CotacaoMercado;
}
