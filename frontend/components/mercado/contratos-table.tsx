"use client";

import type { ContratoFuturo } from "@/lib/types";

interface ContratosTableProps {
  contratos: ContratoFuturo[];
  spotPrice: number | null;
}

function getBusinessDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  let count = 0;
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  while (current < target) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function getSpreadBadge(spread: number): { label: string; bg: string; color: string } {
  if (spread > 0) return { label: "em premio", bg: "#4A5D3A22", color: "#6B8F5A" };
  if (spread >= -5) return { label: "leve desc.", bg: "#C89B3C22", color: "#C89B3C" };
  return { label: "desconto", bg: "#B5413422", color: "#D4614A" };
}

export function ContratosTable({ contratos, spotPrice }: ContratosTableProps) {
  const headers = ["Contrato", "Vencimento", "Preco ajuste", "Spread vs spot", "Dias uteis", "Status"];

  return (
    <div style={{ borderTop: "0.5px solid #2A2820" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#221F18", borderBottom: "0.5px solid #2A2820" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`uppercase ${h === "Contrato" || h === "Vencimento" ? "text-left" : "text-right"}`}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 9,
                    fontWeight: 500,
                    color: "#6B6860",
                    padding: "7px 14px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contratos.map((c, i) => {
              const spread = spotPrice != null ? c.preco_ajuste - spotPrice : null;
              const bizDays = getBusinessDaysUntil(c.vencimento);
              const isNear = bizDays <= 30;
              const isLast = i === contratos.length - 1;
              const badge = spread != null ? getSpreadBadge(spread) : null;

              return (
                <tr
                  key={c.codigo}
                  className="group"
                  style={{
                    borderBottom: isLast ? "none" : "0.5px solid #2A2820",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#221F18";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {/* Contrato */}
                  <td style={{ padding: "7px 14px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: isNear ? 600 : 400,
                        color: isNear ? "#B8763E" : "#F5F1E8",
                      }}
                    >
                      {c.codigo}
                    </span>
                  </td>

                  {/* Vencimento */}
                  <td style={{ padding: "7px 14px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: "#F5F1E8",
                      }}
                    >
                      {c.vencimento}
                    </span>
                  </td>

                  {/* Preco ajuste */}
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: "#F5F1E8",
                      }}
                    >
                      R$ {c.preco_ajuste.toFixed(2)}/@
                    </span>
                  </td>

                  {/* Spread */}
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    {spread != null ? (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: spread >= 0 ? "#6B8F5A" : "#D4614A",
                        }}
                      >
                        {spread >= 0 ? "+" : ""}R$ {spread.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "#6B6860", fontSize: 11 }}>—</span>
                    )}
                  </td>

                  {/* Dias uteis */}
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: "#6B6860",
                      }}
                    >
                      {bizDays}d
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    {badge && (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px]"
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
