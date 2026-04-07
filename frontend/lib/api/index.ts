import type {
  TerminacaoPastoRequest,
  TerminacaoPastoResponse,
  CotacaoMercado,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchCotacoes(): Promise<CotacaoMercado> {
  const res = await fetch(`${BASE}/cotacoes`);
  if (!res.ok) throw new Error(`Cotacoes: ${res.status}`);
  return res.json();
}

export async function calcularTerminacaoPasto(
  req: TerminacaoPastoRequest
): Promise<TerminacaoPastoResponse> {
  const res = await fetch(`${BASE}/terminacao-pasto/calcular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro: ${res.status}`);
  }
  return res.json();
}
