"use client";

/**
 * Card de previsão do tempo — faixa horizontal full-width, ~150px.
 *
 * Layout (3 zonas L→R, separadas por hairlines):
 *  - Zona 1 (280px fixos): cidade · UF · hoje (temp + máx/mín + chuva + chip geada)
 *  - Zona 2 (flex 1, grid 1fr × 7): próximos 7 dias
 *  - Zona 3 (min 200px): condições (umidade, vento, chuva 7d ant.)
 *
 * Dados: Open-Meteo (https://open-meteo.com) — gratuita, sem chave.
 *  1. Geocoding /v1/search → lat/lon
 *  2. Forecast /v1/forecast → current + daily (past_days=7, forecast_days=7)
 *
 * Princípios:
 *  - Não inventar dado: erro de API → estado vazio honesto, sem fallback fictício.
 *  - DM Mono nos números (temperatura, mm, %, km/h).
 *  - Geada: se min ≤ 3°C em algum dos próximos 7 dias → chip âmbar no card "Hoje"
 *    + dia marcado na tira.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/lib/use-profile";

// ─── Tipos ──────────────────────────────────────────────────────
type WeatherCategory =
  | "sol"
  | "parcial"
  | "nublado"
  | "neblina"
  | "chuva_fraca"
  | "chuva_forte"
  | "tempestade";

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string; // estado
}

interface ForecastData {
  current: {
    temperature: number;
    weather_code: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
  };
  today: {
    max: number;
    min: number;
    precipitation_sum: number;
    precipitation_probability: number;
    weather_code: number;
  };
  next7: {
    date: string; // ISO yyyy-mm-dd
    max: number;
    min: number;
    weather_code: number;
    precipitation_sum: number;
  }[];
  past7_precipitation_sum: number; // acumulado chuva últimos 7d
  geada_alert: { dia_abrev: string } | null; // primeiro dia ≤ 3°C nos próx 7d
  geada_dias_iso: Set<string>; // todos os dias com min ≤ 3 (pra marcar tira)
}

// ─── Constantes ─────────────────────────────────────────────────
const CACHE_KEY_PREFIX = "terminal_clima_geocode_";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ─── Mapeamento WMO weather code → categoria ────────────────────
function mapWeatherCode(code: number): WeatherCategory {
  if (code === 0) return "sol";
  if (code === 1 || code === 2) return "parcial";
  if (code === 3) return "nublado";
  if (code === 45 || code === 48) return "neblina";
  if (code >= 51 && code <= 57) return "chuva_fraca";
  if (code === 61 || code === 63 || code === 80 || code === 81) return "chuva_fraca";
  if (code === 65 || code === 82) return "chuva_forte";
  if (code >= 95 && code <= 99) return "tempestade";
  return "nublado"; // fallback conservador
}

// ─── Geocoding (cache localStorage) ─────────────────────────────
async function geocodeCidade(municipio: string, estado: string): Promise<GeocodingResult | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${municipio.toLowerCase()}_${estado.toLowerCase()}`;
  // Cache hit
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignora cache corrompido
    }
  }
  // Open-Meteo geocoding aceita só o nome da cidade (não "Cidade, UF").
  // Estratégia: buscar pelo nome, depois filtrar resultados pelo estado via admin1.
  const query = encodeURIComponent(municipio);
  const url = `${GEOCODING_URL}?name=${query}&count=10&country=BR&language=pt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocoding falhou");
  const json = await res.json();
  if (!json.results || json.results.length === 0) return null;
  // Prefere resultado cujo admin1 (estado por extenso) bate com a UF buscada.
  // Ex.: 'Três Lagoas' tem 5 resultados (MS, PI, MA, PA, PI) — queremos o de MS.
  type GeoRow = { latitude: number; longitude: number; name: string; admin1?: string };
  const candidatos = json.results as GeoRow[];
  const ufExtenso = estadoNomeCompleto(estado).toLowerCase();
  const ufMatch = candidatos.find((r) => r.admin1?.toLowerCase() === ufExtenso);
  const escolhido = ufMatch ?? candidatos[0];
  const result: GeocodingResult = {
    latitude: escolhido.latitude,
    longitude: escolhido.longitude,
    name: escolhido.name,
    admin1: escolhido.admin1,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // quota
    }
  }
  return result;
}

function estadoNomeCompleto(uf: string): string {
  const map: Record<string, string> = {
    MS: "Mato Grosso do Sul",
    MT: "Mato Grosso",
    GO: "Goiás",
    SP: "São Paulo",
    MG: "Minas Gerais",
    PA: "Pará",
    TO: "Tocantins",
    RO: "Rondônia",
    BA: "Bahia",
    PR: "Paraná",
    RS: "Rio Grande do Sul",
    SC: "Santa Catarina",
  };
  return map[uf.toUpperCase()] ?? uf;
}

// ─── Forecast ───────────────────────────────────────────────────
async function fetchForecast(lat: number, lon: number): Promise<ForecastData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
    daily:
      "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max",
    past_days: "7",
    forecast_days: "7",
    timezone: "America/Sao_Paulo",
    wind_speed_unit: "kmh",
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("forecast falhou");
  const json = await res.json();

  // daily.time tem 14 entries: 0..6 = passado, 7..13 = futuro incluindo hoje (índice 7)
  const time: string[] = json.daily.time;
  const tmax: number[] = json.daily.temperature_2m_max;
  const tmin: number[] = json.daily.temperature_2m_min;
  const wcode: number[] = json.daily.weather_code;
  const psum: number[] = json.daily.precipitation_sum;
  const pprob: number[] = json.daily.precipitation_probability_max;

  // Hoje = índice 7
  const today = {
    max: tmax[7],
    min: tmin[7],
    precipitation_sum: psum[7],
    precipitation_probability: pprob[7] ?? 0,
    weather_code: wcode[7],
  };

  // Próximos 7 dias = índices 7..13
  const next7 = [];
  for (let i = 7; i < 14; i++) {
    next7.push({
      date: time[i],
      max: tmax[i],
      min: tmin[i],
      weather_code: wcode[i],
      precipitation_sum: psum[i],
    });
  }

  // Chuva acumulada últimos 7 dias = soma índices 0..6
  let past7sum = 0;
  for (let i = 0; i < 7; i++) past7sum += psum[i] ?? 0;

  // Geada: min ≤ 3°C nos próximos 7 dias
  const geadaDiasIso = new Set<string>();
  let geadaAlert: { dia_abrev: string } | null = null;
  for (let i = 0; i < next7.length; i++) {
    if (next7[i].min <= 3) {
      geadaDiasIso.add(next7[i].date);
      if (!geadaAlert) {
        const d = new Date(next7[i].date + "T12:00:00");
        geadaAlert = { dia_abrev: DIAS_SEMANA[d.getDay()] };
      }
    }
  }

  return {
    current: {
      temperature: json.current.temperature_2m,
      weather_code: json.current.weather_code,
      humidity: json.current.relative_humidity_2m,
      wind_speed: json.current.wind_speed_10m,
      wind_direction: json.current.wind_direction_10m,
    },
    today,
    next7,
    past7_precipitation_sum: past7sum,
    geada_alert: geadaAlert,
    geada_dias_iso: geadaDiasIso,
  };
}

// ─── Direção do vento (graus → cardinal PT-BR) ──────────────────
function direcaoCardinal(graus: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(graus / 45) % 8;
  return dirs[idx];
}

// ─── Componente principal ───────────────────────────────────────
export function ClimaCard() {
  const { profile, isHydrated } = useProfile();

  // Cidade default: profile.municipio + estado. Fallback Campo Grande/MS se vazio.
  const cidadeDefault = useMemo(() => {
    const m = profile.municipio?.trim() || "Campo Grande";
    const uf = profile.estado?.trim() || "MS";
    return { municipio: m, estado: uf };
  }, [profile.municipio, profile.estado]);

  // Dropdown discreto — única opção por enquanto (perfil só tem 1 cidade).
  // Quando multi-cidade existir no perfil, este array vira o source da lista.
  const cidadesDisponiveis = useMemo(() => [cidadeDefault], [cidadeDefault]);
  const [cidadeSelecionada, setCidadeSelecionada] = useState(cidadeDefault);

  useEffect(() => {
    setCidadeSelecionada(cidadeDefault);
  }, [cidadeDefault]);

  const [data, setData] = useState<ForecastData | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Evita fetch antes de hidratar (profile pode mudar)
  const lastFetchKeyRef = useRef<string>("");

  useEffect(() => {
    if (!isHydrated) return;
    const key = `${cidadeSelecionada.municipio}|${cidadeSelecionada.estado}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    let cancelado = false;
    setCarregando(true);
    setErro(false);
    setData(null);

    (async () => {
      try {
        const geo = await geocodeCidade(cidadeSelecionada.municipio, cidadeSelecionada.estado);
        if (!geo) throw new Error("cidade não encontrada");
        if (cancelado) return;
        const fc = await fetchForecast(geo.latitude, geo.longitude);
        if (cancelado) return;
        setData(fc);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cidadeSelecionada, isHydrated]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <section
      style={{
        marginTop: 26,
        border: "0.5px solid var(--rule)",
        borderRadius: 8,
        background: "var(--paper-2)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", minHeight: 150 }}>
        {carregando ? (
          <SkeletonClima />
        ) : erro || !data ? (
          <EstadoErro />
        ) : (
          <>
            <Zona1
              cidade={cidadeSelecionada}
              cidadesDisponiveis={cidadesDisponiveis}
              onCidadeChange={setCidadeSelecionada}
              data={data}
            />
            <HairlineVertical />
            <Zona2 data={data} />
            <HairlineVertical />
            <Zona3 data={data} />
          </>
        )}
      </div>
    </section>
  );
}

// ─── Zona 1 — Hoje ─────────────────────────────────────────────
function Zona1({
  cidade,
  cidadesDisponiveis,
  onCidadeChange,
  data,
}: {
  cidade: { municipio: string; estado: string };
  cidadesDisponiveis: { municipio: string; estado: string }[];
  onCidadeChange: (c: { municipio: string; estado: string }) => void;
  data: ForecastData;
}) {
  const cat = mapWeatherCode(data.current.weather_code);

  return (
    <div style={{ width: 280, flexShrink: 0, padding: "16px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <DropdownCidade
          cidade={cidade}
          opcoes={cidadesDisponiveis}
          onChange={onCidadeChange}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <IconeCondicao categoria={cat} size={48} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 36,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {Math.round(data.current.temperature)}°
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-2)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            máx <span style={{ color: "var(--ink)" }}>{Math.round(data.today.max)}°</span>
            {" · "}
            mín <span style={{ color: "var(--ink)" }}>{Math.round(data.today.min)}°</span>
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-2)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            chuva{" "}
            <span style={{ color: "var(--ink)" }}>
              {data.today.precipitation_sum.toFixed(1).replace(".", ",")} mm
            </span>{" "}
            · {Math.round(data.today.precipitation_probability)}%
          </span>
        </div>
      </div>

      {data.geada_alert && (
        <div style={{ marginTop: 8 }}>
          <ChipGeada texto={`geada possível · ${data.geada_alert.dia_abrev}`} />
        </div>
      )}
    </div>
  );
}

// ─── Zona 2 — Próximos 7 dias ──────────────────────────────────
function Zona2({ data }: { data: ForecastData }) {
  const ultimoDia = data.next7[data.next7.length - 1];
  const dUlt = new Date(ultimoDia.date + "T12:00:00");
  const headerAte = `${DIAS_SEMANA[dUlt.getDay()].toUpperCase()} ${dUlt.getDate()}/${MESES_ABREV[dUlt.getMonth()]}`;
  const hojeIso = data.next7[0].date;

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "16px 22px", display: "flex", flexDirection: "column" }}>
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 10,
        }}
      >
        PRÓXIMOS 7 DIAS · ATÉ {headerAte}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          flex: 1,
        }}
      >
        {data.next7.map((d) => {
          const dt = new Date(d.date + "T12:00:00");
          const isHoje = d.date === hojeIso;
          const temGeada = data.geada_dias_iso.has(d.date);
          const cat = mapWeatherCode(d.weather_code);
          return (
            <div
              key={d.date}
              style={{
                padding: "6px 4px",
                borderRadius: 6,
                background: isHoje ? "var(--grafite-soft)" : "transparent",
                border: isHoje ? "0.5px solid var(--ring-soft)" : "0.5px solid transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  color: isHoje ? "var(--grafite)" : "var(--ink-3)",
                  fontWeight: isHoje ? 500 : 400,
                }}
              >
                {isHoje ? "HOJE" : DIAS_SEMANA[dt.getDay()]}
              </span>
              <IconeCondicao categoria={cat} size={20} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {Math.round(d.max)}°
                <span style={{ color: "var(--ink-3)" }}>/{Math.round(d.min)}°</span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: d.precipitation_sum > 0 ? "var(--ink-2)" : "var(--ink-3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.precipitation_sum > 0 ? `${d.precipitation_sum.toFixed(1).replace(".", ",")} mm` : "—"}
              </span>
              {temGeada && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    letterSpacing: "0.06em",
                    color: "var(--warning)",
                    padding: "1px 4px",
                    background: "var(--warning-bg)",
                    borderRadius: 2,
                    marginTop: 1,
                  }}
                >
                  GEADA
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Zona 3 — Condições ────────────────────────────────────────
function Zona3({ data }: { data: ForecastData }) {
  return (
    <div
      style={{
        minWidth: 200,
        flexShrink: 0,
        padding: "16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        CONDIÇÕES
      </div>
      <LinhaCondicao label="umidade" valor={`${Math.round(data.current.humidity)}%`} />
      <LinhaCondicao
        label="vento"
        valor={`${Math.round(data.current.wind_speed)} km/h ${direcaoCardinal(data.current.wind_direction)}`}
      />
      <LinhaCondicao
        label="chuva 7d ant."
        valor={`${data.past7_precipitation_sum.toFixed(1).replace(".", ",")} mm`}
      />
    </div>
  );
}

function LinhaCondicao({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-2)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </span>
    </div>
  );
}

// ─── Dropdown de cidade ────────────────────────────────────────
function DropdownCidade({
  cidade,
  opcoes,
  onChange,
}: {
  cidade: { municipio: string; estado: string };
  opcoes: { municipio: string; estado: string }[];
  onChange: (c: { municipio: string; estado: string }) => void;
}) {
  const valorAtual = `${cidade.municipio}|${cidade.estado}`;
  return (
    <div style={{ position: "relative" }}>
      <select
        value={valorAtual}
        onChange={(e) => {
          const [m, uf] = e.target.value.split("|");
          onChange({ municipio: m, estado: uf });
        }}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          padding: "2px 14px 2px 0",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {opcoes.map((c) => (
          <option key={`${c.municipio}|${c.estado}`} value={`${c.municipio}|${c.estado}`}>
            {c.municipio.toUpperCase()} · {c.estado.toUpperCase()}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          fontSize: 8,
          color: "var(--ink-3)",
        }}
      >
        ▾
      </span>
    </div>
  );
}

// ─── Chip de geada ─────────────────────────────────────────────
function ChipGeada({ texto }: { texto: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        padding: "2px 8px",
        background: "var(--warning-bg)",
        color: "var(--warning)",
        borderRadius: 999,
        letterSpacing: "0.02em",
      }}
    >
      {texto}
    </span>
  );
}

// ─── Hairline vertical ─────────────────────────────────────────
function HairlineVertical() {
  return <div style={{ width: "0.5px", background: "var(--rule)", flexShrink: 0 }} />;
}

// ─── Ícones de condição (SVG inline, sem dependência externa) ──
function IconeCondicao({ categoria, size }: { categoria: WeatherCategory; size: number }) {
  const stroke = "var(--ink-2)";
  const sw = size >= 40 ? 1.4 : 1.2;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" } as const;

  switch (categoria) {
    case "sol":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth={sw} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const rad = (a * Math.PI) / 180;
            const x1 = 12 + Math.cos(rad) * 7;
            const y1 = 12 + Math.sin(rad) * 7;
            const x2 = 12 + Math.cos(rad) * 9.5;
            const y2 = 12 + Math.sin(rad) * 9.5;
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
          })}
        </svg>
      );
    case "parcial":
      return (
        <svg {...common}>
          <circle cx="8" cy="9" r="3" stroke={stroke} strokeWidth={sw} />
          <path
            d="M9 16h8a3 3 0 0 0 0-6 4 4 0 0 0-7.5-1.5"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "nublado":
      return (
        <svg {...common}>
          <path
            d="M7 17h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7-1A3.5 3.5 0 0 0 7 17z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "neblina":
      return (
        <svg {...common}>
          <line x1="4" y1="9" x2="20" y2="9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="4" y1="13" x2="20" y2="13" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="4" y1="17" x2="20" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "chuva_fraca":
      return (
        <svg {...common}>
          <path
            d="M7 14h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7-1A3.5 3.5 0 0 0 7 14z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <line x1="9" y1="17" x2="9" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="13" y1="17" x2="13" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="17" y1="17" x2="17" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "chuva_forte":
      return (
        <svg {...common}>
          <path
            d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7-1A3.5 3.5 0 0 0 7 13z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <line x1="8" y1="15" x2="7" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="12" y1="15" x2="11" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="16" y1="15" x2="15" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="20" y1="15" x2="19" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "tempestade":
      return (
        <svg {...common}>
          <path
            d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7-1A3.5 3.5 0 0 0 7 13z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path
            d="M13 14l-3 5h3l-2 4"
            stroke="var(--warning)"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
  }
}

// ─── Skeleton de loading ───────────────────────────────────────
function SkeletonClima() {
  return (
    <>
      <div style={{ width: 280, flexShrink: 0, padding: "16px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SkelBar w={120} h={10} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
          <SkelBar w={48} h={48} radius={8} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SkelBar w={70} h={28} />
            <SkelBar w={100} h={10} />
            <SkelBar w={120} h={10} />
          </div>
        </div>
      </div>
      <HairlineVertical />
      <div style={{ flex: 1, padding: "16px 22px", display: "flex", flexDirection: "column" }}>
        <SkelBar w={180} h={10} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 12, flex: 1 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <SkelBar w={24} h={8} />
              <SkelBar w={20} h={20} radius={4} />
              <SkelBar w={32} h={8} />
              <SkelBar w={28} h={8} />
            </div>
          ))}
        </div>
      </div>
      <HairlineVertical />
      <div style={{ minWidth: 200, padding: "16px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SkelBar w={80} h={10} />
        <SkelBar w={150} h={10} />
        <SkelBar w={150} h={10} />
        <SkelBar w={150} h={10} />
      </div>
    </>
  );
}

function SkelBar({ w, h, radius = 2 }: { w: number; h: number; radius?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "var(--paper-3)",
        borderRadius: radius,
        opacity: 0.7,
      }}
    />
  );
}

// ─── Estado de erro ────────────────────────────────────────────
function EstadoErro() {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--ink-3)",
        fontStyle: "italic",
        minHeight: 150,
      }}
    >
      Dados de clima indisponíveis no momento.
    </div>
  );
}
