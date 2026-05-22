"use client";

import { useEffect, useState } from "react";
import type { MargemTier } from "@/lib/margin-classification";

interface ScoreRingProps {
  /** Score numerico 0-100 ou null para estado pre-calculo. */
  score: number | null;
  /** Tier vindo de classifyMargin(). null = pre-calculo (sem cor). */
  tier: MargemTier | null;
  size: "sm" | "md" | "lg";
  showDetails?: boolean;
  details?: { margem: string; exposicao: string; vencBGI: string };
}

const dims = { sm: 40, md: 88, lg: 88 };
const radii = { sm: 15, md: 34, lg: 34 };
const strokes = { sm: 4, md: 7, lg: 7 };

const NEUTRAL_COLOR = "var(--ink-3)";
const NEUTRAL_LABEL = { text: "aguardando calculo", bg: "var(--rule)18", color: "var(--ink-3)" };

function getColorByTier(tier: MargemTier): string {
  if (tier === "verde") return "var(--gain)";
  if (tier === "amber") return "var(--amber)";
  return "var(--loss)";
}

function getLabelByTier(tier: MargemTier) {
  if (tier === "verde") return { text: "margem saudavel", bg: "rgba(22, 163, 74, 0.10)", color: "var(--gain-2)" };
  if (tier === "amber") return { text: "margem apertada", bg: "rgba(217, 119, 6, 0.10)", color: "var(--amber)" };
  return { text: "margem critica", bg: "rgba(220, 38, 38, 0.10)", color: "var(--loss-2)" };
}

export function ScoreRing({ score, tier, size, showDetails, details }: ScoreRingProps) {
  const isAwaiting = tier === null || score === null;
  const safeScore = score ?? 0;
  const [animatedScore, setAnimatedScore] = useState(0);
  const s = dims[size];
  const r = radii[size];
  const sw = strokes[size];
  const circ = 2 * Math.PI * r;
  const progress = isAwaiting ? 0 : (animatedScore / 100) * circ;
  const color = isAwaiting ? NEUTRAL_COLOR : getColorByTier(tier);
  const label = isAwaiting ? NEUTRAL_LABEL : getLabelByTier(tier);
  const isSmall = size === "sm";

  useEffect(() => {
    if (isAwaiting) { setAnimatedScore(0); return; }
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setAnimatedScore(safeScore); return; }
    let start: number | null = null;
    const duration = 600;
    function animate(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setAnimatedScore(Math.round(eased * safeScore));
      if (pct < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [safeScore, isAwaiting]);

  return (
    <div className={`flex ${isSmall ? "items-center gap-2" : "items-start gap-3.5"}`}>
      <div className="relative shrink-0" style={{ width: s, height: s }}>
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={sw} />
          <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${progress} ${circ - progress}`}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-medium ${isSmall ? "text-[11px]" : "text-xl"}`}
            style={{ color: isAwaiting ? "var(--ink-3)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {isAwaiting ? "—" : animatedScore}
          </span>
          {!isSmall && !isAwaiting && <span className="font-mono text-[9px]" style={{ color: "var(--ink-3)" }}>/100</span>}
        </div>
      </div>

      {!isSmall && (
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="inline-block text-[9px] font-medium px-2 py-0.5 rounded self-start"
            style={{ background: label.bg, color: label.color }}>
            {label.text}
          </span>
          {showDetails && details && !isAwaiting && (
            <div className="space-y-1 mt-1">
              {[
                { l: "Margem", v: details.margem, c: "var(--gain-2)" },
                { l: "Exposicao", v: details.exposicao, c: "var(--ink)" },
                { l: "Venc. BGI", v: details.vencBGI, c: "var(--amber)" },
              ].map((d) => (
                <div key={d.l} className="flex justify-between gap-4 text-[10px]">
                  <span style={{ color: "var(--ink-3)" }}>{d.l}</span>
                  <span className="font-mono" style={{ color: d.c, fontVariantNumeric: "tabular-nums" }}>{d.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
