"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { faseSistemaLabel, type LoteTerminacaoSalvo } from "./labels";

/**
 * Seletor de lote (topo). shadcn Select listando os lotes de terminação
 * salvos (localStorage, mesmo source de /lotes — só leitura).
 * Label: "FASE · SISTEMA · nome".
 */
export default function SeletorLote({
  lotes,
  value,
  onChange,
}: {
  lotes: LoteTerminacaoSalvo[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="uppercase shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "var(--ink-3)",
        }}
      >
        Simular sobre o lote
      </span>
      <Select value={value || undefined} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
          <SelectValue placeholder="Selecione um lote de terminação">
            {(id) => {
              const l = lotes.find((x) => x.id === id);
              if (!l) return null;
              return (
                <span style={{ fontFamily: "var(--font-sans)" }}>
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.04em",
                      color: "var(--ink-3)",
                      marginRight: 8,
                    }}
                  >
                    {faseSistemaLabel(l.fase, l.sistema)}
                  </span>
                  {l.nome}
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {lotes.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span style={{ fontFamily: "var(--font-sans)" }}>
                <span
                  className="uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    color: "var(--ink-3)",
                    marginRight: 8,
                  }}
                >
                  {faseSistemaLabel(l.fase, l.sistema)}
                </span>
                {l.nome}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
