"use client";

import { useEffect, useState } from "react";
import { listLotes, deleteLote, setPendingLoad, type LoteSalvo } from "@/lib/lotes-storage";
import { SISTEMAS_PRODUTIVOS, type SistemaProdutivo } from "@/lib/sistemas";
import { fmtPct } from "@/lib/utils/format";

interface Props {
  /** Chamado quando o usuario clica em um lote salvo. Pai deve trocar a tab para o sistema correspondente. */
  onLoad?: (sistema: SistemaProdutivo) => void;
}

const sistemaLabel: Record<SistemaProdutivo, string> = Object.fromEntries(
  SISTEMAS_PRODUTIVOS.map((s) => [s.id, s.label]),
) as Record<SistemaProdutivo, string>;

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
    setPendingLoad({ sistema: lote.sistema, inputs: lote.inputs });
    onLoad?.(lote.sistema);
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
              <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                {sistemaLabel[l.sistema]} · {fmtData(l.criadoEm)}
                {l.margemPct != null && ` · ${fmtPct(l.margemPct)}`}
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
