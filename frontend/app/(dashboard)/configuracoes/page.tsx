"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  getProfile,
  saveProfile,
  ESTADOS,
  SISTEMAS_OPCOES,
  BASIS_VALOR_POR_ESTADO,
  type FarmProfile,
} from "@/lib/profile";
import { Bandeira } from "@/lib/bandeiras";
import { ComboboxCidade } from "@/components/ui/ComboboxCidade";

/**
 * Tela /configuracoes — V19.
 *
 * 4 seções (Perfil / Localização / Operação / Aparência) em cards r-12.
 * Salvar global com estado dirty + toast. Validação inline.
 */
export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<FarmProfile>(getProfile());
  const [savedProfile, setSavedProfile] = useState<FarmProfile>(getProfile());
  const [toast, setToast] = useState<string | null>(null);
  const [erros, setErros] = useState<Partial<Record<keyof FarmProfile, string>>>({});

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setSavedProfile(p);
  }, []);

  // Detecta diff (estado dirty)
  const dirty = useMemo(
    () => JSON.stringify(profile) !== JSON.stringify(savedProfile),
    [profile, savedProfile],
  );

  const set = <K extends keyof FarmProfile>(key: K, value: FarmProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    if (erros[key]) setErros((e) => ({ ...e, [key]: undefined }));
  };

  // Quando o estado muda, sugere o basis valor padrão (mas user pode editar)
  const setEstado = (uf: string) => {
    const sugestao = BASIS_VALOR_POR_ESTADO[uf] ?? 0;
    setProfile((p) => ({ ...p, estado: uf, basis_valor: sugestao }));
    if (erros.estado) setErros((e) => ({ ...e, estado: undefined }));
  };

  const validar = (): boolean => {
    const e: Partial<Record<keyof FarmProfile, string>> = {};
    if (!profile.nome_produtor.trim()) e.nome_produtor = "Obrigatório";
    if (!profile.nome_fazenda.trim()) e.nome_fazenda = "Obrigatório";
    if (!profile.estado) e.estado = "Obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSalvar = () => {
    if (!validar()) return;
    saveProfile(profile);
    setSavedProfile(profile);
    setToast("Configurações salvas");
    setTimeout(() => setToast(null), 2800);
  };

  const handleDescartar = () => {
    setProfile(savedProfile);
    setErros({});
  };

  const avatar = useMemo(() => gerarAvatar(profile.nome_produtor), [profile.nome_produtor]);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 80px" }}>
      {/* Header da página */}
      <div className="flex items-start justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 28,
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.020em",
              marginBottom: 4,
            }}
          >
            Configurações
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-2)" }}>
            Dados do produtor, operação e aparência. Editar reflete em todas as telas.
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          {dirty && (
            <button
              onClick={handleDescartar}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                padding: "8px 14px",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--rule)",
                borderRadius: 7,
                cursor: "pointer",
              }}
            >
              Descartar
            </button>
          )}
          <button
            onClick={handleSalvar}
            disabled={!dirty}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 16px",
              background: dirty ? "var(--ink)" : "var(--paper-3)",
              color: dirty ? "var(--paper)" : "var(--ink-3)",
              border: "none",
              borderRadius: 7,
              cursor: dirty ? "pointer" : "not-allowed",
              transition: "background 120ms",
            }}
          >
            {dirty ? "Salvar alterações" : "Sem alterações"}
          </button>
        </div>
      </div>

      {/* Seção 1 — Perfil */}
      <Card titulo="Perfil">
        <div className="flex items-center" style={{ gap: 24, marginBottom: 20 }}>
          <Avatar iniciais={avatar.iniciais} cor={avatar.cor} />
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-3)" }}>
            Avatar gerado automaticamente das iniciais do seu nome.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
          <Campo
            label="Nome do produtor"
            value={profile.nome_produtor}
            onChange={(v) => set("nome_produtor", v)}
            placeholder="Ex: Guilherme Barreto"
            erro={erros.nome_produtor}
            obrigatorio
          />
          <Campo
            label="Nome da fazenda"
            value={profile.nome_fazenda}
            onChange={(v) => set("nome_fazenda", v)}
            placeholder="Ex: Fazenda Santa Luzia"
            erro={erros.nome_fazenda}
            obrigatorio
          />
        </div>
      </Card>

      {/* Seção 2 — Localização */}
      <Card titulo="Localização">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
          <div>
            <Label texto="Cidade" />
            <ComboboxCidade
              uf={profile.estado}
              value={profile.municipio}
              onChange={(v) => set("municipio", v)}
              placeholder="Ex: Três Lagoas"
              disabled={!profile.estado}
            />
          </div>
          <div>
            <Label texto="Estado" obrigatorio />
            <div className="flex items-center" style={{ gap: 8 }}>
              <Bandeira code={profile.estado} size={18} />
              <select
                value={profile.estado}
                onChange={(e) => setEstado(e.target.value)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  padding: "8px 12px",
                  background: "var(--paper-2)",
                  color: "var(--ink)",
                  border: `1px solid ${erros.estado ? "var(--loss)" : "var(--rule)"}`,
                  borderRadius: 7,
                }}
              >
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            {erros.estado && <p style={erroStyle}>{erros.estado}</p>}
          </div>
          <Campo
            label="Basis regional (R$/@)"
            value={String(profile.basis_valor)}
            onChange={(v) => set("basis_valor", parseFloat(v) || 0)}
            type="number"
            step={0.5}
            hint={`Sugerido p/ ${profile.estado}: ${BASIS_VALOR_POR_ESTADO[profile.estado] ?? 0}`}
          />
        </div>
      </Card>

      {/* Seção 3 — Operação */}
      <Card titulo="Operação">
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
          <div>
            <Label texto="Sistema produtivo padrão" />
            <select
              value={profile.sistema_padrao}
              onChange={(e) => set("sistema_padrao", e.target.value as FarmProfile["sistema_padrao"])}
              style={selectStyle}
            >
              {SISTEMAS_OPCOES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <Campo
            label="Break-even médio histórico (R$/@)"
            value={String(profile.break_even_medio)}
            onChange={(v) => set("break_even_medio", parseFloat(v) || 0)}
            type="number"
            step={1}
            hint="Referência quando o lote novo não preenche BE específico."
          />
          <Campo
            label="Mortalidade histórica (%)"
            value={String((profile.mortalidade_hist * 100).toFixed(1))}
            onChange={(v) => set("mortalidade_hist", (parseFloat(v) || 0) / 100)}
            type="number"
            step={0.1}
            hint="Decimal arredondado: 2.0% = 0.020."
          />
        </div>
      </Card>

      {/* Seção 4 — Aparência */}
      <Card titulo="Aparência">
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
          <div>
            <Label texto="Tema" />
            <div className="flex" style={{ gap: 6 }}>
              {(["light", "dark", "auto"] as const).map((t) => (
                <Pill
                  key={t}
                  ativo={profile.theme === t}
                  onClick={() => set("theme", t)}
                  label={t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Automático"}
                  disabled={t !== "light"}
                  hint={t !== "light" ? "Em breve" : undefined}
                />
              ))}
            </div>
          </div>
          <div>
            <Label texto="Densidade" />
            <div className="flex" style={{ gap: 6 }}>
              {(["compacto", "normal"] as const).map((d) => (
                <Pill
                  key={d}
                  ativo={profile.densidade === d}
                  onClick={() => set("densidade", d)}
                  label={d === "compacto" ? "Compacto" : "Normal"}
                />
              ))}
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 8,
              }}
            >
              Compacto reduz padding global em ~25%. Normal é o atual.
            </p>
          </div>
        </div>
      </Card>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            background: "var(--ink)",
            color: "var(--paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 16px",
            borderRadius: 8,
            boxShadow: "0 8px 24px -8px rgba(10,10,10,0.30)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 100,
            animation: "fadeInUp 200ms ease-out",
          }}
        >
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "24px 28px",
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 18,
          fontWeight: 500,
        }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  padding: "8px 12px",
  background: "var(--paper-2)",
  color: "var(--ink)",
  border: "1px solid var(--rule)",
  borderRadius: 7,
  width: "100%",
};

const erroStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--loss)",
  marginTop: 4,
};

function Label({ texto, obrigatorio }: { texto: string; obrigatorio?: boolean }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--ink-3)",
        marginBottom: 6,
      }}
    >
      {texto}
      {obrigatorio && <span style={{ color: "var(--loss)", marginLeft: 4 }}>*</span>}
    </label>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  erro,
  obrigatorio,
  hint,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  erro?: string;
  obrigatorio?: boolean;
  hint?: string;
  step?: number;
}) {
  return (
    <div>
      <Label texto={label} obrigatorio={obrigatorio} />
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: type === "number" ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: 13,
          padding: "8px 12px",
          background: "var(--paper-2)",
          color: "var(--ink)",
          border: `1px solid ${erro ? "var(--loss)" : "var(--rule)"}`,
          borderRadius: 7,
          width: "100%",
          outline: "none",
          transition: "border-color 120ms",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--grafite)")}
        onBlur={(e) => (e.target.style.borderColor = erro ? "var(--loss)" : "var(--rule)")}
      />
      {erro && <p style={erroStyle}>{erro}</p>}
      {!erro && hint && (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Pill({
  ativo,
  onClick,
  label,
  disabled,
  hint,
}: {
  ativo: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      type="button"
      title={hint}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: ativo ? 500 : 400,
        padding: "6px 12px",
        background: ativo ? "var(--ink)" : "var(--paper-2)",
        color: ativo ? "var(--paper)" : disabled ? "var(--ink-3)" : "var(--ink)",
        border: "1px solid",
        borderColor: ativo ? "var(--ink)" : "var(--rule)",
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
      {hint && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.65 }}>{hint}</span>}
    </button>
  );
}

function Avatar({ iniciais, cor }: { iniciais: string; cor: string }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: cor,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: "-0.02em",
        boxShadow: "0 2px 8px -2px rgba(10,10,10,0.20)",
      }}
    >
      {iniciais || "?"}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function gerarAvatar(nome: string): { iniciais: string; cor: string } {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  let iniciais = "";
  if (parts.length === 1) {
    iniciais = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length >= 2) {
    iniciais = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Paleta V19 — indigo + variações neutras saturadas
  const cores = ["#6366F1", "#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#06B6D4"];
  const hash = nome.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return { iniciais: iniciais || "?", cor: cores[hash % cores.length] };
}
