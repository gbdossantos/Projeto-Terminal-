"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface FanDataPoint {
  dia: number;
  base: number;
  otimista: number;
  pessimista: number;
}

interface FanChartProps {
  data: FanDataPoint[];
}

export function FanChart({ data }: FanChartProps) {
  if (!data.length) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <span
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          Distribuicao de resultados
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginLeft: 8,
          }}
        >
          Margem R$ ao longo do ciclo · zona de incerteza
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: 44, bottom: 20 }}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="var(--rule)"
            strokeWidth={0.5}
          />

          <XAxis
            dataKey="dia"
            tickFormatter={(v) => `dia ${v}`}
            tick={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              fill: "var(--ink-3)",
            }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={(v) =>
              `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k`
            }
            tick={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              fill: "var(--ink-3)",
            }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={["auto", "auto"]}
          />

          {/* Uncertainty band — ReferenceArea between consecutive points */}
          {data.map((point, i) => {
            if (i === data.length - 1) return null;
            const next = data[i + 1];
            return (
              <ReferenceArea
                key={i}
                x1={point.dia}
                x2={next.dia}
                y1={Math.min(point.pessimista, next.pessimista)}
                y2={Math.max(point.otimista, next.otimista)}
                fill="var(--grafite-2)"
                fillOpacity={0.07}
                stroke="none"
              />
            );
          })}

          {/* Zero line */}
          <ReferenceLine
            y={0}
            stroke="#3A3628"
            strokeWidth={1}
            strokeDasharray="2 4"
          />

          {/* Pessimista line */}
          <Line
            dataKey="pessimista"
            stroke="var(--loss)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />

          {/* Otimista line */}
          <Line
            dataKey="otimista"
            stroke="var(--gain)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />

          {/* Base line — main */}
          <Line
            dataKey="base"
            stroke="var(--grafite-2)"
            strokeWidth={2.5}
            dot={{ fill: "var(--grafite-2)", r: 3.5, strokeWidth: 0 }}
            activeDot={{
              fill: "var(--paper)",
              stroke: "var(--grafite-2)",
              strokeWidth: 2,
              r: 4.5,
            }}
            isAnimationActive={false}
          />

          <Tooltip
            contentStyle={{
              background: "var(--paper-2)",
              border: "0.5px solid var(--rule)",
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "var(--ink)",
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                base: "Base",
                otimista: "Otimista",
                pessimista: "Pesadelo",
              };
              const n = String(name);
              return [
                `R$ ${Number(value).toLocaleString("pt-BR")}`,
                labels[n] ?? n,
              ];
            }}
            labelFormatter={(v) => `Dia ${v}`}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Manual legend */}
      <div
        className="flex items-center"
        style={{
          gap: 16,
          marginTop: 8,
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          color: "var(--text-tertiary)",
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 16,
              height: 2.5,
              background: "var(--grafite-2)",
              borderRadius: 1,
              display: "inline-block",
            }}
          />
          Base
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 16,
              height: 0,
              borderTop: "1.5px dashed var(--gain)",
              display: "inline-block",
            }}
          />
          Otimista
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 16,
              height: 0,
              borderTop: "1.5px dashed var(--loss)",
              display: "inline-block",
            }}
          />
          Pesadelo
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 12,
              height: 8,
              background: "var(--grafite-2)",
              opacity: 0.12,
              borderRadius: 1,
              display: "inline-block",
            }}
          />
          Incerteza
        </span>
      </div>
    </div>
  );
}
