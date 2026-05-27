/**
 * Batch save: pega linhas validadas → chama API unificada → saveLote.
 *
 * Pós-refactor: usa endpoint único POST /lotes/calcular via calcularLote().
 * O input é discriminado por `fase` — typescript narrowing dá a resposta
 * correta (Cria/Recria/Terminacao).
 *
 * Estratégia (decisão UX original): sequencial, com callback de progresso.
 * Evita rate limit no Railway com muitas linhas importadas de uma vez.
 */

import { calcularLote } from "@/lib/api";
import { saveLote } from "@/lib/lotes-storage";
import type {
  LoteInputCria, LoteInputRecria, LoteInputTerminacao,
} from "@/lib/types";
import type { LinhaValidada } from "./validate";

export interface BatchProgress {
  feitos: number;
  total: number;
  erros: Array<{ linha: number; msg: string }>;
}

export interface BatchResult {
  importados: number;
  falhas: Array<{ linha: number; msg: string }>;
}

/**
 * Monta payload tipado a partir dos valores parseados.
 * Defaults pra campos opcionais não informados (mesmo padrão dos forms).
 */
function montarPayload(linha: LinhaValidada):
  | LoteInputCria
  | LoteInputRecria
  | LoteInputTerminacao
  | null {
  if (!linha.fase || !linha.sistema) return null;
  const v = linha.valores;
  const n = (k: string) => (typeof v[k] === "number" ? (v[k] as number) : undefined);
  const nome = String(v["nome_lote"] ?? `Lote linha ${linha.linha}`);

  if (linha.fase === "cria") {
    return {
      fase: "cria",
      sistema: linha.sistema,
      nome,
      num_matrizes: n("num_matrizes")!,
      taxa_natalidade: n("taxa_natalidade")!,
      taxa_desmama: n("taxa_desmama")!,
      peso_desmama_kg: n("peso_desmama_kg")!,
      valor_matriz: n("valor_matriz")!,
      custo_nutricao_ua_ano: n("custo_nutricao_ua_ano")!,
      custo_sanidade_ua_ano: n("custo_sanidade_ua_ano")!,
      custo_reproducao_ua_ano: n("custo_reproducao_ua_ano")!,
      custo_mao_obra_ua_ano: n("custo_mao_obra_ua_ano")!,
      custo_arrendamento_ua_ano: n("custo_arrendamento_ua_ano")!,
      outros_custos_ua_ano: n("outros_custos_ua_ano") ?? 0,
    };
  }

  if (linha.fase === "recria") {
    return {
      fase: "recria",
      sistema: linha.sistema,
      nome,
      num_animais: n("num_animais")!,
      peso_entrada_kg: n("peso_entrada_kg")!,
      peso_saida_estimado_kg: n("peso_saida_estimado_kg")!,
      dias_ciclo: n("dias_ciclo")!,
      custo_aquisicao_total: n("custo_aquisicao_total")!,
      custo_nutricao_dia: n("custo_nutricao_dia")!,
      custo_sanidade_dia: n("custo_sanidade_dia")!,
      custo_mao_obra_dia: n("custo_mao_obra_dia")!,
      custo_arrendamento_dia: n("custo_arrendamento_dia")!,
      outros_custos_dia: n("outros_custos_dia") ?? 0,
    };
  }

  // terminacao — sparse por sistema
  return {
    fase: "terminacao",
    sistema: linha.sistema,
    nome,
    num_animais: n("num_animais")!,
    peso_entrada_kg: n("peso_entrada_kg")!,
    peso_saida_estimado_kg: n("peso_saida_estimado_kg")!,
    dias_ciclo: n("dias_ciclo")!,
    custo_reposicao_total: n("custo_reposicao_total")!,
    custo_sanidade_dia: n("custo_sanidade_dia")!,
    custo_mao_obra_dia: n("custo_mao_obra_dia")!,
    // Sparse — só populados quando o sistema da linha aplica
    custo_suplementacao_dia: n("custo_suplementacao_dia") ?? null,
    custo_arrendamento_dia: n("custo_arrendamento_dia") ?? null,
    consumo_ms_pct_pv: n("consumo_ms_pct_pv") ?? null,
    custo_dieta_kg_ms: n("custo_dieta_kg_ms") ?? null,
    custo_instalacoes_dia: n("custo_instalacoes_dia") ?? null,
    custo_manutencao_pasto_dia: n("custo_manutencao_pasto_dia") ?? null,
    consumo_suplemento_kg_dia: n("consumo_suplemento_kg_dia") ?? null,
    custo_suplemento_kg: n("custo_suplemento_kg") ?? null,
    // Opcionais
    rendimento_carcaca: n("rendimento_carcaca") ?? null,
    outros_custos_dia: n("outros_custos_dia") ?? 0,
    custo_frete_entrada: n("custo_frete_entrada") ?? 0,
    custo_frete_saida: n("custo_frete_saida") ?? 0,
    custo_mortalidade_estimada: n("custo_mortalidade_estimada") ?? 0,
    preco_venda: n("preco_venda")!,
  };
}

/** Calcula 1 lote contra a API + saveLote. Dispatcha pelo `fase` do payload. */
async function processar1(linha: LinhaValidada): Promise<void> {
  const payload = montarPayload(linha);
  if (!payload) throw new Error("Fase ou sistema ausentes");

  if (payload.fase === "cria") {
    const res = await calcularLote(payload);
    saveLote({
      fase: "cria",
      sistema: payload.sistema,
      nome: payload.nome ?? `Lote ${linha.linha}`,
      inputs: payload,
      resultadoCache: res,
      margemPct: null,
    });
    return;
  }

  if (payload.fase === "recria") {
    const res = await calcularLote(payload);
    saveLote({
      fase: "recria",
      sistema: payload.sistema,
      nome: payload.nome ?? `Lote ${linha.linha}`,
      inputs: payload,
      resultadoCache: res,
      margemPct: null,
    });
    return;
  }

  // terminacao
  const res = await calcularLote(payload);
  saveLote({
    fase: "terminacao",
    sistema: payload.sistema,
    nome: payload.nome ?? `Lote ${linha.linha}`,
    inputs: payload,
    resultadoCache: res,
    margemPct: res.resultado.margem_percentual,
  });
}

export async function batchImport(
  linhas: LinhaValidada[],
  onProgress: (p: BatchProgress) => void,
): Promise<BatchResult> {
  const validas = linhas.filter((l) => l.ok);
  const total = validas.length;
  const erros: Array<{ linha: number; msg: string }> = [];
  let importados = 0;

  for (let i = 0; i < validas.length; i++) {
    const linha = validas[i];
    try {
      await processar1(linha);
      importados++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      erros.push({ linha: linha.linha, msg });
    }
    onProgress({ feitos: i + 1, total, erros: [...erros] });
  }

  return { importados, falhas: erros };
}
