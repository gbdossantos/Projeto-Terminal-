"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ContratoFuturo } from "@/lib/types";
import { fmtArroba } from "@/lib/utils/format";

interface Props {
  contratos: ContratoFuturo[];
  spotPrice: number | null;
}

const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function fmtMonth(vencimento: string): string {
  const d = new Date(vencimento);
  const m = MONTHS[d.getUTCMonth()];
  const y = String(d.getUTCFullYear()).slice(2);
  return `${m}/${y}`;
}

const axisStyle = {
  stroke: "var(--text-tertiary)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Record<string, unknown>[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Record<string, unknown>;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="font-medium text-t-primary">{String(d.codigo)}</p>
      <p className="text-t-secondary">{fmtArroba(Number(d.preco_ajuste))}</p>
    </div>
  );
}

export function CurvaFuturosChart({ contratos, spotPrice }: Props) {
  const data = contratos.map((c) => ({
    ...c,
    mes: fmtMonth(c.vencimento),
  }));

  const avgFutures =
    data.length > 0
      ? data.reduce((s, c) => s + c.preco_ajuste, 0) / data.length
      : 0;

  const isBackwardation = spotPrice !== null && spotPrice > avgFutures;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <XAxis
            dataKey="mes"
            stroke={axisStyle.stroke}
            fontSize={axisStyle.fontSize}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke={axisStyle.stroke}
            fontSize={axisStyle.fontSize}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          {spotPrice !== null && (
            <ReferenceLine
              y={spotPrice}
              stroke="var(--warning)"
              strokeDasharray="6 4"
              label={{
                value: "Spot CEPEA",
                position: "insideTopRight",
                fill: "var(--warning)",
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="preco_ajuste"
            stroke="var(--terra)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--terra)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {spotPrice !== null && data.length > 0 && (
        <p
          className="text-xs mt-2"
          style={{ color: isBackwardation ? "var(--warning)" : "var(--success)" }}
        >
          {isBackwardation
            ? "Backwardation \u2014 mercado precifica queda"
            : "Contango \u2014 mercado precifica alta"}
        </p>
      )}
    </div>
  );
}
