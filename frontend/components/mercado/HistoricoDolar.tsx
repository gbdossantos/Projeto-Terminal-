"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistoricoDolarEntry } from "@/lib/types";

interface Props {
  dados: HistoricoDolarEntry[];
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Record<string, unknown>[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as HistoricoDolarEntry;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-t-secondary">{d.data}</p>
      <p className="font-medium text-t-primary">
        R$ {d.valor.toFixed(2)}
      </p>
    </div>
  );
}

export function HistoricoDolar({ dados }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <XAxis
          dataKey="data"
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="var(--text-tertiary)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--terra)"
          fill="var(--terra-bg)"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
