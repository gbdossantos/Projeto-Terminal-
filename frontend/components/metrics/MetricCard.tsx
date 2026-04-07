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
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-t-secondary",
  };
  const deltaArrow = {
    positive: "\u25B2",
    negative: "\u25BC",
    neutral: "",
  };

  return (
    <div className={`border border-border rounded-lg bg-card ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
      <p className="text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono font-medium font-mono-nums ${compact ? "text-lg" : "text-2xl"} text-t-primary`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-t-tertiary">{unit}</span>
        )}
      </div>
      {delta && (
        <p className={`text-xs mt-1 ${deltaColors[deltaType]}`}>
          {deltaArrow[deltaType]} {delta}
        </p>
      )}
    </div>
  );
}
