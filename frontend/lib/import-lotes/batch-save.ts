/**
 * Batch save: pega linhas validadas → chama API → saveLote pra cada uma.
 *
 * Estratégia (decisão de UX): síncrono e sequencial, com callback de progresso.
 * Por que sequencial: Promise.all em paralelo pode estourar rate limit do
 * Railway (especialmente importar 20 lotes simultâneos). Sequencial é mais
 * lento (~1s por lote) mas confiável.
 */

import {
  calcularTerminacaoPasto,
  calcularConfinamento,
  calcularSemiconfinamento,
  calcularCria,
  calcularRecria,
} from "@/lib/api";
import { saveLote } from "@/lib/lotes-storage";
import type { LinhaValidada } from "./validate";
import type {
  TerminacaoPastoRequest,
  ConfinamentoRequest,
  SemiconfinamentoRequest,
  CriaRequest,
  RecriaRequest,
} from "@/lib/types";

export interface BatchProgress {
  feitos: number;
  total: number;
  /** Erros que aconteceram durante o batch (linha → msg). */
  erros: Array<{ linha: number; msg: string }>;
}

export interface BatchResult {
  importados: number;
  falhas: Array<{ linha: number; msg: string }>;
}

/**
 * Constrói o payload de cada sistema a partir dos valores parseados.
 * Defaults pra campos opcionais não informados (mesmo padrão dos forms).
 */
function montarPayload(linha: LinhaValidada): {
  sistema: NonNullable<LinhaValidada["sistema"]>;
  nome: string;
  payload:
    | TerminacaoPastoRequest
    | ConfinamentoRequest
    | SemiconfinamentoRequest
    | CriaRequest
    | RecriaRequest;
} | null {
  if (!linha.sistema) return null;
  const v = linha.valores;
  const n = (k: string) => (typeof v[k] === "number" ? (v[k] as number) : undefined);

  const nome = String(v["nome_lote"] ?? `Lote linha ${linha.linha}`);

  switch (linha.sistema) {
    case "terminacao_pasto":
      return {
        sistema: linha.sistema,
        nome,
        payload: {
          num_animais: n("num_animais")!,
          peso_entrada_kg: n("peso_entrada_kg")!,
          peso_saida_estimado_kg: n("peso_saida_estimado_kg")!,
          dias_ciclo: n("dias_ciclo")!,
          rendimento_carcaca: n("rendimento_carcaca") ?? 0.52,
          custo_reposicao_total: n("custo_reposicao_total")!,
          custo_suplementacao_dia: n("custo_suplementacao_dia")!,
          custo_arrendamento_dia: n("custo_arrendamento_dia")!,
          custo_sanidade_dia: n("custo_sanidade_dia")!,
          custo_mao_obra_dia: n("custo_mao_obra_dia")!,
          outros_custos_dia: n("outros_custos_dia") ?? 0,
          preco_venda: n("preco_venda")!,
          custo_frete_entrada: n("custo_frete_entrada") ?? 0,
          custo_frete_saida: n("custo_frete_saida") ?? 0,
          custo_mortalidade_estimada: n("custo_mortalidade_estimada") ?? 0,
        },
      };
    case "confinamento":
      return {
        sistema: linha.sistema,
        nome,
        payload: {
          num_animais: n("num_animais")!,
          peso_entrada_kg: n("peso_entrada_kg")!,
          peso_saida_estimado_kg: n("peso_saida_estimado_kg")!,
          dias_ciclo: n("dias_ciclo")!,
          rendimento_carcaca: n("rendimento_carcaca") ?? 0.54,
          custo_reposicao_total: n("custo_reposicao_total")!,
          consumo_ms_pct_pv: n("consumo_ms_pct_pv")!,
          custo_dieta_kg_ms: n("custo_dieta_kg_ms")!,
          custo_sanidade_dia: n("custo_sanidade_dia")!,
          custo_mao_obra_dia: n("custo_mao_obra_dia")!,
          custo_instalacoes_dia: n("custo_instalacoes_dia")!,
          preco_venda: n("preco_venda")!,
          custo_frete_entrada: n("custo_frete_entrada") ?? 0,
          custo_frete_saida: n("custo_frete_saida") ?? 0,
          custo_mortalidade_estimada: n("custo_mortalidade_estimada") ?? 0,
        },
      };
    case "semiconfinamento":
      return {
        sistema: linha.sistema,
        nome,
        payload: {
          num_animais: n("num_animais")!,
          peso_entrada_kg: n("peso_entrada_kg")!,
          peso_saida_estimado_kg: n("peso_saida_estimado_kg")!,
          dias_ciclo: n("dias_ciclo")!,
          rendimento_carcaca: n("rendimento_carcaca") ?? 0.53,
          custo_reposicao_total: n("custo_reposicao_total")!,
          custo_arrendamento_dia: n("custo_arrendamento_dia")!,
          custo_manutencao_pasto_dia: n("custo_manutencao_pasto_dia")!,
          consumo_suplemento_kg_dia: n("consumo_suplemento_kg_dia")!,
          custo_suplemento_kg: n("custo_suplemento_kg")!,
          custo_sanidade_dia: n("custo_sanidade_dia")!,
          custo_mao_obra_dia: n("custo_mao_obra_dia")!,
          preco_venda: n("preco_venda")!,
        },
      };
    case "cria":
      return {
        sistema: linha.sistema,
        nome,
        payload: {
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
        },
      };
    case "recria":
      return {
        sistema: linha.sistema,
        nome,
        payload: {
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
        },
      };
  }
}

/** Calcula 1 lote contra a API + saveLote. */
async function processar1(linha: LinhaValidada): Promise<void> {
  const m = montarPayload(linha);
  if (!m) throw new Error("Sistema produtivo não definido");

  switch (m.sistema) {
    case "terminacao_pasto": {
      const res = await calcularTerminacaoPasto(m.payload as TerminacaoPastoRequest);
      saveLote({
        sistema: m.sistema,
        nome: m.nome,
        inputs: m.payload as TerminacaoPastoRequest,
        resultadoCache: res,
        margemPct: res.resultado.margem_percentual,
      });
      return;
    }
    case "confinamento": {
      const res = await calcularConfinamento(m.payload as ConfinamentoRequest);
      saveLote({
        sistema: m.sistema,
        nome: m.nome,
        inputs: m.payload as ConfinamentoRequest,
        resultadoCache: res,
        margemPct: res.resultado.margem_percentual,
      });
      return;
    }
    case "semiconfinamento": {
      const res = await calcularSemiconfinamento(m.payload as SemiconfinamentoRequest);
      saveLote({
        sistema: m.sistema,
        nome: m.nome,
        inputs: m.payload as SemiconfinamentoRequest,
        resultadoCache: res,
        margemPct: res.resultado.margem_percentual,
      });
      return;
    }
    case "cria": {
      const res = await calcularCria(m.payload as CriaRequest);
      saveLote({
        sistema: m.sistema,
        nome: m.nome,
        inputs: m.payload as CriaRequest,
        resultadoCache: res,
        margemPct: null, // cria não tem margem percentual (produz bezerros)
      });
      return;
    }
    case "recria": {
      const res = await calcularRecria(m.payload as RecriaRequest);
      saveLote({
        sistema: m.sistema,
        nome: m.nome,
        inputs: m.payload as RecriaRequest,
        resultadoCache: res,
        margemPct: null, // recria não tem margem percentual (produz kg ganho)
      });
      return;
    }
  }
}

/**
 * Importa todas as linhas válidas em sequência.
 * Chama onProgress após cada lote (sucesso ou falha).
 */
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
