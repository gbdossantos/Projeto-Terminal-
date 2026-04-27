"use client";

import { useState } from "react";

interface Props {
  /** Chamado com o nome digitado pelo usuario; deve persistir o lote. */
  onSave: (nome: string) => void;
  /** Sugestao de nome (ex: "Confinamento — 1.000 cab"). */
  defaultName?: string;
}

/**
 * Botao "Salvar este lote" que abre um campo inline para nomear.
 * Sem modal — minima fricao para registrar uma simulacao.
 */
export function SaveLoteButton({ onSave, defaultName }: Props) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(defaultName ?? "");
  const [saved, setSaved] = useState(false);

  const handleSubmit = () => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  if (saved) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: "var(--green-2)",
        }}
      >
        ✓ Lote salvo
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") {
              setEditing(false);
              setNome(defaultName ?? "");
            }
          }}
          placeholder="Ex: Lote 023 - confinamento"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            background: "var(--surface-2)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: 6,
            padding: "6px 10px",
            color: "var(--text-primary)",
            outline: "none",
            width: 240,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!nome.trim()}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            background: "var(--brand)",
            color: "var(--brand-fg)",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: nome.trim() ? "pointer" : "not-allowed",
            opacity: nome.trim() ? 1 : 0.5,
          }}
        >
          Salvar
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setNome(defaultName ?? "");
          }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            background: "transparent",
            color: "var(--text-tertiary)",
            border: "none",
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        background: "transparent",
        color: "var(--brand)",
        border: "0.5px solid var(--brand)",
        borderRadius: 6,
        padding: "6px 12px",
        cursor: "pointer",
      }}
    >
      Salvar este lote
    </button>
  );
}
