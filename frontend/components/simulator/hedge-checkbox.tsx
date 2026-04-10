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
          border: `0.5px solid ${checked ? "var(--green)" : "var(--border-subtle)"}`,
          background: checked ? "var(--success-bg)" : "transparent",
          transition: "all 150ms",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4.5 7.5L8 3"
              stroke="var(--green-2)"
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
          color: checked ? "var(--text-primary)" : "var(--text-tertiary)",
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
