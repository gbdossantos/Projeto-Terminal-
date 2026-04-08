import type {
  TerminacaoPastoRequest, TerminacaoPastoResponse,
  ConfinamentoRequest, ConfinamentoResponse,
  SemiconfinamentoRequest, SemiconfinamentoResponse,
  CriaRequest, CriaResponse,
  RecriaRequest, RecriaResponse,
  CotacaoMercado,
  CurvaFuturos,
  HistoricoDolarEntry,
  SimulatorRequest,
  SimulatorResponse,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchFuturos(): Promise<CurvaFuturos> {
  const res = await fetch(`${BASE}/futuros`);
  if (!res.ok) throw new Error(`Futuros: ${res.status}`);
  return res.json();
}

export async function fetchHistoricoDolar(dias = 30): Promise<HistoricoDolarEntry[]> {
  const res = await fetch(`${BASE}/historico-dolar?dias=${dias}`);
  if (!res.ok) throw new Error(`Historico dolar: ${res.status}`);
  return res.json();
}

export async function fetchHistoricoArroba(): Promise<HistoricoDolarEntry[]> {
  const res = await fetch(`${BASE}/historico-arroba`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchHistoricoMilho(): Promise<HistoricoDolarEntry[]> {
  const res = await fetch(`${BASE}/historico-milho`);
  if (!res.ok) return [];
  return res.json();
}

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

async function postCalc<Req, Res>(path: string, req: Req): Promise<Res> {
  const res = await fetch(`${BASE}/${path}`, {
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

export function calcularConfinamento(req: ConfinamentoRequest) {
  return postCalc<ConfinamentoRequest, ConfinamentoResponse>("confinamento/calcular", req);
}

export function calcularSemiconfinamento(req: SemiconfinamentoRequest) {
  return postCalc<SemiconfinamentoRequest, SemiconfinamentoResponse>("semiconfinamento/calcular", req);
}

export function calcularCria(req: CriaRequest) {
  return postCalc<CriaRequest, CriaResponse>("cria/calcular", req);
}

export function calcularRecria(req: RecriaRequest) {
  return postCalc<RecriaRequest, RecriaResponse>("recria/calcular", req);
}

export function simularCenarios(req: SimulatorRequest) {
  return postCalc<SimulatorRequest, SimulatorResponse>("simulador/calcular", req);
}
