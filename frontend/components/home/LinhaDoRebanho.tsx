"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { gerarLinhaRebanho, fmtNum, type PontoLinha } from "@/lib/linha-rebanho";

// Cone de incerteza: a faixa σ é o protagonista visual — a pergunta que o
// gráfico responde primeiro é "quanta incerteza tem nessa projeção?".
// Hierarquia: 1) largura do cone, 2) encontro realizado→projetado ("hoje"),
// 3) linha esperada no centro, 4) break-even como referência.

interface Props {
  /** σ anualizado (backend). Null → sem cone (só linha esperada). */
  sigmaAnualizado: number | null;
  /** Histórico real de arroba (CEPEA). */
  historico: Array<{ data: string; valor: number }>;
  /** Spot MS atual em R$/@ (CEPEA SP + basis). */
  spotAtual: number | null;
  /** Contrato BGI alvo (mais distante da curva). */
  bgi: { vencimento: string; preco_ajuste: number } | null;
  /** Break-even do perfil. Null/0 = não configurado → sem linha, com aviso. */
  breakEven: number | null;
  /**
   * Se o produtor tem lote cadastrado. O gráfico em si é estado de MERCADO
   * (renderiza sempre); só a camada da operação — linha de break-even e o
   * aviso de BE não configurado — depende de lote.
   */
  temLote: boolean;
}

function isoToTs(iso: string): number {
  return new Date(iso).getTime();
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtTickEixoX(ts: number): string {
  const d = new Date(ts);
  return `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

export function LinhaDoRebanho({
  sigmaAnualizado,
  historico,
  spotAtual,
  bgi,
  breakEven,
  temLote,
}: Props) {
  // Camada da operação: BE só com lote. BE=0 significa "não configurado" —
  // nunca desenhar linha em R$ 0.
  const be = temLote && breakEven != null && breakEven > 0 ? breakEven : null;

  const pontos = useMemo(
    () => gerarLinhaRebanho({ sigmaAnualizado, historico, spotAtual, bgi }),
    [sigmaAnualizado, historico, spotAtual, bgi],
  );

  // Cursor: padrão em "hoje". Hover muda; mouseleave volta.
  const hojeReal = new Date();
  hojeReal.setHours(0, 0, 0, 0);
  const [cursorTs, setCursorTs] = useState<number>(hojeReal.getTime());

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

  // Label do cursor: valor + range ±1σ quando o ponto está dentro do cone
  const cursorLabel = useMemo(() => {
    if (!cursorPonto) return "";
    const valor = cursorPonto.realizado ?? cursorPonto.esperado;
    if (valor == null) return "";
    const s1 = cursorPonto.sigma1;
    if (s1 && Math.abs(s1[1] - s1[0]) > 0.5) {
      return `R$ ${fmtNum(valor)}/@ · ±1σ ${fmtNum(s1[0], 0)}–${fmtNum(s1[1], 0)}`;
    }
    return `R$ ${fmtNum(valor)}/@`;
  }, [cursorPonto]);

  // Domínio Y dinâmico: enquadra realizado + cone + BE com ~10% de padding.
  const yDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [];
    if (be != null) vals.push(be);
    for (const p of pontos) {
      if (p.realizado != null) vals.push(p.realizado);
      if (p.esperado != null) vals.push(p.esperado);
      if (p.sigma2_low != null) vals.push(p.sigma2_low);
      if (p.sigma2_high != null) vals.push(p.sigma2_high);
    }
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(8, (max - min) * 0.1);
    return [Math.floor((min - pad) / 10) * 10, Math.ceil((max + pad) / 10) * 10];
  }, [pontos, be]);

  const yTicks = useMemo(() => {
    const [lo, hi] = yDomain;
    const span = hi - lo;
    const step = span <= 60 ? 10 : span <= 120 ? 20 : 40;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    return ticks;
  }, [yDomain]);

  // Ticks mensais em ordem cronológica (1 por mês, ano correto no label)
  const xTicks = useMemo(() => {
    if (!data.length) return [];
    const ts0 = data[0].ts;
    const tsN = data[data.length - 1].ts;
    const ticks: number[] = [];
    const cur = new Date(ts0);
    cur.setUTCDate(1);
    while (cur.getTime() <= tsN) {
      ticks.push(cur.getTime());
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return ticks;
  }, [data]);

  // Sem dados reais suficientes: estado indisponível honesto (nunca mock).
  if (data.length < 2) {
    return (
      <div
        style={{
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "0.5px dashed var(--rule-strong)",
          borderRadius: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-3)",
        }}
      >
        cotações indisponíveis no momento
      </div>
    );
  }

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
            ticks={xTicks}
            tickFormatter={fmtTickEixoX}
            tick={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fill: "var(--ink-3)",
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
              fill: "var(--ink-3)",
            }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
            ticks={yTicks}
            width={48}
          />

          {/* CONE DE INCERTEZA — protagonista. Banda ±2σ (mais transparente, atrás) */}
          <Area
            dataKey="sigma2"
            activeDot={false}
            fill="var(--grafite)"
            fillOpacity={0.09}
            stroke="none"
            isAnimationActive={false}
            connectNulls={false}
          />
          {/* Banda ±1σ (mais opaca, na frente) — mesma família índigo */}
          <Area
            dataKey="sigma1"
            activeDot={false}
            fill="var(--grafite)"
            fillOpacity={0.18}
            stroke="none"
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* Break-even — referência discreta, só quando configurado */}
          {be != null && (
            <ReferenceLine
              y={be}
              stroke="var(--loss)"
              strokeOpacity={0.45}
              strokeWidth={1}
              strokeDasharray="3 4"
              ifOverflow="extendDomain"
              label={{
                value: `break-even R$ ${fmtNum(be)}`,
                position: "insideBottomLeft",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fill: "var(--ink-3)",
                offset: 8,
              }}
            />
          )}

          {/* Cursor vertical com valor + range ±1σ */}
          <ReferenceLine
            x={cursorTs}
            stroke="var(--ink)"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{
              value: cursorLabel,
              position: "insideTop",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fill: "var(--ink)",
              offset: 6,
            }}
          />

          {/* Marca "hoje" — separa realizado de projetado */}
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

          {/* Realizado (passado) — sólida, fato consumado */}
          <Line
            dataKey="realizado"
            activeDot={false}
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* Esperado (curva BGI) — mediana do cone, peso menor que a faixa */}
          <Line
            dataKey="esperado"
            activeDot={false}
            stroke="var(--grafite)"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          <Tooltip cursor={false} content={() => null} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legenda — nota de rodapé */}
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
        {sigmaAnualizado != null && (
          <LegendaItem swatch={<span style={{ display: "inline-block", width: 14, height: 8, background: "var(--grafite)", opacity: 0.18 }} />}>
            ±1σ · provável
          </LegendaItem>
        )}
        {sigmaAnualizado != null && (
          <LegendaItem swatch={<span style={{ display: "inline-block", width: 14, height: 8, background: "var(--grafite)", opacity: 0.09 }} />}>
            ±2σ · 95%
          </LegendaItem>
        )}
        {temLote && be == null && (
          <span>
            break-even não configurado ·{" "}
            <Link href="/configuracoes" style={{ color: "var(--grafite)", textDecoration: "none" }}>
              configure no perfil →
            </Link>
          </span>
        )}
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
