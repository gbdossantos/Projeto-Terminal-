// Defaults por sistema produtivo — valores de referencia para pre-popular formularios.
//
// Fontes 2024-2025 (ver tabela original com fonte por linha):
// - IMEA, Embrapa CNPGC, Scot Consultoria/Confina Brasil, CNA Campo Futuro,
//   CEPEA, Portal DBO, Sindan, ANTT.
// - Foco regional: Centro-Oeste (MS/MT/GO).
//
// IMPORTANTE: estes valores devem ser revisados trimestralmente (reposicao
// e dieta variam significativamente). Quando a fazenda da familia operar com
// dados proprios, sobrescrever com valores reais.
//
// Cotacoes (preco_venda) sao re-populadas via fetchCotacoes() no mount.

import type {
  TerminacaoPastoRequest,
  ConfinamentoRequest,
  SemiconfinamentoRequest,
  CriaRequest,
  RecriaRequest,
} from "@/lib/types";

// ── Terminacao Pasto ────────────────────────────────────────────────
// 200 cab × R$ 3.300/cab reposicao · 180 dias · 380 -> 510 kg · rend 52%
export const DEFAULTS_TERMINACAO_PASTO: TerminacaoPastoRequest = {
  num_animais: 200,
  peso_entrada_kg: 380,
  peso_saida_estimado_kg: 510,
  dias_ciclo: 180,
  rendimento_carcaca: 0.52,
  custo_reposicao_total: 660_000, // 200 × R$ 3.300 (Portal DBO MS jan/2025)
  custo_suplementacao_dia: 2.80,  // Embrapa Suplementa Certo + ICAP CO
  custo_arrendamento_dia: 0.55,   // R$ 600/ha/ano MS (jan/2025)
  custo_sanidade_dia: 0.20,
  custo_mao_obra_dia: 0.60,
  outros_custos_dia: 0.40,
  preco_venda: 315,               // sera sobrescrito por fetchCotacoes
  custo_frete_entrada: 16_000,    // 200 × R$ 80 (ANTT 200km)
  custo_frete_saida: 18_000,      // 200 × R$ 90
  custo_mortalidade_estimada: 9_900, // 200 × R$ 3.300 × 1,5%
};

// ── Confinamento ────────────────────────────────────────────────────
// 1.500 cab × R$ 3.500/cab · 100 dias · 380 -> 540 kg · rend 54%
export const DEFAULTS_CONFINAMENTO: ConfinamentoRequest = {
  num_animais: 1_500,
  peso_entrada_kg: 380,
  peso_saida_estimado_kg: 540,
  dias_ciclo: 100,
  rendimento_carcaca: 0.54,
  custo_reposicao_total: 5_250_000, // 1500 × R$ 3.500 (Portal DBO MT jan/2025)
  consumo_ms_pct_pv: 0.022,         // Embrapa CNPGC + iRancho
  custo_dieta_kg_ms: 1.10,          // Scot R$ 1.092/t MS CO (dez/2025)
  custo_sanidade_dia: 0.40,         // Sindan + protocolo entrada
  custo_mao_obra_dia: 0.80,         // Campo Futuro CNA
  custo_instalacoes_dia: 1.20,
  preco_venda: 315,
  custo_frete_entrada: 135_000,     // 1500 × R$ 90 (ANTT)
  custo_frete_saida: 150_000,       // 1500 × R$ 100
  custo_mortalidade_estimada: 52_500, // 1500 × R$ 3.500 × 1,0% (Confina Brasil 2024)
};

// ── Semiconfinamento ───────────────────────────────────────────────
// 500 cab × R$ 3.300/cab · 130 dias · 380 -> 520 kg · rend 53%
export const DEFAULTS_SEMICONFINAMENTO: SemiconfinamentoRequest = {
  num_animais: 500,
  peso_entrada_kg: 380,
  peso_saida_estimado_kg: 520,
  dias_ciclo: 130,
  rendimento_carcaca: 0.53,
  custo_reposicao_total: 1_650_000, // 500 × R$ 3.300 (Portal DBO MS)
  custo_arrendamento_dia: 0.55,
  custo_manutencao_pasto_dia: 0.30, // Giro do Boi + Embrapa pastagens
  consumo_suplemento_kg_dia: 4.0,   // 1% PV concentrado (Pec. Alta Performance)
  custo_suplemento_kg: 1.30,        // Scot concentrado MS CO
  custo_sanidade_dia: 0.25,
  custo_mao_obra_dia: 0.70,
  preco_venda: 315,
};

// ── Cria ────────────────────────────────────────────────────────────
// 500 matrizes · natalidade 78% · desmama 95% · peso 200kg · valor matriz R$ 4.500
export const DEFAULTS_CRIA: CriaRequest = {
  num_matrizes: 500,
  taxa_natalidade: 0.78,            // Embrapa CNPGC + Gazeta — modal tecnificado
  taxa_desmama: 0.95,               // Embrapa CNPGC referencia
  peso_desmama_kg: 200,             // Embrapa + Elanco — 8 meses
  valor_matriz: 4_500,              // Gado Facil MT — vaca parida +9% em 2024
  custo_nutricao_ua_ano: 480,       // Giro do Boi — supl. R$ 345-490/cab/ano
  custo_sanidade_ua_ano: 80,        // Sindan + reprodutivas
  custo_reproducao_ua_ano: 150,     // IATF + touro rateio (Embrapa)
  custo_mao_obra_ua_ano: 220,       // Campo Futuro CNA
  custo_arrendamento_ua_ano: 600,   // Reportagem MS R$ 600/ha/ano
  outros_custos_ua_ano: 180,
};

// ── Recria ──────────────────────────────────────────────────────────
// 800 cab · 365 dias · 220 -> 380 kg · GMD ~440g/dia
export const DEFAULTS_RECRIA: RecriaRequest = {
  num_animais: 800,
  peso_entrada_kg: 220,             // Embrapa pos-desmama
  peso_saida_estimado_kg: 380,      // Embrapa CNPGC
  dias_ciclo: 365,
  custo_aquisicao_total: 2_160_000, // 800 × R$ 2.700 (bezerro 7@ — Portal DBO MS mar/2025)
  custo_nutricao_dia: 1.30,         // Scot recria CO
  custo_sanidade_dia: 0.15,
  custo_mao_obra_dia: 0.50,
  custo_arrendamento_dia: 0.55,
  outros_custos_dia: 0.30,
};
