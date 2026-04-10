"use client";

interface BasisGridProps {
  spotPrice: number;
}

const BASES: { regiao: string; basis: number }[] = [
  { regiao: "SP", basis: 0 },
  { regiao: "MG", basis: -3 },
  { regiao: "MS", basis: -5 },
  { regiao: "GO", basis: -7 },
  { regiao: "MT", basis: -10 },
  { regiao: "TO", basis: -12 },
  { regiao: "PA", basis: -15 },
  { regiao: "RO", basis: -15 },
];
// TODO: carregar bases dinamicas via API

function getBasisStyle(basis: number, isDark: boolean): { bg: string; border: string; deltaColor: string } {
  // Dark mode uses deep tones, light mode uses tinted backgrounds
  if (basis === 0) return { bg: isDark ? "#4A5D3A2A" : "#4A5D3A18", border: isDark ? "#4A5D3A44" : "#4A5D3A33", deltaColor: "var(--green-2)" };
  if (basis >= -3) return { bg: isDark ? "#3D5128" : "#4A5D3A12", border: isDark ? "#4A5D3A22" : "#4A5D3A22", deltaColor: "var(--green-2)" };
  if (basis >= -5) return { bg: isDark ? "#2A3D1A" : "#8B7A3A10", border: isDark ? "#3A4D2A22" : "#8B7A3A18", deltaColor: "var(--amber)" };
  if (basis >= -7) return { bg: isDark ? "#2A2010" : "#C89B3C10", border: isDark ? "#3A3020" : "#C89B3C18", deltaColor: "var(--amber)" };
  if (basis >= -10) return { bg: isDark ? "#2A1A0C" : "#B5413410", border: isDark ? "#3A2A1A" : "#B5413418", deltaColor: "var(--red-2)" };
  if (basis >= -12) return { bg: isDark ? "#2A1208" : "#B541340C", border: isDark ? "#3A2215" : "#B5413414", deltaColor: "var(--red-2)" };
  return { bg: isDark ? "#2A0E06" : "#B5413408", border: isDark ? "#3A1E10" : "#B5413410", deltaColor: "var(--red-2)" };
}

export function BasisGrid({ spotPrice }: BasisGridProps) {
  // Detect dark mode via CSS variable — we check at render time
  // Since we're using CSS vars for text colors, the bg colors are the only ones
  // that need explicit dark/light handling due to the gradient approach.
  // We'll use a simple className-based approach.
  return (
    <div style={{ padding: "14px 22px 18px" }}>
      <div className="flex items-baseline gap-2" style={{ marginBottom: 10 }}>
        <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 12, color: "var(--text-primary)" }}>
          Basis por regiao
        </h3>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--text-tertiary)" }}>
          Desconto local vs indicador CEPEA/SP (R$/@)
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
        {BASES.map((b) => {
          const isSP = b.regiao === "SP";
          return (
            <BasisCell key={b.regiao} regiao={b.regiao} basis={b.basis} spotPrice={spotPrice} isSP={isSP} />
          );
        })}
      </div>
    </div>
  );
}

function BasisCell({ regiao, basis, spotPrice, isSP }: { regiao: string; basis: number; spotPrice: number; isSP: boolean }) {
  const precoEfetivo = spotPrice + basis;

  // Use both dark and light styles and let CSS handle it
  const darkStyle = getBasisStyle(basis, true);
  const lightStyle = getBasisStyle(basis, false);

  return (
    <>
      {/* Dark mode cell */}
      <div
        className="text-center hidden dark:block"
        style={{
          borderRadius: 8,
          padding: "10px 12px",
          background: darkStyle.bg,
          border: `0.5px solid ${darkStyle.border}`,
        }}
      >
        <CellContent regiao={regiao} precoEfetivo={precoEfetivo} basis={basis} isSP={isSP} deltaColor={darkStyle.deltaColor} />
      </div>
      {/* Light mode cell */}
      <div
        className="text-center block dark:hidden"
        style={{
          borderRadius: 8,
          padding: "10px 12px",
          background: lightStyle.bg,
          border: `0.5px solid ${lightStyle.border}`,
        }}
      >
        <CellContent regiao={regiao} precoEfetivo={precoEfetivo} basis={basis} isSP={isSP} deltaColor={lightStyle.deltaColor} />
      </div>
    </>
  );
}

function CellContent({ regiao, precoEfetivo, basis, isSP, deltaColor }: { regiao: string; precoEfetivo: number; basis: number; isSP: boolean; deltaColor: string }) {
  return (
    <>
      <span className="block uppercase" style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "var(--text-tertiary)", letterSpacing: "0.04em", marginBottom: 4 }}>
        {regiao}
      </span>
      <span className="block" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.2 }}>
        R${Math.round(precoEfetivo)}
      </span>
      <span className="block mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: deltaColor }}>
        {isSP ? "referencia" : `${basis}/@`}
      </span>
    </>
  );
}
