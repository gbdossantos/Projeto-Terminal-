"use client";

import { useEffect, useState } from "react";
import { fetchCotacoes, fetchFuturos, fetchHistoricoDolar } from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { CurvaFuturosChart } from "@/components/mercado/CurvaFuturosChart";
import { BasisRegiao } from "@/components/mercado/BasisRegiao";
import { HistoricoDolar } from "@/components/mercado/HistoricoDolar";
import { IndicadoresReferencia } from "@/components/mercado/IndicadoresReferencia";

export default function MercadoPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [historico, setHistorico] = useState<HistoricoDolarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCotacoes().catch(() => null),
      fetchFuturos().catch(() => null),
      fetchHistoricoDolar(30).catch(() => []),
    ]).then(([c, f, h]) => {
      if (c) setCotacoes(c);
      if (f) setFuturos(f);
      if (Array.isArray(h)) setHistorico(h);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-t-primary">Mercado</h1>
          <p className="text-sm text-t-secondary mt-1">Inteligencia de mercado para pecuaria de corte</p>
        </div>
        <div className="text-center py-12 text-t-tertiary text-sm">Carregando dados de mercado...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Mercado</h1>
        <p className="text-sm text-t-secondary mt-1">Inteligencia de mercado para pecuaria de corte</p>
      </div>

      {/* Snapshot */}
      {cotacoes && <PainelMercado cotacoes={cotacoes} />}

      {/* Curva de futuros B3 */}
      <div className="border border-border rounded-lg bg-card p-5">
        <h2 className="text-sm font-medium text-t-primary mb-1">Curva de futuros B3 — boi gordo (BGI)</h2>
        <p className="text-[11px] text-t-tertiary mb-4">
          Precos de ajuste dos contratos futuros por vencimento
        </p>
        {futuros && futuros.contratos.length > 0 ? (
          <CurvaFuturosChart
            contratos={futuros.contratos}
            spotPrice={cotacoes?.arroba_boi_gordo ?? null}
          />
        ) : (
          <p className="text-sm text-t-tertiary py-8 text-center">
            Dados de futuros indisponiveis no momento
          </p>
        )}
      </div>

      {/* Basis + Dolar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basis por regiao */}
        <div className="border border-border rounded-lg bg-card p-5">
          <h2 className="text-sm font-medium text-t-primary mb-1">Basis por regiao</h2>
          <p className="text-[11px] text-t-tertiary mb-4">
            Desconto da praca local vs indicador CEPEA/SP (R$/@)
          </p>
          <BasisRegiao />
        </div>

        {/* Historico dolar */}
        <div className="border border-border rounded-lg bg-card p-5">
          <h2 className="text-sm font-medium text-t-primary mb-1">Dolar PTAX — 30 dias</h2>
          <p className="text-[11px] text-t-tertiary mb-4">
            Cotacao de venda USD/BRL
          </p>
          {historico.length > 0 ? (
            <HistoricoDolar dados={historico} />
          ) : (
            <p className="text-sm text-t-tertiary py-8 text-center">
              Historico indisponivel no momento
            </p>
          )}
        </div>
      </div>

      {/* Indicadores */}
      <div className="border border-border rounded-lg bg-card p-5">
        <h2 className="text-sm font-medium text-t-primary mb-1">Indicadores de referencia</h2>
        <p className="text-[11px] text-t-tertiary mb-4">
          Benchmarks para avaliacao de retorno
        </p>
        <IndicadoresReferencia
          cdiAnual={cotacoes?.cdi_anual ?? null}
          spotPrice={cotacoes?.arroba_boi_gordo ?? null}
        />
      </div>
    </div>
  );
}
