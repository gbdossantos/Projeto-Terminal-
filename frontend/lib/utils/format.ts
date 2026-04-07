/** Format as BRL currency */
export function fmtBRL(value: number, decimals = 0): string {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format as percentage */
export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format as arroba price */
export function fmtArroba(value: number, decimals = 2): string {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}/@`;
}
