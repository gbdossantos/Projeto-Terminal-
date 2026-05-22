"use client";

/**
 * Toggle de hedge de milho — 3 estados: sem / parcial / total.
 *
 * Decisão #4 do briefing T3.1: só registro local pro MVP.
 * O engine de cálculo NÃO usa esse estado por enquanto. Quando o Simulador
 * absorver milho (camada 3 do roadmap), o hedge milho passa a influenciar
 * a margem. Por ora, é input do produtor que vira histórico de intenção.
 *
 * Compartilhado entre FormConfinamento e FormSemi (mesma natureza).
 */

export type HedgeMilhoState =
  | { tipo: "sem" }
  | { tipo: "parcial"; pct: number; vencimento: string }
  | { tipo: "total"; vencimento: string };

interface Props {
  value: HedgeMilhoState;
  onChange: (v: HedgeMilhoState) => void;
}

export function HedgeMilhoToggle({ value, onChange }: Props) {
  const tipo = value.tipo;
  const tipos: Array<{ id: HedgeMilhoState["tipo"]; label: string }> = [
    { id: "sem", label: "Sem hedge" },
    { id: "parcial", label: "Parcial" },
    { id: "total", label: "Total" },
  ];

  const handleTipo = (novo: HedgeMilhoState["tipo"]) => {
    if (novo === "sem") onChange({ tipo: "sem" });
    else if (novo === "parcial") {
      const pct = value.tipo === "parcial" ? value.pct : 50;
      const venc = value.tipo === "parcial" ? value.vencimento : "CCMK26";
      onChange({ tipo: "parcial", pct, vencimento: venc });
    } else {
      const venc = value.tipo === "total" ? value.vencimento : "CCMK26";
      onChange({ tipo: "total", vencimento: venc });
    }
  };

  return (
    <div>
      <div className="flex" style={{ gap: 6 }}>
        {tipos.map((t) => {
          const ativo = tipo === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTipo(t.id)}
              type="button"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                padding: "5px 12px",
                background: ativo ? "var(--ink)" : "var(--paper-2, var(--surface-2))",
                color: ativo ? "var(--paper, white)" : "var(--ink-2, var(--text-secondary))",
                border: "0.5px solid",
                borderColor: ativo ? "var(--ink)" : "var(--rule, var(--border-subtle))",
                borderRadius: 3,
                cursor: "pointer",
                fontWeight: ativo ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {value.tipo === "parcial" && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <CampoMonoNumber
            label="% HEDGEADO"
            value={value.pct}
            min={1}
            max={99}
            onChange={(n) => onChange({ ...value, pct: n })}
          />
          <CampoMonoText
            label="VENCIMENTO REF."
            value={value.vencimento}
            placeholder="CCMK26"
            onChange={(s) => onChange({ ...value, vencimento: s })}
          />
        </div>
      )}

      {value.tipo === "total" && (
        <div className="mt-3" style={{ maxWidth: 240 }}>
          <CampoMonoText
            label="VENCIMENTO REF."
            value={value.vencimento}
            placeholder="CCMK26"
            onChange={(s) => onChange({ tipo: "total", vencimento: s })}
          />
        </div>
      )}
    </div>
  );
}

function CampoMonoNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-3, var(--text-tertiary))",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        className="sim-input"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Math.max(min, Math.min(max, parseFloat(e.target.value) || 0));
          onChange(n);
        }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          padding: "6px 10px",
          width: "100%",
          background: "var(--paper, white)",
          border: "0.5px solid var(--rule, var(--border-subtle))",
          borderRadius: 3,
        }}
      />
    </div>
  );
}

function CampoMonoText({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (s: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-3, var(--text-tertiary))",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          padding: "6px 10px",
          width: "100%",
          background: "var(--paper, white)",
          border: "0.5px solid var(--rule, var(--border-subtle))",
          borderRadius: 3,
        }}
      />
    </div>
  );
}
