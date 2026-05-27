/**
 * Validador de linhas importadas (pós-refactor fase/sistema).
 *
 * Para cada LinhaBruta, retorna LinhaValidada com:
 *  - fase + sistema detectados (alias-tolerantes)
 *  - valores parseados
 *  - errosPorCampo: map {nome_campo → mensagem curta} — vazio se OK
 *
 * Validações:
 *  - fase: obrigatória, valor reconhecido (cria/recria/terminacao)
 *  - sistema: obrigatório, valor reconhecido (pasto/semi/conf)
 *  - nome_lote: obrigatório
 *  - campos obrigatórios da combinação `(fase, sistema)`: presentes e válidos
 *  - tipo: parseável (número aceita BR e US), enum reconhecido
 *  - range: min/max do schema
 *  - campos não-aplicáveis preenchidos: tolerados, não geram erro
 */

import type { Fase, Sistema } from "@/lib/types";
import type { LinhaBruta } from "./parse";
import {
  CAMPOS,
  FASE_ALIAS,
  SISTEMA_ALIAS,
  campoAplicavel,
  campoObrigatorio,
  type FieldDef,
} from "./schema";

export interface LinhaValidada {
  /** Linha original do arquivo. */
  linha: number;
  /** Fase resolvida (null se inválida/ausente). */
  fase: Fase | null;
  /** Sistema resolvido (null se inválido/ausente). */
  sistema: Sistema | null;
  /** Valores parseados — chaves do schema. */
  valores: Record<string, string | number>;
  /** Erros: campo → mensagem curta. */
  errosPorCampo: Record<string, string>;
  /** True se zero erros. */
  ok: boolean;
}

/** Parse robusto: aceita "1.234,56" (BR), "1234.56" (US), "R$ 5.250.000", etc. */
export function parseNumeroBR(valor: string): number | null {
  const s = valor.trim();
  if (s === "") return null;
  let limpo = s.replace(/[R$\s%]/g, "");

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  if (temVirgula && temPonto) {
    const ultimaVirgula = limpo.lastIndexOf(",");
    const ultimoPonto = limpo.lastIndexOf(".");
    if (ultimaVirgula > ultimoPonto) {
      // BR: ponto=milhar, vírgula=decimal
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      // US: vírgula=milhar, ponto=decimal
      limpo = limpo.replace(/,/g, "");
    }
  } else if (temVirgula) {
    limpo = limpo.replace(",", ".");
  } else if (temPonto) {
    const pontos = (limpo.match(/\./g) ?? []).length;
    if (pontos >= 2) {
      limpo = limpo.replace(/\./g, "");
    } else {
      const idx = limpo.lastIndexOf(".");
      const aposPonto = limpo.length - idx - 1;
      const antesPonto = limpo.slice(0, idx);
      if (aposPonto === 3 && antesPonto !== "0" && antesPonto !== "") {
        limpo = limpo.replace(/\./g, "");
      }
    }
  }

  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function valida1Campo(
  campo: FieldDef,
  valor: string,
  fase: Fase,
  sistema: Sistema,
): { erro?: string; parsed?: string | number } {
  const trimmed = valor.trim();
  const obrigatorio = campoObrigatorio(campo, fase, sistema);

  if (trimmed === "") {
    if (obrigatorio) return { erro: "Obrigatório" };
    return { parsed: "" };
  }

  if (campo.tipo === "string") {
    return { parsed: trimmed };
  }

  if (campo.tipo === "fase") {
    const norm = normalizar(trimmed);
    const resolvido = FASE_ALIAS[norm];
    if (!resolvido) return { erro: "Fase inválida. Use: cria, recria, terminacao" };
    return { parsed: resolvido };
  }

  if (campo.tipo === "sistema") {
    const norm = normalizar(trimmed);
    const resolvido = SISTEMA_ALIAS[norm];
    if (!resolvido) return { erro: "Sistema inválido. Use: pasto, semiconfinamento, confinamento" };
    return { parsed: resolvido };
  }

  // number ou percent
  const n = parseNumeroBR(trimmed);
  if (n === null) return { erro: "Não é um número válido" };
  if (campo.min !== undefined && n < campo.min) return { erro: `Mínimo ${campo.min}` };
  if (campo.max !== undefined && n > campo.max) return { erro: `Máximo ${campo.max}` };
  return { parsed: n };
}

/**
 * Valida uma linha. Estratégia:
 *  1. Resolve `fase` e `sistema` primeiro — sem ambos, não dá pra saber
 *     o que é obrigatório nos demais.
 *  2. Valida nome_lote.
 *  3. Pra cada campo APLICÁVEL à combinação `(fase, sistema)`, valida.
 *  4. Campos não-aplicáveis preenchidos: silenciosamente ignorados.
 */
export function validarLinha(linha: LinhaBruta): LinhaValidada {
  const errosPorCampo: Record<string, string> = {};
  const valores: Record<string, string | number> = {};

  // 1. Fase
  const campoFase = CAMPOS.find((c) => c.nome === "fase")!;
  const resFase = valida1Campo(
    campoFase,
    linha.celulas["fase"] ?? "",
    "terminacao", // dummy
    "pasto",      // dummy
  );
  let fase: Fase | null = null;
  if (resFase.erro) errosPorCampo["fase"] = resFase.erro;
  else {
    fase = resFase.parsed as Fase;
    valores["fase"] = fase;
  }

  // 2. Sistema
  const campoSistema = CAMPOS.find((c) => c.nome === "sistema")!;
  const resSistema = valida1Campo(
    campoSistema,
    linha.celulas["sistema"] ?? "",
    "terminacao",
    "pasto",
  );
  let sistema: Sistema | null = null;
  if (resSistema.erro) errosPorCampo["sistema"] = resSistema.erro;
  else {
    sistema = resSistema.parsed as Sistema;
    valores["sistema"] = sistema;
  }

  // 3. nome_lote (obrigatório em todas as combinações)
  const campoNome = CAMPOS.find((c) => c.nome === "nome_lote")!;
  const resNome = valida1Campo(
    campoNome,
    linha.celulas["nome_lote"] ?? "",
    fase ?? "terminacao",
    sistema ?? "pasto",
  );
  if (resNome.erro) errosPorCampo["nome_lote"] = resNome.erro;
  else if (resNome.parsed !== undefined && resNome.parsed !== "") {
    valores["nome_lote"] = resNome.parsed;
  }

  // 4. Sem fase ou sistema válidos, paramos aqui (não dá pra saber o que é
  // obrigatório nos demais campos).
  if (!fase || !sistema) {
    return {
      linha: linha.linha,
      fase,
      sistema,
      valores,
      errosPorCampo,
      ok: Object.keys(errosPorCampo).length === 0,
    };
  }

  // 5. Demais campos aplicáveis à combinação
  for (const campo of CAMPOS) {
    if (campo.nome === "fase" || campo.nome === "sistema" || campo.nome === "nome_lote") continue;
    if (!campoAplicavel(campo, fase, sistema)) continue;
    const raw = linha.celulas[campo.nome] ?? "";
    const res = valida1Campo(campo, raw, fase, sistema);
    if (res.erro) {
      errosPorCampo[campo.nome] = res.erro;
    } else if (res.parsed !== undefined && res.parsed !== "") {
      valores[campo.nome] = res.parsed;
    }
  }

  return {
    linha: linha.linha,
    fase,
    sistema,
    valores,
    errosPorCampo,
    ok: Object.keys(errosPorCampo).length === 0,
  };
}

export function validarTodas(linhas: LinhaBruta[]): LinhaValidada[] {
  return linhas.map(validarLinha);
}

export function contar(linhas: LinhaValidada[]): { ok: number; comErro: number } {
  let ok = 0;
  let comErro = 0;
  for (const l of linhas) {
    if (l.ok) ok++;
    else comErro++;
  }
  return { ok, comErro };
}
