import Link from "next/link";
import Image from "next/image";

// TODO: conectar GET /api/cotacoes
const MOCK_ARROBA = 312.4;
const MOCK_ARROBA_DELTA = "+1.2%";
const MOCK_MARGEM = "+18.4%";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0F0E0B" }}>
      {/* ── Navbar ── */}
      <nav
        className="flex items-center justify-between px-12 h-14"
        style={{ borderBottom: "0.5px solid #2A2820" }}
      >
        <Link href="/" className="text-[15px] font-medium" style={{ color: "#F5F1E8" }}>
          Terminal
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/lotes" className="text-[13px] transition-colors hover:text-[#F5F1E8]" style={{ color: "#6B6860" }}>
            Lotes
          </Link>
          <Link href="/mercado" className="text-[13px] transition-colors hover:text-[#F5F1E8]" style={{ color: "#6B6860" }}>
            Mercado
          </Link>
          <Link href="/simulador" className="text-[13px] transition-colors hover:text-[#F5F1E8]" style={{ color: "#6B6860" }}>
            Simulador
          </Link>
        </div>

        <Link
          href="/lotes"
          className="text-[13px] px-3.5 py-1.5 rounded-md transition-colors hover:bg-[#B8763E15]"
          style={{ border: "0.5px solid #B8763E", color: "#B8763E" }}
        >
          Entrar &rarr;
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
        {/* Hero Left */}
        <div
          className="flex flex-col justify-center px-12 py-16 md:py-0"
          style={{
            animation: "fadeInUp 0.6s ease-out both",
          }}
        >
          <p
            className="text-[10px] tracking-[0.12em] mb-4"
            style={{ color: "#B8763E", fontFamily: "var(--font-inter)" }}
          >
            GESTAO DE RISCO PECUARIO
          </p>

          <h1
            className="font-display text-4xl leading-[1.2] max-w-[420px] mb-5"
            style={{ color: "#F5F1E8", fontWeight: 400 }}
          >
            Clareza economica antes de qualquer decisao
          </h1>

          <p
            className="text-sm leading-[1.7] max-w-[380px] mb-8"
            style={{ color: "#6B6860" }}
          >
            Saiba exatamente qual risco voce aceita ao nao proteger seu lote.
            Margem, break-even e cenarios de queda em tempo real.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/lotes"
              className="text-[13px] font-medium px-5 py-2.5 rounded-[7px] transition-all hover:brightness-110"
              style={{ background: "#B8763E", color: "#FAF0E0" }}
            >
              Acessar plataforma
            </Link>
            <Link
              href="/mercado"
              className="text-[13px] px-5 py-2.5 rounded-[7px] transition-colors hover:text-[#F5F1E8]"
              style={{ border: "0.5px solid #2A2820", color: "#6B6860" }}
            >
              Ver demonstracao
            </Link>
          </div>
        </div>

        {/* Hero Right */}
        <div className="relative overflow-hidden" style={{ background: "#1A1814", minHeight: 400 }}>
          {/* Hero image */}
          <Image
            src="/images/hero-cattle.jpg"
            alt="Rebanho em pastagem ao por do sol"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* Gradient overlays — blend image with dark background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to left, transparent 40%, #0F0E0B 95%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #0F0E0B 0%, transparent 40%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(15,14,11,0.3)",
            }}
          />

          {/* Data card — top right */}
          <div
            className="absolute top-6 right-6 px-4 py-3 rounded-lg backdrop-blur-sm"
            style={{
              background: "rgba(15,14,11,0.88)",
              border: "0.5px solid #2A2820",
            }}
          >
            <p className="font-mono text-[10px] mb-1" style={{ color: "#6B6860" }}>
              @ arroba MS
            </p>
            <p className="font-mono text-lg font-medium" style={{ color: "#F5F1E8" }}>
              R$ {MOCK_ARROBA.toFixed(2).replace(".", ",")}
            </p>
            <p className="font-mono text-[10px]" style={{ color: "#4A5D3A" }}>
              &uarr; {MOCK_ARROBA_DELTA} hoje
            </p>
          </div>

          {/* Data card — bottom right */}
          <div
            className="absolute bottom-6 right-6 px-4 py-3 rounded-lg backdrop-blur-sm"
            style={{
              background: "rgba(15,14,11,0.88)",
              border: "0.5px solid #2A2820",
            }}
          >
            <p className="font-mono text-[10px] mb-1" style={{ color: "#6B6860" }}>
              Margem projetada
            </p>
            <p className="font-mono text-lg font-medium" style={{ color: "#4A5D3A" }}>
              {MOCK_MARGEM}
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{ borderTop: "0.5px solid #2A2820" }}
      >
        {/* Stat 1 */}
        <div
          className="px-7 py-5"
          style={{ borderRight: "0.5px solid #2A2820" }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.06em] mb-1"
            style={{ color: "#6B6860" }}
          >
            Arroba boi gordo
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl font-medium" style={{ color: "#F5F1E8" }}>
              R$ 312
            </span>
            <span className="font-mono text-[11px]" style={{ color: "#4A5D3A" }}>
              &uarr; 1.2%
            </span>
          </div>
        </div>

        {/* Stat 2 */}
        <div
          className="px-7 py-5"
          style={{ borderRight: "0.5px solid #2A2820" }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.06em] mb-1"
            style={{ color: "#6B6860" }}
          >
            Lotes em monitoramento
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl font-medium" style={{ color: "#F5F1E8" }}>
              3
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: "#B8763E", background: "rgba(184,118,62,0.12)" }}
            >
              ativo
            </span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="px-7 py-5">
          <p
            className="text-[10px] uppercase tracking-[0.06em] mb-1"
            style={{ color: "#6B6860" }}
          >
            Prox. vencimento BGI
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-medium" style={{ color: "#F5F1E8" }}>
              12
            </span>
            <span className="text-[13px]" style={{ color: "#6B6860" }}>
              dias
            </span>
          </div>
        </div>
      </div>

      {/* ── Como funciona ── */}
      <section className="px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "#1A1814",
              border: "0.5px solid #2A2820",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <rect x="2" y="10" width="4" height="8" rx="1" fill="#B8763E" />
              <rect x="8" y="6" width="4" height="12" rx="1" fill="#B8763E" opacity="0.7" />
              <rect x="14" y="2" width="4" height="16" rx="1" fill="#B8763E" opacity="0.4" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "#F5F1E8" }}>
              Exposure engine
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#6B6860" }}>
              Break-even dinamico dia a dia. Custo acumulado projetado ate o abate.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "#1A1814",
              border: "0.5px solid #2A2820",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <circle cx="10" cy="10" r="8" stroke="#4A5D3A" strokeWidth="1.5" />
              <path d="M10 5v5l3.5 3.5" stroke="#4A5D3A" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "#F5F1E8" }}>
              Cenarios de queda
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#6B6860" }}>
              Impacto em margem e caixa em queda de 10%, 20%, 30% no preco da arroba.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="p-6 rounded-xl"
            style={{
              background: "#1A1814",
              border: "0.5px solid #2A2820",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-4">
              <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="#6B6860" strokeWidth="1.2" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="#6B6860" strokeWidth="1.2" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="#6B6860" strokeWidth="1.2" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="#6B6860" strokeWidth="1.2" />
            </svg>
            <p className="text-sm font-medium mb-2" style={{ color: "#F5F1E8" }}>
              Futuros BGI / B3
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#6B6860" }}>
              Hedge com contratos de boi gordo. Custo real, basis regional, sizing automatico.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section
        className="px-12 py-20 text-center"
        style={{
          background: "#1A1814",
          borderTop: "0.5px solid #2A2820",
        }}
      >
        <p
          className="font-display text-[22px] italic max-w-[480px] mx-auto mb-8 leading-relaxed"
          style={{ color: "#6B6860", fontWeight: 400 }}
        >
          &ldquo;Nao vendemos hedge. Vendemos clareza economica da operacao.&rdquo;
        </p>
        <Link
          href="/lotes"
          className="inline-block text-[13px] font-medium px-5 py-2.5 rounded-[7px] transition-all hover:brightness-110"
          style={{ background: "#B8763E", color: "#FAF0E0" }}
        >
          Acessar plataforma &rarr;
        </Link>
      </section>
    </div>
  );
}
