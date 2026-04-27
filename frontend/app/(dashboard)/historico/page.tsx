"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listLotes, deleteLote, setPendingLoad, type LoteSalvo } from "@/lib/lotes-storage";
import { SISTEMAS_PRODUTIVOS, type SistemaProdutivo } from "@/lib/sistemas";
import { fmtPct } from "@/lib/utils/format";

const sistemaLabel: Record<SistemaProdutivo, string> = Object.fromEntries(
  SISTEMAS_PRODUTIVOS.map((s) => [s.id, s.label]),
) as Record<SistemaProdutivo, string>;

function fmtData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function HistoricoPage() {
  const router = useRouter();
  const [lotes, setLotes] = useState<LoteSalvo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLotes(listLotes());
    setHydrated(true);
  }, []);

  const handleAbrir = (lote: LoteSalvo) => {
    setPendingLoad({ sistema: lote.sistema, inputs: lote.inputs });
    router.push("/lotes");
  };

  const handleDelete = (id: string) => {
    deleteLote(id);
    setLotes(listLotes());
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Historico</h1>
        <p className="text-sm text-t-secondary mt-1">
          Lotes salvos localmente nesta sessao. Persistencia em banco vem com auth.
        </p>
      </div>

      {!hydrated ? (
        <div
          className="border rounded-lg px-5 py-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-t-tertiary text-sm">Carregando...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div
          className="border rounded-lg px-5 py-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
        >
          <p className="text-t-tertiary text-sm">Nenhum lote salvo ainda.</p>
          <p
            className="mt-2"
            style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--text-tertiary)" }}
          >
            Em /lotes, calcule um lote e clique em &ldquo;Salvar este lote&rdquo;.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "var(--surface-2)",
                  borderBottom: "0.5px solid var(--border-subtle)",
                }}
              >
                {["Nome", "Sistema", "Salvo em", "Margem", ""].map((h, i) => (
                  <th
                    key={h}
                    className={i === 0 ? "text-left" : i === 4 ? "text-right" : "text-left"}
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 9,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      padding: "9px 14px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotes.map((l, idx) => (
                <tr
                  key={l.id}
                  style={{
                    borderBottom:
                      idx === lotes.length - 1 ? "none" : "0.5px solid var(--border-subtle)",
                  }}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <button
                      onClick={() => handleAbrir(l)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        textAlign: "left",
                      }}
                    >
                      {l.nome}
                    </button>
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {sistemaLabel[l.sistema]}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {fmtData(l.criadoEm)}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: l.margemPct == null
                        ? "var(--text-tertiary)"
                        : l.margemPct >= 0.15
                          ? "var(--green-2)"
                          : l.margemPct >= 0.05
                            ? "var(--amber)"
                            : "var(--red-2)",
                      fontWeight: 500,
                    }}
                  >
                    {l.margemPct != null ? fmtPct(l.margemPct) : "—"}
                  </td>
                  <td className="text-right" style={{ padding: "10px 14px" }}>
                    <button
                      onClick={() => handleAbrir(l)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "var(--brand)",
                        marginRight: 12,
                      }}
                    >
                      abrir
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      title="Apagar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
