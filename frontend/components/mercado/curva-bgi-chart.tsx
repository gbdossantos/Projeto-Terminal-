"use client";

import {
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import type { ContratoFuturo } from "@/lib/types";

interface CurvaBGIChartProps {
  contratos: ContratoFuturo[];
  spotPrice: number | null;
  fonte: string;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtMonth(vencimento: string): string {
  const d = new Date(vencimento);
  return `${MONTHS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

export function CurvaBGIChart({ contratos, spotPrice, fonte }: CurvaBGIChartProps) {
  const data = contratos.map((c) => ({
    ...c,
    contrato: fmtMonth(c.vencimento),
    preco: c.preco_ajuste,
  }));

  const avgFutures = data.length > 0
    ? data.reduce((s, c) => s + c.preco, 0) / data.length
    : 0;
  const isBackwardation = spotPrice != null && spotPrice > avgFutures;

  const laterContracts = data.slice(3, 6);
  const backDiff = spotPrice != null && laterContracts.length > 0
    ? Math.round(spotPrice - laterContracts.reduce((s, c) => s + c.preco, 0) / laterContracts.length)
    : 0;
  const lastContract = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between" style={{ padding: "18px 24px 14px" }}>
        <div>
          <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
            Curva de futuros B3 — boi gordo (BGI)
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--text-tertiary)" }}>
            Precos de ajuste por vencimento vs spot CEPEA
          </p>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--text-tertiary)" }}>
          Fonte: {fonte} · {contratos.length} contratos
        </span>
      </div>

      {/* Chart */}
      <div style={{ padding: "0 12px" }}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 48, bottom: 20 }}>
            <CartesianGrid horizontal={true} vertical={false} stroke="var(--border-subtle)" strokeWidth={0.5} />
            <XAxis
              dataKey="contrato"
              tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fill: "var(--text-tertiary)" }}
              tickFormatter={(v) => `R$${v}`}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            {spotPrice != null && (
              <ReferenceLine
                y={spotPrice}
                stroke="var(--amber)"
                strokeWidth={1.2}
                strokeDasharray="7 5"
                opacity={0.75}
                label={{
                  value: `Spot CEPEA ${spotPrice.toFixed(0)}`,
                  position: "right",
                  fontSize: 9,
                  fill: "var(--amber)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            )}
            <Area type="monotone" dataKey="preco" fill="var(--brand)" fillOpacity={0.04} stroke="none" />
            <Line
              type="monotone"
              dataKey="preco"
              stroke="var(--brand)"
              strokeWidth={2.5}
              dot={{ fill: "var(--brand)", r: 5, strokeWidth: 0 }}
              activeDot={{ fill: "var(--brand-fg)", stroke: "var(--brand)", strokeWidth: 2.5, r: 6 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "var(--text-primary)",
              }}
              formatter={(value) => [`R$ ${Number(value).toFixed(2)}/@`, ""]}
              labelStyle={{ color: "var(--brand)", fontWeight: 500 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + Backwardation badge */}
      <div className="flex items-center justify-between" style={{ padding: "0 24px 14px" }}>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full" style={{ width: 6, height: 6, background: "var(--brand)", display: "inline-block" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "var(--brand)" }}>
            {isBackwardation
              ? `Backwardation — mercado precifica queda de R$${backDiff}/@${lastContract ? ` ate ${lastContract.contrato}` : ""}`
              : "Contango — mercado precifica alta nos proximos meses"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 2, background: "var(--brand)", borderRadius: 1, display: "inline-block" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--text-tertiary)" }}>Futuros BGI</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 0, borderTop: "1.2px dashed var(--amber)", display: "inline-block" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--text-tertiary)" }}>Spot CEPEA</span>
          </span>
        </div>
      </div>
    </div>
  );
}
