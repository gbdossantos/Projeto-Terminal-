import type { HedgeResult } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";

export function HedgeDecision({ hedge }: { hedge: HedgeResult | null }) {
  if (!hedge) return (
    <div className="rounded-xl px-5 py-4 text-[12px]"
      style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)", color: "var(--ink-3)" }}>
      Lote pequeno demais para hedge com futuros B3 (minimo ~165@)
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Pergunta central */}
      <div className="rounded-xl px-5 py-5"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)" }}>
        <p className="font-display text-base italic mb-5" style={{ color: "var(--ink-3)" }}>
          &ldquo;Qual risco voce aceita ao nao proteger este lote?&rdquo;
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Se travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "rgba(22, 163, 74, 0.10)", border: "0.5px solid rgba(22, 163, 74, 0.27)" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--gain-2)" }}>
              Se travar — {hedge.contrato_selecionado.codigo}
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Preco garantido</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_travado)}/@
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Voce garante</p>
            <p className="font-mono text-[17px] font-medium mt-0.5" style={{ color: "var(--gain-2)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.margem_hedgeada_brl)} de lucro
            </p>
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "0.5px solid rgba(22, 163, 74, 0.20)" }}>
              <Row label="Contratos" value={`${hedge.contratos_necessarios} (${hedge.arrobas_hedgeadas.toFixed(0)}@)`} />
              <Row label="Custo margem (CDI)" value={fmtBRL(hedge.custo_hedge)} />
              <Row label="Cobertura" value={fmtPct(hedge.cobertura_pct, 0)} color="var(--gain-2)" />
            </div>
          </div>

          {/* Se nao travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "rgba(220, 38, 38, 0.10)", border: "0.5px solid rgba(220, 38, 38, 0.27)" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--loss-2)" }}>
              Se nao travar
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Preco atual</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_spot)}/@
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Cenarios de queda</p>
            <div className="mt-2 space-y-0">
              {hedge.cenarios_grafico.filter(c => c.cenario.includes("cai") || c.cenario.includes("sobe")).map((c, i) => (
                <div key={i} className="flex justify-between py-1.5 text-[11px] font-mono"
                  style={{ borderBottom: "0.5px solid rgba(220, 38, 38, 0.13)", fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: "var(--ink-3)" }}>{c.cenario}</span>
                  <span style={{ color: c.sem_hedge < 0 ? "var(--loss-2)" : c.sem_hedge < hedge.margem_spot_brl * 0.7 ? "var(--loss-2)" : "var(--ink)" }}>
                    {fmtBRL(c.sem_hedge)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>
              {hedge.arrobas_totais.toFixed(0)} arrobas sem protecao alguma
            </p>
          </div>
        </div>
      </div>

      {/* Banner interpretacao */}
      <div className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: "rgba(22, 163, 74, 0.10)", border: "0.5px solid rgba(22, 163, 74, 0.20)", color: "var(--gain-2)" }}>
        {/* TODO: gerar via AI Interpretation Layer (Claude API) */}
        {hedge.justificativa}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span className="font-mono" style={{ color: color || "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
