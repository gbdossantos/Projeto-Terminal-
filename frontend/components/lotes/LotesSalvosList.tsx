"use client";

/**
 * Lista de lotes salvos no localStorage.
 *
 * Pós-refactor fase/sistema: exibe `Fase · Sistema` (middot U+00B7) como
 * info terciária discreta. Hierarquia visual: status > margem > fase·sistema.
 */

import { useEffect, useState } from "react";
import { listLotes, deleteLote, setPendingLoad, type LoteSalvo } from "@/lib/lotes-storage";
import { FASE_LABEL, SISTEMA_LABEL, type Fase, type Sistema } from "@/lib/types";
import { fmtPct } from "@/lib/utils/format";

interface Props {
  /**
   * Chamado quando o usuário clica em um lote salvo. Pai abre o form da
   * combinação `(fase, sistema)` correspondente.
   */
  onLoad?: (fase: Fase, sistema: Sistema) => void;
}

function fmtData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function LotesSalvosList({ onLoad }: Props) {
  const [lotes, setLotes] = useState<LoteSalvo[]>([]);

  useEffect(() => {
    setLotes(listLotes());
  }, []);

  if (lotes.length === 0) return null;

  const handleLoad = (lote: LoteSalvo) => {
    setPendingLoad({ fase: lote.fase, sistema: lote.sistema, inputs: lote.inputs });
    onLoad?.(lote.fase, lote.sistema);
  };

  const handleDelete = (id: string) => {
    deleteLote(id);
    setLotes(listLotes());
  };

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        padding: "10px 14px",
        marginBottom: 18,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
          }}
        >
          Lotes salvos · {lotes.length}
        </span>
      </div>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {lotes.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-2 rounded"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
              padding: "5px 9px",
            }}
          >
            <button
              onClick={() => handleLoad(l)}
              className="flex items-center gap-2"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                color: "var(--text-primary)",
              }}
            >
              <span style={{ fontWeight: 500 }}>{l.nome}</span>
              {/*
                Info terciária — discreta: data, margem (quando aplicável), fase·sistema.
                Brief: hierarquia status > margem > fase·sistema.
                Fase·Sistema fica por último, mesma cor de --text-tertiary, sem chip.
              */}
              <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                {fmtData(l.criadoEm)}
                {l.margemPct != null && ` · ${fmtPct(l.margemPct)}`}
                {` · ${FASE_LABEL[l.fase]} · ${SISTEMA_LABEL[l.sistema]}`}
              </span>
            </button>
            <button
              onClick={() => handleDelete(l.id)}
              title="Apagar"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                fontSize: 12,
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
