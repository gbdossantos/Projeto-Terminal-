// Persistencia local de lotes calculados em /lotes — localStorage por enquanto.
// Quando houver auth + banco (Tarefa 6 seguinte), migrar para Supabase/Postgres.

import type {
  TerminacaoPastoRequest, ConfinamentoRequest, SemiconfinamentoRequest,
  CriaRequest, RecriaRequest,
  TerminacaoPastoResponse, ConfinamentoResponse, SemiconfinamentoResponse,
  CriaResponse, RecriaResponse,
} from "@/lib/types";
import type { SistemaProdutivo } from "@/lib/sistemas";

interface LoteSalvoBase {
  id: string;
  nome: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Margem percentual snapshot (0-1) — usado para listagem rapida. */
  margemPct: number | null;
}

export type LoteSalvo =
  | (LoteSalvoBase & {
      sistema: "terminacao_pasto";
      inputs: TerminacaoPastoRequest;
      resultadoCache: TerminacaoPastoResponse;
    })
  | (LoteSalvoBase & {
      sistema: "confinamento";
      inputs: ConfinamentoRequest;
      resultadoCache: ConfinamentoResponse;
    })
  | (LoteSalvoBase & {
      sistema: "semiconfinamento";
      inputs: SemiconfinamentoRequest;
      resultadoCache: SemiconfinamentoResponse;
    })
  | (LoteSalvoBase & {
      sistema: "cria";
      inputs: CriaRequest;
      resultadoCache: CriaResponse;
    })
  | (LoteSalvoBase & {
      sistema: "recria";
      inputs: RecriaRequest;
      resultadoCache: RecriaResponse;
    });

const STORAGE_KEY = "terminal_lotes";
const PENDING_LOAD_KEY = "terminal_pending_load_lote";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listLotes(): LoteSalvo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LoteSalvo[];
  } catch {
    return [];
  }
}

export function saveLote(
  data: Omit<LoteSalvo, "id" | "criadoEm" | "atualizadoEm">,
): LoteSalvo {
  const now = new Date().toISOString();
  const novo = {
    ...data,
    id: generateId(),
    criadoEm: now,
    atualizadoEm: now,
  } as LoteSalvo;
  const list = listLotes();
  list.unshift(novo);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota cheia ou modo privado — falha silenciosa
  }
  return novo;
}

export function deleteLote(id: string): void {
  if (typeof window === "undefined") return;
  const filtered = listLotes().filter((l) => l.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function getLote(id: string): LoteSalvo | null {
  return listLotes().find((l) => l.id === id) ?? null;
}

// ─── Pending load (mecanismo de carregar inputs em /lotes) ─────────

interface PendingLoad {
  sistema: SistemaProdutivo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any;
}

/** Marca um lote para ser carregado na proxima abertura do form. */
export function setPendingLoad(payload: PendingLoad): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_LOAD_KEY, JSON.stringify(payload));
  } catch {}
}

/**
 * Le e remove um pending load se for do sistema solicitado.
 * Cada form chama isso no mount com seu sistema.
 */
export function consumePendingLoad<T = unknown>(
  forSistema: SistemaProdutivo,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_LOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLoad;
    if (parsed.sistema !== forSistema) return null;
    localStorage.removeItem(PENDING_LOAD_KEY);
    return parsed.inputs as T;
  } catch {
    try { localStorage.removeItem(PENDING_LOAD_KEY); } catch {}
    return null;
  }
}
