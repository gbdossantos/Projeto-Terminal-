"use client";

import { fmtBRL } from "@/lib/utils/format";

/**
 * TERCIÁRIO — retrato do período.
 * Preços do período (arroba, milho) + dado agro cru (precipitação, temperatura).
 * O dado agro é entregue LIMPO, sem disclaimer — a precipitação crua deixa o
 * produtor interpretar a consequência na fazenda dele. Linhas nulas são omitidas
 * (nunca número fabricado).
 */
export default function RetratoPeriodo({
  rotulo,
  arroba,
  milho,
  precipitacaoMm,
  temperaturaC,
}: {
  rotulo: string;
  arroba: number;
  milho: number;
  precipitacaoMm: number | null;
  temperaturaC: number | null;
}) {
  return (
    <section style={{ borderTop: "0.5px solid var(--rule)", paddingTop: 22 }}>
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "var(--ink-3)",
          marginBottom: 14,
        }}
      >
        Retrato do período · {rotulo}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 20,
        }}
      >
        <DadoCru label="Arroba" valor={`${fmtBRL(arroba, 0)}/@`} />
        <DadoCru label="Milho" valor={`${fmtBRL(milho, 0)}/sc`} />
        {precipitacaoMm != null && (
          <DadoCru
            label="Precipitação"
            valor={`${precipitacaoMm.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mm`}
          />
        )}
        {temperaturaC != null && (
          <DadoCru
            label="Temperatura"
            valor={`${temperaturaC.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`}
          />
        )}
      </div>
    </section>
  );
}

function DadoCru({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="mono-num"
        style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--ink)" }}
      >
        {valor}
      </div>
    </div>
  );
}
