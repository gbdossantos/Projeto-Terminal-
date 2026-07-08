/**
 * Parser de CSV/XLSX para import de lotes.
 *
 * Entrega: array de linhas brutas {nome_coluna → valor_string}, sem
 * conversão de tipo nem validação (isso fica em validate.ts).
 *
 * Aceita:
 *  - CSV (vírgula ou ponto-vírgula como separador)
 *  - XLSX (.xlsx, .xls)
 *  - BOM UTF-8
 *  - Headers em qualquer ordem
 *  - Headers com case diferente / espaços (normaliza pra snake_case)
 */

import * as XLSX from "xlsx";

export interface LinhaBruta {
  /** Índice na planilha original (1-based, sem header). Pra mensagem de erro. */
  linha: number;
  /** Map coluna → valor cru (string ou number do XLSX). */
  celulas: Record<string, string>;
}

/** Header que não bateu exato contra o schema — candidato a sugestão fuzzy (LLM). */
export interface HeaderDesconhecido {
  /** Header original como veio no arquivo (pra exibir e mandar pro LLM). */
  original: string;
  /** Header normalizado — chave correspondente em LinhaBruta.celulas. */
  normalizado: string;
}

export interface ParseResult {
  /** Linhas com dados (header excluído, linhas totalmente vazias filtradas). */
  linhas: LinhaBruta[];
  /** Headers encontrados no arquivo, ordem original. */
  headers: string[];
  /** Headers desconhecidos (não bate com nenhum campo do schema) — aviso + candidato a sugestão. */
  headersDesconhecidos: HeaderDesconhecido[];
}

/** Normaliza header pra snake_case sem acentos. */
function normalizarHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Detecta separador do CSV: ; é mais comum no Excel BR; , é o universal. */
function detectarSeparador(texto: string): "," | ";" {
  // Olha primeira linha não vazia
  const primeira = texto.split(/\r?\n/).find((l) => l.trim());
  if (!primeira) return ",";
  const virgulas = (primeira.match(/,/g) ?? []).length;
  const pontoVirgulas = (primeira.match(/;/g) ?? []).length;
  return pontoVirgulas > virgulas ? ";" : ",";
}

/** Parser CSV simples — respeita aspas e escape "" dentro. */
function parseCsv(texto: string): string[][] {
  const sep = detectarSeparador(texto);
  const linhas: string[][] = [];
  // Remove BOM
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);

  let i = 0;
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;
  const N = texto.length;

  while (i < N) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        dentroAspas = false;
        i++;
        continue;
      }
      campo += c;
      i++;
      continue;
    }
    if (c === '"') {
      dentroAspas = true;
      i++;
      continue;
    }
    if (c === sep) {
      linha.push(campo);
      campo = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      linha.push(campo);
      // Filtra linhas totalmente vazias
      if (linha.some((cel) => cel.trim() !== "")) linhas.push(linha);
      linha = [];
      campo = "";
      // \r\n: pula o \n
      if (c === "\r" && texto[i + 1] === "\n") i++;
      i++;
      continue;
    }
    campo += c;
    i++;
  }
  // Última linha sem newline
  linha.push(campo);
  if (linha.some((cel) => cel.trim() !== "")) linhas.push(linha);
  return linhas;
}

/** Lê CSV → matrix de strings. */
async function lerCsv(file: File): Promise<string[][]> {
  const texto = await file.text();
  return parseCsv(texto);
}

/** Lê XLSX → matrix de strings (números convertidos via String()). */
async function lerXlsx(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  // Primeira aba (não exigimos nome 'lotes' — tolerância)
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  // header: 1 → array of arrays; defval: "" → preenche vazios
  // raw: false → datas e números vêm formatados; queremos cru pra parser
  // Mas raw:true devolve Date para datas — não temos datas no schema, então OK.
  const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: true });
  // Garante todas células como string
  return aoa
    .filter((linha) => linha.some((c) => String(c).trim() !== ""))
    .map((linha) => linha.map((c) => (c === null || c === undefined ? "" : String(c))));
}

/**
 * Parser principal. Detecta CSV/XLSX pela extensão.
 * Lança Error em caso de leitura falhar — chamador trata.
 */
export async function parseArquivo(file: File): Promise<ParseResult> {
  const nome = file.name.toLowerCase();
  let matrix: string[][];
  if (nome.endsWith(".csv")) {
    matrix = await lerCsv(file);
  } else if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
    matrix = await lerXlsx(file);
  } else {
    throw new Error("Formato não suportado. Use .csv ou .xlsx");
  }

  if (matrix.length === 0) {
    return { linhas: [], headers: [], headersDesconhecidos: [] };
  }

  // Primeira linha = header
  const headersOriginais = matrix[0].map((h) => String(h).trim());
  const headersNorm = headersOriginais.map(normalizarHeader);

  // Importa o schema só pra detectar headers desconhecidos
  const { CAMPOS } = await import("./schema");
  const nomesConhecidos = new Set(CAMPOS.map((c) => c.nome));
  const headersDesconhecidos: HeaderDesconhecido[] = headersOriginais
    .map((original, idx) => ({ original, normalizado: headersNorm[idx] }))
    .filter((h) => h.normalizado && !nomesConhecidos.has(h.normalizado));

  // Converte dados em LinhaBruta
  const linhas: LinhaBruta[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const celulas: Record<string, string> = {};
    headersNorm.forEach((h, idx) => {
      if (!h) return;
      celulas[h] = String(matrix[i][idx] ?? "").trim();
    });
    linhas.push({ linha: i + 1, celulas }); // +1 porque linha 1 é header
  }

  return {
    linhas,
    headers: headersOriginais,
    headersDesconhecidos,
  };
}
