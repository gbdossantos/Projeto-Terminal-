/**
 * Lista canônica de municípios brasileiros por UF.
 *
 * Fonte: IBGE — servicodados.ibge.gov.br/api/v1/localidades/municipios
 * Snapshot bundleado em municipios-br.json (~82 KB · 5.571 municípios).
 *
 * Substitui o input livre de cidade em /configuracoes pra evitar typos que
 * quebram lookup de clima (Open-Meteo geocoding é case/accent sensitive).
 */

import municipiosData from "./municipios-br.json";

const MUNICIPIOS: Record<string, string[]> = municipiosData;

export function listarMunicipios(uf: string): string[] {
  return MUNICIPIOS[uf.toUpperCase()] ?? [];
}

/** True se a cidade existe exatamente como string na lista do UF (case-sensitive, com acento). */
export function municipioValido(municipio: string, uf: string): boolean {
  return listarMunicipios(uf).includes(municipio);
}

/** Remove acentos + lowercase pra busca aproximada. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca incremental: retorna até `limit` municípios de `uf` cuja forma
 * normalizada começa ou contém `query` (prefixo prioritário).
 */
export function buscarMunicipios(uf: string, query: string, limit = 50): string[] {
  const lista = listarMunicipios(uf);
  const q = normalizar(query);
  if (!q) return lista.slice(0, limit);
  const prefixo: string[] = [];
  const contem: string[] = [];
  for (const m of lista) {
    const n = normalizar(m);
    if (n.startsWith(q)) prefixo.push(m);
    else if (n.includes(q)) contem.push(m);
    if (prefixo.length >= limit) break;
  }
  return [...prefixo, ...contem].slice(0, limit);
}
