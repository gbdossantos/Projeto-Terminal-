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
        style={{ color: "#6B6860" }}
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
          background: "#0F0E0B",
          border: "0.5px solid #2A2820",
          color: "#F5F1E8",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#B8763E";
          e.target.style.boxShadow = "0 0 0 2px #B8763E22";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#2A2820";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}
