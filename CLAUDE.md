# CLAUDE.md — Terminal: Farm Risk Management Platform

## O QUE E O TERMINAL

Pre-decision infrastructure para pecuaria familiar robusta brasileira. Nao executa hedge, nao substitui consultores, nao da call de mercado. Entrega **clareza economica da operacao** antes de qualquer decisao financeira.

A pergunta central que o sistema responde: **"Qual risco voce aceita ao NAO proteger este lote?"**

## SEGMENTO E POSICIONAMENTO

- **Foco:** operacoes de 3.000–15.000 ha, R$ 15M–80M de faturamento
- **Nao compete** com consultores, tradings ou corretoras — e complementar
- **Moat:** dados proprietarios da operacao + historicidade de decisoes
- **Modelo de negocio:** B2C direto → B2B2C (consultores revendem)
- **Primeiro cliente:** fazenda da familia do fundador (10k ha, ciclo completo, pecuaria de corte, Mato Grosso do Sul)

## STACK ATUAL

### Backend (Python)
- **FastAPI** — REST API com CORS, health check, Swagger docs em `/docs`
- **Engines puros** — frozen dataclasses, stateless, sem side effects
- **Market data** — scraping CEPEA, BCB PTAX, BCB SGS (CDI), Scot Consultoria (futuros B3), AwesomeAPI (dolar historico)
- **Cache** — TTLCache thread-safe (15min cotacoes, 1h historico)
- **Deploy:** Railway (web-production-6c2a3.up.railway.app)

### Frontend (TypeScript)
- **Next.js 14** (App Router) + **TypeScript** estrito
- **Tailwind CSS** com design system terroso premium (paleta couro/ambar/pasto)
- **shadcn/ui** customizado + **Recharts** para graficos
- **Inter** (body) + **JetBrains Mono** (numeros) + **Source Serif 4** (titulos)
- **next-themes** para dark/light mode
- **localStorage** para perfil da fazenda
- **Deploy:** Vercel (projeto-terminal.vercel.app)

### Streamlit (legado, paralelo)
- Dashboard original em `dashboard/app.py`
- Deploy: pecuaria.streamlit.app
- Mantido como referencia mas nao recebe mais features

## ESTRUTURA DO CODIGO

```
terminal_clean/
├── models/                          # ENGINES DE CALCULO (Python puro)
│   ├── constants.py                 # KG_POR_ARROBA, ARROBAS_POR_CONTRATO, BASIS_REGIAO, MESES_BGI
│   ├── production_systems.py        # 6 Input* dataclasses (frozen, tipadas)
│   ├── cost_model_v2.py             # FarmEconomicsV2 — custo/@, margem, ROI por sistema
│   ├── exposure_engine.py           # ExposureEngine — timeline dia a dia + break-even dinamico
│   ├── economic_impact.py           # EconomicImpactEngine — cenarios de queda + semaforo
│   ├── hedge_engine.py              # HedgeEngine — futuros B3, hedge vs unhedged
│   └── simulator_engine.py          # SimulatorEngine — stress test multi-variavel (boi+milho+dolar)
│
├── data/                            # MARKET DATA
│   ├── market_data_base.py          # Funcoes puras de fetch (sem Streamlit)
│   └── market_data.py               # Wrapper com @st.cache_data (para Streamlit)
│
├── api/                             # FASTAPI BACKEND
│   ├── main.py                      # App FastAPI, CORS, routers
│   ├── cache.py                     # TTLCache thread-safe
│   ├── deps.py                      # Singletons dos engines + cache de cotacoes
│   ├── schemas.py                   # Pydantic models (request/response)
│   └── routes/
│       ├── cotacoes.py              # GET /api/cotacoes, /futuros, /historico-*
│       ├── terminacao.py            # POST /api/terminacao-pasto/calcular (e outros 4)
│       └── simulator.py             # POST /api/simulador/calcular
│
├── frontend/                        # NEXT.JS FRONTEND
│   ├── app/
│   │   ├── page.tsx                 # Visao geral (dashboard)
│   │   ├── lotes/page.tsx           # 5 sistemas como tabs (pasto, conf, semi, cria, recria)
│   │   ├── simulador/page.tsx       # Stress test multi-variavel com hedge toggles
│   │   ├── mercado/page.tsx         # Cotacoes, futuros B3, basis, dolar, CDI
│   │   ├── historico/page.tsx       # Placeholder
│   │   └── configuracoes/page.tsx   # Perfil da fazenda (localStorage)
│   ├── components/
│   │   ├── layout/Sidebar.tsx       # Navegacao + nome da fazenda
│   │   ├── theme/                   # ThemeProvider, ThemeToggle
│   │   ├── metrics/                 # MetricCard, PainelMercado
│   │   ├── decision/               # Semaforo, TabelaCenarios, PerguntaInvertida, PainelHedge
│   │   ├── lotes/                   # Field, FormPasto, FormConfinamento, FormSemi, FormCria, FormRecria
│   │   └── mercado/                 # CurvaFuturosChart, BasisRegiao, HistoricoDolar, IndicadoresReferencia
│   └── lib/
│       ├── api/index.ts             # Fetch wrapper tipado para todos os endpoints
│       ├── types/index.ts           # Interfaces TypeScript (espelham Pydantic schemas)
│       ├── profile.ts               # FarmProfile com localStorage
│       └── utils/format.ts          # fmtBRL, fmtPct, fmtArroba
│
├── dashboard/app.py                 # Streamlit (legado)
├── test_all_systems.py              # Testes do Farm Economics Engine
├── test_exposure_engine.py          # Testes de convergencia
├── test_economic_impact.py          # Testes de cenarios + semaforos
├── test_hedge_engine.py             # Testes do hedge (sizing, selecao, economia)
├── requirements.txt                 # Python deps
├── Procfile                         # Railway deploy
└── CLAUDE.md                        # Este arquivo
```

## MODELOS MATEMATICOS

### 1. Farm Economics Engine (`cost_model_v2.py`)

Calcula indicadores economicos por sistema produtivo. Cada metodo recebe um Input (frozen dataclass) e retorna um Result (frozen dataclass).

**Indicadores centrais por sistema:**
- **Cria:** custo por bezerro produzido (R$/cabeca)
- **Recria:** custo por kg ganho (R$/kg)
- **Terminacao/Conf/Semi:** custo por arroba (R$/@), break-even, margem %, ROI anualizado

**Formulas-chave:**
- `arrobas = (peso_saida * rendimento / 15) * num_animais`
- `gmd = (peso_saida - peso_entrada) / dias`
- `custo_oportunidade = (capital_base + custo_op * 0.5) * taxa_mensal * (dias / 30)`
- `roi_anual = (margem / capital) * (365 / dias_ciclo)`
- `break_even = custo_total / arrobas`

**Alertas:**
- `margem_apertada`: margem < 8%
- `roi_abaixo_cdi`: ROI anualizado < CDI

### 2. Exposure Engine (`exposure_engine.py`)

Projeta timeline economica do lote dia a dia:
- Peso projetado (ganho linear)
- Custo acumulado (reposicao dia 0 + operacional + fixo rateado)
- Break-even dinamico (sobe todo dia conforme custo acumula)

Convergencia validada: 0.00% de diferenca vs cost_model_v2.

### 3. Economic Impact (`economic_impact.py`)

Traduz exposicao em impacto economico real:
- Grid de cenarios: preco atual, queda 10%, 20%, 30%
- Semaforo: verde (>15%), amarelo (5-15%), vermelho (<5%)
- Pergunta invertida: "Ao nao proteger, voce aceita que uma queda de X% transforme sua margem de Y% em Z%"
- Queda maxima antes de vermelho (resolucao algebrica)

### 4. Hedge Engine (`hedge_engine.py`)

Calcula economia de travar preco via futuros B3:
- **Sizing:** `contratos = round(arrobas / 330)` (round, nao ceil — evita exposicao especulativa)
- **Preco travado:** `futuro - |basis|`
- **Custo do hedge:** `margem_garantia * cdi * (dias / 365)` (unico custo real de futuros)
- **Receita hedgeada:** `preco_travado * arrobas_hedgeadas + spot * arrobas_descobertas`
- **Preco de indiferenca:** spot onde hedge = nao-hedge
- **Semaforo:** recomendado (BE/spot > 85%), desnecessario (<65%), opcional (entre)

### 5. Simulator Engine (`simulator_engine.py`)

Stress test multi-variavel:
- Varia boi, milho e dolar simultaneamente
- Recalcula custo (dieta varia com milho), receita (varia com boi)
- Compara com e sem hedge para cada cenario
- 5 cenarios default: Otimista, Base, Estresse leve, Estresse severo, Pesadelo

## FONTES DE DADOS DE MERCADO

| Dado | Fonte primaria | Fallback | API/Scraping |
|------|---------------|----------|--------------|
| Arroba boi gordo | CEPEA scraping | Noticias Agricolas | Scraping HTML |
| Dolar PTAX | BCB Olinda API | — | REST JSON |
| Milho ESALQ | CEPEA scraping | Noticias Agricolas | Scraping HTML |
| CDI anual | BCB SGS API (serie 4389) | — | REST JSON |
| Futuros BGI | Scot Consultoria | Not. Agricolas, ADVFN | Scraping HTML |
| Historico dolar | AwesomeAPI | — | REST JSON |
| Historico arroba | CEPEA scraping | — | Scraping HTML |
| Historico milho | CEPEA scraping | — | Scraping HTML |

**Problema conhecido:** scraping CEPEA falha em cloud (IP de datacenter bloqueado). Scot Consultoria funciona em cloud.

## ENDPOINTS DA API

### Market Data (GET)
- `GET /api/cotacoes` → snapshot de todas as cotacoes
- `GET /api/futuros` → curva de futuros BGI (contratos + precos)
- `GET /api/historico-dolar?dias=30` → historico diario do dolar
- `GET /api/historico-arroba` → historico CEPEA boi gordo
- `GET /api/historico-milho` → historico CEPEA milho

### Calculo de Lotes (POST)
- `POST /api/terminacao-pasto/calcular` → cadeia completa (economics + exposure + impact + hedge)
- `POST /api/confinamento/calcular` → idem
- `POST /api/semiconfinamento/calcular` → idem
- `POST /api/cria/calcular` → economics + cotacoes
- `POST /api/recria/calcular` → economics + cotacoes

### Simulador (POST)
- `POST /api/simulador/calcular` → stress test multi-variavel

### Health
- `GET /api/health` → `{status: "ok"}`

## FRONTEND — PAGINAS E COMPONENTES

### Navegacao (Sidebar)
1. **Visao geral** (`/`) — dashboard com cotacoes + quick actions
2. **Lotes** (`/lotes`) — 5 tabs: Pasto | Confinamento | Semi | Cria | Recria
3. **Simulador** (`/simulador`) — stress test boi+milho+dolar com hedge toggles
4. **Mercado** (`/mercado`) — futuros B3, basis, dolar 90d, milho, CDI
5. **Historico** (`/historico`) — placeholder (futuro: lotes finalizados)
6. **Perfil** (`/configuracoes`) — dados da fazenda em localStorage

### Design System
- **Paleta terrosa:** off-white quente (#FAF8F3), ambar/couro (#B8763E), verde pasto (#4A5D3A)
- **Dark mode:** preto terroso (#0F0E0B), cards (#1A1814)
- **Semantico:** verde salvia (#5C8A3A), ambar (#C89B3C), vermelho terroso (#B54134)
- **Tipografia:** Inter (body), JetBrains Mono (numeros), Source Serif 4 (titulos)
- **Principios:** espaco respira, bordas sutis sem sombras, numeros protagonistas, cor com parcimonia

### Perfil da Fazenda (localStorage)
- Nome fazenda, nome produtor, estado, municipio
- Area (ha), sistemas produtivos, faturamento estimado
- Regiao basis (auto-detectado pelo estado)
- Sidebar mostra nome da fazenda quando preenchido

## DEPLOY

### Producao
- **Frontend:** Vercel → projeto-terminal.vercel.app
- **Backend:** Railway → web-production-6c2a3.up.railway.app
- **Streamlit (legado):** pecuaria.streamlit.app
- Push no GitHub → ambos rebuildam automaticamente

### Local
```bash
# API (terminal 1)
cd terminal_clean\ 8
source venv/bin/activate
uvicorn api.main:app --reload --port 8000

# Frontend (terminal 2)
cd terminal_clean\ 8/frontend
npm run dev

# Streamlit (terminal 3, opcional)
streamlit run dashboard/app.py
```

### Variaveis de Ambiente
- `FRONTEND_URL` (Railway) — URL da Vercel para CORS
- `NEXT_PUBLIC_API_URL` (Vercel) — URL da API Railway (`https://web-production-6c2a3.up.railway.app/api`)

## ESCADA DE MATURIDADE

1. ✅ **Price Visibility** — cotacoes em tempo real (CEPEA, BCB, Scot)
2. ✅ **Margin Awareness** — custo/@, break-even, semaforo por sistema
3. ✅ **Risk Exposure** — impacto economico por cenario de queda
4. ✅ **Risk Control** — hedge com futuros B3 (boi gordo)
5. ✅ **Stress Testing** — simulador multi-variavel (boi + milho + dolar)
6. ✅ **Personalizacao** — perfil da fazenda com basis por regiao
7. ⏳ **Persistencia** — banco de dados (lotes salvos, historico de decisoes)
8. ⏳ **Auth** — login multi-usuario (Clerk ou NextAuth)
9. ⏳ **B2B2C** — white-label para consultores

## DECISOES ARQUITETURAIS IMPORTANTES

1. **Frozen dataclasses** — inputs e outputs imutaveis, fortemente tipados, sem side effects
2. **Engines stateless** — cada chamada e pura, testavel isoladamente
3. **Model first, AI second** — calculos deterministicos, IA interpreta mas nunca inventa
4. **Economic Impact antes de Risk Math** — produtor ve margem/caixa, nao VaR/volatilidade
5. **Convergencia testada** — exposure_engine converge com cost_model_v2 (0.00% diferenca)
6. **Scraping multi-source com fallback** — se uma fonte falha, tenta outra, depois ficticio
7. **localStorage → banco** — perfil comeca local, migra para PostgreSQL quando tiver auth
8. **Streamlit paralelo** — nao quebrar o legado durante a migracao

## CONCEITOS DE DOMINIO

### Metricas Centrais
- **custo_por_arroba** (R$/@) — custo de producao por unidade de output
- **break_even** (R$/@) — preco minimo para empatar
- **margem_pct** (%) — lucro como % da receita (verde >15%, amarelo 5-15%, vermelho <5%)
- **ROI_anualizado** (%) — retorno sobre capital vs CDI (~14% benchmark)
- **exposicao** (R$) — impacto de R$1/@ de variacao no caixa

### Basis Regional
Precos locais negociam com desconto vs SP: MS -5, MT -10, GO -7, MG -3, PA -15, TO -12, RO -15 (R$/@). Futuros B3 sao cotados em SP; produtor aplica basis para calcular preco local efetivo.

### Sistemas Produtivos
- **Pasto** (52% rendimento) — extensivo, menor input, maior exposicao a preco
- **Confinamento** (54%) — intensivo, 90-120 dias, dieta = 60-70% do custo
- **Semiconfinamento** (53%) — hibrido, risco equilibrado
- **Cria** — produz bezerros; unidade = custo/bezerro
- **Recria** — ganho de peso; unidade = custo/kg ganho
- **Ciclo Completo** — integrado; compara bezerro proprio vs compra

### Futuros B3 (BGI)
- Contrato padrao: 330 arrobas
- Codigos: F=Jan, G=Fev, H=Mar, J=Abr, K=Mai, M=Jun, N=Jul, Q=Ago, U=Set, V=Out, X=Nov, Z=Dez
- Liquidacao financeira (nao fisica)
- Custo real: apenas oportunidade da margem de garantia (~5% do nocional × CDI × dias)

## PRINCIPIOS DE DESENVOLVIMENTO

- **Model first, AI second** — calculos deterministicos e auditaveis
- **Frozen dataclasses** — inputs e outputs imutaveis
- **Calculos puros** — sem side effects, sem estado interno
- **Convergencia testada** — novos modulos devem convergir com os existentes
- **Linguagem do produtor** — output fala em margem, caixa e ROI, nao em VaR e volatilidade
- **Nao adicionar features de fases futuras no MVP** — manter foco

## COMO RODAR OS TESTES

```bash
python3 test_all_systems.py          # Farm Economics Engine (5 sistemas)
python3 test_exposure_engine.py      # Convergencia exposure vs cost_model
python3 test_economic_impact.py      # Cenarios + semaforos
python3 test_hedge_engine.py         # Sizing, selecao, economia do hedge
```

## ROADMAP

### Proximas prioridades
1. **Dados reais da fazenda** — gestora preencher perfil com custos reais
2. **Persistencia** — Supabase (PostgreSQL) para salvar lotes e historico
3. **Auth** — Clerk para login multi-usuario
4. **Historico de decisoes** — lotes finalizados com previsto vs realizado
5. **Mobile** — responsividade completa + PWA

### Futuro (V3+)
- Monte Carlo scenarios (distribuicao de probabilidades)
- Stress correlacionado (arroba + milho + dolar com correlacoes historicas)
- Risk governance com limites e alertas automaticos
- AI Interpretation Layer — Claude analisa os numeros e sugere acoes
- PDF export com relatorio para reuniao de diretoria
- Comparativo de lotes lado a lado
- White-label para consultores (B2B2C)
