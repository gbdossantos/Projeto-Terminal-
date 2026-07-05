/**
 * Perfil do produtor + fazenda — persistido em localStorage.
 *
 * Fonte única do estado do usuário. Quando auth/banco chegar, migra para API
 * mantendo a interface FarmProfile + funções get/save.
 *
 * Hook reativo: useProfile() em "@/lib/use-profile".
 */

export interface FarmProfile {
  // ── Perfil ────────────────────────────────────────────────────
  nome_produtor: string;
  nome_fazenda: string;

  // ── Localização ──────────────────────────────────────────────
  estado: string;            // UF (MS, MT, SP, ...)
  municipio: string;
  basis_valor: number;       // R$/@ — desconto local sobre o BGI

  // ── Operação ─────────────────────────────────────────────────
  break_even_medio: number;  // R$/@
  mortalidade_hist: number;  // decimal (0.02 = 2%)

  // ── Aparência ────────────────────────────────────────────────
  theme: "light" | "dark" | "auto";
  densidade: "compacto" | "normal";

  // ── Legados (compat com /configuracoes antigo) ───────────────
  area_hectares: number;
  sistemas_produtivos: string[];
  faturamento_estimado: string;
  regiao_basis: string;
  moeda_display: string;
}

const STORAGE_KEY = "terminal_farm_profile";

// Defaults — Fazenda Santa Luzia / Guilherme Barreto / Três Lagoas-MS.
// Substituidos quando o usuário editar em /configuracoes.
export const DEFAULT_PROFILE: FarmProfile = {
  nome_produtor: "Guilherme Barreto",
  nome_fazenda: "Fazenda Santa Luzia",
  estado: "MS",
  municipio: "Três Lagoas",
  basis_valor: -5,
  break_even_medio: 286.50,
  mortalidade_hist: 0.02,
  theme: "light",
  densidade: "normal",
  // Legados (mantém compat com /configuracoes antigo)
  area_hectares: 0,
  sistemas_produtivos: ["terminacao_pasto"],
  faturamento_estimado: "",
  regiao_basis: "MS",
  moeda_display: "BRL",
};

export function getProfile(): FarmProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
  } catch {
    // corrupted
  }
  return DEFAULT_PROFILE;
}

const CHANGE_EVENT = "terminal:profile-changed";

export function saveProfile(profile: FarmProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    // Notifica todos os hooks useProfile() no mesmo tab (storage event
    // não dispara na própria janela que escreveu — só em outras tabs).
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // quota cheia ou modo privado — ignora
  }
}

export function hasProfile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const p = JSON.parse(stored);
      return Boolean(p.nome_fazenda);
    }
  } catch {
    // ignore
  }
  return false;
}

// ── Tabelas auxiliares ──────────────────────────────────────────

export const ESTADOS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export const FAIXAS_FATURAMENTO = [
  { value: "ate_15m", label: "Até R$ 15M" },
  { value: "15m_40m", label: "R$ 15M — R$ 40M" },
  { value: "40m_80m", label: "R$ 40M — R$ 80M" },
  { value: "acima_80m", label: "Acima de R$ 80M" },
];

/**
 * Basis padrão sugerido por estado (R$/@). Valores negativos = desconto
 * sobre o BGI. Quando o usuário trocar de estado em /configuracoes, o
 * basis_valor é pré-preenchido com este — mas continua editável manualmente
 * porque cada operação tem basis específico (distância de frigorífico, etc.).
 */
export const BASIS_VALOR_POR_ESTADO: Record<string, number> = {
  MS: -5,
  MT: -10,
  GO: -7,
  MG: -3,
  PA: -15,
  TO: -12,
  RO: -15,
  SP: 0,
  // Estados sem basis específico → default 0 (editável)
};

// Legado (compat com código antigo que referenciava BASIS_POR_ESTADO string)
export const BASIS_POR_ESTADO: Record<string, string> = {
  SP: "SP", MG: "MG", MS: "MS", GO: "GO", MT: "MT",
  PA: "PA", TO: "TO", RO: "RO",
  PR: "SP", RS: "SP", SC: "SP", RJ: "SP", ES: "MG",
  BA: "MG", MA: "PA", PI: "PA", CE: "PA", RN: "PA",
  PB: "PA", PE: "PA", AL: "PA", SE: "PA",
  AC: "RO", AM: "PA", RR: "PA", AP: "PA", DF: "GO",
};
