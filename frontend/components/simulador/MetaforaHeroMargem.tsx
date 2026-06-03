"use client";

import { fmtBRL, fmtPct } from "@/lib/utils/format";

/**
 * PRIMÁRIO — metáfora-hero da margem.
 *
 * Barra horizontal ancorada no break-even (marca vertical fixa no centro).
 * A margem do cenário preenche a barra a partir do centro:
 *   - pra direita (verde) se acima do break-even = lucro
 *   - pra esquerda (vermelho) se abaixo = prejuízo
 * Comprimento ∝ magnitude da margem (escala = `escalaMax`, real, derivada
 * dos extremos observados nos cenários — nada fabricado).
 *
 * Acima da barra: o valor da margem em DM Mono dominante (maior número da tela).
 *
 * O rótulo da seção é a pergunta invertida — SEMPRE descritiva/interrogativa,
 * NUNCA imperativa, nenhum texto prescreve ação sobre BGI (CVM §9-A).
 */
export default function MetaforaHeroMargem({
  rotuloCenario,
  margemCenario,
  margemBrl,
  margemPct,
  breakEven,
  escalaMax,
}: {
  rotuloCenario: string;
  margemCenario: number; // R$/@ (pode ser negativo)
  margemBrl: number;
  margemPct: number; // 0-1
  breakEven: number; // R$/@
  escalaMax: number; // R$/@ — metade da barra
}) {
  const lucro = margemCenario >= 0;
  const cor = lucro ? "var(--gain)" : "var(--loss)";
  const escala = escalaMax > 0 ? escalaMax : 1;
  const fracao = Math.min(Math.abs(margemCenario) / escala, 1); // 0-1 da metade
  const larguraPct = fracao * 50; // % da largura total (metade = 50%)

  return (
    <section
      aria-label="Margem do cenário sobre o break-even"
      style={{ borderTop: "0.5px solid var(--rule)", paddingTop: 24 }}
    >
      {/* Pergunta invertida — rótulo descritivo, não imperativo */}
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--ink-2)",
          marginBottom: 18,
          maxWidth: 640,
          lineHeight: 1.5,
        }}
      >
        Qual margem o lote entrega — sobre o break-even — em{" "}
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>{rotuloCenario}</span>?
      </p>

      {/* Número dominante */}
      <div className="flex items-baseline" style={{ gap: 14, marginBottom: 20 }}>
        <span
          className="mono-num"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 56,
            fontWeight: 500,
            lineHeight: 1,
            color: cor,
            letterSpacing: "-0.02em",
          }}
        >
          {lucro ? "+" : "−"}
          {fmtBRL(Math.abs(margemCenario), 0)}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--ink-3)" }}>
          /@
        </span>
      </div>

      {/* Barra ancorada no break-even */}
      <div style={{ position: "relative", height: 44, marginBottom: 10 }}>
        {/* trilho */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 18,
            transform: "translateY(-50%)",
            background: "var(--paper-3)",
            border: "0.5px solid var(--rule)",
            borderRadius: 3,
          }}
        />
        {/* preenchimento a partir do centro */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            height: 18,
            background: cor,
            opacity: 0.85,
            borderRadius: 3,
            width: `${larguraPct}%`,
            ...(lucro
              ? { left: "50%" }
              : { right: "50%" }),
            transition: "width 200ms ease, left 200ms ease, right 200ms ease",
          }}
        />
        {/* marca vertical fixa do break-even (centro) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 2,
            transform: "translateX(-50%)",
            background: "var(--ink)",
          }}
        />
      </div>

      {/* Legenda do eixo: break-even ao centro */}
      <div className="flex items-center justify-center" style={{ gap: 8, marginBottom: 16 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          Break-even
        </span>
        <span
          className="mono-num"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}
        >
          {fmtBRL(breakEven, 0)}/@
        </span>
      </div>

      {/* Contexto secundário: total R$ + % */}
      <div
        className="flex items-center"
        style={{ gap: 18, fontFamily: "var(--font-mono)", fontSize: 11 }}
      >
        <span style={{ color: "var(--ink-3)" }}>
          margem total{" "}
          <span className="mono-num" style={{ color: lucro ? "var(--gain)" : "var(--loss)" }}>
            {lucro ? "+" : "−"}
            {fmtBRL(Math.abs(margemBrl), 0)}
          </span>
        </span>
        <span style={{ color: "var(--ink-3)" }}>
          margem{" "}
          <span className="mono-num" style={{ color: lucro ? "var(--gain)" : "var(--loss)" }}>
            {fmtPct(margemPct)}
          </span>
        </span>
      </div>
    </section>
  );
}
