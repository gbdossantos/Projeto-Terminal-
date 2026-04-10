"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profile";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const nav = [
  { href: "/lotes", label: "Lotes" },
  { href: "/simulador", label: "Simulador" },
  { href: "/mercado", label: "Mercado" },
  { href: "/historico", label: "Historico" },
  { href: "/configuracoes", label: "Perfil" },
];

export function TopNav() {
  const pathname = usePathname();
  const [farmName, setFarmName] = useState("");

  useEffect(() => {
    const p = getProfile();
    if (p.nome_fazenda) setFarmName(p.nome_fazenda);
  }, [pathname]);

  return (
    <nav
      className="flex items-center justify-between px-10 h-14"
      style={{ borderBottom: "0.5px solid var(--border-subtle)", background: "var(--bg-deep)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--brand)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--brand-fg)" }}>T</span>
        </div>
        <span className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
          Terminal
        </span>
        {farmName && (
          <span className="text-[11px] hidden md:inline" style={{ color: "var(--text-tertiary)" }}>
            · {farmName}
          </span>
        )}
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[13px] px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                background: active ? "var(--terra-bg)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </nav>
  );
}
