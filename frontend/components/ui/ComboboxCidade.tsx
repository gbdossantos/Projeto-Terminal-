"use client";

/**
 * Combobox de cidade — autocomplete escopado a uma UF.
 *
 * Usado em /configuracoes pra substituir o input livre que permitia typos
 * silenciosos (Open-Meteo geocoding falha em 'Tres Lagoas' sem acento).
 *
 * Comportamento:
 *  - Input controlado: usuário digita, lista filtra (prefixo > contém).
 *  - Setas ↑/↓ navegam, Enter seleciona, Esc fecha.
 *  - Click fora fecha.
 *  - Quando UF muda, se valor atual não está na nova lista → limpa.
 *  - onChange só dispara com valor canônico (string exata do IBGE).
 *  - Estado de validação: borda vermelha se valor não-vazio e fora da lista.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { buscarMunicipios, listarMunicipios, municipioValido } from "@/lib/municipios";

interface Props {
  uf: string;                                // Escopo da busca
  value: string;                             // Município selecionado (canônico)
  onChange: (municipio: string) => void;
  placeholder?: string;
  erro?: string;
  disabled?: boolean;                        // True quando UF não escolhido
}

export function ComboboxCidade({ uf, value, onChange, placeholder, erro, disabled }: Props) {
  // texto = o que está visível no input (livre durante digitação)
  // value = o que está realmente selecionado (canônico ou "")
  const [texto, setTexto] = useState(value);
  const [aberto, setAberto] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quando o valor controlado externo muda (ex: load do profile, ou UF troca
  // e pai resetou pra ""), sincroniza o texto visível.
  useEffect(() => {
    setTexto(value);
  }, [value]);

  // Se UF troca e o município atual não pertence à nova UF → limpa.
  useEffect(() => {
    if (value && !municipioValido(value, uf)) {
      onChange("");
      setTexto("");
    }
  }, [uf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sugestões filtradas
  const sugestoes = useMemo(() => {
    if (!uf) return [];
    return buscarMunicipios(uf, texto === value ? "" : texto, 60);
  }, [uf, texto, value]);

  // Click fora fecha
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
        // Ao fechar sem selecionar: se texto não é válido, volta pro último válido
        if (texto && !municipioValido(texto, uf)) {
          // Mantém o texto pra usuário ver/corrigir; validação visual cuida do resto
        }
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [texto, uf]);

  const selecionar = (m: string) => {
    onChange(m);
    setTexto(m);
    setAberto(false);
    setHighlightIdx(0);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setAberto(true);
        return;
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, sugestoes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (sugestoes[highlightIdx]) selecionar(sugestoes[highlightIdx]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  const valorInvalido = texto.length > 0 && !municipioValido(texto, uf);
  const corBorda = erro || valorInvalido ? "var(--loss)" : "var(--rule)";
  const totalUF = listarMunicipios(uf).length;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={texto}
        disabled={disabled}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          setHighlightIdx(0);
        }}
        onFocus={(e) => {
          setAberto(true);
          if (!erro && !valorInvalido) e.target.style.borderColor = "var(--grafite)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = corBorda;
        }}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Escolha o estado primeiro" : placeholder ?? "Digite o nome da cidade"}
        autoComplete="off"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          padding: "8px 12px",
          background: "var(--paper-2)",
          color: disabled ? "var(--ink-3)" : "var(--ink)",
          border: `1px solid ${corBorda}`,
          borderRadius: 7,
          width: "100%",
          outline: "none",
          transition: "border-color 120ms",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />

      {/* Dropdown */}
      {aberto && !disabled && sugestoes.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            background: "var(--paper-2)",
            border: "1px solid var(--rule)",
            borderRadius: 7,
            boxShadow: "0 8px 24px -8px rgba(10,10,10,0.18)",
            zIndex: 50,
            listStyle: "none",
            padding: "4px 0",
            margin: 0,
          }}
        >
          {sugestoes.map((m, i) => {
            const ativo = i === highlightIdx;
            return (
              <li
                key={m}
                role="option"
                aria-selected={ativo}
                onMouseEnter={() => setHighlightIdx(i)}
                onMouseDown={(e) => {
                  // mousedown ao invés de onClick — onClick dispara depois do blur do input
                  e.preventDefault();
                  selecionar(m);
                }}
                style={{
                  padding: "6px 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: ativo ? "var(--paper-3)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {m}
              </li>
            );
          })}
          {totalUF > sugestoes.length && (
            <li
              style={{
                padding: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-3)",
                borderTop: "0.5px solid var(--rule)",
                marginTop: 4,
              }}
            >
              continue digitando — {totalUF - sugestoes.length} a mais em {uf}
            </li>
          )}
        </ul>
      )}

      {/* Hint / erro */}
      {erro ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--loss)", marginTop: 4 }}>
          {erro}
        </p>
      ) : valorInvalido ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--loss)", marginTop: 4 }}>
          Cidade não encontrada em {uf}. Escolha da lista.
        </p>
      ) : null}
    </div>
  );
}
