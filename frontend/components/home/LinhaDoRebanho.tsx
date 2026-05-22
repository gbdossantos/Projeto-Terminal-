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
  gerarLinhaRebanho,
  fmtBRL,
  fmtData,
  type PontoLinha,
} from "@/lib/mock-data";

interface Props {
  sigmaAnualizado: number | null;
  /** Sem markers de lote (estado sem cadastro). */
  empty?: boolean;
  /** Histórico real de arroba (CEPEA). Se vazio/null, gráfico cai no mock. */
  historico?: Array<{ data: string; valor: number }>;
  /** Spot MS atual em R$/@ (CEPEA SP + basis MS). */
  spotAtual?: number | null;
  /** BGI próximo contrato (do /api/futuros). */
  bgi?: { vencimento: string; preco_ajuste: number } | null;
  /** Break-even médio (vindo do profile do produtor — /configuracoes). */
  breakEven?: number;
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

export function LinhaDoRebanho({
  sigmaAnualizado,
  empty = false,
  historico,
  spotAtual,
  bgi,
  breakEven,
}: Props) {
  const BE = breakEven ?? MOCK_MERCADO.break_even;
  const pontos = useMemo(
    () => gerarLinhaRebanho({ sigmaAnualizado, historico, spotAtual, bgi }),
    [sigmaAnualizado, historico, spotAtual, bgi],
  );

  // Cursor: padrao em "hoje" (data real). Hover muda; mouseleave volta.
  const hojeReal = new Date();
  hojeReal.setHours(0, 0, 0, 0);
  const [cursorTs, setCursorTs] = useState<number>(hojeReal.getTime());

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

  // Domínio Y dinâmico baseado nos dados + break-even + padding
  const yDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [BE];
    for (const p of pontos) {
      if (p.realizado != null) vals.push(p.realizado);
      if (p.esperado != null) vals.push(p.esperado);
      if (p.sigma2_low != null) vals.push(p.sigma2_low);
      if (p.sigma2_high != null) vals.push(p.sigma2_high);
    }
    if (!vals.length) return [280, 380];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(8, (max - min) * 0.08);
    // Arredonda pra múltiplos de 10 pra ticks limpos
    return [Math.floor((min - pad) / 10) * 10, Math.ceil((max + pad) / 10) * 10];
  }, [pontos]);

  const yTicks = useMemo(() => {
    const [lo, hi] = yDomain;
    const span = hi - lo;
    const step = span <= 60 ? 10 : span <= 120 ? 20 : 40;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    return ticks;
  }, [yDomain]);

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
          onMouseLeave={() => setCursorTs(hojeReal.getTime())}
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
            domain={yDomain}
            ticks={yTicks}
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

          {/* Break-even horizontal (tracejado) — label inline na esquerda pra não cortar */}
          <ReferenceLine
            y={BE}
            stroke="var(--loss)"
            strokeWidth={1}
            strokeDasharray="3 4"
            ifOverflow="extendDomain"
            label={{
              value: `BE  R$ ${fmtBRL(BE, 0)}`,
              position: "insideBottomLeft",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--loss)",
              offset: 8,
            }}
          />

          {/* Cursor vertical — label dentro do grafico pra nao invadir o titulo acima */}
          <ReferenceLine
            x={cursorTs}
            stroke="var(--ink)"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{
              value: cursorValor != null
                ? `R$ ${fmtBRL(cursorValor)}/@`
                : "",
              position: "insideTop",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--ink)",
              offset: 6,
            }}
          />

          {/* Linha "hoje" — vertical fina (data real) */}
          <ReferenceLine
            x={hojeReal.getTime()}
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
              Apenas círculos — identificação fica na legenda abaixo do gráfico
              pra evitar sobreposição de labels e labels órfãos no canto. */}
          {!empty && MOCK_LOTES.map((lote) => {
            const ts = isoToTs(lote.data_saida);
            const ponto = data.find((d) => d.ts === ts);
            const y = ponto?.esperado ?? MOCK_MERCADO.bgi_q26_ago;
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
          flexWrap: "wrap",
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

      {/* Legenda dos lotes (saídas) — referência aos círculos no gráfico */}
      {!empty && MOCK_LOTES.length > 0 && (
        <div
          className="flex items-center"
          style={{
            gap: 18,
            marginTop: 8,
            paddingLeft: 56,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-2)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--ink-3)" }}>saídas:</span>
          {[...MOCK_LOTES]
            .sort((a, b) => isoToTs(a.data_saida) - isoToTs(b.data_saida))
            .map((lote) => (
              <span key={lote.id} className="flex items-center" style={{ gap: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--paper)",
                    border: "1.5px solid var(--ink)",
                  }}
                />
                <span style={{ color: "var(--ink)" }}>{lote.nome}</span>
                <span style={{ color: "var(--ink-3)" }}>
                  {fmtData(lote.data_saida)} · {lote.num_animais.toLocaleString("pt-BR")} cab
                </span>
              </span>
            ))}
        </div>
      )}
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
