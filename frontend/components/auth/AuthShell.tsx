"use client";

import { useState } from "react";
import { NelLockup } from "@/components/brand/Marca";

/**
 * Moldura das telas de autenticação (login + reset de senha).
 *
 * Reusa o empilhamento já validado na Home, sem inventar tokens novos:
 *   - foto de crepúsculo (hero_dusk.jpg) full-bleed, object-fit: cover
 *   - overlay --hero-overlay (abre no dark, §4 — a foto já é escura)
 *   - card de vidro fosco com os MESMOS tokens dos cards de cotação
 *     (--glass-card / --glass-card-border / blur 20 / radius / sombra),
 *     composite já verificado AA sobre a foto nos dois temas
 *
 * A marca fica DENTRO do card (não sobre a foto): assim `currentColor` herda
 * a cor da superfície que flipa por tema (--ink), e o lockup acompanha
 * claro/escuro sozinho. Sobre a foto (sempre escura) ele não poderia flipar.
 *
 * Hierarquia: lockup (identidade) → children (form) → mensagens/links.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const [fotoFalhou, setFotoFalhou] = useState(false);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ position: "relative", overflow: "hidden", padding: 24, background: "var(--ink)" }}
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
      {/* Overlay por tema (mesmo token do hero). Ambiente, não protagonista. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--hero-overlay)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>
        <div
          style={{
            background: "var(--glass-card)",
            WebkitBackdropFilter: "blur(20px)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-card-border)",
            borderRadius: "var(--radius-card)",
            boxShadow:
              "0 1px 2px rgba(10, 10, 10, 0.06), 0 16px 40px -16px rgba(10, 10, 10, 0.28)",
            padding: "30px 26px",
          }}
        >
          {/* Marca em currentColor — flipa com o tema via --ink */}
          <div
            className="flex flex-col items-center"
            style={{ color: "var(--ink)", marginBottom: 22, gap: 8 }}
          >
            <NelLockup height={30} />
            <span
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "var(--ink-3)",
              }}
            >
              Boi gordo
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
