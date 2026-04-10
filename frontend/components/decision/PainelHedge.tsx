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
  recomendado: { dot: "#B54134", text: "#D4614A", bg: "#B5413418", border: "#B5413444", label: "Protecao recomendada" },
  opcional: { dot: "#C89B3C", text: "#C89B3C", bg: "#C89B3C18", border: "#C89B3C44", label: "Protecao opcional" },
  desnecessario: { dot: "#4A5D3A", text: "#6B8F5A", bg: "#4A5D3A18", border: "#4A5D3A44", label: "Margem confortavel" },
};

export function PainelHedge({ hedge }: Props) {
  if (!hedge) {
    return (
      <div
        className="px-5 py-4 rounded-xl text-[13px]"
        style={{ background: "#1A1814", border: "0.5px solid #2A2820", color: "#6B6860" }}
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
          <p className="text-xs mt-0.5" style={{ color: "#6B6860" }}>
            {hedge.contrato_selecionado.codigo} · {hedge.contratos_necessarios} contrato(s) · {fmtPct(hedge.cobertura_pct, 0)} coberto
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-xl px-6 py-5"
        style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}
      >
        <p className="text-[13px] font-medium mb-4" style={{ color: "#F5F1E8" }}>
          Seu lote em 3 cenarios
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={hedge.cenarios_grafico}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="#2A2820" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              stroke="#6B6860" fontSize={11} tickLine={false} axisLine={false}
              tick={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <YAxis
              type="category" dataKey="cenario" width={110}
              stroke="#6B6860" fontSize={11} tickLine={false} axisLine={false}
            />
            <Tooltip
              formatter={(value) => fmtBRL(Number(value))}
              contentStyle={{
                background: "#1A1814", border: "0.5px solid #2A2820",
                borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-jetbrains)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={0} stroke="#2A2820" strokeDasharray="4 4" />
            <Bar dataKey="sem_hedge" name="Sem hedge" fill="#B54134" radius={[0, 3, 3, 0]} />
            <Bar dataKey="com_hedge" name="Com hedge" fill="#4A5D3A" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Justificativa */}
      <div
        className="px-4 py-3 rounded-lg text-[13px] font-medium leading-relaxed"
        style={{
          background: hedge.semaforo_hedge === "desnecessario" ? "#4A5D3A18" : "#C89B3C18",
          border: `0.5px solid ${hedge.semaforo_hedge === "desnecessario" ? "#4A5D3A33" : "#C89B3C33"}`,
          color: hedge.semaforo_hedge === "desnecessario" ? "#6B8F5A" : "#C89B3C",
        }}
      >
        {hedge.justificativa}
      </div>

      {/* Cards Se travar / Se nao travar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Se travar */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#4A5D3A18", border: "0.5px solid #4A5D3A44" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#6B8F5A" }}>
            Se travar
          </p>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "#6B6860" }}>Preco garantido</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_travado)}/@
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "#6B6860" }}>Voce garante</p>
            <p className="font-mono text-lg font-medium mt-0.5" style={{ color: "#6B8F5A", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.margem_hedgeada_brl)} de lucro
            </p>
          </div>
          <p
            className="text-[11px] mt-3 pt-3"
            style={{ color: "#6B6860", borderTop: "0.5px solid #4A5D3A33" }}
          >
            {hedge.contrato_selecionado.codigo} · {hedge.contratos_necessarios} contrato(s) ({hedge.arrobas_hedgeadas.toFixed(0)}@)
          </p>
        </div>

        {/* Se nao travar */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#B5413418", border: "0.5px solid #B5413444" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#D4614A" }}>
            Se nao travar
          </p>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "#6B6860" }}>Preco atual</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_spot)}/@
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px]" style={{ color: "#6B6860" }}>Se cair 20%</p>
            <p className="font-mono text-lg font-medium mt-0.5" style={{ color: "#D4614A", fontVariantNumeric: "tabular-nums" }}>
              {hedge.cenarios_grafico[0]?.sem_hedge < 0 ? "Perde " : "Lucro cai para "}
              {fmtBRL(hedge.cenarios_grafico[0]?.sem_hedge ?? 0)}
            </p>
          </div>
          <p
            className="text-[11px] mt-3 pt-3"
            style={{ color: "#6B6860", borderTop: "0.5px solid #B5413433" }}
          >
            Nada protege suas {hedge.arrobas_totais.toFixed(0)} arrobas
          </p>
        </div>
      </div>
    </div>
  );
}
