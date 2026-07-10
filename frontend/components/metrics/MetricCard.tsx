interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  compact?: boolean;
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaType = "neutral",
  compact = false,
}: MetricCardProps) {
  const deltaColors = {
    positive: "var(--gain-2)",
    negative: "var(--loss-2)",
    neutral: "var(--ink-3)",
  };
  const deltaBg = {
    positive: "var(--gain-bg)",
    negative: "var(--loss-bg)",
    neutral: "transparent",
  };

  return (
    <div
      className={`rounded-xl ${compact ? "px-5 py-4" : "px-5 py-[18px]"}`}
      style={{
        background: "var(--paper-2)",
        border: "0.5px solid var(--rule)",
      }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.08em] mb-2"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono font-medium ${compact ? "text-lg" : "text-[22px]"}`}
          style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[13px]" style={{ color: "var(--ink-3)" }}>
            {unit}
          </span>
        )}
      </div>
      {delta && (
        <span
          className="inline-block mt-1.5 font-mono text-[11px] font-medium px-2 py-0.5 rounded"
          style={{
            color: deltaColors[deltaType],
            background: deltaBg[deltaType],
          }}
        >
          {deltaType === "positive" ? "\u25B2 " : deltaType === "negative" ? "\u25BC " : ""}
          {delta}
        </span>
      )}
    </div>
  );
}
