"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
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
      {/* Hero */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">
          Visao geral
        </h1>
        <p className="text-sm text-t-secondary mt-1">
          Clareza economica da operacao antes de qualquer decisao
        </p>
      </div>

      {/* Cotacoes */}
      {cotacoes && <PainelMercado cotacoes={cotacoes} />}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/lotes"
          className="group border border-border rounded-lg bg-card px-5 py-5 hover:border-terra/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Layers size={20} strokeWidth={1.5} className="text-terra" />
            <ArrowRight
              size={16}
              className="text-t-tertiary group-hover:text-terra transition-colors"
            />
          </div>
          <p className="text-sm font-medium text-t-primary">Lotes</p>
          <p className="text-xs text-t-tertiary mt-1">
            Calcular custo, margem e ROI do lote
          </p>
        </Link>

        <Link
          href="/impacto"
          className="group border border-border rounded-lg bg-card px-5 py-5 hover:border-terra/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <ShieldAlert size={20} strokeWidth={1.5} className="text-terra" />
            <ArrowRight
              size={16}
              className="text-t-tertiary group-hover:text-terra transition-colors"
            />
          </div>
          <p className="text-sm font-medium text-t-primary">Impacto & cenarios</p>
          <p className="text-xs text-t-tertiary mt-1">
            Simular quedas de preco e ver o impacto no caixa
          </p>
        </Link>

        <Link
          href="/mercado"
          className="group border border-border rounded-lg bg-card px-5 py-5 hover:border-terra/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} strokeWidth={1.5} className="text-terra" />
            <ArrowRight
              size={16}
              className="text-t-tertiary group-hover:text-terra transition-colors"
            />
          </div>
          <p className="text-sm font-medium text-t-primary">Mercado</p>
          <p className="text-xs text-t-tertiary mt-1">
            Cotacoes em tempo real e futuros B3
          </p>
        </Link>
      </div>

      {/* Placeholder stats */}
      <div>
        <h2 className="text-sm font-medium text-t-secondary mb-3">Resumo da operacao</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Lotes ativos" value="1" />
          <MetricCard label="Exposicao total" value="\u2014" unit="@" />
          <MetricCard label="Margem media" value="\u2014" />
          <MetricCard label="Proxima venda" value="\u2014" />
        </div>
        <p className="text-[11px] text-t-tertiary mt-3">
          Calcule seu primeiro lote para ver o resumo aqui
        </p>
      </div>
    </div>
  );
}
