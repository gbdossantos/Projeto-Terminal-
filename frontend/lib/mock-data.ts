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
