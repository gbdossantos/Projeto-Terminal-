// Rótulos secos compartilhados pelo /simulador.
import type { Fase, Sistema } from "@/lib/types";
import type { LoteSalvo } from "@/lib/lotes-storage";

/** Lote de terminação salvo — única fase aceita no simulador (hero em R$/@). */
export type LoteTerminacaoSalvo = Extract<LoteSalvo, { fase: "terminacao" }>;

const SISTEMA_LABEL: Record<Sistema, string> = {
  pasto: "Pasto",
  semiconfinamento: "Semi",
  confinamento: "Confinamento",
};

const FASE_LABEL: Record<Fase, string> = {
  cria: "Cria",
  recria: "Recria",
  terminacao: "Terminação",
};

/** "TERMINAÇÃO · PASTO" — prefixo seco do lote. */
export function faseSistemaLabel(fase: Fase, sistema: Sistema): string {
  return `${FASE_LABEL[fase]} · ${SISTEMA_LABEL[sistema]}`;
}
