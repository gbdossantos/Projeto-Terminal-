"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL } from "@/lib/utils/format";
import type { HistoricoPreset } from "@/lib/types";

/**
 * Camada 2 — gráfico tradicional (Recharts) atrás de toggle. A metáfora-hero
 * é a visão default; isto é alternativa pra quem quer a leitura convencional.
 * Barras = margem (R$/@) de cada cenário; linha de referência 0 = break-even.
 */
export default function GraficoTradicional({ presets }: { presets: HistoricoPreset[] }) {
  const [aberto, setAberto] = useState(false);

  const data = presets
    .filter((p) => !p.indisponivel)
    .map((p) => ({ nome: p.titulo, margem: p.margem_cenario }));

  return (
    <section style={{ borderTop: "0.5px solid var(--rule)", paddingTop: 16 }}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: "var(--ink-2)",
        }}
      >
        {aberto ? "↑ Fechar gráfico" : "↓ Ver gráfico tradicional"}
      </button>

      {aberto && data.length > 0 && (
        <div style={{ marginTop: 16, height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--ink-3)" }}
                axisLine={{ stroke: "var(--rule)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--ink-3)" }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) => `${fmtBRL(v, 0)}`}
              />
              <ReferenceLine y={0} stroke="var(--ink)" strokeWidth={1} />
              <Tooltip
                cursor={{ fill: "var(--paper-3)" }}
                formatter={(value) => [`${fmtBRL(Number(value), 0)}/@`, "margem"]}
                contentStyle={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  borderRadius: 6,
                  border: "0.5px solid var(--rule-strong)",
                }}
              />
              <Bar dataKey="margem" radius={[2, 2, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.margem >= 0 ? "var(--gain)" : "var(--loss)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
