// Persistencia local das decisoes simuladas no /simulador.
// Quando auth + banco entrarem, migra para tabela `decisoes` no Postgres.
//
// Schema desenhado para virar dado estrategico (intencao de hedge × cenario
// vs resultado real depois). Por isso captura: lote, % hedge, cenario simulado,
// preco travado de referencia, e intencao do usuario (travaria sim/nao).

const STORAGE_KEY = "terminal_decisoes_simulador";

export type IntencaoHedge = "travaria" | "nao_travaria" | null;

export interface DecisaoSimulador {
  id: string;
  lote_id: string;
  lote_nome: string;
  hedge_pct: number;           // 0..1 (fracao travada simulada)
  cenario_arroba: number;      // R$/@ que o usuario simulou
  preco_travado: number;       // R$/@ do BGI − basis no momento do registro
  intencao: IntencaoHedge;     // o que ele faria se fosse decidir agora
  criado_em: string;           // ISO timestamp
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listDecisoes(): DecisaoSimulador[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DecisaoSimulador[];
  } catch {
    return [];
  }
}

export function saveDecisao(
  data: Omit<DecisaoSimulador, "id" | "criado_em">,
): DecisaoSimulador {
  const nova: DecisaoSimulador = {
    ...data,
    id: generateId(),
    criado_em: new Date().toISOString(),
  };
  const list = listDecisoes();
  list.unshift(nova);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota cheia ou modo privado — falha silenciosa
  }
  return nova;
}

export function deleteDecisao(id: string): void {
  if (typeof window === "undefined") return;
  const filtered = listDecisoes().filter((d) => d.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}
