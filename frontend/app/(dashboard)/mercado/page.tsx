"use client";

import { useEffect, useState } from "react";
import {
  fetchCotacoes,
  fetchFuturos,
  fetchHistoricoArroba,
  fetchHistoricoMilho,
} from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import { TickerTape } from "@/components/mercado/ticker-tape";
import { CotacaoCard } from "@/components/mercado/cotacao-card";
import { CurvaBGIChart } from "@/components/mercado/curva-bgi-chart";
import { ContratosTable } from "@/components/mercado/contratos-table";
import { AlertasFeed } from "@/components/mercado/alertas-feed";
import { SparkLine } from "@/components/mercado/spark-line";
import { BasisGrid } from "@/components/mercado/basis-grid";

export default function MercadoPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [histMilho, setHistMilho] = useState<HistoricoDolarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCotacoes().catch(() => null),
      fetchFuturos().catch(() => null),
      fetchHistoricoArroba().catch(() => []),
      fetchHistoricoMilho().catch(() => []),
    ]).then(([c, f, ha, hm]) => {
      if (c) setCotacoes(c);
      if (f) setFuturos(f);
      if (Array.isArray(ha)) setHistArroba(ha);
      if (Array.isArray(hm)) setHistMilho(hm);
      setLoading(false);
    });
  }, []);

  const spotPrice = cotacoes?.arroba_boi_gordo ?? null;
  const contratos = futuros?.contratos ?? [];

  // Sparkline data (last 20 points)
  const arrobaSparkData = histArroba.slice(-20).map((d) => d.valor);
  const milhoSparkData = histMilho.slice(-20).map((d) => d.valor);

  // Milho stats
  const milhoAtual = cotacoes?.milho_esalq ?? (histMilho.length > 0 ? histMilho[histMilho.length - 1].valor : null);
  const milhoMin = milhoSparkData.length > 0 ? Math.min(...milhoSparkData) : null;
  const milhoMax = milhoSparkData.length > 0 ? Math.max(...milhoSparkData) : null;

  // CDI sub line
  const cdiSub =
    cotacoes?.cdi_anual != null && spotPrice != null
      ? `${((cotacoes.cdi_anual / 12) * 100).toFixed(2)}% a.m. · R$${(spotPrice * cotacoes.cdi_anual * (90 / 365)).toFixed(2)}/@ 90d`
      : undefined;

  // Backwardation check for interpretation banner
  const avgFutures =
    contratos.length > 0
      ? contratos.reduce((s, c) => s + c.preco_ajuste, 0) / contratos.length
      : 0;
  const isBackwardation = spotPrice != null && spotPrice > avgFutures;

  // Loading skeleton
  if (loading) {
    return (
      <div>
        {/* Ticker skeleton */}
        <div
          className="animate-pulse"
          style={{ background: "#221F18", height: 28, borderBottom: "0.5px solid #2A2820" }}
        />
        {/* Cotacoes skeleton */}
        <div className="grid grid-cols-4" style={{ borderBottom: "0.5px solid #2A2820" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: 80,
                background: "#1A1814",
                borderRight: i < 4 ? "0.5px solid #2A2820" : "none",
              }}
            />
          ))}
        </div>
        {/* Main skeleton */}
        <div className="grid" style={{ gridTemplateColumns: "1fr 240px", borderBottom: "0.5px solid #2A2820" }}>
          <div className="animate-pulse" style={{ height: 400, background: "#0F0E0B" }} />
          <div className="animate-pulse" style={{ height: 400, background: "#0F0E0B", borderLeft: "0.5px solid #2A2820" }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── TICKER TAPE ── */}
      <TickerTape cotacoes={cotacoes} contratos={contratos} />

      {/* ── COTACOES STRIP ── */}
      <div
        className="grid grid-cols-4"
        style={{ borderBottom: "0.5px solid #2A2820" }}
      >
        <CotacaoCard
          label="Arroba CEPEA/SP"
          value={spotPrice != null ? `R$ ${spotPrice.toFixed(2)}` : "—"}
          suffix="/@"
          large
          sparkData={arrobaSparkData}
          sparkColor={arrobaSparkData.length > 1 && arrobaSparkData[arrobaSparkData.length - 1] >= arrobaSparkData[0] ? "#6B8F5A" : "#D4614A"}
        />
        <CotacaoCard
          label="Dolar PTAX"
          value={cotacoes?.dolar_ptax != null ? `R$ ${cotacoes.dolar_ptax.toFixed(2)}` : "—"}
        />
        <CotacaoCard
          label="Milho ESALQ"
          value={cotacoes?.milho_esalq != null ? `R$ ${cotacoes.milho_esalq.toFixed(2)}` : "—"}
          suffix="/sc"
          sparkData={milhoSparkData}
          sparkColor={milhoSparkData.length > 1 && milhoSparkData[milhoSparkData.length - 1] >= milhoSparkData[0] ? "#6B8F5A" : "#D4614A"}
        />
        <CotacaoCard
          label="CDI"
          value={cotacoes?.cdi_anual != null ? `${(cotacoes.cdi_anual * 100).toFixed(2)}%` : "—"}
          suffix="a.a."
          subLine={cdiSub}
          isLast
        />
      </div>

      {/* ── MAIN 2-COL BLOCK ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 240px",
          borderBottom: "0.5px solid #2A2820",
        }}
      >
        {/* Left — Curva BGI + Contratos table */}
        <div>
          {contratos.length > 0 ? (
            <>
              <CurvaBGIChart
                contratos={contratos}
                spotPrice={spotPrice}
                fonte={futuros?.fonte ?? ""}
              />
              <ContratosTable contratos={contratos} spotPrice={spotPrice} />
            </>
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                height: 300,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "#6B6860",
              }}
            >
              Dados de futuros indisponiveis no momento
            </div>
          )}
        </div>

        {/* Right — Alertas + Milho + Interpretation */}
        <div
          className="flex flex-col"
          style={{
            borderLeft: "0.5px solid #2A2820",
            padding: 14,
            gap: 9,
          }}
        >
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 13,
              color: "#F5F1E8",
              marginBottom: 2,
            }}
          >
            Alertas de mercado
          </h3>

          {/* Alertas feed */}
          <AlertasFeed
            cotacoes={cotacoes}
            contratos={contratos}
            spotPrice={spotPrice}
            histArroba={histArroba}
            histMilho={histMilho}
          />

          {/* Milho sparkline card */}
          {milhoSparkData.length > 1 && (
            <div
              style={{
                background: "#1A1814",
                border: "0.5px solid #2A2820",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10,
                    color: "#6B6860",
                  }}
                >
                  Milho ESALQ — 20d
                </span>
                {milhoAtual != null && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: "#F5F1E8",
                    }}
                  >
                    R$ {milhoAtual.toFixed(2)}
                  </span>
                )}
              </div>
              <SparkLine
                data={milhoSparkData}
                color="#B8763E"
                width={208}
                height={36}
                strokeWidth={1.5}
              />
              {milhoMin != null && milhoMax != null && (
                <div className="flex justify-between mt-1">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: "#6B6860",
                    }}
                  >
                    min R${milhoMin.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: "#6B6860",
                    }}
                  >
                    max R${milhoMax.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Interpretation banner */}
          <div
            style={{
              background: "#4A5D3A15",
              border: "0.5px solid #4A5D3A33",
              borderRadius: 7,
              padding: "9px 11px",
            }}
          >
            <span
              className="block"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: "#6B8F5A",
                marginBottom: 4,
              }}
            >
              {isBackwardation ? "Janela de travamento" : "Contexto de mercado"}
            </span>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                color: "#6B6860",
                lineHeight: 1.5,
              }}
            >
              {isBackwardation
                ? "Mercado em backwardation — futuros abaixo do spot. Janela favoravel para travar precos se break-even esta coberto. Avaliar cenarios no Simulador."
                : "Mercado em contango — futuros acima do spot. Custo de carrego embutido nos premios. Avaliar necessidade de protecao vs custo de oportunidade."}
            </span>
          </div>
        </div>
      </div>

      {/* ── BASIS GRID ── */}
      {spotPrice != null && <BasisGrid spotPrice={spotPrice} />}
    </div>
  );
}
