"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchCotacoes, simularCenarios } from "@/lib/api";
import type { SimulatorRequest, SimulatorResponse, SimulatorScenarioInput, CotacaoMercado } from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { MetricCard } from "@/components/metrics/MetricCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer
} from "recharts";

// Default cenarios pre-configurados
const DEFAULT_SCENARIOS: SimulatorScenarioInput[] = [
  { nome: "Otimista", var_arroba_pct: 0.10, var_milho_pct: -0.05, var_dolar_pct: -0.03, hedge_arroba: false, preco_hedge_arroba: 0, hedge_milho: false, preco_hedge_milho: 0 },
  { nome: "Base (atual)", var_arroba_pct: 0, var_milho_pct: 0, var_dolar_pct: 0, hedge_arroba: false, preco_hedge_arroba: 0, hedge_milho: false, preco_hedge_milho: 0 },
  { nome: "Estresse leve", var_arroba_pct: -0.10, var_milho_pct: 0.10, var_dolar_pct: 0.05, hedge_arroba: false, preco_hedge_arroba: 0, hedge_milho: false, preco_hedge_milho: 0 },
  { nome: "Estresse severo", var_arroba_pct: -0.20, var_milho_pct: 0.20, var_dolar_pct: 0.10, hedge_arroba: false, preco_hedge_arroba: 0, hedge_milho: false, preco_hedge_milho: 0 },
  { nome: "Pesadelo", var_arroba_pct: -0.30, var_milho_pct: 0.30, var_dolar_pct: 0.15, hedge_arroba: false, preco_hedge_arroba: 0, hedge_milho: false, preco_hedge_milho: 0 },
];

export default function SimuladorPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);
  const [result, setResult] = useState<SimulatorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parametros do lote (editaveis)
  const [arrobas, setArrobas] = useState(3000);
  const [custoTotal, setCustoTotal] = useState(850000);
  const [custoDieta, setCustoDieta] = useState(280000);
  const [diasCiclo, setDiasCiclo] = useState(100);

  // Cenarios
  const [cenarios, setCenarios] = useState(DEFAULT_SCENARIOS);

  // Hedge toggles
  const [hedgeArroba, setHedgeArroba] = useState(false);
  const [precoHedgeArroba, setPrecoHedgeArroba] = useState(340);
  const [hedgeMilho, setHedgeMilho] = useState(false);
  const [precoHedgeMilho, setPrecoHedgeMilho] = useState(70);

  useEffect(() => {
    fetchCotacoes().then(setCotacoes).catch(() => {});
  }, []);

  const precoArroba = cotacoes?.arroba_boi_gordo ?? 350;
  const precoMilho = cotacoes?.milho_esalq ?? 70;
  const dolar = cotacoes?.dolar_ptax ?? 5.20;

  const calcular = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Aplicar hedge toggles a todos os cenarios
    const cenariosComHedge = cenarios.map(c => ({
      ...c,
      hedge_arroba: hedgeArroba,
      preco_hedge_arroba: hedgeArroba ? precoHedgeArroba : 0,
      hedge_milho: hedgeMilho,
      preco_hedge_milho: hedgeMilho ? precoHedgeMilho : 0,
    }));

    const req: SimulatorRequest = {
      arrobas_totais: arrobas,
      custo_total: custoTotal,
      dias_ciclo: diasCiclo,
      custo_dieta_total: custoDieta,
      custo_nao_dieta: custoTotal - custoDieta,
      preco_arroba: precoArroba,
      preco_milho_saca: precoMilho,
      dolar_ptax: dolar,
      cenarios: cenariosComHedge,
    };

    try {
      setResult(await simularCenarios(req));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [arrobas, custoTotal, custoDieta, diasCiclo, cenarios, hedgeArroba, precoHedgeArroba, hedgeMilho, precoHedgeMilho, precoArroba, precoMilho, dolar]);

  // Auto-calcular quando parametros mudam
  useEffect(() => {
    const t = setTimeout(calcular, 500);
    return () => clearTimeout(t);
  }, [calcular]);

  const chartData = result?.cenarios.map(c => ({
    nome: c.nome,
    "Sem hedge": c.margem_sem_hedge,
    "Com hedge": (c.tem_hedge_arroba || c.tem_hedge_milho) ? c.margem_com_hedge : null,
  })) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Simulador de cenarios</h1>
        <p className="text-sm text-t-secondary mt-1">
          Teste o impacto combinado de variacoes em boi, milho e dolar sobre seu lote
        </p>
      </div>

      {/* Parametros do lote */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">Parametros do lote</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Arrobas totais</label>
            <input type="number" value={arrobas} onChange={e => setArrobas(Number(e.target.value))} step={100}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Custo total (R$)</label>
            <input type="number" value={custoTotal} onChange={e => setCustoTotal(Number(e.target.value))} step={10000}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Custo dieta (R$)</label>
            <input type="number" value={custoDieta} onChange={e => setCustoDieta(Number(e.target.value))} step={5000}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Dias ciclo</label>
            <input type="number" value={diasCiclo} onChange={e => setDiasCiclo(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-3">Precos de mercado (atuais)</p>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Arroba" value={fmtBRL(precoArroba, 2)} unit="/@" compact />
            <MetricCard label="Milho" value={fmtBRL(precoMilho, 2)} unit="/sc" compact />
            <MetricCard label="Dolar" value={`R$ ${dolar.toFixed(2)}`} compact />
          </div>
        </div>
      </div>

      {/* Hedge toggles */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-4">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">Protecao (hedge)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hedgeArroba} onChange={e => setHedgeArroba(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-terra" />
              <span className="text-sm text-t-primary">Travar preco da arroba (venda de futuro)</span>
            </label>
            {hedgeArroba && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Preco travado (R$/@)</label>
                <input type="number" value={precoHedgeArroba} onChange={e => setPrecoHedgeArroba(Number(e.target.value))} step={1}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hedgeMilho} onChange={e => setHedgeMilho(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-terra" />
              <span className="text-sm text-t-primary">Travar preco do milho (compra de futuro)</span>
            </label>
            {hedgeMilho && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">Preco travado (R$/saca)</label>
                <input type="number" value={precoHedgeMilho} onChange={e => setPrecoHedgeMilho(Number(e.target.value))} step={0.5}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-t-primary focus:outline-none focus:border-terra" />
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-danger-bg border border-danger/30 rounded-lg px-5 py-3 text-sm text-danger">{error}</div>}
      {loading && !result && <div className="text-center py-12 text-t-tertiary text-sm">Simulando cenarios...</div>}

      {result && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              label="Melhor cenario"
              value={fmtBRL(result.melhor_cenario.margem_sem_hedge)}
              delta={result.melhor_cenario.nome}
              deltaType="positive"
            />
            <MetricCard
              label="Cenario base"
              value={fmtBRL(result.cenario_base.margem_sem_hedge)}
              delta={fmtPct(result.cenario_base.margem_pct_sem_hedge)}
            />
            <MetricCard
              label="Pior cenario"
              value={fmtBRL(result.pior_cenario.margem_sem_hedge)}
              delta={result.pior_cenario.nome}
              deltaType={result.pior_cenario.margem_sem_hedge < 0 ? "negative" : "neutral"}
            />
          </div>

          {/* Grafico de barras */}
          <div className="border border-border rounded-lg bg-card p-5">
            <h2 className="text-sm font-medium text-t-primary mb-1">Impacto por cenario</h2>
            <p className="text-[11px] text-t-tertiary mb-4">Margem do lote (R$) em cada cenario simulado</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="nome" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => fmtBRL(Number(value))}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                <Bar dataKey="Sem hedge" fill="var(--terra)" radius={[4, 4, 0, 0]} />
                {(hedgeArroba || hedgeMilho) && (
                  <Bar dataKey="Com hedge" fill="var(--success)" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela detalhada */}
          <div className="border border-border rounded-lg bg-card p-5">
            <h2 className="text-sm font-medium text-t-primary mb-4">Detalhamento por cenario</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-left">
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium">Cenario</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Arroba</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Milho</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Dolar</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Receita</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Custo</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Margem</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Margem %</th>
                    {(hedgeArroba || hedgeMilho) && (
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-t-tertiary font-medium text-right">Margem c/ hedge</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.cenarios.map((c, i) => {
                    const isBase = c.nome.includes("Base");
                    const isNeg = c.margem_sem_hedge < 0;
                    return (
                      <tr key={i} className={`border-b border-border ${isBase ? "bg-secondary/30" : ""}`}>
                        <td className={`py-2 px-3 ${isBase ? "font-medium text-t-primary" : "text-t-secondary"}`}>{c.nome}</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-secondary">{fmtBRL(c.preco_arroba_cenario, 0)}/@</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-secondary">{fmtBRL(c.preco_milho_cenario, 0)}/sc</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-secondary">R$ {c.dolar_cenario.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-secondary">{fmtBRL(c.receita_sem_hedge)}</td>
                        <td className="py-2 px-3 text-right font-mono font-mono-nums text-t-secondary">{fmtBRL(c.custo_cenario)}</td>
                        <td className={`py-2 px-3 text-right font-mono font-mono-nums font-medium ${isNeg ? "text-danger" : "text-success"}`}>
                          {fmtBRL(c.margem_sem_hedge)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium font-mono ${
                            c.margem_pct_sem_hedge >= 0.15 ? "bg-success-bg text-success" :
                            c.margem_pct_sem_hedge >= 0.05 ? "bg-warning-bg text-warning" :
                            "bg-danger-bg text-danger"
                          }`}>
                            {fmtPct(c.margem_pct_sem_hedge)}
                          </span>
                        </td>
                        {(hedgeArroba || hedgeMilho) && (
                          <td className={`py-2 px-3 text-right font-mono font-mono-nums font-medium ${
                            c.margem_com_hedge < 0 ? "text-danger" : "text-success"
                          }`}>
                            {fmtBRL(c.margem_com_hedge)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cenarios editaveis */}
          <div className="border border-border rounded-lg bg-card p-5">
            <h2 className="text-sm font-medium text-t-primary mb-1">Cenarios customizados</h2>
            <p className="text-[11px] text-t-tertiary mb-4">Edite as variacoes percentuais de cada cenario</p>
            <div className="space-y-3">
              {cenarios.map((c, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-t-tertiary mb-1">{c.nome}</label>
                    <span className="text-[10px] text-t-tertiary">Arroba</span>
                    <input type="number" value={c.var_arroba_pct * 100} step={5}
                      onChange={e => {
                        const updated = [...cenarios];
                        updated[i] = { ...c, var_arroba_pct: Number(e.target.value) / 100 };
                        setCenarios(updated);
                      }}
                      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono text-t-primary focus:outline-none focus:border-terra"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-t-tertiary">Milho</span>
                    <input type="number" value={c.var_milho_pct * 100} step={5}
                      onChange={e => {
                        const updated = [...cenarios];
                        updated[i] = { ...c, var_milho_pct: Number(e.target.value) / 100 };
                        setCenarios(updated);
                      }}
                      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono text-t-primary focus:outline-none focus:border-terra"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-t-tertiary">Dolar</span>
                    <input type="number" value={c.var_dolar_pct * 100} step={5}
                      onChange={e => {
                        const updated = [...cenarios];
                        updated[i] = { ...c, var_dolar_pct: Number(e.target.value) / 100 };
                        setCenarios(updated);
                      }}
                      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-mono text-t-primary focus:outline-none focus:border-terra"
                    />
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono ${
                      (result?.cenarios[i]?.margem_sem_hedge ?? 0) < 0 ? "text-danger" : "text-success"
                    }`}>
                      {result?.cenarios[i] ? fmtBRL(result.cenarios[i].margem_sem_hedge) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
