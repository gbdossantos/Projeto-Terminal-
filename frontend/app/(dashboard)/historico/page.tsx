export default function HistoricoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Historico</h1>
        <p className="text-sm text-t-secondary mt-1">Lotes finalizados e comparativo previsto vs realizado</p>
      </div>
      <div className="border border-border rounded-lg bg-card px-5 py-12 text-center">
        <p className="text-t-tertiary text-sm">Nenhum lote finalizado ainda</p>
      </div>
    </div>
  );
}
