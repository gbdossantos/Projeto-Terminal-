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
  verde: { bg: "#4A5D3A18", text: "#6B8F5A", dot: "#4A5D3A" },
  amarelo: { bg: "#C89B3C18", text: "#C89B3C", dot: "#C89B3C" },
  vermelho: { bg: "#B5413418", text: "#D4614A", dot: "#B54134" },
};

export function TabelaCenarios({ cenarios }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[24px_1fr_1fr_1fr_1fr_1fr] gap-0 px-5 py-3"
        style={{ background: "#221F18", borderBottom: "0.5px solid #2A2820" }}
      >
        <span />
        {["Cenario", "Arroba", "Margem", "Margem %", "ROI anual"].map((h) => (
          <span
            key={h}
            className={`text-[10px] font-medium uppercase tracking-[0.08em] ${
              h !== "Cenario" ? "text-right" : ""
            }`}
            style={{ color: "#6B6860" }}
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
            className="grid grid-cols-[24px_1fr_1fr_1fr_1fr_1fr] gap-0 items-center px-5 py-3.5 transition-colors hover:bg-[#221F18]"
            style={{
              borderBottom: isLast ? "none" : "0.5px solid #2A2820",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: b.dot }}
            />
            <span
              className={`text-[13px] ${isBase ? "font-medium" : ""}`}
              style={{ color: "#F5F1E8" }}
            >
              {c.label}
            </span>
            <span
              className="text-right font-mono text-[13px]"
              style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtBRL(c.preco_arroba)}
            </span>
            <span
              className="text-right font-mono text-[13px]"
              style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}
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
              style={{ color: "#6B6860", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtPct(c.roi_anualizado)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
