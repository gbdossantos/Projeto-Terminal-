# DESIGN ESTRADA — Handoff para o agente de frontend

> **Status:** proposta aprovada pelo GB para avaliação técnica.
> **De:** sessão de design (Claude Code) · jul/2026
> **Para:** agente de frontend do Terminal
> **Pedido:** ler tudo, avaliar viabilidade contra o código atual e devolver o retorno estruturado do item 9.

---

## 0 · TL;DR

Nova direção visual para o Terminal chamada **Estrada**: country americano (matéria de
couro, nogueira e latão; tipografia Clarendon de pôster do Oeste) executado com a
clareza e o espaço da Apple, e a lógica de "jornada" da Rivian. Substitui a identidade
V19 atual (preto/branco + índigo, DM Sans), que descaracterizou o produto.

A mudança é 80% **camada de tokens** (`frontend/app/globals.css`) + **fontes**
(`frontend/app/layout.tsx`) e 20% **re-arquitetura da Home** (hero de preço em escala
keynote + trilha de lotes).

**Protótipos pra ver antes de ler:**
- Direção completa (manifesto, materiais, tela): https://claude.ai/code/artifact/b54dd738-92f8-4775-972b-549c9880b475
- Variação Estrada (a escolhida, aba A): https://claude.ai/code/artifact/3997566c-1bef-4fb6-acba-dfc26e934ff5
- Demo viva no Streamlit legado: branch `design/estrada-streamlit`, rodar `venv/bin/streamlit run dashboard/app.py` → localhost:8501. O módulo `dashboard/estrada.py` contém CSS/SVGs de referência já funcionando.

---

## 1 · A direção em uma frase

**"Nashville na matéria, Cupertino no traço":** paleta que vem de um balcão de selaria
(osso, nogueira, sela, latão), tipografia de leilão de gado domada por grid editorial,
um único ornamento por tela (a fivela de latão), e o preço da arroba tratado como a
Apple trata um produto — gigante, centrado, cercado de silêncio.

Referências do GB que a direção sintetiza: **Rivian** (paisagem, jornada, ar livre),
**Apple** (escala keynote, respiro, product shot), com Linear/FT/Herman Miller como
temperamentos secundários já explorados e descartados em favor da Estrada.

---

## 2 · Tokens — de-para com o `globals.css` atual

A camada de compatibilidade existente (`--paper`, `--ink`, `--grafite`, `--gain`,
`--loss` + slots shadcn) deve ser **mantida nos mesmos nomes** — só os valores mudam.
Assim todas as telas herdam a direção sem tocar em componente.

```css
:root {
  /* ── Superfícies (osso) ── */
  --paper:           #F6F4EE;                    /* fundo — branco quente de osso */
  --paper-2:         #FFFFFF;                    /* cards */
  --paper-3:         rgba(42, 33, 26, 0.05);     /* separadores, hover */

  /* ── Tinta (nogueira) ── */
  --ink:             #2A211A;
  --ink-2:           #6B5D4E;
  --ink-3:           #98897A;

  /* ── Hairlines ── */
  --rule:            rgba(42, 33, 26, 0.14);
  --rule-strong:     rgba(42, 33, 26, 0.22);

  /* ── Acento: sela/latão substitui o índigo ── */
  --grafite:         #8A5A33;                    /* sela — links, labels de dado */
  --grafite-2:       #7C602C;                    /* latão escuro — hover, CTAs texto */
  --grafite-soft:    rgba(173, 138, 72, 0.10);

  /* ── Semântica: pasto e ferrugem ── */
  --gain:            #5F7A46;
  --gain-2:          #445932;
  --loss:            #A9432E;
  --loss-2:          #8A3625;

  /* ── Brand: latão ── */
  --brand:           #AD8A48;
  --brand-fg:        #2A211A;

  /* ── Novos tokens Estrada (aditivos) ── */
  --nogueira:        #2A211A;                    /* bandas escuras internas */
  --nogueira-3:      #1C1610;                    /* superfície escura profunda */
  --latao:           #AD8A48;
  --latao-hi:        #D3B36E;
  --latao-lo:        #7C602C;
  --sela:            #8A5A33;
  --osso-warm:       #F6F4EE;

  /* ── Sombra: quente, só em objetos "físicos" ── */
  --shadow-card:     0 1px 2px rgba(42,33,26,0.04), 0 12px 28px -18px rgba(42,33,26,0.18);
  --shadow-card-hover: 0 2px 4px rgba(42,33,26,0.05), 0 24px 48px -24px rgba(42,33,26,0.30);
  --radius-card:     20px;                       /* sobe de 12 → 20 (cards Apple) */

  /* warning muda de âmbar Tailwind pra latão */
  --warning:         #AD8A48;
  --warning-bg:      rgba(173, 138, 72, 0.12);
}
```

**Aurora do body (`body::before`):** trocar os radial-gradients índigo/rosa por
calor de fim de tarde, bem sutil:

```css
background:
  radial-gradient(ellipse 65% 50% at 0% 0%,   rgba(173, 138, 72, 0.05), transparent 70%),
  radial-gradient(ellipse 50% 40% at 100% 0%, rgba(138, 90, 51, 0.04),  transparent 70%),
  radial-gradient(ellipse 60% 50% at 100% 100%, rgba(95, 122, 70, 0.04), transparent 70%);
```

**Dark mode:** a direção é single-theme por decisão (o "escuro" dela são as bandas de
nogueira dentro da página, ritmo à la Apple). Manter o reset atual `.dark { color-scheme: light; }`.

---

## 3 · Tipografia

Substituir DM Sans/DM Mono em `frontend/app/layout.tsx`:

```tsx
import { Besley, Instrument_Sans, Spline_Sans_Mono } from "next/font/google";

const besley = Besley({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});
const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});
```

E no `tailwind.config.ts`, `fontFamily.display` passa a apontar pra
`var(--font-display)` (hoje é alias de sans).

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Besley 900** | h1/h2, o preço-keynote, nomes de lote |
| Display itálico | **Besley 400 italic** | ênfases editoriais, "pergunta invertida", segunda metade de nomes (`Marim*bondo*`) |
| Corpo | **Instrument Sans 400/600** | tudo que é texto corrido e UI |
| Dados | **Spline Sans Mono 400/500** | todo número, eyebrows, labels uppercase, tickers |

Por que Besley: é uma **Clarendon** — a letra dos pôsteres do Velho Oeste — em corte
editorial contemporâneo. É o único elemento "country" explícito do sistema tipográfico;
o resto é neutro de propósito (o contraste é a assinatura).

---

## 4 · As leis da direção (não negociáveis sem conversa)

1. **Latão uma vez por tela.** Ou é o CTA, ou é o destaque — nunca os dois.
2. **Sombra só em objeto "físico":** cards de lote, a moldura do dashboard, a fivela.
   Nunca em texto, nunca em banda.
3. **Divisor é costura de sela**, nunca hairline reta em seções principais:
   ```css
   .stitch { height: 8px; background: repeating-linear-gradient(60deg,
     transparent 0 8px, var(--sela) 8px 10.5px, transparent 10.5px 20px); opacity: .55; }
   ```
4. **Número protagonista em mono, título em Besley.** Nunca Besley em número tabular.
5. **Bandas escuras (nogueira) fazem o ritmo da página** — usadas onde a conversa fica
   séria (eventos do dia, pergunta invertida). Não é dark mode, é material.
6. **Semântica ≠ acento.** Pasto/ferrugem só para ganho/perda; latão/sela nunca
   significam "bom/ruim".

---

## 5 · Arquitetura da Home (a mudança estrutural)

A home deixa de ser grid de widgets e vira **narrativa vertical em camadas**, na ordem
mental do produtor no fim do dia:

```
┌──────────────────────────────────────────────┐
│ TopNav (mantém estrutura; retokeniza)        │
├──────────────────────────────────────────────┤
│ 1 · PALCO DO PREÇO — "quanto tá o boi?"      │
│     hero de crepúsculo (SVG/foto full-bleed) │
│     preço em Besley 900 clamp(56px→150px)    │
│     1 delta em pílula. Nada mais.            │
├──────────────────────────────────────────────┤
│ 2 · TRÊS MÉTRICAS — "quanto tenho no pasto?" │
│     exposto · margem s/ BE · queda até o     │
│     vermelho (fôlego). Mono, hairlines.      │
├──────────────────────────────────────────────┤
│ 3 · A LINHA DO REBANHO (gráfico existente,   │
│     recolorido: realizado nogueira, projeta- │
│     do sela tracejado, bandas σ latão 8%)    │
├──────────────────────────────────────────────┤
│ 4 · TRILHA DOS LOTES — "e os meus?"          │
│     lotes como paradas numa linha do tempo   │
│     horizontal (dot de latão + data de       │
│     saída + risco), ou cards com snap-scroll │
├──────────────────────────────────────────────┤
│ 5 · BANDA ESCURA — "por quê?"                │
│     nogueira. 3 eventos numerados (Besley    │
│     itálico latão) + pergunta invertida +    │
│     1 CTA latão → simulador                  │
└──────────────────────────────────────────────┘
```

Máx 1080–1180px, respiro vertical ~90–110px entre camadas, cards raio 20–22px.

O `CaminhoQuadrante` destaque (hoje preto `#0A0A0A` hardcoded em
`components/home/HomeDashboard.tsx:896`) vira nogueira `#2A211A` com CTA latão.

---

## 6 · Assets prontos (copiar do código de referência)

Tudo já implementado e testado em `dashboard/estrada.py` (Python/Streamlit, mas os
SVGs são portáveis 1:1 pra JSX):

- **`_SCENE_SVG`** — cena do crepúsculo (céu gradiente, sol de latão, morros, gado em
  silhueta, moinho, cerca em perspectiva). ViewBox `0 0 1440 520`,
  `preserveAspectRatio="xMidYMid slice"`. Vira `components/home/HeroEstrada.tsx`.
- **`_BUCKLE_SVG`** — fivela de latão usinada com monograma. No frontend, o monograma
  vem das iniciais de `profile.nome_fazenda` (ex.: Santa Luzia → "SL"). Vira avatar do
  perfil no TopNav e marca em relatórios.
- **Costura de sela** — CSS acima.
- **Foto no hero:** quando existir `hero_dusk.jpg` gerada pelo GB (Gemini Pro), entra
  no lugar do SVG com `object-fit: cover` + `max-height`. O SVG é o fallback permanente
  (offline-safe, zero peso de rede).

---

## 7 · Aplicação por página (prioridade)

| # | Página | Mudança | Esforço estimado |
|---|---|---|---|
| 1 | Tokens + fontes (global) | de-para do item 2 + item 3 | pequeno, alto impacto |
| 2 | Home | arquitetura do item 5 | o grosso do trabalho |
| 3 | Mercado | herda tokens; ticker `FaixaCotacoes` pode virar banda nogueira | pequeno |
| 4 | Lotes | herda tokens; nomes de lote em Besley nos cards/tabs | pequeno |
| 5 | Simulador | herda tokens; CTA "travar" é O latão da tela | pequeno |
| 6 | Configurações/Histórico | só tokens | trivial |

Gráficos (Recharts): realizado `#2A211A`, projetado `#8A5A33` dasharray, bandas σ
`rgba(173,138,72,0.10)` e `rgba(173,138,72,0.06)`, grid `rgba(42,33,26,0.08)`,
ganho/perda pasto/ferrugem.

---

## 8 · O que NÃO fazer

- Não usar textura de couro/madeira como background de UI (kitsch). Madeira só na
  banda do ticker, se ficar boa; senão, nogueira lisa.
- Não usar Besley em corpo de texto nem em números.
- Não introduzir dark mode agora.
- Não usar os SVGs de gado/moinho em tamanho grande (funcionam como silhueta pequena;
  ampliados ficam ingênuos).
- Não tocar no Streamlit (`dashboard/`) — a demo de lá é referência, morre depois.

---

## 9 · O QUE EU PRECISO DE VOLTA (o retorno pro code)

Responder num arquivo `DESIGN_ESTRADA_FEEDBACK.md` na raiz, com:

1. **Veredito de viabilidade** — o de-para de tokens do item 2 cobre mesmo todas as
   telas, ou existe componente com cor hardcoded que vai escapar? (levantamento real
   com grep; sei que `HomeDashboard.tsx` tem `#0A0A0A`/`#FAFAFA`/`#171717` e
   `LinhaDoRebanho.tsx`/`ClimaCard.tsx` têm hexes próprios).
2. **Riscos** — em especial: peso das 3 famílias de fonte via `next/font`,
   contraste/acessibilidade da paleta (AA nos pares texto/fundo do item 2), e
   se o raio 20px quebra algum layout shadcn.
3. **Plano de PRs** — como você fatiaria (sugestão minha: PR-1 tokens+fontes,
   PR-2 Home, PR-3 refinos por página; mas a decisão é sua).
4. **Dúvidas de design** — qualquer decisão que o documento não cobre, em lista
   objetiva, pra eu responder de uma vez.
5. **Contraproposta técnica onde discordar** — se algo do item 5 for caro demais no
   layout atual (ex.: trilha de lotes), proponha a versão que entrega a mesma
   sensação com menos risco.

Depois do feedback respondido, o fluxo é o da casa: branch → PR → preview na Vercel →
GB valida na URL de preview → merge. **Nunca push direto na main.**
