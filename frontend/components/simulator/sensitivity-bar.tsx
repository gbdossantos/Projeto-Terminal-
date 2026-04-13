"use client";

interface SensitivityBarProps {
  label: string;
  impactPct: number; // 0–100 normalized
  impactLabel: string;
  color: string;
}

export function SensitivityBar({
  label,
  impactPct,
  impactLabel,
  color,
}: SensitivityBarProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 3 }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color,
          }}
        >
          {impactLabel}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 5,
          background: "var(--surface-2)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            width: `${Math.min(impactPct, 100)}%`,
            height: 5,
            background: color,
            borderRadius: 2,
            opacity: 0.7,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}
