"use client";

interface HedgeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function HedgeCheckbox({ checked, onChange, label }: HedgeCheckboxProps) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `0.5px solid ${checked ? "#4A5D3A44" : "#2A2820"}`,
          background: checked ? "#4A5D3A18" : "transparent",
          transition: "all 150ms",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4.5 7.5L8 3"
              stroke="#6B8F5A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: checked ? "#F5F1E8" : "#6B6860",
          transition: "color 150ms",
        }}
      >
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        className="sr-only"
      />
    </label>
  );
}
