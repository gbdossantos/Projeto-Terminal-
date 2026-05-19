"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MOCK_LOTES,
  MOCK_MERCADO,
  HOJE_ISO,
  gerarLinhaRebanho,
  fmtBRL,
  fmtData,
  type PontoLinha,
} from "@/lib/mock-data";

interface Props {
  sigmaAnualizado: number | null;
  /** Sem markers de lote (estado sem cadastro). */
  empty?: boolean;
}

// Mapeia ISO yyyy-mm-dd → timestamp (ms) para o eixo X numérico
function isoToTs(iso: string): number {
  return new Date(iso).getTime();
}

function fmtTickEixoX(ts: number): string {
  const d = new Date(ts);
  const m = d.getUTCMonth();
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[m]}/26`;
}

export function LinhaDoRebanho({ sigmaAnualizado, empty = false }: Props) {
  const pontos = useMemo(() => gerarLinhaRebanho(sigmaAnualizado), [sigmaAnualizado]);

  // Cursor: padrao em "hoje". Hover muda; mouseleave volta.
  // (Posicao "ao soltar fica" — sessao apenas, nao localStorage.)
  const [cursorTs, setCursorTs] = useState<number>(isoToTs(HOJE_ISO));

  // Converte pontos para shape do Recharts (ts numerico no eixo X)
  const data = useMemo(
    () => pontos.map((p: PontoLinha) => ({
      ts: isoToTs(p.data),
      realizado: p.realizado,
      esperado: p.esperado,
      sigma1: p.sigma1_low != null && p.sigma1_high != null
        ? [p.sigma1_low, p.sigma1_high] : undefined,
      sigma2: p.sigma2_low != null && p.sigma2_high != null
        ? [p.sigma2_low, p.sigma2_high] : undefined,
    })),
    [pontos],
  );

  const cursorPonto = useMemo(() => {
    // Encontra ponto mais proximo do cursorTs
    let best = data[0];
    let bestDelta = Infinity;
    for (const p of data) {
      const d = Math.abs(p.ts - cursorTs);
      if (d < bestDelta) {
        best = p;
        bestDelta = d;
      }
    }
    return best;
  }, [data, cursorTs]);

  const cursorValor = cursorPonto?.realizado ?? cursorPonto?.esperado ?? null;

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 24, left: 8, bottom: 8 }}
          onMouseMove={(state) => {
            if (state && state.activeLabel != null) {
              setCursorTs(Number(state.activeLabel));
            }
          }}
          onMouseLeave={() => setCursorTs(isoToTs(HOJE_ISO))}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="var(--rule)"
            strokeWidth={0.5}
          />

          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            // 1 tick por mês — evita repetir "mai/26 mai/26 mai/26..." quando
            // pontos da série caem dentro do mesmo mês.
            ticks={(() => {
              if (!data.length) return [];
              const ts0 = data[0].ts;
              const tsN = data[data.length - 1].ts;
              const ticks: number[] = [];
              const cur = new Date(ts0);
              cur.setUTCDate(1); // primeiro dia do mês
              while (cur.getTime() <= tsN) {
                ticks.push(cur.getTime());
                cur.setUTCMonth(cur.getUTCMonth() + 1);
              }
              return ticks;
            })()}
            tickFormatter={fmtTickEixoX}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--grafite)",
            }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => `R$ ${v}`}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--grafite)",
            }}
            axisLine={false}
            tickLine={false}
            domain={[280, 380]}
            ticks={[280, 300, 320, 340, 360, 380]}
            width={48}
          />

          {/* Banda ±2σ (mais clara, atrás) */}
          {sigmaAnualizado != null && (
            <Area
              dataKey="sigma2"
              fill="var(--rule)"
              fillOpacity={0.45}
              stroke="none"
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          {/* Banda ±1σ (mais escura, na frente) */}
          {sigmaAnualizado != null && (
            <Area
              dataKey="sigma1"
              fill="var(--rule-strong)"
              fillOpacity={0.55}
              stroke="none"
              isAnimationActive={false}
              connectNulls={false}
            />
          )}

          {/* Break-even horizontal (tracejado) */}
          <ReferenceLine
            y={MOCK_MERCADO.break_even}
            stroke="var(--loss)"
            strokeWidth={1}
            strokeDasharray="3 4"
            ifOverflow="extendDomain"
            label={{
              value: `break-even · R$ ${fmtBRL(MOCK_MERCADO.break_even)}/@`,
              position: "right",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--loss)",
            }}
          />

          {/* Cursor vertical */}
          <ReferenceLine
            x={cursorTs}
            stroke="var(--ink)"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{
              value: cursorValor != null
                ? `R$ ${fmtBRL(cursorValor)}/@`
                : "",
              position: "top",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--ink)",
            }}
          />

          {/* Linha "hoje" — vertical fina */}
          <ReferenceLine
            x={isoToTs(HOJE_ISO)}
            stroke="var(--ink)"
            strokeWidth={0.5}
            strokeDasharray="2 3"
            label={{
              value: "hoje",
              position: "bottom",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              fill: "var(--ink-3)",
            }}
          />

          {/* Marcadores de saída por lote (escondidos em estado vazio).
              Ordenados por data → offset vertical alterna pra evitar sobreposição
              quando 3 lotes caem no mesmo trimestre. */}
          {!empty && [...MOCK_LOTES]
            .sort((a, b) => isoToTs(a.data_saida) - isoToTs(b.data_saida))
            .map((lote, i) => {
              const ts = isoToTs(lote.data_saida);
              const ponto = data.find((d) => d.ts === ts);
              const y = ponto?.esperado ?? MOCK_MERCADO.bgi_q26_ago;
              // Offset alternado por ordem: 0 = alto, 1 = mais alto, 2 = topo
              const offsetY = -12 - i * 18;
              return (
                <ReferenceDot
                  key={lote.id}
                  x={ts}
                  y={y}
                  r={4}
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
                    const cx = viewBox?.cx ?? 0;
                    const cy = viewBox?.cy ?? 0;
                    return (
                      <g>
                        {/* Linha guia vertical pequena conectando o ponto ao label */}
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx}
                          y2={cy + offsetY + 14}
                          stroke="var(--rule-strong)"
                          strokeWidth={0.5}
                          strokeDasharray="1 2"
                        />
                        <text
                          x={cx}
                          y={cy + offsetY}
                          textAnchor="middle"
                          fontFamily="var(--font-mono)"
                          fontSize={9}
                          fill="var(--ink-2)"
                        >
                          <tspan x={cx} dy={0}>{fmtData(lote.data_saida)}</tspan>
                          <tspan x={cx} dy={11} fill="var(--ink)">
                            {lote.nome}
                          </tspan>
                          <tspan x={cx} dy={11} fill="var(--ink-3)">
                            {lote.num_animais.toLocaleString("pt-BR")} cab
                          </tspan>
                        </text>
                      </g>
                    );
                  }}
                />
              );
            })}

          {/* Linha "realizado" (sólida, passado) */}
          <Line
            dataKey="realizado"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* Linha "esperado" (tracejada, projetado) */}
          <Line
            dataKey="esperado"
            stroke="var(--grafite)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          <Tooltip
            cursor={false}
            content={() => null}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legenda manual */}
      <div
        className="flex items-center"
        style={{
          gap: 18,
          marginTop: 4,
          paddingLeft: 56,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-3)",
        }}
      >
        <LegendaItem swatch={<span style={{ display: "inline-block", width: 16, height: 1.5, background: "var(--ink)" }} />}>
          realizado · spot MS
        </LegendaItem>
        <LegendaItem swatch={<span style={{ display: "inline-block", width: 16, borderTop: "1.5px dashed var(--grafite)" }} />}>
          esperado · curva BGI
        </LegendaItem>
        <LegendaItem swatch={<span style={{ display: "inline-block", width: 14, height: 8, background: "var(--rule-strong)", opacity: 0.55 }} />}>
          ±1σ · provável
        </LegendaItem>
        <LegendaItem swatch={<span style={{ display: "inline-block", width: 14, height: 8, background: "var(--rule)", opacity: 0.45 }} />}>
          ±2σ · 95%
        </LegendaItem>
      </div>
    </div>
  );
}

function LegendaItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}
