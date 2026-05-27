/**
 * Schema de import de lotes — single source of truth (pós-refactor fase/sistema).
 *
 * Cada FieldDef descreve um campo do template:
 *  - nome canônico (coluna no CSV/XLSX, em snake_case PT)
 *  - label humano + unidade (PT)
 *  - aplicabilidade por combinação (fase, sistema) via predicados
 *  - tipo + range válido
 *  - sugestão pra linha-exemplo
 *
 * Aplicabilidade:
 *  - Cria: num_matrizes e custos UA/ano. sistema é meta-tag (não afeta).
 *  - Recria: num_animais e custos diários simples. sistema é meta-tag.
 *  - Terminação: custos variam por sistema (pasto/conf/semi têm sparse fields).
 */

import type { Fase, Sistema } from "@/lib/types";

export type FieldType = "number" | "percent" | "string" | "fase" | "sistema";

export interface FieldDef {
  /** Nome da coluna no CSV/XLSX. */
  nome: string;
  /** Label humano + unidade. */
  label: string;
  /** Predicado: campo é OBRIGATÓRIO pra essa combinação. */
  requerido: (fase: Fase, sistema: Sistema) => boolean;
  /** Predicado: campo é OPCIONAL pra essa combinação. */
  opcional: (fase: Fase, sistema: Sistema) => boolean;
  /** Tipo pra validação/parse. */
  tipo: FieldType;
  /** Range válido (inclusive). number/percent. */
  min?: number;
  max?: number;
  /** Sugestão pra linha-exemplo, indexada por "fase__sistema". */
  exemplo?: Partial<Record<`${Fase}__${Sistema}`, number | string>>;
}

// ─── Combinações pra geração das linhas-exemplo do template ─────
export interface CombinacaoExemplo {
  fase: Fase;
  sistema: Sistema;
  nomeLote: string;
}

export const COMBINACOES_EXEMPLO: CombinacaoExemplo[] = [
  { fase: "cria",       sistema: "pasto",            nomeLote: "Cria matrizes 26" },
  { fase: "recria",     sistema: "pasto",            nomeLote: "Recria 26" },
  { fase: "terminacao", sistema: "pasto",            nomeLote: "Pasto Norte 26" },
  { fase: "terminacao", sistema: "confinamento",     nomeLote: "Confina A 26" },
  { fase: "terminacao", sistema: "semiconfinamento", nomeLote: "Semi B 26" },
];

// Helpers de predicado pra leitura mais fácil
const sempre = () => true;
const nunca  = () => false;
const seFase = (...fs: Fase[]) => (f: Fase) => fs.includes(f);
const seComb = (fSet: Fase[], sSet: Sistema[]) => (f: Fase, s: Sistema) =>
  fSet.includes(f) && sSet.includes(s);

/**
 * Lista canônica de campos. Ordem aqui = ordem das colunas no template.
 *
 * Identidade primeiro (nome, fase, sistema), depois rebanho/peso, custos.
 */
export const CAMPOS: FieldDef[] = [
  // ─── Identidade ───────────────────────────────────────────────
  {
    nome: "nome_lote",
    label: "Nome do lote",
    requerido: sempre,
    opcional: nunca,
    tipo: "string",
  },
  {
    nome: "fase",
    label: "Fase do ciclo (cria, recria, terminacao)",
    requerido: sempre,
    opcional: nunca,
    tipo: "fase",
  },
  {
    nome: "sistema",
    label: "Sistema de produção (pasto, semiconfinamento, confinamento)",
    requerido: sempre,
    opcional: nunca,
    tipo: "sistema",
  },

  // ─── Rebanho ──────────────────────────────────────────────────
  {
    nome: "num_animais",
    label: "Animais (cab)",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 1,
    max: 100_000,
    exemplo: {
      recria__pasto: 800,
      terminacao__pasto: 200,
      terminacao__confinamento: 1_500,
      terminacao__semiconfinamento: 500,
    },
  },
  {
    nome: "num_matrizes",
    label: "Matrizes (cab)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 1,
    max: 100_000,
    exemplo: { cria__pasto: 500 },
  },

  // ─── Peso / dias (terminacao + recria) ────────────────────────
  {
    nome: "peso_entrada_kg",
    label: "Peso entrada (kg)",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 50,
    max: 800,
    exemplo: {
      recria__pasto: 220,
      terminacao__pasto: 380,
      terminacao__confinamento: 380,
      terminacao__semiconfinamento: 380,
    },
  },
  {
    nome: "peso_saida_estimado_kg",
    label: "Peso saída (kg)",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 100,
    max: 900,
    exemplo: {
      recria__pasto: 380,
      terminacao__pasto: 510,
      terminacao__confinamento: 540,
      terminacao__semiconfinamento: 520,
    },
  },
  {
    nome: "dias_ciclo",
    label: "Dias de ciclo",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 30,
    max: 1095,
    exemplo: {
      recria__pasto: 365,
      terminacao__pasto: 180,
      terminacao__confinamento: 100,
      terminacao__semiconfinamento: 130,
    },
  },
  {
    nome: "rendimento_carcaca",
    label: "Rendimento carcaça (fração 0–1)",
    requerido: nunca,
    opcional: seFase("terminacao"),
    tipo: "percent",
    min: 0.4,
    max: 0.6,
    exemplo: {
      terminacao__pasto: 0.52,
      terminacao__confinamento: 0.54,
      terminacao__semiconfinamento: 0.53,
    },
  },

  // ─── Custos / preço — TERMINACAO (sparse por sistema) ─────────
  {
    nome: "custo_reposicao_total",
    label: "Custo reposição total (R$)",
    requerido: seFase("terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 660_000,
      terminacao__confinamento: 5_250_000,
      terminacao__semiconfinamento: 1_650_000,
    },
  },
  {
    nome: "custo_suplementacao_dia",
    label: "Custo suplementação (R$/cab/dia)",
    requerido: seComb(["terminacao"], ["pasto"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__pasto: 2.8 },
  },
  {
    nome: "custo_arrendamento_dia",
    label: "Custo arrendamento (R$/cab/dia)",
    requerido: (f, s) =>
      (f === "terminacao" && (s === "pasto" || s === "semiconfinamento")) ||
      f === "recria",
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 0.55,
      terminacao__semiconfinamento: 0.55,
      recria__pasto: 0.55,
    },
  },
  {
    nome: "custo_sanidade_dia",
    label: "Custo sanidade (R$/cab/dia)",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: {
      recria__pasto: 0.15,
      terminacao__pasto: 0.2,
      terminacao__confinamento: 0.4,
      terminacao__semiconfinamento: 0.25,
    },
  },
  {
    nome: "custo_mao_obra_dia",
    label: "Custo mão de obra (R$/cab/dia)",
    requerido: seFase("recria", "terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: {
      recria__pasto: 0.5,
      terminacao__pasto: 0.6,
      terminacao__confinamento: 0.8,
      terminacao__semiconfinamento: 0.7,
    },
  },
  {
    nome: "outros_custos_dia",
    label: "Outros custos (R$/cab/dia)",
    requerido: nunca,
    // Opcional pra recria e pra terminacao em qualquer sistema (mesmos campos do form)
    opcional: (f) => f === "recria" || f === "terminacao",
    tipo: "number",
    min: 0,
    exemplo: {
      recria__pasto: 0.3,
      terminacao__pasto: 0.4,
    },
  },

  // ─── Confinamento específico ──────────────────────────────────
  {
    nome: "consumo_ms_pct_pv",
    label: "Consumo MS (% PV, fração)",
    requerido: seComb(["terminacao"], ["confinamento"]),
    opcional: nunca,
    tipo: "percent",
    min: 0.005,
    max: 0.05,
    exemplo: { terminacao__confinamento: 0.022 },
  },
  {
    nome: "custo_dieta_kg_ms",
    label: "Custo dieta (R$/kg MS)",
    requerido: seComb(["terminacao"], ["confinamento"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__confinamento: 1.1 },
  },
  {
    nome: "custo_instalacoes_dia",
    label: "Custo instalações (R$/cab/dia)",
    requerido: seComb(["terminacao"], ["confinamento"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__confinamento: 1.2 },
  },

  // ─── Semiconfinamento específico ──────────────────────────────
  {
    nome: "custo_manutencao_pasto_dia",
    label: "Custo manutenção pasto (R$/cab/dia)",
    requerido: seComb(["terminacao"], ["semiconfinamento"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__semiconfinamento: 0.3 },
  },
  {
    nome: "consumo_suplemento_kg_dia",
    label: "Consumo suplemento (kg/cab/dia)",
    requerido: seComb(["terminacao"], ["semiconfinamento"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__semiconfinamento: 4 },
  },
  {
    nome: "custo_suplemento_kg",
    label: "Custo suplemento (R$/kg)",
    requerido: seComb(["terminacao"], ["semiconfinamento"]),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { terminacao__semiconfinamento: 1.3 },
  },

  // ─── Recria específico ────────────────────────────────────────
  {
    nome: "custo_aquisicao_total",
    label: "Custo aquisição total (R$)",
    requerido: seFase("recria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { recria__pasto: 2_160_000 },
  },
  {
    nome: "custo_nutricao_dia",
    label: "Custo nutrição (R$/cab/dia)",
    requerido: seFase("recria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { recria__pasto: 1.3 },
  },

  // ─── Cria específico ──────────────────────────────────────────
  {
    nome: "taxa_natalidade",
    label: "Taxa natalidade (fração 0–1)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "percent",
    min: 0.3,
    max: 1.0,
    exemplo: { cria__pasto: 0.78 },
  },
  {
    nome: "taxa_desmama",
    label: "Taxa desmama (fração 0–1)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "percent",
    min: 0.5,
    max: 1.0,
    exemplo: { cria__pasto: 0.95 },
  },
  {
    nome: "peso_desmama_kg",
    label: "Peso desmama (kg)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 80,
    max: 350,
    exemplo: { cria__pasto: 200 },
  },
  {
    nome: "valor_matriz",
    label: "Valor da matriz (R$)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 4_500 },
  },
  {
    nome: "custo_nutricao_ua_ano",
    label: "Custo nutrição (R$/UA/ano)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 480 },
  },
  {
    nome: "custo_sanidade_ua_ano",
    label: "Custo sanidade (R$/UA/ano)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 80 },
  },
  {
    nome: "custo_reproducao_ua_ano",
    label: "Custo reprodução (R$/UA/ano)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 150 },
  },
  {
    nome: "custo_mao_obra_ua_ano",
    label: "Custo mão de obra (R$/UA/ano)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 220 },
  },
  {
    nome: "custo_arrendamento_ua_ano",
    label: "Custo arrendamento (R$/UA/ano)",
    requerido: seFase("cria"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 600 },
  },
  {
    nome: "outros_custos_ua_ano",
    label: "Outros custos (R$/UA/ano)",
    requerido: nunca,
    opcional: seFase("cria"),
    tipo: "number",
    min: 0,
    exemplo: { cria__pasto: 180 },
  },

  // ─── Preço & fretes (só TERMINACAO) ───────────────────────────
  {
    nome: "preco_venda",
    label: "Cotação arroba (R$/@)",
    requerido: seFase("terminacao"),
    opcional: nunca,
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 315,
      terminacao__confinamento: 315,
      terminacao__semiconfinamento: 315,
    },
  },
  {
    nome: "custo_frete_entrada",
    label: "Frete entrada (R$)",
    requerido: nunca,
    opcional: seComb(["terminacao"], ["pasto", "confinamento"]),
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 16_000,
      terminacao__confinamento: 135_000,
    },
  },
  {
    nome: "custo_frete_saida",
    label: "Frete saída (R$)",
    requerido: nunca,
    opcional: seComb(["terminacao"], ["pasto", "confinamento"]),
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 18_000,
      terminacao__confinamento: 150_000,
    },
  },
  {
    nome: "custo_mortalidade_estimada",
    label: "Mortalidade estimada (R$)",
    requerido: nunca,
    opcional: seComb(["terminacao"], ["pasto", "confinamento"]),
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao__pasto: 9_900,
      terminacao__confinamento: 52_500,
    },
  },
];

// ─── Helpers de busca/validação ────────────────────────────────

/** Aliases tolerantes pra parsing de `fase`. */
export const FASE_ALIAS: Record<string, Fase> = {
  cria: "cria",
  recria: "recria",
  terminacao: "terminacao",
  "terminação": "terminacao",
};

/** Aliases tolerantes pra parsing de `sistema`. */
export const SISTEMA_ALIAS: Record<string, Sistema> = {
  pasto: "pasto",
  semi: "semiconfinamento",
  semiconfinamento: "semiconfinamento",
  "semi-confinamento": "semiconfinamento",
  conf: "confinamento",
  confinamento: "confinamento",
};

export function camposAplicaveis(fase: Fase, sistema: Sistema): FieldDef[] {
  return CAMPOS.filter((c) => c.requerido(fase, sistema) || c.opcional(fase, sistema));
}

export function campoObrigatorio(campo: FieldDef, fase: Fase, sistema: Sistema): boolean {
  return campo.requerido(fase, sistema);
}

export function campoAplicavel(campo: FieldDef, fase: Fase, sistema: Sistema): boolean {
  return campo.requerido(fase, sistema) || campo.opcional(fase, sistema);
}
