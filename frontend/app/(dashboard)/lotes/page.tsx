"use client";

import { useState } from "react";
import FormPasto from "@/components/lotes/FormPasto";
import FormConfinamento from "@/components/lotes/FormConfinamento";
import FormSemi from "@/components/lotes/FormSemi";
import FormCria from "@/components/lotes/FormCria";
import FormRecria from "@/components/lotes/FormRecria";
import { SISTEMAS_PRODUTIVOS, type SistemaProdutivo } from "@/lib/sistemas";

export default function LotesPage() {
  const [tab, setTab] = useState<SistemaProdutivo>("terminacao_pasto");

  return (
    <div>
      {/* Header */}
      <h1 className="font-display text-[28px]" style={{ color: "#F5F1E8", fontWeight: 400 }}>
        Lotes
      </h1>
      <p className="text-sm mt-1 mb-7" style={{ color: "#6B6860" }}>
        Calcule custo, margem, ROI e protecao para cada sistema produtivo
      </p>

      {/* Tabs */}
      <div className="flex gap-0 mb-8" style={{ borderBottom: "0.5px solid #2A2820" }}>
        {SISTEMAS_PRODUTIVOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className="relative text-[13px] font-medium transition-colors cursor-pointer"
            style={{
              padding: "10px 0",
              marginRight: "28px",
              color: tab === s.id ? "#F5F1E8" : "#6B6860",
              background: "none",
              border: "none",
            }}
          >
            {s.label}
            {tab === s.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "#B8763E" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {tab === "terminacao_pasto" && <FormPasto />}
        {tab === "confinamento" && <FormConfinamento />}
        {tab === "semiconfinamento" && <FormSemi />}
        {tab === "cria" && <FormCria />}
        {tab === "recria" && <FormRecria />}
      </div>
    </div>
  );
}
