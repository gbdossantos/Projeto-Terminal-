"use client";

import { HomeDashboard } from "@/components/home/HomeDashboard";

/**
 * Rota `/` — Home dashboard "A Linha".
 *
 * Dados de exemplo (Fazenda Santa Luzia, lotes Marimbondo/Cabeceira/Sede)
 * são mock — quando auth + banco entrarem, vêm do usuário logado.
 *
 * Visitante sem nenhum lote salvo no localStorage vê o estado vazio
 * (gráfico só mercado, cards "R$ —", microcopy honesta).
 */
export default function Page() {
  return <HomeDashboard />;
}
