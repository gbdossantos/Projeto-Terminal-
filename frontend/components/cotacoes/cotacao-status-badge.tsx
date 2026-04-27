"use client";

import type { CotacaoFieldStatus } from "@/lib/cotacoes-cache";
import { formatRelativeTime } from "@/lib/cotacoes-cache";

interface Props {
  status: CotacaoFieldStatus;
  size?: "xs" | "sm";
}

/**
 * Renderiza o estado de uma cotacao individual:
 * - fresh: timestamp pequeno e neutro ("Atualizado ha 12min")
 * - stale: badge ambar ("Fonte indisponivel · ultima ha 2h")
 * - unavailable: badge vermelho ("Cotacao indisponivel")
 */
export function CotacaoStatusBadge({ status, size = "sm" }: Props) {
  const fontSize = size === "xs" ? 9 : 10;

  if (status.state === "fresh") {
    return (
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize,
          color: "var(--text-tertiary)",
        }}
      >
        Atualizado {formatRelativeTime(status.lastUpdateIso)}
      </span>
    );
  }

  if (status.state === "stale") {
    return (
      <span
        className="inline-block"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize,
          padding: "1px 6px",
          borderRadius: 3,
          background: "var(--warning-bg)",
          color: "var(--amber)",
          letterSpacing: 0.1,
        }}
      >
        Fonte indisponivel · ultima {formatRelativeTime(status.lastUpdateIso)}
      </span>
    );
  }

  return (
    <span
      className="inline-block"
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize,
        padding: "1px 6px",
        borderRadius: 3,
        background: "var(--danger-bg)",
        color: "var(--red-2)",
        letterSpacing: 0.1,
      }}
    >
      Cotacao indisponivel
    </span>
  );
}
