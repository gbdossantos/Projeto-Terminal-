"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/lib/utils/format";
import type { HistoricoPreset } from "@/lib/types";

/**
 * Card de preset (controle de navegação, peso SECUNDÁRIO).
 * Seco: título + período + narrativa. Margem aparece subdued (o protagonista
 * é o hero, não o card). Card de evento traz footnote honesta.
 * `indisponivel` → estado de erro do card, nunca número falso (§10.6).
 */
export default function PresetCard({
  preset,
  ativo,
  onClick,
}: {
  preset: HistoricoPreset;
  ativo: boolean;
  onClick: () => void;
}) {
  if (preset.indisponivel) {
    return (
      <Card
        className="p-4"
        style={{
          borderStyle: "dashed",
          borderColor: "var(--rule-strong)",
          background: "transparent",
          boxShadow: "none",
        }}
      >
        <div
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
            marginBottom: 6,
          }}
        >
          {preset.titulo}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Sem dado histórico para montar esta situação.
        </div>
      </Card>
    );
  }

  const lucro = preset.margem_cenario >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="text-left"
      style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
    >
      <Card
        className="p-4 transition-colors"
        style={{
          borderColor: ativo ? "var(--ink)" : "var(--rule)",
          borderWidth: ativo ? 1.5 : 1,
          background: ativo ? "var(--paper-2)" : "var(--paper-2)",
          boxShadow: ativo ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        }}
      >
        <div className="flex items-start justify-between" style={{ gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {preset.titulo}
          </span>
          <Badge
            variant="secondary"
            className="mono-num shrink-0"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)" }}
          >
            {preset.periodo}
          </Badge>
        </div>

        {preset.narrativa && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.45,
              marginBottom: 10,
            }}
          >
            {preset.narrativa}
          </p>
        )}

        <div className="flex items-baseline" style={{ gap: 6 }}>
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              letterSpacing: "0.06em",
              color: "var(--ink-3)",
            }}
          >
            margem
          </span>
          <span
            className="mono-num"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: lucro ? "var(--gain)" : "var(--loss)",
            }}
          >
            {lucro ? "+" : "−"}
            {fmtBRL(Math.abs(preset.margem_cenario), 0)}/@
          </span>
        </div>

        {preset.footnote && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--ink-3)",
              lineHeight: 1.4,
              marginTop: 10,
              borderTop: "0.5px solid var(--rule)",
              paddingTop: 8,
            }}
          >
            {preset.footnote}
          </p>
        )}
      </Card>
    </button>
  );
}
