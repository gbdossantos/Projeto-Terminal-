"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TerminacaoPastoRequest, TerminacaoPastoResponse } from "@/lib/types";
import { calcularTerminacaoPasto, fetchCotacoes } from "@/lib/api";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Semaforo } from "@/components/decision/Semaforo";
import { TabelaCenarios } from "@/components/decision/TabelaCenarios";
import { PerguntaInvertida } from "@/components/decision/PerguntaInvertida";
import { PainelHedge } from "@/components/decision/PainelHedge";

const DEFAULTS: TerminacaoPastoRequest = {
  num_animais: 120,
  peso_entrada_kg: 380,
  peso_saida_estimado_kg: 490,
  dias_ciclo: 90,
  custo_reposicao_total: 264000,
  custo_suplementacao_dia: 4.5,
  custo_sanidade_dia: 0.8,
  custo_mao_obra_dia: 1.2,
  custo_arrendamento_dia: 2.0,
  preco_venda: 315,
  rendimento_carcaca: 0.52,
  custo_frete_saida: 5400,
  custo_mortalidade_estimada: 3700,
};

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra transition-colors"
      />
    </div>
  );
}

export default function LotesPage() {
  const [form, setForm] = useState<TerminacaoPastoRequest>(DEFAULTS);
  const [data, setData] = useState<TerminacaoPastoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCotacoes()
      .then((c) => {
        if (c.arroba_boi_gordo) {
          setForm((f) => ({ ...f, preco_venda: c.arroba_boi_gordo! }));
        }
      })
      .catch(() => {});
  }, []);

  const calculate = useCallback(async (req: TerminacaoPastoRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await calcularTerminacaoPasto(req);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro no calculo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => calculate(form), 400);
    return () => clearTimeout(debounceRef.current);
  }, [form, calculate]);

  const set = (key: keyof TerminacaoPastoRequest, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const r = data?.resultado;
  const cdi = data?.cotacoes?.cdi_anual ?? 0.1415;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">
          Terminacao em pastagem
        </h1>
        <p className="text-sm text-t-secondary mt-1">
          Indicador central: custo por arroba produzida
        </p>
      </div>

      {/* Form */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">
          Dados do lote
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Animais" value={form.num_animais} onChange={(v) => set("num_animais", v)} />
          <Field label="Peso entrada (kg)" value={form.peso_entrada_kg} onChange={(v) => set("peso_entrada_kg", v)} />
          <Field label="Peso saida (kg)" value={form.peso_saida_estimado_kg} onChange={(v) => set("peso_saida_estimado_kg", v)} />
          <Field label="Dias de ciclo" value={form.dias_ciclo} onChange={(v) => set("dias_ciclo", v)} />
          <Field label="Rendimento carcaca (%)" value={(form.rendimento_carcaca ?? 0.52) * 100} onChange={(v) => set("rendimento_carcaca", v / 100)} />
          <Field label="Reposicao total (R$)" value={form.custo_reposicao_total} onChange={(v) => set("custo_reposicao_total", v)} step={1000} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">
            Custos operacionais (R$/cab/dia)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Suplementacao" value={form.custo_suplementacao_dia} onChange={(v) => set("custo_suplementacao_dia", v)} step={0.1} />
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
            <Field label="Arrendamento" value={form.custo_arrendamento_dia} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Frete frigorifico (R$)" value={form.custo_frete_saida ?? 0} onChange={(v) => set("custo_frete_saida", v)} step={100} />
            <Field label="Mortalidade (R$)" value={form.custo_mortalidade_estimada ?? 0} onChange={(v) => set("custo_mortalidade_estimada", v)} step={100} />
            <Field label="Cotacao arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-bg border border-danger/30 rounded-lg px-5 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-12 text-t-tertiary text-sm">Calculando...</div>
      )}

      {/* Results */}
      {r && data && (
        <>
          {/* Semaforo */}
          <Semaforo
            status={
              form.preco_venda < r.break_even_price
                ? "vermelho"
                : r.margem_percentual < 0.08
                ? "amarelo"
                : "verde"
            }
            titulo={
              form.preco_venda < r.break_even_price
                ? "Abaixo do break-even"
                : r.margem_percentual < 0.08
                ? "Margem apertada"
                : "Margem saudavel"
            }
            detalhe={`Margem de ${fmtPct(r.margem_percentual)} \u2014 spread de ${fmtBRL(form.preco_venda - r.break_even_price)}/@ sobre o break-even`}
          />

          {/* Cotacoes */}
          <PainelMercado cotacoes={data.cotacoes} breakEven={r.break_even_price} />

          {/* Metricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Custo por arroba" value={r.custo_por_arroba.toFixed(2)} unit="/@" />
            <MetricCard
              label="Break-even"
              value={r.break_even_price.toFixed(2)}
              unit="/@"
              delta={`spread R$ ${(form.preco_venda - r.break_even_price).toFixed(0)}`}
              deltaType={form.preco_venda > r.break_even_price ? "positive" : "negative"}
            />
            <MetricCard
              label="Margem bruta"
              value={fmtBRL(r.margem_bruta)}
              delta={fmtPct(r.margem_percentual)}
              deltaType={r.margem_percentual > 0.08 ? "positive" : "negative"}
            />
            <MetricCard
              label="ROI anualizado"
              value={fmtPct(r.roi_anualizado)}
              deltaType={r.roi_anualizado > cdi ? "positive" : "negative"}
            />
          </div>

          {r.margem_apertada && (
            <div className="bg-warning-bg border-l-4 border-l-warning rounded-md px-4 py-2.5 text-sm text-warning">
              Margem inferior a 8%
            </div>
          )}

          {/* Impacto */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-t-primary">Painel de impacto economico</h2>
              <p className="text-[11px] text-t-tertiary mt-0.5">
                O que acontece com seu lote se a arroba cair?
              </p>
            </div>
            <TabelaCenarios cenarios={data.impacto.cenarios} />
            <PerguntaInvertida
              texto={data.impacto.pergunta_invertida}
              tipo={data.impacto.cenarios.some((c) => c.semaforo === "vermelho") ? "alerta" : "ok"}
            />
          </div>

          {/* Hedge */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Protecao com futuros B3</h2>
            <PainelHedge hedge={data.hedge} />
          </div>

          {/* Composicao de custos */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-t-primary">Composicao de custos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Reposicao" value={fmtBRL(r.custo_reposicao)} compact />
              <MetricCard label="Operacional" value={fmtBRL(r.custo_operacional)} compact />
              <MetricCard label="Fixos" value={fmtBRL(r.custo_fixo)} compact />
              <MetricCard label="Oportunidade" value={fmtBRL(r.custo_oportunidade)} compact />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
