"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface FanDataPoint {
  dia: number;
  base: number;
  otimista: number;
  pessimista: number;
  fanMax: number;
  fanMin: number;
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

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: 40, bottom: 20 }}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
            opacity={0.6}
          />

          <XAxis
            dataKey="dia"
            tickFormatter={(v) => `dia ${v}`}
            tick={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              fill: "var(--text-tertiary)",
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
              fill: "var(--text-tertiary)",
            }}
            axisLine={false}
            tickLine={false}
            width={38}
          />

          <ReferenceLine
            y={0}
            stroke="var(--border-subtle)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />

          {/* Fan area — two stacked areas to create band effect */}
          <Area
            dataKey="fanMax"
            stroke="none"
            fill="var(--brand)"
            fillOpacity={0.07}
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            dataKey="fanMin"
            stroke="none"
            fill="var(--bg-deep)"
            fillOpacity={1}
            legendType="none"
            isAnimationActive={false}
          />

          {/* Scenario lines */}
          <Line
            dataKey="otimista"
            stroke="var(--green)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            legendType="none"
          />
          <Line
            dataKey="pessimista"
            stroke="var(--red)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            legendType="none"
          />
          <Line
            dataKey="base"
            stroke="var(--brand)"
            strokeWidth={2.5}
            dot={{ fill: "var(--brand)", r: 3.5, strokeWidth: 0 }}
            activeDot={{
              fill: "var(--brand-fg)",
              stroke: "var(--brand)",
              strokeWidth: 2,
              r: 4.5,
            }}
            legendType="none"
          />

          <ReferenceLine
            x={data.length > 2 ? data[Math.floor(data.length / 2)].dia : undefined}
            stroke="var(--brand)"
            strokeWidth={0.5}
            opacity={0.25}
          />

          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "var(--text-primary)",
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                base: "Base",
                otimista: "Otimista",
                pessimista: "Pesadelo",
              };
              const n = String(name);
              if (n === "fanMax" || n === "fanMin") return ["", ""];
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
              background: "var(--brand)",
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
              borderTop: "1.5px dashed var(--green)",
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
              borderTop: "1.5px dashed var(--red)",
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
              background: "var(--brand)",
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
