// Lista canonica de sistemas produtivos.
// Fonte unica para /lotes (toggle), /simulador (filtrado), defaults e backend.
//
// IMPORTANTE: os IDs aqui devem espelhar os endpoints do backend
// (terminacao_pasto -> /api/terminacao-pasto/calcular, etc).
//
// Ciclo Completo intencionalmente fora — escopo separado, sera adicionado
// quando o engine do backend tiver o sistema modelado (cost_model_v2 + endpoint).

export interface SistemaProdutivoInfo {
  id: SistemaProdutivo;
  label: string;
  /** Sistema faz sentido conceitual no /simulador (stress test boi+milho+dolar)? */
  availableInSimulator: boolean;
}

export const SISTEMAS_PRODUTIVOS = [
  {
    id: "terminacao_pasto",
    label: "Terminacao pasto",
    availableInSimulator: true,
  },
  {
    id: "confinamento",
    label: "Confinamento",
    availableInSimulator: true,
  },
  {
    id: "semiconfinamento",
    label: "Semiconfinamento",
    availableInSimulator: true,
  },
  {
    id: "cria",
    label: "Cria",
    availableInSimulator: false, // produz bezerros, nao arrobas
  },
  {
    id: "recria",
    label: "Recria",
    availableInSimulator: false, // ganho de peso (kg), nao arrobas para venda
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  availableInSimulator: boolean;
}>;

export type SistemaProdutivo = (typeof SISTEMAS_PRODUTIVOS)[number]["id"];

/** Subset usado pelo /simulador (so faz sentido para sistemas de terminacao). */
export const SISTEMAS_SIMULADOR: ReadonlyArray<SistemaProdutivoInfo> =
  SISTEMAS_PRODUTIVOS.filter((s) => s.availableInSimulator);
