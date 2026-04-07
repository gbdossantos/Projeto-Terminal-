import { fmtBRL, fmtPct } from "@/lib/utils/format";

interface ScenarioResult {
  label: string;
  variacao_pct: number;
  preco_arroba: number;
  margem_brl: number;
  margem_pct: number;
  roi_anualizado: number;
  semaforo: "verde" | "amarelo" | "vermelho";
}

interface Props {
  cenarios: ScenarioResult[];
}

const badgeClass: Record<string, string> = {
  verde: "bg-success-bg text-success",
  amarelo: "bg-warning-bg text-warning",
  vermelho: "bg-danger-bg text-danger",
};

export function TabelaCenarios({ cenarios }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium w-8" />
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium">
              Cenario
            </th>
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">
              Arroba
            </th>
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">
              Margem
            </th>
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">
              Margem %
            </th>
            <th className="py-3 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">
              ROI anual
            </th>
          </tr>
        </thead>
        <tbody>
          {cenarios.map((c, i) => {
            const isBase = c.variacao_pct === 0;
            return (
              <tr key={i} className="border-b border-border">
                <td className="py-3 px-3">
                  <div className={`w-2 h-2 rounded-full ${
                    c.semaforo === "verde" ? "bg-success" :
                    c.semaforo === "amarelo" ? "bg-warning" : "bg-danger"
                  }`} />
                </td>
                <td className={`py-3 px-3 ${isBase ? "font-medium text-t-primary" : "text-t-secondary"}`}>
                  {c.label}
                </td>
                <td className="py-3 px-3 text-right font-mono font-mono-nums text-t-secondary">
                  {fmtBRL(c.preco_arroba)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-mono-nums text-t-secondary">
                  {fmtBRL(c.margem_brl)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium font-mono ${badgeClass[c.semaforo]}`}>
                    {fmtPct(c.margem_pct)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-mono-nums text-t-secondary">
                  {fmtPct(c.roi_anualizado)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
