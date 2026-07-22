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
      {/* Overlay neutro — denso no topo (onde vive o texto), abre embaixo.
          Token por tema: no dark o overlay abre (a foto já é escura). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--hero-overlay)",
        }}
      />
      {/*
        Dissolve da foto no papel — mata a linha de corte sem comer o
        gado/cerca. Altura proporcional (12% do hero, escala com o crop
        panorâmico de telas largas, onde o rebanho cola na base) e curva
        agressiva: quase transparente até 2/3 da faixa, fecha rápido só
        nos últimos pixels. Calibrado contra a foto sem fade — a lavagem
        residual à direita é poeira da própria imagem. Cor-alvo por tema
        (token --hero-dissolve): --paper com a faixa quente que abre o
        conteúdo (HomeDashboard) — light #F4F1ED, dark #14120F.
      */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "12%",
          pointerEvents: "none",
          background: "var(--hero-dissolve)",
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
 * Pílula clara sobre a foto — o fundo branco é fixo (a foto não muda com o
 * tema), então as cores do texto são LITERAIS dos tons -2 do tema claro,
 * não tokens: no dark os tokens viram tons claros e quebrariam o AA sobre
 * a pílula branca. Fecham 4.5:1 em texto pequeno sobre branco.
 */
function DeltaPill({ deltaDia }: { deltaDia: number | null }) {
  let texto: string;
  let cor: string;
  if (deltaDia == null) {
    texto = "sem variação registrada hoje";
    cor = "#4B5563";
  } else if (deltaDia < 0) {
    texto = `−R$ ${fmtBRL(Math.abs(deltaDia))} no dia`;
    cor = "#B91C1C";
  } else if (deltaDia > 0) {
    texto = `+R$ ${fmtBRL(deltaDia)} no dia`;
    cor = "#15803D";
  } else {
    texto = "estável no dia";
    cor = "#4B5563";
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
