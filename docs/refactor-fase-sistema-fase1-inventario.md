# Refactor: `fase` e `sistema` separados — Fase 1: Inventário

> Briefing: separar o campo único `sistema_produtivo` em dois campos independentes (`fase ∈ {cria, recria, terminacao}` × `sistema ∈ {pasto, semiconfinamento, confinamento}`), removendo "Ciclo Completo" do modelo de lote.
>
> Status: **Fase 1 read-only concluída. Aguardando Portão 1.**

---

## 0. Achado preliminar (impacta a premissa do briefing)

O briefing diz "Hoje: `sistema_produtivo` é string única". **No backend Python isso não existe.** O acoplamento ao sistema atualmente acontece por **três mecanismos diferentes**, nenhum dos quais é uma string única:

1. **6 dataclasses Input separadas** (`InputCria`, `InputRecria`, `InputTerminacaoPasto`, `InputConfinamento`, `InputSemiconfinamento`, `InputCicloCompleto`) — uma por sistema, com campos próprios.
2. **5 métodos no engine** (`calcular_cria`, `calcular_recria`, `calcular_terminacao_pasto`, `calcular_confinamento`, `calcular_semiconfinamento`, `calcular_ciclo_completo`) — assinatura tipada por Input.
3. **`isinstance`-branching** no exposure_engine (`_normalizar_input`).

Existe um enum `SistemaProducao` em `production_systems.py:38-46`, mas **nunca é importado em nenhum lugar do backend** (verificado: `grep -rn SistemaProducao` retorna só a definição). Está morto.

A string `sistema_produtivo` em si **não aparece em nenhum arquivo .py**. O lugar onde existe enum de string única é o frontend (`lib/sistemas.ts`).

**Consequência:** o refactor no backend é menos sobre "trocar string única por dois campos" e mais sobre "reorganizar a taxonomia de classes/métodos pra refletir (fase, sistema)". O modelo final pode ser:

- **Opção shape-A:** uma classe `LoteInput` única com `fase: Fase`, `sistema: Sistema` e união de todos os campos (sparse por combinação).
- **Opção shape-B:** classes Input separadas por `(fase, sistema)` (9 classes) ou por fase com `sistema` discriminante interno.

Esta escolha de shape **deve ser decidida na Fase 2**, depois das decisões sobre órfãs.

---

## 1.1 — Pontos de uso por engine

### `cost_model_v2.py` (Farm Economics)

| Linha | Forma de acoplamento |
|---|---|
| 24-31 | Import das 6 classes Input |
| 16, 25, 231-258 | `ResultCicloCompleto` (dataclass) |
| 344 | `calcular_cria(InputCria)` — método público |
| 384 | `calcular_recria(InputRecria)` |
| 424-426 | `calcular_terminacao_pasto(InputTerminacaoPasto, preco_venda)` |
| 486-488 | `calcular_confinamento(InputConfinamento, preco_venda)` |
| 557-559 | `calcular_semiconfinamento(InputSemiconfinamento, preco_venda)` |
| 624-695 | `calcular_ciclo_completo(InputCicloCompleto, preco_venda, custo_bezerro_mercado)` |

Não há `if isinstance` nem `match` aqui — o dispatch é via método separado por tipo.

### `exposure_engine.py`

| Linha | Forma de acoplamento |
|---|---|
| 32-39 | Import dos 3 inputs de terminação + 3 constantes RENDIMENTO_* |
| 48-52 | `InputTerminacao = Union[InputTerminacaoPasto, InputConfinamento, InputSemiconfinamento]` |
| 97 | `LotExposure.sistema: str` (campo string com `"pasto"` \| `"confinamento"` \| `"semi"`) |
| 197, 247, 278, 306 | `params["sistema"] = "pasto" / "confinamento" / "semi"` (set em `_normalizar_input`) |
| 233, 260, 291, 319 | **3 ramos `isinstance` consecutivos** em `_normalizar_input` — único ponto real de dispatch por tipo no backend |
| 320-323 | Fallback `raise TypeError` se input não for um dos 3 |

**Cria e Recria NÃO têm exposure path.** Não há classe nem ramo `isinstance` pra eles.

### `economic_impact.py`

| Linha | Forma de acoplamento |
|---|---|
| 27 | `from models.exposure_engine import LotExposure` |
| 88, 209, 225, 232 | Lê `exposure.sistema` (string) — mas **só pra repassar como label** no `EconomicImpactReport.sistema` |

Confirmado: **agnóstico ao sistema**. Consome só `arrobas_totais`, `custo_total`, `dias_ciclo`, `dias_restantes`, `nome`, `num_animais` do LotExposure. Nenhum branch ramifica em `sistema`.

### `hedge_engine.py`

| Linha | Forma de acoplamento |
|---|---|
| 25 | `from models.exposure_engine import LotExposure` |

**Totalmente agnóstico ao sistema.** Consome só `arrobas_totais`, `custo_total`, `dias_restantes`, `dias_ciclo`, `break_even` do LotExposure. Nenhuma referência a `sistema` em todo o arquivo (200 linhas).

### `simulator_engine.py`

| Linha | Forma de acoplamento |
|---|---|
| (nenhuma) | |

**Totalmente agnóstico.** Recebe `SimulatorInput` (arrobas_totais, custo_total, custo_dieta_total, custo_nao_dieta, etc.) e cenários. Não importa nem referencia nenhuma classe de sistema. Funcionaria igual pra Cria/Recria se elas tivessem custo_dieta_total (não tem).

---

## 1.2 — Mapa das 5 categorias antigas que continuam

| Categoria antiga | Fórmula em cost_model_v2 | Fase / Sistema | Diagnóstico |
|---|---|---|---|
| Terminação Pasto | `calcular_terminacao_pasto` (linhas 424-480). Custos diários: `suplementacao_dia + sanidade + mao_obra + arrendamento + outros`. Rendimento 0.52 default. | `(terminacao, pasto)` | Direto. Fórmula 1:1. |
| Confinamento | `calcular_confinamento` (linhas 486-551). Custos: dieta calculada via `peso_medio × consumo_ms_pct_pv × custo_dieta_kg_ms` (linha 494-496) + `sanidade + mao_obra + instalacoes + outros`. Rendimento 0.54 default. | `(terminacao, confinamento)` | Direto. Fórmula 1:1. |
| Semiconfinamento | `calcular_semiconfinamento` (linhas 557-618). Custos: `arrendamento + manutencao_pasto + suplemento (consumo × custo/kg) + sanidade + mao_obra + outros`. Rendimento 0.53 default. | `(terminacao, semiconfinamento)` | Direto. Fórmula 1:1. |
| Cria | `calcular_cria` (linhas 344-378). Custos **anuais por UA**: `nutricao + sanidade + reproducao + mao_obra + arrendamento + outros` × num_matrizes. Custo oportunidade: `capital_rebanho × taxa_mensal × 12`. Produto: bezerros desmamados. **Output: custo/bezerro**, não custo/@. | `(cria, ?)` — fase explícita, sistema **não é input nem variável** | A fórmula é **estruturalmente sistema-agnóstica**: não há campo no input que diferencie pasto/semi/conf. O VALOR de `custo_nutricao_ua_ano` muda na prática (pasto vs conf), mas o usuário define o número — não há constante diferente por sistema. Ver §1.4 e §2 (decisão). |
| Recria | `calcular_recria` (linhas 384-418). Custos **diários por cab**: `nutricao + sanidade + mao_obra + arrendamento + outros`. Output: **custo/kg ganho**, não custo/@. | `(recria, ?)` — mesma situação da Cria | Idem Cria. Estruturalmente agnóstico ao sistema. |

**Respondendo o briefing explicitamente:**

> "Para Cria e Recria especificamente: o cálculo atual usa parâmetros que variam por sistema (custo de pasto vs confinamento, GMD, duração)? Se sim, qual sistema implícito a fórmula atual assume?"

**Resposta:** os parâmetros (custos diários/anuais, dias_ciclo) **podem** variar por sistema, mas a fórmula consome valores numéricos vindos do input. **Não há sistema implícito assumido** — não há GMD constante por sistema, não há duração default por sistema, não há piso/teto por sistema. Tudo é número de entrada livre.

Logo: a fórmula atual é **genuinamente sistema-agnóstica** (no sentido de "não há código que dispatch por sistema"). As 3 combinações de Cria e as 3 de Recria herdam a mesma fórmula se essa interpretação for aceita.

**Risco oculto:** se GB quiser que `(recria, confinamento)` tenha um piso de custo_nutricao_dia ou um teto de dias_ciclo diferente de `(recria, pasto)`, **isso não existe hoje** e precisaria ser fórmula nova (alternativa C da Fase 2). Hoje o sistema confia 100% no número que o usuário digita.

---

## 1.3 — TUDO que existe especificamente por causa de "Ciclo Completo"

Verificado por grep canônico (`InputCicloCompleto|ResultCicloCompleto|calcular_ciclo_completo|CICLO_COMPLETO`). Aparece em **2 arquivos apenas**:

### `models/production_systems.py`

- **Linha 13** — docstring "InputCicloCompleto — cria + recria + terminação integradas"
- **Linha 46** — `CICLO_COMPLETO = "ciclo_completo"` (membro do enum `SistemaProducao`, o qual nunca é importado)
- **Linhas 244-289** — `class InputCicloCompleto` (frozen dataclass, 42 linhas)
  - Tem campo interno `sistema_terminacao: str` com comentário `"pasto" | "confinamento" | "semi"` (linha 275) — **única menção a string de sistema livre em todo backend**, mas é uma string interna de um dataclass que ninguém consome
  - Composição: contém `cria: InputCria`

### `models/cost_model_v2.py`

- **Linha 16** — docstring menciona `ResultCicloCompleto`
- **Linha 25** — `from models.production_systems import (InputCicloCompleto, ...)`
- **Linhas 230-258** — `class ResultCicloCompleto` (frozen dataclass)
- **Linhas 620-695** — método `calcular_ciclo_completo` (76 linhas)
  - Composição: chama `self.calcular_cria(inp.cria)` na linha 631
  - Não tem rota FastAPI, não tem schema Pydantic, não é exposto

### Verificações negativas (zero referências)

- `api/routes/*.py`: nenhuma rota expõe ciclo completo
- `api/schemas.py`: nenhum schema Pydantic correspondente
- `test_*.py`: nenhum teste cobre ciclo completo
- `dashboard/app.py`: import na linha 36 lista só os 5 inputs, sem `InputCicloCompleto`
- `api/services/`, `api/db/`: nenhuma referência

**Conclusão:** Ciclo Completo é código órfão definido mas não conectado a nenhuma interface externa. Remoção limpa não quebra nada em produção. Total de linhas a remover: ~150 (42 do dataclass Input + 28 do Result + 76 do método + 5 de import/docstring).

---

## 1.4 — Cobertura das 9 combinações

| (fase, sistema) | Fórmula direta? | Origem |
|---|---|---|
| `(terminacao, pasto)` | ✅ | `calcular_terminacao_pasto` |
| `(terminacao, semiconfinamento)` | ✅ | `calcular_semiconfinamento` |
| `(terminacao, confinamento)` | ✅ | `calcular_confinamento` |
| `(cria, pasto)` | ⚠️ depende da interpretação | Ver nota |
| `(cria, semiconfinamento)` | ⚠️ idem | Ver nota |
| `(cria, confinamento)` | ⚠️ idem | Ver nota |
| `(recria, pasto)` | ⚠️ idem | Ver nota |
| `(recria, semiconfinamento)` | ⚠️ idem | Ver nota |
| `(recria, confinamento)` | ⚠️ idem | Ver nota |

**Nota sobre cria/recria × sistema:**

A fórmula atual é estruturalmente sistema-agnóstica (ver §1.2). Duas interpretações possíveis pra Fase 2:

- **Interpretação X — agnóstico mantido:** todas as 6 combinações de cria/recria usam a fórmula existente. O `sistema` vira meta-tag pra contexto/UX/relatório. Convergência das 9 combinações é trivial porque 6 delas são a mesma fórmula com inputs diferentes.
- **Interpretação Y — calibração futura:** 6 combinações ficam órfãs até GB fornecer fórmulas específicas (ex: constantes de GMD por sistema, piso/teto de custo, regra de dieta obrigatória em confinamento de cria).

Hipótese mínima do briefing: "3 células ficam diretas. As outras 6 dependem do que 1.2 revelar". Resposta de 1.2: estruturalmente são diretas (interpretação X). GB decide se quer calibração separada (interpretação Y).

---

## 1.5 — Acoplamento a string única

Como dito em §0, **a string única `sistema_produtivo` não existe no backend**. Os pontos de acoplamento por categoria são:

### Acoplamento por tipo (isinstance + Union)

| Arquivo:linha | O que faz |
|---|---|
| `exposure_engine.py:48-52` | `InputTerminacao = Union[...]` (3 tipos) |
| `exposure_engine.py:150` | Parâmetro `inp: InputTerminacao` em `calcular()` |
| `exposure_engine.py:224-323` | `_normalizar_input`: 3 ramos `isinstance` + 1 `raise TypeError` |

### Acoplamento por nome de método (dispatch implícito)

| Arquivo:linha | O que faz |
|---|---|
| `cost_model_v2.py:344, 384, 424, 486, 557, 624` | 6 métodos `calcular_*` distintos |
| `api/routes/terminacao.py:55, 89, 123, 159, 186` | 5 endpoints distintos (sem ciclo_completo) |

### Acoplamento por classe Input

| Arquivo:linha | Forma |
|---|---|
| `production_systems.py:53, 90, 125, 162, 204, 247` | 6 classes Input separadas |
| `cost_model_v2.py:24-31` | Imports |
| `exposure_engine.py:32-39` | Imports (3 de terminação) |
| `dashboard/app.py:36-42` | Imports (5, sem ciclo) |
| `api/routes/terminacao.py:25-28` | Imports (5, sem ciclo) |

### Acoplamento por string (semi-livre)

| Arquivo:linha | O que faz |
|---|---|
| `exposure_engine.py:97` | `LotExposure.sistema: str` (campo de output) |
| `exposure_engine.py:247, 278, 306` | Set de `params["sistema"]` com literais `"pasto"`, `"confinamento"`, `"semi"` |
| `economic_impact.py:88, 232` | `EconomicImpactReport.sistema: str` (passa adiante o de LotExposure) |
| `api/schemas.py:127, 209` | `sistema: str` nos schemas Pydantic correspondentes (LotExposureSchema, EconomicImpactReportSchema) |
| `production_systems.py:275` | `InputCicloCompleto.sistema_terminacao: str` (interno; some com a remoção do Ciclo Completo) |

**O campo string `sistema` que existe no output (`LotExposure.sistema`) é a única coisa parecida com o problema descrito no briefing.** Está semanticamente errado mesmo: armazena `"pasto"`/`"confinamento"`/`"semi"` mas conceitualmente representa apenas o sistema da fase de terminação (não há fase nele). No novo modelo isso vira par `(fase, sistema)` — `(terminacao, pasto)`, etc.

---

## 1.6 — Variáveis dependentes por engine

| Engine | Depende de **fase**? | Depende de **sistema**? | Depende de ambos? | Notas |
|---|---|---|---|---|
| Farm Economics | **Sim** (indicador central muda: cria=R$/bezerro, recria=R$/kg, terminação=R$/@) | **Sim, na terminação** (estrutura de custo varia: dieta calculada vs suplementação direta vs suplemento+pasto). **Não na cria/recria** (sistema-agnóstico estrutural). | Sim: 3 fórmulas distintas de terminação × sistema. | Output schema diverge: ResultCria/ResultRecria vs ResultTerminacao* (margem, ROI, exposicao só existem nos de terminação). |
| Exposure | **Sim** (só existe pra terminação hoje — não há exposure path pra cria/recria) | **Sim** (3 ramos isinstance: pasto/conf/semi têm fórmulas próprias de custo_dia_cab) | Sim (combinação `(terminacao, sistema)`) | `_normalizar_input` é o centro do acoplamento. Constantes `RENDIMENTO_PASTO/CONFINAMENTO/SEMI` (production_systems.py:27-29) são lidas como default do Input. |
| Economic Impact | **Não** (consome só LotExposure agnóstico). | **Não.** | Não. | Confirmado: agnóstico. Recebe `exposure.sistema` só pra ecoar no output. |
| Hedge | **Não** (consome só LotExposure agnóstico). | **Não.** | Não. | Confirmado: agnóstico. Janela de hedge depende de `dias_restantes`/`data_venda_projetada` do LotExposure — não do sistema. Sizing usa só `arrobas_totais`. Basis é input externo (`basis_estimado` parâmetro), não derivado do sistema. |
| Simulator | **Não.** | **Não.** | Não. | Recebe `SimulatorInput` com `custo_dieta_total + custo_nao_dieta` pré-calculados. Cenários default (no engine atual: pior/melhor/base) não variam por sistema. |

**Variáveis que MUDAM por sistema dentro de Terminação (calibrações reais):**

- Rendimento de carcaça: 0.52/0.54/0.53 (pasto/conf/semi) — constantes em `production_systems.py:27-29`
- Estrutura de custo diário (campos diferentes): suplementacao vs dieta(calculada) vs suplemento+manutencao_pasto
- Dias de ciclo típicos: cap 365 no schema pra todos, mas defaults diferentes em frontend

**Variáveis que MUDAM por fase:**

- Indicador central: R$/bezerro (cria), R$/kg ganho (recria), R$/@ (terminação)
- Unidade temporal: ano (cria) vs ciclo (recria/terminação)
- Output schema: presença/ausência de receita/margem/ROI/exposicao

---

## Resumo executivo do inventário

- ✅ **Ciclo Completo** é totalmente isolado em `production_systems.py` (42 linhas) + `cost_model_v2.py` (108 linhas). Zero conexão externa. Remoção segura.
- ✅ **3 combinações de terminação** têm fórmula direta calibrada (Pasto/Conf/Semi).
- ⚠️ **6 combinações de cria/recria × sistema** são **estruturalmente agnósticas** hoje. Decisão de Fase 2: aceitar agnosticismo (interpretação X) ou exigir calibração (interpretação Y → 6 órfãs).
- ✅ **Economic Impact, Hedge e Simulator** são totalmente agnósticos. Refactor não toca eles.
- ⚠️ **Shape do refactor** precisa ser decidido junto: uma classe unificada `LoteInput(fase, sistema, ...)` ou manter classes separadas por nova taxonomia. O briefing implica a primeira via Pydantic (`fase: Fase` e `sistema: Sistema` como obrigatórios no Lote), mas o backend hoje usa classes por sistema — vale confirmar.
- ✅ **String `sistema_produtivo` não existe no backend** (premissa do briefing aplica-se ao frontend).
- ✅ **Sem lotes em produção** = quebra limpa OK em todos os pontos identificados.

---

## 🚪 PORTÃO 1 — aguardando decisões

Aguardo decisões da Fase 2 antes de tocar em código:

1. **Órfãs de cria/recria** (§1.4): interpretação **X** (agnóstico mantido — 9/9 calibradas) ou **Y** (6 viram órfãs até GB fornecer fórmula/regra)?
2. **Shape do refactor** (§0): classe unificada `LoteInput(fase, sistema, …união de campos)` ou taxonomia nova mantendo classes separadas?
3. **Confirmação de remoção de Ciclo Completo** conforme §1.3 (~150 linhas em 2 arquivos, zero quebra de integração).
4. **Campo `sistema` do `LotExposure`** (§1.5): vira par `(fase, sistema)` no objeto, ou só `sistema` (já que LotExposure só existe pra terminação hoje)? Se Exposure ganhar suporte a cria/recria como parte do refactor, isso é trabalho extra — confirmar escopo.
