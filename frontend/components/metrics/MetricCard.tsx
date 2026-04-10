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
    positive: "#6B8F5A",
    negative: "#D4614A",
    neutral: "#6B6860",
  };
  const deltaBg = {
    positive: "#4A5D3A18",
    negative: "#B5413418",
    neutral: "transparent",
  };

  return (
    <div
      className={`rounded-xl ${compact ? "px-5 py-4" : "px-5 py-[18px]"}`}
      style={{
        background: "#1A1814",
        border: "0.5px solid #2A2820",
      }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.08em] mb-2"
        style={{ color: "#6B6860" }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono font-medium ${compact ? "text-lg" : "text-[22px]"}`}
          style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[13px]" style={{ color: "#6B6860" }}>
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
