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
import { FanChart } from "@/components/simulator/fan-chart";
import type { FanDataPoint } from "@/components/simulator/fan-chart";
import { ScenarioTable } from "@/components/simulator/scenario-table";
import { HedgeCheckbox } from "@/components/simulator/hedge-checkbox";
import { ScoreRing } from "@/components/score-ring";
import { RecommendationCard } from "@/components/simulator/recommendation-card";
import { SensitivityBar } from "@/components/simulator/sensitivity-bar";

// ── Scenario keys & labels ──

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

// ── Fan data generation ──

function buildFanData(
  result: SimulatorResponse,
  diasCiclo: number
): FanDataPoint[] {
  const base = result.cenario_base;
  const melhor = result.melhor_cenario;
  const pior = result.pior_cenario;

  // Sample at 0%, 25%, 50%, 75%, 100% of cycle
  const steps = [0, 0.25, 0.5, 0.75, 1.0];

  return steps.map((pct) => {
    const dia = Math.round(diasCiclo * pct);
    // Margin accumulates linearly over the cycle
    const baseVal = Math.round(base.margem_sem_hedge * pct);
    const otVal = Math.round(melhor.margem_sem_hedge * pct);
    const pessVal = Math.round(pior.margem_sem_hedge * pct);

    return {
      dia,
      base: baseVal,
      otimista: otVal,
      pessimista: pessVal,
    };
  });
}

// ── Sensitivity calculation ──
// TODO: calcular sensibilidade real da API
function calcSensitivity(result: SimulatorResponse) {
  const base = result.cenario_base.margem_sem_hedge;

  // Find stress leve for each variable impact
  const stressLeve = result.cenarios.find((c) =>
    c.nome.includes("Estresse leve")
  );
  const stressSevero = result.cenarios.find((c) =>
    c.nome.includes("Estresse severo")
  );

  // Impact of arroba: biggest driver (use stress leve vs base)
  const arrobaImpact = stressLeve
    ? Math.abs(base - stressLeve.margem_sem_hedge)
    : 0;
  // Milho impact: moderate
  const milhoImpact = stressSevero
    ? Math.abs(stressSevero.custo_cenario - result.cenario_base.custo_cenario) *
      0.3
    : 0;
  // Dolar impact: smallest
  const dolarImpact = milhoImpact * 0.3;

  const total = arrobaImpact + milhoImpact + dolarImpact || 1;

  return {
    arroba: {
      pct: Math.round((arrobaImpact / total) * 100),
      label: fmtBRL(arrobaImpact),
    },
    milho: {
      pct: Math.round((milhoImpact / total) * 100),
      label: fmtBRL(milhoImpact),
    },
    dolar: {
      pct: Math.round((dolarImpact / total) * 100),
      label: fmtBRL(dolarImpact),
    },
  };
}

// ═══════════════════════════════════════════════════════
// Page component
// ═══════════════════════════════════════════════════════

export default function SimuladorPage() {
  // Cotacoes
  const [cotacoes, setCotacoes] = useState<CotacaoMercado | null>(null);

  // Lote params
  const [arrobas, setArrobas] = useState(3000);
  const [custoTotal, setCustoTotal] = useState(850000);
  const [custoDieta, setCustoDieta] = useState(280000);
  const [diasCiclo, setDiasCiclo] = useState(100);

  // Sistema produtivo
  const [sistema, setSistema] = useState<
    "terminacao_pasto" | "confinamento" | "semiconfinamento"
  >("terminacao_pasto");

  // Hedge
  const [hedgeArroba, setHedgeArroba] = useState(false);
  const [hedgeMilho, setHedgeMilho] = useState(false);
  const [precoHedgeArroba, setPrecoHedgeArroba] = useState(340);
  const [precoHedgeMilho, setPrecoHedgeMilho] = useState(70);

  // Variacoes
  const [variacoes, setVariacoes] = useState<Variacoes>(DEFAULT_VARIACOES);

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
        if (c.arroba_boi_gordo)
          setPrecoHedgeArroba(Math.round(c.arroba_boi_gordo));
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

  const showHedge = hedgeArroba || hedgeMilho;

  // Derived data
  const fanData: FanDataPoint[] = result
    ? buildFanData(result, diasCiclo)
    : [];

  // Break-even de queda
  const breakEvenQueda = result
    ? (() => {
        const base = result.cenario_base;
        const custoPerArroba = base.custo_cenario / arrobas;
        const quedaPct =
          ((precoArroba - custoPerArroba) / precoArroba) * -100;
        return quedaPct;
      })()
    : null;

  const breakEvenArrobaRs = breakEvenQueda != null
    ? precoArroba * (1 + breakEvenQueda / 100)
    : null;

  // Score (simplified)
  // TODO: calcular score real
  const score = result
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            result.cenario_base.margem_pct_sem_hedge * 100 * 2.5 + 20
          )
        )
      )
    : 72;

  // Sensitivity
  const sensitivity = result ? calcSensitivity(result) : null;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "220px 1fr 200px",
        minHeight: "calc(100vh - 56px)",
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* ═══ PAINEL ESQUERDO ═══ */}
      <aside
        className="flex flex-col"
        style={{
          background: "var(--bg-deep)",
          borderRight: "0.5px solid var(--border-subtle)",
          padding: "16px 14px",
          gap: 14,
          minWidth: 220,
          width: 220,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Secao 1: Parametros do lote */}
        <div>
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 11,
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            Parametros do lote
          </h3>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <LoteInput
              label="ARROBAS TOTAIS"
              value={arrobas}
              onChange={setArrobas}
              step={100}
            />
            <LoteInput
              label="CUSTO TOTAL (R$)"
              value={custoTotal}
              onChange={setCustoTotal}
              step={10000}
            />
            <div className="grid grid-cols-2" style={{ gap: 6 }}>
              <LoteInput
                label="CUSTO DIETA"
                value={custoDieta}
                onChange={setCustoDieta}
                step={5000}
              />
              <LoteInput
                label="DIAS CICLO"
                value={diasCiclo}
                onChange={setDiasCiclo}
              />
            </div>
          </div>
        </div>

        {/* Secao 2: Sistema produtivo */}
        <div
          style={{
            borderTop: "0.5px solid var(--border-subtle)",
            paddingTop: 12,
          }}
        >
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
              letterSpacing: "0.09em",
              marginBottom: 7,
            }}
          >
            Sistema produtivo
          </span>
          <div className="flex flex-col" style={{ gap: 6 }}>
            {(
              [
                ["terminacao_pasto", "Terminacao pasto"],
                ["confinamento", "Confinamento"],
                ["semiconfinamento", "Semiconfinamento"],
              ] as const
            ).map(([value, label]) => (
              <RadioOption
                key={value}
                selected={sistema === value}
                label={label}
                onClick={() =>
                  setSistema(
                    value as
                      | "terminacao_pasto"
                      | "confinamento"
                      | "semiconfinamento"
                  )
                }
              />
            ))}
          </div>
        </div>

        {/* Secao 3: Variacoes de stress */}
        <div
          style={{
            borderTop: "0.5px solid var(--border-subtle)",
            paddingTop: 12,
          }}
        >
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 11,
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            Variacoes de stress
          </h3>

          {/* Arroba group */}
          <SliderGroup label="Arroba" labelColor="var(--brand)">
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
          <SliderGroup label="Milho" labelColor="var(--text-tertiary)">
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
          <SliderGroup label="Dolar" labelColor="var(--text-tertiary)">
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

        {/* Secao 4: Protecao (hedge) */}
        <div
          style={{
            borderTop: "0.5px solid var(--border-subtle)",
            paddingTop: 10,
          }}
        >
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
              letterSpacing: "0.09em",
              marginBottom: 4,
            }}
          >
            Protecao
          </span>
          <div className="flex flex-col" style={{ gap: 6 }}>
            <HedgeCheckbox
              checked={hedgeArroba}
              onChange={setHedgeArroba}
              label="Travar arroba"
            />
            <HedgeCheckbox
              checked={hedgeMilho}
              onChange={setHedgeMilho}
              label="Travar milho"
            />
          </div>
        </div>

        {/* Secao 5: Botao simular */}
        <div style={{ marginTop: "auto" }}>
          <button
            onClick={calcular}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
            style={{
              background: "var(--brand)",
              color: "var(--brand-fg)",
              borderRadius: 8,
              padding: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
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

      {/* ═══ CANVAS CENTRAL ═══ */}
      <main
        className="flex flex-col overflow-y-auto"
        style={{
          background: "var(--background)",
          padding: "16px 20px",
          gap: 12,
          borderRight: "0.5px solid var(--border-subtle)",
          minWidth: 0,
        }}
      >
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
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
            }}
          >
            Ajuste os parametros e clique em &ldquo;Simular cenarios&rdquo;
          </div>
        )}

        {loading && !result && (
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
            }}
          >
            Simulando cenarios...
          </div>
        )}

        {result && (
          <>
            {/* 3 headline cards */}
            <div
              className="grid grid-cols-3"
              style={{ gap: 10 }}
            >
              <ScenarioCard
                type="best"
                label="Melhor cenario"
                value={result.melhor_cenario.margem_sem_hedge}
                subLabel={result.melhor_cenario.nome}
                subValue={fmtPct(
                  result.melhor_cenario.margem_pct_sem_hedge
                )}
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
                subValue={fmtPct(
                  result.pior_cenario.margem_pct_sem_hedge
                )}
              />
            </div>

            {/* Fan chart */}
            <FanChart data={fanData} />

            {/* Detail table */}
            <ScenarioTable
              cenarios={result.cenarios}
              showHedge={showHedge}
            />
          </>
        )}
      </main>

      {/* ═══ PAINEL DIREITO ═══ */}
      <aside
        className="flex flex-col overflow-y-auto"
        style={{
          background: "var(--bg-deep)",
          padding: "14px 12px",
          gap: 10,
        }}
      >
        {/* Score Ring */}
        <div
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Score de risco
          </span>
          <div className="flex items-center" style={{ gap: 10 }}>
            <ScoreRing score={score} size="sm" />
            <div>
              <span
                className="block"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                }}
              >
                {score >= 70
                  ? "risco baixo"
                  : score >= 40
                    ? "risco moderado"
                    : "risco alto"}
              </span>
            </div>
          </div>
        </div>

        {/* Recomendacao */}
        <RecommendationCard
          cenarioBase={result?.cenario_base ?? null}
          breakEvenQueda={breakEvenQueda}
        />

        {/* Analise de sensibilidade */}
        <div
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              marginBottom: 9,
            }}
          >
            Sensibilidade
          </span>
          {sensitivity ? (
            <>
              <SensitivityBar
                label="Arroba"
                impactPct={sensitivity.arroba.pct}
                impactLabel={sensitivity.arroba.label}
                color="var(--red)"
              />
              <SensitivityBar
                label="Milho"
                impactPct={sensitivity.milho.pct}
                impactLabel={sensitivity.milho.label}
                color="var(--amber)"
              />
              <SensitivityBar
                label="Dolar"
                impactPct={sensitivity.dolar.pct}
                impactLabel={sensitivity.dolar.label}
                color="var(--text-tertiary)"
              />
            </>
          ) : (
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 10,
                color: "var(--text-tertiary)",
              }}
            >
              Simule para ver
            </span>
          )}
        </div>

        {/* Break-even de queda */}
        <div
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <span
            className="block uppercase"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              marginBottom: 5,
            }}
          >
            Break-even de queda
          </span>
          <span
            className="block"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 20,
              fontWeight: 500,
              color: "var(--amber)",
              marginBottom: 4,
            }}
          >
            {breakEvenQueda != null
              ? `${breakEvenQueda > 0 ? "+" : ""}${breakEvenQueda.toFixed(1)}%`
              : "\u2014"}
          </span>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "var(--text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            {breakEvenArrobaRs != null
              ? `Arroba pode cair ate R$${breakEvenArrobaRs.toFixed(0)}/@ antes de virar prejuizo.`
              : "Simule para ver o limite."}
          </span>
        </div>
      </aside>
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
        className="block uppercase"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.09em",
          color: "var(--text-tertiary)",
          marginBottom: 3,
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
          height: 30,
          background: "var(--background)",
          border: "0.5px solid var(--border-subtle)",
          borderRadius: 7,
          padding: "0 9px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function RadioOption({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 0",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: selected
            ? "0.5px solid var(--brand)"
            : "0.5px solid var(--border-subtle)",
          background: selected ? "var(--brand)" : "transparent",
          transition: "all 150ms",
        }}
      >
        {selected && (
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
        )}
      </div>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
          transition: "color 150ms",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function SliderGroup({
  label,
  labelColor,
  children,
}: {
  label: string;
  labelColor: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(label === "Arroba");

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "3px 0",
        }}
      >
        <span
          style={{
            fontSize: 8,
            color: labelColor,
            transition: "transform 150ms",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          {"\u25B8"}
        </span>
        <span
          className="uppercase"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            fontWeight: 500,
            color: labelColor,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </button>
      {open && (
        <div
          className="flex flex-col"
          style={{ gap: 4, paddingTop: 5, paddingLeft: 2 }}
        >
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
