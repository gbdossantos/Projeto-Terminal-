"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ConfinamentoRequest, ConfinamentoResponse } from "@/lib/types";
import { calcularConfinamento, fetchCotacoes } from "@/lib/api";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Semaforo } from "@/components/decision/Semaforo";
import { TabelaCenarios } from "@/components/decision/TabelaCenarios";
import { PerguntaInvertidaBlock } from "@/components/decision/PerguntaInvertidaBlock";
import { PainelHedge } from "@/components/decision/PainelHedge";
import { Field } from "@/components/lotes/Field";
import {
  DEFAULTS_CONFINAMENTO as DEFAULTS,
  EXEMPLO_CONFINAMENTO,
  ZERO_CONFINAMENTO,
} from "@/lib/defaults-sistema";
import { isFirstVisit, markFirstVisitDone } from "@/lib/first-visit";

export default function FormConfinamento() {
  const [form, setForm] = useState(DEFAULTS);
  const [data, setData] = useState<ConfinamentoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExemploBanner, setShowExemploBanner] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Detecta primeira visita pos-hidratacao (evita mismatch SSR/CSR).
  useEffect(() => {
    if (isFirstVisit()) {
      setForm(EXEMPLO_CONFINAMENTO);
      setShowExemploBanner(true);
    }
  }, []);

  useEffect(() => {
    fetchCotacoes()
      .then((c) => {
        if (c.arroba_boi_gordo) setForm((f) => ({ ...f, preco_venda: c.arroba_boi_gordo! }));
      })
      .catch(() => {});
  }, []);

  const calculate = useCallback(async (req: ConfinamentoRequest) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularConfinamento(req));
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

  const set = (key: keyof ConfinamentoRequest, value: number) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Primeira interacao do usuario apos lote-exemplo: marca flag e some banner.
    if (showExemploBanner) {
      markFirstVisitDone();
      setShowExemploBanner(false);
    }
  };

  const handleComeceDoZero = () => {
    setForm(ZERO_CONFINAMENTO);
    markFirstVisitDone();
    setShowExemploBanner(false);
  };

  const r = data?.resultado;

  return (
    <>
      {/* Banner de lote-exemplo (apenas na primeira visita) */}
      {showExemploBanner && (
        <div
          className="rounded-lg flex items-center justify-between"
          style={{
            background: "rgba(184, 118, 62, 0.07)",
            border: "0.5px solid rgba(184, 118, 62, 0.25)",
            padding: "10px 14px",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "var(--text-secondary, #B5AFA0)",
            }}
          >
            Exemplo de lote pre-preenchido. Edite os valores ou{" "}
            <button
              onClick={handleComeceDoZero}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "var(--brand)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              comece do zero
            </button>
            .
          </span>
        </div>
      )}

      {/* Form */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">Dados do lote</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Animais" value={form.num_animais} onChange={(v) => set("num_animais", v)} />
          <Field label="Peso entrada (kg)" value={form.peso_entrada_kg} onChange={(v) => set("peso_entrada_kg", v)} />
          <Field label="Peso saida (kg)" value={form.peso_saida_estimado_kg} onChange={(v) => set("peso_saida_estimado_kg", v)} />
          <Field label="Dias de ciclo" value={form.dias_ciclo} onChange={(v) => set("dias_ciclo", v)} />
          <Field label="Rendimento carcaca (%)" value={(form.rendimento_carcaca ?? 0.54) * 100} onChange={(v) => set("rendimento_carcaca", v / 100)} />
          <Field label="Reposicao total (R$)" value={form.custo_reposicao_total} onChange={(v) => set("custo_reposicao_total", v)} step={10000} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Dieta</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Consumo MS (% peso vivo)" value={form.consumo_ms_pct_pv * 100} onChange={(v) => set("consumo_ms_pct_pv", v / 100)} step={0.1} />
            <Field label="Custo dieta (R$/kg MS)" value={form.custo_dieta_kg_ms} onChange={(v) => set("custo_dieta_kg_ms", v)} step={0.01} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Outros custos (R$/cab/dia)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
            <Field label="Instalacoes" value={form.custo_instalacoes_dia} onChange={(v) => set("custo_instalacoes_dia", v)} step={0.1} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Frete entrada (R$)" value={form.custo_frete_entrada ?? 0} onChange={(v) => set("custo_frete_entrada", v)} step={500} />
            <Field label="Frete saida (R$)" value={form.custo_frete_saida ?? 0} onChange={(v) => set("custo_frete_saida", v)} step={500} />
            <Field label="Cotacao arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
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

          <MetricCard label="Participacao da dieta" value={fmtPct(r.participacao_dieta_pct)} compact />

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Painel de impacto economico</h2>
            <PerguntaInvertidaBlock impacto={data.impacto} margemBruta={r.margem_bruta} />
            <TabelaCenarios cenarios={data.impacto.cenarios} />
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
