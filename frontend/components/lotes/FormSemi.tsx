"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SemiconfinamentoRequest, SemiconfinamentoResponse } from "@/lib/types";
import { calcularSemiconfinamento, fetchCotacoes } from "@/lib/api";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Semaforo } from "@/components/decision/Semaforo";
import { TabelaCenarios } from "@/components/decision/TabelaCenarios";
import { PerguntaInvertida } from "@/components/decision/PerguntaInvertida";
import { PainelHedge } from "@/components/decision/PainelHedge";
import { Field } from "@/components/lotes/Field";

const DEFAULTS: SemiconfinamentoRequest = {
  num_animais: 200,
  peso_entrada_kg: 360,
  peso_saida_estimado_kg: 490,
  dias_ciclo: 110,
  custo_reposicao_total: 390000,
  custo_arrendamento_dia: 2.0,
  custo_manutencao_pasto_dia: 0.8,
  consumo_suplemento_kg_dia: 3.5,
  custo_suplemento_kg: 0.95,
  custo_sanidade_dia: 0.7,
  custo_mao_obra_dia: 1.1,
  preco_venda: 315,
  rendimento_carcaca: 0.53,
};

export default function FormSemi() {
  const [form, setForm] = useState(DEFAULTS);
  const [data, setData] = useState<SemiconfinamentoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCotacoes()
      .then((c) => {
        if (c.arroba_boi_gordo) setForm((f) => ({ ...f, preco_venda: c.arroba_boi_gordo! }));
      })
      .catch(() => {});
  }, []);

  const calculate = useCallback(async (req: SemiconfinamentoRequest) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularSemiconfinamento(req));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => calculate(form), 400);
    return () => clearTimeout(debounceRef.current);
  }, [form, calculate]);

  const set = (key: keyof SemiconfinamentoRequest, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const r = data?.resultado;

  return (
    <>
      {/* Form */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Animais" value={form.num_animais} onChange={(v) => set("num_animais", v)} />
          <Field label="Peso entrada (kg)" value={form.peso_entrada_kg} onChange={(v) => set("peso_entrada_kg", v)} />
          <Field label="Peso saida (kg)" value={form.peso_saida_estimado_kg} onChange={(v) => set("peso_saida_estimado_kg", v)} />
          <Field label="Dias de ciclo" value={form.dias_ciclo} onChange={(v) => set("dias_ciclo", v)} />
          <Field label="Rendimento carcaca (%)" value={(form.rendimento_carcaca ?? 0.53) * 100} onChange={(v) => set("rendimento_carcaca", v / 100)} />
          <Field label="Reposicao total (R$)" value={form.custo_reposicao_total} onChange={(v) => set("custo_reposicao_total", v)} step={5000} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Custos (R$/cab/dia)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Arrendamento" value={form.custo_arrendamento_dia} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
            <Field label="Manutencao pasto" value={form.custo_manutencao_pasto_dia} onChange={(v) => set("custo_manutencao_pasto_dia", v)} step={0.1} />
            <Field label="Consumo suplemento (kg/dia)" value={form.consumo_suplemento_kg_dia} onChange={(v) => set("consumo_suplemento_kg_dia", v)} step={0.1} />
            <Field label="Custo suplemento (R$/kg)" value={form.custo_suplemento_kg} onChange={(v) => set("custo_suplemento_kg", v)} step={0.05} />
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Field label="Cotacao arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-bg border border-danger/30 rounded-lg px-5 py-3 text-sm text-danger">{error}</div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-12 text-t-tertiary text-sm">Calculando...</div>
      )}

      {/* Results */}
      {r && data && (
        <>
          <Semaforo
            status={form.preco_venda < r.break_even_price ? "vermelho" : r.margem_percentual < 0.08 ? "amarelo" : "verde"}
            titulo={form.preco_venda < r.break_even_price ? "Abaixo do break-even" : r.margem_percentual < 0.08 ? "Margem apertada" : "Margem saudavel"}
            detalhe={`Margem de ${fmtPct(r.margem_percentual)} — spread de ${fmtBRL(form.preco_venda - r.break_even_price)}/@ sobre o break-even`}
          />

          <PainelMercado cotacoes={data.cotacoes} breakEven={r.break_even_price} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Custo por arroba" value={r.custo_por_arroba.toFixed(2)} unit="/@" />
            <MetricCard label="Break-even" value={r.break_even_price.toFixed(2)} unit="/@" delta={`spread R$ ${(form.preco_venda - r.break_even_price).toFixed(0)}`} deltaType={form.preco_venda > r.break_even_price ? "positive" : "negative"} />
            <MetricCard label="Margem bruta" value={fmtBRL(r.margem_bruta)} delta={fmtPct(r.margem_percentual)} deltaType={r.margem_percentual > 0.08 ? "positive" : "negative"} />
            <MetricCard label="ROI anualizado" value={fmtPct(r.roi_anualizado)} />
          </div>

          <MetricCard label="Suplementacao por arroba" value={fmtBRL(r.custo_suplementacao_por_arroba, 2) + "/@"} compact />

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Painel de impacto economico</h2>
            <TabelaCenarios cenarios={data.impacto.cenarios} />
            <PerguntaInvertida texto={data.impacto.pergunta_invertida} tipo={data.impacto.cenarios.some((c) => c.semaforo === "vermelho") ? "alerta" : "ok"} />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Protecao com futuros B3</h2>
            <PainelHedge hedge={data.hedge} />
          </div>
        </>
      )}
    </>
  );
}
