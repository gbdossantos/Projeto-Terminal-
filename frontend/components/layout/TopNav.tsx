"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useProfile } from "@/lib/use-profile";
import { createClient } from "@/lib/supabase/client";
import { FivelaAvatar } from "./FivelaAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Header canônico — Estrada.
 *
 * Layout em 2 linhas:
 *   Linha 1 (identidade): TERMINAL · BOI GORDO | usuário · fazenda · data + pílula Pregão + fivela
 *   Linha 2 (nav):        Home | Lotes | Simulador | Histórico | Mercado (tabs pill)
 *
 * Sticky com backdrop-filter (vidro de osso) pra ficar sobre o fundo aurora.
 * Estrada pura: sem bandeirinhas; o avatar do perfil é a fivela de latão.
 */
export function TopNav() {
  const pathname = usePathname();
  // Profile reativo: muda automaticamente quando salvo em /configuracoes.
  const { profile } = useProfile();
  const userName = profile.nome_produtor;
  const farmName = profile.nome_fazenda;
  const municipio = profile.municipio;
  const estado = profile.estado;

  const [hojeStr, setHojeStr] = useState<string>("");

  useEffect(() => {
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
        background: "var(--glass)",
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
              gap: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-2)",
            }}
          >
            <span>{userName}</span>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{farmName}</span>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            <span>{municipio} / {estado}</span>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            <span>{hojeStr || "—"}</span>
          </div>
          <PregaoStatus />
          {/* Engrenagem → /configuracoes. Fora das tabs principais (decisão #2). */}
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            title="Configurações"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 7,
              color: pathname === "/configuracoes" ? "var(--ink)" : "var(--ink-2)",
              background: pathname === "/configuracoes" ? "var(--paper-3)" : "transparent",
              transition: "background 120ms, color 120ms",
            }}
            onMouseEnter={(e) => {
              if (pathname !== "/configuracoes") {
                (e.currentTarget as HTMLElement).style.background = "var(--paper-3)";
                (e.currentTarget as HTMLElement).style.color = "var(--ink)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/configuracoes") {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--ink-2)";
              }
            }}
          >
            <Settings size={16} strokeWidth={1.6} />
          </Link>
          <UserMenu farmName={farmName} />
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
                background: active ? "var(--paper-3)" : "transparent",
                borderRadius: 7,
                textDecoration: "none",
                transition: "background 120ms, color 120ms",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--paper-3)";
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
        background: open ? "var(--gain-bg)" : "var(--paper-3)",
        border: `1px solid ${open ? "var(--gain-line)" : "var(--rule)"}`,
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
          background: open ? "var(--gain)" : "var(--ink-3)",
          display: "inline-block",
        }}
      />
      <span>Pregão {open ? "aberto" : "fechado"}</span>
    </div>
  );
}

/** Fivela de latão + menu com "Sair" — sempre acessível no TopNav (decisão aprovada). */
function UserMenu({ farmName }: { farmName: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
        }}
        aria-label="Menu do usuário"
      >
        <FivelaAvatar nomeFazenda={farmName} size={26} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {email && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{email}</DropdownMenuLabel>
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSair}>
          <LogOut size={14} strokeWidth={1.6} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
