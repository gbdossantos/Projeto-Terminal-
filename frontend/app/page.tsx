"use client";

import { HomeDashboard } from "@/components/home/HomeDashboard";

/**
 * Rota `/` — Home dashboard "A Linha".
 *
 * Lotes vêm do Supabase (usuário logado). Sem lote salvo, a Home mostra
 * o estado vazio honesto (sem lote inventado, cards "R$ —").
 */
export default function Page() {
  return <HomeDashboard />;
}
