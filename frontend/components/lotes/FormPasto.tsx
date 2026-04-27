"use client";

import { useState, useEffect, useCallback } from "react";
import type { TerminacaoPastoRequest, TerminacaoPastoResponse } from "@/lib/types";
import { calcularTerminacaoPasto, fetchCotacoes } from "@/lib/api";
import type { CotacaoMercado } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { Field } from "@/components/lotes/Field";
import { StepWizard } from "@/components/step-wizard";
import { ScoreRing } from "@/components/score-ring";
import { KpiCard } from "@/components/kpi-card";
import { ScenarioTable } from "@/components/scenario-table";
import { HedgeDecision } from "@/components/hedge-decision";
import { classifyMargin } from "@/lib/margin-classification";
import { DEFAULTS_TERMINACAO_PASTO as DEFAULTS } from "@/lib/defaults-sistema";
import { PerguntaInvertidaBlock } from "@/components/decision/PerguntaInvertidaBlock";

export default function FormPasto() {
  const [form, setForm] = useState<TerminacaoPastoRequest>(DEFAULTS);
  const [data, setData] = useState<TerminacaoPastoResponse | null>(null);
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    fetchCotacoes().then((c) => {
      setCotacoes(c);
      if (c.arroba_boi_gordo) setForm((f) => ({ ...f, preco_venda: c.arroba_boi_gordo! }));
    }).catch(() => {});
  }, []);

  const set = (key: keyof TerminacaoPastoRequest, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const calculate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await calcularTerminacaoPasto(form);
      setData(result);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally { setLoading(false); }
  }, [form]);

  const r = data?.resultado;
  const margemPct = r?.margem_percentual;
  // Classificacao de margem (verde/amber/vermelho) — fonte unica em lib/margin-classification
  const tier = r ? classifyMargin(r.margem_percentual).tier : null;
  // TODO: substituir score 0-100 por metrica em linguagem do produtor (decisao de produto pendente)
  const score = r ? 78 : null;

  return (
    <>
      {/* Step wizard bar */}
      <StepWizard currentStep={step} margemPct={margemPct} />

      <div className="py-6 space-y-6">
        {/* ═══ STEP 1 — Dados do lote ═══ */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
            {/* Form */}
            <div className="rounded-xl p-5 space-y-5"
              style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: "#6B6860" }}>
                Dados do lote
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Animais" value={form.num_animais} onChange={(v) => set("num_animais", v)} />
                <Field label="Peso entrada (kg)" value={form.peso_entrada_kg} onChange={(v) => set("peso_entrada_kg", v)} />
                <Field label="Peso saida (kg)" value={form.peso_saida_estimado_kg} onChange={(v) => set("peso_saida_estimado_kg", v)} />
                <Field label="Dias de ciclo" value={form.dias_ciclo} onChange={(v) => set("dias_ciclo", v)} />
                <Field label="Rendimento carcaca (%)" value={(form.rendimento_carcaca ?? 0.52) * 100} onChange={(v) => set("rendimento_carcaca", v / 100)} />
                <Field label="Reposicao total (R$)" value={form.custo_reposicao_total} onChange={(v) => set("custo_reposicao_total", v)} step={1000} />
              </div>

              <div className="pt-4" style={{ borderTop: "0.5px solid #2A2820" }}>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: "#6B6860" }}>
                  Custos operacionais (R$/cab/dia)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Suplementacao" value={form.custo_suplementacao_dia} onChange={(v) => set("custo_suplementacao_dia", v)} step={0.1} />
                  <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
                  <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
                  <Field label="Arrendamento" value={form.custo_arrendamento_dia} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: "0.5px solid #2A2820" }}>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: "#6B6860" }}>
                  Mercado e logistica
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Cotacao arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
                  <Field label="Frete frigorifico (R$)" value={form.custo_frete_saida ?? 0} onChange={(v) => set("custo_frete_saida", v)} step={100} />
                  <Field label="Mortalidade (R$)" value={form.custo_mortalidade_estimada ?? 0} onChange={(v) => set("custo_mortalidade_estimada", v)} step={100} />
                </div>
              </div>
            </div>

            {/* Right column — cotacoes + score preview */}
            <div className="space-y-4">
              {/* Cotacoes */}
              <div className="rounded-xl p-4" style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
                <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-3" style={{ color: "#6B6860" }}>
                  Cotacoes de mercado
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "Arroba CEPEA/SP", v: cotacoes?.arroba_boi_gordo, u: "/@" },
                    { l: "Dolar PTAX", v: cotacoes?.dolar_ptax, u: "" },
                    { l: "Milho ESALQ", v: cotacoes?.milho_esalq, u: "/sc" },
                    { l: "CDI", v: cotacoes?.cdi_anual ? cotacoes.cdi_anual * 100 : null, u: "% a.a." },
                  ].map((c) => (
                    <div key={c.l} className="rounded-lg px-3 py-2.5" style={{ background: "#221F18" }}>
                      <p className="text-[9px] uppercase tracking-[0.08em] mb-1" style={{ color: "#6B6860" }}>{c.l}</p>
                      <span className="font-mono text-[17px] font-medium" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>
                        {c.v?.toFixed(2) ?? "—"}
                      </span>
                      {c.u && <span className="font-mono text-[11px] ml-0.5" style={{ color: "#6B6860" }}>{c.u}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Score preview */}
              <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-3"
                style={{ background: "#1A1814", border: "0.5px solid #2A2820", minHeight: 180 }}>
                <ScoreRing score={null} tier={null} size="md" />
                <p className="text-[12px] text-center leading-relaxed" style={{ color: "#6B6860" }}>
                  Preencha os dados e calcule para ver o score de risco.
                </p>
              </div>

              {/* Calculate button */}
              <button
                onClick={calculate}
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  background: "#B8763E",
                  color: "#FAF0E0",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full animate-spin"
                      style={{ border: "1.5px solid transparent", borderTop: "1.5px solid #FAF0E0" }} />
                    Calculando...
                  </span>
                ) : "Calcular \u2192"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg px-4 py-3 text-[12px]"
            style={{ background: "#B5413418", border: "0.5px solid #B5413444", color: "#D4614A" }}>
            {error}
          </div>
        )}

        {/* ═══ STEP 2 — Analise economica ═══ */}
        {step === 2 && r && data && (
          <>
            {/* KPI row + Score */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3">
              <KpiCard label="Custo por arroba" value={r.custo_por_arroba.toFixed(2)} unit="/@" />
              <KpiCard label="Break-even" value={r.break_even_price.toFixed(2)} unit="/@"
                badge={`\u25B2 spread R$ ${(form.preco_venda - r.break_even_price).toFixed(0)}`} badgeColor="#4A5D3A" />
              <KpiCard label="Margem bruta" value={fmtBRL(r.margem_bruta)}
                badge={`\u25B2 ${fmtPct(r.margem_percentual)}`} badgeColor="#4A5D3A" />
              <KpiCard label="ROI anualizado" value={fmtPct(r.roi_anualizado)}
                sub={`vs ${((data.cotacoes.cdi_anual ?? 0.1415) * 100).toFixed(2)}% CDI`} />
              <div className="rounded-[10px] px-4 py-3 flex items-center"
                style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
                <ScoreRing score={score} tier={tier} size="md" showDetails
                  details={{ margem: fmtPct(r.margem_percentual), exposicao: fmtBRL(r.arrobas_totais * form.preco_venda), vencBGI: "12 dias" }} />
              </div>
            </div>

            {/* Semaphore */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{
                background: r.margem_percentual >= 0.15 ? "#4A5D3A18" : r.margem_percentual >= 0.05 ? "#C89B3C18" : "#B5413418",
                border: `0.5px solid ${r.margem_percentual >= 0.15 ? "#4A5D3A44" : r.margem_percentual >= 0.05 ? "#C89B3C44" : "#B5413444"}`,
              }}>
              <div className="w-2 h-2 rounded-full"
                style={{ background: r.margem_percentual >= 0.15 ? "#4A5D3A" : r.margem_percentual >= 0.05 ? "#C89B3C" : "#B54134" }} />
              <div>
                <p className="text-[12px] font-medium"
                  style={{ color: r.margem_percentual >= 0.15 ? "#6B8F5A" : r.margem_percentual >= 0.05 ? "#C89B3C" : "#D4614A" }}>
                  {r.margem_percentual >= 0.15 ? "Margem saudavel" : r.margem_percentual >= 0.05 ? "Margem apertada" : "Margem critica"}
                </p>
                <p className="text-[11px]" style={{ color: "#6B6860" }}>
                  Margem de {fmtPct(r.margem_percentual)} — spread de {fmtBRL(form.preco_venda - r.break_even_price)}/@ sobre o break-even
                </p>
              </div>
            </div>

            {/* Grid: impacto + custos */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
              <div>
                <p className="font-display text-[13px] mb-2.5" style={{ color: "#F5F1E8" }}>Painel de impacto economico</p>
                <PerguntaInvertidaBlock impacto={data.impacto} margemBruta={r.margem_bruta} />
                <ScenarioTable cenarios={data.impacto.cenarios} />
              </div>

              <div>
                <p className="font-display text-[13px] mb-2.5" style={{ color: "#F5F1E8" }}>Composicao de custos</p>
                <div className="space-y-2">
                  {[
                    { l: "Reposicao", v: r.custo_reposicao },
                    { l: "Operacional", v: r.custo_operacional },
                    { l: "Fixos", v: r.custo_fixo },
                    { l: "Oportunidade", v: r.custo_oportunidade },
                  ].map((c) => (
                    <div key={c.l} className="flex justify-between items-center rounded-lg px-3.5 py-2.5"
                      style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
                      <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: "#6B6860" }}>{c.l}</span>
                      <span className="font-mono text-[14px] font-medium" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(c.v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center rounded-lg px-3.5 py-2.5"
                    style={{ background: "#221F18", border: "0.5px solid #2A2820" }}>
                    <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: "#F5F1E8" }}>Total</span>
                    <span className="font-mono text-[14px] font-medium" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.custo_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)}
                className="text-[12px] px-4 py-2 rounded-lg transition-colors"
                style={{ border: "0.5px solid #2A2820", color: "#6B6860" }}>
                &larr; Editar dados
              </button>
              <button onClick={() => setStep(3)}
                className="text-[12px] font-medium px-4 py-2 rounded-lg"
                style={{ background: "#B8763E", color: "#FAF0E0" }}>
                Ver decisao de hedge &rarr;
              </button>
            </div>
          </>
        )}

        {/* ═══ STEP 3 — Decisao de hedge ═══ */}
        {step === 3 && r && data && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-5 gap-0 rounded-lg overflow-hidden"
              style={{ background: "#221F18", border: "0.5px solid #2A2820" }}>
              {[
                { l: "Custo/@", v: `${r.custo_por_arroba.toFixed(0)}` },
                { l: "Break-even", v: `${r.break_even_price.toFixed(0)}` },
                { l: "Margem", v: fmtPct(r.margem_percentual), c: "#6B8F5A" },
                { l: "Exposicao", v: fmtBRL(r.arrobas_totais * form.preco_venda) },
              ].map((k) => (
                <div key={k.l} className="px-3 py-2.5" style={{ borderRight: "0.5px solid #2A2820" }}>
                  <p className="text-[9px] uppercase tracking-[0.08em]" style={{ color: "#6B6860" }}>{k.l}</p>
                  <p className="font-mono text-[14px] font-medium" style={{ color: k.c || "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{k.v}</p>
                </div>
              ))}
              <div className="px-3 py-2 flex items-center justify-center">
                <ScoreRing score={score} tier={tier} size="sm" />
              </div>
            </div>

            {/* Hedge decision */}
            <HedgeDecision hedge={data.hedge} />

            {/* Nav buttons */}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)}
                className="text-[12px] px-4 py-2 rounded-lg transition-colors"
                style={{ border: "0.5px solid #2A2820", color: "#6B6860" }}>
                &larr; Analise economica
              </button>
              <button
                className="text-[12px] font-medium px-4 py-2 rounded-lg"
                style={{ background: "#B8763E", color: "#FAF0E0" }}
                onClick={() => { /* TODO: implementar geracao de PDF */ }}>
                Exportar relatorio PDF &rarr;
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
