"use client";

/**
 * Import de lotes via planilha — botão + modal de preview.
 *
 * Fluxo:
 *  1. Usuário clica "Importar planilha" → file picker
 *  2. Parseia CSV/XLSX → valida → abre modal de preview
 *  3. Preview: tabela densa com edit inline + delete linha + contador
 *  4. Botão "Importar" só ativa quando 0 erros → batch save → reload /lotes
 *
 * Paleta: V19. Cor de erro = âmbar discreto (--warning), não vermelho.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, X, Trash2, Loader2, Sparkles } from "lucide-react";
import { parseArquivo } from "@/lib/import-lotes/parse";
import { validarTodas, contar, validarLinha } from "@/lib/import-lotes/validate";
import { batchImport, type BatchProgress } from "@/lib/import-lotes/batch-save";
import { baixarCsv, baixarXlsx } from "@/lib/import-lotes/template";
import { CAMPOS, campoAplicavel } from "@/lib/import-lotes/schema";
import { sugerirColunas } from "@/lib/api";
import type { LinhaValidada } from "@/lib/import-lotes/validate";
import type { LinhaBruta, HeaderDesconhecido } from "@/lib/import-lotes/parse";
import type { SugestaoColuna } from "@/lib/types";

export function ImportPlanilha() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<LinhaValidada[]>([]);
  /** Map linha_original → celulas brutas (pra reusar quando editar inline). */
  const [celulasOriginais, setCelulasOriginais] = useState<Record<number, Record<string, string>>>({});
  const [erroParse, setErroParse] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState<BatchProgress | null>(null);
  const [menuTemplateAberto, setMenuTemplateAberto] = useState(false);
  const router = useRouter();

  // ─── Sugestão fuzzy de colunas (LLM) ────────────────────────────
  const [headersDesconhecidos, setHeadersDesconhecidos] = useState<HeaderDesconhecido[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoColuna[]>([]);
  const [sugestoesStatus, setSugestoesStatus] = useState<"idle" | "carregando" | "ok" | "erro">("idle");
  const [sugestoesErro, setSugestoesErro] = useState<string | null>(null);
  const [headersResolvidos, setHeadersResolvidos] = useState<Set<string>>(new Set());

  const { ok, comErro } = useMemo(() => contar(linhas), [linhas]);

  // ─── Abrir picker ─────────────────────────────────────────────
  const handleClickImportar = () => {
    fileRef.current?.click();
  };

  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroParse(null);
    try {
      const res = await parseArquivo(file);
      if (res.linhas.length === 0) {
        setErroParse("Planilha vazia ou só com cabeçalho.");
        return;
      }
      const validadas = validarTodas(res.linhas);
      setLinhas(validadas);
      const map: Record<number, Record<string, string>> = {};
      for (const l of res.linhas) map[l.linha] = l.celulas;
      setCelulasOriginais(map);

      // Sugestão fuzzy de colunas (LLM) — não bloqueia abertura do modal
      setHeadersDesconhecidos(res.headersDesconhecidos);
      setHeadersResolvidos(new Set());
      setSugestoes([]);
      setSugestoesStatus("idle");
      setSugestoesErro(null);
      setAberto(true);
      if (res.headersDesconhecidos.length > 0) {
        buscarSugestoes(res.headersDesconhecidos);
      }
    } catch (err) {
      setErroParse(err instanceof Error ? err.message : "Falha ao ler arquivo.");
    } finally {
      // Permite re-importar o mesmo arquivo
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ─── Sugestão fuzzy de colunas (LLM) ────────────────────────────
  const buscarSugestoes = async (headers: HeaderDesconhecido[]) => {
    setSugestoesStatus("carregando");
    setSugestoesErro(null);
    try {
      const camposDisponiveis = CAMPOS.map((c) => ({ nome: c.nome, label: c.label }));
      const res = await sugerirColunas(headers.map((h) => h.original), camposDisponiveis);
      setSugestoes(res.sugestoes);
      setSugestoesStatus("ok");
    } catch (err) {
      setSugestoesStatus("erro");
      setSugestoesErro(err instanceof Error ? err.message : "Falha ao buscar sugestão.");
    }
  };

  /** Aplica a correspondência sugerida: copia o valor da coluna desconhecida
   * pro campo canônico em todas as linhas, e re-valida. */
  const aplicarSugestao = (headerNormalizado: string, campoNome: string) => {
    const novoCelulasOriginais: Record<number, Record<string, string>> = {};
    for (const [linhaKey, celulas] of Object.entries(celulasOriginais)) {
      const valor = celulas[headerNormalizado];
      novoCelulasOriginais[Number(linhaKey)] =
        valor !== undefined ? { ...celulas, [campoNome]: valor } : celulas;
    }
    setCelulasOriginais(novoCelulasOriginais);
    setLinhas((prev) =>
      prev.map((l) =>
        validarLinha({ linha: l.linha, celulas: novoCelulasOriginais[l.linha] ?? {} }),
      ),
    );
    setHeadersResolvidos((prev) => new Set(prev).add(headerNormalizado));
  };

  const ignorarSugestao = (headerNormalizado: string) => {
    setHeadersResolvidos((prev) => new Set(prev).add(headerNormalizado));
  };

  // ─── Edição inline ────────────────────────────────────────────
  const editarCelula = (linhaIdx: number, campoNome: string, novoValor: string) => {
    setLinhas((prev) => {
      const copia = [...prev];
      const item = copia[linhaIdx];
      if (!item) return prev;
      // Atualiza celulas originais
      const novasCelulas = { ...(celulasOriginais[item.linha] ?? {}) };
      novasCelulas[campoNome] = novoValor;
      setCelulasOriginais((c) => ({ ...c, [item.linha]: novasCelulas }));
      // Re-valida
      const novaLinha: LinhaBruta = { linha: item.linha, celulas: novasCelulas };
      copia[linhaIdx] = validarLinha(novaLinha);
      return copia;
    });
  };

  const excluirLinha = (linhaIdx: number) => {
    setLinhas((prev) => prev.filter((_, i) => i !== linhaIdx));
  };

  // ─── Importar (batch save) ────────────────────────────────────
  const handleImportar = async () => {
    if (comErro > 0 || ok === 0) return;
    setImportando(true);
    setProgresso({ feitos: 0, total: ok, erros: [] });
    const validas = linhas.filter((l) => l.ok);
    const res = await batchImport(validas, (p) => setProgresso(p));
    setImportando(false);

    if (res.falhas.length === 0) {
      // Sucesso: fecha modal e força reload da lista
      setAberto(false);
      setLinhas([]);
      router.refresh();
      // Hack: reload da página garante LotesSalvosList re-monte
      // (LotesSalvosList lê de localStorage, mas tem reloadKey)
      window.location.reload();
    } else {
      // Algumas falhas: mantém modal aberto pro usuário ver
      // (já está com progresso visível).
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Botões */}
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleArquivoSelecionado}
          style={{ display: "none" }}
        />
        <BotaoSecundario onClick={handleClickImportar} icone={<Upload size={14} />}>
          Importar planilha
        </BotaoSecundario>
        {/* Template dropdown */}
        <div style={{ position: "relative" }}>
          <BotaoSecundario
            onClick={() => setMenuTemplateAberto((v) => !v)}
            icone={<Download size={14} />}
          >
            Baixar template
          </BotaoSecundario>
          {menuTemplateAberto && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--paper-2)",
                border: "1px solid var(--rule)",
                borderRadius: 7,
                boxShadow: "var(--shadow-pop)",
                zIndex: 20,
                minWidth: 160,
              }}
            >
              <ItemMenu
                onClick={() => {
                  baixarCsv();
                  setMenuTemplateAberto(false);
                }}
              >
                CSV (.csv)
              </ItemMenu>
              <ItemMenu
                onClick={() => {
                  baixarXlsx();
                  setMenuTemplateAberto(false);
                }}
              >
                Excel (.xlsx)
              </ItemMenu>
            </div>
          )}
        </div>
      </div>

      {/* Erro de parse (não abriu o modal) */}
      {erroParse && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            border: "1px solid var(--ring-soft)",
            background: "var(--warning-bg)",
            borderRadius: 7,
            color: "var(--warning)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
          }}
        >
          {erroParse}
        </div>
      )}

      {/* Modal de preview */}
      {aberto && (
        <ModalPreview
          linhas={linhas}
          celulasOriginais={celulasOriginais}
          ok={ok}
          comErro={comErro}
          importando={importando}
          progresso={progresso}
          headersDesconhecidos={headersDesconhecidos}
          sugestoes={sugestoes}
          sugestoesStatus={sugestoesStatus}
          sugestoesErro={sugestoesErro}
          headersResolvidos={headersResolvidos}
          onAplicarSugestao={aplicarSugestao}
          onIgnorarSugestao={ignorarSugestao}
          onEditar={editarCelula}
          onExcluir={excluirLinha}
          onFechar={() => {
            if (!importando) {
              setAberto(false);
              setLinhas([]);
              setProgresso(null);
              setHeadersDesconhecidos([]);
              setSugestoes([]);
              setSugestoesStatus("idle");
              setSugestoesErro(null);
              setHeadersResolvidos(new Set());
            }
          }}
          onImportar={handleImportar}
        />
      )}
    </>
  );
}

// ─── Modal ───────────────────────────────────────────────────────
function ModalPreview({
  linhas,
  celulasOriginais,
  ok,
  comErro,
  importando,
  progresso,
  headersDesconhecidos,
  sugestoes,
  sugestoesStatus,
  sugestoesErro,
  headersResolvidos,
  onAplicarSugestao,
  onIgnorarSugestao,
  onEditar,
  onExcluir,
  onFechar,
  onImportar,
}: {
  linhas: LinhaValidada[];
  celulasOriginais: Record<number, Record<string, string>>;
  ok: number;
  comErro: number;
  importando: boolean;
  progresso: BatchProgress | null;
  headersDesconhecidos: HeaderDesconhecido[];
  sugestoes: SugestaoColuna[];
  sugestoesStatus: "idle" | "carregando" | "ok" | "erro";
  sugestoesErro: string | null;
  headersResolvidos: Set<string>;
  onAplicarSugestao: (headerNormalizado: string, campoNome: string) => void;
  onIgnorarSugestao: (headerNormalizado: string) => void;
  onEditar: (linhaIdx: number, campoNome: string, valor: string) => void;
  onExcluir: (linhaIdx: number) => void;
  onFechar: () => void;
  onImportar: () => void;
}) {
  // Colunas: nome_lote, sistema_produtivo, todos os campos numéricos
  // (mesma ordem do schema, exceto que sistema vem em segundo)
  const colunas = CAMPOS;

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importando) onFechar();
      }}
    >
      <div
        style={{
          background: "var(--paper)",
          borderRadius: 10,
          width: "100%",
          maxWidth: 1400,
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--rule)",
          boxShadow: "0 20px 50px -20px var(--overlay)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "0.5px solid var(--rule)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
              Revisar import
            </h2>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 4,
              }}
            >
              <span style={{ color: "var(--ink)" }}>
                <span className="mono-num">{ok}</span> lotes prontos
              </span>
              {" · "}
              <span style={{ color: comErro > 0 ? "var(--warning)" : "var(--ink-3)" }}>
                <span className="mono-num">{comErro}</span> com erro
              </span>
            </p>
          </div>
          <button
            onClick={onFechar}
            disabled={importando}
            style={{
              background: "none",
              border: "none",
              cursor: importando ? "not-allowed" : "pointer",
              color: "var(--ink-3)",
              padding: 6,
              opacity: importando ? 0.5 : 1,
            }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <PainelSugestoesColunas
          headersDesconhecidos={headersDesconhecidos}
          sugestoes={sugestoes}
          status={sugestoesStatus}
          erro={sugestoesErro}
          headersResolvidos={headersResolvidos}
          onAplicar={onAplicarSugestao}
          onIgnorar={onIgnorarSugestao}
        />

        {/* Tabela */}
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {linhas.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--ink-3)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
              }}
            >
              Todas as linhas foram removidas.
            </div>
          ) : (
            <table
              style={{
                borderCollapse: "collapse",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "var(--paper-2)",
                  zIndex: 2,
                }}
              >
                <tr>
                  <th style={thStyle}>#</th>
                  {colunas.map((c) => (
                    <th key={c.nome} style={thStyle} title={c.label}>
                      {c.nome}
                    </th>
                  ))}
                  <th style={{ ...thStyle, position: "sticky", right: 0, background: "var(--paper-2)" }} />
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => (
                  <LinhaTabela
                    key={linha.linha}
                    linha={linha}
                    idx={idx}
                    celulas={celulasOriginais[linha.linha] ?? {}}
                    colunas={colunas}
                    onEditar={onEditar}
                    onExcluir={onExcluir}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px",
            borderTop: "0.5px solid var(--rule)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {importando && progresso ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }}>
              <Loader2 size={14} className="animate-spin" />
              Calculando <span className="mono-num">{progresso.feitos}</span> de{" "}
              <span className="mono-num">{progresso.total}</span>
              {progresso.erros.length > 0 && (
                <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                  · {progresso.erros.length} falhou no backend
                </span>
              )}
            </div>
          ) : (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--ink-3)" }}>
              {comErro > 0
                ? `Resolva os ${comErro} erros (âmbar) pra ativar o botão.`
                : `${ok} lote(s) serão calculados e adicionados aos lotes salvos.`}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <BotaoSecundario onClick={onFechar} disabled={importando}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario
              onClick={onImportar}
              disabled={comErro > 0 || ok === 0 || importando}
            >
              {importando ? "Importando..." : `Importar ${ok}`}
            </BotaoPrimario>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Painel de sugestão fuzzy de colunas (LLM) ────────────────────
// Só aparece quando há headers que não bateram exato no schema. Nunca
// aplica sozinho — cada sugestão precisa de clique explícito do usuário.
function PainelSugestoesColunas({
  headersDesconhecidos,
  sugestoes,
  status,
  erro,
  headersResolvidos,
  onAplicar,
  onIgnorar,
}: {
  headersDesconhecidos: HeaderDesconhecido[];
  sugestoes: SugestaoColuna[];
  status: "idle" | "carregando" | "ok" | "erro";
  erro: string | null;
  headersResolvidos: Set<string>;
  onAplicar: (headerNormalizado: string, campoNome: string) => void;
  onIgnorar: (headerNormalizado: string) => void;
}) {
  const pendentes = headersDesconhecidos.filter((h) => !headersResolvidos.has(h.normalizado));
  if (pendentes.length === 0) return null;

  return (
    <div
      style={{
        padding: "10px 22px",
        borderBottom: "0.5px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--warning-bg)",
      }}
    >
      {status === "carregando" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-sans)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          <Loader2 size={12} className="animate-spin" />
          Buscando sugestão pra {pendentes.length} coluna(s) não reconhecida(s)...
        </div>
      )}

      {status === "erro" && (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--warning)" }}>
          Sugestão automática indisponível ({erro}). As colunas abaixo não serão
          importadas — renomeie pra bater com o template ou mapeie manualmente:{" "}
          {pendentes.map((h) => h.original).join(", ")}
        </div>
      )}

      {status === "ok" &&
        pendentes.map((h) => {
          const sugestao = sugestoes.find((s) => s.header_original === h.original);
          const campo = sugestao?.campo_sugerido
            ? CAMPOS.find((c) => c.nome === sugestao.campo_sugerido)
            : null;

          if (!campo) {
            return (
              <div
                key={h.normalizado}
                style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--ink-3)" }}
              >
                Coluna não reconhecida: <strong>{h.original}</strong> — nenhuma correspondência
                sugerida.
              </div>
            );
          }

          return (
            <div
              key={h.normalizado}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--ink)",
                flexWrap: "wrap",
              }}
            >
              <Sparkles size={13} style={{ color: "var(--warning)", flexShrink: 0 }} />
              <span>
                Coluna <strong>&quot;{h.original}&quot;</strong> parece ser{" "}
                <strong>{campo.label}</strong>{" "}
                <span style={{ color: "var(--ink-3)" }}>(confiança {sugestao!.confianca})</span>
              </span>
              <button
                onClick={() => onAplicar(h.normalizado, campo.nome)}
                style={{
                  padding: "3px 10px",
                  background: "var(--ink)",
                  color: "var(--paper)",
                  border: "none",
                  borderRadius: 5,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Usar correspondência
              </button>
              <button
                onClick={() => onIgnorar(h.normalizado)}
                style={{
                  padding: "3px 10px",
                  background: "transparent",
                  color: "var(--ink-3)",
                  border: "1px solid var(--rule)",
                  borderRadius: 5,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Ignorar
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ─── Linha da tabela ────────────────────────────────────────────
function LinhaTabela({
  linha,
  idx,
  celulas,
  colunas,
  onEditar,
  onExcluir,
}: {
  linha: LinhaValidada;
  idx: number;
  celulas: Record<string, string>;
  colunas: typeof CAMPOS;
  onEditar: (linhaIdx: number, campoNome: string, valor: string) => void;
  onExcluir: (linhaIdx: number) => void;
}) {
  return (
    <tr
      style={{
        borderTop: "0.5px solid var(--rule)",
      }}
    >
      <td style={{ ...tdStyle, color: "var(--ink-3)", textAlign: "right", paddingRight: 10 }}>
        {linha.linha}
      </td>
      {colunas.map((c) => {
        const erro = linha.errosPorCampo[c.nome];
        // Pós-refactor: aplicabilidade depende da combinação (fase, sistema).
        // Se algum dos dois ainda não foi resolvido, mostra aplicável (estado provisório).
        const aplicavel =
          linha.fase && linha.sistema
            ? campoAplicavel(c, linha.fase, linha.sistema)
            : true;
        const valor = celulas[c.nome] ?? "";
        return (
          <td
            key={c.nome}
            style={{
              ...tdStyle,
              background: erro ? "var(--warning-bg)" : "transparent",
              borderLeft: erro ? "2px solid var(--warning)" : "0.5px solid transparent",
            }}
            title={erro ? `${c.label}: ${erro}` : c.label}
          >
            <CelulaEditavel
              valor={valor}
              erro={erro}
              aplicavel={aplicavel}
              onChange={(v) => onEditar(idx, c.nome, v)}
            />
            {erro && (
              <div
                style={{
                  fontSize: 9,
                  color: "var(--warning)",
                  marginTop: 2,
                  fontFamily: "var(--font-sans)",
                  letterSpacing: 0,
                }}
              >
                {erro}
              </div>
            )}
          </td>
        );
      })}
      <td
        style={{
          ...tdStyle,
          position: "sticky",
          right: 0,
          background: "var(--paper)",
          borderLeft: "0.5px solid var(--rule)",
        }}
      >
        <button
          onClick={() => onExcluir(idx)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-3)",
            padding: 4,
          }}
          title="Excluir linha"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

function CelulaEditavel({
  valor,
  erro,
  aplicavel,
  onChange,
}: {
  valor: string;
  erro?: string;
  aplicavel: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      disabled={!aplicavel && !erro}
      style={{
        width: "100%",
        minWidth: 90,
        background: "transparent",
        border: "none",
        padding: "2px 4px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: erro ? "var(--warning)" : aplicavel ? "var(--ink)" : "var(--ink-3)",
        outline: "none",
        fontVariantNumeric: "tabular-nums",
      }}
      onFocus={(e) => (e.target.style.background = "var(--paper-2)")}
      onBlur={(e) => (e.target.style.background = "transparent")}
    />
  );
}

// ─── Botões ──────────────────────────────────────────────────────
function BotaoSecundario({
  onClick,
  disabled,
  icone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        borderRadius: 7,
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--ink)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 120ms",
      }}
    >
      {icone}
      {children}
    </button>
  );
}

function BotaoPrimario({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 16px",
        background: disabled ? "var(--paper-3)" : "var(--ink)",
        color: disabled ? "var(--ink-3)" : "var(--paper)",
        border: "1px solid",
        borderColor: disabled ? "var(--rule)" : "var(--ink)",
        borderRadius: 7,
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ItemMenu({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 14px",
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--ink)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

// ─── Estilos da tabela ──────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  borderBottom: "0.5px solid var(--rule)",
  whiteSpace: "nowrap",
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};
