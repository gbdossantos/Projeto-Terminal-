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
    value > 0 ? "#6B8F5A" : value < 0 ? "#D4614A" : "#F5F1E8";
  const displayValue = value > 0 ? `+${value}%` : `${value}%`;

  return (
    <div className="flex items-center gap-2" style={{ height: 22 }}>
      <span
        className="shrink-0 text-[9px]"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "#6B6860",
          minWidth: 90,
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
      />
      <span
        className="shrink-0 text-right"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color,
          minWidth: 38,
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}
