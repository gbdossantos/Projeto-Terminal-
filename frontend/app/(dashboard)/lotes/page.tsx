"use client";

/**
 * /lotes — cadastro de lote (pós-refactor fase/sistema).
 *
 * Step 1 (selector): dois dropdowns empilhados (Fase + Sistema), ambos
 * obrigatórios, sem default. Botão "Próximo" gateia entrada na Form.
 *
 * Step 2 (form): renderiza a Form correspondente à combinação (fase, sistema).
 *   - (cria, *)        → FormCria (sistema é meta-tag, não afeta cálculo)
 *   - (recria, *)      → FormRecria (idem)
 *   - (terminacao, pasto)            → FormPasto
 *   - (terminacao, semiconfinamento) → FormSemi
 *   - (terminacao, confinamento)     → FormConfinamento
 *
 * Todas as 9 combinações são permitidas. Sem bloqueio de negócio na UI.
 */

import { useEffect, useState } from "react";
import FormPasto from "@/components/lotes/FormPasto";
import FormConfinamento from "@/components/lotes/FormConfinamento";
import FormSemi from "@/components/lotes/FormSemi";
import FormCria from "@/components/lotes/FormCria";
import FormRecria from "@/components/lotes/FormRecria";
import { isFirstVisit } from "@/lib/first-visit";
import { LotesSalvosList } from "@/components/lotes/LotesSalvosList";
import { ImportPlanilha } from "@/components/lotes/ImportPlanilha";
import { FASE_LABEL, SISTEMA_LABEL, type Fase, type Sistema } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FASES: Fase[] = ["cria", "recria", "terminacao"];
const SISTEMAS: Sistema[] = ["pasto", "semiconfinamento", "confinamento"];

export default function LotesPage() {
  const [fase, setFase] = useState<Fase | "">("");
  const [sistema, setSistema] = useState<Sistema | "">("");
  const [step, setStep] = useState<"selector" | "form">("selector");
  const [reloadKey, setReloadKey] = useState(0);

  // Primeira visita: pré-seleciona (terminacao, confinamento) onde mora o lote-exemplo.
  useEffect(() => {
    if (isFirstVisit()) {
      setFase("terminacao");
      setSistema("confinamento");
    }
  }, []);

  // Carregar lote salvo: pula direto pra Form da combinação certa.
  const handleLoadLote = (loteFase: Fase, loteSistema: Sistema) => {
    setFase(loteFase);
    setSistema(loteSistema);
    setStep("form");
    setReloadKey((k) => k + 1);
  };

  const ambosSelecionados = fase !== "" && sistema !== "";
  const podeProximo = ambosSelecionados;

  return (
    <div>
      {/* Header + ações de import */}
      <div className="flex items-start justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="font-display text-[28px]" style={{ color: "var(--ink)", fontWeight: 400 }}>
            Lotes
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Calcule custo, margem, ROI e proteção para cada combinação de fase × sistema
          </p>
        </div>
        <ImportPlanilha />
      </div>

      {/* Lotes salvos */}
      <LotesSalvosList key={`saved-${reloadKey}`} onLoad={handleLoadLote} />

      {/* ── Step 1: seletor ── */}
      {step === "selector" && (
        <div
          style={{
            background: "var(--paper-2)",
            border: "0.5px solid var(--rule)",
            borderRadius: 10,
            padding: "20px 24px",
            marginTop: 20,
            maxWidth: 520,
          }}
        >
          <p
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              marginBottom: 18,
              fontWeight: 500,
            }}
          >
            Novo lote
          </p>

          {/* Dropdown Fase — shadcn/ui Select (V19, DM Sans, não-nativo) */}
          <div style={{ marginBottom: 14 }}>
            <Label texto="Fase do ciclo" />
            <Select
              value={fase || undefined}
              onValueChange={(v) => setFase(v as Fase)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a fase" />
              </SelectTrigger>
              <SelectContent>
                {FASES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FASE_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown Sistema — shadcn/ui Select */}
          <div style={{ marginBottom: 18 }}>
            <Label texto="Sistema de produção" />
            <Select
              value={sistema || undefined}
              onValueChange={(v) => setSistema(v as Sistema)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o sistema" />
              </SelectTrigger>
              <SelectContent>
                {SISTEMAS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SISTEMA_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hint contextual quando fase é Cria ou Recria */}
          {ambosSelecionados && fase !== "terminacao" && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--ink-3)",
                marginBottom: 14,
                lineHeight: 1.55,
              }}
            >
              Em <strong style={{ color: "var(--ink-2)" }}>{FASE_LABEL[fase as Fase]}</strong>, o
              sistema é registrado pra contexto mas não altera o cálculo —
              a fórmula consome os valores que você digitar.
            </p>
          )}

          <button
            onClick={() => podeProximo && setStep("form")}
            disabled={!podeProximo}
            style={{
              padding: "9px 18px",
              background: podeProximo ? "var(--ink)" : "var(--paper-3)",
              color: podeProximo ? "var(--paper)" : "var(--ink-3)",
              border: "1px solid",
              borderColor: podeProximo ? "var(--ink)" : "var(--rule)",
              borderRadius: 7,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: podeProximo ? "pointer" : "not-allowed",
              transition: "background 120ms, border-color 120ms",
            }}
          >
            Próximo →
          </button>
        </div>
      )}

      {/* ── Step 2: form ── */}
      {step === "form" && fase !== "" && sistema !== "" && (
        <div style={{ marginTop: 20 }}>
          {/* Header da combinação selecionada + voltar */}
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 12 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span
                className="uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--ink-3)",
                }}
              >
                {FASE_LABEL[fase as Fase]} · {SISTEMA_LABEL[sistema as Sistema]}
              </span>
            </div>
            <button
              onClick={() => setStep("selector")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--ink-3)",
                padding: "4px 8px",
              }}
            >
              ← Trocar fase/sistema
            </button>
          </div>

          {/* Dispatch */}
          <div key={`form-${fase}-${sistema}-${reloadKey}`} className="space-y-6">
            {fase === "terminacao" && sistema === "pasto" && <FormPasto sistema={sistema as Sistema} />}
            {fase === "terminacao" && sistema === "semiconfinamento" && <FormSemi sistema={sistema as Sistema} />}
            {fase === "terminacao" && sistema === "confinamento" && (
              <FormConfinamento sistema={sistema as Sistema} />
            )}
            {fase === "cria" && <FormCria sistema={sistema as Sistema} />}
            {fase === "recria" && <FormRecria sistema={sistema as Sistema} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponentes locais ──────────────────────────────────────

function Label({ texto }: { texto: string }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--ink-3)",
        marginBottom: 6,
      }}
    >
      {texto}
      <span style={{ color: "var(--loss)", marginLeft: 4 }}>*</span>
    </label>
  );
}

