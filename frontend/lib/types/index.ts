// Terminal API types — mirrors Python Pydantic schemas (pós-refactor fase/sistema).
//
// Modelo de lote: discriminated union por `fase`. Endpoint único POST /lotes/calcular
// aceita LoteInput e devolve LoteCalculoResponse (também union por fase).
//
// 9 combinações permitidas (fase × sistema). Sem restrição de negócio bloqueando.
// Cria e Recria são sistema-agnósticas em cálculo — `sistema` é meta-tag.

// ============================================================================
// Enums (snake_case minúsculo no wire — bate com backend Python)
// ============================================================================

export type Fase = "cria" | "recria" | "terminacao";

export type Sistema = "pasto" | "semiconfinamento" | "confinamento";

// Labels PT-BR pra UI — backend recebe os valores em snake_case acima
export const FASE_LABEL: Record<Fase, string> = {
  cria: "Cria",
  recria: "Recria",
  terminacao: "Terminação",
};

export const SISTEMA_LABEL: Record<Sistema, string> = {
  pasto: "Pasto",
  semiconfinamento: "Semiconfinamento",
  confinamento: "Confinamento",
};

// ============================================================================
// Cotações / Mercado
// ============================================================================

export interface ContratoFuturo {
  codigo: string;
  vencimento: string;
  preco_ajuste: number;
  volume: number;
}

export interface CurvaFuturos {
  contratos: ContratoFuturo[];
  timestamp: string | null;
  fonte: string;
}

export interface HistoricoDolarEntry {
  data: string;
  valor: number;
}

export interface CotacaoMercado {
  arroba_boi_gordo: number | null;
  dolar_ptax: number | null;
  milho_esalq: number | null;
  cdi_anual: number | null;
  bezerro_cepea?: number | null;
  soja_esalq?: number | null;
  ibov?: number | null;
  ibov_delta_pct?: number | null;
  timestamp: string | null;
}

// ============================================================================
// Notícias (Home — "O que moveu a linha hoje")
// ============================================================================

export type NoticiaCategoria =
  | "cambio"
  | "demanda_externa"
  | "oferta_interna"
  | "insumos";

export interface NoticiaDeltaCorrelato {
  arroba_pct: number | null;
  dolar_pct: number | null;
  milho_pct: number | null;
}

export interface Noticia {
  id: string;
  titulo: string;
  fonte: string;
  url: string;
  imagem: string | null;
  categoria: NoticiaCategoria;
  publicado_em: string;
  delta_correlato: NoticiaDeltaCorrelato;
}

export interface NoticiasDoDiaResponse {
  ultima_atualizacao: string | null;
  noticias: Noticia[];
  delta_dia: {
    arroba_pct: number | null;
    dolar_pct: number | null;
    milho_pct: number | null;
  };
}

export interface VolatilidadeArroba {
  sigma_diario: number | null;
  sigma_anualizado: number | null;
  media_diaria: number | null;
  n_observations: number;
  period_days: number;
  source: string | null;
}

// ============================================================================
// LoteInput — discriminated union por `fase`
// ============================================================================

export interface LoteInputCria {
  fase: "cria";
  sistema: Sistema;
  nome?: string;
  data_referencia?: string;
  num_matrizes: number;
  taxa_natalidade: number;
  taxa_desmama: number;
  peso_desmama_kg: number;
  custo_nutricao_ua_ano: number;
  custo_sanidade_ua_ano: number;
  custo_reproducao_ua_ano: number;
  custo_mao_obra_ua_ano: number;
  custo_arrendamento_ua_ano: number;
  valor_matriz: number;
  outros_custos_ua_ano?: number;
}

export interface LoteInputRecria {
  fase: "recria";
  sistema: Sistema;
  nome?: string;
  data_entrada?: string;
  num_animais: number;
  peso_entrada_kg: number;
  custo_aquisicao_total: number;
  dias_ciclo: number;
  peso_saida_estimado_kg: number;
  custo_nutricao_dia: number;
  custo_sanidade_dia: number;
  custo_mao_obra_dia: number;
  custo_arrendamento_dia: number;
  outros_custos_dia?: number;
  custo_frete_entrada?: number;
  custo_frete_saida?: number;
}

/**
 * Terminação — campos sparse por sistema.
 *
 * Backend valida (LoteInputTerminacaoSchema.model_validator):
 *  - sistema=pasto exige custo_suplementacao_dia + custo_arrendamento_dia
 *  - sistema=confinamento exige consumo_ms_pct_pv + custo_dieta_kg_ms + custo_instalacoes_dia
 *  - sistema=semiconfinamento exige custo_arrendamento_dia + custo_manutencao_pasto_dia +
 *    consumo_suplemento_kg_dia + custo_suplemento_kg
 */
export interface LoteInputTerminacao {
  fase: "terminacao";
  sistema: Sistema;
  nome?: string;
  data_entrada?: string;

  // Comuns
  num_animais: number;
  peso_entrada_kg: number;
  custo_reposicao_total: number;
  dias_ciclo: number;
  peso_saida_estimado_kg: number;
  custo_sanidade_dia: number;
  custo_mao_obra_dia: number;

  // Sparse — PASTO
  custo_suplementacao_dia?: number | null;

  // Sparse — PASTO + SEMI
  custo_arrendamento_dia?: number | null;

  // Sparse — CONFINAMENTO
  consumo_ms_pct_pv?: number | null;
  custo_dieta_kg_ms?: number | null;
  custo_instalacoes_dia?: number | null;

  // Sparse — SEMI
  custo_manutencao_pasto_dia?: number | null;
  consumo_suplemento_kg_dia?: number | null;
  custo_suplemento_kg?: number | null;

  // Opcionais comuns
  rendimento_carcaca?: number | null;
  outros_custos_dia?: number;
  custo_frete_entrada?: number;
  custo_frete_saida?: number;
  custo_mortalidade_estimada?: number;

  // Hedge / preço
  preco_venda: number;
  regiao?: string;
  basis_estimado?: number;
  margem_garantia_pct?: number;
}

export type LoteInput = LoteInputCria | LoteInputRecria | LoteInputTerminacao;

// ============================================================================
// Resultados de cálculo
// ============================================================================

export interface ResultCria {
  nome: string;
  fase: "cria";
  sistema: Sistema;
  num_matrizes: number;
  bezerros_desmamados: number;
  taxa_natalidade: number;
  taxa_desmama: number;
  peso_desmama_kg: number;
  kg_produzido_por_matriz: number;
  custo_operacional_ano: number;
  custo_oportunidade: number;
  custo_total_ano: number;
  custo_por_matriz_ano: number;
  custo_por_bezerro_produzido: number;
  capital_rebanho: number;
}

export interface ResultRecria {
  nome: string;
  fase: "recria";
  sistema: Sistema;
  num_animais: number;
  dias_ciclo: number;
  gmd_estimado: number;
  kg_ganho_total: number;
  custo_operacional: number;
  custo_oportunidade: number;
  custo_total: number;
  custo_por_cabeca: number;
  custo_por_kg_ganho: number;
  capital_empregado: number;
}

/**
 * Resultado unificado da Terminação — campos sparse por sistema.
 * Indicadores principais sempre presentes; breakdowns específicos só quando
 * o sistema correspondente.
 */
export interface ResultTerminacao {
  nome: string;
  fase: "terminacao";
  sistema: Sistema;
  num_animais: number;
  dias_ciclo: number;

  arrobas_totais: number;
  gmd_estimado: number;
  rendimento_carcaca: number;

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

  // Breakdowns sparse por sistema (Optional)
  custo_dieta_total?: number | null;
  custo_dieta_por_arroba?: number | null;
  participacao_dieta_pct?: number | null;
  custo_pastagem?: number | null;
  custo_suplementacao?: number | null;
  custo_suplementacao_por_arroba?: number | null;
}

// ============================================================================
// Exposure / Impact / Hedge (consumidos só por terminação)
// ============================================================================

export interface DailySnapshot {
  dia: number;
  data: string;
  peso_medio_kg: number;
  arrobas_projetadas: number;
  custo_acumulado: number;
  custo_diario_lote: number;
  custo_por_arroba: number;
  break_even: number;
}

export interface LotExposure {
  nome: string;
  fase: "terminacao";
  sistema: Sistema;
  num_animais: number;
  data_entrada: string;
  data_venda_projetada: string;
  dias_ciclo: number;
  dias_restantes: number;
  peso_entrada_kg: number;
  peso_saida_kg: number;
  rendimento_carcaca: number;
  arrobas_totais: number;
  custo_reposicao: number;
  custo_operacional_total: number;
  custo_oportunidade: number;
  custo_total: number;
  custo_por_arroba: number;
  break_even: number;
  exposicao_arrobas: number;
  exposicao_brl_por_real_arroba: number;
  timeline?: DailySnapshot[];
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
  fase: "terminacao";
  sistema: Sistema;
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

// ============================================================================
// Response — discriminated union por `fase`
// ============================================================================

export interface LoteCriaResponse {
  fase: "cria";
  resultado: ResultCria;
  cotacoes: CotacaoMercado;
}

export interface LoteRecriaResponse {
  fase: "recria";
  resultado: ResultRecria;
  cotacoes: CotacaoMercado;
}

export interface LoteTerminacaoResponse {
  fase: "terminacao";
  resultado: ResultTerminacao;
  exposicao: LotExposure;
  impacto: EconomicImpactReport;
  hedge: HedgeResult | null;
  cotacoes: CotacaoMercado;
}

export type LoteCalculoResponse =
  | LoteCriaResponse
  | LoteRecriaResponse
  | LoteTerminacaoResponse;

// ============================================================================
// Simulator (inalterado — agnóstico ao sistema)
// ============================================================================

export interface SimulatorScenarioInput {
  nome: string;
  var_arroba_pct: number;
  var_milho_pct: number;
  var_dolar_pct: number;
  hedge_arroba: boolean;
  preco_hedge_arroba: number;
  hedge_milho: boolean;
  preco_hedge_milho: number;
}

export interface SimulatorRequest {
  arrobas_totais: number;
  custo_total: number;
  dias_ciclo: number;
  custo_dieta_total: number;
  custo_nao_dieta: number;
  preco_arroba: number;
  preco_milho_saca: number;
  dolar_ptax: number;
  cenarios: SimulatorScenarioInput[];
}

export interface SimulatorScenarioOutput {
  nome: string;
  preco_arroba_cenario: number;
  preco_milho_cenario: number;
  dolar_cenario: number;
  receita_sem_hedge: number;
  custo_cenario: number;
  margem_sem_hedge: number;
  margem_pct_sem_hedge: number;
  receita_com_hedge: number;
  custo_com_hedge: number;
  margem_com_hedge: number;
  margem_pct_com_hedge: number;
  variacao_margem: number;
  tem_hedge_arroba: boolean;
  tem_hedge_milho: boolean;
}

export interface SimulatorResponse {
  cenarios: SimulatorScenarioOutput[];
  cenario_base: SimulatorScenarioOutput;
  pior_cenario: SimulatorScenarioOutput;
  melhor_cenario: SimulatorScenarioOutput;
}
