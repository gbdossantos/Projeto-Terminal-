"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchVolatilidadeArroba,
  fetchCotacoes,
  fetchFuturos,
  fetchHistoricoArroba,
  fetchNoticiasDoDia,
} from "@/lib/api";
import type {
  CotacaoMercado,
  CurvaFuturos,
  HistoricoDolarEntry,
  Noticia,
} from "@/lib/types";
import { LinhaDoRebanho } from "./LinhaDoRebanho";
import { HeroEstrada } from "./HeroEstrada";
import { TrilhaLotes } from "./TrilhaLotes";
import { BandaEscura } from "./BandaEscura";
import { TopNav } from "@/components/layout/TopNav";
import {
  MOCK_LOTES,
  MOCK_TOTAL_ARROBAS,
  MOCK_TOTAL_CABECAS,
  fmtBRL,
} from "@/lib/mock-data";
import { useProfile } from "@/lib/use-profile";

const SIGMA_FALLBACK = 0.18; // ~18% anualizado — típico boi gordo, fallback se endpoint falhar

// Basis e break-even vêm de useProfile() (editáveis em /configuracoes).
// Defaults: MS basis -5, break-even R$ 286,50 — definidos em lib/profile.ts.

/*
 * Home Estrada — narrativa vertical em 5 camadas, na ordem mental do
 * produtor no fim do dia (DESIGN_ESTRADA.md item 5):
 *
 *   1 · Palco do preço  — "quanto tá o boi?"   (HeroEstrada, full-bleed)
 *   2 · Três métricas   — "quanto tenho no pasto?"
 *   3 · Linha do rebanho — o gráfico
 *   4 · Trilha dos lotes — "e os meus?"        (snap-scroll)
 *   5 · Banda escura    — "por quê?"           (eventos + pergunta invertida)
 */

interface Props {
  /** Sem lote cadastrado: gráfico só mercado, métricas 'R$ —', microcopy honesta. */
  empty?: boolean;
}

export function HomeDashboard({ empty = false }: Props = {}) {
  const { profile } = useProfile();
  const BASIS_MS = profile.basis_valor;
  const BREAK_EVEN = profile.break_even_medio;

  const [sigma, setSigma] = useState<number | null>(null);
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiasUltimaAtualizacao, setNoticiasUltimaAtualizacao] = useState<string | null>(null);
  const [noticiasDeltaDia, setNoticiasDeltaDia] = useState<{
    arroba_pct: number | null;
    dolar_pct: number | null;
    milho_pct: number | null;
  } | null>(null);

  useEffect(() => {
    fetchVolatilidadeArroba(90)
      .then((v) => setSigma(v.sigma_anualizado ?? SIGMA_FALLBACK))
      .catch(() => setSigma(SIGMA_FALLBACK));
    fetchCotacoes().then(setCotacoes).catch(() => {});
    fetchFuturos().then(setFuturos).catch(() => {});
    fetchHistoricoArroba().then((h) => Array.isArray(h) && setHistArroba(h)).catch(() => {});
    // Fetch inicial + polling a cada 60s pra capturar batch novo do cron
    const refetchNoticias = () => {
      fetchNoticiasDoDia()
        .then((r) => {
          setNoticias(r.noticias ?? []);
          setNoticiasUltimaAtualizacao(r.ultima_atualizacao);
          setNoticiasDeltaDia(r.delta_dia ?? null);
        })
        .catch(() => {});
    };
    refetchNoticias();
    const intervalNoticias = setInterval(refetchNoticias, 60_000);
    return () => clearInterval(intervalNoticias);
  }, []);

  // ── Cotações derivadas: dados reais quando disponíveis, fallback claro quando não ──
  // Spot CEPEA/SP → spot MS = spot + basis (basis MS = -5)
  const spotSP = cotacoes?.arroba_boi_gordo ?? null;
  const spotMS = spotSP != null ? spotSP + BASIS_MS : null;

  // Delta do dia: último vs penúltimo do histórico
  const deltaDia = useMemo(() => {
    if (histArroba.length < 2) return null;
    const ultimo = histArroba[histArroba.length - 1].valor;
    const penultimo = histArroba[histArroba.length - 2].valor;
    return ultimo - penultimo;
  }, [histArroba]);

  // BGI alvo da Linha do Rebanho: contrato MAIS DISTANTE disponível na curva.
  // Decisão de produto: a linha precisa mostrar pra onde o mercado precifica
  // a médio prazo (pedagógico). Usar o BGI próximo deixa a linha quase reta
  // porque o contrato vencendo já convergiu com o spot.
  const bgiAlvo = useMemo(() => {
    if (!futuros?.contratos?.length) return null;
    const hoje = new Date();
    const validos = futuros.contratos
      .filter((c) => new Date(c.vencimento) > hoje)
      .sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());
    return validos[0] ?? null;
  }, [futuros]);

  // Cálculos do rebanho (dependem de cotação real E de break-even configurado —
  // sem BE, margem = spot inteiro, número falso)
  const spotEfetivo = spotMS; // null quando API indisponível
  const beConfigurado = BREAK_EVEN > 0;
  const rebanhoExposto = spotEfetivo != null ? MOCK_TOTAL_ARROBAS * spotEfetivo : null;
  const margemSobreBE =
    spotEfetivo != null && beConfigurado ? spotEfetivo - BREAK_EVEN : null;
  const margemTotal = margemSobreBE != null ? margemSobreBE * MOCK_TOTAL_ARROBAS : null;

  // Fôlego: quanto o preço pode cair antes da margem virar vermelha (<5%).
  // Preço-limite P onde (P − BE)/P = 5% → P = BE / 0.95.
  const folego = useMemo(() => {
    if (spotEfetivo == null || BREAK_EVEN <= 0) return null;
    const precoLimite = BREAK_EVEN / 0.95;
    const quedaReais = spotEfetivo - precoLimite;
    const quedaPct = (quedaReais / spotEfetivo) * 100;
    return { quedaReais, quedaPct };
  }, [spotEfetivo, BREAK_EVEN]);

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <TopNav />

      {/* ── Camada 1 · Palco do preço (full-bleed) ── */}
      <HeroEstrada spot={spotMS} deltaDia={deltaDia} />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 80px" }}>
        {/* ── Camada 2 · Três métricas ── */}
        <section style={{ marginTop: 90 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              borderTop: "1px solid var(--rule)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <Metrica
              titulo="REBANHO EXPOSTO"
              valor={
                empty || rebanhoExposto == null ? (
                  <Indisponivel unidade="mi" />
                ) : (
                  <span>
                    R$ <span className="mono-num">{fmtBRL(rebanhoExposto / 1_000_000, 2)}</span>
                    <Unidade>mi</Unidade>
                  </span>
                )
              }
              sub={
                empty ? (
                  "cadastre um lote para projetar sua exposição"
                ) : rebanhoExposto == null ? (
                  "cotação indisponível"
                ) : (
                  <span>
                    <span className="mono-num">{MOCK_TOTAL_ARROBAS.toLocaleString("pt-BR")}</span> @ em{" "}
                    <span className="mono-num">{MOCK_LOTES.length}</span> lotes ·{" "}
                    <span className="mono-num">{MOCK_TOTAL_CABECAS.toLocaleString("pt-BR")}</span> cab
                  </span>
                )
              }
            />
            <Metrica
              titulo="MARGEM SOBRE BREAK-EVEN"
              valor={
                empty || margemSobreBE == null ? (
                  <Indisponivel unidade="/@" />
                ) : (
                  <span style={{ color: margemSobreBE >= 0 ? "var(--gain-2)" : "var(--loss)" }}>
                    {margemSobreBE >= 0 ? "+" : "-"}R${" "}
                    <span className="mono-num">{fmtBRL(Math.abs(margemSobreBE))}</span>
                    <Unidade>/@</Unidade>
                  </span>
                )
              }
              sub={
                empty ? (
                  "break-even depende dos seus custos cadastrados"
                ) : !beConfigurado ? (
                  "configure o break-even no perfil"
                ) : margemTotal == null ? (
                  "cotação indisponível"
                ) : (
                  <span>
                    {margemTotal >= 0 ? "+" : "-"}R${" "}
                    <span className="mono-num">{fmtBRL(Math.abs(margemTotal) / 1_000_000)}</span> mi no rebanho
                  </span>
                )
              }
              hairline
            />
            <Metrica
              titulo="FÔLEGO ATÉ O VERMELHO"
              valor={
                empty || folego == null ? (
                  <Indisponivel unidade="%" />
                ) : folego.quedaPct <= 0 ? (
                  <span style={{ color: "var(--loss)" }}>no vermelho</span>
                ) : (
                  <span>
                    <span className="mono-num">{fmtBRL(folego.quedaPct, 1)}</span>
                    <Unidade>%</Unidade>
                  </span>
                )
              }
              sub={
                empty ? (
                  "quanto o preço pode cair antes da margem apertar"
                ) : !beConfigurado ? (
                  "configure o break-even no perfil"
                ) : folego == null ? (
                  "cotação indisponível"
                ) : folego.quedaReais > 0 ? (
                  <span>
                    queda de R$ <span className="mono-num">{fmtBRL(folego.quedaReais)}</span>/@ até
                    margem &lt; 5%
                  </span>
                ) : (
                  "margem já está abaixo de 5%"
                )
              }
              hairline
            />
          </div>
        </section>

        {/* ── Camada 3 · A linha do rebanho ── */}
        <section style={{ marginTop: 100 }}>
          <div className="stitch" style={{ marginBottom: 48 }} />
          <p
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--ink-3)",
              marginBottom: 8,
            }}
          >
            A LINHA DO REBANHO
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.015em",
              lineHeight: 1.15,
              maxWidth: 720,
              marginBottom: 24,
            }}
          >
            {empty
              ? "Você ainda não tem lote cadastrado."
              : "Do que aconteceu hoje até a saída do último lote."}
          </h1>
          <LinhaDoRebanho
            sigmaAnualizado={sigma}
            empty={empty}
            historico={histArroba}
            spotAtual={spotMS}
            bgi={bgiAlvo}
            breakEven={BREAK_EVEN}
          />
        </section>

        {/* ── Camada 4 · Trilha dos lotes ── */}
        <section style={{ marginTop: 100 }}>
          <p
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--ink-3)",
              marginBottom: 20,
            }}
          >
            A TRILHA DOS LOTES
          </p>
          <TrilhaLotes spot={spotMS} breakEven={BREAK_EVEN} empty={empty} />
        </section>

        {/* ── Camada 5 · Banda escura ── */}
        <div style={{ marginTop: 100 }}>
          <BandaEscura
            noticias={empty ? [] : noticias}
            ultimaAtualizacao={empty ? null : noticiasUltimaAtualizacao}
            deltaDia={empty ? null : noticiasDeltaDia}
            dolarPtax={cotacoes?.dolar_ptax ?? null}
            spotMS={spotMS}
            arrobasTotais={MOCK_TOTAL_ARROBAS}
            empty={empty}
          />
        </div>
      </main>
    </div>
  );
}

// ─── Métrica da camada 2 — mono, hairlines, sem card ─────────────
function Metrica({
  titulo,
  valor,
  sub,
  hairline,
}: {
  titulo: string;
  valor: React.ReactNode;
  sub: React.ReactNode;
  hairline?: boolean;
}) {
  return (
    <div
      style={{
        padding: "26px 28px",
        borderLeft: hairline ? "1px solid var(--rule)" : "none",
      }}
    >
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          color: "var(--ink-3)",
          marginBottom: 12,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 30,
          fontWeight: 500,
          color: "var(--ink)",
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-2)",
          marginTop: 10,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function Unidade({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 14, color: "var(--ink-2)", marginLeft: 3 }}>{children}</span>;
}

function Indisponivel({ unidade }: { unidade: string }) {
  return (
    <span style={{ color: "var(--ink-3)" }}>
      —<Unidade>{unidade}</Unidade>
    </span>
  );
}
