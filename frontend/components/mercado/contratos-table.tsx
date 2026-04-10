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
  if (spread > 0) return { label: "em premio", bg: "var(--success-bg)", color: "var(--green-2)" };
  if (spread >= -5) return { label: "leve desc.", bg: "var(--warning-bg)", color: "var(--amber)" };
  return { label: "desconto", bg: "var(--danger-bg)", color: "var(--red-2)" };
}

export function ContratosTable({ contratos, spotPrice }: ContratosTableProps) {
  const headers = ["Contrato", "Vencimento", "Preco ajuste", "Spread vs spot", "Dias uteis", "Status"];

  return (
    <div style={{ borderTop: "0.5px solid var(--border-subtle)" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "0.5px solid var(--border-subtle)" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`uppercase ${h === "Contrato" || h === "Vencimento" ? "text-left" : "text-right"}`}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: 500, color: "var(--text-tertiary)", padding: "7px 14px", letterSpacing: "0.04em" }}
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
                  className="transition-colors"
                  style={{ borderBottom: isLast ? "none" : "0.5px solid var(--border-subtle)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={{ padding: "7px 14px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: isNear ? 600 : 400, color: isNear ? "var(--brand)" : "var(--text-primary)" }}>
                      {c.codigo}
                    </span>
                  </td>
                  <td style={{ padding: "7px 14px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-primary)" }}>{c.vencimento}</span>
                  </td>
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-primary)" }}>R$ {c.preco_ajuste.toFixed(2)}/@</span>
                  </td>
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    {spread != null ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: spread >= 0 ? "var(--green-2)" : "var(--red-2)" }}>
                        {spread >= 0 ? "+" : ""}R$ {spread.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-tertiary)" }}>{bizDays}d</span>
                  </td>
                  <td className="text-right" style={{ padding: "7px 14px" }}>
                    {badge && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px]" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, background: badge.bg, color: badge.color }}>
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
