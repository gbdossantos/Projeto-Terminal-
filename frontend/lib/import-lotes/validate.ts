/**
 * Validador de linhas importadas.
 *
 * Para cada LinhaBruta, retorna LinhaValidada com:
 *  - valores parseados (number/string/sistema)
 *  - errosPorCampo: map {nome_campo → mensagem curta} — vazio se OK
 *  - sistema detectado (após resolver alias)
 *
 * Validações:
 *  - sistema_produtivo: obrigatório, alias resolvido
 *  - nome_lote: obrigatório (string não vazia)
 *  - campos obrigatórios do sistema da linha: presentes e válidos
 *  - tipo: parseável como número (vírgula ou ponto), enum reconhecido
 *  - range: min/max do schema
 *  - campos não aplicáveis ao sistema: se preenchidos, AVISO (silencioso por ora)
 */

import type { LinhaBruta } from "./parse";
import {
  CAMPOS,
  SISTEMA_ALIAS,
  campoAplicavel,
  campoObrigatorio,
  type FieldDef,
  type SistemaImport,
} from "./schema";

export interface LinhaValidada {
  /** Linha original do arquivo. */
  linha: number;
  /** Sistema resolvido (null se não pôde detectar). */
  sistema: SistemaImport | null;
  /** Valores parseados — chaves do schema. */
  valores: Record<string, string | number>;
  /** Erros: campo → mensagem curta. */
  errosPorCampo: Record<string, string>;
  /** True se zero erros. */
  ok: boolean;
}

/** Parse robusto: aceita "1.234,56" (BR), "1234.56" (US), "1234,56", etc. */
export function parseNumeroBR(valor: string): number | null {
  const s = valor.trim();
  if (s === "") return null;

  // Remove R$, espaços e %
  let limpo = s.replace(/[R$\s%]/g, "");

  // Detecta separador decimal: se tem vírgula E ponto, o último é decimal
  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  if (temVirgula && temPonto) {
    // Ex: "1.234,56" → último separador é decimal
    const ultimaVirgula = limpo.lastIndexOf(",");
    const ultimoPonto = limpo.lastIndexOf(".");
    if (ultimaVirgula > ultimoPonto) {
      // BR: ponto é milhar, vírgula é decimal
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      // US: vírgula é milhar, ponto é decimal
      limpo = limpo.replace(/,/g, "");
    }
  } else if (temVirgula) {
    // Só vírgula → decimal BR
    limpo = limpo.replace(",", ".");
  } else if (temPonto) {
    // Só ponto: pode ser decimal US (1234.56) ou milhares BR (5.250.000).
    // Heurística:
    //  - 2+ pontos → todos são separadores de milhar (impossível ter 2 decimais)
    //  - 1 ponto seguido de exatamente 3 dígitos → assumir milhar BR (5.250 ≠ 5,25)
    //  - 1 ponto seguido de 1 ou 2 dígitos → decimal US (padrão do template)
    const pontos = (limpo.match(/\./g) ?? []).length;
    if (pontos >= 2) {
      limpo = limpo.replace(/\./g, "");
    } else {
      const idx = limpo.lastIndexOf(".");
      const aposPonto = limpo.length - idx - 1;
      const antesPonto = limpo.slice(0, idx);
      // Exceção: parte inteira "0" → SEMPRE decimal (0.022 nunca é milhar).
      if (aposPonto === 3 && antesPonto !== "0" && antesPonto !== "") {
        // Ambíguo. Decisão: milhar BR (cenário comum em planilha de gestora).
        // Pra forçar decimal US "1.234", escreva "1234.0" ou "1234".
        limpo = limpo.replace(/\./g, "");
      }
      // 1 ou 2 dígitos após, ou parte inteira "0": já é decimal US válido
    }
  }

  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Normaliza string p/ matching de alias de sistema. */
function normalizarSistema(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function valida1Campo(
  campo: FieldDef,
  valor: string,
  sistema: SistemaImport,
): { erro?: string; parsed?: string | number } {
  const trimmed = valor.trim();
  const obrigatorio = campoObrigatorio(campo, sistema);

  if (trimmed === "") {
    if (obrigatorio) return { erro: "Obrigatório" };
    return { parsed: "" }; // opcional vazio = OK, sem parsed
  }

  if (campo.tipo === "string") {
    return { parsed: trimmed };
  }

  if (campo.tipo === "sistema") {
    const norm = normalizarSistema(trimmed);
    const resolvido = SISTEMA_ALIAS[norm];
    if (!resolvido) {
      return { erro: "Sistema inválido. Use: terminacao_pasto, confinamento, semiconfinamento, cria, recria" };
    }
    return { parsed: resolvido };
  }

  // number ou percent
  const n = parseNumeroBR(trimmed);
  if (n === null) {
    return { erro: "Não é um número válido" };
  }
  if (campo.min !== undefined && n < campo.min) {
    return { erro: `Mínimo ${campo.min}` };
  }
  if (campo.max !== undefined && n > campo.max) {
    return { erro: `Máximo ${campo.max}` };
  }
  return { parsed: n };
}

/**
 * Valida uma linha. Retorna LinhaValidada com erros por campo.
 *
 * Estratégia:
 *  1. Resolve sistema_produtivo primeiro — sem ele não dá pra saber quais
 *     campos são obrigatórios. Se inválido, marca o erro nele e pula validação
 *     dos demais (não dá pra inferir o que é obrigatório).
 *  2. Valida nome_lote (obrigatório em todos).
 *  3. Pra cada campo APLICÁVEL ao sistema (obrig + opcional), valida.
 *  4. Campos NÃO aplicáveis preenchidos: tolerados, não geram erro
 *     (a planilha tem todas as colunas — é normal).
 */
export function validarLinha(linha: LinhaBruta): LinhaValidada {
  const errosPorCampo: Record<string, string> = {};
  const valores: Record<string, string | number> = {};

  // 1. Sistema
  const sistemaRaw = linha.celulas["sistema_produtivo"] ?? "";
  const campoSistema = CAMPOS.find((c) => c.nome === "sistema_produtivo")!;
  const resSistema = valida1Campo(campoSistema, sistemaRaw, "terminacao_pasto"); // sistema dummy só pra entrar
  let sistema: SistemaImport | null = null;
  if (resSistema.erro) {
    errosPorCampo["sistema_produtivo"] = resSistema.erro;
  } else {
    sistema = resSistema.parsed as SistemaImport;
    valores["sistema_produtivo"] = sistema;
  }

  // 2. Sem sistema válido: validamos só nome_lote e paramos (não dá pra saber
  // o que é obrigatório nos demais campos).
  const campoNome = CAMPOS.find((c) => c.nome === "nome_lote")!;
  // Para nome_lote, usa o sistema detectado OU terminacao_pasto como dummy
  // (nome_lote é obrigatório em TODOS os sistemas).
  const resNome = valida1Campo(campoNome, linha.celulas["nome_lote"] ?? "", sistema ?? "terminacao_pasto");
  if (resNome.erro) errosPorCampo["nome_lote"] = resNome.erro;
  else if (resNome.parsed !== undefined && resNome.parsed !== "") valores["nome_lote"] = resNome.parsed;

  if (!sistema) {
    return {
      linha: linha.linha,
      sistema: null,
      valores,
      errosPorCampo,
      ok: Object.keys(errosPorCampo).length === 0,
    };
  }

  // 3. Demais campos aplicáveis ao sistema
  for (const campo of CAMPOS) {
    if (campo.nome === "sistema_produtivo" || campo.nome === "nome_lote") continue;
    if (!campoAplicavel(campo, sistema)) continue;
    const raw = linha.celulas[campo.nome] ?? "";
    const res = valida1Campo(campo, raw, sistema);
    if (res.erro) {
      errosPorCampo[campo.nome] = res.erro;
    } else if (res.parsed !== undefined && res.parsed !== "") {
      valores[campo.nome] = res.parsed;
    }
  }

  return {
    linha: linha.linha,
    sistema,
    valores,
    errosPorCampo,
    ok: Object.keys(errosPorCampo).length === 0,
  };
}

/** Valida todas as linhas. */
export function validarTodas(linhas: LinhaBruta[]): LinhaValidada[] {
  return linhas.map(validarLinha);
}

/** Contagem rápida pra header da preview. */
export function contar(linhas: LinhaValidada[]): { ok: number; comErro: number } {
  let ok = 0;
  let comErro = 0;
  for (const l of linhas) {
    if (l.ok) ok++;
    else comErro++;
  }
  return { ok, comErro };
}
