import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  texto: string;
  tipo: "alerta" | "ok";
}

export function PerguntaInvertida({ texto, tipo }: Props) {
  const isAlerta = tipo === "alerta";

  return (
    <div
      className={`flex items-start gap-3 px-5 py-4 rounded-lg border text-sm font-medium leading-relaxed ${
        isAlerta
          ? "bg-warning-bg border-warning/30 text-warning"
          : "bg-success-bg border-success/30 text-success"
      }`}
    >
      {isAlerta ? (
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      ) : (
        <CheckCircle size={18} className="shrink-0 mt-0.5" />
      )}
      <span>{texto}</span>
    </div>
  );
}
