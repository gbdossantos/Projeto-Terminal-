type SemaforoStatus = "verde" | "amarelo" | "vermelho";

interface SemaforoProps {
  status: SemaforoStatus;
  titulo: string;
  detalhe: string;
}

const config: Record<SemaforoStatus, { dot: string; text: string; bg: string; border: string }> = {
  verde: { dot: "#4A5D3A", text: "#6B8F5A", bg: "#4A5D3A18", border: "#4A5D3A44" },
  amarelo: { dot: "#C89B3C", text: "#C89B3C", bg: "#C89B3C18", border: "#C89B3C44" },
  vermelho: { dot: "#B54134", text: "#D4614A", bg: "#B5413418", border: "#B5413444" },
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
        <p className="text-xs mt-0.5" style={{ color: "#6B6860" }}>
          {detalhe}
        </p>
      </div>
    </div>
  );
}
