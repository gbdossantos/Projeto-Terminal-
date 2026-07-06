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
import { DEFAULTS_SEMICONFINAMENTO } from "@/lib/defaults-sistema";
import { SaveLoteButton } from "@/components/lotes/SaveLoteButton";
import { saveLote, consumePendingLoad } from "@/lib/lotes-storage";
import { saveDecisao } from "@/lib/decisoes-storage";
import { HedgeMilhoToggle, type HedgeMilhoState } from "@/components/lotes/HedgeMilhoToggle";
import { useProfile } from "@/lib/use-profile";

interface Props {
  sistema: Sistema;
}

export default function FormSemi({ sistema }: Props) {
  const { profile } = useProfile();
  const [form, setForm] = useState<LoteInputTerminacao>({
    fase: "terminacao",
    sistema,
    ...DEFAULTS_SEMICONFINAMENTO,
  } as LoteInputTerminacao);
  const [data, setData] = useState<LoteTerminacaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hedgeMilho, setHedgeMilho] = useState<HedgeMilhoState>({ tipo: "sem" });
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const pending = consumePendingLoad<LoteInputTerminacao>("terminacao", sistema);
    if (pending) setForm(pending);

    fetchCotacoes()
      .then((c) => {
        setForm((f) => {
          const next = { ...f };
          if (c.arroba_boi_gordo) next.preco_venda = c.arroba_boi_gordo;
          if (c.milho_esalq) next.custo_suplemento_kg = c.milho_esalq / 60;
          return next;
        });
      })
      .catch(() => {});
  }, [sistema]);

  // Mortalidade estimada — default sobrescrevível: herda do histórico da
  // fazenda (perfil), mas o produtor pode ajustar por lote específico.
  useEffect(() => {
    setForm((f) => ({ ...f, custo_mortalidade_estimada: f.custo_reposicao_total * profile.mortalidade_hist }));
  }, [profile.mortalidade_hist]);

  const handleSave = async (nome: string) => {
    if (!data) return;
    await saveLote({
      fase: "terminacao",
      sistema,
      nome,
      inputs: form,
      resultadoCache: data,
      margemPct: data.resultado.margem_percentual,
    });
    if (hedgeMilho.tipo !== "sem") {
      await saveDecisao({
        lote_id: `semiconfinamento-${nome}`,
        lote_nome: `${nome} · hedge milho ${hedgeMilho.tipo}${hedgeMilho.tipo === "parcial" ? ` ${hedgeMilho.pct}%` : ""}`,
        hedge_pct: hedgeMilho.tipo === "total" ? 1 : hedgeMilho.tipo === "parcial" ? hedgeMilho.pct / 100 : 0,
        cenario_arroba: form.preco_venda,
        preco_travado: 0,
        intencao: null,
      });
    }
  };

  const calculate = useCallback(async (req: LoteInputTerminacao) => {
    setLoading(true);
    setError(null);
    try {
      setData(await calcularLote({ ...req, regiao: profile.estado, basis_estimado: profile.basis_valor }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [profile.estado, profile.basis_valor]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => calculate(form), 400);
    return () => clearTimeout(debounceRef.current);
  }, [form, calculate]);

  const set = (key: keyof LoteInputTerminacao, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const r = data?.resultado;

  return (
    <>
      {/* Form */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Animais" value={form.num_animais} onChange={(v) => set("num_animais", v)} />
          <Field label="Peso entrada (kg)" value={form.peso_entrada_kg} onChange={(v) => set("peso_entrada_kg", v)} />
          <Field label="Peso saída (kg)" value={form.peso_saida_estimado_kg} onChange={(v) => set("peso_saida_estimado_kg", v)} />
          <Field label="Dias de ciclo" value={form.dias_ciclo} onChange={(v) => set("dias_ciclo", v)} />
          <Field label="Rendimento carcaça (%)" value={(form.rendimento_carcaca ?? 0.53) * 100} onChange={(v) => set("rendimento_carcaca", v / 100)} />
          <Field label="Reposição total (R$)" value={form.custo_reposicao_total} onChange={(v) => set("custo_reposicao_total", v)} step={5000} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Custos (R$/cab/dia)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Arrendamento" value={form.custo_arrendamento_dia ?? 0} onChange={(v) => set("custo_arrendamento_dia", v)} step={0.1} />
            <Field label="Manutenção pasto" value={form.custo_manutencao_pasto_dia ?? 0} onChange={(v) => set("custo_manutencao_pasto_dia", v)} step={0.1} />
            <Field label="Consumo suplemento (kg/dia)" value={form.consumo_suplemento_kg_dia ?? 0} onChange={(v) => set("consumo_suplemento_kg_dia", v)} step={0.1} />
            <Field label="Custo suplemento (R$/kg)" value={form.custo_suplemento_kg ?? 0} onChange={(v) => set("custo_suplemento_kg", v)} step={0.05} />
            <Field label="Sanidade" value={form.custo_sanidade_dia} onChange={(v) => set("custo_sanidade_dia", v)} step={0.1} />
            <Field label="Mão de obra" value={form.custo_mao_obra_dia} onChange={(v) => set("custo_mao_obra_dia", v)} step={0.1} />
          </div>
        </div>

        {/* Hedge milho — só registro local (engine não usa por enquanto) */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Hedge de milho</p>
          <HedgeMilhoToggle value={hedgeMilho} onChange={setHedgeMilho} />
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cotação arroba (R$/@)" value={form.preco_venda} onChange={(v) => set("preco_venda", v)} />
            <Field label="Mortalidade (R$)" value={form.custo_mortalidade_estimada ?? 0} onChange={(v) => set("custo_mortalidade_estimada", v)} step={100} />
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
            titulo={form.preco_venda < r.break_even_price ? "Abaixo do break-even" : r.margem_percentual < 0.08 ? "Margem apertada" : "Margem saudável"}
            detalhe={`Margem de ${fmtPct(r.margem_percentual)} — spread de ${fmtBRL(form.preco_venda - r.break_even_price)}/@ sobre o break-even`}
          />

          <PainelMercado cotacoes={data.cotacoes} breakEven={r.break_even_price} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Custo por arroba" value={r.custo_por_arroba.toFixed(2)} unit="/@" />
            <MetricCard label="Break-even" value={r.break_even_price.toFixed(2)} unit="/@" delta={`spread R$ ${(form.preco_venda - r.break_even_price).toFixed(0)}`} deltaType={form.preco_venda > r.break_even_price ? "positive" : "negative"} />
            <MetricCard label="Margem bruta" value={fmtBRL(r.margem_bruta)} delta={fmtPct(r.margem_percentual)} deltaType={r.margem_percentual > 0.08 ? "positive" : "negative"} />
            <MetricCard label="ROI anualizado" value={fmtPct(r.roi_anualizado)} />
          </div>

          <MetricCard label="Suplementação por arroba" value={fmtBRL(r.custo_suplementacao_por_arroba ?? 0, 2) + "/@"} compact />

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Painel de impacto econômico</h2>
            <PerguntaInvertidaBlock impacto={data.impacto} margemBruta={r.margem_bruta} />
            <TabelaCenarios cenarios={data.impacto.cenarios} />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-t-primary">Proteção com futuros B3</h2>
            <PainelHedge hedge={data.hedge} />
          </div>

          {/* Salvar lote */}
          <div className="flex justify-end pt-2">
            <SaveLoteButton onSave={handleSave} defaultName={`Semi · ${form.num_animais} cab`} />
          </div>
        </>
      )}
    </>
  );
}
