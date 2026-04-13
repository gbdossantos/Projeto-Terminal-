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
    accentStyle: {
      borderLeft: "2px solid var(--green)",
      borderRadius: "0 10px 10px 0",
    },
    valueColor: "var(--text-primary)",
    subColor: "var(--green-2)",
    arrow: "\u25B2",
  },
  base: {
    accentStyle: {
      borderTop: "2px solid var(--brand)",
      borderRadius: "0 0 10px 10px",
    },
    valueColor: "var(--text-primary)",
    subColor: "var(--text-tertiary)",
    arrow: "",
  },
  worst: {
    accentStyle: {
      borderLeft: "2px solid var(--red)",
      borderRadius: "0 10px 10px 0",
    },
    valueColor: "var(--red-2)",
    subColor: "var(--red-2)",
    arrow: "\u25BC",
  },
};

export function ScenarioCard({
  type,
  label,
  value,
  subLabel,
  subValue,
}: ScenarioCardProps) {
  const c = config[type];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        padding: "11px 14px",
        ...c.accentStyle,
      }}
    >
      <span
        className="block uppercase"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          color: "var(--text-tertiary)",
          letterSpacing: "0.04em",
          marginBottom: 5,
        }}
      >
        {label}
      </span>
      <span
        className="block"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 18,
          fontWeight: 500,
          color: c.valueColor,
          lineHeight: 1.2,
        }}
      >
        {fmtBRL(value)}
      </span>
      <span
        className="block"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          color: c.subColor,
          marginTop: 3,
        }}
      >
        {c.arrow && <span className="mr-1">{c.arrow}</span>}
        {subLabel}
        {subValue && ` \u00b7 ${subValue}`}
      </span>
    </div>
  );
}
