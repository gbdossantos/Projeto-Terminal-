// Persistência de lotes calculados em /lotes — Supabase (`lotes`), RLS scoped
// por auth.uid() = user_id.
//
// `PendingLoad` continua em localStorage: é só um buffer efêmero pra passar
// dados entre páginas no mesmo navegador (não é dado de usuário que precise
// de RLS ou sincronizar entre dispositivos).

import { createClient } from "@/lib/supabase/client";
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

interface LoteRow {
  id: string;
  nome: string;
  fase: Fase;
  sistema: Sistema;
  margem_pct: number | null;
  inputs: LoteInput;
  resultado_cache: unknown;
  criado_em: string;
  atualizado_em: string;
}

function rowToLoteSalvo(row: LoteRow): LoteSalvo {
  return {
    id: row.id,
    nome: row.nome,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    margemPct: row.margem_pct,
    fase: row.fase,
    sistema: row.sistema,
    inputs: row.inputs,
    resultadoCache: row.resultado_cache,
  } as LoteSalvo;
}

const PENDING_LOAD_KEY = "terminal_pending_load_lote";

export async function listLotes(): Promise<LoteSalvo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lotes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error || !data) return [];
  return (data as LoteRow[]).map(rowToLoteSalvo);
}

export async function saveLote(
  data: Omit<LoteSalvo, "id" | "criadoEm" | "atualizadoEm">,
): Promise<LoteSalvo | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: inserted, error } = await supabase
    .from("lotes")
    .insert({
      user_id: user.id,
      nome: data.nome,
      fase: data.fase,
      sistema: data.sistema,
      margem_pct: data.margemPct,
      inputs: data.inputs,
      resultado_cache: data.resultadoCache,
    })
    .select("*")
    .single();

  if (error || !inserted) return null;
  return rowToLoteSalvo(inserted as LoteRow);
}

export async function deleteLote(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("lotes").delete().eq("id", id);
}

export async function getLote(id: string): Promise<LoteSalvo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lotes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToLoteSalvo(data as LoteRow);
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
