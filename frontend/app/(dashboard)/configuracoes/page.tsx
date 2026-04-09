"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import {
  getProfile,
  saveProfile,
  ESTADOS,
  FAIXAS_FATURAMENTO,
  SISTEMAS_OPCOES,
  BASIS_POR_ESTADO,
  type FarmProfile,
} from "@/lib/profile";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-t-primary focus:outline-none focus:border-terra transition-colors"
      />
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<FarmProfile>(getProfile());
  const [saved, setSaved] = useState(false);

  // Carregar do localStorage no mount
  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const set = (key: keyof FarmProfile, value: string | number | string[]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // Auto-detectar regiao de basis pelo estado
    const basisRegiao = BASIS_POR_ESTADO[profile.estado] || "MS";
    const updated = { ...profile, regiao_basis: basisRegiao };
    saveProfile(updated);
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleSistema = (sistema: string) => {
    const current = profile.sistemas_produtivos;
    const updated = current.includes(sistema)
      ? current.filter((s) => s !== sistema)
      : [...current, sistema];
    set("sistemas_produtivos", updated);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-t-primary">Perfil da fazenda</h1>
          <p className="text-sm text-t-secondary mt-1">
            Dados que personalizam sua experiencia no Terminal
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            saved
              ? "bg-success-bg text-success border border-success/30"
              : "bg-terra text-white hover:opacity-90"
          }`}
        >
          {saved ? <><Check size={16} /> Salvo</> : "Salvar perfil"}
        </button>
      </div>

      {/* Identificacao */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">
          Identificacao
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Nome da fazenda"
            value={profile.nome_fazenda}
            onChange={(v) => set("nome_fazenda", v)}
            placeholder="Ex: Fazenda Santa Maria"
          />
          <Field
            label="Nome do produtor/gestor"
            value={profile.nome_produtor}
            onChange={(v) => set("nome_produtor", v)}
            placeholder="Ex: Guilherme Barreto"
          />
        </div>
      </div>

      {/* Localizacao */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">
          Localizacao
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
              Estado
            </label>
            <select
              value={profile.estado}
              onChange={(e) => set("estado", e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-t-primary focus:outline-none focus:border-terra"
            >
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            <p className="text-[11px] text-t-tertiary mt-1">
              Define o basis automatico: {BASIS_POR_ESTADO[profile.estado] || "—"}
            </p>
          </div>
          <Field
            label="Municipio"
            value={profile.municipio}
            onChange={(v) => set("municipio", v)}
            placeholder="Ex: Campo Grande"
          />
        </div>
      </div>

      {/* Operacao */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <p className="text-xs font-medium text-t-secondary uppercase tracking-wider">
          Operacao
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Area total (hectares)"
            value={profile.area_hectares || ""}
            onChange={(v) => set("area_hectares", Number(v))}
            type="number"
            placeholder="Ex: 5000"
          />
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-1.5">
              Faturamento estimado
            </label>
            <select
              value={profile.faturamento_estimado}
              onChange={(e) => set("faturamento_estimado", e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-t-primary focus:outline-none focus:border-terra"
            >
              <option value="">Selecione</option>
              {FAIXAS_FATURAMENTO.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-t-tertiary mb-2">
            Sistemas produtivos que utiliza
          </label>
          <div className="flex flex-wrap gap-2">
            {SISTEMAS_OPCOES.map((s) => {
              const active = profile.sistemas_produtivos.includes(s.value);
              return (
                <button
                  key={s.value}
                  onClick={() => toggleSistema(s.value)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors border ${
                    active
                      ? "bg-terra-bg border-terra/30 text-terra font-medium"
                      : "border-border text-t-tertiary hover:text-t-secondary hover:border-border"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumo */}
      {profile.nome_fazenda && (
        <div className="border border-terra/20 rounded-lg bg-terra-bg p-5">
          <p className="text-sm text-terra font-medium mb-2">Resumo do perfil</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] text-t-tertiary uppercase">Fazenda</p>
              <p className="text-t-primary font-medium">{profile.nome_fazenda}</p>
            </div>
            <div>
              <p className="text-[11px] text-t-tertiary uppercase">Localizacao</p>
              <p className="text-t-primary font-medium">
                {profile.municipio ? `${profile.municipio}, ` : ""}{profile.estado}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-t-tertiary uppercase">Area</p>
              <p className="text-t-primary font-medium">
                {profile.area_hectares ? `${profile.area_hectares.toLocaleString("pt-BR")} ha` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-t-tertiary uppercase">Basis automatico</p>
              <p className="text-t-primary font-medium">{profile.regiao_basis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
