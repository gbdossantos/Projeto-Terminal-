"use client";

interface Props {
  cdiAnual: number | null;
  spotPrice: number | null;
}

export function IndicadoresReferencia({ cdiAnual, spotPrice }: Props) {
  const cdiPct = cdiAnual !== null ? (cdiAnual * 100).toFixed(2) : null;

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <p className="text-xs text-t-tertiary mb-1">CDI (taxa de referencia)</p>
      <p className="font-mono text-2xl text-t-primary">
        {cdiPct !== null ? `${cdiPct}% a.a.` : "\u2014"}
      </p>
      {cdiPct !== null && (
        <p className="text-xs text-t-secondary mt-3 leading-relaxed">
          Se o ROI do lote nao supera {cdiPct}% a.a., o capital rende mais
          aplicado no CDI.
        </p>
      )}
      {spotPrice !== null && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-t-tertiary mb-1">Spot CEPEA/SP</p>
          <p className="font-mono text-lg text-t-primary">
            R$ {spotPrice.toFixed(2)}/@
          </p>
        </div>
      )}
    </div>
  );
}
