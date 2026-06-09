"use client";

import { Separator } from "@/components/ui/separator";
import PresetCard from "./PresetCard";
import type { HistoricoPreset } from "@/lib/types";

/**
 * SECUNDÁRIO — grade de 6 presets em 2 seções visualmente separadas:
 *   - "Comparações temporais" (até 4): mesmo mês de anos anteriores
 *   - "Eventos marcantes" (até 2): secas/El Niño, choques de mercado (curados)
 * Clicar num card seleciona → atualiza hero + retrato. Card ativo destacado.
 */
export default function GradePresets({
  temporais,
  eventos,
  selecionadoId,
  onSelect,
}: {
  temporais: HistoricoPreset[];
  eventos: HistoricoPreset[];
  selecionadoId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section style={{ borderTop: "0.5px solid var(--rule)", paddingTop: 22 }}>
      <SecaoLabel>Comparações temporais</SecaoLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {temporais.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            ativo={p.id === selecionadoId}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>

      <Separator style={{ marginBottom: 24 }} />

      <SecaoLabel>Eventos marcantes</SecaoLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {eventos.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            ativo={p.id === selecionadoId}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SecaoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.08em",
        color: "var(--ink-3)",
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}
