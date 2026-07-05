import type { HedgeResult } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { badgeVariants } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function HedgeDecision({ hedge }: { hedge: HedgeResult | null }) {
  if (!hedge) return (
    <div className="rounded-xl px-5 py-4 text-[12px]"
      style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)", color: "var(--ink-3)" }}>
      Lote pequeno demais para hedge com futuros B3 (mínimo ~165@)
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Pergunta central + badge de risco de caixa */}
      <div className="rounded-xl px-5 py-5"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)" }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <p className="font-display text-base italic" style={{ color: "var(--ink-3)" }}>
            &ldquo;Qual risco você aceita ao não proteger este lote?&rdquo;
          </p>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "h-auto shrink-0 self-start cursor-default gap-1.5 px-3 py-2 rounded-[10px]"
                    )}
                    style={{ background: "var(--warning-bg)", borderColor: "rgba(217, 119, 6, 0.27)" }}
                  />
                }
              >
                <span className="text-[9px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--warning)" }}>
                  Risco de caixa/dia
                </span>
                <span className="font-mono text-[13px] font-medium" style={{ color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(hedge.capital_risco_diario)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-left">
                {hedge.aviso_capital_risco_diario}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Se travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "rgba(22, 163, 74, 0.10)", border: "0.5px solid rgba(22, 163, 74, 0.27)" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--gain-2)" }}>
              Se travar — {hedge.contrato_selecionado.codigo}
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Preço garantido</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_travado)}/@
            </p>
            <AvisoInline>{hedge.aviso_basis}</AvisoInline>

            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Você garante</p>
            <p className="font-mono text-[17px] font-medium mt-0.5" style={{ color: "var(--gain-2)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.margem_hedgeada_brl)} de lucro
            </p>
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "0.5px solid rgba(22, 163, 74, 0.20)" }}>
              <Row label="Contratos" value={`${hedge.contratos_necessarios} (${hedge.arrobas_hedgeadas.toFixed(0)}@)`} />
              <Row label="Cobertura" value={fmtPct(hedge.cobertura_pct, 0)} color="var(--gain-2)" />
            </div>
            <AvisoInline>{hedge.aviso_rolagem}</AvisoInline>

            <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid rgba(22, 163, 74, 0.20)" }}>
              <Accordion>
                <AccordionItem value="custo" className="border-none">
                  <AccordionTrigger className="py-0 text-[10px] font-normal hover:no-underline" style={{ color: "var(--ink-3)" }}>
                    <span>
                      Custo margem (CDI){" "}
                      <span className="font-mono" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                        {fmtBRL(hedge.custo_hedge)}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-2">
                    <div className="space-y-1">
                      <Row label="Oportunidade da margem" value={fmtBRL(hedge.custo_oportunidade_margem)} />
                      <Row label="Liquidação B3" value={fmtBRL(hedge.custo_liquidacao)} />
                      <Row label="Tarifa B3 (emolumentos)" value={fmtBRL(hedge.custo_emolumentos)} />
                      <Row label="Corretagem" value={fmtBRL(hedge.custo_corretagem)} />
                    </div>
                    <AvisoInline>{hedge.aviso_corretagem}</AvisoInline>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* Se nao travar */}
          <div className="rounded-[10px] p-4"
            style={{ background: "rgba(220, 38, 38, 0.10)", border: "0.5px solid rgba(220, 38, 38, 0.27)" }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--loss-2)" }}>
              Se não travar
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Preço atual</p>
            <p className="font-mono text-[22px] font-medium mt-0.5" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(hedge.preco_spot)}/@
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--ink-3)" }}>Cenários de queda</p>
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
              {hedge.arrobas_totais.toFixed(0)} arrobas sem proteção alguma
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

function AvisoInline({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="mt-1.5 gap-x-1.5 rounded-none border-none bg-transparent p-0">
      <Info className="size-3 shrink-0 translate-y-[3px]" style={{ color: "var(--ink-3)" }} />
      <AlertDescription className="text-[10px] leading-snug" style={{ color: "var(--ink-3)" }}>
        {children}
      </AlertDescription>
    </Alert>
  );
}
