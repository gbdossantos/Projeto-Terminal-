"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchVolatilidadeArroba } from "@/lib/api";
import { LinhaDoRebanho } from "./LinhaDoRebanho";
import {
  MOCK_USUARIO,
  MOCK_FAZENDA,
  MOCK_LOTES,
  MOCK_TOTAL_ARROBAS,
  MOCK_TOTAL_CABECAS,
  MOCK_MERCADO,
  MOCK_EVENTOS_DIA,
  fmtBRL,
} from "@/lib/mock-data";

const SIGMA_FALLBACK = 0.18; // ~18% anualizado — típico boi gordo, fallback se endpoint falhar

interface Props {
  /** Sem lote cadastrado: gráfico só mercado, cards 'R$ —', microcopy honesta. */
  empty?: boolean;
}

export function HomeDashboard({ empty = false }: Props = {}) {
  const [sigma, setSigma] = useState<number | null>(null);
  const [exposicaoPorLote, setExposicaoPorLote] = useState(false);

  useEffect(() => {
    fetchVolatilidadeArroba(90)
      .then((v) => setSigma(v.sigma_anualizado ?? SIGMA_FALLBACK))
      .catch(() => setSigma(SIGMA_FALLBACK));
  }, []);

  // Cálculos derivados — fonte única (todos a partir do MOCK_*)
  const arrobaSpot = MOCK_MERCADO.arroba_ms_spot + MOCK_MERCADO.delta_dia; // 318 + (-2.10) = 315.90 — mas mockup fala 317.60? Recalcular.
  // Mockup mostra "R$ 317,60/@" como spot do fechamento. delta_dia -2.10.
  // O 317.60 é o fechamento; 318 era abertura. Vou usar 317.60 direto.
  const SPOT_FECHAMENTO = 317.60;
  const rebanhoExposto = MOCK_TOTAL_ARROBAS * SPOT_FECHAMENTO;
  const margemSobreBE = SPOT_FECHAMENTO - MOCK_MERCADO.break_even;
  const margemTotal = margemSobreBE * MOCK_TOTAL_ARROBAS;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Header />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 32px 60px" }}>
        <NavTabs active="home" />

        {/* Linha do rebanho — seção principal */}
        <section style={{ marginTop: 28 }}>
          <div className="flex items-start justify-between" style={{ marginBottom: 14 }}>
            <div>
              <p
                className="uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--ink-3)",
                  marginBottom: 4,
                }}
              >
                A LINHA DO REBANHO
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 26,
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {empty
                  ? "Você ainda não tem lote cadastrado."
                  : "Do que aconteceu hoje até a saída do último lote."}
              </h1>
            </div>
            <MarketChips />
          </div>

          <LinhaDoRebanho sigmaAnualizado={sigma} empty={empty} />
        </section>

        {/* Cards resumo */}
        <section
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr 1fr",
            gap: 0,
            border: "0.5px solid var(--rule)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Card 1 — Arroba do boi */}
          <CardResumo
            titulo="ARROBA DO BOI · NO FECHAMENTO DE HOJE"
            valor={
              <span>
                R$ <span className="mono-num">{fmtBRL(SPOT_FECHAMENTO)}</span>
                <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
              </span>
            }
            sub={
              <span>
                <ChipMono variant="grafite">spot MS</ChipMono>{" "}
                <span style={{ color: "var(--loss)" }}>
                  -R$ <span className="mono-num">{fmtBRL(Math.abs(MOCK_MERCADO.delta_dia))}</span>/@ no dia
                </span>
              </span>
            }
            border="right"
          />

          {/* Card 2 — Rebanho exposto (centro, hero) */}
          <CardResumo
            titulo={
              empty ? (
                "REBANHO EXPOSTO · NO FECHAMENTO DE HOJE"
              ) : (
                <span className="flex items-center justify-between" style={{ width: "100%" }}>
                  <span>REBANHO EXPOSTO · NO FECHAMENTO DE HOJE</span>
                  <button
                    onClick={() => setExposicaoPorLote(!exposicaoPorLote)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--ink-3)",
                    }}
                  >
                    {exposicaoPorLote ? "↓ AGREGADO" : "↓ POR LOTE"}
                  </button>
                </span>
              )
            }
            valor={
              empty ? (
                <span style={{ fontSize: 38, color: "var(--ink-3)" }}>R$ — mi</span>
              ) : (
                <span style={{ fontSize: 38 }}>
                  R$ <span className="mono-num">{fmtBRL(rebanhoExposto / 1_000_000, 2)}</span> mi
                </span>
              )
            }
            sub={
              empty ? (
                <span>cadastre um lote para projetar sua exposição</span>
              ) : exposicaoPorLote ? (
                <div className="flex flex-col" style={{ gap: 2, marginTop: 4 }}>
                  {MOCK_LOTES.map((l) => (
                    <span key={l.id} style={{ fontSize: 10 }}>
                      {l.nome} · <span className="mono-num">{l.arrobas_totais.toLocaleString("pt-BR")}</span> @ ·
                      R$ <span className="mono-num">{fmtBRL((l.arrobas_totais * SPOT_FECHAMENTO) / 1_000_000)}</span> mi
                    </span>
                  ))}
                </div>
              ) : (
                <span>
                  <span className="mono-num">{MOCK_TOTAL_ARROBAS.toLocaleString("pt-BR")}</span> @ em{" "}
                  <span className="mono-num">{MOCK_LOTES.length}</span> lotes ·{" "}
                  <span className="mono-num">{MOCK_TOTAL_CABECAS.toLocaleString("pt-BR")}</span> cab
                </span>
              )
            }
            border="right"
            hero
          />

          {/* Card 3 — Margem sobre BE */}
          <CardResumo
            titulo="MARGEM SOBRE BREAK-EVEN · NO FECHAMENTO DE HOJE"
            valor={
              empty ? (
                <span style={{ color: "var(--ink-3)" }}>
                  —<span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
                </span>
              ) : (
                <span style={{ color: "var(--gain)" }}>
                  +R$ <span className="mono-num">{fmtBRL(margemSobreBE)}</span>
                  <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
                </span>
              )
            }
            sub={
              empty ? (
                <span>break-even depende dos seus custos cadastrados</span>
              ) : (
                <span>
                  +R$ <span className="mono-num">{fmtBRL(margemTotal / 1_000_000)}</span> mi no rebanho ·{" "}
                  BE R$ <span className="mono-num">{fmtBRL(MOCK_MERCADO.break_even)}</span>/@
                </span>
              )
            }
          />
        </section>

        {/* O que moveu a linha hoje + Caminhos */}
        <section
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
          }}
        >
          {empty ? <EventosDiaVazio /> : <EventosDia />}
          <CaminhosCard empty={empty} />
        </section>

        <RodapePlaceholder />
      </main>
    </div>
  );
}

// ─── Header (logo + identidade) ──────────────────────────────────
function Header() {
  return (
    <header
      style={{
        background: "var(--paper)",
        borderBottom: "0.5px solid var(--rule)",
        padding: "14px 32px",
      }}
    >
      <div className="flex items-center justify-between" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div className="flex items-center gap-2">
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink)",
              fontWeight: 500,
            }}
          >
            TERMINAL
          </span>
          <span style={{ color: "var(--ink-3)", fontSize: 11 }}>·</span>
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-2)",
            }}
          >
            BOI GORDO
          </span>
        </div>

        <div
          className="flex items-center"
          style={{
            gap: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-2)",
          }}
        >
          <span>{MOCK_USUARIO.nome}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{MOCK_FAZENDA.nome}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>{MOCK_FAZENDA.municipio} / {MOCK_FAZENDA.estado}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>19 mai/26</span>
        </div>
      </div>
    </header>
  );
}

// ─── Nav tabs (sub-header) ───────────────────────────────────────
function NavTabs({ active }: { active: string }) {
  const tabs = [
    { id: "home", label: "Home", href: "/" },
    { id: "lotes", label: "Lotes", href: "/lotes" },
    { id: "simulador", label: "Simulador", href: "/simulador" },
    { id: "historico", label: "Histórico", href: "/historico" },
    { id: "mercado", label: "Mercado", href: "/mercado" },
  ];
  return (
    <nav
      className="flex"
      style={{
        gap: 22,
        borderBottom: "0.5px solid var(--rule)",
        paddingBottom: 0,
      }}
    >
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            padding: "8px 0",
            color: active === t.id ? "var(--ink)" : "var(--ink-3)",
            fontWeight: active === t.id ? 600 : 400,
            borderBottom: active === t.id ? "2px solid var(--ink)" : "2px solid transparent",
            textDecoration: "none",
            marginBottom: -1,
          }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

// ─── Chips de mercado (BGIQ26, spot, delta) ─────────────────────
function MarketChips() {
  return (
    <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
      <ChipMono variant="grafite" mono>
        BGIQ26
      </ChipMono>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}>
        boi gordo ago/26 · R$ <span className="mono-num">{fmtBRL(MOCK_MERCADO.bgi_q26_ago)}</span>
      </span>
      <span style={{ color: "var(--ink-3)", margin: "0 4px" }}>·</span>
      <ChipMono variant="grafite">spot MS</ChipMono>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}>
        R$ <span className="mono-num">{fmtBRL(MOCK_MERCADO.arroba_ms_spot)}</span>
      </span>
      <span style={{ color: "var(--ink-3)", margin: "0 4px" }}>·</span>
      <ChipMono variant="loss">Δ dia</ChipMono>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--loss)" }}>
        -R$ <span className="mono-num">{fmtBRL(Math.abs(MOCK_MERCADO.delta_dia))}</span>/@
      </span>
    </div>
  );
}

function ChipMono({
  variant,
  children,
}: {
  variant: "grafite" | "loss";
  mono?: boolean;
  children: React.ReactNode;
}) {
  const bg = variant === "loss" ? "rgba(181, 65, 52, 0.10)" : "var(--grafite-soft)";
  const color = variant === "loss" ? "var(--loss)" : "var(--grafite)";
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        padding: "1px 5px",
        background: bg,
        color,
        borderRadius: 2,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

// ─── Card de resumo (3 colunas) ──────────────────────────────────
function CardResumo({
  titulo,
  valor,
  sub,
  border,
  hero,
}: {
  titulo: React.ReactNode;
  valor: React.ReactNode;
  sub: React.ReactNode;
  border?: "right";
  hero?: boolean;
}) {
  return (
    <div
      style={{
        padding: "18px 22px",
        borderRight: border === "right" ? "0.5px solid var(--rule)" : "none",
        background: "var(--paper-2)",
      }}
    >
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 10,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: hero ? 38 : 26,
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
          marginTop: 8,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ─── O que moveu a linha hoje ────────────────────────────────────
function EventosDia() {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          O QUE MOVEU A LINHA HOJE
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
          top 3 · <a href="#" style={{ color: "var(--ink-2)" }}>ver tudo →</a>
        </span>
      </div>
      <div className="flex flex-col" style={{ gap: 2 }}>
        {MOCK_EVENTOS_DIA.map((ev, i) => (
          <div
            key={i}
            className="flex items-start justify-between"
            style={{
              padding: "10px 0",
              borderTop: i === 0 ? "0.5px solid var(--rule)" : "none",
              borderBottom: "0.5px solid var(--rule)",
              gap: 16,
            }}
          >
            <div className="flex items-start" style={{ gap: 10, flex: 1 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: ev.tipo === "negativo"
                    ? "var(--loss)"
                    : ev.tipo === "positivo"
                      ? "var(--gain)"
                      : "var(--ink-3)",
                  marginTop: 1,
                }}
              >
                {ev.tipo === "negativo" ? "↓" : ev.tipo === "positivo" ? "↑" : "·"}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--ink)",
                    fontWeight: 500,
                  }}
                >
                  {ev.titulo}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--ink-2)",
                    marginTop: 2,
                  }}
                >
                  {ev.detalhe} · {ev.fonte}
                </div>
              </div>
            </div>
            <div
              className="flex flex-col items-end"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, gap: 2 }}
            >
              <span style={{ color: ev.impacto_arroba < 0 ? "var(--loss)" : ev.impacto_arroba > 0 ? "var(--gain)" : "var(--ink-3)" }}>
                {ev.impacto_arroba === 0
                  ? "0,00/@"
                  : `${ev.impacto_arroba > 0 ? "+" : "-"}R$ ${fmtBRL(Math.abs(ev.impacto_arroba))}/@`}
              </span>
              <span style={{
                color: ev.impacto_total < 0
                  ? "var(--loss)"
                  : ev.impacto_total > 0
                    ? "var(--gain)"
                    : "var(--ink-3)",
              }}>
                {ev.impacto_total === 0
                  ? "R$ 0"
                  : `${ev.impacto_total > 0 ? "+" : "-"}R$ ${Math.abs(ev.impacto_total).toLocaleString("pt-BR")}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Caminhos (4 quadrantes) ─────────────────────────────────────
function CaminhosCard({ empty }: { empty?: boolean }) {
  return (
    <div>
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 10,
        }}
      >
        CAMINHOS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--rule)", border: "0.5px solid var(--rule)" }}>
        <CaminhoQuadrante
          titulo="Simulador"
          subtitulo={empty ? "cadastre um lote para liberar" : "travar parte do rebanho?"}
          cta={empty ? "CADASTRAR LOTE →" : "ABRIR SIMULADOR →"}
          href={empty ? "/lotes" : "/simulador"}
          destaque
        />
        <CaminhoQuadrante
          titulo="Lotes"
          subtitulo={
            empty
              ? "0 cadastrados"
              : `${MOCK_LOTES.length} ativos · ${MOCK_TOTAL_CABECAS.toLocaleString("pt-BR")} cab`
          }
          cta="VER LOTES →"
          href="/lotes"
        />
        <CaminhoQuadrante
          titulo="Histórico"
          subtitulo={empty ? "sem decisões registradas" : "decisões registradas e cenários salvos"}
          cta="VER HISTÓRICO →"
          href="/historico"
        />
        <CaminhoQuadrante
          titulo="Mercado"
          subtitulo="curva BGI, basis, opções, milho, dólar"
          cta="ABRIR MERCADO →"
          href="/mercado"
        />
      </div>
    </div>
  );
}

// ─── Eventos vazio ───────────────────────────────────────────────
function EventosDiaVazio() {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          O QUE MOVEU A LINHA HOJE
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>—</span>
      </div>
      <div
        style={{
          border: "0.5px dashed var(--rule-strong)",
          borderRadius: 6,
          padding: "14px 16px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        Sem lote cadastrado, mostramos só os números do mercado.<br />
        Quando você cadastrar, cada evento aqui traz o impacto em R$ sobre os @ seus.
      </div>
    </div>
  );
}

function CaminhoQuadrante({
  titulo,
  subtitulo,
  cta,
  href,
  destaque,
}: {
  titulo: string;
  subtitulo: string;
  cta: string;
  href: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "14px 16px",
        background: destaque ? "var(--ink)" : "var(--paper-2)",
        color: destaque ? "var(--paper)" : "var(--ink)",
        textDecoration: "none",
        transition: "background 120ms",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: destaque ? "rgba(245, 242, 234, 0.65)" : "var(--ink-2)",
          marginBottom: 12,
        }}
      >
        {subtitulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: destaque ? "var(--paper)" : "var(--ink)",
        }}
      >
        {cta}
      </div>
    </Link>
  );
}

function RodapePlaceholder() {
  // Espaco visual para conferir altura — vazio por enquanto
  return <div style={{ height: 32 }} />;
}
