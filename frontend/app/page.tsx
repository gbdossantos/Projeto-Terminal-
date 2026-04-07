"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, TrendingUp, ArrowRight } from "lucide-react";
import { fetchCotacoes } from "@/lib/api";
import type { CotacaoMercado } from "@/lib/types";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { MetricCard } from "@/components/metrics/MetricCard";

export default function HomePage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);

  useEffect(() => {
    fetchCotacoes().then(setCotacoes).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">
          Visao geral
        </h1>
        <p className="text-sm text-t-secondary mt-1">
          Clareza economica da operacao antes de qualquer decisao
        </p>
      </div>

      {cotacoes && <PainelMercado cotacoes={cotacoes} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/lotes"
          className="group border border-border rounded-lg bg-card px-5 py-5 hover:border-terra/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Layers size={20} strokeWidth={1.5} className="text-terra" />
            <ArrowRight size={16} className="text-t-tertiary group-hover:text-terra transition-colors" />
          </div>
          <p className="text-sm font-medium text-t-primary">Calcular lote</p>
          <p className="text-xs text-t-tertiary mt-1">
            Custo, margem, ROI e protecao — pasto, confinamento, semi, cria, recria
          </p>
        </Link>

        <Link
          href="/mercado"
          className="group border border-border rounded-lg bg-card px-5 py-5 hover:border-terra/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} strokeWidth={1.5} className="text-terra" />
            <ArrowRight size={16} className="text-t-tertiary group-hover:text-terra transition-colors" />
          </div>
          <p className="text-sm font-medium text-t-primary">Inteligencia de mercado</p>
          <p className="text-xs text-t-tertiary mt-1">
            Curva de futuros B3, basis por regiao, dolar, CDI
          </p>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-medium text-t-secondary mb-3">Resumo da operacao</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Lotes ativos" value="—" />
          <MetricCard label="Exposicao total" value="—" unit="@" />
          <MetricCard label="Margem media" value="—" />
          <MetricCard label="Proxima venda" value="—" />
        </div>
        <p className="text-[11px] text-t-tertiary mt-3">
          Calcule seu primeiro lote para ver o resumo aqui
        </p>
      </div>
    </div>
  );
}
