"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { FaixaCotacoes } from "./FaixaCotacoes";
import { ClimaCard } from "./ClimaCard";
import { HeroPreco } from "./HeroPreco";
import { TopNav } from "@/components/layout/TopNav";
import { fmtNum as fmtBRL } from "@/lib/linha-rebanho";
import { listLotes, type LoteSalvo } from "@/lib/lotes-storage";
import { useProfile } from "@/lib/use-profile";

// Basis e break-even vem de useProfile() (editaveis em /configuracoes).
// BREAK_EVEN = 0 significa "não configurado" — vira null e nenhuma tela
// trata 0 como break-even real.

export function HomeDashboard() {
  const { profile } = useProfile();
  const BASIS_MS = profile.basis_valor;
  const BREAK_EVEN = profile.break_even_medio > 0 ? profile.break_even_medio : null;

  // σ vem do backend (curva BGI real) — sem fallback inventado no frontend.
  const [sigma, setSigma] = useState<number | null>(null);
  // null = carregando; [] = usuário sem lote (estado vazio honesto)
  const [lotes, setLotes] = useState<LoteSalvo[] | null>(null);
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
      .then((v) => setSigma(v.sigma_anualizado))
      .catch(() => setSigma(null));
    listLotes().then(setLotes).catch(() => setLotes([]));
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
  // porque o contrato vencendo já convergiu com o spot. A faixa de cotações
  // (ticker) continua usando o BGI próximo — é outro caso de uso (cotação
  // rolando do dia).
  const bgiAlvo = useMemo(() => {
    if (!futuros?.contratos?.length) return null;
    const hoje = new Date();
    const validos = futuros.contratos
      .filter((c) => new Date(c.vencimento) > hoje)
      .sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());
    return validos[0] ?? null;
  }, [futuros]);

  // ── Rebanho real (lotes salvos no Supabase) ──
  const empty = lotes != null && lotes.length === 0;
  const numLotes = lotes?.length ?? 0;

  // Arrobas projetadas: só terminação tem arroba de saída calculada.
  const totalArrobas = useMemo(
    () =>
      (lotes ?? []).reduce(
        (acc, l) => acc + (l.fase === "terminacao" ? l.resultadoCache.resultado.arrobas_totais : 0),
        0,
      ),
    [lotes],
  );
  const totalCabecas = useMemo(
    () =>
      (lotes ?? []).reduce(
        (acc, l) => acc + (l.fase === "cria" ? l.inputs.num_matrizes : l.inputs.num_animais),
        0,
      ),
    [lotes],
  );

  // Cálculos do rebanho (dependem de cotação real + lotes reais)
  const spotEfetivo = spotMS; // null quando API indisponível
  const rebanhoExposto =
    spotEfetivo != null && totalArrobas > 0 ? totalArrobas * spotEfetivo : null;
  const margemSobreBE =
    spotEfetivo != null && BREAK_EVEN != null ? spotEfetivo - BREAK_EVEN : null;
  const margemTotal =
    margemSobreBE != null && totalArrobas > 0 ? margemSobreBE * totalArrobas : null;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <TopNav />
      <FaixaCotacoes />

      {/* Hero keynote — o palco do preço (estrutura portada do #14, pele V19) */}
      <HeroPreco spot={spotMS} deltaDia={deltaDia} />

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
                  fontSize: 42,
                  fontWeight: 500,
                  color: "var(--ink)",
                  // V19: DM Sans 500 com tracking apertado -0.030em pra ganhar
                  // a 'modernidade' Vercel/Linear sem trocar de família global.
                  letterSpacing: "-0.030em",
                  lineHeight: 1.1,
                  maxWidth: 720,
                }}
              >
                {empty
                  ? "Você ainda não tem lote cadastrado."
                  : "Do que aconteceu hoje até a saída do último lote."}
              </h1>
            </div>
            {/* Cotações agora vivem na FaixaCotacoes (abaixo do TopNav) */}
          </div>

          {empty ? (
            <LinhaVazia />
          ) : lotes == null ? (
            <div style={{ height: 360 }} />
          ) : (
            <LinhaDoRebanho
              sigmaAnualizado={sigma}
              historico={histArroba}
              spotAtual={spotMS}
              bgi={bgiAlvo}
              breakEven={BREAK_EVEN}
            />
          )}
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
            titulo="ARROBA DO BOI"
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
              deltaDia != null ? (
                <span style={{ color: deltaDia < 0 ? "var(--loss)" : "var(--gain)" }}>
                  {deltaDia >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(deltaDia))}</span>/@ no dia
                </span>
              ) : (
                <span style={{ color: "var(--ink-3)" }}>histórico indisponível</span>
              )
            }
            border="right"
          />

          {/* Card 2 — Rebanho exposto (centro, hero) */}
          <CardResumo
            titulo="REBANHO EXPOSTO"
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
              ) : (
                <span>
                  <span className="mono-num">{Math.round(totalArrobas).toLocaleString("pt-BR")}</span> @ em{" "}
                  <span className="mono-num">{numLotes}</span> {numLotes === 1 ? "lote" : "lotes"} ·{" "}
                  <span className="mono-num">{totalCabecas.toLocaleString("pt-BR")}</span> cab
                </span>
              )
            }
            border="right"
            hero
            href={empty ? undefined : "/lotes"}
          />

          {/* Card 3 — Margem sobre BE */}
          <CardResumo
            titulo="MARGEM SOBRE BREAK-EVEN"
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
              ) : BREAK_EVEN == null ? (
                <span style={{ color: "var(--ink-3)" }}>
                  configure o break-even no{" "}
                  <Link href="/configuracoes" style={{ color: "var(--grafite)", textDecoration: "none" }}>
                    perfil →
                  </Link>
                </span>
              ) : margemTotal == null ? (
                <span style={{ color: "var(--ink-3)" }}>cotação indisponível</span>
              ) : (
                <span>
                  {margemTotal >= 0 ? "+" : "-"}R$ <span className="mono-num">{fmtBRL(Math.abs(margemTotal) / 1_000_000)}</span> mi no rebanho
                </span>
              )
            }
          />
        </section>

        {/* Card de clima — Open-Meteo, abaixo da faixa de 3 cards */}
        <ClimaCard />

        {/* O que moveu a linha hoje + Caminhos */}
        <section
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
          }}
        >
          {empty ? (
            <EventosDiaVazio />
          ) : (
            <EventosDia
              noticias={noticias}
              ultimaAtualizacao={noticiasUltimaAtualizacao}
              deltaDia={noticiasDeltaDia}
              dolarPtax={cotacoes?.dolar_ptax ?? null}
              spotMS={spotMS}
            />
          )}
          <CaminhosCard empty={empty} numLotes={numLotes} totalCabecas={totalCabecas} />
        </section>

        <RodapePlaceholder />
      </main>
    </div>
  );
}

// ─── Card de resumo (3 colunas) ──────────────────────────────────
function CardResumo({
  titulo,
  valor,
  sub,
  border,
  hero,
  href,
}: {
  titulo: React.ReactNode;
  valor: React.ReactNode;
  sub: React.ReactNode;
  border?: "right";
  hero?: boolean;
  href?: string;
}) {
  const conteudo = (
    <>
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
    </>
  );

  const estilo = {
    padding: "18px 22px",
    borderRight: border === "right" ? "0.5px solid var(--rule)" : "none",
    background: "var(--paper-2)",
  } as const;

  if (href) {
    return (
      <Link
        href={href}
        style={{ ...estilo, display: "block", color: "inherit", textDecoration: "none" }}
      >
        {conteudo}
      </Link>
    );
  }
  return <div style={estilo}>{conteudo}</div>;
}

// ─── Estado vazio do gráfico (0 lotes — nunca inventar lote) ─────
function LinhaVazia() {
  return (
    <div
      style={{
        height: 360,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        border: "0.5px dashed var(--rule-strong)",
        borderRadius: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--ink-2)",
        }}
      >
        Cadastre um lote pra ver a projeção do seu rebanho aqui.
      </span>
      <Link
        href="/lotes"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--grafite)",
          textDecoration: "none",
        }}
      >
        CADASTRAR LOTE →
      </Link>
    </div>
  );
}

// ─── O que moveu a linha hoje ────────────────────────────────────
function EventosDia({
  noticias,
  ultimaAtualizacao,
  deltaDia,
  dolarPtax,
  spotMS,
}: {
  noticias: Noticia[];
  ultimaAtualizacao: string | null;
  deltaDia: { arroba_pct: number | null; dolar_pct: number | null; milho_pct: number | null } | null;
  dolarPtax: number | null;
  spotMS: number | null;
}) {
  // Detecta notícias novas (que não estavam na lista do render anterior)
  // pra disparar slide-in. Não anima no primeiro carregamento (refresh manual).
  const idsAnterioresRef = useRef<Set<string> | null>(null);
  const [entrandoIds, setEntrandoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const idsAtuais = new Set(noticias.map((n) => n.id));
    if (idsAnterioresRef.current !== null) {
      const novos = noticias
        .filter((n) => !idsAnterioresRef.current!.has(n.id))
        .map((n) => n.id);
      if (novos.length > 0) {
        setEntrandoIds(new Set(novos));
        const t = setTimeout(() => setEntrandoIds(new Set()), 600);
        idsAnterioresRef.current = idsAtuais;
        return () => clearTimeout(t);
      }
    }
    idsAnterioresRef.current = idsAtuais;
  }, [noticias]);

  // Tick de 1s pra atualizar "atualizado há X" em tempo real
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ultimaAtualizacao) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [ultimaAtualizacao]);

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
        {/*
          Slots fixos. Quando notícia real existe pra slot N → mostra ela.
          Quando não existe e é slot 0 → fallback sintético da variação do dia.
          Slots 1 e 2 sem notícia → "Sem novidade relevante" discreto.
          Princípio: nunca preencher com notícia irrelevante pra completar 3.
        */}
        {[0, 1, 2].map((slot) => {
          const n = noticias[slot];
          if (n) {
            return (
              <NoticiaCard
                key={n.id}
                n={n}
                isFirst={slot === 0}
                entrando={entrandoIds.has(n.id)}
              />
            );
          }
          if (slot === 0) {
            // Fallback do brief: card 1 sempre cheio, gerado da variação do dia
            const fb = construirFallbackCard1({ deltaDia, dolarPtax, spotMS });
            if (fb) {
              return <NoticiaCardSintetico key="fallback-0" card={fb} />;
            }
          }
          return <SlotVazio key={`slot-${slot}`} isFirst={slot === 0} />;
        })}
      </div>
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
function NoticiaCard({
  n,
  isFirst,
  entrando,
}: {
  n: Noticia;
  isFirst: boolean;
  entrando: boolean;
}) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  return (
    <a
      href={n.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-stretch ${entrando ? "noticia-slide-in" : ""}`}
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

// ─── Card sintético do fallback (brief: "card 1 sempre cheio") ──
interface FallbackCard {
  titulo: string;
  categoria: NoticiaCategoria;
  delta_correlato: Noticia["delta_correlato"];
}

function construirFallbackCard1({
  deltaDia,
  dolarPtax,
  spotMS,
}: {
  deltaDia: { arroba_pct: number | null; dolar_pct: number | null; milho_pct: number | null } | null;
  dolarPtax: number | null;
  spotMS: number | null;
}): FallbackCard | null {
  if (!deltaDia) return null;

  // Prioridade: dolar movendo > arroba movendo > nada
  if (deltaDia.dolar_pct !== null && Math.abs(deltaDia.dolar_pct) > 0.05 && dolarPtax !== null) {
    const valor = dolarPtax.toFixed(2).replace(".", ",");
    return {
      titulo: `Dólar fechou em R$ ${valor}`,
      categoria: "cambio",
      delta_correlato: {
        arroba_pct: deltaDia.arroba_pct,
        dolar_pct: deltaDia.dolar_pct,
        milho_pct: null,
      },
    };
  }
  if (deltaDia.arroba_pct !== null && Math.abs(deltaDia.arroba_pct) > 0.05 && spotMS !== null) {
    const valor = spotMS.toFixed(2).replace(".", ",");
    return {
      titulo: `Arroba MS fechou em R$ ${valor}`,
      categoria: "oferta_interna",
      delta_correlato: {
        arroba_pct: deltaDia.arroba_pct,
        dolar_pct: null,
        milho_pct: null,
      },
    };
  }
  return null;
}

function NoticiaCardSintetico({ card }: { card: FallbackCard }) {
  return (
    <div
      className="flex items-stretch"
      style={{
        padding: "10px 0",
        borderTop: "0.5px solid var(--rule)",
        borderBottom: "0.5px solid var(--rule)",
        gap: 12,
      }}
    >
      <div style={{ flexShrink: 0, width: 48, height: 48 }}>
        <IconeCategoria categoria={card.categoria} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--ink)",
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          {card.titulo}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            marginTop: 4,
          }}
        >
          Mercado · hoje ·{" "}
          <Link href="/mercado" style={{ color: "var(--grafite)", textDecoration: "none" }}>
            ver mercado →
          </Link>
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
        <DeltaCorrelato delta={card.delta_correlato} />
      </div>
    </div>
  );
}

function SlotVazio({ isFirst }: { isFirst: boolean }) {
  return (
    <div
      className="flex items-center"
      style={{
        padding: "14px 0",
        borderTop: isFirst ? "0.5px solid var(--rule)" : "none",
        borderBottom: "0.5px solid var(--rule)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--ink-3)",
        fontStyle: "italic",
      }}
    >
      Sem novidade relevante no boi gordo nas últimas 24h.
    </div>
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
function CaminhosCard({
  empty,
  numLotes,
  totalCabecas,
}: {
  empty?: boolean;
  numLotes: number;
  totalCabecas: number;
}) {
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
      {/* Grid V19: cards independentes (raio + sombra cada) com gap maior */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
              : `${numLotes} ${numLotes === 1 ? "ativo" : "ativos"} · ${totalCabecas.toLocaleString("pt-BR")} cab`
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
        padding: "16px 18px",
        // V19: card 'featured' (Simulador) preto puro com texto branco — estilo
        // 'btn primary' do Vercel. Cards comuns: branco com hairline.
        background: destaque ? "#0A0A0A" : "var(--paper-2)",
        color: destaque ? "#FAFAFA" : "var(--ink)",
        borderRadius: "var(--radius-card)",
        border: destaque ? "1px solid #0A0A0A" : "1px solid var(--rule)",
        boxShadow: destaque ? "0 4px 14px -8px rgba(10,10,10,0.45)" : "var(--shadow-card)",
        textDecoration: "none",
        transition: "background 140ms, box-shadow 140ms, transform 140ms",
      }}
      onMouseEnter={(e) => {
        if (destaque) {
          (e.currentTarget as HTMLElement).style.background = "#171717";
        } else {
          (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (destaque) {
          (e.currentTarget as HTMLElement).style.background = "#0A0A0A";
        } else {
          (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
        }
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          color: destaque ? "rgba(250, 250, 250, 0.65)" : "var(--ink-2)",
          marginBottom: 14,
        }}
      >
        {subtitulo}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: destaque ? "#FAFAFA" : "var(--grafite-2)",
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
