"""
Endpoint de sugestão de correspondência de colunas pra import de lotes via
planilha (Fase 2, categoria B do prompt de validação de dado importado).

Só entra em jogo quando o parser determinístico do frontend
(frontend/lib/import-lotes/parse.ts) não bate um header exato contra o
schema — ver api/services/column_match.py pro porquê.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas import SugerirColunasRequest, SugerirColunasResponse
from api.services.column_match import SugestaoIndisponivel, sugerir_correspondencia

router = APIRouter()


@router.post("/import-lotes/sugerir-colunas", response_model=SugerirColunasResponse)
def sugerir_colunas(req: SugerirColunasRequest):
    """
    Sugere correspondência semântica pra headers que não bateram exato no
    schema. Nunca aplica sozinho — a UI exige confirmação do usuário por
    header antes de usar a sugestão.

    Falha (chave ausente, rede, rate limit, resposta inválida) → 503
    explícito. Frontend cai de volta pro aviso simples de headers
    desconhecidos, nunca trava a importação.
    """
    campos = [{"nome": c.nome, "label": c.label} for c in req.campos_disponiveis]
    try:
        sugestoes = sugerir_correspondencia(req.headers_desconhecidos, campos)
    except SugestaoIndisponivel as e:
        raise HTTPException(
            status_code=503,
            detail=f"sugestao_colunas_indisponivel: {e}",
        )
    return SugerirColunasResponse(sugestoes=sugestoes)
