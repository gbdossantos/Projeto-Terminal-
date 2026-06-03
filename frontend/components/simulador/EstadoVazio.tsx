"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Estado vazio — 0 lotes de terminação salvos. Não renderiza o resto da tela.
 * "Cadastre um lote em /lotes para simular."
 */
export default function EstadoVazio() {
  return (
    <div
      style={{
        border: "0.5px solid var(--rule)",
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
          color: "var(--ink-3)",
          marginBottom: 12,
        }}
      >
        Nenhum lote de terminação
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
        O simulador roda sobre um lote real. Cadastre um lote de terminação para simular
        como ele se comporta em situações de mercado históricas.
      </p>
      <Link href="/lotes" className={buttonVariants()}>
        Cadastrar um lote
      </Link>
    </div>
  );
}
