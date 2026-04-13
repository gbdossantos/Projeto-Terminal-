"use client";

interface ScenarioSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function ScenarioSlider({
  label,
  value,
  onChange,
  min = -30,
  max = 30,
  step = 1,
}: ScenarioSliderProps) {
  const color =
    value > 0
      ? "var(--green-2)"
      : value < 0
        ? "var(--red-2)"
        : "var(--text-tertiary)";
  const displayValue = value > 0 ? `+${value}%` : `${value}%`;

  return (
    <div className="flex items-center" style={{ gap: 7, height: 20 }}>
      <span
        className="shrink-0"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          color: "var(--text-tertiary)",
          minWidth: 74,
        }}
      >
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="scenario-slider flex-1"
        style={{ height: 3 }}
      />
      <span
        className="shrink-0 text-right"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color,
          minWidth: 34,
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}
