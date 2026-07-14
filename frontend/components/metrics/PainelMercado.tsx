"use client";

import { useEffect, useState } from "react";
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
  // resolveCotacao lê sessionStorage, que não existe no SSR: se o cache da
  // sessão tiver valores, o primeiro render do cliente divergiria do HTML do
  // servidor (hydration mismatch). Antes do mount, trata tudo como
  // indisponível — igual ao servidor; o cache entra no render pós-mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Persiste sempre que recebe um snapshot — campos nao-nulos viram cache.
  useEffect(() => {
    persistCotacoes(cotacoes);
  }, [cotacoes]);

  const resolve = (field: Parameters<typeof resolveCotacao>[0]) =>
    mounted
      ? resolveCotacao(field, cotacoes)
      : { value: null, state: "unavailable" as const, lastUpdateIso: null };

  const arroba = resolve("arroba_boi_gordo");
  const dolar = resolve("dolar_ptax");
  const milho = resolve("milho_esalq");
  const cdi = resolve("cdi_anual");

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
          label="Dólar PTAX"
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
