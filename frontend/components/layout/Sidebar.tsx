"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  Clock,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const nav = [
  { href: "/", label: "Visao geral", icon: LayoutDashboard },
  { href: "/lotes", label: "Lotes", icon: Layers },
  { href: "/mercado", label: "Mercado", icon: TrendingUp },
  { href: "/historico", label: "Historico", icon: Clock },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-60 min-h-screen border-r border-border bg-card px-4 py-6 justify-between">
      {/* Logo */}
      <div>
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-7 h-7 rounded bg-terra flex items-center justify-center">
            <span className="text-white font-semibold text-sm">T</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-t-primary leading-none">Terminal</p>
            <p className="text-[11px] text-t-tertiary leading-tight mt-0.5">Farm risk management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-terra-bg text-terra font-medium"
                    : "text-t-secondary hover:text-t-primary hover:bg-secondary"
                }`}
              >
                <item.icon size={16} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="space-y-2 pt-4 border-t border-border">
        <ThemeToggle />
        <p className="text-[11px] text-t-tertiary px-3">v1.0.0</p>
      </div>
    </aside>
  );
}
