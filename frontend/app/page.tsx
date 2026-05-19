"use client";

import { useEffect, useState } from "react";
import { LandingHome } from "@/components/landing/LandingHome";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { listLotes } from "@/lib/lotes-storage";

/**
 * Rota `/` — híbrido:
 * - Tem lote salvo no localStorage → Home dashboard nova (com mock de Fazenda Santa Luzia).
 * - Sem lote salvo → landing pública existente (captação).
 *
 * (Quando auth entrar, troca por: logado → Home; deslogado → Landing.)
 */
export default function Page() {
  const [hasLote, setHasLote] = useState<boolean | null>(null);

  useEffect(() => {
    // listLotes() retorna lotes salvos do usuario (terminal_lotes em localStorage)
    const lotes = listLotes();
    setHasLote(lotes.length > 0);
  }, []);

  // Pre-hidratacao: render landing por padrao (evita flash de Home pra visitante novo)
  if (hasLote === null) {
    return <LandingHome />;
  }

  return hasLote ? <HomeDashboard /> : <LandingHome />;
}
