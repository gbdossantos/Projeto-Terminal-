type SemaforoStatus = "verde" | "amarelo" | "vermelho";

interface SemaforoProps {
  status: SemaforoStatus;
  titulo: string;
  detalhe: string;
}

const config: Record<SemaforoStatus, { dot: string; text: string; bg: string; border: string }> = {
  verde: { dot: "var(--gain)", text: "var(--gain-2)", bg: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.27)" },
  amarelo: { dot: "var(--amber)", text: "var(--amber)", bg: "rgba(217, 119, 6, 0.10)", border: "rgba(217, 119, 6, 0.27)" },
  vermelho: { dot: "var(--loss)", text: "var(--loss-2)", bg: "rgba(220, 38, 38, 0.10)", border: "rgba(220, 38, 38, 0.27)" },
};

export function Semaforo({ status, titulo, detalhe }: SemaforoProps) {
  const c = config[status];

  return (
    <div
      className="flex items-center gap-3.5 px-[18px] py-3.5 rounded-[10px]"
      style={{ background: c.bg, border: `0.5px solid ${c.border}` }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: c.dot }}
      />
      <div>
        <p className="text-[13px] font-medium" style={{ color: c.text }}>
          {titulo}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
          {detalhe}
        </p>
      </div>
    </div>
  );
}
