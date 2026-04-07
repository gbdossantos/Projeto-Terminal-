type SemaforoStatus = "verde" | "amarelo" | "vermelho";

interface SemaforoProps {
  status: SemaforoStatus;
  titulo: string;
  detalhe: string;
}

const config: Record<SemaforoStatus, { color: string; bg: string; border: string }> = {
  verde: {
    color: "bg-success",
    bg: "bg-success-bg",
    border: "border-l-success",
  },
  amarelo: {
    color: "bg-warning",
    bg: "bg-warning-bg",
    border: "border-l-warning",
  },
  vermelho: {
    color: "bg-danger",
    bg: "bg-danger-bg",
    border: "border-l-danger",
  },
};

export function Semaforo({ status, titulo, detalhe }: SemaforoProps) {
  const c = config[status];

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-lg border-l-4 ${c.bg} ${c.border}`}>
      <div className={`w-3 h-3 rounded-full ${c.color} shrink-0`} />
      <div>
        <p className="text-sm font-medium text-t-primary">{titulo}</p>
        <p className="text-sm text-t-secondary mt-0.5">{detalhe}</p>
      </div>
    </div>
  );
}
