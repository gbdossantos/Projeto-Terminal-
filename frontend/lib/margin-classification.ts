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
  label: "margem saudável",
  color: "var(--gain)",
  bg: "rgba(22, 163, 74, 0.10)",
  textColor: "var(--gain-2)",
  borderColor: "rgba(22, 163, 74, 0.27)",
};

const AMBER: MargemClassification = {
  tier: "amber",
  label: "margem apertada",
  color: "var(--amber)",
  bg: "rgba(217, 119, 6, 0.10)",
  textColor: "var(--amber)",
  borderColor: "rgba(217, 119, 6, 0.27)",
};

const VERMELHO: MargemClassification = {
  tier: "vermelho",
  label: "margem crítica",
  color: "var(--loss)",
  bg: "rgba(220, 38, 38, 0.10)",
  textColor: "var(--loss-2)",
  borderColor: "rgba(220, 38, 38, 0.27)",
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
