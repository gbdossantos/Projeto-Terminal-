"use client";

import { Button } from "@/components/ui/button";

/**
 * Estado de erro explícito (§10.6: stale/fake é pior que ausência).
 * Quando o engine histórico não responde / não há dado pra montar os presets,
 * a tela diz isso — NUNCA inventa número.
 */
export default function EstadoErro({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      style={{
        border: "0.5px solid var(--rule-strong)",
        borderRadius: "var(--radius-card)",
        background: "var(--paper-2)",
        padding: "48px 40px",
        textAlign: "center",
        maxWidth: 520,
        margin: "40px auto 0",
      }}
    >
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "var(--loss)",
          marginBottom: 12,
        }}
      >
        Sem dado histórico
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          color: "var(--ink)",
          lineHeight: 1.5,
          marginBottom: 22,
        }}
      >
        Não foi possível montar as situações históricas para este lote. Sem dado, não há
        simulação — o Nel não exibe número estimado no lugar.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
