interface Props {
  texto: string;
  tipo: "alerta" | "ok";
}

const styles = {
  alerta: { bg: "rgba(217, 119, 6, 0.10)", border: "rgba(217, 119, 6, 0.20)", text: "var(--amber)" },
  ok: { bg: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.20)", text: "var(--gain-2)" },
};

export function PerguntaInvertida({ texto, tipo }: Props) {
  const s = styles[tipo];

  return (
    <div
      className="px-4 py-3 rounded-lg text-[13px] font-medium leading-relaxed"
      style={{ background: s.bg, border: `0.5px solid ${s.border}`, color: s.text }}
    >
      {texto}
    </div>
  );
}
