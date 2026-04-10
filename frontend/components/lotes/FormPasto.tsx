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
import { Field } from "@/components/lotes/Field";

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

export default function FormPasto() {
  const [form, setForm] = useState<TerminacaoPastoRequest>(DEFAULTS);
  const [data, setData] = useState<TerminacaoPastoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchCotacoes()
      .then((c) => { if (c.arroba_boi_gordo) setForm((f) => ({ ...f, preco_venda: c.arroba_boi_gordo! })); })
      .catch(() => {});
  }, []);

  const calculate = useCallback(async (req: TerminacaoPastoRequest) => {
    setLoading(true); setError(null);
    try { setData(await calcularTerminacaoPasto(req)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => calculate(form), 400);
    return () => clearTimeout(debounceRef.current);
  }, [form, calculate]);

  const set = (key: keyof TerminacaoPastoRequest, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const r = data?.resultado;

  return (
    <>
      {/* Form */}
      <div
        className="rounded-xl p-6 space-y-5"
        style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: "#6B6860" }}>
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

        <div className="pt-5" style={{ borderTop: "0.5px solid #2A2820" }}>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: "#6B6860" }}>
            Custos operacionais (R$/cab/dia)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Suplementacao" value={form.custo_suplementacao_dia} onChange={(v) => set("custo_suplementacao_dia", v)} step={0.1} />
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
            <Field label="Arrendamento" value={form.custo_arrendamento_dia} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
          </div>
        </div>

        <div className="pt-5" style={{ borderTop: "0.5px solid #2A2820" }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Frete frigorifico (R$)" value={form.custo_frete_saida ?? 0} onChange={(v) => set("custo_frete_saida", v)} step={100} />
            <Field label="Mortalidade (R$)" value={form.custo_mortalidade_estimada ?? 0} onChange={(v) => set("custo_mortalidade_estimada", v)} step={100} />
            <Field label="Cotacao arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
          </div>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: "#B5413418", border: "0.5px solid #B5413444", color: "#D4614A" }}
        >
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-12 text-[13px]" style={{ color: "#6B6860" }}>Calculando...</div>
      )}

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
            <MetricCard label="Break-even" value={r.break_even_price.toFixed(2)} unit="/@"
              delta={`spread R$ ${(form.preco_venda - r.break_even_price).toFixed(0)}`}
              deltaType={form.preco_venda > r.break_even_price ? "positive" : "negative"} />
            <MetricCard label="Margem bruta" value={fmtBRL(r.margem_bruta)}
              delta={fmtPct(r.margem_percentual)}
              deltaType={r.margem_percentual > 0.08 ? "positive" : "negative"} />
            <MetricCard label="ROI anualizado" value={fmtPct(r.roi_anualizado)} />
          </div>

          {r.margem_apertada && (
            <div
              className="rounded-lg px-4 py-2.5 text-[13px]"
              style={{ background: "#C89B3C18", borderLeft: "2px solid #C89B3C", color: "#C89B3C" }}
            >
              Margem inferior a 8%
            </div>
          )}

          {/* Impacto */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg" style={{ color: "#F5F1E8", fontWeight: 400 }}>
                Painel de impacto economico
              </h2>
              <p className="text-[13px] mt-1" style={{ color: "#6B6860" }}>
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
            <h2 className="font-display text-lg" style={{ color: "#F5F1E8", fontWeight: 400 }}>
              Protecao com futuros B3
            </h2>
            <PainelHedge hedge={data.hedge} />
          </div>

          {/* Composicao de custos */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-medium" style={{ color: "#F5F1E8" }}>
              Composicao de custos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Reposicao" value={fmtBRL(r.custo_reposicao)} compact />
              <MetricCard label="Operacional" value={fmtBRL(r.custo_operacional)} compact />
              <MetricCard label="Fixos" value={fmtBRL(r.custo_fixo)} compact />
              <MetricCard label="Oportunidade" value={fmtBRL(r.custo_oportunidade)} compact />
            </div>
          </div>
        </>
      )}
    </>
  );
}
