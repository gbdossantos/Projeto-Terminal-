import Link from "next/link";

export default function ImpactoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Impacto & cenarios</h1>
        <p className="text-sm text-t-secondary mt-1">
          Simule quedas de preco e veja o impacto no caixa do lote
        </p>
      </div>
      <div className="border border-border rounded-lg bg-card px-5 py-12 text-center space-y-3">
        <p className="text-t-secondary text-sm">
          Calcule um lote primeiro para ver os cenarios de impacto
        </p>
        <Link
          href="/lotes"
          className="inline-block px-4 py-2 rounded-md bg-terra text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Ir para lotes
        </Link>
      </div>
    </div>
  );
}
