"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchCotacoes, simularCenarios } from "@/lib/api";
import type {
  SimulatorRequest,
  SimulatorResponse,
  SimulatorScenarioInput,
  CotacaoMercado,
} from "@/lib/types";
import { fmtBRL, fmtPct } from "@/lib/utils/format";
import { ScenarioSlider } from "@/components/simulator/scenario-slider";
import { ScenarioCard } from "@/components/simulator/scenario-card";
import { ScenarioChart } from "@/components/simulator/scenario-chart";
import { ScenarioTable } from "@/components/simulator/scenario-table";
import { HedgeCheckbox } from "@/components/simulator/hedge-checkbox";

// Scenario names (excluding "Base (atual)" which is always 0%)
const SCENARIO_KEYS = [
  "otimista",
  "estresseLeve",
  "estresseSevero",
  "pesadelo",
] as const;

const SCENARIO_LABELS: Record<string, string> = {
  otimista: "Otimista",
  estresseLeve: "Estresse leve",
  estresseSevero: "Estresse severo",
  pesadelo: "Pesadelo",
};

type ScenarioKey = (typeof SCENARIO_KEYS)[number];

interface Variacoes {
  otimista: { arroba: number; milho: number; dolar: number };
  estresseLeve: { arroba: number; milho: number; dolar: number };
  estresseSevero: { arroba: number; milho: number; dolar: number };
  pesadelo: { arroba: number; milho: number; dolar: number };
}

const DEFAULT_VARIACOES: Variacoes = {
  otimista: { arroba: 10, milho: -5, dolar: -3 },
  estresseLeve: { arroba: -10, milho: 10, dolar: 5 },
  estresseSevero: { arroba: -20, milho: 20, dolar: 10 },
  pesadelo: { arroba: -30, milho: 30, dolar: 15 },
};

function buildCenarios(
  variacoes: Variacoes,
  hedgeArroba: boolean,
  hedgeMilho: boolean,
  precoHedgeArroba: number,
  precoHedgeMilho: number
): SimulatorScenarioInput[] {
  const hedgeFields = {
    hedge_arroba: hedgeArroba,
    preco_hedge_arroba: hedgeArroba ? precoHedgeArroba : 0,
    hedge_milho: hedgeMilho,
    preco_hedge_milho: hedgeMilho ? precoHedgeMilho : 0,
  };

  return [
    {
      nome: "Otimista",
      var_arroba_pct: variacoes.otimista.arroba / 100,
      var_milho_pct: variacoes.otimista.milho / 100,
      var_dolar_pct: variacoes.otimista.dolar / 100,
      ...hedgeFields,
    },
    {
      nome: "Base (atual)",
      var_arroba_pct: 0,
      var_milho_pct: 0,
      var_dolar_pct: 0,
      ...hedgeFields,
    },
    {
      nome: "Estresse leve",
      var_arroba_pct: variacoes.estresseLeve.arroba / 100,
      var_milho_pct: variacoes.estresseLeve.milho / 100,
      var_dolar_pct: variacoes.estresseLeve.dolar / 100,
      ...hedgeFields,
    },
    {
      nome: "Estresse severo",
      var_arroba_pct: variacoes.estresseSevero.arroba / 100,
      var_milho_pct: variacoes.estresseSevero.milho / 100,
      var_dolar_pct: variacoes.estresseSevero.dolar / 100,
      ...hedgeFields,
    },
    {
      nome: "Pesadelo",
      var_arroba_pct: variacoes.pesadelo.arroba / 100,
      var_milho_pct: variacoes.pesadelo.milho / 100,
      var_dolar_pct: variacoes.pesadelo.dolar / 100,
      ...hedgeFields,
    },
  ];
}

export default function SimuladorPage() {
  // Cotacoes
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);

  // Lote params
  const [arrobas, setArrobas] = useState(3000);
  const [custoTotal, setCustoTotal] = useState(850000);
  const [custoDieta, setCustoDieta] = useState(280000);
  const [diasCiclo, setDiasCiclo] = useState(100);

  // Hedge
  const [hedgeArroba, setHedgeArroba] = useState(false);
  const [hedgeMilho, setHedgeMilho] = useState(false);
  const [precoHedgeArroba, setPrecoHedgeArroba] = useState(340);
  const [precoHedgeMilho, setPrecoHedgeMilho] = useState(70);

  // Variacoes
  const [variacoes, setVariacoes] = useState<Variacoes>(DEFAULT_VARIACOES);

  // Collapsible slider groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    arroba: true,
    milho: false,
    dolar: false,
  });

  // Results
  const [result, setResult] = useState<SimulatorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calc guard
  const initialLoadDone = useRef(false);

  useEffect(() => {
    fetchCotacoes()
      .then((c) => {
        setCotacoes(c);
        if (c.arroba_boi_gordo) setPrecoHedgeArroba(Math.round(c.arroba_boi_gordo));
        if (c.milho_esalq) setPrecoHedgeMilho(Math.round(c.milho_esalq));
      })
      .catch(() => {});
  }, []);

  const precoArroba = cotacoes?.arroba_boi_gordo ?? 350;
  const precoMilho = cotacoes?.milho_esalq ?? 70;
  const dolar = cotacoes?.dolar_ptax ?? 5.2;

  const calcular = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cenarios = buildCenarios(
      variacoes,
      hedgeArroba,
      hedgeMilho,
      precoHedgeArroba,
      precoHedgeMilho
    );

    const req: SimulatorRequest = {
      arrobas_totais: arrobas,
      custo_total: custoTotal,
      dias_ciclo: diasCiclo,
      custo_dieta_total: custoDieta,
      custo_nao_dieta: custoTotal - custoDieta,
      preco_arroba: precoArroba,
      preco_milho_saca: precoMilho,
      dolar_ptax: dolar,
      cenarios,
    };

    try {
      setResult(await simularCenarios(req));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [
    arrobas,
    custoTotal,
    custoDieta,
    diasCiclo,
    variacoes,
    hedgeArroba,
    hedgeMilho,
    precoHedgeArroba,
    precoHedgeMilho,
    precoArroba,
    precoMilho,
    dolar,
  ]);

  // Auto-sim on first load once cotacoes arrive
  useEffect(() => {
    if (cotacoes && !initialLoadDone.current) {
      initialLoadDone.current = true;
      calcular();
    }
  }, [cotacoes, calcular]);

  const updateVariacao = (
    scenario: ScenarioKey,
    variable: "arroba" | "milho" | "dolar",
    value: number
  ) => {
    setVariacoes((prev) => ({
      ...prev,
      [scenario]: { ...prev[scenario], [variable]: value },
    }));
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showHedge = hedgeArroba || hedgeMilho;

  const chartData =
    result?.cenarios.map((c) => ({
      nome: c.nome.replace("(atual)", "").trim(),
      margem: c.margem_sem_hedge,
    })) ?? [];

  // Timestamp
  const now = new Date();
  const timestamp = `Atualizado ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")} \u00b7 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      className="flex"
      style={{ minHeight: "calc(100vh - 56px)" }}
    >
      {/* ─── LEFT PANEL ─── */}
      <aside
        className="shrink-0 flex flex-col overflow-y-auto"
        style={{
          width: 280,
          background: "var(--bg-deep)",
          borderRight: "0.5px solid var(--border-subtle)",
          padding: "20px 18px",
          gap: 20,
        }}
      >
        {/* Section 1: Parametros do lote */}
        <div>
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 13,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Parametros do lote
          </h3>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <LoteInput
              label="Arrobas totais"
              value={arrobas}
              onChange={setArrobas}
              step={100}
            />
            <LoteInput
              label="Custo total (R$)"
              value={custoTotal}
              onChange={setCustoTotal}
              step={10000}
            />
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              <LoteInput
                label="Custo dieta (R$)"
                value={custoDieta}
                onChange={setCustoDieta}
                step={5000}
              />
              <LoteInput
                label="Dias ciclo"
                value={diasCiclo}
                onChange={setDiasCiclo}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Precos de mercado (display only) */}
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: 16 }}>
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
              marginBottom: 10,
            }}
          >
            Precos de mercado
          </span>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <MarketRow label="Arroba" value={fmtBRL(precoArroba, 2)} suffix="/@" />
            <MarketRow label="Milho" value={fmtBRL(precoMilho, 2)} suffix="/sc" />
            <MarketRow label="Dolar" value={`R$ ${dolar.toFixed(2)}`} />
          </div>
        </div>

        {/* Section 3: Protecao (hedge) */}
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: 14 }}>
          <span
            className="block"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-tertiary)",
              marginBottom: 10,
            }}
          >
            Protecao
          </span>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <HedgeCheckbox
              checked={hedgeArroba}
              onChange={setHedgeArroba}
              label="Travar preco da arroba (venda de futuro)"
            />
            <HedgeCheckbox
              checked={hedgeMilho}
              onChange={setHedgeMilho}
              label="Travar preco do milho (compra de futuro)"
            />
          </div>
        </div>

        {/* Section 4: Variacoes por cenario */}
        <div style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: 16 }}>
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 13,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Variacoes por cenario
          </h3>

          {/* Arroba group */}
          <SliderGroup
            label="Arroba"
            labelColor="var(--brand)"
            open={openGroups.arroba ?? false}
            onToggle={() => toggleGroup("arroba")}
          >
            {SCENARIO_KEYS.map((key) => (
              <ScenarioSlider
                key={key}
                label={SCENARIO_LABELS[key]}
                value={variacoes[key].arroba}
                onChange={(v) => updateVariacao(key, "arroba", v)}
              />
            ))}
          </SliderGroup>

          {/* Milho group */}
          <SliderGroup
            label="Milho"
            labelColor="var(--text-tertiary)"
            open={openGroups.milho ?? false}
            onToggle={() => toggleGroup("milho")}
          >
            {SCENARIO_KEYS.map((key) => (
              <ScenarioSlider
                key={key}
                label={SCENARIO_LABELS[key]}
                value={variacoes[key].milho}
                onChange={(v) => updateVariacao(key, "milho", v)}
              />
            ))}
          </SliderGroup>

          {/* Dolar group */}
          <SliderGroup
            label="Dolar"
            labelColor="var(--text-tertiary)"
            open={openGroups.dolar ?? false}
            onToggle={() => toggleGroup("dolar")}
          >
            {SCENARIO_KEYS.map((key) => (
              <ScenarioSlider
                key={key}
                label={SCENARIO_LABELS[key]}
                value={variacoes[key].dolar}
                onChange={(v) => updateVariacao(key, "dolar", v)}
              />
            ))}
          </SliderGroup>
        </div>

        {/* Section 5: Simular button (pushed to bottom) */}
        <div style={{ marginTop: "auto" }}>
          <button
            onClick={calcular}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
            style={{
              background: loading ? "var(--brand)" : "var(--brand)",
              color: "var(--brand-fg)",
              borderRadius: 8,
              padding: 10,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 150ms",
            }}
          >
            {loading ? (
              <>
                <Spinner />
                Simulando...
              </>
            ) : (
              "Simular cenarios \u2192"
            )}
          </button>
        </div>
      </aside>

      {/* ─── RIGHT PANEL ─── */}
      <main
        className="flex-1 flex flex-col overflow-y-auto"
        style={{
          background: "var(--background)",
          padding: "20px 24px",
          gap: 14,
        }}
      >
        {/* Timestamp */}
        <div className="flex justify-end">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            {timestamp}
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "var(--danger-bg)",
              border: "0.5px solid var(--red)",
              borderRadius: 8,
              padding: "10px 14px",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "var(--red-2)",
            }}
          >
            {error}
          </div>
        )}

        {!result && !loading && (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: "var(--text-tertiary)", fontFamily: "Inter, sans-serif", fontSize: 13 }}
          >
            Ajuste os parametros e clique em &ldquo;Simular cenarios&rdquo;
          </div>
        )}

        {loading && !result && (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: "var(--text-tertiary)", fontFamily: "Inter, sans-serif", fontSize: 13 }}
          >
            Simulando cenarios...
          </div>
        )}

        {result && (
          <>
            {/* 3 headline cards */}
            <div className="grid grid-cols-3" style={{ gap: 10 }}>
              <ScenarioCard
                type="best"
                label="Melhor cenario"
                value={result.melhor_cenario.margem_sem_hedge}
                subLabel={result.melhor_cenario.nome}
                subValue={fmtPct(result.melhor_cenario.margem_pct_sem_hedge)}
              />
              <ScenarioCard
                type="base"
                label="Cenario base"
                value={result.cenario_base.margem_sem_hedge}
                subLabel={`${fmtPct(result.cenario_base.margem_pct_sem_hedge)} de margem`}
              />
              <ScenarioCard
                type="worst"
                label="Pior cenario"
                value={result.pior_cenario.margem_sem_hedge}
                subLabel={result.pior_cenario.nome}
                subValue={fmtPct(result.pior_cenario.margem_pct_sem_hedge)}
              />
            </div>

            {/* Bar chart */}
            <ScenarioChart data={chartData} />

            {/* Detail table */}
            <ScenarioTable
              cenarios={result.cenarios}
              showHedge={showHedge}
            />
          </>
        )}
      </main>
    </div>
  );
}

/* ─── Inline sub-components ─── */

function LoteInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label
        className="block"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        className="sim-input"
        style={{
          width: "100%",
          height: 34,
          background: "var(--background)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: 8,
          padding: "0 10px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function MarketRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: "var(--text-primary)",
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginLeft: 2,
            }}
          >
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}

function SliderGroup({
  label,
  labelColor,
  open,
  onToggle,
  children,
}: {
  label: string;
  labelColor: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 w-full text-left"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: labelColor,
            transition: "transform 150ms",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          \u25B8
        </span>
        <span
          className="uppercase"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            fontWeight: 500,
            color: labelColor,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </button>
      {open && (
        <div className="flex flex-col" style={{ gap: 6, paddingTop: 6, paddingLeft: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="6"
        cy="6"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="20 10"
      />
    </svg>
  );
}
