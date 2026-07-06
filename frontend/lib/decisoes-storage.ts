// Persistência das decisões simuladas no /simulador — Supabase
// (`decisoes_simulador`), RLS scoped por auth.uid() = user_id.
//
// Schema desenhado para virar dado estrategico (intencao de hedge × cenario
// vs resultado real depois). Por isso captura: lote, % hedge, cenario simulado,
// preco travado de referencia, e intencao do usuario (travaria sim/nao).

import { createClient } from "@/lib/supabase/client";

export type IntencaoHedge = "travaria" | "nao_travaria" | null;

export interface DecisaoSimulador {
  id: string;
  lote_id: string;
  lote_nome: string;
  hedge_pct: number;           // 0..1 (fracao travada simulada)
  cenario_arroba: number;      // R$/@ que o usuario simulou
  preco_travado: number;       // R$/@ do BGI − basis no momento do registro
  intencao: IntencaoHedge;     // o que ele faria se fosse decidir agora
  criado_em: string;           // ISO timestamp
}

export async function listDecisoes(): Promise<DecisaoSimulador[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisoes_simulador")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error || !data) return [];
  return data as DecisaoSimulador[];
}

export async function saveDecisao(
  data: Omit<DecisaoSimulador, "id" | "criado_em">,
): Promise<DecisaoSimulador | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: inserted, error } = await supabase
    .from("decisoes_simulador")
    .insert({ ...data, user_id: user.id })
    .select("*")
    .single();

  if (error || !inserted) return null;
  return inserted as DecisaoSimulador;
}

export async function deleteDecisao(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("decisoes_simulador").delete().eq("id", id);
}
