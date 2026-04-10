interface Props {
  texto: string;
  tipo: "alerta" | "ok";
}

const styles = {
  alerta: { bg: "#C89B3C18", border: "#C89B3C33", text: "#C89B3C" },
  ok: { bg: "#4A5D3A18", border: "#4A5D3A33", text: "#6B8F5A" },
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
