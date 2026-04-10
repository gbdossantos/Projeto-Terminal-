"use client";

interface StepWizardProps {
  currentStep: 1 | 2 | 3;
  margemPct?: number;
}

const steps = [
  { n: 1, label: "Dados do lote" },
  { n: 2, label: "Analise economica" },
  { n: 3, label: "Decisao de hedge" },
];

function SemaphoreBadge({ margemPct }: { margemPct: number }) {
  const s = margemPct >= 0.15
    ? { bg: "#4A5D3A18", border: "#4A5D3A44", dot: "#4A5D3A", text: "#6B8F5A", label: "Margem saudavel" }
    : margemPct >= 0.05
    ? { bg: "#C89B3C18", border: "#C89B3C44", dot: "#C89B3C", text: "#C89B3C", label: "Margem apertada" }
    : { bg: "#B5413418", border: "#B5413444", dot: "#B54134", text: "#D4614A", label: "Margem critica" };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: s.bg, border: `0.5px solid ${s.border}` }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      <span className="text-[11px] font-medium" style={{ color: s.text }}>{s.label}</span>
    </div>
  );
}

export function StepWizard({ currentStep, margemPct }: StepWizardProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5"
      style={{ background: "#221F18", borderBottom: "0.5px solid #2A2820" }}>
      <div className="flex items-center gap-0 flex-1">
        {steps.map((step, i) => {
          const state = currentStep > step.n ? "done" : currentStep === step.n ? "active" : "pending";
          return (
            <div key={step.n} className="flex items-center">
              {/* Step circle */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                  style={{
                    background: state === "done" ? "#4A5D3A" : state === "active" ? "#B8763E" : "transparent",
                    border: state === "pending" ? "0.5px solid #2A2820" : "none",
                    color: state === "pending" ? "#6B6860" : "#FAF0E0",
                  }}>
                  {state === "done" ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#FAF0E0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : step.n}
                </div>
                <span className={`text-[11px] ${state === "pending" ? "" : "font-medium"}`}
                  style={{ color: state === "pending" ? "#6B6860" : "#F5F1E8" }}>
                  {step.label}
                </span>
              </div>
              {/* Line */}
              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 h-px min-w-[40px]" style={{ background: "#2A2820" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Semaphore */}
      {margemPct !== undefined && currentStep >= 2 && (
        <div style={{ opacity: 1, transition: "opacity 300ms ease" }}>
          <SemaphoreBadge margemPct={margemPct} />
        </div>
      )}
    </div>
  );
}
