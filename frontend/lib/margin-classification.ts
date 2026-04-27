// Classificacao de margem unica para todas as paginas.
// Verde: margem > 15% · Ambar: 5% <= margem <= 15% · Vermelho: margem < 5%

export type MargemTier = "verde" | "amber" | "vermelho";

export interface MargemClassification {
  tier: MargemTier;
  label: string;
  color: string;       // cor principal (ring, dot)
  bg: string;          // background do badge
  textColor: string;   // cor do texto do badge
  borderColor: string; // borda do badge/banner
}

const VERDE: MargemClassification = {
  tier: "verde",
  label: "margem saudavel",
  color: "#4A5D3A",
  bg: "#4A5D3A18",
  textColor: "#6B8F5A",
  borderColor: "#4A5D3A44",
};

const AMBER: MargemClassification = {
  tier: "amber",
  label: "margem apertada",
  color: "#C89B3C",
  bg: "#C89B3C18",
  textColor: "#C89B3C",
  borderColor: "#C89B3C44",
};

const VERMELHO: MargemClassification = {
  tier: "vermelho",
  label: "margem critica",
  color: "#B54134",
  bg: "#B5413418",
  textColor: "#D4614A",
  borderColor: "#B5413444",
};

/**
 * Classifica margem em decimal (ex: 0.12 = 12%).
 * Limiares:
 * - Verde (saudavel): >= 15%
 * - Ambar (apertada): >= 5% e < 15%
 * - Vermelho (critica): < 5%
 */
export function classifyMargin(pct: number): MargemClassification {
  if (pct >= 0.15) return VERDE;
  if (pct >= 0.05) return AMBER;
  return VERMELHO;
}
