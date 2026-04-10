"use client";

import { fmtBRL } from "@/lib/utils/format";

interface ScenarioCardProps {
  type: "best" | "base" | "worst";
  label: string;
  value: number;
  subLabel: string;
  subValue?: string;
}

const config = {
  best: {
    accentColor: "#4A5D3A",
    accentStyle: { borderLeft: "2px solid #4A5D3A", borderRadius: "0 10px 10px 0" },
    valueColor: "#F5F1E8",
    subColor: "#6B8F5A",
    arrow: "\u2191",
  },
  base: {
    accentColor: "#B8763E",
    accentStyle: { borderTop: "2px solid #B8763E", borderRadius: "0 0 10px 10px" },
    valueColor: "#F5F1E8",
    subColor: "#6B6860",
    arrow: "",
  },
  worst: {
    accentColor: "#B54134",
    accentStyle: { borderLeft: "2px solid #B54134", borderRadius: "0 10px 10px 0" },
    valueColor: "#D4614A",
    subColor: "#D4614A",
    arrow: "\u2193",
  },
};

export function ScenarioCard({ type, label, value, subLabel, subValue }: ScenarioCardProps) {
  const c = config[type];

  return (
    <div
      style={{
        background: "#1A1814",
        border: "0.5px solid #2A2820",
        padding: "14px 18px",
        ...c.accentStyle,
      }}
    >
      <span
        className="block uppercase"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          color: "#6B6860",
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <span
        className="block"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 22,
          fontWeight: 500,
          color: c.valueColor,
          lineHeight: 1.2,
        }}
      >
        {fmtBRL(value)}
      </span>
      <span
        className="block mt-1"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: c.subColor,
        }}
      >
        {c.arrow && <span className="mr-1">{c.arrow}</span>}
        {subLabel}
        {subValue && ` \u00b7 ${subValue}`}
      </span>
    </div>
  );
}
