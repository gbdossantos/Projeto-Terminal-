"use client";

import dynamic from "next/dynamic";

// Pagina fortemente interativa (Recharts, slider, cursor, state pesado).
// Pular SSR/SSG: renderiza so no client.
// Evita erros de prerender com objetos undefined em primeira passagem.
const SimuladorClient = dynamic(() => import("./SimuladorClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "40px 32px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-3)",
      }}
    >
      Carregando simulador...
    </div>
  ),
});

export default function SimuladorPage() {
  return <SimuladorClient />;
}
