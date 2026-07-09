"""
Direção visual ESTRADA — tema do dashboard Streamlit.
=====================================================
Matéria: osso, nogueira, sela, latão. Tipografia: Besley (display),
Instrument Sans (corpo), Spline Sans Mono (dados).

Uso no app.py:
    from dashboard.estrada import inject_estrada, render_hero_estrada, render_marca_sidebar
    inject_estrada()                      # logo após st.set_page_config
    render_marca_sidebar()                # no topo da sidebar
    render_hero_estrada(cotacoes, spot)   # antes do conteúdo da página

Imagem do hero: se existir dashboard/assets/estrada/hero_dusk.jpg (ou .png),
ela substitui o pôster SVG. Gere no Gemini e salve com esse nome.
"""

from __future__ import annotations

import base64
import os

import streamlit as st

ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "estrada")

# ── Paleta ───────────────────────────────────────────────────────
OSSO = "#F6F4EE"
OSSO_2 = "#FFFFFF"
NOGUEIRA = "#2A211A"
NOGUEIRA_3 = "#1C1610"
SELA = "#8A5A33"
LATAO = "#AD8A48"
LATAO_HI = "#D3B36E"
LATAO_LO = "#7C602C"
PASTO = "#5F7A46"
PASTO_HI = "#8FA36A"
FERRUGEM = "#A9432E"
FERRUGEM_HI = "#C96A4F"

# Cores p/ gráficos Altair
CHART_SEM_HEDGE = FERRUGEM
CHART_COM_HEDGE = PASTO

# Mapa de semáforo (bg suave, texto) usado nas tabelas de impacto
COR_SEMAFORO = {
    "verde": ("rgba(95,122,70,0.14)", PASTO),
    "amarelo": ("rgba(173,138,72,0.16)", LATAO_LO),
    "vermelho": ("rgba(169,67,46,0.14)", FERRUGEM),
}

_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Besley:ital,wght@0,400;0,700;0,900;1,400&family=Instrument+Sans:wght@400;500;600&family=Spline+Sans+Mono:wght@400;500&display=swap');

:root {
  --osso: #F6F4EE; --osso-2: #FFFFFF;
  --nogueira: #2A211A; --nogueira-3: #1C1610;
  --sela: #8A5A33; --latao: #AD8A48; --latao-hi: #D3B36E; --latao-lo: #7C602C;
  --pasto: #5F7A46; --pasto-hi: #8FA36A; --ferrugem: #A9432E; --ferrugem-hi: #C96A4F;
  --ink: #2A211A; --ink-2: #6B5D4E; --ink-3: #98897A;
  --rule: rgba(42,33,26,0.14);
  --f-display: 'Besley', Georgia, serif;
  --f-body: 'Instrument Sans', sans-serif;
  --f-mono: 'Spline Sans Mono', monospace;
}

/* ── Base ── */
html, body, [data-testid="stAppViewContainer"] {
  background: var(--osso) !important;
  font-family: var(--f-body) !important;
  color: var(--ink);
}
.block-container { padding-top: 1.2rem; max-width: 1120px; }

h1, h2, h3, .stSubheader {
  font-family: var(--f-display) !important;
  color: var(--ink) !important;
  letter-spacing: -0.015em !important;
}
h1 { font-size: 2.1rem !important; font-weight: 900 !important; }
h2, .stSubheader { font-size: 1.25rem !important; font-weight: 700 !important; opacity: 1 !important; }
h3 { font-size: 1.05rem !important; font-weight: 700 !important; }

p, li, label, .stMarkdown { font-family: var(--f-body); }

hr { border-color: var(--rule) !important; }

/* costura de sela no lugar do divider */
[data-testid="stDivider"], hr {
  height: 8px !important; border: none !important; background:
    repeating-linear-gradient(60deg, transparent 0 8px, rgba(138,90,51,.55) 8px 10.5px, transparent 10.5px 20px) !important;
}

/* ── Sidebar: nogueira escura ── */
[data-testid="stSidebar"] {
  background: var(--nogueira-3) !important;
  border-right: 1px solid rgba(211,179,110,0.18);
}
[data-testid="stSidebar"] * { color: #EDE5D6 !important; }
[data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
  color: #F3EDDF !important; font-family: var(--f-display) !important;
}
[data-testid="stSidebar"] [data-testid="stCaptionContainer"] { color: rgba(237,229,214,0.55) !important; }
[data-testid="stSidebar"] hr {
  background: repeating-linear-gradient(60deg, transparent 0 8px, rgba(211,179,110,.45) 8px 10.5px, transparent 10.5px 20px) !important;
}
[data-testid="stSidebar"] [data-testid="stWidgetLabel"] p { color: rgba(237,229,214,0.75) !important; font-size: 0.82rem; }
[data-testid="stSidebar"] input, [data-testid="stSidebar"] [data-baseweb="select"] > div {
  background: rgba(246,244,238,0.06) !important;
  border-color: rgba(237,229,214,0.22) !important;
  color: #EDE5D6 !important;
  font-family: var(--f-mono) !important;
}
[data-testid="stSidebar"] [data-baseweb="select"] span { color: #EDE5D6 !important; }

/* ── Métricas: cartão de osso com número mono ── */
[data-testid="stMetric"] {
  background: var(--osso-2) !important;
  border: 1px solid var(--rule) !important;
  border-radius: 14px !important;
  padding: 16px 20px !important;
  box-shadow: 0 1px 2px rgba(42,33,26,0.04), 0 12px 28px -18px rgba(42,33,26,0.18);
}
[data-testid="stMetricLabel"] {
  font-family: var(--f-mono) !important; font-size: 0.68rem !important;
  letter-spacing: 0.16em !important; text-transform: uppercase;
  color: var(--ink-3) !important; opacity: 1 !important;
}
[data-testid="stMetricValue"] {
  font-family: var(--f-mono) !important; font-size: 1.45rem !important;
  font-weight: 500 !important; color: var(--ink) !important;
  font-variant-numeric: tabular-nums;
}
[data-testid="stMetricDelta"] { font-family: var(--f-mono) !important; font-size: 0.78rem !important; }

/* ── Expanders: caixa de campo ── */
[data-testid="stExpander"] {
  background: var(--osso-2);
  border: 1px solid var(--rule) !important;
  border-radius: 14px !important;
  overflow: hidden;
}
[data-testid="stExpander"] summary {
  font-family: var(--f-body) !important; font-weight: 600 !important;
  color: var(--ink) !important;
}
[data-testid="stExpander"] summary:hover { color: var(--sela) !important; }

/* ── Inputs ── */
[data-testid="stAppViewContainer"] input, [data-baseweb="input"] input {
  font-family: var(--f-mono) !important;
}
[data-baseweb="input"], [data-baseweb="select"] > div {
  border-radius: 8px !important;
}

/* ── Botões: latão ── */
.stButton > button {
  font-family: var(--f-body) !important; font-weight: 600 !important;
  background: linear-gradient(135deg, var(--latao-hi), var(--latao)) !important;
  color: var(--nogueira) !important;
  border: 1px solid var(--latao-lo) !important;
  border-radius: 100px !important;
  padding: 0.45rem 1.4rem !important;
  box-shadow: 0 2px 8px -2px rgba(124,96,44,0.45);
}
.stButton > button:hover { filter: brightness(1.06); border-color: var(--latao-lo) !important; }

/* ── Slider ── */
.stSlider [data-baseweb="slider"] [role="slider"] {
  background: var(--latao) !important; border-color: var(--latao-lo) !important;
}

/* ── Semáforos Estrada ── */
.semaforo {
  padding: 18px 24px; border-radius: 14px; margin: 10px 0 4px;
  font-size: 1.0rem; font-weight: 500;
  display: flex; align-items: center; gap: 14px;
  font-family: var(--f-body);
  border: 1px solid var(--rule);
  background: var(--osso-2);
}
.semaforo strong { font-family: var(--f-display); font-weight: 700; letter-spacing: 0.01em; }
.semaforo-verde    { border-left: 6px solid #5F7A46; color: #445932; }
.semaforo-amarelo  { border-left: 6px solid #AD8A48; color: #7C602C; }
.semaforo-vermelho { border-left: 6px solid #A9432E; color: #8A3625; }
.semaforo-emoji { font-size: 1.6rem; }

/* ── Alertas ── */
.alerta-warn {
  padding: 12px 16px; border-radius: 10px; margin: 6px 0;
  background: rgba(173,138,72,0.12); border-left: 4px solid var(--latao);
  color: var(--latao-lo); font-size: 0.9rem; font-family: var(--f-body);
}
.alerta-ok {
  padding: 12px 16px; border-radius: 10px; margin: 6px 0;
  background: rgba(95,122,70,0.12); border-left: 4px solid var(--pasto);
  color: #445932; font-size: 0.9rem; font-family: var(--f-body);
}

/* ── Pergunta invertida: itálico editorial ── */
.pergunta-invertida {
  padding: 20px 24px; border-radius: 14px; margin: 14px 0;
  font-family: var(--f-display); font-style: italic;
  font-size: 1.06rem; font-weight: 400; line-height: 1.55;
}
.pergunta-alerta {
  background: var(--nogueira); border: none; color: #EFE7D8;
}
.pergunta-alerta b, .pergunta-alerta strong { color: var(--latao-hi); }
.pergunta-ok {
  background: rgba(95,122,70,0.10); border: 1px solid rgba(95,122,70,0.35); color: #445932;
}

/* ── Tabela de impacto ── */
.impact-header {
  font-family: var(--f-display) !important; font-size: 1.2rem !important;
  font-weight: 700 !important; margin-bottom: 4px; letter-spacing: -0.01em;
}
.impact-sub { font-size: 0.82rem; color: var(--ink-3); margin-bottom: 12px; font-family: var(--f-mono); }

/* ── Dataframes/tabelas ── */
[data-testid="stTable"], .stDataFrame { font-family: var(--f-mono) !important; font-size: 0.85rem; }

/* ── Hero Estrada ── */
.estrada-hero {
  position: relative; border-radius: 20px; overflow: hidden;
  margin: 4px 0 26px;
  box-shadow: 0 30px 70px -34px rgba(28,22,16,0.5);
}
.estrada-hero svg.scene, .estrada-hero img.scene {
  display: block; width: 100%; height: auto;
}
.estrada-hero img.scene { object-fit: cover; max-height: 340px; }
.estrada-hero .overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  text-align: center; padding-top: 5.5%;
}
.estrada-hero .ctx {
  font-family: var(--f-mono); font-size: clamp(8px, 1.1vw, 11px);
  letter-spacing: 0.24em; text-transform: uppercase;
  color: rgba(246,244,238,0.75); margin: 0 0 0.8vw;
}
.estrada-hero .price {
  font-family: var(--f-display); font-weight: 900;
  font-size: clamp(40px, 7.5vw, 96px); line-height: 0.9; letter-spacing: -0.03em;
  color: #F6F4EE; margin: 0; text-shadow: 0 2px 26px rgba(28,22,16,0.4);
  font-variant-numeric: tabular-nums;
}
.estrada-hero .price small { font-size: 0.32em; font-weight: 700; color: rgba(246,244,238,0.8); }
.estrada-hero .unit {
  font-family: var(--f-display); font-style: italic;
  font-size: clamp(11px, 1.4vw, 16px); color: rgba(246,244,238,0.85); margin-top: 0.7vw;
}
.estrada-hero .delta {
  display: inline-block; margin-top: 1vw;
  font-family: var(--f-mono); font-size: clamp(8px, 1vw, 12px);
  border-radius: 100px; padding: 0.4em 1.1em;
  background: rgba(28,22,16,0.3);
}
.estrada-hero .delta.neg { color: #F1B9A6; border: 1px solid rgba(241,185,166,0.55); }
.estrada-hero .delta.pos { color: #C4D8A8; border: 1px solid rgba(196,216,168,0.55); }
.estrada-hero .delta.flat { color: rgba(246,244,238,0.7); border: 1px solid rgba(246,244,238,0.35); }

/* marca da sidebar */
.estrada-marca { text-align: center; padding: 6px 0 2px; }
.estrada-marca svg { width: 92px; height: auto; }
.estrada-marca .nome {
  font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.5em; text-indent: 0.5em;
  text-transform: uppercase; color: #F3EDDF; margin-top: 10px;
}
.estrada-marca .tag {
  font-family: var(--f-display); font-style: italic; font-size: 11.5px;
  color: rgba(237,229,214,0.55); margin-top: 3px;
}
</style>
"""


def inject_estrada() -> None:
    """Injeta o CSS da direção Estrada. Chamar logo após st.set_page_config."""
    st.markdown(_CSS, unsafe_allow_html=True)


# ── Pôster SVG (fallback quando não há foto) ─────────────────────
_SCENE_SVG = """
<svg class="scene" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Pastagem ao crepúsculo">
  <defs>
    <linearGradient id="eSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1C1610"/><stop offset="34%" stop-color="#4A3423"/>
      <stop offset="62%" stop-color="#8A5A33"/><stop offset="82%" stop-color="#C89355"/>
      <stop offset="100%" stop-color="#E8C077"/>
    </linearGradient>
    <radialGradient id="eSun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F3D48C" stop-opacity="0.9"/>
      <stop offset="45%" stop-color="#E0AE5C" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#E0AE5C" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="eHillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6E4526"/><stop offset="100%" stop-color="#4A3018"/>
    </linearGradient>
    <linearGradient id="eHillMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4A3421"/><stop offset="100%" stop-color="#33230F"/>
    </linearGradient>
    <linearGradient id="eGround" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E2010"/><stop offset="100%" stop-color="#1C1408"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="520" fill="url(#eSky)"/>
  <circle cx="985" cy="352" r="185" fill="url(#eSun)"/>
  <circle cx="985" cy="352" r="42" fill="#F3D48C"/>
  <g fill="#33230F" opacity="0.35">
    <ellipse cx="300" cy="128" rx="190" ry="8"/><ellipse cx="470" cy="155" rx="120" ry="5"/>
    <ellipse cx="1120" cy="100" rx="230" ry="9"/><ellipse cx="1250" cy="128" rx="120" ry="5"/>
  </g>
  <g fill="#E8C077" opacity="0.22">
    <ellipse cx="880" cy="272" rx="260" ry="6"/><ellipse cx="1050" cy="300" rx="180" ry="4"/>
  </g>
  <path d="M0,368 Q240,332 480,360 T940,352 T1440,362 L1440,520 L0,520 Z" fill="url(#eHillFar)"/>
  <path d="M0,404 Q320,374 640,398 T1200,392 T1440,400 L1440,520 L0,520 Z" fill="url(#eHillMid)"/>
  <g fill="#1C1408">
    <g transform="translate(760,384) scale(0.85)">
      <ellipse cx="0" cy="0" rx="17" ry="9"/>
      <rect x="-15" y="4" width="4" height="13"/><rect x="-6" y="5" width="4" height="12"/>
      <rect x="5" y="5" width="4" height="12"/><rect x="12" y="4" width="4" height="13"/>
      <path d="M14,-4 Q24,-8 26,-2 L20,1 Z"/>
    </g>
    <g transform="translate(846,390) scale(0.72)">
      <ellipse cx="0" cy="0" rx="17" ry="9"/>
      <rect x="-15" y="4" width="4" height="13"/><rect x="-6" y="5" width="4" height="12"/>
      <rect x="5" y="5" width="4" height="12"/><rect x="12" y="4" width="4" height="13"/>
      <path d="M-14,-4 Q-24,-8 -26,-2 L-20,1 Z"/>
    </g>
    <g transform="translate(676,393) scale(0.58)">
      <ellipse cx="0" cy="0" rx="17" ry="9"/>
      <rect x="-15" y="4" width="4" height="13"/><rect x="-6" y="5" width="4" height="12"/>
      <rect x="5" y="5" width="4" height="12"/><rect x="12" y="4" width="4" height="13"/>
      <path d="M14,-4 Q24,-8 26,-2 L20,1 Z"/>
    </g>
  </g>
  <g transform="translate(1235,300)" stroke="#1C1408" fill="#1C1408">
    <path d="M-3,105 L-11,105 L-2,0 L2,0 L11,105 L3,105 L1,42 L-1,42 Z" stroke="none"/>
    <line x1="-7" y1="78" x2="7" y2="78" stroke-width="2.4"/>
    <g stroke-width="3.2" stroke-linecap="round">
      <line x1="0" y1="0" x2="0" y2="-25"/><line x1="0" y1="0" x2="22" y2="12"/>
      <line x1="0" y1="0" x2="-22" y2="12"/><line x1="0" y1="0" x2="22" y2="-12"/>
      <line x1="0" y1="0" x2="-22" y2="-12"/><line x1="0" y1="0" x2="0" y2="25"/>
    </g>
    <circle cx="0" cy="0" r="4" stroke="none"/>
  </g>
  <path d="M0,442 Q360,424 720,436 T1440,432 L1440,520 L0,520 Z" fill="url(#eGround)"/>
  <g stroke="#0F0A05" stroke-linecap="round">
    <line x1="60" y1="466" x2="60" y2="414" stroke-width="8"/>
    <line x1="300" y1="470" x2="300" y2="422" stroke-width="7"/>
    <line x1="530" y1="474" x2="530" y2="430" stroke-width="6"/>
    <line x1="740" y1="477" x2="740" y2="437" stroke-width="5.5"/>
    <line x1="930" y1="478" x2="930" y2="442" stroke-width="5"/>
    <line x1="1100" y1="480" x2="1100" y2="446" stroke-width="4.5"/>
    <line x1="1250" y1="481" x2="1250" y2="450" stroke-width="4"/>
    <line x1="1385" y1="482" x2="1385" y2="453" stroke-width="3.6"/>
    <path d="M60,426 L300,432 L530,440 L740,446 L930,450 L1100,454 L1250,457 L1385,459" fill="none" stroke-width="2"/>
    <path d="M60,444 L300,449 L530,456 L740,461 L930,464 L1100,467 L1250,470 L1385,472" fill="none" stroke-width="2"/>
  </g>
</svg>
"""

# Fivela do Terminal (monograma T) — marca da sidebar
_BUCKLE_SVG = """
<svg viewBox="0 0 480 400" role="img" aria-label="Fivela de latão do Terminal">
  <defs>
    <linearGradient id="sbPlate" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2C583"/><stop offset="38%" stop-color="#BE9A54"/>
      <stop offset="72%" stop-color="#8A6B32"/><stop offset="100%" stop-color="#A98C4F"/>
    </linearGradient>
    <linearGradient id="sbBevel" x1="100%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#F0DCA8"/><stop offset="50%" stop-color="#9C7B3C"/>
      <stop offset="100%" stop-color="#6B5124"/>
    </linearGradient>
    <linearGradient id="sbField" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B4924F"/><stop offset="55%" stop-color="#97753A"/>
      <stop offset="100%" stop-color="#7C602C"/>
    </linearGradient>
  </defs>
  <rect x="60" y="60" width="360" height="256" rx="118" fill="url(#sbPlate)"/>
  <rect x="60" y="60" width="360" height="256" rx="118" fill="none" stroke="url(#sbBevel)" stroke-width="7"/>
  <rect x="92" y="90" width="296" height="196" rx="92" fill="none" stroke="#6B5124" stroke-width="3.4"
        stroke-dasharray="0.5 9" stroke-linecap="round" opacity="0.7"/>
  <rect x="108" y="105" width="264" height="166" rx="80" fill="url(#sbField)"/>
  <text x="240" y="219" text-anchor="middle" font-family="Besley, Georgia, serif" font-weight="900"
        font-size="98" fill="#4A3818" opacity="0.92">T</text>
  <text x="240" y="217" text-anchor="middle" font-family="Besley, Georgia, serif" font-weight="900"
        font-size="98" fill="#F0DCA8" opacity="0.28">T</text>
</svg>
"""


def _hero_image_b64() -> tuple[str, str] | None:
    """Procura foto do hero em assets/estrada. Retorna (mime, base64) ou None."""
    for nome, mime in (("hero_dusk.jpg", "image/jpeg"), ("hero_dusk.jpeg", "image/jpeg"),
                       ("hero_dusk.png", "image/png"), ("hero_dusk.webp", "image/webp")):
        caminho = os.path.join(ASSETS_DIR, nome)
        if os.path.exists(caminho):
            with open(caminho, "rb") as f:
                return mime, base64.b64encode(f.read()).decode("ascii")
    return None


def render_marca_sidebar() -> None:
    """Fivela + wordmark no topo da sidebar."""
    st.sidebar.markdown(
        f'<div class="estrada-marca">{_BUCKLE_SVG}'
        f'<div class="nome">Terminal</div>'
        f'<div class="tag">clareza antes da decisão</div></div>',
        unsafe_allow_html=True,
    )


def render_hero_estrada(spot: float | None, delta_dia: float | None = None,
                        contexto: str = "Arroba do boi · CEPEA/SP · hoje") -> None:
    """
    Hero de crepúsculo com o preço no céu.
    Usa foto de assets/estrada/hero_dusk.* se existir; senão, pôster SVG.
    """
    if spot is not None:
        inteiro = int(spot)
        centavos = f"{spot - inteiro:.2f}".split(".")[1]
        preco_html = f'{inteiro}<small>,{centavos}</small>'
    else:
        preco_html = "—"

    if delta_dia is None:
        delta_html = '<span class="delta flat">sem variação registrada hoje</span>'
    elif delta_dia < 0:
        delta_html = f'<span class="delta neg">▼ R$ {abs(delta_dia):,.2f} no dia</span>'
    elif delta_dia > 0:
        delta_html = f'<span class="delta pos">▲ R$ {delta_dia:,.2f} no dia</span>'
    else:
        delta_html = '<span class="delta flat">estável no dia</span>'

    foto = _hero_image_b64()
    if foto:
        mime, b64 = foto
        cena = f'<img class="scene" src="data:{mime};base64,{b64}" alt="">'
    else:
        cena = _SCENE_SVG

    st.markdown(
        f'<div class="estrada-hero">{cena}'
        f'<div class="overlay">'
        f'<p class="ctx">{contexto}</p>'
        f'<p class="price">{preco_html}</p>'
        f'<p class="unit">reais por arroba</p>'
        f'{delta_html}'
        f'</div></div>',
        unsafe_allow_html=True,
    )
