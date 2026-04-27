"use client";

import { fmtBRL } from "@/lib/utils/format";
import type { EconomicImpactReport } from "@/lib/types";

interface Props {
  impacto: EconomicImpactReport;
  /** Margem bruta projetada em R$ — usada para calcular o % equivalente. */
  margemBruta: number;
}

/**
 * Pergunta invertida — abertura do output em /lotes.
 *
 * "Ao nao proteger este lote, voce aceita um risco de R$ X
 *  em caso de queda de 20% no preco da arroba.
 *  Equivalente a Y% da margem projetada."
 *
 * Aviso (nao alarme): cor amber com borda esquerda brand.
 */
export function PerguntaInvertidaBlock({ impacto, margemBruta }: Props) {
  // Localiza o cenario de queda 20% (variacao_pct = -0.20).
  // Tolerancia para floats: 0.001.
  const cenario20 = impacto.cenarios.find(
    (c) => Math.abs(c.variacao_pct - -0.20) < 0.001,
  );
  if (!cenario20) return null;

  const perda = cenario20.perda_vs_base_brl;
  const pctDaMargem = margemBruta > 0 ? (perda / margemBruta) * 100 : null;

  return (
    <div
      className="rounded-lg"
      style={{
        background: "rgba(200, 155, 60, 0.09)",   // amber bg sutil
        borderLeft: "3px solid #B8763E",          // borda esquerda brand
        padding: "14px 18px",
        marginBottom: 14,
      }}
    >
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        Ao nao proteger este lote, voce aceita um risco de{" "}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            color: "#C89B3C",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtBRL(perda)}
        </span>{" "}
        em caso de queda de 20% no preco da arroba.
      </p>
      {pctDaMargem != null && (
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
            margin: 0,
            marginTop: 6,
          }}
        >
          Equivalente a{" "}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
            {pctDaMargem.toFixed(0)}%
          </span>{" "}
          da margem projetada.
        </p>
      )}
    </div>
  );
}
