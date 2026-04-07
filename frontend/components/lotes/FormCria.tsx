"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CriaRequest, CriaResponse } from "@/lib/types";
import { calcularCria, fetchCotacoes } from "@/lib/api";
import { fmtBRL } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Field } from "@/components/lotes/Field";

const DEFAULTS: CriaRequest = {
  num_matrizes: 400,
  taxa_natalidade: 0.80,
  taxa_desmama: 0.90,
  peso_desmama_kg: 195,
  custo_nutricao_ua_ano: 480,
  custo_sanidade_ua_ano: 120,
  custo_reproducao_ua_ano: 180,
  custo_mao_obra_ua_ano: 200,
  custo_arrendamento_ua_ano: 350,
  valor_matriz: 4800,
  outros_custos_ua_ano: 80,
};

export default function FormCria() {
  const [form, setForm] = useState(DEFAULTS);
  const [data, setData] = useState<CriaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCotacoes().catch(() => {});
  }, []);

  const calculate = useCallback(async (req: CriaRequest) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularCria(req));
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

  const set = (key: keyof CriaRequest, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const r = data?.resultado;

  return (
    <>
      {/* Form */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">Rebanho</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Matrizes" value={form.num_matrizes} onChange={(v) => set("num_matrizes", v)} />
          <Field label="Taxa natalidade (%)" value={form.taxa_natalidade * 100} onChange={(v) => set("taxa_natalidade", v / 100)} />
          <Field label="Taxa desmama (%)" value={form.taxa_desmama * 100} onChange={(v) => set("taxa_desmama", v / 100)} />
          <Field label="Peso ao desmame (kg)" value={form.peso_desmama_kg} onChange={(v) => set("peso_desmama_kg", v)} />
          <Field label="Valor da matriz (R$)" value={form.valor_matriz} onChange={(v) => set("valor_matriz", v)} step={100} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Custos anuais (R$/UA/ano)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Nutricao" value={form.custo_nutricao_ua_ano} onChange={(v) => set("custo_nutricao_ua_ano", v)} step={10} />
            <Field label="Sanidade" value={form.custo_sanidade_ua_ano} onChange={(v) => set("custo_sanidade_ua_ano", v)} step={10} />
            <Field label="Reproducao" value={form.custo_reproducao_ua_ano} onChange={(v) => set("custo_reproducao_ua_ano", v)} step={10} />
            <Field label="Mao de obra" value={form.custo_mao_obra_ua_ano} onChange={(v) => set("custo_mao_obra_ua_ano", v)} step={10} />
            <Field label="Arrendamento" value={form.custo_arrendamento_ua_ano} onChange={(v) => set("custo_arrendamento_ua_ano", v)} step={10} />
            <Field label="Outros" value={form.outros_custos_ua_ano ?? 0} onChange={(v) => set("outros_custos_ua_ano", v)} step={10} />
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
            <MetricCard label="Bezerros desmamados" value={`${r.bezerros_desmamados}`} unit="cab." />
            <MetricCard label="Custo por bezerro" value={fmtBRL(r.custo_por_bezerro_produzido)} />
            <MetricCard label="Custo por matriz/ano" value={fmtBRL(r.custo_por_matriz_ano)} />
            <MetricCard label="Capital rebanho" value={fmtBRL(r.capital_rebanho)} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Kg produzido por matriz" value={`${r.kg_produzido_por_matriz}`} unit="kg" compact />
            <MetricCard label="Custo total anual" value={fmtBRL(r.custo_total_ano)} compact />
            <MetricCard label="Custo de oportunidade" value={fmtBRL(r.custo_oportunidade)} compact />
          </div>
        </>
      )}
    </>
  );
}
