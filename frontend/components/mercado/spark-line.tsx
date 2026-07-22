"use client";

interface SparkLineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  /**
   * true → o SVG estica na largura do container (viewBox vira sistema de
   * coordenadas; vector-effect mantém o traço fino mesmo esticado).
   * Usado pelos cards de cotação da Home.
   */
  stretch?: boolean;
}

export function SparkLine({
  data,
  color,
  width = 48,
  height = 14,
  strokeWidth = 1.5,
  stretch = false,
}: SparkLineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const flat = max === min; // série constante (ex: CDI estável) → linha no meio
  const range = max - min || 1;

  // Padding vertical interno pra linha não encostar na borda do viewBox
  const pad = strokeWidth;
  const innerH = height - pad * 2;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = flat ? height / 2 : pad + (innerH - ((v - min) / range) * innerH);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={stretch ? undefined : width}
      height={stretch ? undefined : height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      style={stretch ? { display: "block", width: "100%", height } : { display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
