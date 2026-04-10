"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fmtBRL } from "@/lib/utils/format";

interface ChartDataPoint {
  nome: string;
  margem: number;
}

interface ScenarioChartProps {
  data: ChartDataPoint[];
}

export function ScenarioChart({ data }: ScenarioChartProps) {
  return (
    <div
      style={{
        background: "#1A1814",
        border: "0.5px solid #2A2820",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <h3
        style={{
          fontFamily: "'Source Serif 4', serif",
          fontSize: 13,
          color: "#F5F1E8",
          marginBottom: 4,
        }}
      >
        Impacto por cenario
      </h3>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: "#6B6860",
          marginBottom: 12,
        }}
      >
        Margem do lote (R$) em cada cenario simulado
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="#2A2820"
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="nome"
            tick={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fill: "#6B6860",
            }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fill: "#6B6860",
            }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [fmtBRL(Number(value)), "Margem"]}
            contentStyle={{
              background: "#1A1814",
              border: "0.5px solid #2A2820",
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "#F5F1E8",
            }}
            labelStyle={{ color: "#6B6860", fontSize: 11 }}
            cursor={{ fill: "#2A282044" }}
          />
          <ReferenceLine y={0} stroke="#3A3628" strokeWidth={1} />
          <Bar dataKey="margem" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.margem >= 0 ? "#4A5D3A" : "#B54134"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
