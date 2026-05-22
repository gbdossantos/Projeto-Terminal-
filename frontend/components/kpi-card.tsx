interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  badge?: string;
  badgeColor?: string;
  sub?: string;
}

export function KpiCard({ label, value, unit, badge, badgeColor, sub }: KpiCardProps) {
  return (
    <div className="rounded-[10px] px-3.5 py-3"
      style={{ background: "var(--paper-2)", border: "0.5px solid var(--rule)" }}>
      <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1.5"
        style={{ color: "var(--ink-3)" }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xl font-medium"
          style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {unit && <span className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>{unit}</span>}
      </div>
      {badge && (
        <span className="inline-block mt-1.5 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${badgeColor}18`, color: badgeColor }}>{badge}</span>
      )}
      {sub && (
        <p className="font-mono text-[10px] mt-1" style={{ color: "var(--ink-3)" }}>{sub}</p>
      )}
    </div>
  );
}
