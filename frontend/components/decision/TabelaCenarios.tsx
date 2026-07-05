import { fmtBRL, fmtPct } from "@/lib/utils/format";

interface ScenarioResult {
  label: string;
  variacao_pct: number;
  preco_arroba: number;
  margem_brl: number;
  margem_pct: number;
  roi_anualizado: number;
  semaforo: "verde" | "amarelo" | "vermelho";
}

interface Props {
  cenarios: ScenarioResult[];
}

const badge: Record<string, { bg: string; text: string; dot: string }> = {
  verde: { bg: "rgba(22, 163, 74, 0.10)", text: "var(--gain-2)", dot: "var(--gain)" },
  amarelo: { bg: "rgba(217, 119, 6, 0.10)", text: "var(--amber)", dot: "var(--amber)" },
  vermelho: { bg: "rgba(220, 38, 38, 0.10)", text: "var(--loss-2)", dot: "var(--loss)" },
};

export function TabelaCenarios({ cenarios }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[24px_1fr_1fr_1fr_1fr_1fr] gap-0 px-5 py-3"
        style={{ background: "var(--paper-3)", borderBottom: "0.5px solid var(--rule)" }}
      >
        <span />
        {["Cenário", "Arroba", "Margem", "Margem %", "ROI anual"].map((h) => (
          <span
            key={h}
            className={`text-[10px] font-medium uppercase tracking-[0.08em] ${
              h !== "Cenário" ? "text-right" : ""
            }`}
            style={{ color: "var(--ink-3)" }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {cenarios.map((c, i) => {
        const b = badge[c.semaforo];
        const isBase = c.variacao_pct === 0;
        const isLast = i === cenarios.length - 1;

        return (
          <div
            key={i}
            className="grid grid-cols-[24px_1fr_1fr_1fr_1fr_1fr] gap-0 items-center px-5 py-3.5 transition-colors hover:bg-[var(--paper-3)]"
            style={{
              borderBottom: isLast ? "none" : "0.5px solid var(--rule)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: b.dot }}
            />
            <span
              className={`text-[13px] ${isBase ? "font-medium" : ""}`}
              style={{ color: "var(--ink)" }}
            >
              {c.label}
            </span>
            <span
              className="text-right font-mono text-[13px]"
              style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtBRL(c.preco_arroba)}
            </span>
            <span
              className="text-right font-mono text-[13px]"
              style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtBRL(c.margem_brl)}
            </span>
            <span className="text-right">
              <span
                className="inline-block font-mono text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: b.bg, color: b.text }}
              >
                {fmtPct(c.margem_pct)}
              </span>
            </span>
            <span
              className="text-right font-mono text-[13px]"
              style={{ color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(c.roi_anualizado)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
