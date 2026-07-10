"use client";

import Link from "next/link";
import type { Noticia, NoticiaCategoria } from "@/lib/types";
import { fmtBRL } from "@/lib/mock-data";

/**
 * Camada 5 da Home Estrada — a banda escura, onde a conversa fica séria.
 *
 * Nogueira lisa (material, não dark mode). 3 eventos numerados em Besley
 * itálico latão + pergunta invertida (interrogativa/descritiva, nunca
 * imperativa — CVM §9-A) + o único CTA de latão da tela → simulador.
 *
 * Sombra nenhuma: sombra é só de objeto físico, nunca de banda.
 * Tintas claras literais são material da banda (osso sobre nogueira),
 * não tokens de UI.
 */

const OSSO_SOBRE_NOGUEIRA = "rgba(246, 244, 238, 0.92)";
const OSSO_SUAVE = "rgba(246, 244, 238, 0.6)";
const OSSO_APAGADO = "rgba(246, 244, 238, 0.42)";
const HAIRLINE_CLARA = "rgba(246, 244, 238, 0.14)";

interface DeltaDia {
  arroba_pct: number | null;
  dolar_pct: number | null;
  milho_pct: number | null;
}

interface Props {
  noticias: Noticia[];
  ultimaAtualizacao: string | null;
  deltaDia: DeltaDia | null;
  dolarPtax: number | null;
  spotMS: number | null;
  arrobasTotais: number;
  empty?: boolean;
}

export function BandaEscura({
  noticias,
  ultimaAtualizacao,
  deltaDia,
  dolarPtax,
  spotMS,
  arrobasTotais,
  empty = false,
}: Props) {
  // Impacto de uma queda de 10% sobre o rebanho exposto (base da pergunta invertida)
  const impactoQueda10 =
    !empty && spotMS != null && arrobasTotais > 0 ? spotMS * 0.1 * arrobasTotais : null;

  return (
    <section
      style={{
        background: "var(--nogueira)",
        borderRadius: "var(--radius-card)",
        padding: "48px 52px 44px",
        color: OSSO_SOBRE_NOGUEIRA,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 26 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--latao)",
          }}
        >
          O QUE MOVEU A LINHA HOJE
        </span>
        {ultimaAtualizacao && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: OSSO_APAGADO }}>
            atualizado {formatarHaQuanto(ultimaAtualizacao)}
          </span>
        )}
      </div>

      {/* 3 eventos numerados */}
      <div>
        {[0, 1, 2].map((slot) => {
          const n = noticias[slot];
          if (n) return <EventoNumerado key={n.id} indice={slot + 1} noticia={n} />;
          if (slot === 0) {
            const fb = construirFallbackCard1({ deltaDia, dolarPtax, spotMS });
            if (fb) return <EventoSintetico key="fallback-0" indice={1} card={fb} />;
          }
          return <SlotVazio key={`slot-${slot}`} indice={slot + 1} />;
        })}
      </div>

      {/* Pergunta invertida — interrogativa, nunca imperativa */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 19,
          lineHeight: 1.55,
          color: OSSO_SOBRE_NOGUEIRA,
          margin: "34px 0 0",
          maxWidth: 640,
        }}
      >
        {empty || impactoQueda10 == null ? (
          <>
            Sem lote cadastrado, o risco ainda não tem número. Quando houver, esta pergunta
            mostra quanto do seu rebanho fica descoberto a cada queda de preço.
          </>
        ) : (
          <>
            Com{" "}
            <strong style={{ color: "var(--latao-hi)", fontWeight: 700 }}>
              {arrobasTotais.toLocaleString("pt-BR")} arrobas
            </strong>{" "}
            a caminho da saída, uma queda de 10% na arroba tiraria{" "}
            <strong style={{ color: "var(--latao-hi)", fontWeight: 700 }}>
              R$ {fmtBRL(impactoQueda10 / 1_000_000, 1)} mi
            </strong>{" "}
            do rebanho. Qual parte desse risco você aceita carregar sem proteção?
          </>
        )}
      </p>

      {/* O latão da tela — único CTA */}
      <Link
        href={empty ? "/lotes" : "/simulador"}
        style={{
          display: "inline-block",
          marginTop: 28,
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--nogueira)",
          background: "linear-gradient(135deg, var(--latao-hi), var(--latao))",
          border: "1px solid var(--latao-lo)",
          borderRadius: 100,
          padding: "10px 24px",
          textDecoration: "none",
          transition: "filter 140ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.filter = "brightness(1.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.filter = "none";
        }}
      >
        {empty ? "Cadastrar o primeiro lote →" : "Medir esse cenário no simulador →"}
      </Link>
    </section>
  );
}

// ─── Evento numerado (notícia real) ──────────────────────────────
function EventoNumerado({ indice, noticia }: { indice: number; noticia: Noticia }) {
  return (
    <a
      href={noticia.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-baseline"
      style={{
        gap: 20,
        padding: "14px 0",
        borderTop: `1px solid ${HAIRLINE_CLARA}`,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <Numero indice={indice} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
            color: OSSO_SOBRE_NOGUEIRA,
          }}
        >
          {noticia.titulo}
        </div>
        <div
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: OSSO_APAGADO, marginTop: 4 }}
        >
          {noticia.fonte} · {formatarPublicado(noticia.publicado_em)} ·{" "}
          <span style={{ color: "var(--latao)" }}>link →</span>
        </div>
      </div>
      <DeltaCorrelato delta={noticia.delta_correlato} />
    </a>
  );
}

// ─── Card sintético do fallback (card 1 sempre cheio) ────────────
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
  deltaDia: DeltaDia | null;
  dolarPtax: number | null;
  spotMS: number | null;
}): FallbackCard | null {
  if (!deltaDia) return null;
  if (deltaDia.dolar_pct !== null && Math.abs(deltaDia.dolar_pct) > 0.05 && dolarPtax !== null) {
    return {
      titulo: `Dólar fechou em R$ ${dolarPtax.toFixed(2).replace(".", ",")}`,
      categoria: "cambio",
      delta_correlato: { arroba_pct: deltaDia.arroba_pct, dolar_pct: deltaDia.dolar_pct, milho_pct: null },
    };
  }
  if (deltaDia.arroba_pct !== null && Math.abs(deltaDia.arroba_pct) > 0.05 && spotMS !== null) {
    return {
      titulo: `Arroba MS fechou em R$ ${spotMS.toFixed(2).replace(".", ",")}`,
      categoria: "oferta_interna",
      delta_correlato: { arroba_pct: deltaDia.arroba_pct, dolar_pct: null, milho_pct: null },
    };
  }
  return null;
}

function EventoSintetico({ indice, card }: { indice: number; card: FallbackCard }) {
  return (
    <div
      className="flex items-baseline"
      style={{ gap: 20, padding: "14px 0", borderTop: `1px solid ${HAIRLINE_CLARA}` }}
    >
      <Numero indice={indice} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
            color: OSSO_SOBRE_NOGUEIRA,
          }}
        >
          {card.titulo}
        </div>
        <div
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: OSSO_APAGADO, marginTop: 4 }}
        >
          Mercado · hoje ·{" "}
          <Link href="/mercado" style={{ color: "var(--latao)", textDecoration: "none" }}>
            ver mercado →
          </Link>
        </div>
      </div>
      <DeltaCorrelato delta={card.delta_correlato} />
    </div>
  );
}

function SlotVazio({ indice }: { indice: number }) {
  return (
    <div
      className="flex items-baseline"
      style={{ gap: 20, padding: "14px 0", borderTop: `1px solid ${HAIRLINE_CLARA}` }}
    >
      <Numero indice={indice} apagado />
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontStyle: "italic",
          color: OSSO_APAGADO,
        }}
      >
        Sem novidade relevante no boi gordo nas últimas 24h.
      </div>
    </div>
  );
}

function Numero({ indice, apagado = false }: { indice: number; apagado?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: 24,
        lineHeight: 1,
        color: apagado ? OSSO_APAGADO : "var(--latao)",
        flexShrink: 0,
        width: 28,
      }}
    >
      {indice}
    </span>
  );
}

// ─── Δ correlato (não causal) — tintas claras p/ fundo nogueira ──
function DeltaCorrelato({ delta }: { delta: Noticia["delta_correlato"] }) {
  const partes: { rotulo: string; pct: number | null }[] = [];
  if (delta.arroba_pct !== null) partes.push({ rotulo: "@", pct: delta.arroba_pct });
  if (delta.dolar_pct !== null) partes.push({ rotulo: "USD", pct: delta.dolar_pct });
  if (delta.milho_pct !== null) partes.push({ rotulo: "milho", pct: delta.milho_pct });
  return (
    <div
      className="flex flex-col"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 2,
        minWidth: 96,
        flexShrink: 0,
      }}
    >
      {partes.length === 0 ? (
        <span style={{ color: OSSO_APAGADO }}>—</span>
      ) : (
        partes.map((p) => (
          <span key={p.rotulo} className="flex items-baseline" style={{ gap: 4 }}>
            <span style={{ color: OSSO_SUAVE }}>{p.rotulo}</span>
            <span
              style={{
                // pasto/ferrugem clareados p/ leitura sobre nogueira
                color: p.pct == null ? OSSO_APAGADO : p.pct < 0 ? "#F1B9A6" : p.pct > 0 ? "#C4D8A8" : OSSO_APAGADO,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.pct == null ? "—" : `${p.pct >= 0 ? "+" : ""}${p.pct.toFixed(1).replace(".", ",")}%`}
            </span>
          </span>
        ))
      )}
    </div>
  );
}

// ─── Helpers de tempo ────────────────────────────────────────────
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
