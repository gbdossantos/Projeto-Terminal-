"use client";

import { Slider } from "@/components/ui/slider";
import { fmtBRL } from "@/lib/utils/format";

/**
 * Progressive disclosure — "Criar minha situação" atrás de um clique (não em
 * destaque). Revela 2 shadcn Slider em VALOR ABSOLUTO ("arroba a R$240"):
 * APENAS arroba e milho (PORTÃO: sem dólar, sem Selic).
 *
 * Controlado pelo pai — o recálculo da margem (hero) é feito lá, via engine.
 */
export default function SituacaoCustom({
  aberto,
  onToggle,
  arroba,
  milho,
  onArrobaChange,
  onMilhoChange,
  arrobaMin,
  arrobaMax,
  milhoMin,
  milhoMax,
}: {
  aberto: boolean;
  onToggle: () => void;
  arroba: number;
  milho: number;
  onArrobaChange: (v: number) => void;
  onMilhoChange: (v: number) => void;
  arrobaMin: number;
  arrobaMax: number;
  milhoMin: number;
  milhoMax: number;
}) {
  return (
    <section style={{ borderTop: "0.5px solid var(--rule)", paddingTop: 16 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: "var(--ink-2)",
        }}
      >
        {aberto ? "↑ Fechar situação custom" : "↓ Criar minha situação"}
      </button>

      {aberto && (
        <div style={{ marginTop: 18, maxWidth: 520 }}>
          <SliderAbsoluto
            label="Arroba"
            valor={arroba}
            min={arrobaMin}
            max={arrobaMax}
            step={1}
            sufixo="/@"
            onChange={onArrobaChange}
          />
          <div style={{ height: 22 }} />
          <SliderAbsoluto
            label="Milho"
            valor={milho}
            min={milhoMin}
            max={milhoMax}
            step={1}
            sufixo="/sc"
            onChange={onMilhoChange}
          />
        </div>
      )}
    </section>
  );
}

function SliderAbsoluto({
  label,
  valor,
  min,
  max,
  step,
  sufixo,
  onChange,
}: {
  label: string;
  valor: number;
  min: number;
  max: number;
  step: number;
  sufixo: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          {label}
        </span>
        <span
          className="mono-num"
          style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)" }}
        >
          {fmtBRL(valor, 0)}
          {sufixo}
        </span>
      </div>
      <Slider
        value={valor}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)" }}>
          {fmtBRL(min, 0)}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)" }}>
          {fmtBRL(max, 0)}
        </span>
      </div>
    </div>
  );
}
