"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  LoteInputTerminacao, LoteTerminacaoResponse, Sistema,
} from "@/lib/types";
import { calcularLote, fetchCotacoes } from "@/lib/api";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { Semaforo } from "@/components/decision/Semaforo";
import { TabelaCenarios } from "@/components/decision/TabelaCenarios";
import { PerguntaInvertidaBlock } from "@/components/decision/PerguntaInvertidaBlock";
import { PainelHedge } from "@/components/decision/PainelHedge";
import { Field } from "@/components/lotes/Field";
import {
  DEFAULTS_CONFINAMENTO,
  EXEMPLO_CONFINAMENTO,
  ZERO_CONFINAMENTO,
} from "@/lib/defaults-sistema";
import { isFirstVisit, markFirstVisitDone } from "@/lib/first-visit";
import { SaveLoteButton } from "@/components/lotes/SaveLoteButton";
import { saveLote, consumePendingLoad } from "@/lib/lotes-storage";
import { saveDecisao } from "@/lib/decisoes-storage";
import { HedgeMilhoToggle, type HedgeMilhoState } from "@/components/lotes/HedgeMilhoToggle";

// Fator de matéria seca do milho grão (~88% MS). Constante zootécnica padrão.
// Usado pra converter R$/saca natural (60kg) em R$/kg MS que o engine espera.
const FATOR_MS_MILHO = 0.88;

interface Props {
  /** Sistema vem do seletor da page — pra FormConfinamento é sempre "confinamento". */
  sistema: Sistema;
}

export default function FormConfinamento({ sistema }: Props) {
  const [form, setForm] = useState<LoteInputTerminacao>({
    fase: "terminacao",
    sistema,
    ...DEFAULTS_CONFINAMENTO,
  } as LoteInputTerminacao);
  const [data, setData] = useState<LoteTerminacaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExemploBanner, setShowExemploBanner] = useState(false);
  const [hedgeMilho, setHedgeMilho] = useState<HedgeMilhoState>({ tipo: "sem" });
  const debounceRef = useRef<NodeJS.Timeout>();

  // Pending load (lote salvo a ser carregado) tem prioridade sobre o exemplo.
  useEffect(() => {
    const pending = consumePendingLoad<LoteInputTerminacao>("terminacao", sistema);
    if (pending) {
      setForm(pending);
      return;
    }
    if (isFirstVisit()) {
      setForm({ fase: "terminacao", sistema, ...EXEMPLO_CONFINAMENTO } as LoteInputTerminacao);
      setShowExemploBanner(true);
    }
  }, [sistema]);

  const handleSave = (nome: string) => {
    if (!data) return;
    saveLote({
      fase: "terminacao",
      sistema,
      nome,
      inputs: form,
      resultadoCache: data,
      margemPct: data.resultado.margem_percentual,
    });
    // Briefing T3.1 decisão #4: hedge milho é só registro local pro MVP.
    // Engine não usa esse campo — quando Simulador absorver milho (camada 3),
    // vira input do cálculo.
    if (hedgeMilho.tipo !== "sem") {
      saveDecisao({
        lote_id: `confinamento-${nome}`,
        lote_nome: `${nome} · hedge milho ${hedgeMilho.tipo}${hedgeMilho.tipo === "parcial" ? ` ${hedgeMilho.pct}%` : ""}`,
        hedge_pct: hedgeMilho.tipo === "total" ? 1 : hedgeMilho.tipo === "parcial" ? hedgeMilho.pct / 100 : 0,
        cenario_arroba: form.preco_venda,
        preco_travado: 0,
        intencao: null,
      });
    }
  };

  useEffect(() => {
    fetchCotacoes()
      .then((c) => {
        setForm((f) => {
          const next = { ...f };
          if (c.arroba_boi_gordo) next.preco_venda = c.arroba_boi_gordo;
          if (c.milho_esalq) next.custo_dieta_kg_ms = c.milho_esalq / 60 / FATOR_MS_MILHO;
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const calculate = useCallback(async (req: LoteInputTerminacao) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularLote(req));
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

  const set = (key: keyof LoteInputTerminacao, value: number) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (showExemploBanner) {
      markFirstVisitDone();
      setShowExemploBanner(false);
    }
  };

  const handleComeceDoZero = () => {
    setForm({ fase: "terminacao", sistema, ...ZERO_CONFINAMENTO } as LoteInputTerminacao);
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
          {/* Inputs em linguagem do produtor: kg MS/cab/dia + R$/saca milho.
              Conversao p/ os campos do engine (consumo_ms_pct_pv, custo_dieta_kg_ms)
              acontece no onChange — pesoMedio = (entrada + saida) / 2; fator MS = 0.88. */}
          {(() => {
            // Campos sparse: em runtime sempre presentes em sistema=confinamento
            // (defaults preenchidos + validação Pydantic). Fallback 0 só pra agradar o tipo.
            const consumoMsPctPv = form.consumo_ms_pct_pv ?? 0;
            const custoDietaKgMs = form.custo_dieta_kg_ms ?? 0;
            const pesoMedio = (form.peso_entrada_kg + form.peso_saida_estimado_kg) / 2;
            const consumoKgMsCabDia = pesoMedio > 0 ? consumoMsPctPv * pesoMedio : 0;
            const custoSacaMilho = custoDietaKgMs * 60 * FATOR_MS_MILHO;
            const pctPV = (consumoMsPctPv * 100).toFixed(2);
            const rsKgMs = custoDietaKgMs.toFixed(2);
            return (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Field
                    label="Consumo dieta (kg MS/cab/dia)"
                    value={consumoKgMsCabDia}
                    onChange={(v) => {
                      const novoPct = pesoMedio > 0 ? v / pesoMedio : 0;
                      set("consumo_ms_pct_pv", novoPct);
                    }}
                    step={0.5}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary, #9B9388)", fontFamily: "var(--font-mono)" }}>
                    = {pctPV}% peso vivo (média)
                  </p>
                </div>
                <div>
                  <Field
                    label="Custo saca milho (R$/60kg)"
                    value={custoSacaMilho}
                    onChange={(v) => {
                      const novoKgMs = v / 60 / FATOR_MS_MILHO;
                      set("custo_dieta_kg_ms", novoKgMs);
                    }}
                    step={1}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary, #9B9388)", fontFamily: "var(--font-mono)" }}>
                    = R$ {rsKgMs}/kg MS (fator {FATOR_MS_MILHO} milho)
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Hedge milho — só registro local (engine não usa por enquanto) */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Hedge de milho</p>
          <HedgeMilhoToggle value={hedgeMilho} onChange={setHedgeMilho} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Outros custos (R$/cab/dia)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mao de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
            <Field label="Instalacoes" value={form.custo_instalacoes_dia ?? 0} onChange={(v) => set("custo_instalacoes_dia", v)} step={0.1} />
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

          <MetricCard label="Participacao da dieta" value={fmtPct(r.participacao_dieta_pct ?? 0)} compact />

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Painel de impacto economico</h2>
            <PerguntaInvertidaBlock impacto={data.impacto} margemBruta={r.margem_bruta} />
            <TabelaCenarios cenarios={data.impacto.cenarios} />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Protecao com futuros B3</h2>
            <PainelHedge hedge={data.hedge} />
          </div>

          {/* Salvar lote */}
          <div className="flex justify-end pt-2">
            <SaveLoteButton onSave={handleSave} defaultName={`Confinamento · ${form.num_animais} cab`} />
          </div>
        </>
      )}
    </>
  );
}

