"use client";

import { useEffect, useState } from "react";
import { fetchCotacoes } from "@/lib/api";
import type { CotacaoMercado } from "@/lib/types";
import { PainelMercado } from "@/components/metrics/PainelMercado";

export default function MercadoPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);

  useEffect(() => {
    fetchCotacoes().then(setCotacoes).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Mercado</h1>
        <p className="text-sm text-t-secondary mt-1">Cotacoes em tempo real</p>
      </div>
      {cotacoes && <PainelMercado cotacoes={cotacoes} />}
      <div className="border border-border rounded-lg bg-card px-5 py-12 text-center">
        <p className="text-t-tertiary text-sm">
          Graficos de variacao e futuros B3 em breve
        </p>
      </div>
    </div>
  );
}
