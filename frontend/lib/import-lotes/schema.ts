/**
 * Schema de import de lotes — single source of truth.
 *
 * Cada FieldDef descreve um campo do template:
 *  - nome canônico (coluna no CSV/XLSX, em snake_case PT)
 *  - label humano pra mostrar em erro/header (PT, com unidade)
 *  - sistemas em que se aplica
 *  - obrigatório vs opcional
 *  - tipo (number/string/enum) + range válido
 *
 * Usado por:
 *  - template.ts: gera cabeçalho + linhas-exemplo
 *  - parse.ts: ordem das colunas
 *  - validate.ts: regras por célula
 *
 * IMPORTANTE: refletir exatamente os campos dos forms de /lotes
 * (FormPasto.tsx, FormConfinamento.tsx, etc). Nada além, nada a menos.
 */

import type { SistemaProdutivo } from "@/lib/sistemas";

export type SistemaImport = SistemaProdutivo; // alias pra clareza

export type FieldType = "number" | "percent" | "string" | "sistema";

export interface FieldDef {
  /** Nome da coluna no CSV/XLSX (snake_case, sem acento). */
  nome: string;
  /** Label humano + unidade (mostrar em erro). */
  label: string;
  /** Sistemas em que o campo é OBRIGATÓRIO. */
  requeridoEm: SistemaImport[];
  /** Sistemas em que o campo é OPCIONAL. */
  opcionalEm: SistemaImport[];
  /** Tipo pra validação/parse. */
  tipo: FieldType;
  /** Range válido (inclusive). number/percent. */
  min?: number;
  max?: number;
  /** Sugestão pra linha-exemplo do template. */
  exemplo?: Record<SistemaImport, number | string | undefined>;
}

const TODOS: SistemaImport[] = [
  "terminacao_pasto",
  "confinamento",
  "semiconfinamento",
  "cria",
  "recria",
];

const TERMINACAO: SistemaImport[] = ["terminacao_pasto", "confinamento", "semiconfinamento"];
const COM_REPOSICAO: SistemaImport[] = ["terminacao_pasto", "confinamento", "semiconfinamento"];

/**
 * Lista canônica de campos. A ordem aqui é a ordem das colunas no template.
 * Identidade vem primeiro (nome, sistema), depois animais/peso, depois custos.
 */
export const CAMPOS: FieldDef[] = [
  // ─── Identidade ───────────────────────────────────────────────
  {
    nome: "nome_lote",
    label: "Nome do lote",
    requeridoEm: TODOS,
    opcionalEm: [],
    tipo: "string",
    exemplo: {
      terminacao_pasto: "Pasto Norte 26",
      confinamento: "Confina A 26",
      semiconfinamento: "Semi B 26",
      cria: "Cria matrizes 26",
      recria: "Recria 26",
    },
  },
  {
    nome: "sistema_produtivo",
    label: "Sistema produtivo",
    requeridoEm: TODOS,
    opcionalEm: [],
    tipo: "sistema",
    exemplo: {
      terminacao_pasto: "terminacao_pasto",
      confinamento: "confinamento",
      semiconfinamento: "semiconfinamento",
      cria: "cria",
      recria: "recria",
    },
  },

  // ─── Animais / peso ───────────────────────────────────────────
  {
    nome: "num_animais",
    label: "Animais (cab)",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 1,
    max: 100_000,
    exemplo: {
      terminacao_pasto: 200,
      confinamento: 1_500,
      semiconfinamento: 500,
      cria: undefined,
      recria: 800,
    },
  },
  {
    nome: "num_matrizes",
    label: "Matrizes (cab)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 1,
    max: 100_000,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 500,
      recria: undefined,
    },
  },
  {
    nome: "peso_entrada_kg",
    label: "Peso entrada (kg)",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 50,
    max: 800,
    exemplo: {
      terminacao_pasto: 380,
      confinamento: 380,
      semiconfinamento: 380,
      cria: undefined,
      recria: 220,
    },
  },
  {
    nome: "peso_saida_estimado_kg",
    label: "Peso saída (kg)",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 100,
    max: 900,
    exemplo: {
      terminacao_pasto: 510,
      confinamento: 540,
      semiconfinamento: 520,
      cria: undefined,
      recria: 380,
    },
  },
  {
    nome: "dias_ciclo",
    label: "Dias de ciclo",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 30,
    max: 1095, // 3 anos
    exemplo: {
      terminacao_pasto: 180,
      confinamento: 100,
      semiconfinamento: 130,
      cria: undefined,
      recria: 365,
    },
  },
  {
    nome: "rendimento_carcaca",
    label: "Rendimento carcaça (fração 0–1)",
    requeridoEm: [],
    opcionalEm: TERMINACAO,
    tipo: "percent",
    min: 0.4,
    max: 0.6,
    exemplo: {
      terminacao_pasto: 0.52,
      confinamento: 0.54,
      semiconfinamento: 0.53,
      cria: undefined,
      recria: undefined,
    },
  },

  // ─── Custos / preço (terminação/confinamento/semi) ────────────
  {
    nome: "custo_reposicao_total",
    label: "Custo reposição total (R$)",
    requeridoEm: COM_REPOSICAO,
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 660_000,
      confinamento: 5_250_000,
      semiconfinamento: 1_650_000,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_suplementacao_dia",
    label: "Custo suplementação (R$/cab/dia)",
    requeridoEm: ["terminacao_pasto"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 2.8,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_arrendamento_dia",
    label: "Custo arrendamento (R$/cab/dia)",
    requeridoEm: ["terminacao_pasto", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 0.55,
      confinamento: undefined,
      semiconfinamento: 0.55,
      cria: undefined,
      recria: 0.55,
    },
  },
  {
    nome: "custo_sanidade_dia",
    label: "Custo sanidade (R$/cab/dia)",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 0.2,
      confinamento: 0.4,
      semiconfinamento: 0.25,
      cria: undefined,
      recria: 0.15,
    },
  },
  {
    nome: "custo_mao_obra_dia",
    label: "Custo mão de obra (R$/cab/dia)",
    requeridoEm: ["terminacao_pasto", "confinamento", "semiconfinamento", "recria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 0.6,
      confinamento: 0.8,
      semiconfinamento: 0.7,
      cria: undefined,
      recria: 0.5,
    },
  },
  {
    nome: "outros_custos_dia",
    label: "Outros custos (R$/cab/dia)",
    requeridoEm: [],
    opcionalEm: ["terminacao_pasto", "recria"],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 0.4,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: undefined,
      recria: 0.3,
    },
  },
  // ─── Confinamento específico ──────────────────────────────────
  {
    nome: "consumo_ms_pct_pv",
    label: "Consumo MS (% PV, fração)",
    requeridoEm: ["confinamento"],
    opcionalEm: [],
    tipo: "percent",
    min: 0.005,
    max: 0.05,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: 0.022,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_dieta_kg_ms",
    label: "Custo dieta (R$/kg MS)",
    requeridoEm: ["confinamento"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: 1.1,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_instalacoes_dia",
    label: "Custo instalações (R$/cab/dia)",
    requeridoEm: ["confinamento"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: 1.2,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },

  // ─── Semi específico ──────────────────────────────────────────
  {
    nome: "custo_manutencao_pasto_dia",
    label: "Custo manutenção pasto (R$/cab/dia)",
    requeridoEm: ["semiconfinamento"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: 0.3,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "consumo_suplemento_kg_dia",
    label: "Consumo suplemento (kg/cab/dia)",
    requeridoEm: ["semiconfinamento"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: 4,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_suplemento_kg",
    label: "Custo suplemento (R$/kg)",
    requeridoEm: ["semiconfinamento"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: 1.3,
      cria: undefined,
      recria: undefined,
    },
  },

  // ─── Recria específico ────────────────────────────────────────
  {
    nome: "custo_aquisicao_total",
    label: "Custo aquisição total (R$)",
    requeridoEm: ["recria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: undefined,
      recria: 2_160_000,
    },
  },
  {
    nome: "custo_nutricao_dia",
    label: "Custo nutrição (R$/cab/dia)",
    requeridoEm: ["recria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: undefined,
      recria: 1.3,
    },
  },

  // ─── Cria específico ──────────────────────────────────────────
  {
    nome: "taxa_natalidade",
    label: "Taxa natalidade (fração 0–1)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "percent",
    min: 0.3,
    max: 1.0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 0.78,
      recria: undefined,
    },
  },
  {
    nome: "taxa_desmama",
    label: "Taxa desmama (fração 0–1)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "percent",
    min: 0.5,
    max: 1.0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 0.95,
      recria: undefined,
    },
  },
  {
    nome: "peso_desmama_kg",
    label: "Peso desmama (kg)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 80,
    max: 350,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 200,
      recria: undefined,
    },
  },
  {
    nome: "valor_matriz",
    label: "Valor da matriz (R$)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 4_500,
      recria: undefined,
    },
  },
  {
    nome: "custo_nutricao_ua_ano",
    label: "Custo nutrição (R$/UA/ano)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 480,
      recria: undefined,
    },
  },
  {
    nome: "custo_sanidade_ua_ano",
    label: "Custo sanidade (R$/UA/ano)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 80,
      recria: undefined,
    },
  },
  {
    nome: "custo_reproducao_ua_ano",
    label: "Custo reprodução (R$/UA/ano)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 150,
      recria: undefined,
    },
  },
  {
    nome: "custo_mao_obra_ua_ano",
    label: "Custo mão de obra (R$/UA/ano)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 220,
      recria: undefined,
    },
  },
  {
    nome: "custo_arrendamento_ua_ano",
    label: "Custo arrendamento (R$/UA/ano)",
    requeridoEm: ["cria"],
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 600,
      recria: undefined,
    },
  },
  {
    nome: "outros_custos_ua_ano",
    label: "Outros custos (R$/UA/ano)",
    requeridoEm: [],
    opcionalEm: ["cria"],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: undefined,
      confinamento: undefined,
      semiconfinamento: undefined,
      cria: 180,
      recria: undefined,
    },
  },

  // ─── Preço & fretes (terminação/conf/semi) ────────────────────
  {
    nome: "preco_venda",
    label: "Cotação arroba (R$/@)",
    requeridoEm: TERMINACAO,
    opcionalEm: [],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 315,
      confinamento: 315,
      semiconfinamento: 315,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_frete_entrada",
    label: "Frete entrada (R$)",
    requeridoEm: [],
    opcionalEm: ["terminacao_pasto", "confinamento"],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 16_000,
      confinamento: 135_000,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_frete_saida",
    label: "Frete saída (R$)",
    requeridoEm: [],
    opcionalEm: ["terminacao_pasto", "confinamento"],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 18_000,
      confinamento: 150_000,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
  {
    nome: "custo_mortalidade_estimada",
    label: "Mortalidade estimada (R$)",
    requeridoEm: [],
    opcionalEm: ["terminacao_pasto", "confinamento"],
    tipo: "number",
    min: 0,
    exemplo: {
      terminacao_pasto: 9_900,
      confinamento: 52_500,
      semiconfinamento: undefined,
      cria: undefined,
      recria: undefined,
    },
  },
];

/** Aliases pra sistema_produtivo — tolerância a typo/sinonimia. */
export const SISTEMA_ALIAS: Record<string, SistemaImport> = {
  "terminacao_pasto": "terminacao_pasto",
  "terminacao": "terminacao_pasto",
  "pasto": "terminacao_pasto",
  "terminacao pasto": "terminacao_pasto",
  "terminação pasto": "terminacao_pasto",
  "terminação_pasto": "terminacao_pasto",
  "confinamento": "confinamento",
  "conf": "confinamento",
  "semiconfinamento": "semiconfinamento",
  "semi": "semiconfinamento",
  "semi-confinamento": "semiconfinamento",
  "cria": "cria",
  "recria": "recria",
};

/** Retorna os campos aplicáveis (obrigatórios + opcionais) para um sistema. */
export function camposDoSistema(sistema: SistemaImport): FieldDef[] {
  return CAMPOS.filter(
    (c) => c.requeridoEm.includes(sistema) || c.opcionalEm.includes(sistema),
  );
}

/** True se o campo é aplicável a esse sistema (qualquer dos dois conjuntos). */
export function campoAplicavel(campo: FieldDef, sistema: SistemaImport): boolean {
  return campo.requeridoEm.includes(sistema) || campo.opcionalEm.includes(sistema);
}

/** True se o campo é obrigatório no sistema. */
export function campoObrigatorio(campo: FieldDef, sistema: SistemaImport): boolean {
  return campo.requeridoEm.includes(sistema);
}
