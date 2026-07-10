// Série temporal do gráfico "A linha do rebanho" (Home).
//
// Dados 100% reais: histórico CEPEA (passado), spot MS + curva BGI (projeção)
// e σ anualizado calculado no backend. Sem fallback mock — se os dados não
// chegam, o gráfico mostra estado indisponível em vez de inventar números.
//
// Conceito: cone de incerteza. Passado sólido até "hoje"; a partir daí a
// projeção corre pro vencimento do BGI alvo com bandas ±1σ/±2σ que abrem
// com √t (σ_t = σ_anualizado × √(dias/252) × preço esperado).

export interface PontoLinha {
  data: string;               // ISO yyyy-mm-dd
  realizado: number | null;   // série sólida (passado)
  esperado: number | null;    // série tracejada (centro do cone)
  sigma1_low: number | null;
  sigma1_high: number | null;
  sigma2_low: number | null;
  sigma2_high: number | null;
}

export interface LinhaInputs {
  /** σ anualizado (decimal) vindo do backend. Null → sem cone. */
  sigmaAnualizado: number | null;
  /** Histórico real de arroba (CEPEA), datas DD/MM/YYYY ou ISO. */
  historico: Array<{ data: string; valor: number }>;
  /** Spot MS atual em R$/@ (CEPEA SP + basis). */
  spotAtual: number | null;
  /** Contrato BGI alvo (mais distante da curva). */
  bgi: { vencimento: string; preco_ajuste: number } | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Gera a série do gráfico. Retorna [] quando não há dados reais suficientes
 * (histórico com <2 pontos) — o componente trata como "indisponível".
 */
export function gerarLinhaRebanho({
  sigmaAnualizado,
  historico,
  spotAtual,
  bgi,
}: LinhaInputs): PontoLinha[] {
  if (!historico || historico.length < 2) return [];

  const pontos: PontoLinha[] = [];
  const hojeISO = new Date().toISOString().slice(0, 10);

  // ── 1. PASSADO realizado (janela ~90 dias, ~30 amostras) ──
  const slice = historico.slice(-90);
  const desired = 30;
  const step = Math.max(1, Math.floor(slice.length / desired));
  for (let i = 0; i < slice.length; i += step) {
    const iso = parseDataCepea(slice[i].data);
    if (iso) {
      pontos.push({
        data: iso,
        realizado: slice[i].valor,
        esperado: null,
        sigma1_low: null,
        sigma1_high: null,
        sigma2_low: null,
        sigma2_high: null,
      });
    }
  }
  // Último ponto do realizado é "hoje" (spot atual quando disponível)
  const ultimo = slice[slice.length - 1];
  const ultimoIso = parseDataCepea(ultimo.data);
  if (ultimoIso !== hojeISO) {
    pontos.push({
      data: hojeISO,
      realizado: spotAtual ?? ultimo.valor,
      esperado: null,
      sigma1_low: null,
      sigma1_high: null,
      sigma2_low: null,
      sigma2_high: null,
    });
  }
  // Ordem cronológica garantida (histórico pode vir fora de ordem)
  pontos.sort((a, b) => a.data.localeCompare(b.data));

  // ── 2. PROJETADO (hoje → vencimento do BGI alvo) ──
  if (!bgi) return pontos;

  const dataHoje = new Date(hojeISO);
  const dataBGI = new Date(bgi.vencimento);
  if (dataBGI.getTime() <= dataHoje.getTime()) return pontos;

  const precoInicio = spotAtual ?? ultimo.valor;
  const precoBGI = bgi.preco_ajuste;
  const diasAteBGI = (dataBGI.getTime() - dataHoje.getTime()) / DIA_MS;

  // O último ponto realizado é também o ponto-zero da projeção: esperado =
  // realizado e bandas com largura zero, pra cone nascer colado no "hoje".
  const pontoHoje = pontos[pontos.length - 1];
  if (pontoHoje?.realizado != null) {
    pontoHoje.esperado = pontoHoje.realizado;
    pontoHoje.sigma1_low = pontoHoje.realizado;
    pontoHoje.sigma1_high = pontoHoje.realizado;
    pontoHoje.sigma2_low = pontoHoje.realizado;
    pontoHoje.sigma2_high = pontoHoje.realizado;
  }

  const passoMs = 7 * DIA_MS;
  for (let t = dataHoje.getTime() + passoMs; ; t += passoMs) {
    const tsFinal = Math.min(t, dataBGI.getTime());
    const dias = (tsFinal - dataHoje.getTime()) / DIA_MS;
    const frac = Math.min(1, dias / diasAteBGI);
    const esperado = precoInicio + (precoBGI - precoInicio) * frac;

    let sigma1_low: number | null = null;
    let sigma1_high: number | null = null;
    let sigma2_low: number | null = null;
    let sigma2_high: number | null = null;
    if (sigmaAnualizado != null && sigmaAnualizado > 0) {
      const sigmaT = sigmaAnualizado * Math.sqrt(dias / 252) * esperado;
      sigma1_low = esperado - sigmaT;
      sigma1_high = esperado + sigmaT;
      sigma2_low = esperado - 2 * sigmaT;
      sigma2_high = esperado + 2 * sigmaT;
    }

    pontos.push({
      data: new Date(tsFinal).toISOString().slice(0, 10),
      realizado: null,
      esperado,
      sigma1_low,
      sigma1_high,
      sigma2_low,
      sigma2_high,
    });

    if (tsFinal >= dataBGI.getTime()) break;
  }

  return pontos;
}

/**
 * CEPEA devolve datas "DD/MM/YYYY". Converte pra ISO (YYYY-MM-DD).
 * Retorna null se formato inesperado.
 */
export function parseDataCepea(s: string): string | null {
  if (!s) return null;
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return s;
  return null;
}

/** Formata número em pt-BR (sem prefixo R$ — o chamador compõe). */
export function fmtNum(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
