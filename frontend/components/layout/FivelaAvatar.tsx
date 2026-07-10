"use client";

import { useId } from "react";

/**
 * Fivela de latão — avatar do perfil (portada de dashboard/estrada.py::_BUCKLE_SVG).
 *
 * O monograma vem das iniciais de profile.nome_fazenda: 2 primeiras palavras
 * significativas, ignorando "Fazenda"/"Sítio" (ex.: "Fazenda Santa Luzia" → "SL").
 *
 * Os hexes do SVG são o metal usinado da fivela (gradientes de latão),
 * não tokens de UI.
 */

const PALAVRAS_IGNORADAS = new Set(["fazenda", "sitio", "sítio", "estancia", "estância", "rancho"]);

export function monogramaFazenda(nomeFazenda: string): string {
  const significativas = nomeFazenda
    .trim()
    .split(/\s+/)
    .filter((p) => p && !PALAVRAS_IGNORADAS.has(p.toLowerCase()) && /[a-zA-ZÀ-ú]/.test(p));
  const iniciais = significativas
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return iniciais || "T";
}

interface Props {
  nomeFazenda: string;
  /** Altura em px (largura segue a proporção 480:400 da fivela). */
  size?: number;
}

export function FivelaAvatar({ nomeFazenda, size = 26 }: Props) {
  // IDs únicos por instância — evita colisão de gradientes se houver 2 fivelas na página
  const uid = useId().replace(/[:]/g, "");
  const monograma = monogramaFazenda(nomeFazenda);
  const fontSize = monograma.length > 1 ? 122 : 150;

  return (
    <svg
      viewBox="0 0 480 400"
      role="img"
      aria-label={`Fivela da fazenda ${nomeFazenda || "Terminal"}`}
      style={{ height: size, width: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id={`plate-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C583" />
          <stop offset="38%" stopColor="#BE9A54" />
          <stop offset="72%" stopColor="#8A6B32" />
          <stop offset="100%" stopColor="#A98C4F" />
        </linearGradient>
        <linearGradient id={`bevel-${uid}`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#F0DCA8" />
          <stop offset="50%" stopColor="#9C7B3C" />
          <stop offset="100%" stopColor="#6B5124" />
        </linearGradient>
        <linearGradient id={`field-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B4924F" />
          <stop offset="55%" stopColor="#97753A" />
          <stop offset="100%" stopColor="#7C602C" />
        </linearGradient>
      </defs>
      <rect x="60" y="60" width="360" height="256" rx="118" fill={`url(#plate-${uid})`} />
      <rect
        x="60"
        y="60"
        width="360"
        height="256"
        rx="118"
        fill="none"
        stroke={`url(#bevel-${uid})`}
        strokeWidth="7"
      />
      <rect
        x="92"
        y="90"
        width="296"
        height="196"
        rx="92"
        fill="none"
        stroke="#6B5124"
        strokeWidth="3.4"
        strokeDasharray="0.5 9"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="108" y="105" width="264" height="166" rx="80" fill={`url(#field-${uid})`} />
      <text
        x="240"
        y="240"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="900"
        fontSize={fontSize}
        letterSpacing="-4"
        fill="#4A3818"
        opacity="0.92"
      >
        {monograma}
      </text>
      <text
        x="240"
        y="237"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="900"
        fontSize={fontSize}
        letterSpacing="-4"
        fill="#F0DCA8"
        opacity="0.28"
      >
        {monograma}
      </text>
    </svg>
  );
}
