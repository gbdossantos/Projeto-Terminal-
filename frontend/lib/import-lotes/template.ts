/**
 * Gerador de template CSV/XLSX para import de lotes (pós-refactor fase/sistema).
 *
 * Estratégia: arquivo único com TODAS as colunas (união das 9 combinações).
 * Duas colunas chave: `fase` e `sistema` (snake_case). Cada linha-exemplo
 * declara sua combinação; células de campos não-aplicáveis ficam vazias.
 *
 * 5 linhas-exemplo (uma por combinação representativa):
 *  - cria + pasto
 *  - recria + pasto
 *  - terminacao + pasto
 *  - terminacao + confinamento
 *  - terminacao + semiconfinamento
 *
 * Outras combinações (cria + semi, cria + conf, recria + semi, recria + conf)
 * usam a mesma fórmula sistema-agnóstica — usuário replica a linha cria/recria
 * trocando o valor da coluna `sistema`.
 */

import * as XLSX from "xlsx";
import { CAMPOS, COMBINACOES_EXEMPLO } from "./schema";

/** Header: nomes das colunas (snake_case PT). */
function header(): string[] {
  return CAMPOS.map((c) => c.nome);
}

/** Uma linha-exemplo por combinação representativa. */
function linhasExemplo(): (string | number)[][] {
  return COMBINACOES_EXEMPLO.map(({ fase, sistema, nomeLote }) => {
    const key = `${fase}__${sistema}` as const;
    return CAMPOS.map((c) => {
      // Identidade preenchida explicitamente
      if (c.nome === "nome_lote") return nomeLote;
      if (c.nome === "fase") return fase;
      if (c.nome === "sistema") return sistema;
      const v = c.exemplo?.[key];
      return v ?? "";
    });
  });
}

/** Escape mínimo pra CSV — envolve em "" se tiver vírgula/quebra/aspas. */
function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Gera o CSV completo como string.
 *
 * Decimal: usamos PONTO ("." separador) — convenção universal de CSV
 * e o que o parser espera por padrão. Brasileiros que abrirem no Excel
 * BR vão ver os números corretamente (Excel detecta automaticamente).
 * O parser aceita ambos vírgula e ponto na importação.
 */
export function gerarCsv(): string {
  const linhas = [header().join(","), ...linhasExemplo().map((linha) => linha.map(csvEscape).join(","))];
  return linhas.join("\n");
}

/**
 * Gera o XLSX como ArrayBuffer (pra download).
 *
 * Uma única aba 'lotes' com header + 5 linhas-exemplo (uma por sistema).
 * Largura das colunas: ajustada pelo maior valor (cap 28 chars).
 */
export function gerarXlsx(): ArrayBuffer {
  const aoa: (string | number)[][] = [header(), ...linhasExemplo()];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Larguras de coluna automáticas (cap 28 chars)
  ws["!cols"] = CAMPOS.map((c) => ({
    wch: Math.min(28, Math.max(c.nome.length + 2, 12)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "lotes");
  // Output: ArrayBuffer pra criar Blob no client
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

/** Trigger de download no browser — CSV. */
export function baixarCsv(filename = "template_lotes.csv") {
  const csv = gerarCsv();
  // BOM UTF-8 pra acentos abrirem certo no Excel Windows
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  baixarBlob(blob, filename);
}

/** Trigger de download no browser — XLSX. */
export function baixarXlsx(filename = "template_lotes.xlsx") {
  const buf = gerarXlsx();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  baixarBlob(blob, filename);
}

function baixarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
