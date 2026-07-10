"use client";

import { fmtBRL } from "@/lib/mock-data";

/**
 * Camada 1 da Home Estrada — o palco do preço.
 *
 * Cena de crepúsculo (SVG portado 1:1 de dashboard/estrada.py::_SCENE_SVG)
 * com o preço da arroba em Besley 900, centrado, escala keynote.
 * Um delta em pílula. Nada mais.
 *
 * Os hexes do SVG são a matéria da cena (céu, sol, morros) — não são
 * tokens de UI e não participam do de-para.
 */

interface Props {
  /** Spot MS em R$/@ (CEPEA SP + basis). Null → em branco honesto. */
  spot: number | null;
  /** Variação do dia em R$/@. Null → sem registro. */
  deltaDia: number | null;
  contexto?: string;
}

export function HeroEstrada({
  spot,
  deltaDia,
  contexto = "Arroba do boi · CEPEA/SP + basis MS · hoje",
}: Props) {
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <SceneSVG />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          textAlign: "center",
          paddingTop: "4.5%",
        }}
      >
        <p
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(9px, 1.1vw, 12px)",
            letterSpacing: "0.24em",
            color: "rgba(246, 244, 238, 0.78)",
            margin: "0 0 0.8vw",
          }}
        >
          {contexto}
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(56px, 10vw, 150px)",
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            color: "#F6F4EE",
            margin: 0,
            textShadow: "0 2px 26px rgba(28, 22, 16, 0.4)",
          }}
        >
          {spot != null ? <PrecoSplit valor={spot} /> : "—"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(12px, 1.4vw, 17px)",
            color: "rgba(246, 244, 238, 0.85)",
            margin: "0.7vw 0 0",
          }}
        >
          reais por arroba
        </p>
        <DeltaPill deltaDia={deltaDia} />
      </div>
    </div>
  );
}

/** Preço com centavos menores — inteiro grande, centavos a 32%. */
function PrecoSplit({ valor }: { valor: number }) {
  const inteiro = Math.trunc(valor);
  const centavos = fmtBRL(valor).split(",")[1] ?? "00";
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {inteiro.toLocaleString("pt-BR")}
      <span style={{ fontSize: "0.32em", fontWeight: 700, color: "rgba(246, 244, 238, 0.8)" }}>
        ,{centavos}
      </span>
    </span>
  );
}

function DeltaPill({ deltaDia }: { deltaDia: number | null }) {
  let texto: string;
  let cor: string;
  let borda: string;
  if (deltaDia == null) {
    texto = "sem variação registrada hoje";
    cor = "rgba(246, 244, 238, 0.7)";
    borda = "rgba(246, 244, 238, 0.35)";
  } else if (deltaDia < 0) {
    texto = `▼ R$ ${fmtBRL(Math.abs(deltaDia))} no dia`;
    cor = "#F1B9A6"; // ferrugem clareada p/ fundo escuro
    borda = "rgba(241, 185, 166, 0.55)";
  } else if (deltaDia > 0) {
    texto = `▲ R$ ${fmtBRL(deltaDia)} no dia`;
    cor = "#C4D8A8"; // pasto clareado p/ fundo escuro
    borda = "rgba(196, 216, 168, 0.55)";
  } else {
    texto = "estável no dia";
    cor = "rgba(246, 244, 238, 0.7)";
    borda = "rgba(246, 244, 238, 0.35)";
  }
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: "1.1vw",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(9px, 1vw, 12px)",
        fontVariantNumeric: "tabular-nums",
        borderRadius: 100,
        padding: "0.4em 1.1em",
        background: "rgba(28, 22, 16, 0.3)",
        color: cor,
        border: `1px solid ${borda}`,
      }}
    >
      {texto}
    </span>
  );
}

/** Pôster do crepúsculo — céu, sol de latão, morros, gado em silhueta, moinho, cerca. */
function SceneSVG() {
  return (
    <svg
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Pastagem ao crepúsculo"
      style={{ display: "block", width: "100%", height: "clamp(340px, 36vw, 520px)" }}
    >
      <defs>
        <linearGradient id="eSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1C1610" />
          <stop offset="34%" stopColor="#4A3423" />
          <stop offset="62%" stopColor="#8A5A33" />
          <stop offset="82%" stopColor="#C89355" />
          <stop offset="100%" stopColor="#E8C077" />
        </linearGradient>
        <radialGradient id="eSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F3D48C" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#E0AE5C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E0AE5C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="eHillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6E4526" />
          <stop offset="100%" stopColor="#4A3018" />
        </linearGradient>
        <linearGradient id="eHillMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A3421" />
          <stop offset="100%" stopColor="#33230F" />
        </linearGradient>
        <linearGradient id="eGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E2010" />
          <stop offset="100%" stopColor="#1C1408" />
        </linearGradient>
      </defs>
      <rect width="1440" height="520" fill="url(#eSky)" />
      <circle cx="985" cy="352" r="185" fill="url(#eSun)" />
      <circle cx="985" cy="352" r="42" fill="#F3D48C" />
      <g fill="#33230F" opacity="0.35">
        <ellipse cx="300" cy="128" rx="190" ry="8" />
        <ellipse cx="470" cy="155" rx="120" ry="5" />
        <ellipse cx="1120" cy="100" rx="230" ry="9" />
        <ellipse cx="1250" cy="128" rx="120" ry="5" />
      </g>
      <g fill="#E8C077" opacity="0.22">
        <ellipse cx="880" cy="272" rx="260" ry="6" />
        <ellipse cx="1050" cy="300" rx="180" ry="4" />
      </g>
      <path d="M0,368 Q240,332 480,360 T940,352 T1440,362 L1440,520 L0,520 Z" fill="url(#eHillFar)" />
      <path d="M0,404 Q320,374 640,398 T1200,392 T1440,400 L1440,520 L0,520 Z" fill="url(#eHillMid)" />
      <g fill="#1C1408">
        <g transform="translate(760,384) scale(0.85)">
          <ellipse cx="0" cy="0" rx="17" ry="9" />
          <rect x="-15" y="4" width="4" height="13" />
          <rect x="-6" y="5" width="4" height="12" />
          <rect x="5" y="5" width="4" height="12" />
          <rect x="12" y="4" width="4" height="13" />
          <path d="M14,-4 Q24,-8 26,-2 L20,1 Z" />
        </g>
        <g transform="translate(846,390) scale(0.72)">
          <ellipse cx="0" cy="0" rx="17" ry="9" />
          <rect x="-15" y="4" width="4" height="13" />
          <rect x="-6" y="5" width="4" height="12" />
          <rect x="5" y="5" width="4" height="12" />
          <rect x="12" y="4" width="4" height="13" />
          <path d="M-14,-4 Q-24,-8 -26,-2 L-20,1 Z" />
        </g>
        <g transform="translate(676,393) scale(0.58)">
          <ellipse cx="0" cy="0" rx="17" ry="9" />
          <rect x="-15" y="4" width="4" height="13" />
          <rect x="-6" y="5" width="4" height="12" />
          <rect x="5" y="5" width="4" height="12" />
          <rect x="12" y="4" width="4" height="13" />
          <path d="M14,-4 Q24,-8 26,-2 L20,1 Z" />
        </g>
      </g>
      <g transform="translate(1235,300)" stroke="#1C1408" fill="#1C1408">
        <path d="M-3,105 L-11,105 L-2,0 L2,0 L11,105 L3,105 L1,42 L-1,42 Z" stroke="none" />
        <line x1="-7" y1="78" x2="7" y2="78" strokeWidth="2.4" />
        <g strokeWidth="3.2" strokeLinecap="round">
          <line x1="0" y1="0" x2="0" y2="-25" />
          <line x1="0" y1="0" x2="22" y2="12" />
          <line x1="0" y1="0" x2="-22" y2="12" />
          <line x1="0" y1="0" x2="22" y2="-12" />
          <line x1="0" y1="0" x2="-22" y2="-12" />
          <line x1="0" y1="0" x2="0" y2="25" />
        </g>
        <circle cx="0" cy="0" r="4" stroke="none" />
      </g>
      <path d="M0,442 Q360,424 720,436 T1440,432 L1440,520 L0,520 Z" fill="url(#eGround)" />
      <g stroke="#0F0A05" strokeLinecap="round">
        <line x1="60" y1="466" x2="60" y2="414" strokeWidth="8" />
        <line x1="300" y1="470" x2="300" y2="422" strokeWidth="7" />
        <line x1="530" y1="474" x2="530" y2="430" strokeWidth="6" />
        <line x1="740" y1="477" x2="740" y2="437" strokeWidth="5.5" />
        <line x1="930" y1="478" x2="930" y2="442" strokeWidth="5" />
        <line x1="1100" y1="480" x2="1100" y2="446" strokeWidth="4.5" />
        <line x1="1250" y1="481" x2="1250" y2="450" strokeWidth="4" />
        <line x1="1385" y1="482" x2="1385" y2="453" strokeWidth="3.6" />
        <path
          d="M60,426 L300,432 L530,440 L740,446 L930,450 L1100,454 L1250,457 L1385,459"
          fill="none"
          strokeWidth="2"
        />
        <path
          d="M60,444 L300,449 L530,456 L740,461 L930,464 L1100,467 L1250,470 L1385,472"
          fill="none"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
