export function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra transition-colors"
      />
    </div>
  );
}
