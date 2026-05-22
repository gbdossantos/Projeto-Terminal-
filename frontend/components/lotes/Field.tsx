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
      <label
        className="block text-[10px] font-medium uppercase tracking-[0.08em] mb-1.5"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-10 px-3 font-mono text-sm rounded-lg transition-colors focus:outline-none"
        style={{
          background: "var(--paper)",
          border: "0.5px solid var(--rule)",
          color: "var(--ink)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--grafite-2)";
          e.target.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.13)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--rule)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}
