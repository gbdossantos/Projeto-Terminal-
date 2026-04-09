"use client";

import { useEffect, useState } from "react";
import {
  fetchCotacoes,
  fetchFuturos,
  fetchHistoricoDolar,
  fetchHistoricoArroba,
  fetchHistoricoMilho,
} from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import { PainelMercado } from "@/components/metrics/PainelMercado";
import { MetricCard } from "@/components/metrics/MetricCard";
import { CurvaFuturosChart } from "@/components/mercado/CurvaFuturosChart";
import { BasisRegiao } from "@/components/mercado/BasisRegiao";
import { HistoricoDolar } from "@/components/mercado/HistoricoDolar";
import { fmtBRL } from "@/lib/utils/format";

export default function MercadoPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histDolar, setHistDolar] = useState<HistoricoDolarEntry[]>([]);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [histMilho, setHistMilho] = useState<HistoricoDolarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCotacoes().catch(() => null),
      fetchFuturos().catch(() => null),
      fetchHistoricoDolar(90).catch(() => []),
      fetchHistoricoArroba().catch(() => []),
      fetchHistoricoMilho().catch(() => []),
    ]).then(([c, f, hd, ha, hm]) => {
      if (c) setCotacoes(c);
      if (f) setFuturos(f);
      if (Array.isArray(hd)) setHistDolar(hd);
      if (Array.isArray(ha)) setHistArroba(ha);
      if (Array.isArray(hm)) setHistMilho(hm);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-t-primary">Mercado</h1>
          <p className="text-sm text-t-secondary mt-1">Carregando dados de mercado...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-border rounded-lg bg-card h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Calcular spread spot vs futuros
  const spotPrice = cotacoes?.arroba_boi_gordo ?? null;
  const futuroProximo = futuros?.contratos?.[0];
  const spread = spotPrice && futuroProximo ? spotPrice - futuroProximo.preco_ajuste : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Mercado</h1>
        <p className="text-sm text-t-secondary mt-1">
          Inteligencia de mercado para pecuaria de corte
        </p>
      </div>

      {/* Snapshot cotacoes */}
      {cotacoes && <PainelMercado cotacoes={cotacoes} />}

      {/* Historico da arroba */}
      <div className="border border-border rounded-lg bg-card p-5">
        <h2 className="text-sm font-medium text-t-primary mb-1">Indicador CEPEA — boi gordo</h2>
        <p className="text-[11px] text-t-tertiary mb-4">
          Historico recente do indicador CEPEA/ESALQ (R$/@, praca SP)
        </p>
        {histArroba.length > 0 ? (
          <HistoricoDolar dados={histArroba} />
        ) : (
          <p className="text-sm text-t-tertiary py-8 text-center">
            Historico de arroba indisponivel — scraping bloqueado em cloud
          </p>
        )}
      </div>

      {/* Curva de futuros + tabela detalhada */}
      <div className="border border-border rounded-lg bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-t-primary">Curva de futuros B3 — boi gordo (BGI)</h2>
          {futuros && (
            <span className="text-[11px] text-t-tertiary">
              Fonte: {futuros.fonte} · {futuros.contratos.length} contratos
            </span>
          )}
        </div>
        <p className="text-[11px] text-t-tertiary mb-4">
          Precos de ajuste por vencimento vs spot CEPEA
        </p>

        {futuros && futuros.contratos.length > 0 ? (
          <>
            <CurvaFuturosChart contratos={futuros.contratos} spotPrice={spotPrice} />

            {/* Tabela detalhada de contratos */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-left">
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium">Contrato</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium">Vencimento</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Preco ajuste</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Spread vs spot</th>
                  </tr>
                </thead>
                <tbody>
                  {futuros.contratos.map((c) => {
                    const sp = spotPrice ? c.preco_ajuste - spotPrice : null;
                    return (
                      <tr key={c.codigo} className="border-b border-border">
                        <td className="py-2 px-3 font-mono text-t-primary font-medium">{c.codigo}</td>
                        <td className="py-2 px-3 text-t-secondary">{c.vencimento}</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-primary">
                          {fmtBRL(c.preco_ajuste, 2)}/@
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-mono-nums ${
                          sp && sp > 0 ? "text-success" : sp && sp < 0 ? "text-danger" : "text-t-secondary"
                        }`}>
                          {sp !== null ? `${sp > 0 ? "+" : ""}${fmtBRL(sp, 2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo spread */}
            {spread !== null && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard
                  label="Spot CEPEA"
                  value={fmtBRL(spotPrice!, 2)}
                  unit="/@"
                  compact
                />
                <MetricCard
                  label={`Futuro proximo (${futuroProximo!.codigo})`}
                  value={fmtBRL(futuroProximo!.preco_ajuste, 2)}
                  unit="/@"
                  compact
                />
                <MetricCard
                  label="Spread spot-futuro"
                  value={fmtBRL(spread, 2)}
                  deltaType={spread > 0 ? "positive" : "negative"}
                  delta={spread > 0 ? "Backwardation" : "Contango"}
                  compact
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-t-tertiary py-8 text-center">
            Dados de futuros indisponiveis no momento
          </p>
        )}
      </div>

      {/* Basis + dolar + milho — grid 2x2 */}
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
          <h2 className="text-sm font-medium text-t-primary mb-1">Dolar PTAX — 90 dias</h2>
          <p className="text-[11px] text-t-tertiary mb-4">
            Cotacao de venda USD/BRL
          </p>
          {histDolar.length > 0 ? (
            <HistoricoDolar dados={histDolar} />
          ) : (
            <p className="text-sm text-t-tertiary py-8 text-center">Indisponivel</p>
          )}
        </div>

        {/* Historico milho */}
        <div className="border border-border rounded-lg bg-card p-5">
          <h2 className="text-sm font-medium text-t-primary mb-1">Milho ESALQ</h2>
          <p className="text-[11px] text-t-tertiary mb-4">
            Historico recente do indicador CEPEA/ESALQ (R$/saca 60kg)
          </p>
          {histMilho.length > 0 ? (
            <HistoricoDolar dados={histMilho} />
          ) : (
            <p className="text-sm text-t-tertiary py-8 text-center">
              Historico indisponivel
            </p>
          )}
        </div>

        {/* Indicadores de referencia */}
        <div className="border border-border rounded-lg bg-card p-5">
          <h2 className="text-sm font-medium text-t-primary mb-1">Indicadores de referencia</h2>
          <p className="text-[11px] text-t-tertiary mb-4">
            Benchmarks para avaliacao de retorno
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-t-tertiary uppercase tracking-wider">CDI anualizado</p>
              <p className="text-3xl font-mono font-medium text-t-primary">
                {cotacoes?.cdi_anual ? `${(cotacoes.cdi_anual * 100).toFixed(2)}%` : "—"} <span className="text-sm text-t-tertiary">a.a.</span>
              </p>
            </div>
            <p className="text-sm text-t-secondary leading-relaxed">
              Se o ROI do lote nao supera o CDI, o capital rende mais aplicado.
              A taxa de oportunidade atual e de{" "}
              <span className="font-mono font-medium text-t-primary">
                {cotacoes?.cdi_anual ? `${((cotacoes.cdi_anual / 12) * 100).toFixed(2)}% a.m.` : "—"}
              </span>
            </p>
            {spotPrice && cotacoes?.cdi_anual && (
              <div className="border-t border-border pt-3">
                <p className="text-[11px] text-t-tertiary uppercase tracking-wider">Custo de carregar 1 arroba por 90 dias</p>
                <p className="text-lg font-mono font-medium text-t-primary">
                  {fmtBRL(spotPrice * cotacoes.cdi_anual * (90 / 365), 2)}
                </p>
                <p className="text-[11px] text-t-tertiary">
                  Capital imobilizado de {fmtBRL(spotPrice)} rendendo CDI por 3 meses
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
