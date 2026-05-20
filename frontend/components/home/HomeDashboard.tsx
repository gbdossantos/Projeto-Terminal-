"use client";

import Link from "next/link";
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
  NoticiaCategoria,
} from "@/lib/types";
import { LinhaDoRebanho } from "./LinhaDoRebanho";
import { TopNav } from "@/components/layout/TopNav";
import {
  MOCK_LOTES,
  MOCK_TOTAL_ARROBAS,
  MOCK_TOTAL_CABECAS,
  MOCK_MERCADO,
  fmtBRL,
} from "@/lib/mock-data";

const SIGMA_FALLBACK = 0.18; // ~18% anualizado — típico boi gordo, fallback se endpoint falhar

// Basis MS continua mock — depende da regiao da fazenda, vira config do user com auth
const BASIS_MS = MOCK_MERCADO.basis_ms; // -5
// Break-even continua mock — depende dos custos do lote, vira calculado com auth/banco
const BREAK_EVEN = MOCK_MERCADO.break_even; // 286.50

interface Props {
  /** Sem lote cadastrado: gráfico só mercado, cards 'R$ —', microcopy honesta. */
  empty?: boolean;
}

export function HomeDashboard({ empty = false }: Props = {}) {
  const [sigma, setSigma] = useState<number | null>(null);
  const [exposicaoPorLote, setExposicaoPorLote] = useState(false);
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [futuros, setFuturos] = useState<CurvaFuturos | null>(null);
  const [histArroba, setHistArroba] = useState<HistoricoDolarEntry[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiasUltimaAtualizacao, setNoticiasUltimaAtualizacao] = useState<string | null>(null);

  useEffect(() => {
    fetchVolatilidadeArroba(90)
      .then((v) => setSigma(v.sigma_anualizado ?? SIGMA_FALLBACK))
      .catch(() => setSigma(SIGMA_FALLBACK));
    fetchCotacoes().then(setCotacoes).catch(() => {});
    fetchFuturos().then(setFuturos).catch(() => {});
    fetchHistoricoArroba().then((h) => Array.isArray(h) && setHistArroba(h)).catch(() => {});
    fetchNoticiasDoDia()
      .then((r) => {
        setNoticias(r.noticias ?? []);
        setNoticiasUltimaAtualizacao(r.ultima_atualizacao);
      })
      .catch(() => {});
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

  // BGI próximo: primeiro contrato BGI com vencimento futuro
  const bgiProximo = useMemo(() => {
    if (!futuros?.contratos?.length) return null;
    const hoje = new Date();
    const futuros_validos = futuros.contratos
      .filter((c) => new Date(c.vencimento) > hoje)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
    return futuros_validos[0] ?? null;
  }, [futuros]);

  // Cálculos do rebanho (ainda dependem de cotação real)
  const spotEfetivo = spotMS; // null quando API indisponível
  const rebanhoExposto = spotEfetivo != null ? MOCK_TOTAL_ARROBAS * spotEfetivo : null;
  const margemSobreBE = spotEfetivo != null ? spotEfetivo - BREAK_EVEN : null;
  const margemTotal = margemSobreBE != null ? margemSobreBE * MOCK_TOTAL_ARROBAS : null;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <TopNav />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 60px" }}>
        {/* Linha do rebanho — seção principal */}
        <section style={{ marginTop: 0 }}>
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
            <MarketChips
              spotSP={spotSP}
              spotMS={spotMS}
              deltaDia={deltaDia}
              bgiProximo={bgiProximo}
            />
          </div>

          <LinhaDoRebanho
            sigmaAnualizado={sigma}
            empty={empty}
            historico={histArroba}
            spotAtual={spotMS}
            bgi={bgiProximo}
          />
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
              spotMS != null ? (
                <span>
                  R$ <span className="mono-num">{fmtBRL(spotMS)}</span>
                  <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
                </span>
              ) : (
                <span style={{ color: "var(--ink-3)" }}>—<span style={{ fontSize: 14, marginLeft: 2 }}>/@</span></span>
              )
            }
            sub={
              <span>
                <ChipMono variant="grafite">spot MS</ChipMono>{" "}
                {deltaDia != null ? (
                  <span style={{ color: deltaDia < 0 ? "var(--loss)" : "var(--gain)" }}>
                    {deltaDia >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(deltaDia))}</span>/@ no dia
                  </span>
                ) : (
                  <span style={{ color: "var(--ink-3)" }}>histórico indisponível</span>
                )}
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
              empty || rebanhoExposto == null ? (
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
              ) : rebanhoExposto == null ? (
                <span style={{ color: "var(--ink-3)" }}>cotação indisponível</span>
              ) : exposicaoPorLote && spotEfetivo != null ? (
                <div className="flex flex-col" style={{ gap: 2, marginTop: 4 }}>
                  {MOCK_LOTES.map((l) => (
                    <span key={l.id} style={{ fontSize: 10 }}>
                      {l.nome} · <span className="mono-num">{l.arrobas_totais.toLocaleString("pt-BR")}</span> @ ·
                      R$ <span className="mono-num">{fmtBRL((l.arrobas_totais * spotEfetivo) / 1_000_000)}</span> mi
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
              empty || margemSobreBE == null ? (
                <span style={{ color: "var(--ink-3)" }}>
                  —<span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
                </span>
              ) : (
                <span style={{ color: margemSobreBE >= 0 ? "var(--gain)" : "var(--loss)" }}>
                  {margemSobreBE >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(margemSobreBE))}</span>
                  <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
                </span>
              )
            }
            sub={
              empty ? (
                <span>break-even depende dos seus custos cadastrados</span>
              ) : margemTotal == null ? (
                <span style={{ color: "var(--ink-3)" }}>cotação indisponível</span>
              ) : (
                <span>
                  {margemTotal >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(margemTotal) / 1_000_000)}</span> mi no rebanho ·{" "}
                  BE R$ <span className="mono-num">{fmtBRL(BREAK_EVEN)}</span>/@
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
          {empty ? <EventosDiaVazio /> : <EventosDia noticias={noticias} ultimaAtualizacao={noticiasUltimaAtualizacao} />}
          <CaminhosCard empty={empty} />
        </section>

        <RodapePlaceholder />
      </main>
    </div>
  );
}

// ─── Chips de mercado (BGI próximo, spot, delta) ────────────────
function MarketChips({
  spotSP,
  spotMS,
  deltaDia,
  bgiProximo,
}: {
  spotSP: number | null;
  spotMS: number | null;
  deltaDia: number | null;
  bgiProximo: { codigo: string; vencimento: string; preco_ajuste: number } | null;
}) {
  // Formata vencimento "2026-08-30" → "ago/26"
  const fmtVenc = (iso: string) => {
    const d = new Date(iso);
    const m = d.getUTCMonth();
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${meses[m]}/${String(d.getUTCFullYear()).slice(2)}`;
  };

  return (
    <div className="flex items-center" style={{ gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
      {bgiProximo ? (
        <>
          <ChipMono variant="grafite">{bgiProximo.codigo}</ChipMono>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}>
            boi gordo {fmtVenc(bgiProximo.vencimento)} · R$ <span className="mono-num">{fmtBRL(bgiProximo.preco_ajuste)}</span>
          </span>
        </>
      ) : (
        <>
          <ChipMono variant="grafite">BGI</ChipMono>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
            curva indisponível
          </span>
        </>
      )}
      <span style={{ color: "var(--ink-3)", margin: "0 4px" }}>·</span>

      <ChipMono variant="grafite">spot MS</ChipMono>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: spotMS != null ? "var(--ink-2)" : "var(--ink-3)" }}>
        {spotMS != null ? (
          <>R$ <span className="mono-num">{fmtBRL(spotMS)}</span></>
        ) : (
          "—"
        )}
      </span>
      {spotSP != null && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
          (SP {fmtBRL(spotSP)})
        </span>
      )}
      <span style={{ color: "var(--ink-3)", margin: "0 4px" }}>·</span>

      <ChipMono variant={deltaDia != null && deltaDia < 0 ? "loss" : "grafite"}>Δ dia</ChipMono>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: deltaDia == null ? "var(--ink-3)" : deltaDia < 0 ? "var(--loss)" : "var(--gain)" }}>
        {deltaDia != null ? (
          <>{deltaDia >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(deltaDia))}</span>/@</>
        ) : (
          "—"
        )}
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
function EventosDia({
  noticias,
  ultimaAtualizacao,
}: {
  noticias: Noticia[];
  ultimaAtualizacao: string | null;
}) {
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
      {noticias.length === 0 ? (
        <div
          style={{
            border: "0.5px dashed var(--rule-strong)",
            borderRadius: 6,
            padding: "14px 16px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--ink-3)",
            lineHeight: 1.55,
          }}
        >
          Sem novidade relevante no boi gordo nas últimas 24h.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 2 }}>
          {noticias.map((n, i) => (
            <NoticiaCard key={n.id} n={n} isFirst={i === 0} />
          ))}
        </div>
      )}
      {ultimaAtualizacao && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            marginTop: 8,
          }}
        >
          atualizado {formatarHaQuanto(ultimaAtualizacao)}
        </div>
      )}
    </div>
  );
}

// ─── Card individual de notícia ──────────────────────────────────
// Layout: [imagem|ícone categórico] título manchete         @  -0,7%
//                                    Fonte · 19/mai 11:32  USD +0,8%
//                                    link →
// Sem coluna de R$. Decisão de produto: notícia + Δ correlato lado a lado,
// produtor faz a conexão.
function NoticiaCard({ n, isFirst }: { n: Noticia; isFirst: boolean }) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-stretch"
      style={{
        padding: "10px 0",
        borderTop: isFirst ? "0.5px solid var(--rule)" : "none",
        borderBottom: "0.5px solid var(--rule)",
        gap: 12,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ flexShrink: 0, width: 48, height: 48 }}>
        {n.imagem && !imagemFalhou ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={n.imagem}
            alt=""
            onError={() => setImagemFalhou(true)}
            style={{
              width: 48,
              height: 48,
              objectFit: "cover",
              borderRadius: 3,
              background: "var(--paper-3)",
            }}
          />
        ) : (
          <IconeCategoria categoria={n.categoria} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--ink)",
            fontWeight: 500,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {n.titulo}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            marginTop: 4,
          }}
        >
          {n.fonte} · {formatarPublicado(n.publicado_em)} ·{" "}
          <span style={{ color: "var(--grafite)" }}>link →</span>
        </div>
      </div>
      <div
        className="flex flex-col"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--grafite)",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 2,
          minWidth: 96,
        }}
      >
        <DeltaCorrelato delta={n.delta_correlato} />
      </div>
    </a>
  );
}

// ─── Δ correlato (não causal) ────────────────────────────────────
function DeltaCorrelato({ delta }: { delta: Noticia["delta_correlato"] }) {
  const partes: { rotulo: string; pct: number | null }[] = [];
  if (delta.arroba_pct !== null) partes.push({ rotulo: "@", pct: delta.arroba_pct });
  if (delta.dolar_pct !== null) partes.push({ rotulo: "USD", pct: delta.dolar_pct });
  if (delta.milho_pct !== null) partes.push({ rotulo: "milho", pct: delta.milho_pct });
  if (partes.length === 0) return <span style={{ color: "var(--ink-3)" }}>—</span>;
  return (
    <>
      {partes.map((p) => (
        <span key={p.rotulo} className="flex items-baseline" style={{ gap: 4 }}>
          <span style={{ color: "var(--grafite-2)" }}>{p.rotulo}</span>
          <span
            style={{
              color:
                p.pct === null
                  ? "var(--ink-3)"
                  : p.pct < 0
                    ? "var(--loss)"
                    : p.pct > 0
                      ? "var(--gain)"
                      : "var(--ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p.pct === null
              ? "—"
              : `${p.pct >= 0 ? "+" : ""}${p.pct.toFixed(1).replace(".", ",")}%`}
          </span>
        </span>
      ))}
    </>
  );
}

function IconeCategoria({ categoria }: { categoria: NoticiaCategoria }) {
  const map: Record<NoticiaCategoria, string> = {
    cambio: "USD",
    demanda_externa: "EXP",
    oferta_interna: "OFR",
    insumos: "MLH",
  };
  return (
    <div
      style={{
        width: 48,
        height: 48,
        background: "var(--grafite-soft)",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--grafite)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.04em",
      }}
    >
      {map[categoria]}
    </div>
  );
}

function formatarPublicado(iso: string): string {
  try {
    const d = new Date(iso);
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()}/${meses[d.getMonth()]} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

function formatarHaQuanto(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    const restoMin = min % 60;
    if (h < 24) return restoMin > 0 ? `há ${h} h ${restoMin} min` : `há ${h} h`;
    const d = Math.floor(h / 24);
    return `há ${d} d`;
  } catch {
    return "";
  }
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
