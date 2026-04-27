"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Layers,
  TrendingUp,
  FlaskConical,
  Clock,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getProfile } from "@/lib/profile";

// /configuracoes intencionalmente fora do menu — pagina e placeholder.
// Rota viva (deep link funciona) ate ter conteudo real, dai volta ao menu.
const nav = [
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/simulador", label: "Simulador", icon: FlaskConical },
  { href: "/mercado", label: "Mercado", icon: TrendingUp },
  { href: "/historico", label: "Historico", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const [farmName, setFarmName] = useState("");

  useEffect(() => {
    const p = getProfile();
    if (p.nome_fazenda) setFarmName(p.nome_fazenda);
  }, [pathname]);

  return (
    <aside
      className="hidden md:flex md:flex-col w-[220px] min-h-screen justify-between"
      style={{ background: "#0F0E0B", borderRight: "0.5px solid #2A2820" }}
    >
      <div>
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-5"
          style={{ borderBottom: "0.5px solid #2A2820" }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#B8763E" }}
          >
            <span className="text-base font-medium" style={{ color: "#FAF0E0" }}>T</span>
          </div>
          <div>
            <p className="text-sm font-medium leading-none" style={{ color: "#F5F1E8" }}>
              Terminal
            </p>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: "#6B6860" }}>
              {farmName || "Farm risk management"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  background: active ? "#B8763E18" : "transparent",
                  borderLeft: active ? "2px solid #B8763E" : "2px solid transparent",
                  color: active ? "#B8763E" : "#6B6860",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "#1A1814";
                    e.currentTarget.style.color = "#F5F1E8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#6B6860";
                  }
                }}
              >
                <item.icon size={16} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: "0.5px solid #2A2820" }}>
        <ThemeToggle />
        <p className="font-mono text-[10px] mt-2 px-1" style={{ color: "#6B6860" }}>v1.0.0</p>
      </div>
    </aside>
  );
}
