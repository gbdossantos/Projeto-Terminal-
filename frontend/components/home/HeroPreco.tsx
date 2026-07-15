"use client";

import { useState } from "react";
import { fmtNum as fmtBRL } from "@/lib/linha-rebanho";

/**
 * Hero keynote da Home — o palco do preço.
 *
 * Estrutura portada do HeroEstrada (#14): eyebrow, preço centrado em
 * escala keynote, legenda e delta em pílula. Identidade V19: preço em
 * DM Mono, overlay neutro (sem âmbar) sobre foto real (hero_dusk.jpg).
 *
 * O preço fica na metade superior da foto — o gradiente do overlay é
 * mais denso no topo pra garantir AA do eyebrow (texto pequeno) mesmo
 * com céu claro atrás. Se a foto faltar, o fundo sólido --ink segura
 * o contraste sozinho (sem SVG de fallback).
 */

interface Props {
  /** Spot MS em R$/@ (CEPEA SP + basis). Null → em branco honesto. */
  spot: number | null;
  /** Variação do dia em R$/@. Null → sem registro. */
  deltaDia: number | null;
  contexto?: string;
}

export function HeroPreco({
  spot,
  deltaDia,
  contexto = "Arroba do boi · CEPEA/SP + basis MS · hoje",
}: Props) {
  const [fotoFalhou, setFotoFalhou] = useState(false);

  return (
    <section
      aria-label="Preço da arroba hoje"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--ink)",
        height: "clamp(300px, 34vw, 440px)",
      }}
    >
      {!fotoFalhou && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/hero_dusk.jpg"
          alt=""
          aria-hidden
          onError={() => setFotoFalhou(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 60%",
          }}
        />
      )}
      {/* Overlay neutro — denso no topo (onde vive o texto), abre embaixo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10, 10, 10, 0.82) 0%, rgba(10, 10, 10, 0.68) 42%, rgba(10, 10, 10, 0.48) 62%, rgba(10, 10, 10, 0.2) 100%)",
        }}
      />
      {/*
        Dissolve da foto no papel — elimina a linha dura de corte.
        Rampa côncava (quase transparente até a metade) pra não apagar
        o gado/cerca da parte inferior. Cor-alvo #F4F1ED = --paper com a
        faixa quente que abre o conteúdo logo abaixo (HomeDashboard).
      */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "clamp(72px, 10vw, 130px)",
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(244, 241, 237, 0) 0%, rgba(244, 241, 237, 0.22) 45%, rgba(244, 241, 237, 0.68) 78%, #F4F1ED 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          textAlign: "center",
          paddingTop: "clamp(36px, 4.5vw, 64px)",
        }}
      >
        <p
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(10px, 1vw, 12px)",
            letterSpacing: "0.12em",
            color: "rgba(250, 250, 249, 0.92)",
            margin: "0 0 clamp(8px, 1vw, 14px)",
          }}
        >
          {contexto}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            fontSize: "clamp(56px, 9vw, 128px)",
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            color: "#FAFAF9",
            margin: 0,
            textShadow: "0 2px 24px rgba(10, 10, 10, 0.45)",
          }}
        >
          {spot != null ? <PrecoSplit valor={spot} /> : "—"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(12px, 1.2vw, 15px)",
            color: "rgba(250, 250, 249, 0.85)",
            margin: "clamp(6px, 0.8vw, 12px) 0 0",
          }}
        >
          reais por arroba
        </p>
        <DeltaPill deltaDia={deltaDia} />
      </div>
    </section>
  );
}

/** Preço com centavos menores — inteiro grande, centavos a 32%. */
function PrecoSplit({ valor }: { valor: number }) {
  const inteiro = Math.trunc(valor);
  const centavos = fmtBRL(valor).split(",")[1] ?? "00";
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {inteiro.toLocaleString("pt-BR")}
      <span style={{ fontSize: "0.32em", color: "rgba(250, 250, 249, 0.85)" }}>,{centavos}</span>
    </span>
  );
}

/**
 * Pílula clara sobre a foto — deltas nos tons -2 dos tokens V19
 * (gain-2/loss-2) pra fechar AA 4.5:1 em texto pequeno sobre branco.
 */
function DeltaPill({ deltaDia }: { deltaDia: number | null }) {
  let texto: string;
  let cor: string;
  if (deltaDia == null) {
    texto = "sem variação registrada hoje";
    cor = "var(--ink-2)";
  } else if (deltaDia < 0) {
    texto = `−R$ ${fmtBRL(Math.abs(deltaDia))} no dia`;
    cor = "var(--loss-2)";
  } else if (deltaDia > 0) {
    texto = `+R$ ${fmtBRL(deltaDia)} no dia`;
    cor = "var(--gain-2)";
  } else {
    texto = "estável no dia";
    cor = "var(--ink-2)";
  }
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: "clamp(12px, 1.4vw, 20px)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontVariantNumeric: "tabular-nums",
        borderRadius: 100,
        padding: "5px 14px",
        background: "rgba(250, 250, 249, 0.92)",
        color: cor,
        border: "0.5px solid rgba(10, 10, 10, 0.08)",
      }}
    >
      {texto}
    </span>
  );
}
