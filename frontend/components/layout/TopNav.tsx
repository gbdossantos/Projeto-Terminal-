"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profile";
import { MOCK_USUARIO, MOCK_FAZENDA } from "@/lib/mock-data";

/**
 * Header canônico — V19 (Vercel-like).
 *
 * Layout em 2 linhas:
 *   Linha 1 (identidade): TERMINAL · BOI GORDO | usuário · fazenda · data + pílula Pregão
 *   Linha 2 (nav):        Home | Lotes | Simulador | Histórico | Mercado (tabs pill)
 *
 * Sticky com backdrop-filter pra ficar sobre o fundo aurora.
 */
export function TopNav() {
  const pathname = usePathname();
  const [farmName, setFarmName] = useState<string>(MOCK_FAZENDA.nome);
  const [hojeStr, setHojeStr] = useState<string>("");

  useEffect(() => {
    const p = getProfile();
    if (p.nome_fazenda) setFarmName(p.nome_fazenda);
    const hoje = new Date();
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    setHojeStr(
      `${hoje.getDate()} ${meses[hoje.getMonth()]}/${String(hoje.getFullYear()).slice(2)}`,
    );
  }, [pathname]);

  const tabs = [
    { href: "/", label: "Home" },
    { href: "/lotes", label: "Lotes" },
    { href: "/simulador", label: "Simulador" },
    { href: "/historico", label: "Histórico" },
    { href: "/mercado", label: "Mercado" },
  ];

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--rule)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Linha 1 — identidade + Pregão */}
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

        <div className="flex items-center" style={{ gap: 14 }}>
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
            <span>{hojeStr || "—"}</span>
          </div>
          <PregaoStatus />
        </div>
      </div>

      {/* Linha 2 — nav tabs (pill V19) */}
      <nav
        className="flex"
        style={{
          gap: 4,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 28px 10px",
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
                padding: "6px 12px",
                color: active ? "var(--ink)" : "var(--ink-2)",
                fontWeight: active ? 600 : 500,
                background: active ? "rgba(10, 10, 10, 0.06)" : "transparent",
                borderRadius: 7,
                textDecoration: "none",
                transition: "background 120ms, color 120ms",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(10, 10, 10, 0.035)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink-2)";
                }
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

/**
 * Pílula de status do pregão B3.
 *
 * Janela considerada: segunda a sexta, 09:00–18:00 BRT (decisão MVP — feriados
 * B3 não são checados; vira bug conhecido ~20 dias/ano).
 *
 * Aberto: dot verde pulse + texto "Pregão aberto"
 * Fechado: dot cinza estático + texto "Pregão fechado"
 *
 * Estado real, lê da hora do navegador convertida pra BRT.
 */
function PregaoStatus() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const compute = () => {
      // Hora atual em BRT. Browser fornece local; assumimos que se o user está
      // no Brasil, local já é BRT. Se estiver em outro fuso, ainda funciona
      // porque calcula via UTC + offset -3.
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
      const brt = new Date(utc - 3 * 60 * 60_000);
      const dia = brt.getDay(); // 0 = domingo, 6 = sábado
      const hora = brt.getHours();
      const ehDiaUtil = dia >= 1 && dia <= 5;
      const ehHorarioPregao = hora >= 9 && hora < 18;
      setOpen(ehDiaUtil && ehHorarioPregao);
    };
    compute();
    const i = setInterval(compute, 60_000);
    return () => clearInterval(i);
  }, []);

  return (
    <div
      className="flex items-center"
      style={{
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: open ? "rgba(22, 163, 74, 0.10)" : "rgba(10, 10, 10, 0.06)",
        border: `1px solid ${open ? "rgba(22, 163, 74, 0.20)" : "var(--rule)"}`,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: open ? "var(--gain-2)" : "var(--ink-2)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        className={open ? "pregao-dot-pulse" : ""}
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: open ? "#16A34A" : "var(--ink-3)",
          display: "inline-block",
        }}
      />
      <span>Pregão {open ? "aberto" : "fechado"}</span>
    </div>
  );
}
