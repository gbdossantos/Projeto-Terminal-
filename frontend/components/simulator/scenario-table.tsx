"use client";

import { fmtBRL, fmtPct } from "@/lib/utils/format";
import type { SimulatorScenarioOutput } from "@/lib/types";

interface ScenarioTableProps {
  cenarios: SimulatorScenarioOutput[];
  showHedge: boolean;
}

const dotColors: Record<string, string> = {
  Otimista: "#4A5D3A",
  "Base (atual)": "#B8763E",
  "Estresse leve": "#C89B3C",
  "Estresse severo": "#B54134",
  Pesadelo: "#D4614A",
};

function MargemBadge({ value }: { value: number }) {
  let bg: string, fg: string;
  if (value >= 0.15) {
    bg = "#4A5D3A22";
    fg = "#6B8F5A";
  } else if (value >= 0.05) {
    bg = "#C89B3C22";
    fg = "#C89B3C";
  } else {
    bg = "#B5413422";
    fg = "#D4614A";
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
        background: "#1A1814",
        border: "0.5px solid #2A2820",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#221F18", borderBottom: "0.5px solid #2A2820" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`uppercase ${h === "Cenario" ? "text-left" : "text-right"}`}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 9,
                    fontWeight: 500,
                    color: "#6B6860",
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
                  className="group"
                  style={{
                    background: isBase ? "#221F18" : "transparent",
                    borderBottom: isLast ? "none" : "0.5px solid #2A2820",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBase) (e.currentTarget as HTMLElement).style.background = "#221F18";
                  }}
                  onMouseLeave={(e) => {
                    if (!isBase) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {/* Cenario */}
                  <td style={{ padding: "9px 12px" }}>
                    <span className="flex items-center gap-2">
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 5,
                          height: 5,
                          background: dotColors[c.nome] ?? "#6B6860",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: isBase ? 500 : 400,
                          color: "#F5F1E8",
                        }}
                      >
                        {c.nome}
                      </span>
                    </span>
                  </td>

                  {/* Arroba */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F1E8" }}>
                      {fmtBRL(c.preco_arroba_cenario, 0)}/@
                    </span>
                  </td>

                  {/* Milho */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F1E8" }}>
                      {fmtBRL(c.preco_milho_cenario, 0)}/sc
                    </span>
                  </td>

                  {/* Dolar */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F1E8" }}>
                      R$ {c.dolar_cenario.toFixed(2)}
                    </span>
                  </td>

                  {/* Receita */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F1E8" }}>
                      {fmtBRL(c.receita_sem_hedge)}
                    </span>
                  </td>

                  {/* Custo */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F1E8" }}>
                      {fmtBRL(c.custo_cenario)}
                    </span>
                  </td>

                  {/* Margem R$ */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 500,
                        color: margemPositive ? "#6B8F5A" : "#D4614A",
                      }}
                    >
                      {fmtBRL(c.margem_sem_hedge)}
                    </span>
                  </td>

                  {/* Margem % badge */}
                  <td className="text-right" style={{ padding: "9px 12px" }}>
                    <MargemBadge value={c.margem_pct_sem_hedge} />
                  </td>

                  {/* Hedge */}
                  {showHedge && (
                    <td className="text-right" style={{ padding: "9px 12px" }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          fontWeight: 500,
                          color: c.margem_com_hedge >= 0 ? "#6B8F5A" : "#D4614A",
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
