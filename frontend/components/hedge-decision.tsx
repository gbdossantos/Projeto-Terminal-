import type { HedgeResult } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";

export function HedgeDecision({ hedge }: { hedge: HedgeResult | null }) {
  if (!hedge) return (
    <div className="rounded-xl px-5 py-4 text-[12px]"
      style={{ background: "#1A1814", border: "0.5px solid #2A2820", color: "#6B6860" }}>
      Lote pequeno demais para hedge com futuros B3 (minimo ~165@)
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Pergunta central */}
      <div className="rounded-xl px-5 py-5"
        style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
        <p className="font-display text-base italic mb-5" style={{ color: "#6B6860" }}>
          &ldquo;Qual risco voce aceita ao nao proteger este lote?&rdquo;
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Se travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "#4A5D3A18", border: "0.5px solid #4A5D3A44" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "#6B8F5A" }}>
              Se travar — {hedge.contrato_selecionado.codigo}
            </p>
            <p className="text-[10px] mt-3" style={{ color: "#6B6860" }}>Preco garantido</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_travado)}/@
            </p>
            <p className="text-[10px] mt-3" style={{ color: "#6B6860" }}>Voce garante</p>
            <p className="font-mono text-[17px] font-medium mt-0.5" style={{ color: "#6B8F5A", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.margem_hedgeada_brl)} de lucro
            </p>
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "0.5px solid #4A5D3A33" }}>
              <Row label="Contratos" value={`${hedge.contratos_necessarios} (${hedge.arrobas_hedgeadas.toFixed(0)}@)`} />
              <Row label="Custo margem (CDI)" value={fmtBRL(hedge.custo_hedge)} />
              <Row label="Cobertura" value={fmtPct(hedge.cobertura_pct, 0)} color="#6B8F5A" />
            </div>
          </div>

          {/* Se nao travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "#B5413418", border: "0.5px solid #B5413444" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "#D4614A" }}>
              Se nao travar
            </p>
            <p className="text-[10px] mt-3" style={{ color: "#6B6860" }}>Preco atual</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_spot)}/@
            </p>
            <p className="text-[10px] mt-3" style={{ color: "#6B6860" }}>Cenarios de queda</p>
            <div className="mt-2 space-y-0">
              {hedge.cenarios_grafico.filter(c => c.cenario.includes("cai") || c.cenario.includes("sobe")).map((c, i) => (
                <div key={i} className="flex justify-between py-1.5 text-[11px] font-mono"
                  style={{ borderBottom: "0.5px solid #B5413422", fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: "#6B6860" }}>{c.cenario}</span>
                  <span style={{ color: c.sem_hedge < 0 ? "#D4614A" : c.sem_hedge < hedge.margem_spot_brl * 0.7 ? "#D4614A" : "#F5F1E8" }}>
                    {fmtBRL(c.sem_hedge)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-3" style={{ color: "#6B6860" }}>
              {hedge.arrobas_totais.toFixed(0)} arrobas sem protecao alguma
            </p>
          </div>
        </div>
      </div>

      {/* Banner interpretacao */}
      <div className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: "#4A5D3A18", border: "0.5px solid #4A5D3A33", color: "#6B8F5A" }}>
        {/* TODO: gerar via AI Interpretation Layer (Claude API) */}
        {hedge.justificativa}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span style={{ color: "#6B6860" }}>{label}</span>
      <span className="font-mono" style={{ color: color || "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
