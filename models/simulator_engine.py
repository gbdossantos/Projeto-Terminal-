"""
Terminal — Simulator Engine (Cenarios Multi-Variavel)
======================================================
Simula o impacto combinado de variacoes em boi gordo, milho e dolar
sobre a economia de um lote de terminacao.

O produtor define: "se o boi cair 10%, o milho subir 15% e o dolar
subir 5%, o que acontece com meu lote?" — e ve o impacto no caixa.

Tambem simula trava de preco (hedge) para boi e milho separadamente.

Principio: Model first, AI second.
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SimulatorInput:
    """Parametros do lote + mercado para simulacao."""
    # Lote
    arrobas_totais: float
    custo_total: float
    dias_ciclo: int

    # Custos por componente (para recalcular com variacao de milho)
    custo_dieta_total: float       # parte do custo que depende de milho
    custo_nao_dieta: float         # parte fixa (reposicao + outros)

    # Precos atuais
    preco_arroba: float            # R$/@ spot
    preco_milho_saca: float        # R$/saca 60kg
    dolar_ptax: float              # R$/USD


@dataclass(frozen=True)
class ScenarioInput:
    """Um cenario especifico para simular."""
    nome: str
    var_arroba_pct: float          # ex: -0.10 = queda 10%
    var_milho_pct: float           # ex: +0.15 = alta 15%
    var_dolar_pct: float           # ex: +0.05 = alta 5%

    # Hedge (opcional)
    hedge_arroba: bool             # se tem trava de boi
    preco_hedge_arroba: float      # preco travado (R$/@)
    hedge_milho: bool              # se tem trava de milho
    preco_hedge_milho: float       # preco travado (R$/saca)


@dataclass(frozen=True)
class ScenarioOutput:
    """Resultado de um cenario simulado."""
    nome: str

    # Precos no cenario
    preco_arroba_cenario: float
    preco_milho_cenario: float
    dolar_cenario: float

    # Economia sem hedge
    receita_sem_hedge: float
    custo_cenario: float           # custo ajustado pela variacao do milho
    margem_sem_hedge: float
    margem_pct_sem_hedge: float

    # Economia com hedge (se aplicavel)
    receita_com_hedge: float
    custo_com_hedge: float
    margem_com_hedge: float
    margem_pct_com_hedge: float

    # Impacto vs cenario base
    variacao_margem: float         # vs base (sem hedge)

    # Flags
    tem_hedge_arroba: bool
    tem_hedge_milho: bool


@dataclass(frozen=True)
class SimulatorReport:
    """Report completo da simulacao."""
    cenarios: list[ScenarioOutput]
    cenario_base: ScenarioOutput   # cenario com precos atuais, sem variacao
    pior_cenario: ScenarioOutput
    melhor_cenario: ScenarioOutput


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class SimulatorEngine:
    """
    Simula cenarios multi-variavel sobre um lote.

    Stateless — cada chamada e pura.
    """

    def simular(
        self,
        inp: SimulatorInput,
        cenarios: list[ScenarioInput],
    ) -> SimulatorReport:
        """Roda todos os cenarios e retorna o report."""

        resultados: list[ScenarioOutput] = []

        for cen in cenarios:
            resultado = self._calcular_cenario(inp, cen)
            resultados.append(resultado)

        # Cenario base (sem variacao)
        base = self._calcular_cenario(inp, ScenarioInput(
            nome="Base (atual)",
            var_arroba_pct=0.0, var_milho_pct=0.0, var_dolar_pct=0.0,
            hedge_arroba=False, preco_hedge_arroba=0.0,
            hedge_milho=False, preco_hedge_milho=0.0,
        ))

        # Pior e melhor
        pior = min(resultados, key=lambda r: r.margem_sem_hedge)
        melhor = max(resultados, key=lambda r: r.margem_sem_hedge)

        return SimulatorReport(
            cenarios=resultados,
            cenario_base=base,
            pior_cenario=pior,
            melhor_cenario=melhor,
        )

    def _calcular_cenario(
        self,
        inp: SimulatorInput,
        cen: ScenarioInput,
    ) -> ScenarioOutput:
        """Calcula um cenario individual."""

        # Precos no cenario
        preco_arroba = inp.preco_arroba * (1 + cen.var_arroba_pct)
        preco_milho = inp.preco_milho_saca * (1 + cen.var_milho_pct)
        dolar = inp.dolar_ptax * (1 + cen.var_dolar_pct)

        # Custo ajustado: a parte de dieta varia com o milho
        fator_milho = (1 + cen.var_milho_pct)
        custo_dieta_ajustado = inp.custo_dieta_total * fator_milho
        custo_cenario = inp.custo_nao_dieta + custo_dieta_ajustado

        # --- Sem hedge ---
        receita_sem = inp.arrobas_totais * preco_arroba
        margem_sem = receita_sem - custo_cenario
        margem_pct_sem = margem_sem / receita_sem if receita_sem > 0 else 0.0

        # --- Com hedge ---
        # Receita: se tem hedge de boi, usa preco travado
        receita_com = (
            inp.arrobas_totais * cen.preco_hedge_arroba
            if cen.hedge_arroba and cen.preco_hedge_arroba > 0
            else receita_sem
        )

        # Custo: se tem hedge de milho, custo de dieta fica travado
        custo_com = (
            inp.custo_nao_dieta + inp.custo_dieta_total  # dieta no preco original
            if cen.hedge_milho and cen.preco_hedge_milho > 0
            else custo_cenario
        )

        margem_com = receita_com - custo_com
        margem_pct_com = margem_com / receita_com if receita_com > 0 else 0.0

        # Variacao vs base
        receita_base = inp.arrobas_totais * inp.preco_arroba
        margem_base = receita_base - inp.custo_total
        variacao = margem_sem - margem_base

        return ScenarioOutput(
            nome=cen.nome,
            preco_arroba_cenario=round(preco_arroba, 2),
            preco_milho_cenario=round(preco_milho, 2),
            dolar_cenario=round(dolar, 2),
            receita_sem_hedge=round(receita_sem, 2),
            custo_cenario=round(custo_cenario, 2),
            margem_sem_hedge=round(margem_sem, 2),
            margem_pct_sem_hedge=round(margem_pct_sem, 4),
            receita_com_hedge=round(receita_com, 2),
            custo_com_hedge=round(custo_com, 2),
            margem_com_hedge=round(margem_com, 2),
            margem_pct_com_hedge=round(margem_pct_com, 4),
            variacao_margem=round(variacao, 2),
            tem_hedge_arroba=cen.hedge_arroba,
            tem_hedge_milho=cen.hedge_milho,
        )
