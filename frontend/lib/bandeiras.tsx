/**
 * Bandeiras do Brasil — SVG inline para os 26 estados + DF + Brasil.
 *
 * Versões simplificadas. Foco: reconhecimento visual no header (16-18px de altura).
 * Esquema de cores oficial + 1-2 elementos identitários por bandeira.
 * NÃO são representações heráldicas fiéis — brasões complexos foram omitidos.
 *
 * Quando o produtor mudar de estado em /configuracoes, o componente <Bandeira />
 * troca automaticamente.
 */

import React from "react";

type Code = "BR" | "AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO"
  | "MA" | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ"
  | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

interface BandeiraProps {
  code: string;          // UF ou "BR"
  /** Altura em px. Largura derivada da proporção 3:2 (30×20). */
  size?: number;
  className?: string;
  title?: string;
}

export function Bandeira({ code, size = 16, className, title }: BandeiraProps) {
  const C = code.toUpperCase() as Code;
  const Comp = MAPA[C] ?? Fallback;
  const w = (size * 30) / 20;
  return (
    <span
      title={title ?? C}
      style={{
        display: "inline-block",
        width: w,
        height: size,
        lineHeight: 0,
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "0 0 0 0.5px rgba(10,10,10,0.20)",
        verticalAlign: "middle",
      }}
      className={className}
    >
      <Comp />
    </span>
  );
}

// ─── Bandeira fallback (placa amarela com sigla preta) ───────────
function Fallback({ uf }: { uf?: string } = {}) {
  return (
    <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="30" height="20" fill="#FFCC00" />
      <text
        x="15"
        y="14.5"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontWeight="700"
        fontSize="10"
        fill="#0A0A0A"
      >
        {uf ?? "—"}
      </text>
    </svg>
  );
}

// ─── Brasil ──────────────────────────────────────────────────────
const BR = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#009C3B" />
    <polygon points="15,2 28,10 15,18 2,10" fill="#FFDF00" />
    <circle cx="15" cy="10" r="4.2" fill="#002776" />
    <path d="M 11 9.5 Q 15 7.5 19 9.5" stroke="#FFFFFF" strokeWidth="0.6" fill="none" />
  </svg>
);

// ─── Estados (ordem alfabética) ─────────────────────────────────

const AC = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <polygon points="0,20 30,20 30,10" fill="#FFDF00" />
    <polygon points="3,17 5,15.5 5.7,17.6 4,18.6 4,16.5" fill="#E03C31" />
  </svg>
);

const AL = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="10" height="20" fill="#E03C31" />
    <rect x="10" width="10" height="20" fill="#FFFFFF" />
    <rect x="20" width="10" height="20" fill="#002776" />
    <circle cx="15" cy="10" r="2.5" fill="none" stroke="#FFDF00" strokeWidth="0.6" />
  </svg>
);

const AM = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <rect width="13" height="9" fill="#FFFFFF" />
    {/* 25 estrelinhas simplificadas pra 6 visíveis */}
    {[2, 4.5, 7, 9.5, 11].map((x) => (
      <circle key={x} cx={x} cy={4.5} r="0.5" fill="#002776" />
    ))}
    <polygon points="6,2.5 6.6,4 8,4 6.9,5 7.3,6.5 6,5.6 4.7,6.5 5.1,5 4,4 5.4,4" fill="#FFCC00" />
  </svg>
);

const AP = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <rect width="6" height="20" fill="#000000" />
    <polygon points="6,0 12,10 6,20" fill="#008000" />
    <polygon points="22,0 18,10 22,20 30,20 30,0" fill="#FFDF00" />
    <polygon points="3,9 3.6,10.5 5,10.5 3.9,11.5 4.3,13 3,12.1 1.7,13 2.1,11.5 1,10.5 2.4,10.5" fill="#FFFFFF" />
  </svg>
);

const BA = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <rect width="30" height="4" fill="#002776" />
    <rect y="8" width="30" height="4" fill="#002776" />
    <rect y="16" width="30" height="4" fill="#002776" />
    <rect width="12" height="12" fill="#E03C31" />
  </svg>
);

const CE = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <rect x="10" width="10" height="20" fill="#FFDF00" />
    <rect x="11.5" y="6" width="7" height="8" fill="#002776" />
    <polygon points="15,7.5 15.5,9.2 17.3,9.2 15.9,10.2 16.4,11.8 15,10.8 13.6,11.8 14.1,10.2 12.7,9.2 14.5,9.2" fill="#FFFFFF" />
  </svg>
);

const DF = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <rect x="13" width="4" height="20" fill="#FFFFFF" />
    <rect y="8" width="30" height="4" fill="#FFFFFF" />
    <polygon points="15,7 15.7,9 17.7,9 16.1,10.2 16.7,12.2 15,11 13.3,12.2 13.9,10.2 12.3,9 14.3,9" fill="#FFDF00" />
  </svg>
);

const ES = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#002776" />
    <rect y="6.5" width="30" height="7" fill="#FFFFFF" />
    <rect y="14" width="30" height="6" fill="#FF69B4" />
    <text x="15" y="11.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3.5" fill="#000000">TRABALHA</text>
  </svg>
);

const GO = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    {/* 8 faixas alternadas amarelo + verde */}
    {[0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5].map((y, i) => (
      <rect key={y} y={y} width="30" height="2.5" fill={i % 2 === 0 ? "#FFDF00" : "#008000"} />
    ))}
    <rect width="12" height="10" fill="#002776" />
    {[
      [2.5, 3], [5, 5], [8, 3], [10, 6], [4, 7], [7, 7.5],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="0.6" fill="#FFFFFF" />
    ))}
  </svg>
);

const MA = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    {/* 9 faixas alternadas */}
    {Array.from({ length: 9 }).map((_, i) => (
      <rect key={i} y={i * (20 / 9)} width="30" height={20 / 9} fill={i % 2 === 0 ? "#E03C31" : "#FFFFFF"} />
    ))}
    <rect width="12" height="9" fill="#002776" />
    <polygon points="6,2.5 6.6,4.2 8.4,4.2 7,5.4 7.5,7 6,5.9 4.5,7 5,5.4 3.6,4.2 5.4,4.2" fill="#FFFFFF" />
  </svg>
);

const MG = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <polygon points="15,3 24,17 6,17" fill="#E03C31" />
    <text x="15" y="14.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3" fill="#FFFFFF">LIBERTAS</text>
  </svg>
);

const MS = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <rect width="30" height="6" fill="#002776" />
    <polygon points="0,0 11,10 0,20" fill="#008000" />
    <polygon points="14,7 15.2,10 18.4,10.3 16,12.5 16.7,15.8 14,14.1 11.3,15.8 12,12.5 9.6,10.3 12.8,10" fill="#FFDF00" />
  </svg>
);

const MT = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFDF00" />
    <polygon points="15,2 28,10 15,18 2,10" fill="#008000" />
    <polygon points="15,5.5 16,8.5 19.2,8.5 16.6,10.6 17.5,13.6 15,11.7 12.5,13.6 13.4,10.6 10.8,8.5 14,8.5" fill="#FFFFFF" />
  </svg>
);

const PA = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#E03C31" />
    <rect y="7" width="30" height="6" fill="#FFFFFF" />
    <circle cx="15" cy="10" r="2.5" fill="#002776" />
    <polygon points="15,8 15.5,9.5 17,9.5 15.8,10.4 16.3,11.9 15,11 13.7,11.9 14.2,10.4 13,9.5 14.5,9.5" fill="#FFFFFF" />
  </svg>
);

const PB = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#E03C31" />
    <rect width="30" height="5.5" fill="#000000" />
    <text x="15" y="4.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3.5" fill="#FFFFFF">NEGO</text>
  </svg>
);

const PE = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#002776" />
    <rect width="30" height="6" fill="#FFFFFF" />
    <polygon points="15,8.5 16,11.5 19.2,11.5 16.6,13.5 17.5,16.5 15,14.7 12.5,16.5 13.4,13.5 10.8,11.5 14,11.5" fill="#FFDF00" />
    <path d="M 5 4 Q 15 0 25 4" stroke="#FF69B4" strokeWidth="0.5" fill="none" />
  </svg>
);

const PI = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    {Array.from({ length: 13 }).map((_, i) => (
      <rect key={i} y={i * (20 / 13)} width="30" height={20 / 13} fill={i % 2 === 0 ? "#008000" : "#FFDF00"} />
    ))}
    <rect width="13" height="8" fill="#002776" />
    <polygon points="6.5,2 7.1,3.7 8.9,3.7 7.5,4.9 8,6.5 6.5,5.5 5,6.5 5.5,4.9 4.1,3.7 5.9,3.7" fill="#FFFFFF" />
  </svg>
);

const PR = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <ellipse cx="15" cy="10" rx="11" ry="7" fill="#FFFFFF" />
    <text x="15" y="11.5" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3.5" fill="#002776">PARANÁ</text>
  </svg>
);

const RJ = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#002776" />
    <polygon points="0,0 8,10 0,20" fill="#FFFFFF" />
    <polygon points="30,0 22,10 30,20" fill="#FFFFFF" />
    <rect x="11" y="6" width="8" height="8" fill="#FFFFFF" />
    <rect x="12" y="7" width="6" height="6" fill="#E03C31" />
  </svg>
);

const RN = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <polygon points="0,12 30,2 30,8 0,18" fill="#FFDF00" />
    <circle cx="22" cy="6" r="2.5" fill="#FFDF00" stroke="#E03C31" strokeWidth="0.4" />
  </svg>
);

const RO = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <rect width="30" height="6" fill="#FFDF00" />
    <rect y="14" width="30" height="6" fill="#008000" />
    <rect width="11" height="20" fill="#008000" />
    <circle cx="5.5" cy="10" r="2" fill="#002776" />
    <polygon points="5.5,8.5 5.9,9.5 7,9.5 6.1,10.2 6.5,11.3 5.5,10.6 4.5,11.3 4.9,10.2 4,9.5 5.1,9.5" fill="#FFFFFF" />
  </svg>
);

const RR = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#002776" />
    <rect y="6.5" width="30" height="2" fill="#FFFFFF" />
    <rect y="11.5" width="30" height="2" fill="#FFFFFF" />
    <rect y="15" width="30" height="5" fill="#E03C31" />
    <polygon points="6,3 6.6,4.4 8.1,4.4 6.9,5.4 7.4,6.8 6,5.9 4.6,6.8 5.1,5.4 3.9,4.4 5.4,4.4" fill="#FFDF00" />
  </svg>
);

const RS = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#E03C31" />
    <rect width="30" height="6.7" fill="#008000" />
    <rect y="13.3" width="30" height="6.7" fill="#FFDF00" />
    <rect x="11" y="7" width="8" height="6" fill="#FFFFFF" />
  </svg>
);

const SC = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFFFFF" />
    <rect width="30" height="6.7" fill="#E03C31" />
    <rect y="13.3" width="30" height="6.7" fill="#008000" />
    <rect x="11" y="6.7" width="8" height="6.6" fill="#FFFFFF" stroke="#E03C31" strokeWidth="0.4" />
  </svg>
);

const SE = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#008000" />
    <rect y="4" width="30" height="4" fill="#FFFFFF" />
    <rect y="12" width="30" height="4" fill="#FFDF00" />
    {[7, 12, 17, 22, 27].map((x) => (
      <polygon
        key={x}
        points={`${x},9 ${x + 0.4},10.1 ${x + 1.4},10.1 ${x + 0.5},10.8 ${x + 0.9},11.9 ${x},11.2 ${x - 0.9},11.9 ${x - 0.5},10.8 ${x - 1.4},10.1 ${x - 0.4},10.1`}
        fill="#002776"
      />
    ))}
  </svg>
);

const SP = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    {/* 13 listras pretas e brancas alternadas */}
    {Array.from({ length: 13 }).map((_, i) => (
      <rect key={i} y={i * (20 / 13)} width="30" height={20 / 13} fill={i % 2 === 0 ? "#000000" : "#FFFFFF"} />
    ))}
    <rect width="12" height="9" fill="#002776" />
    {[
      [3, 2.5], [6, 2], [9, 3], [4, 5], [8, 6],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="0.7" fill="#FFFFFF" />
    ))}
  </svg>
);

const TO = () => (
  <svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="30" height="20" fill="#FFDF00" />
    <polygon points="0,0 30,0 30,4 0,12" fill="#002776" />
    <polygon points="0,8 30,16 30,20 0,20" fill="#FFFFFF" />
    <circle cx="22" cy="3.5" r="1.5" fill="#FFDF00" />
  </svg>
);

const MAPA: Record<Code, React.ComponentType> = {
  BR, AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA,
  PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO,
};
