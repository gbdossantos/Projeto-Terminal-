"use client";

import type { SimulatorScenarioOutput } from "@/lib/types";

interface RecommendationCardProps {
  cenarioBase: SimulatorScenarioOutput | null;
  breakEvenQueda: number | null; // % negative
}

// TODO: gerar via AI Interpretation Layer (Claude API)
function gerarRecomendacao(
  margem_pct: number,
  break_even_queda: number
): { texto: string; acao: string; janela: string } {
  const margemDisplay = (margem_pct * 100).toFixed(1);
  const quedaDisplay = Math.abs(break_even_queda).toFixed(1);

  if (margem_pct > 0.20) {
    return {
      texto: `Margem confortavel de ${margemDisplay}%. Protecao opcional — lote sustenta queda de ate ${quedaDisplay}% sem prejuizo.`,
      acao: "Protecao opcional",
      janela: "Sem urgencia",
    };
  }

  if (margem_pct > 0.10) {
    return {
      texto: `Margem de ${margemDisplay}% sustenta queda de ate ${quedaDisplay}% na arroba. Avaliar travamento parcial em janelas favoraveis.`,
      acao: "Avaliar travamento",
      janela: "Proximas semanas",
    };
  }

  return {
    texto: `Margem de ${margemDisplay}% sob pressao. Avaliar travamento preventivo — queda de ${quedaDisplay}% ja compromete resultado.`,
    acao: "Travamento recomendado",
    janela: "Imediata",
  };
}

export function RecommendationCard({
  cenarioBase,
  breakEvenQueda,
}: RecommendationCardProps) {
  if (!cenarioBase) return null;

  const margem_pct = cenarioBase.margem_pct_sem_hedge;
  const queda = breakEvenQueda ?? -15;
  const rec = gerarRecomendacao(margem_pct, queda);

  return (
    <div
      style={{
        background: "rgba(74, 93, 58, 0.09)",
        border: "0.5px solid rgba(74, 93, 58, 0.27)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <span
        className="block uppercase"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          fontWeight: 500,
          color: "var(--green-2)",
          letterSpacing: "0.06em",
          marginBottom: 7,
        }}
      >
        Recomendacao
      </span>

      <p
        style={{
          fontFamily: "'Source Serif 4', serif",
          fontSize: 11,
          color: "var(--text-primary)",
          lineHeight: 1.6,
          fontStyle: "italic",
          marginBottom: 10,
        }}
      >
        {rec.texto}
      </p>

      <div
        style={{
          borderTop: "0.5px solid rgba(74, 93, 58, 0.2)",
          paddingTop: 9,
        }}
      >
        <div
          className="flex justify-between"
          style={{ marginBottom: 4 }}
        >
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
            }}
          >
            Acao
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "var(--green-2)",
            }}
          >
            {rec.acao}
          </span>
        </div>
        <div className="flex justify-between">
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
            }}
          >
            Janela
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "var(--amber)",
            }}
          >
            {rec.janela}
          </span>
        </div>
      </div>
    </div>
  );
}
