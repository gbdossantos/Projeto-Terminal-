"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchVolatilidadeArroba } from "@/lib/api";
import {
  MOCK_LOTES,
  MOCK_MERCADO,
  MOCK_PRECO_TRAVADO,
  fmtBRL,
  fmtData,
  type MockLote,
} from "@/lib/mock-data";
import { listLotes } from "@/lib/lotes-storage";
import { saveDecisao, type IntencaoHedge } from "@/lib/decisoes-storage";

// σ anualizado fallback (caso endpoint falhe). Boi gordo histórico típico.
const SIGMA_FALLBACK = 0.18;

// Hedge fixo no protótipo. Estrutura aceita receber este como prop/state
// futuramente sem refazer a tela (decisão de design: 50/50 hoje, alavanca depois).
const HEDGE_PCT_DEFAULT = 0.5;

// ── Helpers de cálculo ─────────────────────────────────────────
function diasEntreISO(de: string, ate: string): number {
  const d1 = new Date(de).getTime();
  const d2 = new Date(ate).getTime();
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

/**
 * Calcula σ no horizonte do lote (de hoje até a saída).
 * σ_T = σ_anualizado × √(T/252).
 */
function sigmaHorizonte(sigmaAnualizado: number, lote: MockLote): number {
  const dias = diasEntreISO("2026-05-19", lote.data_saida);
  return sigmaAnualizado * Math.sqrt(dias / 252);
}

/**
 * Os dois medos — REGRET REALIZADO PURO (Q1 do plano: frontend, fórmula trivial).
 *
 *   medoTravar    = arrobaTravada × max(0, cenario − precoTravado)
 *   medoNãoTravar = arrobaExposta × max(0, precoTravado − cenario)
 *
 * Um dos dois SEMPRE é R$ 0 (revezamento conforme o cenário cruza o empate).
 * R$ 0 é estado de primeira classe — "NÃO MATERIALIZA", nunca aparência de erro.
 *
 * IMPORTANTE: precoTravado vem da fonte única (MOCK_PRECO_TRAVADO = BGI − basis).
 * Se o engine Hedge expor um dia hedge parcial parametrizável, este cálculo migra
 * para lá. Por enquanto: três linhas, determinístico, auditável.
 */
function calcularMedos(
  cenario: number,
  arrobasLote: number,
  hedgePct: number,
  precoTravado: number,
) {
  const arrobaTravada = arrobasLote * hedgePct;
  const arrobaExposta = arrobasLote * (1 - hedgePct);
  const medoTravar = arrobaTravada * Math.max(0, cenario - precoTravado);
  const medoNaoTravar = arrobaExposta * Math.max(0, precoTravado - cenario);
  const metadeTravadaVale = arrobaTravada * precoTravado;
  const metadeExpostaVale = arrobaExposta * cenario;
  return {
    arrobaTravada,
    arrobaExposta,
    medoTravar,
    medoNaoTravar,
    metadeTravadaVale,
    metadeExpostaVale,
  };
}

export default function SimuladorClient() {
  // Estado vazio: usuario nao tem lote salvo (mesma logica da Home).
  // No prototipo, MOCK_LOTES sempre tem 3, mas o gating cross-tela vem
  // de listLotes() — quando 0 → empty state, quando >0 → state normal.
  const [hydrated, setHydrated] = useState(false);
  const [hasLote, setHasLote] = useState(true);
  useEffect(() => {
    setHasLote(listLotes().length > 0);
    setHydrated(true);
  }, []);

  const [loteId, setLoteId] = useState<string>(MOCK_LOTES[0].id);
  const [sigmaAnual, setSigmaAnual] = useState<number>(SIGMA_FALLBACK);

  const lote = MOCK_LOTES.find((l) => l.id === loteId) ?? MOCK_LOTES[0];

  // σ no horizonte específico do lote
  const sigmaT = useMemo(() => sigmaHorizonte(sigmaAnual, lote), [sigmaAnual, lote]);

  const bgi = MOCK_MERCADO.bgi_q26_ago;
  const precoTravado = MOCK_PRECO_TRAVADO; // 322 − 5 = 317

  // Cenário em R$/@. Default = -1σ
  const cenarioMenos1Sigma = useMemo(() => bgi * (1 - sigmaT), [bgi, sigmaT]);
  const [cenario, setCenario] = useState<number>(cenarioMenos1Sigma);

  // Inputs secundários (milho/dólar) — variação % vs ref
  const [milhoRef] = useState(68.00);
  const [milhoCenario, setMilhoCenario] = useState(68.00);
  const [dolarRef] = useState(5.42);
  const [dolarCenario, setDolarCenario] = useState(5.42);

  // Atualiza endpoint de volatilidade
  useEffect(() => {
    fetchVolatilidadeArroba(90)
      .then((v) => v.sigma_anualizado != null && setSigmaAnual(v.sigma_anualizado))
      .catch(() => {/* fallback ja aplicado */});
  }, []);

  // Recalcula default do cenário quando σ ou lote muda (se usuário não mexeu manualmente)
  // Heurística simples: se cenário atual está dentro de 0.5% do antigo -1σ, atualiza.
  // Para evitar isso ficar mágico, mantemos o cenário do usuário quando ele já editou.
  // (No protótipo, basta que abra em -1σ.)

  const ticks = useMemo(() => [
    { label: "-2σ", value: bgi * (1 - 2 * sigmaT) },
    { label: "-1σ", value: bgi * (1 - sigmaT) },
    { label: "spot", value: bgi },
    { label: "+1σ", value: bgi * (1 + sigmaT) },
    { label: "+2σ", value: bgi * (1 + 2 * sigmaT) },
  ], [bgi, sigmaT]);

  const sliderMin = ticks[0].value * 0.95;
  const sliderMax = ticks[ticks.length - 1].value * 1.05;

  const medos = calcularMedos(cenario, lote.arrobas_totais, HEDGE_PCT_DEFAULT, precoTravado);

  // Sigma posicao do cenário (quantos σ abaixo/acima do BGI)
  const sigmaPosicao = useMemo(() => {
    if (sigmaT === 0) return 0;
    return (cenario - bgi) / (bgi * sigmaT);
  }, [cenario, bgi, sigmaT]);

  // Nota: TopNav é renderizado pelo dashboard layout (app/(dashboard)/layout.tsx).
  // Aqui retornamos só o conteúdo do main.
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 32px 60px" }}>
        {/* Faixa fixa de lote (sticky no scroll) */}
        <SeletorLote loteAtual={lote} onChange={setLoteId} />

        {/* TOPO — Alavancas */}
        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 36,
            borderTop: "0.5px solid var(--rule)",
            paddingTop: 22,
          }}
        >
          {/* Alavanca principal: arroba na saída */}
          <div>
            <p
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "var(--ink-3)",
                marginBottom: 10,
              }}
            >
              ARROBA NA SAÍDA DO LOTE · STRESS PRINCIPAL
            </p>
            <div className="flex items-baseline" style={{ gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 500, color: "var(--ink)" }}>
                R$ <span className="mono-num">{fmtBRL(cenario)}</span>
                <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>/@</span>
              </span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--grafite)",
                padding: "2px 6px",
                background: "var(--grafite-soft)",
                borderRadius: 2,
              }}>
                {sigmaPosicao.toFixed(1)}σ
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                ancorado em BGIQ26 R$ {fmtBRL(bgi)}
              </span>
            </div>

            {/* Slider com ticks σ */}
            <SliderComTicks
              ticks={ticks}
              min={sliderMin}
              max={sliderMax}
              value={cenario}
              onChange={setCenario}
            />

            <div className="flex items-center" style={{ gap: 10, marginTop: 14 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
                ou digite o cenário:
              </span>
              <StepperInput
                value={cenario}
                onChange={setCenario}
                step={0.5}
                suffix="/@"
                width={110}
              />
              <button
                onClick={() => setCenario(bgi)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  background: "none",
                  border: "0.5px solid var(--rule)",
                  borderRadius: 3,
                  padding: "3px 9px",
                  cursor: "pointer",
                  color: "var(--ink-2)",
                }}
              >
                voltar ao spot BGI
              </button>
            </div>
          </div>

          {/* Variáveis secundárias */}
          <div>
            <p
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "var(--ink-3)",
                marginBottom: 10,
              }}
            >
              VARIÁVEIS SECUNDÁRIAS
            </p>
            <AlavancaSecundaria
              titulo="Milho · saca 60kg"
              ref={milhoRef}
              valor={milhoCenario}
              setValor={setMilhoCenario}
              codigo="CCMK26 · milho jul/26"
              papel="custo da ração"
              step={1.0}
            />
            <div style={{ height: 14 }} />
            <AlavancaSecundaria
              titulo="Dólar · PTAX"
              ref={dolarRef}
              valor={dolarCenario}
              setValor={setDolarCenario}
              codigo="USDBRL · dólar comercial"
              papel="exportação · paridade"
              step={0.01}
            />
          </div>
        </section>

        {/* BASE — Os Dois Medos */}
        <section
          style={{
            marginTop: 32,
            borderTop: "0.5px solid var(--rule)",
            paddingTop: 22,
          }}
        >
          <div className="flex items-start justify-between" style={{ marginBottom: 14 }}>
            <div>
              <p
                className="uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "var(--ink-3)",
                  marginBottom: 4,
                }}
              >
                A CONSEQUÊNCIA DO QUE VOCÊ CONTROLOU
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                Os dois medos sobre <span style={{ borderBottom: "1.5px solid var(--ink)" }}>{lote.nome}</span> neste cenário.
              </h2>
            </div>
            <div className="text-right" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              <div style={{ color: "var(--ink-3)" }}>CENÁRIO ARROBA NA SAÍDA</div>
              <div style={{ color: "var(--ink)", fontSize: 13, marginTop: 2 }}>
                R$ <span className="mono-num">{fmtBRL(cenario)}</span>/@
              </div>
              <div style={{ color: "var(--grafite)", fontSize: 10, marginTop: 2 }}>
                {sigmaPosicao >= 0 ? "+" : ""}{sigmaPosicao.toFixed(1)}σ {sigmaPosicao < 0 ? "abaixo" : "acima"} do BGI
              </div>
            </div>
          </div>

          <div
            className="flex items-center"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-2)",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span style={{ color: "var(--ink-3)" }}>sobre o hedge:</span>
            <ChipMono variant="grafite">{(HEDGE_PCT_DEFAULT * 100).toFixed(0)}% travada em BGIQ26</ChipMono>
            <span style={{ color: "var(--ink-3)" }}>·</span>
            <ChipMono variant="grafite">{((1 - HEDGE_PCT_DEFAULT) * 100).toFixed(0)}% exposta ao físico</ChipMono>
            <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>hedge = {(HEDGE_PCT_DEFAULT * 100).toFixed(0)}% alavanca futura · fixa neste protótipo</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 0.6fr 1fr",
              gap: 0,
              border: "0.5px solid var(--rule)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Medo de travar */}
            <BlocoMedo
              tipo="travar"
              hedgeLabel={`${(HEDGE_PCT_DEFAULT * 100).toFixed(0)}% TRAVADA`}
              fonteLabel="BGIQ26 · venda BGI ago/26"
              metadeValor={medos.metadeTravadaVale}
              metadeSubline={`${medos.arrobaTravada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} @ × R$ ${fmtBRL(precoTravado)}/@`}
              metadeLegenda="fixo na saída"
              medoValor={medos.medoTravar}
              medoLegenda={
                medos.medoTravar === 0
                  ? "travar teria apenas protegido neste cenário"
                  : "quanto a metade travada deixou de ganhar porque o boi subiu"
              }
              border="right"
            />

            {/* Ponto de empate */}
            <BlocoEmpate
              precoEmpate={precoTravado}
              vencimento="BGIQ26 · ago/26"
            />

            {/* Medo de não travar */}
            <BlocoMedo
              tipo="naoTravar"
              hedgeLabel={`${((1 - HEDGE_PCT_DEFAULT) * 100).toFixed(0)}% EXPOSTA`}
              fonteLabel="spot MS · exposto ao físico"
              metadeValor={medos.metadeExpostaVale}
              metadeSubline={`${medos.arrobaExposta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} @ × R$ ${fmtBRL(cenario)}/@ ${sigmaPosicao.toFixed(1)}σ`}
              metadeLegenda="variável · depende do cenário"
              medoValor={medos.medoNaoTravar}
              medoLegenda={
                medos.medoNaoTravar === 0
                  ? "não travar teria apenas mantido o ganho neste cenário"
                  : "quanto a metade exposta perdeu porque o mercado caiu"
              }
              align="right"
            />
          </div>

          {/* Microcopy abaixo */}
          <FraseLeitura
            cenario={cenario}
            precoTravado={precoTravado}
            loteNome={lote.nome}
            medos={medos}
          />

          {/* Toggle payoff técnico */}
          <PayoffColapsavel
            cenario={cenario}
            precoTravado={precoTravado}
            arrobasLote={lote.arrobas_totais}
            hedgePct={HEDGE_PCT_DEFAULT}
          />

          <RegistrarDecisao
            lote={lote}
            hedgePct={HEDGE_PCT_DEFAULT}
            cenario={cenario}
            precoTravado={precoTravado}
          />
        </section>

        {hydrated && !hasLote && <SimuladorVazioOverlay />}
    </div>
  );
}

// ─── Estado vazio (overlay nao-bloqueante) ─────────────────────
// Mostra mensagem honesta acima das alavancas mockadas quando nao ha lote salvo.
// (Em produçao com auth, o gating sera completo — protótipo mostra os dados mock
// pra demonstrar a tela, mas a faixa de empty deixa explícito.)
function SimuladorVazioOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "var(--paper)",
        border: "0.5px solid var(--rule-strong)",
        borderRadius: 6,
        padding: "12px 16px",
        maxWidth: 320,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--ink-2)",
        lineHeight: 1.55,
        boxShadow: "0 4px 16px rgba(26, 24, 20, 0.08)",
      }}
    >
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        SEM LOTE CADASTRADO
      </div>
      Sem lote, os dois medos não têm magnitude. Os números acima são exemplo —
      <Link
        href="/lotes"
        style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 2, marginLeft: 4 }}
      >
        cadastre um lote
      </Link>{" "}
      para simular sobre @ suas.
    </div>
  );
}

// ─── CTA Registrar essa decisão ────────────────────────────────
function RegistrarDecisao({
  lote,
  hedgePct,
  cenario,
  precoTravado,
}: {
  lote: MockLote;
  hedgePct: number;
  cenario: number;
  precoTravado: number;
}) {
  const [estado, setEstado] = useState<"closed" | "open" | "saved">("closed");
  const [intencao, setIntencao] = useState<IntencaoHedge>(null);

  const handleSalvar = () => {
    saveDecisao({
      lote_id: lote.id,
      lote_nome: lote.nome,
      hedge_pct: hedgePct,
      cenario_arroba: cenario,
      preco_travado: precoTravado,
      intencao,
    });
    setEstado("saved");
    setTimeout(() => {
      setEstado("closed");
      setIntencao(null);
    }, 2800);
  };

  if (estado === "saved") {
    return (
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: "rgba(61, 122, 42, 0.08)",
          border: "0.5px solid rgba(61, 122, 42, 0.35)",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--gain)",
        }}
      >
        ✓ Decisão registrada — disponível no Histórico.
      </div>
    );
  }

  if (estado === "open") {
    return (
      <div
        style={{
          marginTop: 20,
          padding: "16px 20px",
          background: "var(--paper-2)",
          border: "0.5px solid var(--rule)",
          borderRadius: 6,
        }}
      >
        <div
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
            marginBottom: 10,
          }}
        >
          REGISTRAR ESTA SIMULAÇÃO
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--ink)",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          {lote.nome} · cenário R$ <span className="mono-num">{fmtBRL(cenario)}</span>/@ · {(hedgePct * 100).toFixed(0)}% travada.<br />
          <span style={{ color: "var(--ink-2)", fontSize: 12 }}>
            Se você tivesse que decidir hoje, o que faria?
          </span>
        </div>
        <div className="flex" style={{ gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setIntencao("travaria")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              background: intencao === "travaria" ? "var(--ink)" : "var(--paper)",
              color: intencao === "travaria" ? "var(--paper)" : "var(--ink)",
              border: "0.5px solid",
              borderColor: intencao === "travaria" ? "var(--ink)" : "var(--rule)",
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Eu travaria
          </button>
          <button
            onClick={() => setIntencao("nao_travaria")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              background: intencao === "nao_travaria" ? "var(--ink)" : "var(--paper)",
              color: intencao === "nao_travaria" ? "var(--paper)" : "var(--ink)",
              border: "0.5px solid",
              borderColor: intencao === "nao_travaria" ? "var(--ink)" : "var(--rule)",
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Eu NÃO travaria
          </button>
          <button
            onClick={() => setIntencao(null)}
            style={{
              padding: "8px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              background: "var(--paper)",
              color: intencao === null ? "var(--ink)" : "var(--ink-3)",
              border: "0.5px solid",
              borderColor: intencao === null ? "var(--ink)" : "var(--rule)",
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            só salvar cenário
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setEstado("closed"); setIntencao(null); }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--ink-3)",
            }}
          >
            cancelar
          </button>
          <button
            onClick={handleSalvar}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 4,
              padding: "8px 18px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Registrar →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between" style={{ marginTop: 22 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
        o Terminal não executa — esse registro vira histórico de cenários.
      </span>
      <button
        onClick={() => setEstado("open")}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          background: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          borderRadius: 4,
          padding: "10px 20px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        Registrar essa decisão →
      </button>
    </div>
  );
}

// ─── Seletor de lote (sticky) ────────────────────────────────────
function SeletorLote({ loteAtual, onChange }: { loteAtual: MockLote; onChange: (id: string) => void }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        position: "sticky",
        top: 0,
        background: "var(--paper)",
        padding: "16px 0 14px",
        marginTop: 18,
        zIndex: 10,
      }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: "var(--ink-3)",
          }}
        >
          SIMULAR SOBRE O LOTE
        </span>
        <div className="flex" style={{ gap: 6 }}>
          {MOCK_LOTES.map((l) => {
            const ativo = l.id === loteAtual.id;
            return (
              <button
                key={l.id}
                onClick={() => onChange(l.id)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  padding: "5px 12px",
                  background: ativo ? "var(--ink)" : "var(--paper-2)",
                  color: ativo ? "var(--paper)" : "var(--ink-2)",
                  border: "0.5px solid",
                  borderColor: ativo ? "var(--ink)" : "var(--rule)",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontWeight: ativo ? 500 : 400,
                }}
              >
                {l.nome}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    marginLeft: 6,
                    opacity: 0.7,
                  }}
                >
                  {l.num_animais.toLocaleString("pt-BR")} cab
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}>
        <span className="mono-num">{loteAtual.num_animais.toLocaleString("pt-BR")}</span> cab ×{" "}
        <span className="mono-num">{loteAtual.arrobas_por_cabeca}</span> @/cab ={" "}
        <span style={{ color: "var(--ink)", fontWeight: 500 }} className="mono-num">
          {loteAtual.arrobas_totais.toLocaleString("pt-BR")}
        </span>{" "}
        @ expostas
        <span style={{ color: "var(--ink-3)", marginLeft: 8 }}>· saída {fmtData(loteAtual.data_saida)}</span>
      </div>
    </div>
  );
}

// ─── Slider com ticks σ ──────────────────────────────────────────
function SliderComTicks({
  ticks,
  min,
  max,
  value,
  onChange,
}: {
  ticks: Array<{ label: string; value: number }>;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ position: "relative", paddingTop: 4 }}>
      <input
        type="range"
        className="scenario-slider"
        min={min}
        max={max}
        step={0.5}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
      <div className="flex justify-between" style={{ marginTop: 6, position: "relative" }}>
        {ticks.map((t) => {
          const isSpot = t.label === "spot";
          return (
            <button
              key={t.label}
              onClick={() => onChange(t.value)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: isSpot ? "var(--ink)" : "var(--ink-3)",
                fontWeight: isSpot ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stepper input ───────────────────────────────────────────────
function StepperInput({
  value,
  onChange,
  step,
  suffix,
  width,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix?: string;
  width?: number;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        border: "0.5px solid var(--rule)",
        borderRadius: 3,
        background: "var(--paper)",
        width,
      }}
    >
      <button
        onClick={() => onChange(value - step)}
        style={{
          background: "none",
          border: "none",
          padding: "3px 8px",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-2)",
        }}
      >
        −
      </button>
      <input
        type="number"
        className="sim-input"
        value={value.toFixed(step < 1 ? 2 : 0)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        style={{
          width: 60,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--ink)",
          padding: "3px 0",
        }}
      />
      {suffix && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>
          {suffix}
        </span>
      )}
      <button
        onClick={() => onChange(value + step)}
        style={{
          background: "none",
          border: "none",
          padding: "3px 8px",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-2)",
        }}
      >
        +
      </button>
    </div>
  );
}

// ─── Alavanca secundária (milho/dólar) ──────────────────────────
function AlavancaSecundaria({
  titulo,
  ref: refValor,
  valor,
  setValor,
  codigo,
  papel,
  step,
}: {
  titulo: string;
  ref: number;
  valor: number;
  setValor: (v: number) => void;
  codigo: string;
  papel: string;
  step: number;
}) {
  const variacaoPct = refValor > 0 ? ((valor - refValor) / refValor) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
            {titulo}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--grafite)", marginLeft: 8 }}>
            {codigo}
          </span>
        </div>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--ink-3)",
            letterSpacing: "0.06em",
          }}
        >
          {papel}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 10 }}>
        <input
          type="range"
          className="scenario-slider"
          min={refValor * 0.7}
          max={refValor * 1.3}
          step={step}
          value={valor}
          onChange={(e) => setValor(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
        <StepperInput value={valor} onChange={setValor} step={step} width={110} />
      </div>
      <div className="flex items-center" style={{ gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--grafite)" }}>
          ref <span className="mono-num">{fmtBRL(refValor, step < 1 ? 2 : 0)}</span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: variacaoPct === 0
              ? "var(--ink-3)"
              : variacaoPct > 0
                ? "var(--gain)"
                : "var(--loss)",
          }}
        >
          ({variacaoPct >= 0 ? "+" : ""}{variacaoPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// ─── Bloco "Medo" ────────────────────────────────────────────────
function BlocoMedo({
  tipo,
  hedgeLabel,
  fonteLabel,
  metadeValor,
  metadeSubline,
  metadeLegenda,
  medoValor,
  medoLegenda,
  border,
  align,
}: {
  tipo: "travar" | "naoTravar";
  hedgeLabel: string;
  fonteLabel: string;
  metadeValor: number;
  metadeSubline: string;
  metadeLegenda: string;
  medoValor: number;
  medoLegenda: string;
  border?: "right";
  align?: "right";
}) {
  const tituloPrefix = tipo === "travar" ? "SE VOCÊ TRAVAR HOJE" : "SE VOCÊ NÃO TRAVAR";
  const naoMaterializa = medoValor === 0;

  return (
    <div
      style={{
        padding: "18px 22px",
        borderRight: border === "right" ? "0.5px solid var(--rule)" : "none",
        textAlign: align,
        background: "var(--paper-2)",
      }}
    >
      <div className="flex items-baseline" style={{ gap: 8, marginBottom: 10, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          {tituloPrefix}
        </span>
        <ChipMono variant="grafite">{hedgeLabel}</ChipMono>
      </div>
      <div style={{ marginBottom: 14 }}>
        <ChipMono variant="grafite">{fonteLabel.split(" · ")[0]}</ChipMono>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", marginLeft: 6 }}>
          {fonteLabel.split(" · ").slice(1).join(" · ")}
        </span>
      </div>

      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 6,
        }}
      >
        ESSA METADE VALE NA SAÍDA
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 30,
          fontWeight: 500,
          color: "var(--ink)",
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        R$ <span className="mono-num">{fmtBRL(metadeValor / 1_000_000)}</span> mi
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 4 }}>
        {metadeSubline}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
        {metadeLegenda}
      </div>

      <div style={{ height: 18 }} />

      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 6,
        }}
      >
        {tipo === "travar" ? "MEDO DE TRAVAR" : "MEDO DE NÃO TRAVAR"}
      </div>
      {naoMaterializa ? (
        <div>
          <div className="flex items-baseline" style={{ gap: 8, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                color: "var(--ink-3)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              R$ 0
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                padding: "2px 6px",
                background: "var(--paper-3)",
                color: "var(--ink-3)",
                borderRadius: 2,
                letterSpacing: "0.04em",
              }}
            >
              NÃO MATERIALIZA
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
            {medoLegenda}
          </div>
        </div>
      ) : (
        <div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 30,
              fontWeight: 500,
              color: "var(--loss)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            R$ <span className="mono-num">{fmtBRL(medoValor / 1_000_000)}</span> mi
          </span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 4 }}>
            {medoLegenda}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloco "Ponto de empate" ──────────────────────────────────
function BlocoEmpate({ precoEmpate, vencimento }: { precoEmpate: number; vencimento: string }) {
  return (
    <div
      style={{
        padding: "18px 14px",
        background: "var(--paper-3)",
        borderLeft: "0.5px solid var(--rule)",
        borderRight: "0.5px solid var(--rule)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 10,
        }}
      >
        PONTO DE EMPATE
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 36,
          fontWeight: 500,
          color: "var(--ink)",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        R$ <span className="mono-num">{fmtBRL(precoEmpate, 0)}</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", marginTop: 2 }}>
        /@
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--ink-2)",
          lineHeight: 1.4,
          marginTop: 14,
          maxWidth: 200,
        }}
      >
        cenário em que qualquer fração de hedge entrega o mesmo resultado
      </div>
      <div style={{ marginTop: 12 }}>
        <ChipMono variant="grafite">{vencimento}</ChipMono>
      </div>
    </div>
  );
}

// ─── Frase de leitura (microcopy abaixo) ─────────────────────────
function FraseLeitura({
  cenario,
  precoTravado,
  loteNome,
  medos,
}: {
  cenario: number;
  precoTravado: number;
  loteNome: string;
  medos: ReturnType<typeof calcularMedos>;
}) {
  const cenarioAbaixoEmpate = cenario < precoTravado;
  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 16px",
        background: "var(--paper-2)",
        border: "0.5px solid var(--rule)",
        borderRadius: 4,
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.55,
      }}
    >
      {cenarioAbaixoEmpate ? (
        <>
          Com {(0.5 * 100).toFixed(0)}% travada, neste cenário de queda você evitou{" "}
          <strong style={{ color: "var(--ink)" }}>
            R$ <span className="mono-num">{fmtBRL(medos.medoNaoTravar / 1_000_000)}</span> mi
          </strong>{" "}
          na metade protegida e <em style={{ color: "var(--loss)" }}>perdeu</em>{" "}
          <strong style={{ color: "var(--loss)" }}>
            R$ <span className="mono-num">{fmtBRL(medos.medoNaoTravar / 1_000_000)}</span> mi
          </strong>{" "}
          na metade exposta sobre {loteNome}. Arraste o cenário para acima do empate{" "}
          (R$ <span className="mono-num">{fmtBRL(precoTravado, 0)}</span>) para ver como isso se inverte se o boi subir.
        </>
      ) : (
        <>
          Com {(0.5 * 100).toFixed(0)}% travada, neste cenário de alta você{" "}
          <em style={{ color: "var(--loss)" }}>deixou de ganhar</em>{" "}
          <strong style={{ color: "var(--loss)" }}>
            R$ <span className="mono-num">{fmtBRL(medos.medoTravar / 1_000_000)}</span> mi
          </strong>{" "}
          na metade travada e capturou ganho na metade exposta sobre {loteNome}.
          Arraste o cenário para abaixo do empate (R$ <span className="mono-num">{fmtBRL(precoTravado, 0)}</span>) para ver como isso se inverte se o boi cair.
        </>
      )}
    </div>
  );
}

// ─── Payoff colapsável ───────────────────────────────────────────
function PayoffColapsavel({
  cenario,
  precoTravado,
  arrobasLote,
  hedgePct,
}: {
  cenario: number;
  precoTravado: number;
  arrobasLote: number;
  hedgePct: number;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ marginTop: 18 }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-2)",
          letterSpacing: "0.04em",
        }}
      >
        {aberto ? "↑" : "↓"} VER O GRÁFICO DE PAYOFF (TÉCNICO)
      </button>
      {aberto && (
        <div
          style={{
            marginTop: 12,
            padding: "14px 16px",
            background: "var(--paper-2)",
            border: "0.5px solid var(--rule)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-2)",
            lineHeight: 1.7,
          }}
        >
          <div style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.06em", marginBottom: 8 }}>
            PAYOFF NA SAÍDA — DETALHE
          </div>
          <div>posição: {arrobasLote.toLocaleString("pt-BR")} @ — {(hedgePct * 100).toFixed(0)}% via BGI, {((1 - hedgePct) * 100).toFixed(0)}% via spot</div>
          <div>preço travado (BGI − basis): R$ <span className="mono-num">{fmtBRL(precoTravado)}</span> /@</div>
          <div>cenário spot atual: R$ <span className="mono-num">{fmtBRL(cenario)}</span> /@</div>
          <div>função: receita_total = arr_travada × precoTravado + arr_exposta × cenário</div>
          <div style={{ marginTop: 8, color: "var(--ink-3)" }}>
            gráfico continuo do payoff sobre o range de cenários (em construção).
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ChipMono ────────────────────────────────────────────────────
function ChipMono({ variant, children }: { variant: "grafite" | "loss"; children: React.ReactNode }) {
  const bg = variant === "loss" ? "rgba(181, 65, 52, 0.10)" : "var(--grafite-soft)";
  const color = variant === "loss" ? "var(--loss)" : "var(--grafite)";
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        padding: "1px 5px",
        background: bg,
        color,
        borderRadius: 2,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}
