"use client";

import { useEffect } from "react";
import { MetricCard } from "./MetricCard";
import { CotacaoStatusBadge } from "@/components/cotacoes/cotacao-status-badge";
import {
  persistCotacoes,
  resolveCotacao,
  type CotacaoFieldStatus,
} from "@/lib/cotacoes-cache";

interface CotacaoMercado {
  arroba_boi_gordo: number | null;
  dolar_ptax: number | null;
  milho_esalq: number | null;
  cdi_anual: number | null;
  timestamp: string | null;
}

interface Props {
  cotacoes: CotacaoMercado;
  breakEven?: number;
}

export function PainelMercado({ cotacoes, breakEven }: Props) {
  // Persiste sempre que recebe um snapshot — campos nao-nulos viram cache.
  useEffect(() => {
    persistCotacoes(cotacoes);
  }, [cotacoes]);

  const arroba = resolveCotacao("arroba_boi_gordo", cotacoes);
  const dolar = resolveCotacao("dolar_ptax", cotacoes);
  const milho = resolveCotacao("milho_esalq", cotacoes);
  const cdi = resolveCotacao("cdi_anual", cotacoes);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricWithStatus
          label="Arroba CEPEA/SP"
          status={arroba}
          format={(v) => v.toFixed(2)}
          unit="/@"
          delta={breakEven ? `BE: R$ ${breakEven.toFixed(0)}/@` : undefined}
        />
        <MetricWithStatus
          label="Dolar PTAX"
          status={dolar}
          format={(v) => v.toFixed(2)}
        />
        <MetricWithStatus
          label="Milho ESALQ"
          status={milho}
          format={(v) => v.toFixed(2)}
          unit="/sc"
        />
        <MetricWithStatus
          label="CDI"
          status={cdi}
          format={(v) => `${(v * 100).toFixed(2)}%`}
          unit="a.a."
        />
      </div>
    </div>
  );
}

function MetricWithStatus({
  label,
  status,
  format,
  unit,
  delta,
}: {
  label: string;
  status: CotacaoFieldStatus;
  format: (v: number) => string;
  unit?: string;
  delta?: string;
}) {
  const value = status.value != null ? format(status.value) : "—";
  return (
    <div>
      <MetricCard label={label} value={value} unit={unit} delta={delta} compact />
      <div className="mt-1.5">
        <CotacaoStatusBadge status={status} size="xs" />
      </div>
    </div>
  );
}
