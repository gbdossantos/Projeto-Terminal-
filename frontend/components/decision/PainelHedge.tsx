"use client";

import type { HedgeResult } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props {
  hedge: HedgeResult | null;
}

const semaforoMap: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  recomendado: { dot: "var(--loss)", text: "var(--loss-2)", bg: "rgba(220, 38, 38, 0.10)", border: "rgba(220, 38, 38, 0.27)", label: "Protecao recomendada" },
  opcional: { dot: "var(--amber)", text: "var(--amber)", bg: "rgba(217, 119, 6, 0.10)", border: "rgba(217, 119, 6, 0.27)", label: "Protecao opcional" },
  desnecessario: { dot: "var(--gain)", text: "var(--gain-2)", bg: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.27)", label: "Margem confortavel" },
};

export function PainelHedge({ hedge }: Props) {
  if (!hedge) {
    return (
      <div
        className="px-5 py-4 rounded-xl text-[13px]"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)", color: "var(--ink-3)" }}
      >
        Lote pequeno demais para hedge com futuros B3 (minimo ~165@, 1 contrato = 330@)
      </div>
    );
  }

  const s = semaforoMap[hedge.semaforo_hedge];

  return (
    <div className="space-y-4">
      {/* Semaforo */}
      <div
        className="flex items-center gap-3.5 px-[18px] py-3.5 rounded-[10px]"
        style={{ background: s.bg, border: `0.5px solid ${s.border}` }}
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
        <div>
          <p className="text-[13px] font-medium" style={{ color: s.text }}>{s.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {hedge.contrato_selecionado.codigo} · {hedge.contratos_necessarios} contrato(s) · {fmtPct(hedge.cobertura_pct, 0)} coberto
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-xl px-6 py-5"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)" }}
      >
        <p className="text-[13px] font-medium mb-4" style={{ color: "var(--ink)" }}>
          Seu lote em 3 cenarios
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={hedge.cenarios_grafico}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--rule)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              stroke="var(--ink-3)" fontSize={11} tickLine={false} axisLine={false}
              tick={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <YAxis
              type="category" dataKey="cenario" width={110}
              stroke="var(--ink-3)" fontSize={11} tickLine={false} axisLine={false}
            />
            <Tooltip
              formatter={(value) => fmtBRL(Number(value))}
              contentStyle={{
                background: "var(--paper-2)", border: "0.5px solid var(--rule)",
                borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-jetbrains)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={0} stroke="var(--rule)" strokeDasharray="4 4" />
            {/*
              Paleta neutra: indigo (V19 acento técnico) + slate (cinza neutro).
              Antes: verde/vermelho — semanticamente errado porque 'sem hedge'
              nem sempre é perda (no cenário 'arroba sobe 20%' sem hedge
              lucra MAIS). A nova paleta separa 'protegido' vs 'cru' sem
              juízo de valor implícito.
            */}
            <Bar dataKey="sem_hedge" name="Sem hedge" fill="#64748B" radius={[0, 3, 3, 0]} />
            <Bar dataKey="com_hedge" name="Com hedge" fill="var(--grafite)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Justificativa */}
      <div
        className="px-4 py-3 rounded-lg text-[13px] font-medium leading-relaxed"
        style={{
          background: hedge.semaforo_hedge === "desnecessario" ? "rgba(22, 163, 74, 0.10)" : "rgba(217, 119, 6, 0.10)",
          border: `0.5px solid ${hedge.semaforo_hedge === "desnecessario" ? "rgba(22, 163, 74, 0.20)" : "rgba(217, 119, 6, 0.20)"}`,
          color: hedge.semaforo_hedge === "desnecessario" ? "var(--gain-2)" : "var(--amber)",
        }}
      >
        {hedge.justificativa}
      </div>

      {/* Cards Se travar / Se nao travar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/*
          Cards Se travar / Se nao travar — mesma paleta neutra do gráfico
          (indigo p/ ação protegida, slate p/ status quo). Sem verde/vermelho
          pra não sugerir que 'não travar' é necessariamente perda.
        */}
        {/* Se travar — indigo (V19 acento técnico) */}
        <div
          className="rounded-xl p-6"
          style={{ background: "rgba(99, 102, 241, 0.08)", border: "0.5px solid rgba(99, 102, 241, 0.27)" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--grafite-2)" }}>
            Se travar
          </p>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Preco garantido</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_travado)}/@
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Voce garante</p>
            <p className="font-mono text-lg font-medium mt-0.5" style={{ color: "var(--grafite-2)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.margem_hedgeada_brl)} de lucro
            </p>
          </div>
          <p
            className="text-[11px] mt-3 pt-3"
            style={{ color: "var(--ink-3)", borderTop: "0.5px solid rgba(99, 102, 241, 0.20)" }}
          >
            {hedge.contrato_selecionado.codigo} · {hedge.contratos_necessarios} contrato(s) ({hedge.arrobas_hedgeadas.toFixed(0)}@)
          </p>
        </div>

        {/* Se nao travar — slate (status quo, sem juizo) */}
        <div
          className="rounded-xl p-6"
          style={{ background: "rgba(100, 116, 139, 0.08)", border: "0.5px solid rgba(100, 116, 139, 0.27)" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#475569" }}>
            Se nao travar
          </p>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Preco atual</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_spot)}/@
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Se cair 20%</p>
            <p className="font-mono text-lg font-medium mt-0.5" style={{ color: "#475569", fontVariantNumeric: "tabular-nums" }}>
              {hedge.cenarios_grafico[0]?.sem_hedge < 0 ? "Perde " : "Lucro cai para "}
              {fmtBRL(hedge.cenarios_grafico[0]?.sem_hedge ?? 0)}
            </p>
          </div>
          <p
            className="text-[11px] mt-3 pt-3"
            style={{ color: "var(--ink-3)", borderTop: "0.5px solid rgba(100, 116, 139, 0.20)" }}
          >
            Nada protege suas {hedge.arrobas_totais.toFixed(0)} arrobas
          </p>
        </div>
      </div>
    </div>
  );
}
