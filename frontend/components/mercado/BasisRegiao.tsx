"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const RAW_DATA = [
  { regiao: "SP", basis: 0 },
  { regiao: "MG", basis: -3 },
  { regiao: "MS", basis: -5 },
  { regiao: "GO", basis: -7 },
  { regiao: "MT", basis: -10 },
  { regiao: "TO", basis: -12 },
  { regiao: "PA", basis: -15 },
  { regiao: "RO", basis: -15 },
];

const data = [...RAW_DATA].sort((a, b) => b.basis - a.basis);

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
      <p className="font-medium text-t-primary">{String(d.regiao)}</p>
      <p className="text-t-secondary">R$ {String(d.basis)}/@</p>
    </div>
  );
}

export function BasisRegiao() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
      >
        <XAxis
          type="number"
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `R$${v}`}
        />
        <YAxis
          type="category"
          dataKey="regiao"
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Bar dataKey="basis" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.regiao}
              fill={entry.regiao === "SP" ? "var(--success)" : "var(--terra)"}
            />
          ))}
          <LabelList
            dataKey="basis"
            position="insideRight"
            formatter={(v) => `R$${v}/@`}
            style={{ fill: "#fff", fontSize: 10, fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
