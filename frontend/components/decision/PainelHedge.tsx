"use client";

import type { HedgeResult } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Props {
  hedge: HedgeResult | null;
}

const semaforoLabel: Record<string, { label: string; status: "verde" | "amarelo" | "vermelho" }> = {
  recomendado: { label: "Protecao recomendada", status: "vermelho" },
  opcional: { label: "Protecao opcional", status: "amarelo" },
  desnecessario: { label: "Margem confortavel", status: "verde" },
};

const dotColor: Record<string, string> = {
  verde: "bg-success",
  amarelo: "bg-warning",
  vermelho: "bg-danger",
};

const bgColor: Record<string, string> = {
  verde: "bg-success-bg border-l-success",
  amarelo: "bg-warning-bg border-l-warning",
  vermelho: "bg-danger-bg border-l-danger",
};

export function PainelHedge({ hedge }: Props) {
  if (!hedge) {
    return (
      <div className="border border-border rounded-lg px-5 py-4 text-sm text-t-tertiary">
        Lote pequeno demais para hedge com futuros B3 (minimo ~165@, 1 contrato = 330@)
      </div>
    );
  }

  const s = semaforoLabel[hedge.semaforo_hedge];

  return (
    <div className="space-y-5">
      {/* Semaforo */}
      <div className={`flex items-center gap-4 px-5 py-4 rounded-lg border-l-4 ${bgColor[s.status]}`}>
        <div className={`w-3 h-3 rounded-full ${dotColor[s.status]} shrink-0`} />
        <div>
          <p className="text-sm font-medium text-t-primary">{s.label}</p>
          <p className="text-sm text-t-secondary">
            {hedge.contrato_selecionado.codigo} &middot; {hedge.contratos_necessarios} contrato(s) &middot; {fmtPct(hedge.cobertura_pct, 0)} coberto
          </p>
        </div>
      </div>

      {/* Chart */}
      <div>
        <p className="text-sm font-medium text-t-primary mb-3">Seu lote em 3 cenarios</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={hedge.cenarios_grafico}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="cenario"
              width={110}
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => fmtBRL(Number(value))}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--text-primary)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={0} stroke="var(--border)" strokeDasharray="4 4" />
            <Bar dataKey="sem_hedge" name="Sem hedge" fill="var(--danger)" radius={[0, 3, 3, 0]} />
            <Bar dataKey="com_hedge" name="Com hedge" fill="var(--success)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-success/20 rounded-lg px-5 py-4 bg-success-bg">
          <p className="text-xs font-medium text-success uppercase tracking-wider mb-3">Se travar</p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-t-tertiary">Preco garantido</p>
              <p className="text-xl font-mono font-medium text-t-primary">{fmtBRL(hedge.preco_travado)}/@</p>
            </div>
            <div>
              <p className="text-[11px] text-t-tertiary">Voce garante</p>
              <p className="text-xl font-mono font-medium text-t-primary">{fmtBRL(hedge.margem_hedgeada_brl)} de lucro</p>
            </div>
            <p className="text-[11px] text-t-tertiary">
              {hedge.contrato_selecionado.codigo} &middot; {hedge.contratos_necessarios} contrato(s) ({hedge.arrobas_hedgeadas.toFixed(0)}@)
            </p>
          </div>
        </div>

        <div className="border border-danger/20 rounded-lg px-5 py-4 bg-danger-bg">
          <p className="text-xs font-medium text-danger uppercase tracking-wider mb-3">Se nao travar</p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-t-tertiary">Preco atual</p>
              <p className="text-xl font-mono font-medium text-t-primary">{fmtBRL(hedge.preco_spot)}/@</p>
            </div>
            <div>
              <p className="text-[11px] text-t-tertiary">Se cair 20%</p>
              <p className="text-xl font-mono font-medium text-danger">
                {hedge.cenarios_grafico[0]?.sem_hedge < 0 ? "Perde " : "Lucro cai para "}
                {fmtBRL(hedge.cenarios_grafico[0]?.sem_hedge ?? 0)}
              </p>
            </div>
            <p className="text-[11px] text-t-tertiary">
              Nada protege suas {hedge.arrobas_totais.toFixed(0)} arrobas
            </p>
          </div>
        </div>
      </div>

      {/* Justificativa */}
      <div className={`px-5 py-4 rounded-lg border text-sm font-medium leading-relaxed ${
        hedge.semaforo_hedge === "desnecessario"
          ? "bg-success-bg border-success/30 text-success"
          : "bg-warning-bg border-warning/30 text-warning"
      }`}>
        {hedge.justificativa}
      </div>
    </div>
  );
}
