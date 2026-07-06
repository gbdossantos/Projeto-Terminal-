"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchSimuladorHistorico, fetchSimuladorCustom } from "@/lib/api";
import type {
  SimuladorHistoricoResponse,
  SimuladorCustomResponse,
  HistoricoPreset,
} from "@/lib/types";
import { listLotes } from "@/lib/lotes-storage";
import { type LoteTerminacaoSalvo } from "@/components/simulador/labels";
import SeletorLote from "@/components/simulador/SeletorLote";
import MetaforaHeroMargem from "@/components/simulador/MetaforaHeroMargem";
import GradePresets from "@/components/simulador/GradePresets";
import RetratoPeriodo from "@/components/simulador/RetratoPeriodo";
import SituacaoCustom from "@/components/simulador/SituacaoCustom";
import GraficoTradicional from "@/components/simulador/GraficoTradicional";
import EstadoVazio from "@/components/simulador/EstadoVazio";
import EstadoErro from "@/components/simulador/EstadoErro";

// Núcleo: o produtor pega um lote real (terminação, lido de /lotes — só leitura)
// e vê como ele se comporta numa situação de mercado histórica que reconhece.
// O frontend é apresentacional: a margem de cada cenário é recomputada no engine.
// Sem engine: estado de erro explícito (§10.6), nunca número inventado.

export default function SimuladorClient() {
  // ── Lotes (terminação-only) ──────────────────────────────────
  const [hydrated, setHydrated] = useState(false);
  const [lotes, setLotes] = useState<LoteTerminacaoSalvo[]>([]);
  const [loteId, setLoteId] = useState("");

  useEffect(() => {
    listLotes().then((todos) => {
      const terminacao = todos.filter(
        (l): l is LoteTerminacaoSalvo => l.fase === "terminacao",
      );
      setLotes(terminacao);
      if (terminacao.length > 0) setLoteId(terminacao[0].id);
      setHydrated(true);
    });
  }, []);

  const lote = useMemo(() => lotes.find((l) => l.id === loteId) ?? null, [lotes, loteId]);

  // ── Fetch dos presets históricos ─────────────────────────────
  const [data, setData] = useState<SimuladorHistoricoResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [nonce, setNonce] = useState(0); // retry

  const [presetId, setPresetId] = useState("");
  const [modo, setModo] = useState<"preset" | "custom">("preset");
  const [customAberto, setCustomAberto] = useState(false);
  const [customArroba, setCustomArroba] = useState(0);
  const [customMilho, setCustomMilho] = useState(0);
  const [customRes, setCustomRes] = useState<SimuladorCustomResponse | null>(null);

  useEffect(() => {
    if (!lote) return;
    let ignore = false;
    setCarregando(true);
    setErro(false);
    setData(null);
    fetchSimuladorHistorico(lote.inputs)
      .then((d) => {
        if (ignore) return;
        setData(d);
        const todos = [...d.presets.temporais, ...d.presets.eventos];
        const primeiro = todos.find((p) => !p.indisponivel);
        setPresetId(primeiro?.id ?? "");
        setModo("preset");
        setCustomAberto(false);
        setCustomRes(null);
        if (primeiro) {
          setCustomArroba(primeiro.arroba);
          setCustomMilho(primeiro.milho);
        }
      })
      .catch(() => {
        if (!ignore) setErro(true);
      })
      .finally(() => {
        if (!ignore) setCarregando(false);
      });
    return () => {
      ignore = true;
    };
  }, [lote, nonce]);

  // ── Recálculo da situação custom (debounced, via engine) ─────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (modo !== "custom" || !lote) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSimuladorCustom(lote.inputs, customArroba, customMilho)
        .then(setCustomRes)
        .catch(() => setCustomRes(null));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [modo, lote, customArroba, customMilho]);

  // ── Derivados ────────────────────────────────────────────────
  const presetsDisponiveis = useMemo<HistoricoPreset[]>(() => {
    if (!data) return [];
    return [...data.presets.temporais, ...data.presets.eventos].filter((p) => !p.indisponivel);
  }, [data]);

  const presetSelecionado = useMemo(
    () => presetsDisponiveis.find((p) => p.id === presetId) ?? null,
    [presetsDisponiveis, presetId],
  );

  // Escala da barra-hero = maior magnitude real observada (nada fabricado).
  const escalaMax = useMemo(() => {
    if (!data) return 1;
    const valores = [
      ...presetsDisponiveis.map((p) => Math.abs(p.margem_cenario)),
      Math.abs(data.margem_atual),
    ];
    if (customRes) valores.push(Math.abs(customRes.margem_cenario));
    return Math.max(1, ...valores);
  }, [data, presetsDisponiveis, customRes]);

  // Ranges absolutos dos sliders custom — extremos reais dos presets.
  const ranges = useMemo(() => {
    const arrobas = presetsDisponiveis.map((p) => p.arroba);
    const milhos = presetsDisponiveis.map((p) => p.milho);
    if (arrobas.length === 0) {
      return { arrobaMin: 0, arrobaMax: 0, milhoMin: 0, milhoMax: 0 };
    }
    return {
      arrobaMin: Math.floor(Math.min(...arrobas) * 0.9),
      arrobaMax: Math.ceil(Math.max(...arrobas) * 1.1),
      milhoMin: Math.floor(Math.min(...milhos) * 0.9),
      milhoMax: Math.ceil(Math.max(...milhos) * 1.1),
    };
  }, [presetsDisponiveis]);

  // ── Estados de saída ─────────────────────────────────────────
  if (!hydrated) {
    return <Wrap><Skeleton /></Wrap>;
  }
  if (lotes.length === 0) {
    return (
      <Wrap>
        <EstadoVazio />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div style={{ paddingTop: 18 }}>
        <SeletorLote lotes={lotes} value={loteId} onChange={setLoteId} />
      </div>

      {carregando && <Skeleton />}

      {!carregando && erro && (
        <EstadoErro onRetry={() => setNonce((n) => n + 1)} />
      )}

      {!carregando && !erro && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 8 }}>
          {/* PRIMÁRIO — metáfora-hero */}
          <HeroSlot
            modo={modo}
            presetSelecionado={presetSelecionado}
            customRes={customRes}
            breakEven={data.break_even}
            escalaMax={escalaMax}
          />

          {/* SECUNDÁRIO — grade de presets */}
          <GradePresets
            temporais={data.presets.temporais}
            eventos={data.presets.eventos}
            selecionadoId={modo === "preset" ? presetId : ""}
            onSelect={(id) => {
              setPresetId(id);
              setModo("preset");
            }}
          />

          {/* TERCIÁRIO — retrato do período */}
          {modo === "preset" && presetSelecionado && (
            <RetratoPeriodo
              rotulo={presetSelecionado.titulo}
              arroba={presetSelecionado.arroba}
              milho={presetSelecionado.milho}
              precipitacaoMm={presetSelecionado.precipitacao_mm}
              temperaturaC={presetSelecionado.temperatura_c}
            />
          )}
          {modo === "custom" && (
            <RetratoPeriodo
              rotulo="situação custom"
              arroba={customArroba}
              milho={customMilho}
              precipitacaoMm={null}
              temperaturaC={null}
            />
          )}

          {/* ESCONDIDO — progressive disclosure */}
          <SituacaoCustom
            aberto={customAberto}
            onToggle={() => {
              const abrir = !customAberto;
              setCustomAberto(abrir);
              setModo(abrir ? "custom" : "preset");
            }}
            arroba={customArroba}
            milho={customMilho}
            onArrobaChange={(v) => {
              setCustomArroba(v);
              setModo("custom");
            }}
            onMilhoChange={(v) => {
              setCustomMilho(v);
              setModo("custom");
            }}
            arrobaMin={ranges.arrobaMin}
            arrobaMax={ranges.arrobaMax}
            milhoMin={ranges.milhoMin}
            milhoMax={ranges.milhoMax}
          />

          <GraficoTradicional presets={presetsDisponiveis} />
        </div>
      )}
    </Wrap>
  );
}

// ── Hero slot — escolhe a fonte da margem conforme o modo ───────
function HeroSlot({
  modo,
  presetSelecionado,
  customRes,
  breakEven,
  escalaMax,
}: {
  modo: "preset" | "custom";
  presetSelecionado: HistoricoPreset | null;
  customRes: SimuladorCustomResponse | null;
  breakEven: number;
  escalaMax: number;
}) {
  if (modo === "preset" && presetSelecionado) {
    return (
      <MetaforaHeroMargem
        rotuloCenario={presetSelecionado.titulo}
        margemCenario={presetSelecionado.margem_cenario}
        margemBrl={presetSelecionado.margem_cenario_brl}
        margemPct={presetSelecionado.margem_pct}
        breakEven={breakEven}
        escalaMax={escalaMax}
      />
    );
  }
  if (modo === "custom" && customRes) {
    return (
      <MetaforaHeroMargem
        rotuloCenario="situação custom"
        margemCenario={customRes.margem_cenario}
        margemBrl={customRes.margem_cenario_brl}
        margemPct={customRes.margem_pct}
        breakEven={customRes.break_even}
        escalaMax={escalaMax}
      />
    );
  }
  // custom sem resultado ainda (recálculo em curso)
  return (
    <div
      style={{
        borderTop: "0.5px solid var(--rule)",
        paddingTop: 24,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-3)",
      }}
    >
      Calculando cenário…
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 32px 60px" }}>{children}</div>;
}

function Skeleton() {
  return (
    <div
      style={{
        marginTop: 32,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-3)",
      }}
    >
      Carregando situações…
    </div>
  );
}
