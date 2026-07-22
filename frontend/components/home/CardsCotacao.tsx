"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchCotacoes,
  fetchFuturos,
  fetchHistoricoDolar,
  fetchHistoricoMilho,
} from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import {
  persistCotacoes,
  resolveCotacao,
  formatRelativeTime,
  type CotacaoFieldState,
} from "@/lib/cotacoes-cache";

/**
 * Faixa de 5 cards de cotação sobrepostos à base do hero (leitura de relance).
 *
 * Convive com a FaixaCotacoes (ticker) — não a substitui. Consome as MESMAS
 * fontes do ticker (fetchCotacoes / fetchFuturos / históricos), sem endpoint novo.
 *
 * Cards (nesta ordem, arroba NÃO entra — já é o preço-hero):
 *   1. Boi Gordo futuro (BGI próximo)  2. Dólar PTAX  3. Milho ESALQ
 *   4. Bezerro (CEPEA/ESALQ)           5. CDI anual
 *
 * Estados por card (§10.6 — stale/fake é pior que ausência):
 *   loading → skeleton | fresh → valor | stale → valor + badge âmbar
 *   unavailable → "Cotação indisponível" explícito (NUNCA valor inventado)
 *
 * Posição/estilo vivem em globals.css (.cards-cotacao-*): cards de vidro
 * fosco (backdrop-blur — a foto atravessa) numa faixa horizontal que sangra
 * ~metade da altura sobre a base do hero, por cima do gradiente de transição
 * (sem forçá-lo a subir); gado/cerca respiram acima da faixa e nos gaps.
 * Textos pequenos usam os tons -2 (ink-2/grafite-2/gain-2/loss-2) pra fechar
 * AA sobre o composite translúcido.
 */

type Formato = "moeda" | "percentual";

interface CardData {
  codigo: string; // badge de fonte (BGIN26, PTAX, ESALQ, CDI) — mesmo chip do ticker
  label: string; // BOI GORDO, DÓLAR, MILHO, BEZERRO, ANUAL
  valor: number | null;
  formato: Formato;
  decimais: number;
  unidade?: string; // /@, /sc, /cab, a.a.
  deltaPct: number | null; // variação % do dia — null → linha omitida
  state: CotacaoFieldState;
  lastUpdateIso: string | null;
  loading: boolean;
}

export function CardsCotacao() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histDolar, setHistDolar] = useState<HistoricoDolarEntry[]>([]);
  const [histMilho, setHistMilho] = useState<HistoricoDolarEntry[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    const refetch = () => {
      const p1 = fetchCotacoes()
        .then((c) => {
          if (!ativo) return;
          setCotacoes(c);
          persistCotacoes(c);
        })
        .catch(() => {});
      const p2 = fetchFuturos()
        .then((f) => ativo && setFuturos(f))
        .catch(() => {});
      const p3 = fetchHistoricoDolar(7)
        .then((h) => ativo && Array.isArray(h) && setHistDolar(h))
        .catch(() => {});
      const p4 = fetchHistoricoMilho()
        .then((h) => ativo && Array.isArray(h) && setHistMilho(h))
        .catch(() => {});
      return Promise.allSettled([p1, p2, p3, p4]);
    };
    // Primeira passada baixa o loading só depois que todas as fontes assentam
    // (skeleton → dado real ou indisponível, sem piscar card vazio).
    refetch().finally(() => ativo && setCarregando(false));
    const i = setInterval(refetch, 60_000);
    return () => {
      ativo = false;
      clearInterval(i);
    };
  }, []);

  const dolarStatus = resolveCotacao("dolar_ptax", cotacoes);
  const milhoStatus = resolveCotacao("milho_esalq", cotacoes);
  const cdiStatus = resolveCotacao("cdi_anual", cotacoes);
  const bezerroStatus = resolveCotacao("bezerro_cepea", cotacoes);

  // BGI próximo contrato (mesma lógica do ticker)
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

  const cards: CardData[] = [
    {
      // 1. Boi Gordo futuro — não passa pelo cache de cotações; estado vem da curva
      codigo: bgiProximo?.codigo ?? "BGI",
      label: "Boi Gordo",
      valor: bgiProximo?.preco_ajuste ?? null,
      formato: "moeda",
      decimais: 2,
      unidade: "/@",
      deltaPct: null, // sem histórico do dia anterior pra futuro nesta passada
      state: bgiProximo ? "fresh" : "unavailable",
      lastUpdateIso: futuros?.timestamp ?? null,
      loading: carregando && futuros == null,
    },
    {
      // 2. Dólar PTAX
      codigo: "PTAX",
      label: "Dólar",
      valor: dolarStatus.value,
      formato: "moeda",
      decimais: 2,
      deltaPct: deltaPct(histDolar),
      state: dolarStatus.state,
      lastUpdateIso: dolarStatus.lastUpdateIso,
      loading: carregando && dolarStatus.value == null,
    },
    {
      // 3. Milho ESALQ
      codigo: "ESALQ",
      label: "Milho",
      valor: milhoStatus.value,
      formato: "moeda",
      decimais: 2,
      unidade: "/sc",
      deltaPct: deltaPct(histMilho),
      state: milhoStatus.state,
      lastUpdateIso: milhoStatus.lastUpdateIso,
      loading: carregando && milhoStatus.value == null,
    },
    {
      // 4. Bezerro (indicador ESALQ/CEPEA) — sem Δ% (sem histórico do dia anterior)
      codigo: "ESALQ",
      label: "Bezerro",
      valor: bezerroStatus.value,
      formato: "moeda",
      decimais: 2,
      unidade: "/cab",
      deltaPct: null,
      state: bezerroStatus.state,
      lastUpdateIso: bezerroStatus.lastUpdateIso,
      loading: carregando && bezerroStatus.value == null,
    },
    {
      // 5. CDI anual (BCB SGS 4389) — decimal → %
      codigo: "CDI",
      label: "Anual",
      valor: cdiStatus.value != null ? cdiStatus.value * 100 : null,
      formato: "percentual",
      decimais: 2,
      unidade: "a.a.",
      deltaPct: null,
      state: cdiStatus.state,
      lastUpdateIso: cdiStatus.lastUpdateIso,
      loading: carregando && cdiStatus.value == null,
    },
  ];

  return (
    <div className="cards-cotacao-wrap" aria-label="Cotações de relance">
      <div className="cards-cotacao">
        {cards.map((c, i) => (
          <CardCotacao key={`${c.codigo}-${c.label}-${i}`} card={c} />
        ))}
      </div>
    </div>
  );
}

// ─── Card individual ─────────────────────────────────────────────
function CardCotacao({ card }: { card: CardData }) {
  const [pulse, setPulse] = useState(false);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    if (anterior.current !== null && anterior.current !== card.valor) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 320);
      anterior.current = card.valor;
      return () => clearTimeout(t);
    }
    anterior.current = card.valor;
  }, [card.valor]);

  const indisponivel = !card.loading && card.valor == null;

  return (
    <div className="cards-cotacao-card">
      {/* Topo: label + badge de fonte */}
      <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 10 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--ink-2)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {card.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            padding: "1px 5px",
            background: "var(--grafite-soft)",
            color: "var(--grafite-2)",
            borderRadius: 2,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {card.codigo}
        </span>
      </div>

      {card.loading ? (
        <div className="card-skeleton-line" style={{ height: 22, width: "72%", marginTop: 2 }} />
      ) : indisponivel ? (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink-2)",
              lineHeight: 1.1,
            }}
          >
            —
          </div>
          <div
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.04em",
              color: "var(--loss-2)",
              marginTop: 6,
            }}
          >
            Cotação indisponível
          </div>
        </div>
      ) : (
        <>
          {/* Valor — protagonista do card */}
          <div
            className={pulse ? "faixa-pulse" : ""}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {card.formato === "moeda" && (
              <span style={{ fontSize: 13, color: "var(--ink-2)", marginRight: 3 }}>R$</span>
            )}
            {formatarValor(card.valor!, card.decimais, card.formato)}
            {card.unidade && (
              <span style={{ fontSize: 12, color: "var(--ink-2)", marginLeft: 3, fontWeight: 400 }}>
                {card.formato === "percentual" ? ` ${card.unidade}` : card.unidade}
              </span>
            )}
          </div>

          {/* Δ do dia — só quando disponível (senão a linha some) */}
          {card.deltaPct != null && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                marginTop: 6,
                color:
                  card.deltaPct < 0
                    ? "var(--loss-2)"
                    : card.deltaPct > 0
                      ? "var(--gain-2)"
                      : "var(--ink-2)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {card.deltaPct < 0 ? "↘" : "↗"} {card.deltaPct >= 0 ? "+" : ""}
              {card.deltaPct.toFixed(2).replace(".", ",")}%{" "}
              <span style={{ color: "var(--ink-2)" }}>no dia</span>
            </div>
          )}

          {/* Badge de stale — valor do cache, sinalizado (nunca silencioso) */}
          {card.state === "stale" && card.lastUpdateIso && (
            <span
              title={`Fonte indisponível · última ${formatRelativeTime(card.lastUpdateIso)}`}
              style={{
                display: "inline-block",
                marginTop: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                padding: "1px 5px",
                background: "var(--warning-bg)",
                color: "var(--amber)",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              {formatRelativeTime(card.lastUpdateIso)}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function formatarValor(v: number, decimais: number, formato: Formato): string {
  const s = v.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
  return formato === "percentual" ? `${s}%` : s;
}
