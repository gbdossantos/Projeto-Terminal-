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
      style={{ background: "#1A1814", border: "0.5px solid #2A2820" }}>
      <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1.5"
        style={{ color: "#6B6860" }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xl font-medium"
          style={{ color: "#F5F1E8", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {unit && <span className="font-mono text-[11px]" style={{ color: "#6B6860" }}>{unit}</span>}
      </div>
      {badge && (
        <span className="inline-block mt-1.5 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${badgeColor}18`, color: badgeColor }}>{badge}</span>
      )}
      {sub && (
        <p className="font-mono text-[10px] mt-1" style={{ color: "#6B6860" }}>{sub}</p>
      )}
    </div>
  );
}
