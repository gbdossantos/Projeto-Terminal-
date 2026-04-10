"use client";

import { SparkLine } from "./spark-line";

interface CotacaoCardProps {
  label: string;
  value: string;
  suffix?: string;
  sparkData?: number[];
  sparkColor?: string;
  subLine?: string;
  large?: boolean;
  isLast?: boolean;
}

export function CotacaoCard({
  label,
  value,
  suffix,
  sparkData,
  sparkColor = "#6B8F5A",
  subLine,
  large = false,
  isLast = false,
}: CotacaoCardProps) {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderRight: isLast ? "none" : "0.5px solid #2A2820",
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

      <div className="flex items-end gap-2">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: large ? 26 : 20,
            fontWeight: 500,
            color: "#F5F1E8",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "#6B6860",
              marginBottom: 1,
            }}
          >
            {suffix}
          </span>
        )}
        {sparkData && sparkData.length > 1 && (
          <div style={{ marginBottom: 2, marginLeft: 4 }}>
            <SparkLine data={sparkData} color={sparkColor} />
          </div>
        )}
      </div>

      {subLine && (
        <span
          className="block mt-1"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "#6B6860",
          }}
        >
          {subLine}
        </span>
      )}
    </div>
  );
}
