"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchCotacoes,
  fetchFuturos,
  fetchHistoricoArroba,
  fetchHistoricoDolar,
  fetchHistoricoMilho,
} from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import { persistCotacoes, resolveCotacao, formatRelativeTime } from "@/lib/cotacoes-cache";
import { useProfile } from "@/lib/use-profile";

// Limiar de movimento relevante (briefing T2.1): >= 1,0% no dia
const MOVIMENTO_RELEVANTE_PCT = 1.0;

interface ItemCotacao {
  codigo: string;        // 'spot MS', 'BGIK26', 'PTAX', etc — vai em mono azul-grafite
  label: string;         // 'Arroba MS', 'Boi gordo ago/26', etc — fonte sans secundária
  valor: number | null;  // R$, %, ou pontos
  formato: "moeda" | "percentual" | "pontos";
  decimais: number;
  unidade?: string;      // '/@', '/sc', 'a.a.', 'pts'
  deltaPct: number | null; // variação % do dia
  stale: boolean;        // veio do cache, não fresco
  lastUpdateIso: string | null;
}

/**
 * Faixa horizontal de cotações abaixo do TopNav.
 *
 * 5 itens: Arroba MS · BGI próximo · Dólar PTAX · Milho ESALQ · CDI
 * - Pulse 300ms no número quando valor muda
 * - Polling 60s
 * - Indicador de movimento relevante (|Δ%| >= 1%) — seta âmbar discreta
 * - Stale badge âmbar via cotacoes-cache se API falhar
 *
 * NÃO aparece no Simulador (decisão fechada: ticker compete por foco).
 */
export function FaixaCotacoes() {
  const { profile } = useProfile();
  const BASIS_MS = profile.basis_valor;

  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [histDolar, setHistDolar] = useState<HistoricoDolarEntry[]>([]);
  const [histMilho, setHistMilho] = useState<HistoricoDolarEntry[]>([]);

  useEffect(() => {
    const refetch = () => {
      fetchCotacoes().then((c) => {
        setCotacoes(c);
        persistCotacoes(c);
      }).catch(() => {});
      fetchFuturos().then(setFuturos).catch(() => {});
      fetchHistoricoArroba().then((h) => Array.isArray(h) && setHistArroba(h)).catch(() => {});
      fetchHistoricoDolar(7).then((h) => Array.isArray(h) && setHistDolar(h)).catch(() => {});
      fetchHistoricoMilho().then((h) => Array.isArray(h) && setHistMilho(h)).catch(() => {});
    };
    refetch();
    const i = setInterval(refetch, 60_000);
    return () => clearInterval(i);
  }, []);

  // Resolve com fallback de stale (cotacoes-cache)
  const arrobaStatus = resolveCotacao("arroba_boi_gordo", cotacoes);
  const dolarStatus = resolveCotacao("dolar_ptax", cotacoes);
  const milhoStatus = resolveCotacao("milho_esalq", cotacoes);
  const cdiStatus = resolveCotacao("cdi_anual", cotacoes);
  const bezerroStatus = resolveCotacao("bezerro_cepea", cotacoes);
  const sojaStatus = resolveCotacao("soja_esalq", cotacoes);
  const ibovStatus = resolveCotacao("ibov", cotacoes);

  // BGI próximo contrato (futuros)
  const bgiProximo = (() => {
    if (!futuros?.contratos?.length) return null;
    const hoje = Date.now();
    const validos = futuros.contratos
      .filter((c) => new Date(c.vencimento).getTime() > hoje)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
    return validos[0] ?? null;
  })();

  // Δ% do dia: último vs penúltimo do histórico
  const deltaPct = (hist: HistoricoDolarEntry[]): number | null => {
    if (hist.length < 2) return null;
    const a = hist[hist.length - 1].valor;
    const b = hist[hist.length - 2].valor;
    return b > 0 ? ((a - b) / b) * 100 : null;
  };

  // Spot MS = SP + basis
  const spotMS = arrobaStatus.value != null ? arrobaStatus.value + BASIS_MS : null;

  const itens: ItemCotacao[] = [
    {
      codigo: "spot MS",
      label: "Arroba MS",
      valor: spotMS,
      formato: "moeda",
      decimais: 2,
      unidade: "/@",
      deltaPct: deltaPct(histArroba),
      stale: arrobaStatus.state === "stale",
      lastUpdateIso: arrobaStatus.lastUpdateIso,
    },
    {
      codigo: bgiProximo?.codigo ?? "BGI",
      label: bgiProximo ? `Boi gordo ${fmtVenc(bgiProximo.vencimento)}` : "Boi gordo",
      valor: bgiProximo?.preco_ajuste ?? null,
      formato: "moeda",
      decimais: 2,
      unidade: "/@",
      deltaPct: null, // futuros não temos histórico do dia anterior por enquanto
      stale: false,
      lastUpdateIso: futuros?.timestamp ?? null,
    },
    {
      codigo: "PTAX",
      label: "Dólar",
      valor: dolarStatus.value,
      formato: "moeda",
      decimais: 2,
      deltaPct: deltaPct(histDolar),
      stale: dolarStatus.state === "stale",
      lastUpdateIso: dolarStatus.lastUpdateIso,
    },
    {
      codigo: "ESALQ",
      label: "Milho",
      valor: milhoStatus.value,
      formato: "moeda",
      decimais: 2,
      unidade: "/sc",
      deltaPct: deltaPct(histMilho),
      stale: milhoStatus.state === "stale",
      lastUpdateIso: milhoStatus.lastUpdateIso,
    },
    {
      codigo: "CDI",
      label: "Anual",
      valor: cdiStatus.value != null ? cdiStatus.value * 100 : null,
      formato: "percentual",
      decimais: 2,
      unidade: "a.a.",
      deltaPct: null,
      stale: cdiStatus.state === "stale",
      lastUpdateIso: cdiStatus.lastUpdateIso,
    },
    {
      codigo: "ESALQ",
      label: "Bezerro",
      valor: bezerroStatus.value,
      formato: "moeda",
      decimais: 2,
      unidade: "/cab",
      deltaPct: null, // sem histórico do dia anterior pra Bezerro nesta passada
      stale: bezerroStatus.state === "stale",
      lastUpdateIso: bezerroStatus.lastUpdateIso,
    },
    {
      codigo: "ESALQ",
      label: "Soja",
      valor: sojaStatus.value,
      formato: "moeda",
      decimais: 2,
      unidade: "/sc",
      deltaPct: null,
      stale: sojaStatus.state === "stale",
      lastUpdateIso: sojaStatus.lastUpdateIso,
    },
    {
      codigo: "IBOV",
      label: "Bovespa",
      valor: ibovStatus.value,
      formato: "pontos",
      decimais: 0,
      unidade: "pts",
      // delta% vem direto do Yahoo (regularMarketPrice vs previousClose)
      deltaPct: cotacoes?.ibov_delta_pct ?? null,
      stale: ibovStatus.state === "stale",
      lastUpdateIso: ibovStatus.lastUpdateIso,
    },
  ];

  return (
    <div
      style={{
        background: "var(--paper-2)",
        borderBottom: "0.5px solid var(--rule)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ticker móvel: renderiza a lista duplicada pra loop sem corte visual.
          A animação translateX(0 → -50%) faz o container deslizar pra esquerda;
          quando atinge -50% o conteúdo da segunda metade está no mesmo lugar
          onde estava a primeira, e o loop se reinicia sem salto.
          .ticker-scroll:hover pausa via CSS (definido em globals.css). */}
      <div
        className="ticker-scroll flex items-center"
        style={{
          padding: "8px 0",
          gap: 0,
          width: "max-content",
          animationDuration: "75s",
        }}
      >
        {[...itens, ...itens].map((item, i) => (
          <ItemFaixa key={`${item.codigo}-${i}`} item={item} isLast={false} />
        ))}
      </div>
    </div>
  );
}

// ─── Item individual da faixa ────────────────────────────────────
function ItemFaixa({ item, isLast }: { item: ItemCotacao; isLast: boolean }) {
  const [pulse, setPulse] = useState(false);
  const valorAnteriorRef = useRef<number | null>(null);

  useEffect(() => {
    if (valorAnteriorRef.current !== null && valorAnteriorRef.current !== item.valor) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 320);
      valorAnteriorRef.current = item.valor;
      return () => clearTimeout(t);
    }
    valorAnteriorRef.current = item.valor;
  }, [item.valor]);

  const movimentoRelevante = item.deltaPct != null && Math.abs(item.deltaPct) >= MOVIMENTO_RELEVANTE_PCT;

  return (
    <div
      className="flex items-baseline"
      style={{
        // flex 0 0 auto: item NÃO estica nem encolhe — tamanho natural do conteúdo.
        // Permite que o container `ticker-scroll` (width: max-content) calcule
        // a largura total corretamente pra o loop translateX(-50%) ficar suave.
        flex: "0 0 auto",
        gap: 8,
        paddingRight: 16,
        marginRight: 16,
        borderRight: isLast ? "none" : "0.5px solid var(--rule)",
      }}
    >
      {/* Código mono azul-grafite */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          padding: "1px 5px",
          background: "var(--grafite-soft)",
          color: "var(--grafite)",
          borderRadius: 2,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {item.codigo}
      </span>

      {/* Label sutil */}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          color: "var(--ink-3)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {item.label}
      </span>

      {/* Valor */}
      <span
        className={pulse ? "faixa-pulse" : ""}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: item.valor != null ? "var(--ink)" : "var(--ink-3)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {item.valor != null
          ? `${item.formato === "moeda" ? "R$ " : ""}${formatarValor(item.valor, item.decimais, item.formato)}${item.formato !== "percentual" && item.unidade ? item.unidade : ""}`
          : "—"}
      </span>

      {/* Δ% do dia */}
      {item.deltaPct != null && (
        <span
          className="flex items-center"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: item.deltaPct < 0 ? "var(--loss)" : item.deltaPct > 0 ? "var(--gain)" : "var(--ink-3)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            gap: 2,
          }}
        >
          {item.deltaPct >= 0 ? "+" : ""}{item.deltaPct.toFixed(2).replace(".", ",")}%
          {movimentoRelevante && (
            <span
              title="Movimento relevante: |Δ| ≥ 1% no dia"
              style={{
                color: "var(--amber)",
                fontSize: 11,
                lineHeight: 1,
              }}
            >
              {item.deltaPct < 0 ? "↘" : "↗"}
            </span>
          )}
        </span>
      )}

      {/* Stale badge */}
      {item.stale && item.lastUpdateIso && (
        <span
          title={`Última atualização: ${formatRelativeTime(item.lastUpdateIso)}`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            padding: "1px 4px",
            background: "var(--warning-bg, rgba(184,138,44,0.12))",
            color: "var(--amber)",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          {formatRelativeTime(item.lastUpdateIso)}
        </span>
      )}
    </div>
  );
}

function formatarValor(v: number, decimais: number, formato: "moeda" | "percentual" | "pontos"): string {
  const s = v.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
  return formato === "percentual" ? `${s}%` : s;
}

function fmtVenc(iso: string): string {
  try {
    const d = new Date(iso);
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${meses[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
  } catch {
    return "";
  }
}
