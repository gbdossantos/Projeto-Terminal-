// Dados de exemplo do protótipo Home + Simulador.
// Em produção (com auth), tudo isso vem do usuário logado e do banco.
//
// REGRA: fonte única. Home, Simulador e qualquer tela futura
// que precise destes dados consomem deste módulo. Não duplicar.
//
// Se um número aqui mudar, ele tem que mudar em todas as telas
// automaticamente. Se duas telas estão divergindo, é bug — não
// recopiou o valor pra outro lugar.

// ── Usuário ──────────────────────────────────────────────────────
export const MOCK_USUARIO = {
  nome: "Guilherme Barreto",
};

// ── Fazenda ─────────────────────────────────────────────────────
export const MOCK_FAZENDA = {
  nome: "Fazenda Santa Luzia",
  municipio: "Três Lagoas",
  estado: "MS",
} as const;

// ── Lotes ───────────────────────────────────────────────────────
// data_saida em ISO yyyy-mm-dd. arrobas_totais = num_animais × arrobas_por_cabeca
// (sem arredondamento — usar valores exatos pra fechar a soma)
export interface MockLote {
  id: string;
  nome: string;
  num_animais: number;
  arrobas_por_cabeca: number;
  arrobas_totais: number;
  data_saida: string; // ISO yyyy-mm-dd
}

export const MOCK_LOTES: MockLote[] = [
  {
    id: "marimbondo",
    nome: "Marimbondo",
    num_animais: 1480,
    arrobas_por_cabeca: 18.5,
    arrobas_totais: 27380, // 1480 × 18.5 exato
    data_saida: "2026-08-22",
  },
  {
    id: "cabeceira",
    nome: "Cabeceira",
    num_animais: 600,
    arrobas_por_cabeca: 17.5,
    arrobas_totais: 10500, // 600 × 17.5 exato
    data_saida: "2026-07-28",
  },
  {
    id: "sede-do-brejo",
    nome: "Sede do Brejo",
    num_animais: 220,
    arrobas_por_cabeca: 17.8,
    arrobas_totais: 3916, // 220 × 17.8 exato
    data_saida: "2026-08-18",
  },
];

// Total agregado — deve casar com a soma. Verificação em tempo de execução
// abaixo previne divergência silenciosa entre telas.
export const MOCK_TOTAL_ARROBAS = MOCK_LOTES.reduce(
  (acc, l) => acc + l.arrobas_totais,
  0,
);
// 27380 + 10500 + 3916 = 41796 — mesmo número impresso na Home.

export const MOCK_TOTAL_CABECAS = MOCK_LOTES.reduce(
  (acc, l) => acc + l.num_animais,
  0,
);
// 1480 + 600 + 220 = 2300

// ── Mercado (cotação de referência do prototipo) ────────────────
// Substituido por fetch real quando endpoint estiver vivo —
// estes valores espelham o snapshot do mockup (19 mai/26).
export const MOCK_MERCADO = {
  arroba_ms_spot: 318.00,       // R$/@ spot em MS
  bgi_q26_ago: 322.00,          // R$/@ futuro BGIQ26 ago/26
  basis_ms: -5.00,              // R$/@ desconto MS vs SP
  delta_dia: -2.10,             // R$/@ variação do dia
  break_even: 286.50,           // R$/@ break-even do rebanho
  data_referencia: "2026-05-19",
} as const;

// preço travado se o produtor vender BGI hoje (mesma fórmula em todas as telas)
export const MOCK_PRECO_TRAVADO =
  MOCK_MERCADO.bgi_q26_ago + MOCK_MERCADO.basis_ms;
// 322 + (-5) = 317 R$/@

// ── "O que moveu a linha hoje" ──────────────────────────────────
// PLACEHOLDER — motor de atribuição (parsing de notícia + correlação
// com variação do dia + propagação por lote) está em escopo futuro.
// Estes 3 eventos são exemplos didáticos para validar o desenho da Home.
// Quando o motor existir, ele substitui esta lista por dados reais.
//
// impacto_arroba: R$/@ de variação atribuída ao evento (sinal: + ganho, − perda)
// impacto_total: impacto_arroba × MOCK_TOTAL_ARROBAS (em R$)
export interface MockEvento {
  titulo: string;
  fonte: string;          // "Secex · 19/mai"
  detalhe: string;        // microcopy curta
  impacto_arroba: number; // R$/@ — pode ser 0
  impacto_total: number;  // R$ no rebanho
  tipo: "negativo" | "positivo" | "neutro";
}

export const MOCK_EVENTOS_DIA: MockEvento[] = [
  {
    titulo: "Demanda chinesa recua",
    fonte: "Secex · 19/mai",
    detalhe: "Embarques de boi vivo para China caem 4% na semana",
    impacto_arroba: -1.40,
    impacto_total: -58514, // -1.40 × 41796 = -58514.4 (arredondado pra inteiro)
    tipo: "negativo",
  },
  {
    titulo: "Dólar fecha em R$ 5,42",
    fonte: "PTAX · 19/mai",
    detalhe: "Real ganha 0,8% no dia · pressão sobre exportador",
    impacto_arroba: -0.70,
    impacto_total: -29257, // -0.70 × 41796 = -29257.2
    tipo: "negativo",
  },
  {
    titulo: "Confinamento Centro-Oeste +6%",
    fonte: "Assocon · 19/mai",
    detalhe: "Anuário Assocon · projeção de oferta jul-set",
    impacto_arroba: 0,
    impacto_total: 0,
    tipo: "neutro",
  },
];

// ── Helper de formato ───────────────────────────────────────────
export function fmtBRL(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtData(iso: string): string {
  const [, m, d] = iso.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]}/26`;
}

// ── Linha do tempo do rebanho ───────────────────────────────────
// Serie temporal para o grafico "A LINHA": passado realizado (sólido)
// + projetado curva BGI (tracejado) + bandas ±1σ e ±2σ.
//
// Datas em ISO; valores em R$/@.
// Passado: mock determinístico (mesmos valores a cada render, sem random).
// Projetado: interpolação linear entre spot e BGIQ26 (Q4 do plano: interpolar contratos).
// Bandas σ: expansão temporal proporcional a √(t_dias / 252) × σ_anualizado × preço.
export interface PontoLinha {
  data: string;       // ISO yyyy-mm-dd
  realizado: number | null;   // serie sólida (passado)
  esperado: number | null;    // serie tracejada (projetado)
  sigma1_low: number | null;  // banda ±1σ baixo
  sigma1_high: number | null; // banda ±1σ alto
  sigma2_low: number | null;  // banda ±2σ baixo
  sigma2_high: number | null; // banda ±2σ alto
}

export const HOJE_ISO = "2026-05-19";

/**
 * Gera serie para o grafico A LINHA.
 *
 * Modo REAL: passe historico, spotAtual e bgiProximo vindos da API.
 *   - Passado: pontos do historico CEPEA real
 *   - Projetado: interpola linear do spot ate o vencimento do BGI proximo
 *   - "hoje" pega a data REAL (new Date()), nao a fixa do mock
 *
 * Modo FALLBACK: sem args, usa MOCK_MERCADO (snapshot do designer 19/mai/26).
 *   Mantido pra Home conseguir renderizar quando API indisponivel.
 *
 * @param sigmaAnualizado σ anualizado (decimal). Null → sem bandas.
 * @param historico pontos {data, valor} reais. Se vazio, usa passado mock.
 * @param spotAtual spot MS atual em R$/@. Se null, usa MOCK.
 * @param bgi { codigo, vencimento, preco_ajuste } do contrato BGI proximo.
 *   Se null, usa MOCK_MERCADO.bgi_q26_ago em 2026-08-22.
 */
export interface LinhaInputs {
  sigmaAnualizado: number | null;
  historico?: Array<{ data: string; valor: number }>;
  spotAtual?: number | null;
  bgi?: { vencimento: string; preco_ajuste: number } | null;
}

export function gerarLinhaRebanho({
  sigmaAnualizado,
  historico,
  spotAtual,
  bgi,
}: LinhaInputs): PontoLinha[] {
  const pontos: PontoLinha[] = [];

  // ── 1. PASSADO realizado ──
  const usaHistoricoReal = historico && historico.length >= 2;
  const hojeReal = new Date().toISOString().slice(0, 10);
  const hojeISO = usaHistoricoReal ? hojeReal : HOJE_ISO;

  if (usaHistoricoReal) {
    // Janela: últimos ~90 dias do histórico real. Pontos densos no recente
    // (1/semana) e mais esparsos no inicial pra dar perspectiva sem poluir.
    const slice = historico!.slice(-90);

    // Sampling: alvo ~30 pontos (pontos a cada ~3 dias) — mais denso pra
    // linha do realizado ficar suave sem dentes visíveis entre amostras.
    const desired = 30;
    const step = Math.max(1, Math.floor(slice.length / desired));
    for (let i = 0; i < slice.length; i += step) {
      const p = slice[i];
      const iso = parseDataCepea(p.data);
      if (iso) {
        pontos.push({
          data: iso,
          realizado: p.valor,
          esperado: null,
          sigma1_low: null,
          sigma1_high: null,
          sigma2_low: null,
          sigma2_high: null,
        });
      }
    }
    // Garante que o último ponto é hoje (mesmo que histórico não tenha a data exata)
    const ultimoPasso = slice[slice.length - 1];
    if (ultimoPasso) {
      const ultimoIso = parseDataCepea(ultimoPasso.data);
      if (ultimoIso !== hojeReal) {
        pontos.push({
          data: hojeReal,
          realizado: spotAtual ?? ultimoPasso.valor,
          esperado: null,
          sigma1_low: null,
          sigma1_high: null,
          sigma2_low: null,
          sigma2_high: null,
        });
      }
    }
  } else {
    // Fallback: passado mock determinístico
    const passadoOffsets: Array<[string, number]> = [
      ["2026-04-19", 312.40],
      ["2026-04-26", 316.10],
      ["2026-05-03", 319.80],
      ["2026-05-10", 320.10],
      ["2026-05-17", 320.10],
      [HOJE_ISO, 317.60],
    ];
    for (const [data, valor] of passadoOffsets) {
      pontos.push({
        data,
        realizado: valor,
        esperado: null,
        sigma1_low: null,
        sigma1_high: null,
        sigma2_low: null,
        sigma2_high: null,
      });
    }
  }

  // ── 2. PROJETADO curva BGI ──
  const dataHoje = new Date(hojeISO);
  // Data do BGI: real (do contrato) ou mock (22 ago/26)
  const dataBGI = bgi ? new Date(bgi.vencimento) : new Date("2026-08-22");
  // Estende até o lote mais distante + 14 dias, OU 30d depois do BGI — o que for maior.
  // Sem isso, quando o BGI próximo é em mês corrente, a projeção fica curtíssima.
  const dataLoteMaisDistante = new Date(
    Math.max(...MOCK_LOTES.map((l) => new Date(l.data_saida).getTime())),
  );
  const dataFim = new Date(
    Math.max(
      dataBGI.getTime() + 30 * 24 * 60 * 60 * 1000,
      dataLoteMaisDistante.getTime() + 14 * 24 * 60 * 60 * 1000,
    ),
  );

  // Preços de início (hoje) e fim (BGI)
  const precoInicio = spotAtual ?? MOCK_MERCADO.arroba_ms_spot;
  const precoBGI = bgi?.preco_ajuste ?? MOCK_MERCADO.bgi_q26_ago;

  // FIX gap σ ↔ D0: o último ponto realizado vira também o ponto-zero da projeção.
  // Esperado = realizado; bandas σ começam FINAS (sigmaT = 0) e abrem com o tempo.
  // Sem isso, a banda nascia 7 dias adiante deixando lacuna visual em "hoje".
  const ultimoRealizado = pontos[pontos.length - 1];
  if (ultimoRealizado?.realizado != null) {
    ultimoRealizado.esperado = ultimoRealizado.realizado;
    ultimoRealizado.sigma1_low = ultimoRealizado.realizado;
    ultimoRealizado.sigma1_high = ultimoRealizado.realizado;
    ultimoRealizado.sigma2_low = ultimoRealizado.realizado;
    ultimoRealizado.sigma2_high = ultimoRealizado.realizado;
  }

  /**
   * Calcula (esperado, σ1, σ2) num dado timestamp futuro.
   * Helper local pra reusar tanto no loop semanal quanto nas datas de lote.
   */
  const calcProjetado = (ts: number) => {
    const dias = (ts - dataHoje.getTime()) / (24 * 60 * 60 * 1000);
    const diasAteBGI = (dataBGI.getTime() - dataHoje.getTime()) / (24 * 60 * 60 * 1000);
    const frac = diasAteBGI > 0 ? Math.min(1, dias / diasAteBGI) : 1;
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
    return { esperado, sigma1_low, sigma1_high, sigma2_low, sigma2_high };
  };

  // Pontos projetados: semanal + uma entrada extra em cada data de lote.
  // Isso garante que os ReferenceDot dos lotes encontrem o `esperado` exato
  // do dia da saída, em vez de cair no fallback mock R$ 322 (bug do círculo solto).
  const tsProjetados = new Set<number>();
  const passoMs = 7 * 24 * 60 * 60 * 1000;
  for (let t = dataHoje.getTime() + passoMs; t <= dataFim.getTime(); t += passoMs) {
    tsProjetados.add(t);
  }
  for (const l of MOCK_LOTES) {
    const ts = new Date(l.data_saida).getTime();
    if (ts > dataHoje.getTime() && ts <= dataFim.getTime()) tsProjetados.add(ts);
  }

  const tsOrdenados = Array.from(tsProjetados).sort((a, b) => a - b);
  for (const t of tsOrdenados) {
    const proj = calcProjetado(t);
    pontos.push({
      data: new Date(t).toISOString().slice(0, 10),
      realizado: null,
      esperado: proj.esperado,
      sigma1_low: proj.sigma1_low,
      sigma1_high: proj.sigma1_high,
      sigma2_low: proj.sigma2_low,
      sigma2_high: proj.sigma2_high,
    });
  }

  return pontos;
}

/**
 * CEPEA devolve datas no formato "DD/MM/YYYY". Converte pra ISO (YYYY-MM-DD).
 * Retorna null se formato inesperado.
 */
function parseDataCepea(s: string): string | null {
  if (!s) return null;
  // Tenta DD/MM/YYYY primeiro
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // Já vem ISO?
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return s;
  return null;
}

