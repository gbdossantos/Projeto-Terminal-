"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Toggle claro/escuro do TopNav (ao lado da engrenagem).
 *
 * Alterna sobre o resolvedTheme (system conta como o que resolveu) e grava
 * escolha explícita — a partir do primeiro clique o usuário manda, não o SO.
 * Guard de mounted evita hydration mismatch: o servidor não sabe o tema.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "none",
        background: "transparent",
        color: "var(--ink-2)",
        cursor: "pointer",
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--pill-hover)";
        (e.currentTarget as HTMLElement).style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "var(--ink-2)";
      }}
    >
      {/* Antes do mount, ícone neutro fixo (Sun) — mesmo markup no SSR */}
      {dark ? <Sun size={16} strokeWidth={1.6} /> : <Moon size={16} strokeWidth={1.6} />}
    </button>
  );
}
