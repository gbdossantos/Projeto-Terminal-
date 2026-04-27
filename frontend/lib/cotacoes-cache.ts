// Cache de cotacoes com fallback por sessao.
// Quando a API falha ou retorna campo null, recupera o ultimo valor valido
// observado na sessao com timestamp de quando foi cacheado.

import type { CotacaoMercado } from "@/lib/types";

type FieldName = "arroba_boi_gordo" | "dolar_ptax" | "milho_esalq" | "cdi_anual";

export type CotacaoFieldState = "fresh" | "stale" | "unavailable";

export interface CotacaoFieldStatus {
  value: number | null;
  state: CotacaoFieldState;
  lastUpdateIso: string | null;
}

interface CachedField {
  value: number;
  iso: string;
}

type CacheShape = Partial<Record<FieldName, CachedField>>;

const STORAGE_KEY = "terminal_cotacoes_cache";

function readCache(): CacheShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheShape;
  } catch {
    return {};
  }
}

function writeCache(c: CacheShape) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    // sessionStorage indisponivel (modo privado, quota cheia) — ignora silenciosamente
  }
}

/**
 * Persiste em sessionStorage todos os campos nao-nulos do snapshot atual.
 * Chamar sempre que receber cotacoes da API com sucesso.
 */
export function persistCotacoes(cotacoes: CotacaoMercado | null): void {
  if (!cotacoes) return;
  const cache = readCache();
  const iso = cotacoes.timestamp ?? new Date().toISOString();
  const fields: FieldName[] = ["arroba_boi_gordo", "dolar_ptax", "milho_esalq", "cdi_anual"];
  for (const f of fields) {
    const v = cotacoes[f];
    if (v != null && Number.isFinite(v)) {
      cache[f] = { value: v, iso };
    }
  }
  writeCache(cache);
}

/**
 * Resolve um campo aplicando a hierarquia: fresco -> cache -> indisponivel.
 * Use isso em vez de ler diretamente cotacoes.campo.
 */
export function resolveCotacao(
  field: FieldName,
  cotacoes: CotacaoMercado | null,
): CotacaoFieldStatus {
  const fresh = cotacoes?.[field];
  if (fresh != null && Number.isFinite(fresh)) {
    return {
      value: fresh,
      state: "fresh",
      lastUpdateIso: cotacoes?.timestamp ?? null,
    };
  }
  const cached = readCache()[field];
  if (cached) {
    return {
      value: cached.value,
      state: "stale",
      lastUpdateIso: cached.iso,
    };
  }
  return { value: null, state: "unavailable", lastUpdateIso: null };
}

/**
 * Converte um ISO timestamp em string relativa ("ha 12min", "ha 2h", "ha 3d").
 * Usada nos badges de timestamp.
 */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 30_000) return "agora ha pouco";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `ha ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `ha ${h}h`;
  const d = Math.floor(h / 24);
  return `ha ${d}d`;
}
