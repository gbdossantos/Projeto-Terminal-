import { MetricCard } from "./MetricCard";

interface CotacaoMercado {
  arroba_boi_gordo: number | null;
  dolar_ptax: number | null;
  milho_esalq: number | null;
  cdi_anual: number | null;
  timestamp: string | null;
}

interface Props {
  cotacoes: CotacaoMercado;
  breakEven?: number;
}

export function PainelMercado({ cotacoes, breakEven }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Arroba CEPEA/SP"
          value={cotacoes.arroba_boi_gordo?.toFixed(2) ?? "—"}
          unit="/@"
          delta={breakEven ? `BE: R$ ${breakEven.toFixed(0)}/@` : undefined}
          compact
        />
        <MetricCard
          label="Dolar PTAX"
          value={cotacoes.dolar_ptax?.toFixed(2) ?? "—"}
          compact
        />
        <MetricCard
          label="Milho ESALQ"
          value={cotacoes.milho_esalq?.toFixed(2) ?? "—"}
          unit="/sc"
          compact
        />
        <MetricCard
          label="CDI"
          value={cotacoes.cdi_anual ? `${(cotacoes.cdi_anual * 100).toFixed(2)}%` : "—"}
          unit="a.a."
          compact
        />
      </div>
      {cotacoes.timestamp && (
        <p
          className="text-[11px] mt-2 text-right"
          style={{ color: "#6B6860" }}
        >
          Atualizado: {new Date(cotacoes.timestamp).toLocaleString("pt-BR")} · CEPEA + BCB
        </p>
      )}
    </div>
  );
}
