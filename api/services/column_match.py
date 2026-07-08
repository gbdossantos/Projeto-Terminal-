"""
Sugestão de correspondência de headers desconhecidos → campos do schema de
import de lotes, via LLM (Claude Haiku).

Só entra em jogo quando o parser determinístico
(frontend/lib/import-lotes/parse.ts) não bate um header exato contra o
schema — ex: "peso saida" digitado sem acento não bate
"peso_saida_estimado_kg" por comparação de string, mas é semanticamente o
mesmo campo. Isso é a categoria B do prompt de validação de dado
importado (fuzzy/semântico); tudo que é regra determinística (peso saída
< entrada, obrigatoriedade, faixa) já é resolvido em validate.ts sem LLM.

Nunca aplica a correspondência sozinho — só sugere; o usuário confirma na
UI. Falha de chamada (chave ausente, rede, rate limit, resposta que não
parseia) nunca derruba a importação: levanta SugestaoIndisponivel e quem
chama (a rota) decide o fallback — nunca inventa uma sugestão.
"""

from __future__ import annotations

import json
import os

MODEL = "claude-haiku-4-5-20251001"


class SugestaoIndisponivel(Exception):
    """Chamada ao LLM falhou ou chave ausente — chamador decide o fallback."""


def _client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SugestaoIndisponivel("ANTHROPIC_API_KEY não configurada")
    import anthropic

    return anthropic.Anthropic(api_key=api_key)


def _montar_prompt(
    headers_desconhecidos: list[str],
    campos_disponiveis: list[dict[str, str]],
) -> str:
    campos_txt = "\n".join(f"- {c['nome']}: {c['label']}" for c in campos_disponiveis)
    headers_txt = "\n".join(f"- {h}" for h in headers_desconhecidos)
    return f"""Você recebe nomes de colunas de uma planilha de importação de \
lotes de gado que não bateram exatamente contra o schema esperado. Pra \
cada header desconhecido, aponte o campo canônico mais provável (mesmo \
significado, mesmo se o nome digitado tiver abreviação, falta de acento, \
sinônimo ou ordem de palavra diferente) ou null se nenhum campo fizer \
sentido.

Campos canônicos disponíveis (nome: label):
{campos_txt}

Headers desconhecidos:
{headers_txt}

Responda SOMENTE com um JSON array, sem texto antes ou depois, no formato:
[{{"header_original": "...", "campo_sugerido": "nome_do_campo_ou_null", "confianca": "alta|media|baixa"}}]
"""


def _extrair_texto(resp) -> str:
    texto = "".join(
        block.text for block in resp.content if getattr(block, "type", None) == "text"
    ).strip()
    # Modelo às vezes cerca com ```json ... ``` mesmo pedindo só o array
    if texto.startswith("```"):
        texto = texto.strip("`")
        if texto.lower().startswith("json"):
            texto = texto[4:]
        texto = texto.strip()
    return texto


def sugerir_correspondencia(
    headers_desconhecidos: list[str],
    campos_disponiveis: list[dict[str, str]],
) -> list[dict[str, object]]:
    """
    Pra cada header desconhecido, pede ao modelo o campo canônico mais
    provável (ou None se nenhum fizer sentido) + confiança.

    campos_disponiveis: [{"nome": "peso_saida_estimado_kg", "label": "Peso saída (kg)"}, ...]

    Retorna: [{"header_original": ..., "campo_sugerido": str|None, "confianca": "alta"|"media"|"baixa"}]

    Levanta SugestaoIndisponivel em qualquer falha (rede, chave ausente,
    resposta que não é JSON válido) — nunca retorna sugestão inventada
    silenciosamente.
    """
    client = _client()
    prompt = _montar_prompt(headers_desconhecidos, campos_disponiveis)

    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as e:
        raise SugestaoIndisponivel(f"chamada ao modelo falhou: {e}") from e

    texto = _extrair_texto(resp)

    try:
        sugestoes = json.loads(texto)
    except json.JSONDecodeError as e:
        raise SugestaoIndisponivel(f"resposta do modelo não é JSON válido: {e}") from e

    if not isinstance(sugestoes, list):
        raise SugestaoIndisponivel("resposta do modelo não é uma lista")

    nomes_validos = {c["nome"] for c in campos_disponiveis}
    resultado: list[dict[str, object]] = []
    for s in sugestoes:
        if not isinstance(s, dict):
            continue
        header_original = s.get("header_original")
        if not header_original:
            continue
        campo_sugerido = s.get("campo_sugerido")
        confianca = s.get("confianca", "baixa")
        # Descarta sugestão de campo que não existe no schema (alucinação)
        if campo_sugerido is not None and campo_sugerido not in nomes_validos:
            campo_sugerido = None
            confianca = "baixa"
        if confianca not in ("alta", "media", "baixa"):
            confianca = "baixa"
        resultado.append(
            {
                "header_original": header_original,
                "campo_sugerido": campo_sugerido,
                "confianca": confianca,
            }
        )
    return resultado
