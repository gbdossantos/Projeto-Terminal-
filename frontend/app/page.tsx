"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchCotacoes, fetchHistoricoArroba, fetchFuturos } from "@/lib/api";
import type { CotacaoMercado, CurvaFuturos, HistoricoDolarEntry } from "@/lib/types";
import {
  persistCotacoes,
  resolveCotacao,
  type CotacaoFieldStatus,
} from "@/lib/cotacoes-cache";
import { CotacaoStatusBadge } from "@/components/cotacoes/cotacao-status-badge";

const BASIS_MS = -5; // R$/@ desconto MS vs SP

type FetchStatus = "loading" | "ready" | "error";

export default function LandingPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    Promise.all([
      fetchCotacoes().catch(() => null),
      fetchHistoricoArroba().catch(() => []),
      fetchFuturos().catch(() => null),
    ]).then(([c, ha, f]) => {
      if (c) {
        setCotacoes(c);
        persistCotacoes(c);
      }
      if (Array.isArray(ha)) setHistArroba(ha);
      if (f) setFuturos(f);
      setStatus(c ? "ready" : "error");
    });
  }, []);

  // Resolucao por campo (fresh / stale / unavailable)
  const arrobaStatus = resolveCotacao("arroba_boi_gordo", cotacoes);
  const dolarStatus = resolveCotacao("dolar_ptax", cotacoes);
  const milhoStatus = resolveCotacao("milho_esalq", cotacoes);

  // Arroba MS = CEPEA/SP + basis (preserva o mesmo state do SP)
  const arrobaMSStatus: CotacaoFieldStatus = {
    value: arrobaStatus.value != null ? arrobaStatus.value + BASIS_MS : null,
    state: arrobaStatus.state,
    lastUpdateIso: arrobaStatus.lastUpdateIso,
  };
  const spotSP = arrobaStatus.value;

  // Delta vs dia anterior — so faz sentido com cotacao fresca
  const arrobaDelta = (() => {
    if (arrobaStatus.state !== "fresh" || histArroba.length < 2 || spotSP == null) return null;
    const prev = histArroba[histArroba.length - 2].valor;
    const prevMS = prev + BASIS_MS;
    const currentMS = spotSP + BASIS_MS;
    const pct = ((currentMS - prevMS) / prevMS) * 100;
    return pct;
  })();

  // Próximo vencimento BGI
  const proxVencimento = (() => {
    if (!futuros?.contratos?.length) return null;
    const now = new Date();
    let minDays = Infinity;
    for (const c of futuros.contratos) {
      const venc = new Date(c.vencimento);
      const diff = Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff < minDays) minDays = diff;
    }
    return minDays === Infinity ? null : minDays;
  })();

  // Format helpers
  const fmtArroba = (v: number) => v.toFixed(0);
  const fmtArrobaFull = (v: number) => v.toFixed(2).replace(".", ",");
  const fmtDelta = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* ── Navbar ── */}
      <nav
        className="flex items-center justify-between px-12 h-14"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <Link href="/" className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
          Terminal
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/lotes" className="text-[13px] transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Lotes
          </Link>
          <Link href="/mercado" className="text-[13px] transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Mercado
          </Link>
          <Link href="/simulador" className="text-[13px] transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Simulador
          </Link>
        </div>

        <Link
          href="/lotes"
          className="text-[13px] px-3.5 py-1.5 rounded-md transition-colors"
          style={{ border: "0.5px solid var(--brand)", color: "var(--brand)" }}
        >
          Entrar &rarr;
        </Link>
      </nav>

      {/* ── Hero (full-bleed) ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 580 }}>
        {/* Background image — covers entire hero */}
        <Image
          src="/images/hero-cattle.jpg"
          alt="Rebanho em pastagem ao por do sol"
          fill
          priority
          className="object-cover"
          style={{ objectPosition: "70% center" }}
          sizes="100vw"
        />

        {/* Overlay — strong on left (text), fades to transparent on right (photo) */}
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background: "linear-gradient(to right, #0F0E0B 0%, #0F0E0B 30%, rgba(15,14,11,0.85) 42%, rgba(15,14,11,0) 58%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none block dark:hidden"
          style={{
            background: "linear-gradient(to right, #EDE9E0 0%, #EDE9E0 30%, rgba(237,233,224,0.85) 42%, rgba(237,233,224,0) 58%)",
          }}
        />

        {/* Bottom fade — blends into stats strip */}
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background: "linear-gradient(to top, #0F0E0B 0%, rgba(15,14,11,0) 20%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none block dark:hidden"
          style={{
            background: "linear-gradient(to top, #EDE9E0 0%, rgba(237,233,224,0) 20%)",
          }}
        />

        {/* Text content — positioned on left half */}
        <div
          className="relative z-10 flex flex-col justify-center px-12 py-20"
          style={{
            maxWidth: "50%",
            minHeight: 580,
            animation: "fadeInUp 0.6s ease-out both",
          }}
        >
          <p
            className="text-[10px] tracking-[0.12em] mb-4"
            style={{ color: "var(--brand)", fontFamily: "var(--font-inter)" }}
          >
            GESTAO DE RISCO PECUARIO
          </p>

          <h1
            className="font-display text-4xl leading-[1.2] max-w-[420px] mb-5"
            style={{ color: "var(--text-primary)", fontWeight: 400 }}
          >
            Clareza economica antes de qualquer decisao
          </h1>

          <p
            className="text-sm leading-[1.7] max-w-[380px] mb-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            Saiba exatamente qual risco voce aceita ao nao proteger seu lote.
            Margem, break-even e cenarios de queda em tempo real.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/lotes"
              className="text-[13px] font-medium px-5 py-2.5 rounded-[7px] transition-all hover:brightness-110"
              style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
            >
              Acessar plataforma
            </Link>
            <Link
              href="/mercado"
              className="text-[13px] px-5 py-2.5 rounded-[7px] transition-colors"
              style={{ border: "0.5px solid rgba(255,255,255,0.2)", color: "var(--text-tertiary)" }}
            >
              Ver demonstracao
            </Link>
          </div>
        </div>

        {/* Data card — top right (arroba MS ao vivo) */}
        <div
          className="absolute top-8 right-8 px-4 py-3 rounded-[8px] backdrop-blur-md z-10 hidden dark:block"
          style={{
            background: "rgba(15,14,11,0.75)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <HeroArrobaCard status={arrobaMSStatus} arrobaDelta={arrobaDelta} fmtArrobaFull={fmtArrobaFull} fmtDelta={fmtDelta} loading={status === "loading"} />
        </div>
        <div
          className="absolute top-8 right-8 px-4 py-3 rounded-[8px] backdrop-blur-md z-10 block dark:hidden"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <HeroArrobaCard status={arrobaMSStatus} arrobaDelta={arrobaDelta} fmtArrobaFull={fmtArrobaFull} fmtDelta={fmtDelta} loading={status === "loading"} />
        </div>

        {/* Data card — bottom right (calcule seu lote) */}
        <div
          className="absolute bottom-8 right-8 px-4 py-3 rounded-[8px] backdrop-blur-md z-10 hidden dark:block"
          style={{
            background: "rgba(15,14,11,0.75)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <MargemCard />
        </div>
        <div
          className="absolute bottom-8 right-8 px-4 py-3 rounded-[8px] backdrop-blur-md z-10 block dark:hidden"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <MargemCard />
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        <StatCell label="Arroba boi gordo" status={arrobaStatus} loading={status === "loading"}>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl font-medium" style={{ color: "var(--text-primary)" }}>
              {arrobaStatus.value != null ? `R$ ${fmtArroba(arrobaStatus.value)}` : "—"}
            </span>
            {arrobaDelta != null && (
              <span className="font-mono text-[11px]" style={{ color: arrobaDelta >= 0 ? "var(--green-2)" : "var(--red-2)" }}>
                {arrobaDelta >= 0 ? "↑" : "↓"} {Math.abs(arrobaDelta).toFixed(1)}%
              </span>
            )}
          </div>
        </StatCell>

        <StatCell label="Dolar PTAX" status={dolarStatus} loading={status === "loading"}>
          <span className="font-mono text-xl font-medium" style={{ color: "var(--text-primary)" }}>
            {dolarStatus.value != null ? `R$ ${dolarStatus.value.toFixed(2).replace(".", ",")}` : "—"}
          </span>
        </StatCell>

        <StatCell label="Milho ESALQ" status={milhoStatus} loading={status === "loading"}>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-medium" style={{ color: "var(--text-primary)" }}>
              {milhoStatus.value != null ? `R$ ${milhoStatus.value.toFixed(2).replace(".", ",")}` : "—"}
            </span>
            {milhoStatus.value != null && (
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                /sc
              </span>
            )}
          </div>
        </StatCell>

        {/* Prox. vencimento BGI — sem status badge (vem de outra fonte, futuros) */}
        <div className="px-7 py-5">
          <p
            className="text-[10px] uppercase tracking-[0.06em] mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Prox. vencimento BGI
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-medium" style={{ color: "var(--text-primary)" }}>
              {proxVencimento != null ? proxVencimento : status === "loading" ? "…" : "—"}
            </span>
            {proxVencimento != null && (
              <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                dias
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Como funciona ── */}
      <section className="px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <rect x="2" y="10" width="4" height="8" rx="1" fill="var(--brand)" />
              <rect x="8" y="6" width="4" height="12" rx="1" fill="var(--brand)" opacity="0.7" />
              <rect x="14" y="2" width="4" height="16" rx="1" fill="var(--brand)" opacity="0.4" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Exposure engine
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Break-even dinamico dia a dia. Custo acumulado projetado ate o abate.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <circle cx="10" cy="10" r="8" stroke="var(--green)" strokeWidth="1.5" />
              <path d="M10 5v5l3.5 3.5" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Cenarios de queda
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Impacto em margem e caixa em queda de 10%, 20%, 30% no preco da arroba.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.2" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.2" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.2" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="var(--text-tertiary)" strokeWidth="1.2" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Futuros BGI / B3
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Hedge com contratos de boi gordo. Custo real, basis regional, sizing automatico.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section
        className="px-12 py-20 text-center"
        style={{
          background: "var(--surface)",
          borderTop: "0.5px solid var(--border-subtle)",
        }}
      >
        <p
          className="font-display text-[22px] italic max-w-[480px] mx-auto mb-8 leading-relaxed"
          style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
        >
          &ldquo;O risco que voce nao enxerga e o que mais custa.&rdquo;
        </p>
        <Link
          href="/lotes"
          className="inline-block text-[13px] font-medium px-5 py-2.5 rounded-[7px] transition-all hover:brightness-110"
          style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
        >
          Acessar plataforma &rarr;
        </Link>
      </section>
    </div>
  );
}

function HeroArrobaCard({
  status,
  arrobaDelta,
  fmtArrobaFull,
  fmtDelta,
  loading,
}: {
  status: CotacaoFieldStatus;
  arrobaDelta: number | null;
  fmtArrobaFull: (v: number) => string;
  fmtDelta: (v: number) => string;
  loading: boolean;
}) {
  return (
    <>
      <p className="font-mono text-[10px] mb-1" style={{ color: "var(--text-tertiary)" }}>
        @ arroba MS
      </p>
      <p className="font-mono text-lg font-medium" style={{ color: "var(--text-primary)" }}>
        {status.value != null
          ? `R$ ${fmtArrobaFull(status.value)}`
          : loading
            ? "…"
            : "—"}
      </p>
      {status.value != null && arrobaDelta != null && status.state === "fresh" && (
        <p className="font-mono text-[10px]" style={{ color: arrobaDelta >= 0 ? "var(--green-2)" : "var(--red-2)" }}>
          {arrobaDelta >= 0 ? "↑" : "↓"} {fmtDelta(arrobaDelta)} hoje
        </p>
      )}
      {!loading && status.state !== "fresh" && (
        <div className="mt-1.5">
          <CotacaoStatusBadge status={status} size="xs" />
        </div>
      )}
    </>
  );
}

function StatCell({
  label,
  status,
  loading,
  children,
}: {
  label: string;
  status: CotacaoFieldStatus;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="px-7 py-5"
      style={{ borderRight: "0.5px solid var(--border-subtle)" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.06em] mb-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      {loading ? (
        <div
          className="animate-pulse"
          style={{ height: 24, width: 100, background: "var(--surface-2)", borderRadius: 4 }}
        />
      ) : (
        children
      )}
      {!loading && (
        <div className="mt-1.5">
          <CotacaoStatusBadge status={status} size="xs" />
        </div>
      )}
    </div>
  );
}

function MargemCard() {
  return (
    <>
      <p className="font-mono text-[10px] mb-1" style={{ color: "var(--text-tertiary)" }}>
        Margem projetada
      </p>
      <Link
        href="/lotes"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: "var(--brand)",
          textDecoration: "none",
        }}
      >
        Calcule seu lote &rarr;
      </Link>
    </>
  );
}
