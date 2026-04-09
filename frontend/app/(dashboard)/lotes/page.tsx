"use client";

import { useState } from "react";
import FormPasto from "@/components/lotes/FormPasto";
import FormConfinamento from "@/components/lotes/FormConfinamento";
import FormSemi from "@/components/lotes/FormSemi";
import FormCria from "@/components/lotes/FormCria";
import FormRecria from "@/components/lotes/FormRecria";

const TABS = [
  { id: "pasto", label: "Terminacao pasto" },
  { id: "confinamento", label: "Confinamento" },
  { id: "semi", label: "Semiconfinamento" },
  { id: "cria", label: "Cria" },
  { id: "recria", label: "Recria" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LotesPage() {
  const [tab, setTab] = useState<TabId>("pasto");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-t-primary">Lotes</h1>
        <p className="text-sm text-t-secondary mt-1">
          Calcule custo, margem, ROI e protecao para cada sistema produtivo
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "text-t-primary"
                : "text-t-tertiary hover:text-t-secondary"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-terra" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "pasto" && <FormPasto />}
        {tab === "confinamento" && <FormConfinamento />}
        {tab === "semi" && <FormSemi />}
        {tab === "cria" && <FormCria />}
        {tab === "recria" && <FormRecria />}
      </div>
    </div>
  );
}
