import { fmtBRL, fmtPct } from "@/lib/utils/format";
import type { ScenarioResult } from "@/lib/types";

const badge: Record<string, { bg: string; text: string; dot: string }> = {
  verde: { bg: "#4A5D3A18", text: "#6B8F5A", dot: "#4A5D3A" },
  amarelo: { bg: "#C89B3C18", text: "#C89B3C", dot: "#C89B3C" },
  vermelho: { bg: "#B5413418", text: "#D4614A", dot: "#B54134" },
};

export function ScenarioTable({ cenarios }: { cenarios: ScenarioResult[] }) {
  return (
    <div className="rounded-[10px] overflow-hidden"
      style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
      <div className="grid grid-cols-[20px_1fr_1fr_1fr_80px_80px] gap-0 px-3.5 py-2.5"
        style={{ background: "#221F18", borderBottom: "0.5px solid #2A2820" }}>
        <span />
        {["Cenario", "Arroba", "Margem R$", "Margem %", "ROI"].map((h, i) => (
          <span key={h} className={`text-[9px] font-medium uppercase tracking-[0.08em] ${i > 0 ? "text-right" : ""}`}
            style={{ color: "#6B6860" }}>{h}</span>
        ))}
      </div>
      {cenarios.map((c, i) => {
        const b = badge[c.semaforo];
        const isBase = c.variacao_pct === 0;
        const isLast = i === cenarios.length - 1;
        return (
          <div key={i}
            className="grid grid-cols-[20px_1fr_1fr_1fr_80px_80px] gap-0 items-center px-3.5 py-2.5 transition-colors hover:bg-[#221F18]"
            style={{ borderBottom: isLast ? "none" : "0.5px solid #2A2820" }}>
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: b.dot }} />
            <span className={`text-[12px] ${isBase ? "font-medium" : ""}`} style={{ color: "#F5F1E8" }}>{c.label}</span>
            <span className="text-right font-mono text-[12px]" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(c.preco_arroba)}</span>
            <span className="text-right font-mono text-[12px]" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(c.margem_brl)}</span>
            <span className="text-right">
              <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: b.bg, color: b.text }}>{fmtPct(c.margem_pct)}</span>
            </span>
            <span className="text-right font-mono text-[12px]" style={{ color: "#6B6860", fontVariantNumeric: "tabular-nums" }}>{fmtPct(c.roi_anualizado)}</span>
          </div>
        );
      })}
    </div>
  );
}
