"use client";

import Link from "next/link";
import { MOCK_LOTES, fmtBRL, fmtData, type MockLote } from "@/lib/mock-data";

/**
 * Camada 4 da Home Estrada — a trilha dos lotes.
 *
 * Cards de lote em snap-scroll horizontal (flex + scroll-snap CSS):
 * a metáfora da linha do tempo sem escala temporal calculada.
 * Nome em Besley, dot de latão + data de saída, risco em semáforo
 * pasto/ferrugem (latão só no amarelo — warning, não acento).
 */

interface Props {
  /** Spot MS em R$/@ — usado pra classificar o risco de cada lote. */
  spot: number | null;
  /** Break-even médio do rebanho em R$/@. */
  breakEven: number;
  empty?: boolean;
}

type Risco = "verde" | "amarelo" | "vermelho" | "indefinido";

function classificarRisco(spot: number | null, breakEven: number): Risco {
  if (spot == null || breakEven <= 0) return "indefinido";
  const margem = (spot - breakEven) / spot;
  if (margem > 0.15) return "verde";
  if (margem >= 0.05) return "amarelo";
  return "vermelho";
}

const RISCO_UI: Record<Risco, { cor: string; bg: string; rotulo: string }> = {
  verde: { cor: "var(--gain-2)", bg: "var(--gain-bg)", rotulo: "margem confortável" },
  amarelo: { cor: "var(--latao-lo)", bg: "var(--warning-bg)", rotulo: "margem apertada" },
  vermelho: { cor: "var(--loss-2)", bg: "var(--loss-bg)", rotulo: "abaixo do fôlego" },
  indefinido: { cor: "var(--ink-3)", bg: "var(--paper-3)", rotulo: "risco indefinido" },
};

export function TrilhaLotes({ spot, breakEven, empty = false }: Props) {
  if (empty) {
    return (
      <div
        style={{
          border: "1px dashed var(--rule-strong)",
          borderRadius: "var(--radius-card)",
          padding: "28px 32px",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        Nenhum lote na trilha ainda.{" "}
        <Link href="/lotes" style={{ color: "var(--grafite)", fontWeight: 600 }}>
          Cadastre o primeiro →
        </Link>
      </div>
    );
  }

  const lotes = [...MOCK_LOTES].sort(
    (a, b) => new Date(a.data_saida).getTime() - new Date(b.data_saida).getTime(),
  );
  const risco = classificarRisco(spot, breakEven);

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        paddingBottom: 8,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {lotes.map((lote) => (
        <CardLote key={lote.id} lote={lote} spot={spot} risco={risco} />
      ))}
    </div>
  );
}

function CardLote({ lote, spot, risco }: { lote: MockLote; spot: number | null; risco: Risco }) {
  const exposto = spot != null ? lote.arrobas_totais * spot : null;
  const ui = RISCO_UI[risco];

  return (
    <Link
      href="/lotes"
      style={{
        scrollSnapAlign: "start",
        flex: "0 0 auto",
        width: 280,
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "22px 24px 20px",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 140ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "-0.01em",
          color: "var(--ink)",
          marginBottom: 10,
        }}
      >
        {lote.nome}
      </div>

      {/* Parada na trilha: dot de latão + data de saída */}
      <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--latao)",
            border: "1.5px solid var(--latao-lo)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--ink-2)",
          }}
        >
          saída {fmtData(lote.data_saida)}
        </span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-2)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.7,
        }}
      >
        <div>
          {lote.num_animais.toLocaleString("pt-BR")} cab ·{" "}
          {lote.arrobas_totais.toLocaleString("pt-BR")} @
        </div>
        <div style={{ color: "var(--ink)" }}>
          {exposto != null ? <>R$ {fmtBRL(exposto / 1_000_000, 2)} mi expostos</> : "cotação indisponível"}
        </div>
      </div>

      <div
        className="uppercase"
        style={{
          marginTop: 14,
          display: "inline-block",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: ui.cor,
          background: ui.bg,
          borderRadius: 100,
          padding: "4px 10px",
        }}
      >
        {ui.rotulo}
      </div>
    </Link>
  );
}
