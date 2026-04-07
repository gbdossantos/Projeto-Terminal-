"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RecriaRequest, RecriaResponse } from "@/lib/types";
import { calcularRecria, fetchCotacoes } from "@/lib/api";
import { fmtBRL } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Field } from "@/components/lotes/Field";

const DEFAULTS: RecriaRequest = {
  num_animais: 280,
  peso_entrada_kg: 195,
  peso_saida_estimado_kg: 370,
  dias_ciclo: 210,
  custo_aquisicao_total: 0,
  custo_nutricao_dia: 3.2,
  custo_sanidade_dia: 0.7,
  custo_mao_obra_dia: 0.9,
  custo_arrendamento_dia: 1.8,
};

export default function FormRecria() {
  const [form, setForm] = useState(DEFAULTS);
  const [data, setData] = useState<RecriaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCotacoes().catch(() => {});
  }, []);

  const calculate = useCallback(async (req: RecriaRequest) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularRecria(req));
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

  const set = (key: keyof RecriaRequest, value: number) =>
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
          <Field label="Custo aquisicao (R$) — 0 se proprio" value={form.custo_aquisicao_total} onChange={(v) => set("custo_aquisicao_total", v)} step={1000} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Custos (R$/cab/dia)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Nutricao" value={form.custo_nutricao_dia} onChange={(v) => set("custo_nutricao_dia", v)} step={0.1} />
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
            <Field label="Arrendamento" value={form.custo_arrendamento_dia} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
          </div>
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
          {data.cotacoes && <PainelMercado cotacoes={data.cotacoes} />}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="GMD estimado" value={`${r.gmd_estimado}`} unit="kg/dia" />
            <MetricCard label="Kg ganho total" value={`${r.kg_ganho_total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} unit="kg" />
            <MetricCard label="Custo por kg ganho" value={`${r.custo_por_kg_ganho.toFixed(2)}`} unit="/kg" />
            <MetricCard label="Custo por cabeca" value={fmtBRL(r.custo_por_cabeca)} />
          </div>

          <MetricCard label="Custo total da fase" value={fmtBRL(r.custo_total)} compact />
        </>
      )}
    </>
  );
}
