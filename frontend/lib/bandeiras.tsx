/**
 * Bandeiras do Brasil — SVGs oficiais.
 *
 * Arquivos baixados do Wikimedia Commons (domínio público / Creative Commons).
 * Localização: public/flags/<codigo>.svg (br, ac, al, am, ap, ba, ce, df, es,
 *  go, ma, mg, ms, mt, pa, pb, pe, pi, pr, rj, rn, ro, rr, rs, sc, se, sp, to).
 *
 * Carregadas via <img> — cacheáveis pelo browser, parsing nativo do SVG.
 * Fallback: placa amarela com sigla para qualquer código que não tenha SVG.
 */

interface BandeiraProps {
  code: string;          // UF ou "BR"
  /** Altura em px. Largura derivada da proporção 3:2 (típica das bandeiras). */
  size?: number;
  className?: string;
  title?: string;
}

const CODIGOS_VALIDOS = new Set([
  "BR", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ",
  "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]);

export function Bandeira({ code, size = 16, className, title }: BandeiraProps) {
  const C = code.toUpperCase();
  const w = (size * 3) / 2;
  const wrapper: React.CSSProperties = {
    display: "inline-block",
    width: w,
    height: size,
    lineHeight: 0,
    borderRadius: 2,
    overflow: "hidden",
    boxShadow: "0 0 0 0.5px rgba(10,10,10,0.20)",
    verticalAlign: "middle",
  };

  if (!CODIGOS_VALIDOS.has(C)) {
    return (
      <span title={title ?? C} style={wrapper} className={className}>
        <FallbackPlaca uf={C} />
      </span>
    );
  }

  return (
    <span title={title ?? C} style={wrapper} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/flags/${C.toLowerCase()}.svg`}
        alt={title ?? C}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </span>
  );
}

// ─── Fallback (códigos desconhecidos) ────────────────────────────
function FallbackPlaca({ uf }: { uf: string }) {
  return (
    <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="30" height="20" fill="#FFCC00" />
      <text
        x="15"
        y="14.5"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontWeight="700"
        fontSize="10"
        fill="#0A0A0A"
      >
        {uf || "—"}
      </text>
    </svg>
  );
}
