// Persistência local de lotes calculados em /lotes (localStorage).
//
// Pós-refactor fase/sistema: cada LoteSalvo carrega `fase` + `sistema` como
// campos independentes, sempre vindos do payload tipado da API.
//
// Migração: lotes em formato antigo (sem `fase`/`sistema` no topo) são
// filtrados silenciosamente em `listLotes()` — sem banner, sem mensagem,
// sem tentativa de conversão. Quebra limpa conforme briefing GB.

import type {
  Fase, Sistema,
  LoteInput, LoteInputCria, LoteInputRecria, LoteInputTerminacao,
  LoteCriaResponse, LoteRecriaResponse, LoteTerminacaoResponse,
} from "@/lib/types";

interface LoteSalvoBase {
  id: string;
  nome: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Margem percentual snapshot (0-1) — null em cria/recria (sem margem/@). */
  margemPct: number | null;
  /** Fase + Sistema — top-level pra filtragem e exibição. */
  fase: Fase;
  sistema: Sistema;
}

export type LoteSalvo =
  | (LoteSalvoBase & {
      fase: "cria";
      inputs: LoteInputCria;
      resultadoCache: LoteCriaResponse;
    })
  | (LoteSalvoBase & {
      fase: "recria";
      inputs: LoteInputRecria;
      resultadoCache: LoteRecriaResponse;
    })
  | (LoteSalvoBase & {
      fase: "terminacao";
      inputs: LoteInputTerminacao;
      resultadoCache: LoteTerminacaoResponse;
    });

const STORAGE_KEY = "terminal_lotes";
const PENDING_LOAD_KEY = "terminal_pending_load_lote";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** True se o item tem o shape novo (fase + sistema no topo). */
function isLoteSalvoNovo(item: unknown): item is LoteSalvo {
  if (!item || typeof item !== "object") return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.fase === "string" &&
    typeof r.sistema === "string" &&
    typeof r.id === "string"
  );
}

export function listLotes(): LoteSalvo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filtra silenciosamente lotes do formato antigo (sem `fase`/`sistema`).
    return parsed.filter(isLoteSalvoNovo);
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
  } catch {
    // ignore
  }
}

export function getLote(id: string): LoteSalvo | null {
  return listLotes().find((l) => l.id === id) ?? null;
}

// ─── Pending load — usado quando o usuário "abre" um lote salvo ─────

interface PendingLoad {
  fase: Fase;
  sistema: Sistema;
  inputs: LoteInput;
}

export function setPendingLoad(payload: PendingLoad): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_LOAD_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Lê e remove um pending load se for da fase+sistema solicitados.
 * Cada form chama isso no mount com sua combinação.
 */
export function consumePendingLoad<T = LoteInput>(
  forFase: Fase,
  forSistema: Sistema,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_LOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLoad;
    if (parsed.fase !== forFase || parsed.sistema !== forSistema) return null;
    localStorage.removeItem(PENDING_LOAD_KEY);
    return parsed.inputs as T;
  } catch {
    try {
      localStorage.removeItem(PENDING_LOAD_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
