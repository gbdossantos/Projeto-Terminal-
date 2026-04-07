"""
Terminal — Dashboard
=====================
Interface visual do Farm Economics Engine + Market Intelligence.

Execute:
    cd terminal
    source venv/bin/activate
    streamlit run dashboard/app.py
"""

from __future__ import annotations

import os
import sys

# Garante que a raiz do projeto está no path,
# independente de onde o script é chamado
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from datetime import date, datetime

import pandas as pd
import streamlit as st

from data.market_data import (
    buscar_cotacoes, buscar_historico_dolar, cotacoes_ficticias,
    buscar_futuros_bgi, futuros_bgi_ficticios,
)  # noqa: E501
from models.cost_model_v2 import FarmEconomicsV2
from models.exposure_engine import ExposureEngine
from models.economic_impact import EconomicImpactEngine
from models.hedge_engine import HedgeEngine
from models.constants import BASIS_REGIAO
from models.production_systems import (
    InputConfinamento,
    InputCria,
    InputRecria,
    InputSemiconfinamento,
    InputTerminacaoPasto,
)


# ---------------------------------------------------------------------------
# Config da página
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Terminal — Pecuária",
    page_icon="🐄",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    /* ── Reset e base ─────────────────────────────────── */
    .block-container { padding-top: 1.5rem; }
    h1 { font-size: 1.6rem !important; font-weight: 600 !important; }
    h2, .stSubheader { font-size: 1.15rem !important; font-weight: 500 !important;
                        opacity: 0.7; letter-spacing: 0.02em; }

    /* ── Cards de métrica (respeitam tema) ────────────── */
    [data-testid="stMetric"] {
        border: 1px solid rgba(128,128,128,0.2);
        border-radius: 10px; padding: 14px 18px;
        background: rgba(128,128,128,0.06);
    }
    [data-testid="stMetricLabel"] { font-size: 0.78rem !important; opacity: 0.6;
                                     text-transform: uppercase; letter-spacing: 0.04em; }
    [data-testid="stMetricValue"] { font-size: 1.35rem !important; font-weight: 600 !important; }

    /* ── Semáforo grande ──────────────────────────────── */
    .semaforo {
        padding: 18px 24px; border-radius: 10px; margin: 8px 0;
        font-size: 1.05rem; font-weight: 500;
        display: flex; align-items: center; gap: 12px;
    }
    .semaforo-verde  { background: rgba(25,135,84,0.15); border-left: 5px solid #198754; color: #2dd47b; }
    .semaforo-amarelo { background: rgba(255,193,7,0.15); border-left: 5px solid #ffc107; color: #ffcd39; }
    .semaforo-vermelho { background: rgba(220,53,69,0.15); border-left: 5px solid #dc3545; color: #ff6b7a; }
    .semaforo-emoji { font-size: 1.8rem; }

    /* ── Alertas ──────────────────────────────────────── */
    .alerta-warn { padding: 12px 16px; border-radius: 8px; margin: 6px 0;
                   background: rgba(255,193,7,0.15); border-left: 4px solid #ffc107;
                   color: #ffcd39; font-size: 0.9rem; }
    .alerta-ok   { padding: 12px 16px; border-radius: 8px; margin: 6px 0;
                   background: rgba(25,135,84,0.15); border-left: 4px solid #198754;
                   color: #2dd47b; font-size: 0.9rem; }

    /* ── Pergunta invertida ───────────────────────────── */
    .pergunta-invertida {
        padding: 16px 20px; border-radius: 10px; margin: 12px 0;
        font-size: 0.95rem; font-weight: 500; line-height: 1.5;
    }
    .pergunta-alerta { background: rgba(255,193,7,0.15); border: 1px solid rgba(255,193,7,0.4); color: #ffcd39; }
    .pergunta-ok     { background: rgba(25,135,84,0.15); border: 1px solid rgba(25,135,84,0.4); color: #2dd47b; }

    /* ── Tabela de impacto ────────────────────────────── */
    .impact-header { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
    .impact-sub    { font-size: 0.82rem; opacity: 0.5; margin-bottom: 12px; }

    /* ── Sidebar refinada ─────────────────────────────── */
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
        font-size: 0.85rem;
    }

    /* ── Expanders mais limpos ─────────────────────────── */
    .streamlit-expanderHeader { font-size: 0.9rem !important; font-weight: 500 !important; }

    /* ── Seção de mercado compacta ─────────────────────── */
    .mercado-caption { font-size: 0.75rem; opacity: 0.5; margin-top: -8px; }

    /* ── Light mode overrides ─────────────────────────── */
    @media (prefers-color-scheme: light) {
        .semaforo-verde  { color: #0f5132; }
        .semaforo-amarelo { color: #856404; }
        .semaforo-vermelho { color: #842029; }
        .alerta-warn { color: #856404; }
        .alerta-ok   { color: #0f5132; }
        .pergunta-alerta { color: #856404; }
        .pergunta-ok     { color: #0f5132; }
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Engine — inicializado uma vez, reutilizado em todas as sessões
# ---------------------------------------------------------------------------

@st.cache_resource
def get_engine() -> FarmEconomicsV2:
    return FarmEconomicsV2()

@st.cache_resource
def get_exposure_engine() -> ExposureEngine:
    return ExposureEngine()

@st.cache_resource
def get_impact_engine() -> EconomicImpactEngine:
    return EconomicImpactEngine()

@st.cache_resource
def get_hedge_engine() -> HedgeEngine:
    return HedgeEngine()

engine = get_engine()
exp_engine = get_exposure_engine()
impact_engine = get_impact_engine()
hedge_engine = get_hedge_engine()


# ---------------------------------------------------------------------------
# Helpers de leitura do Excel
# ---------------------------------------------------------------------------

@st.cache_data(show_spinner=False)
def carregar_excel(arquivo_bytes: bytes) -> tuple[dict, str | None]:
    """Lê o modelo Excel e retorna (dados_por_aba, erro)."""
    import io
    try:
        dados = {}
        for aba in ["TERMINAÇÃO", "CRIA", "RECRIA"]:
            try:
                df = pd.read_excel(
                    io.BytesIO(arquivo_bytes),
                    sheet_name=aba, header=None, skiprows=3,
                )
                aba_dados = {}
                for _, row in df.iterrows():
                    campo = str(row[3]).strip() if pd.notna(row[3]) else None
                    valor = row[1] if pd.notna(row[1]) else None
                    if campo and campo != "nan" and valor is not None:
                        aba_dados[campo] = valor
                dados[aba] = aba_dados
            except Exception:
                dados[aba] = {}
        return dados, None
    except Exception as e:
        return {}, str(e)


def val_int(d: dict, key: str, default: int) -> int:
    return int(d.get(key, default))

def val_float(d: dict, key: str, default: float) -> float:
    return float(d.get(key, default))


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

st.sidebar.image(
    "https://em-content.zobj.net/source/google/387/cow_1f404.png", width=56
)
st.sidebar.title("Terminal")
st.sidebar.caption("Inteligência Financeira para Pecuária")
st.sidebar.divider()

# Upload do Excel
st.sidebar.markdown("**📂 Dados da Fazenda**")
arquivo = st.sidebar.file_uploader("Upload do modelo Excel", type=["xlsx"])
dados_excel: dict = {}
if arquivo:
    dados_excel, erro = carregar_excel(arquivo.read())
    if erro:
        st.sidebar.error(f"Erro: {erro}")
    else:
        st.sidebar.success("✅ Planilha carregada!")

st.sidebar.divider()

# Modo de cotação
st.sidebar.markdown("**📡 Cotações de Mercado**")
usar_tempo_real = st.sidebar.toggle("Cotações em tempo real", value=True)

if usar_tempo_real:
    cotacoes = buscar_cotacoes()
else:
    cotacoes = cotacoes_ficticias()

# Sistema produtivo
st.sidebar.divider()
sistema = st.sidebar.selectbox(
    "Sistema produtivo",
    [
        "Terminação — Pasto",
        "Terminação — Confinamento",
        "Terminação — Semiconfinamento",
        "Cria",
        "Recria",
    ],
)


# ---------------------------------------------------------------------------
# Componentes reutilizáveis
# ---------------------------------------------------------------------------

def render_painel_mercado(cotacoes, preco_arroba_operacao: float | None = None):
    """Exibe painel de cotações no topo — compacto e limpo."""
    c1, c2, c3, c4 = st.columns(4)

    if cotacoes.arroba_boi_gordo:
        delta = f"BE: R$ {preco_arroba_operacao:,.0f}/@" if preco_arroba_operacao else None
        c1.metric("Arroba (CEPEA/SP)", f"R$ {cotacoes.arroba_boi_gordo:,.2f}/@", delta)
    else:
        c1.metric("Arroba (CEPEA/SP)", "—")

    if cotacoes.dolar_ptax:
        c2.metric("Dólar PTAX", f"R$ {cotacoes.dolar_ptax:,.2f}")
    else:
        c2.metric("Dólar PTAX", "—")

    if cotacoes.milho_esalq:
        c3.metric("Milho ESALQ", f"R$ {cotacoes.milho_esalq:,.2f}/sc")
    else:
        c3.metric("Milho ESALQ", "—")

    if cotacoes.cdi_anual:
        c4.metric("CDI", f"{cotacoes.cdi_anual * 100:.2f}% a.a.")
    else:
        c4.metric("CDI", "—")

    if cotacoes.timestamp:
        fonte = "CEPEA + BCB" if usar_tempo_real else "Dados fictícios"
        st.markdown(
            f'<p class="mercado-caption">Atualizado: {cotacoes.timestamp.strftime("%d/%m/%Y %H:%M")} · {fonte}</p>',
            unsafe_allow_html=True,
        )


def render_semaforo(margem_pct: float, break_even: float, preco_atual: float):
    """Semáforo de decisão de venda — grande e claro."""
    spread = preco_atual - break_even
    if spread < 0:
        emoji, status, classe = "🔴", "ABAIXO DO BREAK-EVEN", "semaforo semaforo-vermelho"
        detalhe = f"Preço atual R$ {preco_atual:,.0f}/@ está R$ {abs(spread):,.0f} abaixo do break-even"
    elif margem_pct < 0.08:
        emoji, status, classe = "🟡", "MARGEM APERTADA", "semaforo semaforo-amarelo"
        detalhe = f"Margem de {margem_pct*100:.1f}% — spread de R$ {spread:,.0f}/@ sobre o break-even"
    else:
        emoji, status, classe = "🟢", "MARGEM SAUDÁVEL", "semaforo semaforo-verde"
        detalhe = f"Margem de {margem_pct*100:.1f}% — spread de R$ {spread:,.0f}/@ sobre o break-even"

    st.markdown(
        f'<div class="{classe}">'
        f'<span class="semaforo-emoji">{emoji}</span>'
        f'<div><strong>{status}</strong><br>'
        f'<span style="font-size:0.85rem;opacity:0.85">{detalhe}</span></div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_grafico_historico_dolar():
    """Gráfico histórico do dólar — 30 dias."""
    with st.expander("📈 Histórico do Dólar — 30 dias", expanded=False):
        historico = buscar_historico_dolar(30)
        if historico:
            df = pd.DataFrame(historico)
            st.line_chart(df.set_index("data")["valor"],
                          use_container_width=True, height=200)
            st.caption("Fonte: AwesomeAPI / Banco Central do Brasil")
        else:
            st.info("Histórico indisponível no momento.")


def render_simulador_cenarios(break_even: float, arrobas: float, custo_total: float):
    """Slider interativo de simulação de preço."""
    st.subheader("Simulador de cenários")
    preco_ref = cotacoes.arroba_boi_gordo or break_even
    col1, col2 = st.columns([2, 1])
    with col1:
        preco_sim = st.slider(
            "Simule o preço da arroba (R$/@)",
            min_value=int(preco_ref * 0.5),
            max_value=int(preco_ref * 1.5),
            value=int(preco_ref),
            step=1,
        )
    with col2:
        receita_sim = arrobas * preco_sim
        margem_sim = receita_sim - custo_total
        st.metric("Receita simulada", f"R$ {receita_sim:,.0f}")
        st.metric(
            "Margem simulada", f"R$ {margem_sim:,.0f}",
            delta=f"{(margem_sim / receita_sim * 100):.1f}%" if receita_sim > 0 else None,
        )


def render_historico_lotes(lote_resultado: dict):
    """Salva e exibe histórico de lotes calculados na sessão."""
    if "historico_lotes" not in st.session_state:
        st.session_state.historico_lotes = []

    col1, col2 = st.columns([3, 1])
    with col2:
        if st.button("💾 Salvar este lote"):
            st.session_state.historico_lotes.append(
                {"data": datetime.now().strftime("%d/%m %H:%M"), **lote_resultado}
            )
            st.success("Lote salvo!")

    if st.session_state.historico_lotes:
        with st.expander(
            f"📋 Histórico ({len(st.session_state.historico_lotes)} lotes salvos)",
            expanded=False,
        ):
            df = pd.DataFrame(st.session_state.historico_lotes)
            st.dataframe(df, use_container_width=True, hide_index=True)


def render_painel_impacto(inp, preco_venda: float):
    """
    Painel de Impacto Econômico — visual limpo para demo.
    """
    exposure = exp_engine.calcular(inp)
    cdi = cotacoes.cdi_anual or 0.1415
    report = impact_engine.calcular(exposure, preco_mercado=preco_venda, cdi_referencia=cdi)

    st.markdown('<p class="impact-header">Painel de impacto econômico</p>', unsafe_allow_html=True)
    st.markdown('<p class="impact-sub">O que acontece com seu lote se a arroba cair?</p>', unsafe_allow_html=True)

    # Tabela HTML customizada — compatível com dark/light mode
    cor_map = {
        "verde": ("rgba(25,135,84,0.2)", "#2dd47b"),
        "amarelo": ("rgba(255,193,7,0.2)", "#ffcd39"),
        "vermelho": ("rgba(220,53,69,0.2)", "#ff6b7a"),
    }
    emoji_map = {"verde": "🟢", "amarelo": "🟡", "vermelho": "🔴"}

    html = """<table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin:8px 0;color:inherit;">
    <thead><tr style="border-bottom:2px solid rgba(128,128,128,0.3);text-align:left;">
        <th style="padding:10px 8px;width:30px;"></th>
        <th style="padding:10px 8px;">Cenário</th>
        <th style="padding:10px 8px;text-align:right;">Arroba</th>
        <th style="padding:10px 8px;text-align:right;">Margem</th>
        <th style="padding:10px 8px;text-align:right;">Margem %</th>
        <th style="padding:10px 8px;text-align:right;">ROI anual</th>
    </tr></thead><tbody>"""

    for c in report.cenarios:
        bg, fg = cor_map[c.semaforo]
        emoji = emoji_map[c.semaforo]
        bold = ' style="font-weight:600;"' if c.variacao_pct == 0 else ""
        html += f"""<tr style="border-bottom:1px solid rgba(128,128,128,0.15);">
            <td style="padding:10px 8px;font-size:1.2rem;">{emoji}</td>
            <td style="padding:10px 8px;"{bold}>{c.label}</td>
            <td style="padding:10px 8px;text-align:right;">R$ {c.preco_arroba:,.0f}</td>
            <td style="padding:10px 8px;text-align:right;">R$ {c.margem_brl:,.0f}</td>
            <td style="padding:10px 8px;text-align:right;">
                <span style="background:{bg};color:{fg};padding:3px 10px;border-radius:12px;font-weight:500;font-size:0.82rem;">
                    {c.margem_pct*100:.1f}%
                </span>
            </td>
            <td style="padding:10px 8px;text-align:right;">{c.roi_anualizado*100:.1f}%</td>
        </tr>"""

    html += "</tbody></table>"
    st.markdown(html, unsafe_allow_html=True)

    # Pergunta invertida
    if any(c.semaforo == "vermelho" for c in report.cenarios):
        st.markdown(
            f'<div class="pergunta-invertida pergunta-alerta">⚠️ {report.pergunta_invertida}</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<div class="pergunta-invertida pergunta-ok">✅ {report.pergunta_invertida}</div>',
            unsafe_allow_html=True,
        )


def render_painel_hedge(inp, preco_venda: float):
    """
    Painel de Proteção com Futuros B3 — visual para pecuarista.
    Mostra gráfico comparativo + cards SE TRAVAR vs SE NÃO TRAVAR.
    """
    import altair as alt

    exposure = exp_engine.calcular(inp)

    # Guard: lote muito pequeno
    if exposure.arrobas_totais < 165:
        st.info("Lote pequeno demais para hedge com futuros B3 (mínimo ~165@, 1 contrato = 330@)")
        return

    # Buscar futuros
    curva = buscar_futuros_bgi() if usar_tempo_real else None
    if curva is None:
        curva = futuros_bgi_ficticios()

    contrato = hedge_engine.selecionar_contrato(curva, exposure.data_venda_projetada)
    if contrato is None:
        st.warning("Nenhum contrato futuro disponível para a data de venda projetada.")
        return

    # Premissas ajustáveis
    with st.expander("Ajustar premissas do hedge", expanded=False):
        c1, c2, c3 = st.columns(3)
        regiao = c1.selectbox("Região", list(BASIS_REGIAO.keys()), index=1)  # MS default
        basis = c2.slider(
            "Basis (R$/@)", -20.0, 5.0,
            float(BASIS_REGIAO.get(regiao, -5.0)), step=0.5,
        )
        margem_pct = c3.number_input(
            "Margem garantia (%)", 1.0, 20.0, 5.0, step=0.5,
        ) / 100

    cdi = cotacoes.cdi_anual or 0.1415

    result = hedge_engine.calcular(
        exposure=exposure,
        contrato=contrato,
        preco_spot=preco_venda,
        basis_estimado=basis,
        cdi_anual=cdi,
        margem_garantia_pct=margem_pct,
    )

    # --- Semáforo de proteção ---
    _semaforo_map = {
        "recomendado": ("🔴", "PROTEÇÃO RECOMENDADA", "semaforo semaforo-vermelho"),
        "opcional": ("🟡", "PROTEÇÃO OPCIONAL", "semaforo semaforo-amarelo"),
        "desnecessario": ("🟢", "MARGEM CONFORTÁVEL", "semaforo semaforo-verde"),
    }
    emoji, status, classe = _semaforo_map[result.semaforo_hedge]
    st.markdown(
        f'<div class="{classe}">'
        f'<span class="semaforo-emoji">{emoji}</span>'
        f'<div><strong>{status}</strong><br>'
        f'<span style="font-size:0.85rem;opacity:0.85">'
        f'Contrato {result.contrato_selecionado.codigo} · '
        f'{result.contratos_necessarios} contrato(s) · '
        f'{result.cobertura_pct * 100:.0f}% coberto'
        f'</span></div></div>',
        unsafe_allow_html=True,
    )

    # --- Gráfico de barras: "Seu lote em 3 cenários" ---
    st.markdown(
        '<p class="impact-header">Seu lote em 3 cenários</p>',
        unsafe_allow_html=True,
    )

    chart_data = []
    for c in result.cenarios_grafico:
        chart_data.append({
            "Cenário": c["cenario"],
            "Tipo": "Sem hedge",
            "Lucro (R$)": c["sem_hedge"],
        })
        chart_data.append({
            "Cenário": c["cenario"],
            "Tipo": "Com hedge",
            "Lucro (R$)": c["com_hedge"],
        })

    df_chart = pd.DataFrame(chart_data)

    ordem_cenarios = [c["cenario"] for c in result.cenarios_grafico]

    chart = (
        alt.Chart(df_chart)
        .mark_bar(cornerRadiusEnd=4)
        .encode(
            y=alt.Y("Cenário:N", sort=ordem_cenarios, title=None),
            x=alt.X("Lucro (R$):Q", title="Lucro do lote (R$)"),
            color=alt.Color(
                "Tipo:N",
                scale=alt.Scale(
                    domain=["Sem hedge", "Com hedge"],
                    range=["#ff6b7a", "#2dd47b"],
                ),
                legend=alt.Legend(orient="top", title=None),
            ),
            yOffset="Tipo:N",
        )
        .properties(height=200)
    )

    # Linha de zero
    zero_line = (
        alt.Chart(pd.DataFrame({"x": [0]}))
        .mark_rule(color="gray", strokeDash=[4, 4], opacity=0.5)
        .encode(x="x:Q")
    )

    st.altair_chart(chart + zero_line, use_container_width=True)

    # --- Cards SE TRAVAR vs SE NÃO TRAVAR ---
    col_travar, col_nao = st.columns(2)

    with col_travar:
        st.markdown(
            '<div style="background:rgba(25,135,84,0.1);border:1px solid rgba(25,135,84,0.3);'
            'border-radius:10px;padding:16px;">'
            '<strong style="color:#2dd47b;">SE TRAVAR</strong><br><br>'
            f'<span style="font-size:0.85rem;opacity:0.7;">Preço garantido</span><br>'
            f'<span style="font-size:1.3rem;font-weight:600;">R$ {result.preco_travado:,.0f}/@</span><br><br>'
            f'<span style="font-size:0.85rem;opacity:0.7;">Você garante</span><br>'
            f'<span style="font-size:1.3rem;font-weight:600;">R$ {result.margem_hedgeada_brl:,.0f} de lucro</span><br><br>'
            f'<span style="font-size:0.8rem;opacity:0.6;">'
            f'{result.contrato_selecionado.codigo} · '
            f'{result.contratos_necessarios} contrato(s) ({result.arrobas_hedgeadas:.0f}@)</span>'
            '</div>',
            unsafe_allow_html=True,
        )

    with col_nao:
        queda_20 = result.cenarios_grafico[0]  # primeiro cenário = queda 20%
        st.markdown(
            '<div style="background:rgba(220,53,69,0.1);border:1px solid rgba(220,53,69,0.3);'
            'border-radius:10px;padding:16px;">'
            '<strong style="color:#ff6b7a;">SE NÃO TRAVAR</strong><br><br>'
            f'<span style="font-size:0.85rem;opacity:0.7;">Preço atual</span><br>'
            f'<span style="font-size:1.3rem;font-weight:600;">R$ {result.preco_spot:,.0f}/@</span><br><br>'
            f'<span style="font-size:0.85rem;opacity:0.7;">Se cair 20%</span><br>'
            f'<span style="font-size:1.3rem;font-weight:600;color:#ff6b7a;">'
            f'{"Perde" if queda_20["sem_hedge"] < 0 else "Lucro cai para"} '
            f'R$ {queda_20["sem_hedge"]:,.0f}</span><br><br>'
            f'<span style="font-size:0.8rem;opacity:0.6;">'
            f'Nada protege suas {result.arrobas_totais:.0f} arrobas</span>'
            '</div>',
            unsafe_allow_html=True,
        )

    # --- Frase de decisão ---
    if result.semaforo_hedge == "recomendado":
        st.markdown(
            f'<div class="pergunta-invertida pergunta-alerta">⚠️ {result.justificativa}</div>',
            unsafe_allow_html=True,
        )
    elif result.semaforo_hedge == "desnecessario":
        st.markdown(
            f'<div class="pergunta-invertida pergunta-ok">✅ {result.justificativa}</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<div class="pergunta-invertida pergunta-alerta">💡 {result.justificativa}</div>',
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Terminação em Pasto
# ---------------------------------------------------------------------------

if sistema == "Terminação — Pasto":
    st.title("Terminação em Pastagem")
    st.caption("Indicador central: custo por arroba produzida")

    ex = dados_excel.get("TERMINAÇÃO", {})
    if ex:
        st.info("📊 Dados carregados da planilha. Ajuste se necessário.")

    with st.expander("📋 Dados do Lote", expanded=True):
        c1, c2, c3 = st.columns(3)
        num_animais  = c1.number_input("Animais", 1, 10000, val_int(ex, "num_animais", 120))
        peso_entrada = c2.number_input("Peso entrada (kg)", 100, 600, val_int(ex, "peso_entrada_kg", 380))
        peso_saida   = c3.number_input("Peso saída estimado (kg)", 200, 700, val_int(ex, "peso_saida_estimado_kg", 490))
        c4, c5, c6 = st.columns(3)
        dias_ciclo   = c4.number_input("Dias de ciclo", 30, 365, val_int(ex, "dias_ciclo", 90))
        rendimento   = c5.number_input("Rendimento carcaça (%)", 40, 65,
                                        int(val_float(ex, "rendimento_carcaca", 0.52) * 100)) / 100
        custo_repos  = c6.number_input("Custo reposição total (R$)", 0, 10_000_000,
                                        val_int(ex, "custo_reposicao_total", 264_000), step=1000)

    with st.expander("💰 Custos Operacionais (R$/cabeça/dia)", expanded=True):
        c1, c2 = st.columns(2)
        custo_supl = c1.number_input("Suplementação", 0.0, 50.0, val_float(ex, "custo_suplementacao_dia", 4.50), step=0.10)
        custo_san  = c2.number_input("Sanidade", 0.0, 20.0, val_float(ex, "custo_sanidade_dia", 0.80), step=0.10)
        c3, c4 = st.columns(2)
        custo_mo   = c3.number_input("Mão de obra", 0.0, 20.0, val_float(ex, "custo_mao_obra_dia", 1.20), step=0.10)
        custo_arr  = c4.number_input("Arrendamento", 0.0, 30.0, val_float(ex, "custo_arrendamento_dia", 2.00), step=0.10)

    with st.expander("🚛 Custos Fixos (R$)", expanded=False):
        c1, c2 = st.columns(2)
        frete_saida = c1.number_input("Frete frigorífico", 0, 200_000, val_int(ex, "custo_frete_saida", 5_400), step=100)
        mortalidade = c2.number_input("Provisão mortalidade", 0, 100_000, val_int(ex, "custo_mortalidade_estimada", 3_700), step=100)

    preco_venda = st.sidebar.number_input(
        "Cotação arroba para cálculo (R$/@)",
        min_value=100.0, max_value=600.0,
        value=float(cotacoes.arroba_boi_gordo or 315.0), step=1.0,
    )

    inp = InputTerminacaoPasto(
        nome="Terminação Pasto",
        data_entrada=date.today(),
        num_animais=num_animais,
        peso_entrada_kg=float(peso_entrada),
        custo_reposicao_total=float(custo_repos),
        dias_ciclo=dias_ciclo,
        peso_saida_estimado_kg=float(peso_saida),
        custo_suplementacao_dia=custo_supl,
        custo_sanidade_dia=custo_san,
        custo_mao_obra_dia=custo_mo,
        custo_arrendamento_dia=custo_arr,
        custo_frete_saida=float(frete_saida),
        custo_mortalidade_estimada=float(mortalidade),
        rendimento_carcaca=rendimento,
    )
    try:
        r = engine.calcular_terminacao_pasto(inp, preco_venda)
    except (ValueError, ZeroDivisionError) as e:
        st.error(f"Erro no cálculo: {e}. Verifique os dados do lote.")
        st.stop()

    # --- Semáforo primeiro — resposta imediata ---
    render_semaforo(r.margem_percentual, r.break_even_price, preco_venda)

    render_painel_mercado(cotacoes, r.break_even_price)

    st.divider()

    # --- Métricas + alertas inline ---
    st.subheader("Resultado do lote")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Custo por arroba", f"R$ {r.custo_por_arroba:,.2f}/@")
    c2.metric("Break-even", f"R$ {r.break_even_price:,.2f}/@",
              delta=f"spread R$ {preco_venda - r.break_even_price:,.2f}", delta_color="normal")
    c3.metric("Margem bruta", f"R$ {r.margem_bruta:,.0f}",
              delta=f"{r.margem_percentual * 100:.1f}%")
    c4.metric("ROI anualizado", f"{r.roi_anualizado * 100:.1f}%")

    cdi = cotacoes.cdi_anual or 0.1415
    if r.margem_apertada:
        st.markdown('<div class="alerta-warn">⚠️ Margem < 8%</div>', unsafe_allow_html=True)
    if r.roi_anualizado < cdi:
        st.markdown(f'<div class="alerta-warn">⚠️ ROI abaixo do CDI ({cdi*100:.1f}% a.a.)</div>', unsafe_allow_html=True)

    st.divider()

    # --- Impacto econômico (componente mais valioso) ---
    render_painel_impacto(inp, preco_venda)

    st.divider()

    # --- Proteção com futuros B3 ---
    st.subheader("Proteção com futuros B3")
    render_painel_hedge(inp, preco_venda)

    st.divider()

    # --- Composição de custos + simulador ---
    col_esq, col_dir = st.columns(2)
    with col_esq:
        st.subheader("Composição de custos")
        df_custos = pd.DataFrame({
            "Componente": ["Reposição", "Operacional", "Fixos", "Oportunidade"],
            "R$": [r.custo_reposicao, r.custo_operacional, r.custo_fixo, r.custo_oportunidade],
        })
        st.bar_chart(df_custos.set_index("Componente"), height=280)
        st.metric("Exposição por R$ 1/@", f"± R$ {r.exposicao_preco:,.0f}")
    with col_dir:
        render_simulador_cenarios(r.break_even_price, r.arrobas_totais, r.custo_total)

    render_grafico_historico_dolar()

    render_historico_lotes({
        "sistema": "Terminação Pasto",
        "animais": r.num_animais,
        "arrobas": f"{r.arrobas_totais:.0f}",
        "custo/@": f"R$ {r.custo_por_arroba:.2f}",
        "break-even": f"R$ {r.break_even_price:.2f}",
        "margem%": f"{r.margem_percentual * 100:.1f}%",
        "ROI a.a.": f"{r.roi_anualizado * 100:.1f}%",
    })


# ---------------------------------------------------------------------------
# Confinamento
# ---------------------------------------------------------------------------

elif sistema == "Terminação — Confinamento":
    st.title("Confinamento")
    st.caption("Indicador central: custo por arroba · participação da dieta")

    with st.expander("📋 Dados do Lote", expanded=True):
        c1, c2, c3 = st.columns(3)
        num_animais  = c1.number_input("Animais", 1, 10000, 500)
        peso_entrada = c2.number_input("Peso entrada (kg)", 100, 600, 380)
        peso_saida   = c3.number_input("Peso saída (kg)", 200, 700, 510)
        c4, c5, c6 = st.columns(3)
        dias_ciclo   = c4.number_input("Dias de ciclo", 30, 200, 100)
        rendimento   = c5.number_input("Rendimento carcaça (%)", 40, 65, 55) / 100
        custo_repos  = c6.number_input("Custo reposição (R$)", 0, 50_000_000, 1_050_000, step=10_000)

    with st.expander("🌽 Dieta", expanded=True):
        c1, c2 = st.columns(2)
        consumo_ms     = c1.number_input("Consumo MS (% peso vivo)", 1.5, 4.0, 2.4, step=0.1) / 100
        custo_dieta_kg = c2.number_input("Custo dieta (R$/kg MS)", 0.30, 2.00, 0.68, step=0.01)

    with st.expander("💰 Outros Custos (R$/cabeça/dia)", expanded=False):
        c1, c2 = st.columns(2)
        custo_san  = c1.number_input("Sanidade", 0.0, 20.0, 0.90, step=0.10)
        custo_mo   = c2.number_input("Mão de obra", 0.0, 20.0, 1.50, step=0.10)
        custo_inst = st.columns(2)[0].number_input("Instalações", 0.0, 10.0, 0.80, step=0.10)

    with st.expander("🚛 Fretes e Mortalidade (R$)", expanded=False):
        c1, c2, c3 = st.columns(3)
        frete_ent = c1.number_input("Frete entrada", 0, 200_000, 18_000, step=500)
        frete_sai = c2.number_input("Frete saída", 0, 200_000, 20_000, step=500)
        mortal    = c3.number_input("Mortalidade", 0, 200_000, 8_400, step=500)

    preco_venda = st.sidebar.number_input(
        "Cotação arroba (R$/@)", min_value=100.0, max_value=600.0,
        value=float(cotacoes.arroba_boi_gordo or 315.0), step=1.0,
    )

    inp = InputConfinamento(
        nome="Confinamento",
        data_entrada=date.today(),
        num_animais=num_animais,
        peso_entrada_kg=float(peso_entrada),
        custo_reposicao_total=float(custo_repos),
        dias_ciclo=dias_ciclo,
        peso_saida_estimado_kg=float(peso_saida),
        consumo_ms_pct_pv=consumo_ms,
        custo_dieta_kg_ms=custo_dieta_kg,
        custo_sanidade_dia=custo_san,
        custo_mao_obra_dia=custo_mo,
        custo_instalacoes_dia=custo_inst,
        custo_frete_entrada=float(frete_ent),
        custo_frete_saida=float(frete_sai),
        custo_mortalidade_estimada=float(mortal),
        rendimento_carcaca=rendimento,
    )
    try:
        r = engine.calcular_confinamento(inp, preco_venda)
    except (ValueError, ZeroDivisionError) as e:
        st.error(f"Erro no cálculo: {e}. Verifique os dados do lote.")
        st.stop()

    render_semaforo(r.margem_percentual, r.break_even_price, preco_venda)

    render_painel_mercado(cotacoes, r.break_even_price)

    st.divider()

    st.subheader("Resultado do lote")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Custo por arroba", f"R$ {r.custo_por_arroba:,.2f}/@")
    c2.metric("Break-even", f"R$ {r.break_even_price:,.2f}/@",
              delta=f"spread R$ {preco_venda - r.break_even_price:,.2f}")
    c3.metric("Margem bruta", f"R$ {r.margem_bruta:,.0f}",
              delta=f"{r.margem_percentual * 100:.1f}%")
    c4.metric("ROI anualizado", f"{r.roi_anualizado * 100:.1f}%")

    if r.margem_apertada:
        st.markdown('<div class="alerta-warn">⚠️ Margem < 8%</div>', unsafe_allow_html=True)
    st.metric("Participação da dieta", f"{r.participacao_dieta_pct * 100:.1f}% do custo")

    st.divider()

    render_painel_impacto(inp, preco_venda)

    st.divider()

    st.subheader("Proteção com futuros B3")
    render_painel_hedge(inp, preco_venda)

    st.divider()

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Composição de custos")
        df = pd.DataFrame({
            "Componente": ["Dieta", "Outros operac.", "Reposição", "Fixos + Oport."],
            "R$": [r.custo_dieta_total, r.custo_outros_operacional,
                   r.custo_reposicao, r.custo_fixo + r.custo_oportunidade],
        })
        st.bar_chart(df.set_index("Componente"), height=280)
        st.metric("Exposição por R$ 1/@", f"± R$ {r.exposicao_preco:,.0f}")
    with col2:
        render_simulador_cenarios(r.break_even_price, r.arrobas_totais, r.custo_total)

    render_grafico_historico_dolar()

    render_historico_lotes({
        "sistema": "Confinamento",
        "animais": r.num_animais,
        "custo/@": f"R$ {r.custo_por_arroba:.2f}",
        "dieta %": f"{r.participacao_dieta_pct * 100:.1f}%",
        "margem%": f"{r.margem_percentual * 100:.1f}%",
        "ROI a.a.": f"{r.roi_anualizado * 100:.1f}%",
    })


# ---------------------------------------------------------------------------
# Semiconfinamento
# ---------------------------------------------------------------------------

elif sistema == "Terminação — Semiconfinamento":
    st.title("Semiconfinamento")
    st.caption("Indicador central: custo por arroba · eficiência da suplementação")

    with st.expander("📋 Dados do Lote", expanded=True):
        c1, c2, c3 = st.columns(3)
        num_animais  = c1.number_input("Animais", 1, 10000, 200)
        peso_entrada = c2.number_input("Peso entrada (kg)", 100, 600, 360)
        peso_saida   = c3.number_input("Peso saída (kg)", 200, 700, 490)
        c4, c5, c6 = st.columns(3)
        dias_ciclo   = c4.number_input("Dias de ciclo", 30, 300, 110)
        rendimento   = c5.number_input("Rendimento carcaça (%)", 40, 65, 53) / 100
        custo_repos  = c6.number_input("Custo reposição (R$)", 0, 10_000_000, 390_000, step=5000)

    with st.expander("💰 Custos", expanded=True):
        c1, c2 = st.columns(2)
        custo_arr   = c1.number_input("Arrendamento (R$/cab/dia)", 0.0, 20.0, 2.0, step=0.1)
        custo_pasto = c2.number_input("Manutenção pasto (R$/cab/dia)", 0.0, 10.0, 0.8, step=0.1)
        c3, c4 = st.columns(2)
        cons_supl   = c3.number_input("Consumo suplemento (kg/cab/dia)", 0.5, 10.0, 3.5, step=0.1)
        custo_supl  = c4.number_input("Custo suplemento (R$/kg)", 0.3, 3.0, 0.95, step=0.05)
        c5, c6 = st.columns(2)
        custo_san   = c5.number_input("Sanidade (R$/cab/dia)", 0.0, 5.0, 0.7, step=0.1)
        custo_mo    = c6.number_input("Mão de obra (R$/cab/dia)", 0.0, 10.0, 1.1, step=0.1)

    preco_venda = st.sidebar.number_input(
        "Cotação arroba (R$/@)", min_value=100.0, max_value=600.0,
        value=float(cotacoes.arroba_boi_gordo or 315.0), step=1.0,
    )

    inp = InputSemiconfinamento(
        nome="Semiconfinamento",
        data_entrada=date.today(),
        num_animais=num_animais,
        peso_entrada_kg=float(peso_entrada),
        custo_reposicao_total=float(custo_repos),
        dias_ciclo=dias_ciclo,
        peso_saida_estimado_kg=float(peso_saida),
        custo_arrendamento_dia=custo_arr,
        custo_manutencao_pasto_dia=custo_pasto,
        consumo_suplemento_kg_dia=cons_supl,
        custo_suplemento_kg=custo_supl,
        custo_sanidade_dia=custo_san,
        custo_mao_obra_dia=custo_mo,
        rendimento_carcaca=rendimento,
    )
    try:
        r = engine.calcular_semiconfinamento(inp, preco_venda)
    except (ValueError, ZeroDivisionError) as e:
        st.error(f"Erro no cálculo: {e}. Verifique os dados do lote.")
        st.stop()

    render_semaforo(r.margem_percentual, r.break_even_price, preco_venda)

    render_painel_mercado(cotacoes, r.break_even_price)

    st.divider()

    st.subheader("Resultado do lote")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Custo por arroba", f"R$ {r.custo_por_arroba:,.2f}/@")
    c2.metric("Break-even", f"R$ {r.break_even_price:,.2f}/@",
              delta=f"spread R$ {preco_venda - r.break_even_price:,.2f}")
    c3.metric("Margem bruta", f"R$ {r.margem_bruta:,.0f}",
              delta=f"{r.margem_percentual * 100:.1f}%")
    c4.metric("ROI anualizado", f"{r.roi_anualizado * 100:.1f}%")

    if r.margem_apertada:
        st.markdown('<div class="alerta-warn">⚠️ Margem apertada</div>', unsafe_allow_html=True)
    st.metric("Suplementação por arroba", f"R$ {r.custo_suplementacao_por_arroba:,.2f}/@")

    st.divider()

    render_painel_impacto(inp, preco_venda)

    st.divider()

    st.subheader("Proteção com futuros B3")
    render_painel_hedge(inp, preco_venda)

    st.divider()

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Composição de custos")
        df = pd.DataFrame({
            "Componente": ["Reposição", "Pastagem", "Suplementação", "Outros", "Oportunidade"],
            "R$": [r.custo_reposicao, r.custo_pastagem,
                   r.custo_suplementacao, r.custo_outros, r.custo_oportunidade],
        })
        st.bar_chart(df.set_index("Componente"), height=280)
        st.metric("Exposição por R$ 1/@", f"± R$ {r.exposicao_preco:,.0f}")
    with col2:
        render_simulador_cenarios(r.break_even_price, r.arrobas_totais, r.custo_total)

    render_grafico_historico_dolar()

    render_historico_lotes({
        "sistema": "Semiconfinamento",
        "animais": r.num_animais,
        "arrobas": f"{r.arrobas_totais:.0f}",
        "custo/@": f"R$ {r.custo_por_arroba:.2f}",
        "supl/@": f"R$ {r.custo_suplementacao_por_arroba:.2f}",
        "margem%": f"{r.margem_percentual * 100:.1f}%",
        "ROI a.a.": f"{r.roi_anualizado * 100:.1f}%",
    })


# ---------------------------------------------------------------------------
# Cria
# ---------------------------------------------------------------------------

elif sistema == "Cria":
    st.title("Sistema de Cria")
    st.caption("Indicador central: custo por bezerro produzido")

    ex = dados_excel.get("CRIA", {})
    if ex:
        st.info("📊 Dados carregados da planilha.")

    with st.expander("📋 Rebanho", expanded=True):
        c1, c2, c3 = st.columns(3)
        num_matrizes = c1.number_input("Matrizes", 10, 10000, val_int(ex, "num_matrizes", 400))
        taxa_natal   = c2.number_input("Taxa natalidade (%)", 40, 100,
                                        int(val_float(ex, "taxa_natalidade", 0.80) * 100)) / 100
        taxa_desmama = c3.number_input("Taxa desmama (%)", 40, 100,
                                        int(val_float(ex, "taxa_desmama", 0.90) * 100)) / 100
        c4, c5 = st.columns(2)
        peso_desmama = c4.number_input("Peso ao desmame (kg)", 100, 300, val_int(ex, "peso_desmama_kg", 195))
        valor_matriz = c5.number_input("Valor da matriz (R$)", 1000, 20000,
                                        val_int(ex, "valor_matriz", 4800), step=100)

    with st.expander("💰 Custos Anuais (R$/UA/ano)", expanded=True):
        c1, c2, c3 = st.columns(3)
        custo_nut = c1.number_input("Nutrição", 0, 5000, val_int(ex, "custo_nutricao_ua_ano", 480), step=10)
        custo_san = c2.number_input("Sanidade", 0, 2000, val_int(ex, "custo_sanidade_ua_ano", 120), step=10)
        custo_rep = c3.number_input("Reprodução", 0, 3000, val_int(ex, "custo_reproducao_ua_ano", 180), step=10)
        c4, c5, c6 = st.columns(3)
        custo_mo  = c4.number_input("Mão de obra", 0, 3000, val_int(ex, "custo_mao_obra_ua_ano", 200), step=10)
        custo_ar  = c5.number_input("Arrendamento", 0, 5000, val_int(ex, "custo_arrendamento_ua_ano", 350), step=10)
        outros    = c6.number_input("Outros", 0, 2000, val_int(ex, "outros_custos_ua_ano", 80), step=10)

    inp = InputCria(
        nome="Cria",
        data_referencia=date.today(),
        num_matrizes=num_matrizes,
        taxa_natalidade=taxa_natal,
        taxa_desmama=taxa_desmama,
        peso_desmama_kg=float(peso_desmama),
        custo_nutricao_ua_ano=float(custo_nut),
        custo_sanidade_ua_ano=float(custo_san),
        custo_reproducao_ua_ano=float(custo_rep),
        custo_mao_obra_ua_ano=float(custo_mo),
        custo_arrendamento_ua_ano=float(custo_ar),
        outros_custos_ua_ano=float(outros),
        valor_matriz=float(valor_matriz),
    )
    try:
        r = engine.calcular_cria(inp)
    except (ValueError, ZeroDivisionError) as e:
        st.error(f"Erro no cálculo: {e}. Verifique os dados do rebanho.")
        st.stop()

    render_painel_mercado(cotacoes)

    st.divider()

    st.subheader("Resultado do lote")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Bezerros desmamados", f"{r.bezerros_desmamados} cab.")
    c2.metric("► Custo/bezerro", f"R$ {r.custo_por_bezerro_produzido:,.0f}")
    c3.metric("Custo/matriz/ano", f"R$ {r.custo_por_matriz_ano:,.0f}")
    c4.metric("Capital rebanho", f"R$ {r.capital_rebanho:,.0f}")

    col1, col2 = st.columns(2)
    with col1:
        df = pd.DataFrame({
            "Item": ["Nutrição", "Sanidade", "Reprodução", "Mão de obra", "Arrendamento", "Oportunidade"],
            "R$": [
                custo_nut * num_matrizes, custo_san * num_matrizes,
                custo_rep * num_matrizes, custo_mo * num_matrizes,
                custo_ar * num_matrizes, r.custo_oportunidade,
            ],
        })
        st.bar_chart(df.set_index("Item"), height=280)
    with col2:
        st.metric("Taxa de natalidade", f"{taxa_natal * 100:.0f}%")
        st.metric("Taxa de desmama", f"{taxa_desmama * 100:.0f}%")
        st.metric("Kg produzido por matriz", f"{r.kg_produzido_por_matriz:.0f} kg")
        st.metric("Custo total anual", f"R$ {r.custo_total_ano:,.0f}")


# ---------------------------------------------------------------------------
# Recria
# ---------------------------------------------------------------------------

elif sistema == "Recria":
    st.title("Recria")
    st.caption("Indicador central: custo por kg de peso vivo ganho")

    ex = dados_excel.get("RECRIA", {})

    with st.expander("📋 Dados", expanded=True):
        c1, c2, c3 = st.columns(3)
        num_animais  = c1.number_input("Animais", 1, 5000, val_int(ex, "num_animais", 280))
        peso_entrada = c2.number_input("Peso entrada (kg)", 100, 400, val_int(ex, "peso_entrada_kg", 195))
        peso_saida   = c3.number_input("Peso saída (kg)", 150, 500, val_int(ex, "peso_saida_estimado_kg", 370))
        c4, c5 = st.columns(2)
        dias_ciclo   = c4.number_input("Dias de ciclo", 60, 400, val_int(ex, "dias_ciclo", 210))
        custo_aq     = c5.number_input("Custo aquisição (R$) — 0 se próprio",
                                        0, 5_000_000, val_int(ex, "custo_aquisicao_total", 0), step=1000)

    with st.expander("💰 Custos (R$/cabeça/dia)", expanded=True):
        c1, c2 = st.columns(2)
        custo_nut  = c1.number_input("Nutrição", 0.0, 20.0, val_float(ex, "custo_nutricao_dia", 3.2), step=0.1)
        custo_san  = c2.number_input("Sanidade", 0.0, 10.0, val_float(ex, "custo_sanidade_dia", 0.7), step=0.1)
        c3, c4 = st.columns(2)
        custo_mo   = c3.number_input("Mão de obra", 0.0, 10.0, val_float(ex, "custo_mao_obra_dia", 0.9), step=0.1)
        custo_arrd = c4.number_input("Arrendamento", 0.0, 15.0, val_float(ex, "custo_arrendamento_dia", 1.8), step=0.1)

    inp = InputRecria(
        nome="Recria",
        data_entrada=date.today(),
        num_animais=num_animais,
        peso_entrada_kg=float(peso_entrada),
        custo_aquisicao_total=float(custo_aq),
        dias_ciclo=dias_ciclo,
        peso_saida_estimado_kg=float(peso_saida),
        custo_nutricao_dia=custo_nut,
        custo_sanidade_dia=custo_san,
        custo_mao_obra_dia=custo_mo,
        custo_arrendamento_dia=custo_arrd,
    )
    try:
        r = engine.calcular_recria(inp)
    except (ValueError, ZeroDivisionError) as e:
        st.error(f"Erro no cálculo: {e}. Verifique os dados do lote.")
        st.stop()

    render_painel_mercado(cotacoes)

    st.divider()

    st.subheader("Resultado do lote")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("GMD estimado", f"{r.gmd_estimado} kg/dia")
    c2.metric("Kg ganho total", f"{r.kg_ganho_total:,.0f} kg")
    c3.metric("► Custo/kg ganho", f"R$ {r.custo_por_kg_ganho:,.2f}/kg")
    c4.metric("Custo por cabeça", f"R$ {r.custo_por_cabeca:,.0f}")
    st.metric("Custo total da fase", f"R$ {r.custo_total:,.0f}")
