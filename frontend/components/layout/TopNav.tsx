"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profile";
import { MOCK_USUARIO, MOCK_FAZENDA } from "@/lib/mock-data";

/**
 * Header canônico do produto — usado em todas as telas do dashboard e na Home.
 *
 * Layout: 2 linhas.
 *  Linha 1 (identidade): "TERMINAL · BOI GORDO" | usuário · fazenda · data
 *  Linha 2 (nav): Home | Lotes | Simulador | Histórico | Mercado
 *
 * Quando auth entrar, os dados do usuário/fazenda virão do contexto autenticado
 * em vez do MOCK_*; o resto da estrutura permanece.
 */
export function TopNav() {
  const pathname = usePathname();
  const [farmName, setFarmName] = useState<string>(MOCK_FAZENDA.nome);

  useEffect(() => {
    const p = getProfile();
    if (p.nome_fazenda) setFarmName(p.nome_fazenda);
  }, [pathname]);

  const tabs = [
    { href: "/", label: "Home" },
    { href: "/lotes", label: "Lotes" },
    { href: "/simulador", label: "Simulador" },
    { href: "/historico", label: "Histórico" },
    { href: "/mercado", label: "Mercado" },
  ];

  return (
    <div style={{ background: "var(--paper)", borderBottom: "0.5px solid var(--rule)" }}>
      {/* Linha 1 — identidade */}
      <div
        className="flex items-center justify-between"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "14px 32px 12px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }} className="flex items-center gap-2">
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink)",
              fontWeight: 500,
            }}
          >
            TERMINAL
          </span>
          <span style={{ color: "var(--ink-3)", fontSize: 11 }}>·</span>
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-2)",
            }}
          >
            BOI GORDO
          </span>
        </Link>

        <div
          className="hidden md:flex items-center"
          style={{
            gap: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-2)",
          }}
        >
          <span>{MOCK_USUARIO.nome}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{farmName}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>{MOCK_FAZENDA.municipio} / {MOCK_FAZENDA.estado}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span>19 mai/26</span>
        </div>
      </div>

      {/* Linha 2 — nav tabs */}
      <nav
        className="flex"
        style={{
          gap: 22,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                padding: "8px 0 10px",
                color: active ? "var(--ink)" : "var(--ink-3)",
                fontWeight: active ? 600 : 400,
                borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
                textDecoration: "none",
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
