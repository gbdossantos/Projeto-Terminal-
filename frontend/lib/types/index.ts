// Terminal API types — mirrors Python Pydantic schemas

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

export interface LotExposure {
  nome: string;
  sistema: string;
  num_animais: number;
  arrobas_totais: number;
  custo_total: number;
  break_even: number;
  dias_restantes: number;
  dias_ciclo: number;
}

export interface TerminacaoPastoResponse {
  resultado: ResultTerminacaoPasto;
  exposicao: LotExposure;
  impacto: EconomicImpactReport;
  hedge: HedgeResult | null;
  cotacoes: CotacaoMercado;
}

// --- Confinamento ---

export interface ConfinamentoRequest {
  num_animais: number;
  peso_entrada_kg: number;
  custo_reposicao_total: number;
  dias_ciclo: number;
  peso_saida_estimado_kg: number;
  consumo_ms_pct_pv: number;
  custo_dieta_kg_ms: number;
  custo_sanidade_dia: number;
  custo_mao_obra_dia: number;
  custo_instalacoes_dia: number;
  preco_venda: number;
  rendimento_carcaca?: number;
  custo_frete_entrada?: number;
  custo_frete_saida?: number;
  custo_mortalidade_estimada?: number;
  regiao?: string;
  basis_estimado?: number;
  margem_garantia_pct?: number;
}

export interface ResultConfinamento {
  nome: string;
  num_animais: number;
  dias_ciclo: number;
  arrobas_totais: number;
  gmd_estimado: number;
  custo_reposicao: number;
  custo_dieta_total: number;
  custo_dieta_por_arroba: number;
  custo_outros_operacional: number;
  custo_fixo: number;
  custo_oportunidade: number;
  custo_total: number;
  participacao_dieta_pct: number;
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

export interface ConfinamentoResponse {
  resultado: ResultConfinamento;
  exposicao: LotExposure;
  impacto: EconomicImpactReport;
  hedge: HedgeResult | null;
  cotacoes: CotacaoMercado;
}

// --- Semiconfinamento ---

export interface SemiconfinamentoRequest {
  num_animais: number;
  peso_entrada_kg: number;
  custo_reposicao_total: number;
  dias_ciclo: number;
  peso_saida_estimado_kg: number;
  custo_arrendamento_dia: number;
  custo_manutencao_pasto_dia: number;
  consumo_suplemento_kg_dia: number;
  custo_suplemento_kg: number;
  custo_sanidade_dia: number;
  custo_mao_obra_dia: number;
  preco_venda: number;
  rendimento_carcaca?: number;
  regiao?: string;
  basis_estimado?: number;
  margem_garantia_pct?: number;
}

export interface ResultSemiconfinamento {
  nome: string;
  num_animais: number;
  dias_ciclo: number;
  arrobas_totais: number;
  gmd_estimado: number;
  custo_reposicao: number;
  custo_pastagem: number;
  custo_suplementacao: number;
  custo_suplementacao_por_arroba: number;
  custo_outros: number;
  custo_oportunidade: number;
  custo_total: number;
  custo_por_arroba: number;
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

export interface SemiconfinamentoResponse {
  resultado: ResultSemiconfinamento;
  exposicao: LotExposure;
  impacto: EconomicImpactReport;
  hedge: HedgeResult | null;
  cotacoes: CotacaoMercado;
}

// --- Cria ---

export interface CriaRequest {
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

export interface ResultCria {
  nome: string;
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

export interface CriaResponse {
  resultado: ResultCria;
  cotacoes: CotacaoMercado;
}

// --- Recria ---

export interface RecriaRequest {
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
}

export interface ResultRecria {
  nome: string;
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

export interface RecriaResponse {
  resultado: ResultRecria;
  cotacoes: CotacaoMercado;
}

// --- Simulator ---

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
