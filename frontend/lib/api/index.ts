import type {
  LoteInput,
  LoteInputCria,
  LoteInputRecria,
  LoteInputTerminacao,
  LoteCalculoResponse,
  LoteCriaResponse,
  LoteRecriaResponse,
  LoteTerminacaoResponse,
  CotacaoMercado,
  CurvaFuturos,
  HistoricoDolarEntry,
  SimulatorRequest,
  SimulatorResponse,
  VolatilidadeArroba,
  NoticiasDoDiaResponse,
  SimuladorHistoricoResponse,
  SimuladorCustomResponse,
  SugerirColunasResponse,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchFuturos(): Promise<CurvaFuturos> {
  const res = await fetch(`${BASE}/futuros`);
  if (!res.ok) throw new Error(`Futuros: ${res.status}`);
  return res.json();
}

export async function fetchHistoricoDolar(dias = 30): Promise<HistoricoDolarEntry[]> {
  const res = await fetch(`${BASE}/historico-dolar?dias=${dias}`);
  if (!res.ok) throw new Error(`Histórico dólar: ${res.status}`);
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

/** Histórico do CDI anualizado (BCB SGS 4389), valores em % a.a. */
export async function fetchHistoricoCdi(dias = 30): Promise<HistoricoDolarEntry[]> {
  const res = await fetch(`${BASE}/historico-cdi?dias=${dias}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchCotacoes(): Promise<CotacaoMercado> {
  const res = await fetch(`${BASE}/cotacoes`);
  if (!res.ok) throw new Error(`Cotações: ${res.status}`);
  return res.json();
}

export async function fetchVolatilidadeArroba(janelaDias = 90): Promise<VolatilidadeArroba> {
  const res = await fetch(`${BASE}/volatilidade-arroba?janela_dias=${janelaDias}`);
  if (!res.ok) throw new Error(`Volatilidade arroba: ${res.status}`);
  return res.json();
}

export async function fetchNoticiasDoDia(): Promise<NoticiasDoDiaResponse> {
  const res = await fetch(`${BASE}/noticias-do-dia`);
  if (!res.ok) throw new Error(`Noticias do dia: ${res.status}`);
  return res.json();
}

// ============================================================================
// LOTES — endpoint único pós-refactor fase/sistema
// ============================================================================

/**
 * POST /lotes/calcular — endpoint único pra cálculo de lote.
 *
 * Backend discrimina o payload por `fase`. Retorno também é discriminado:
 *  - fase=cria        → LoteCriaResponse {resultado, cotacoes}
 *  - fase=recria      → LoteRecriaResponse {resultado, cotacoes}
 *  - fase=terminacao  → LoteTerminacaoResponse {resultado, exposicao, impacto, hedge?, cotacoes}
 *
 * Overloads dão narrowing automático no tipo de retorno conforme a fase
 * do input — não precisa de cast no consumidor.
 */
export async function calcularLote(input: LoteInputCria): Promise<LoteCriaResponse>;
export async function calcularLote(input: LoteInputRecria): Promise<LoteRecriaResponse>;
export async function calcularLote(input: LoteInputTerminacao): Promise<LoteTerminacaoResponse>;
export async function calcularLote(input: LoteInput): Promise<LoteCalculoResponse>;
export async function calcularLote(input: LoteInput): Promise<LoteCalculoResponse> {
  const res = await fetch(`${BASE}/lotes/calcular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro: ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// Simulador
// ============================================================================

export async function simularCenarios(req: SimulatorRequest): Promise<SimulatorResponse> {
  const res = await fetch(`${BASE}/simulador/calcular`, {
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

// ============================================================================
// Simulador histórico (redesign /simulador)
// ============================================================================
//
// Consome o engine refatorado (série multi-ano + presets + clima). Em falha
// sistêmica de fonte, o backend devolve erro tipado e estes fetchers fazem
// `throw` → a UI cai no estado de erro explícito (§10.6). Nunca fabricam número.

/** Presets históricos (4 temporais + 2 eventos) recomputados pro lote. */
export async function fetchSimuladorHistorico(
  inputs: LoteInputTerminacao,
): Promise<SimuladorHistoricoResponse> {
  const res = await fetch(`${BASE}/simulador/historico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Simulador histórico: ${res.status}`);
  }
  return res.json();
}

/** Situação custom — arroba + milho em valor absoluto, recomputada no engine. */
export async function fetchSimuladorCustom(
  inputs: LoteInputTerminacao,
  arroba: number,
  milho: number,
): Promise<SimuladorCustomResponse> {
  const res = await fetch(`${BASE}/simulador/historico/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, arroba, milho }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Simulador custom: ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// Import de lotes — sugestão de correspondência de colunas (LLM, Fase 2)
// ============================================================================

/**
 * Sugere campo canônico pra headers que não bateram exato no schema
 * (parser é determinístico — isso só cobre variação semântica: sinônimo,
 * abreviação, acento, ordem de palavra). Nunca aplica sozinho — o
 * chamador decide se usa a sugestão.
 *
 * Erro (chave ausente, rede, rate limit) → throw. Chamador cai de volta
 * pro aviso simples de headers desconhecidos, nunca trava o import.
 */
export async function sugerirColunas(
  headersDesconhecidos: string[],
  camposDisponiveis: { nome: string; label: string }[],
): Promise<SugerirColunasResponse> {
  const res = await fetch(`${BASE}/import-lotes/sugerir-colunas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      headers_desconhecidos: headersDesconhecidos,
      campos_disponiveis: camposDisponiveis,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Sugestão de colunas: ${res.status}`);
  }
  return res.json();
}
