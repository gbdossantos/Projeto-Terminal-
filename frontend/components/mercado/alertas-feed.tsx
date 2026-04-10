"use client";

import type { CotacaoMercado, ContratoFuturo } from "@/lib/types";

interface Alerta {
  timestamp: string;
  categoria: string;
  texto: string;
  cor: string;
}

interface AlertasFeedProps {
  cotacoes: CotacaoMercado | null;
  contratos: ContratoFuturo[];
  spotPrice: number | null;
  histArroba: { valor: number }[];
  histMilho: { valor: number }[];
}

function generateAlertas({
  cotacoes,
  contratos,
  spotPrice,
  histArroba,
  histMilho,
}: AlertasFeedProps): Alerta[] {
  const alertas: Alerta[] = [];
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Futures spread alert
  if (spotPrice != null && contratos.length > 2) {
    const midContract = contratos[Math.min(2, contratos.length - 1)];
    const spread = midContract.preco_ajuste - spotPrice;
    if (spread < -8) {
      alertas.push({
        timestamp: ts,
        categoria: "Futuros",
        texto: `${midContract.codigo} em desconto de R$${Math.abs(spread).toFixed(0)}/@ vs spot — mercado precifica queda`,
        cor: "#B8763E",
      });
    } else if (spread < -3) {
      alertas.push({
        timestamp: ts,
        categoria: "Futuros",
        texto: `${midContract.codigo} com desconto moderado de R$${Math.abs(spread).toFixed(0)}/@ vs spot`,
        cor: "#B8763E",
      });
    } else {
      alertas.push({
        timestamp: ts,
        categoria: "Futuros",
        texto: `Curva BGI proxima do spot — sem distorcao significativa`,
        cor: "#B8763E",
      });
    }
  }

  // Arroba vs 30d average
  if (spotPrice != null && histArroba.length >= 10) {
    const recent = histArroba.slice(-30);
    const avg = recent.reduce((s, d) => s + d.valor, 0) / recent.length;
    const diff = spotPrice - avg;
    if (diff > 0) {
      alertas.push({
        timestamp: ts,
        categoria: "Arroba",
        texto: `CEPEA/SP acima da media 30d em R$${diff.toFixed(1)}/@ — momento favoravel para travamento`,
        cor: "#4A5D3A",
      });
    } else {
      alertas.push({
        timestamp: ts,
        categoria: "Arroba",
        texto: `CEPEA/SP abaixo da media 30d em R$${Math.abs(diff).toFixed(1)}/@ — mercado pressionado`,
        cor: "#4A5D3A",
      });
    }
  }

  // CDI carry cost
  if (cotacoes?.cdi_anual != null && spotPrice != null) {
    const cdiMensal = ((cotacoes.cdi_anual / 12) * 100).toFixed(2);
    const custo90d = (spotPrice * cotacoes.cdi_anual * (90 / 365)).toFixed(2);
    alertas.push({
      timestamp: ts,
      categoria: "CDI",
      texto: `Custo de carrego: R$${custo90d}/@ em 90 dias (CDI ${cdiMensal}% a.m.)`,
      cor: "#6B6860",
    });
  }

  // Milho weekly variation
  if (histMilho.length >= 5) {
    const last = histMilho[histMilho.length - 1].valor;
    const weekAgo = histMilho[Math.max(0, histMilho.length - 6)].valor;
    const varPct = ((last - weekAgo) / weekAgo) * 100;
    alertas.push({
      timestamp: ts,
      categoria: "Milho",
      texto: `Variacao semanal ${varPct >= 0 ? "+" : ""}${varPct.toFixed(1)}% — ${varPct >= 0 ? "pressao nos custos de dieta" : "alivio nos custos de dieta"}`,
      cor: "#C89B3C",
    });
  }

  // TODO: gerar alertas via AI Interpretation Layer (Claude API)

  return alertas.slice(0, 4);
}

export function AlertasFeed(props: AlertasFeedProps) {
  const alertas = generateAlertas(props);

  return (
    <div className="flex flex-col" style={{ gap: 9 }}>
      {alertas.map((a, i) => (
        <div
          key={i}
          style={{
            background: "#221F18",
            border: "0.5px solid #2A2820",
            borderLeft: `2px solid ${a.cor}`,
            borderRadius: "0 8px 8px 0",
            padding: "9px 11px",
          }}
        >
          <span
            className="block"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: "#6B6860",
              marginBottom: 3,
            }}
          >
            {a.timestamp} · {a.categoria}
          </span>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "#F5F1E8",
              lineHeight: 1.5,
            }}
          >
            {a.texto}
          </span>
        </div>
      ))}
    </div>
  );
}
