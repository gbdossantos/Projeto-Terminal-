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

function getBasisStyle(basis: number): { bg: string; border: string; deltaColor: string } {
  if (basis === 0) return { bg: "#4A5D3A2A", border: "#4A5D3A44", deltaColor: "#6B8F5A" };
  if (basis >= -3) return { bg: "#3D5128", border: "#4A5D3A22", deltaColor: "#6B8F5A" };
  if (basis >= -5) return { bg: "#2A3D1A", border: "#3A4D2A22", deltaColor: "#C89B3C" };
  if (basis >= -7) return { bg: "#2A2010", border: "#3A3020", deltaColor: "#C89B3C" };
  if (basis >= -10) return { bg: "#2A1A0C", border: "#3A2A1A", deltaColor: "#D4614A" };
  if (basis >= -12) return { bg: "#2A1208", border: "#3A2215", deltaColor: "#D4614A" };
  return { bg: "#2A0E06", border: "#3A1E10", deltaColor: "#D4614A" };
}

export function BasisGrid({ spotPrice }: BasisGridProps) {
  return (
    <div style={{ padding: "14px 22px 18px" }}>
      {/* Header */}
      <div className="flex items-baseline gap-2" style={{ marginBottom: 10 }}>
        <h3
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 12,
            color: "#F5F1E8",
          }}
        >
          Basis por regiao
        </h3>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#6B6860" }}>
          Desconto local vs indicador CEPEA/SP (R$/@)
        </span>
      </div>

      {/* Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 8,
        }}
      >
        {BASES.map((b) => {
          const style = getBasisStyle(b.basis);
          const precoEfetivo = spotPrice + b.basis;
          const isSP = b.regiao === "SP";

          return (
            <div
              key={b.regiao}
              className="text-center"
              style={{
                borderRadius: 8,
                padding: "10px 12px",
                background: style.bg,
                border: `0.5px solid ${style.border}`,
              }}
            >
              <span
                className="block uppercase"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 9,
                  color: "#6B6860",
                  letterSpacing: "0.04em",
                  marginBottom: 4,
                }}
              >
                {b.regiao}
              </span>
              <span
                className="block"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  color: "#F5F1E8",
                  lineHeight: 1.2,
                }}
              >
                R${Math.round(precoEfetivo)}
              </span>
              <span
                className="block mt-1"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: style.deltaColor,
                }}
              >
                {isSP ? "referencia" : `${b.basis}/@`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
