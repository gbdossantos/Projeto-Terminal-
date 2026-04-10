"use client";

import { fmtBRL, fmtPct } from "@/lib/utils/format";
import type { SimulatorScenarioOutput } from "@/lib/types";

interface ScenarioTableProps {
  cenarios: SimulatorScenarioOutput[];
  showHedge: boolean;
}

const dotColors: Record<string, string> = {
  Otimista: "var(--green)",
  "Base (atual)": "var(--brand)",
  "Estresse leve": "var(--amber)",
  "Estresse severo": "var(--red)",
  Pesadelo: "var(--red-2)",
};

function MargemBadge({ value }: { value: number }) {
  let bg: string, fg: string;
  if (value >= 0.15) {
    bg = "var(--success-bg)";
    fg = "var(--green-2)";
  } else if (value >= 0.05) {
    bg = "var(--warning-bg)";
    fg = "var(--amber)";
  } else {
    bg = "var(--danger-bg)";
    fg = "var(--red-2)";
  }

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px]"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 500,
        background: bg,
        color: fg,
      }}
    >
      {fmtPct(value)}
    </span>
  );
}

export function ScenarioTable({ cenarios, showHedge }: ScenarioTableProps) {
  const headers = [
    "Cenario",
    "Arroba",
    "Milho",
    "Dolar",
    "Receita",
    "Custo",
    "Margem",
    "Margem %",
    ...(showHedge ? ["c/ Hedge"] : []),
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "0.5px solid var(--border-subtle)" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`uppercase ${h === "Cenario" ? "text-left" : "text-right"}`}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 9,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    padding: "8px 12px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cenarios.map((c, i) => {
              const isBase = c.nome.includes("Base");
              const isLast = i === cenarios.length - 1;
              const margemPositive = c.margem_sem_hedge >= 0;

              return (
                <tr
                  key={i}
                  className="group transition-colors"
                  style={{
                    background: isBase ? "var(--surface-2)" : "transparent",
                    borderBottom: isLast ? "none" : "0.5px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBase) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isBase) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "9px 12px" }}>
                    <span className="flex items-center gap-2">
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 5,
                          height: 5,
                          background: dotColors[c.nome] ?? "var(--text-tertiary)",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: isBase ? 500 : 400,
                          color: "var(--text-primary)",
                        }}
                      >
                        {c.nome}
                      </span>
                    </span>
                  </td>

                  {[
                    `${fmtBRL(c.preco_arroba_cenario, 0)}/@`,
                    `${fmtBRL(c.preco_milho_cenario, 0)}/sc`,
                    `R$ ${c.dolar_cenario.toFixed(2)}`,
                    fmtBRL(c.receita_sem_hedge),
                    fmtBRL(c.custo_cenario),
                  ].map((val, j) => (
                    <td key={j} className="text-right" style={{ padding: "9px 12px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-primary)" }}>
                        {val}
                      </span>
                    </td>
                  ))}

                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 500,
                        color: margemPositive ? "var(--green-2)" : "var(--red-2)",
                      }}
                    >
                      {fmtBRL(c.margem_sem_hedge)}
                    </span>
                  </td>

                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <MargemBadge value={c.margem_pct_sem_hedge} />
                  </td>

                  {showHedge && (
                    <td className="text-right" style={{ padding: "9px 12px" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          fontWeight: 500,
                          color: c.margem_com_hedge >= 0 ? "var(--green-2)" : "var(--red-2)",
                        }}
                      >
                        {fmtBRL(c.margem_com_hedge)}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
