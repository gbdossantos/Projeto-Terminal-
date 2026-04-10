"use client";

import type { CotacaoMercado, ContratoFuturo } from "@/lib/types";

interface TickerTapeProps {
  cotacoes: CotacaoMercado | null;
  contratos: ContratoFuturo[];
}

interface TickerItem {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}

function buildItems(cotacoes: CotacaoMercado | null, contratos: ContratoFuturo[]): TickerItem[] {
  const items: TickerItem[] = [];

  if (cotacoes?.arroba_boi_gordo != null) {
    items.push({
      label: "ARROBA",
      value: `R$${cotacoes.arroba_boi_gordo.toFixed(2)}/@`,
    });
  }

  if (cotacoes?.dolar_ptax != null) {
    items.push({
      label: "DOLAR",
      value: `R$${cotacoes.dolar_ptax.toFixed(2)}`,
    });
  }

  if (cotacoes?.milho_esalq != null) {
    items.push({
      label: "MILHO",
      value: `R$${cotacoes.milho_esalq.toFixed(2)}/sc`,
    });
  }

  if (cotacoes?.cdi_anual != null) {
    items.push({
      label: "CDI",
      value: `${(cotacoes.cdi_anual * 100).toFixed(2)}% a.a.`,
    });
  }

  // Add futures contracts with spread vs spot
  const spot = cotacoes?.arroba_boi_gordo;
  for (const c of contratos.slice(0, 6)) {
    const spread = spot != null ? c.preco_ajuste - spot : null;
    items.push({
      label: c.codigo,
      value: `R$${c.preco_ajuste.toFixed(2)}/@`,
      delta: spread != null ? `${spread >= 0 ? "+" : ""}R$${spread.toFixed(2)}` : undefined,
      positive: spread != null ? spread >= 0 : undefined,
    });
  }

  return items;
}

export function TickerTape({ cotacoes, contratos }: TickerTapeProps) {
  const items = buildItems(cotacoes, contratos);
  if (items.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        background: "#221F18",
        borderBottom: "0.5px solid #2A2820",
        padding: "6px 0",
        overflow: "hidden",
      }}
    >
      <div
        className="ticker-scroll flex items-center whitespace-nowrap"
        style={{ animationDuration: "28s" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#6B6860",
                marginRight: 5,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#F5F1E8",
                marginRight: item.delta ? 5 : 0,
              }}
            >
              {item.value}
            </span>
            {item.delta && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: item.positive ? "#6B8F5A" : "#D4614A",
                }}
              >
                {item.delta}
              </span>
            )}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#2A2820",
                margin: "0 14px",
              }}
            >
              |
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
