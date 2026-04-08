/**
 * Perfil da fazenda — persistido em localStorage.
 * Quando tiver auth/banco, migra para API sem mudar a interface.
 */

export interface FarmProfile {
  // Identificacao
  nome_fazenda: string;
  nome_produtor: string;
  estado: string;
  municipio: string;

  // Operacao
  area_hectares: number;
  sistemas_produtivos: string[];  // ["pasto", "confinamento", "semi", "cria", "recria"]
  faturamento_estimado: string;   // "ate_15m", "15m_40m", "40m_80m", "acima_80m"

  // Preferencias
  regiao_basis: string;           // "SP", "MS", "MT", etc — define basis default
  moeda_display: string;          // "BRL" (futuro: USD)
  theme: string;                  // "dark", "light"
}

const STORAGE_KEY = "terminal_farm_profile";

const DEFAULT_PROFILE: FarmProfile = {
  nome_fazenda: "",
  nome_produtor: "",
  estado: "MS",
  municipio: "",
  area_hectares: 0,
  sistemas_produtivos: ["pasto"],
  faturamento_estimado: "",
  regiao_basis: "MS",
  moeda_display: "BRL",
  theme: "dark",
};

export function getProfile(): FarmProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
  } catch {
    // corrupted storage
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: FarmProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage full or blocked
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

export const ESTADOS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export const FAIXAS_FATURAMENTO = [
  { value: "ate_15m", label: "Ate R$ 15M" },
  { value: "15m_40m", label: "R$ 15M — R$ 40M" },
  { value: "40m_80m", label: "R$ 40M — R$ 80M" },
  { value: "acima_80m", label: "Acima de R$ 80M" },
];

export const SISTEMAS_OPCOES = [
  { value: "pasto", label: "Terminacao pasto" },
  { value: "confinamento", label: "Confinamento" },
  { value: "semi", label: "Semiconfinamento" },
  { value: "cria", label: "Cria" },
  { value: "recria", label: "Recria" },
];

export const BASIS_POR_ESTADO: Record<string, string> = {
  SP: "SP", MG: "MG", MS: "MS", GO: "GO", MT: "MT",
  PA: "PA", TO: "TO", RO: "RO",
  // Estados sem basis especifico → mais proximo
  PR: "SP", RS: "SP", SC: "SP", RJ: "SP", ES: "MG",
  BA: "MG", MA: "PA", PI: "PA", CE: "PA", RN: "PA",
  PB: "PA", PE: "PA", AL: "PA", SE: "PA",
  AC: "RO", AM: "PA", RR: "PA", AP: "PA", DF: "GO",
};
