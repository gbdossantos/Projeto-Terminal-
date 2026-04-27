// Controla a primeira visita ao /lotes para mostrar o lote-exemplo.

const KEY = "terminal_first_visit_done";

/**
 * Retorna true se o usuario nunca completou o fluxo de exemplo.
 * Sempre false em SSR (sem window).
 */
export function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

/**
 * Marca a flag de primeira visita como concluida.
 * Chamar quando o usuario interage (edita um campo ou clica "comece do zero").
 */
export function markFirstVisitDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // localStorage indisponivel (modo privado, quota cheia) — ignora
  }
}
