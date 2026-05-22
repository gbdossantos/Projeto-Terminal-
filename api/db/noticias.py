"""
Persistencia de noticias ingeridas via RSS.

SQLite single-file. Retencao 30 dias rolling. Migra pra Postgres
quando auth/multi-user entrar.

Schema:
    noticias(id PK, titulo, fonte, url, imagem, categoria,
             publicado_em ISO, ingerido_em ISO)

`id` e hash SHA1 da URL — idempotente. Re-ingestao da mesma URL
sobrescreve em vez de duplicar.
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator, Optional


# Path: /data em producao Railway (volume persistente); local em dev
_DB_PATH = os.environ.get("NOTICIAS_DB_PATH") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "noticias.db",
)

_lock = threading.Lock()


@contextmanager
def _conn() -> Iterator[sqlite3.Connection]:
    """Conexao com WAL mode + thread-safe via lock global."""
    with _lock:
        conn = sqlite3.connect(_DB_PATH, isolation_level=None, check_same_thread=False)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            yield conn
        finally:
            conn.close()


def init_schema() -> None:
    """Cria a tabela se nao existir. Idempotente."""
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS noticias (
                id TEXT PRIMARY KEY,
                titulo TEXT NOT NULL,
                fonte TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                imagem TEXT,
                categoria TEXT NOT NULL,
                publicado_em TEXT NOT NULL,
                ingerido_em TEXT NOT NULL
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS idx_noticias_publicado_em ON noticias(publicado_em DESC)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON noticias(categoria)")


def url_id(url: str) -> str:
    """SHA1 da URL — id estavel e idempotente."""
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def upsert_noticia(
    *,
    titulo: str,
    fonte: str,
    url: str,
    imagem: Optional[str],
    categoria: str,
    publicado_em: str,
) -> str:
    """
    Insere ou atualiza a noticia. Retorna o id.
    Mesma URL → mesmo id → upsert (nao duplica).
    """
    nid = url_id(url)
    agora = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        c.execute(
            """
            INSERT INTO noticias(id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                titulo=excluded.titulo,
                imagem=excluded.imagem,
                categoria=excluded.categoria
            """,
            (nid, titulo, fonte, url, imagem, categoria, publicado_em, agora),
        )
    return nid


def list_noticias_recentes(*, limit: int = 3, horas: int = 24) -> list[dict]:
    """
    Retorna as N noticias mais recentes publicadas nas ultimas H horas.

    Para o briefing T2.3: quando limit==3, reserva 1 slot para a categoria
    'insumos' caso haja noticia relevante na janela. Garante que milho/diete
    nao seja invisibilizado por noticia de boi vencer cronologicamente.

    Algoritmo (limit=3):
      1. Pega a noticia mais recente de 'insumos' (se houver).
      2. Completa com as 2 mais recentes das outras categorias.
      3. Se nao ha insumo, fallback: 3 mais recentes cronologico normal.

    Para limit != 3: mantem comportamento cronologico puro.
    """
    desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()

    # Comportamento padrao cronologico
    if limit != 3:
        with _conn() as c:
            rows = c.execute(
                """
                SELECT id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em
                FROM noticias
                WHERE publicado_em >= ?
                ORDER BY publicado_em DESC
                LIMIT ?
                """,
                (desde, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    # limit=3 → diversidade: slot reservado para 'insumos'
    with _conn() as c:
        # Slot 1: noticia de insumo mais recente (se houver)
        insumo = c.execute(
            """
            SELECT id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em
            FROM noticias
            WHERE publicado_em >= ? AND categoria = 'insumos'
            ORDER BY publicado_em DESC
            LIMIT 1
            """,
            (desde,),
        ).fetchone()

        if insumo:
            # Slots 2 e 3: outras categorias, ordem cronologica
            outras = c.execute(
                """
                SELECT id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em
                FROM noticias
                WHERE publicado_em >= ? AND categoria != 'insumos'
                ORDER BY publicado_em DESC
                LIMIT 2
                """,
                (desde,),
            ).fetchall()
            # Reordena: cronologico geral entre os 3 escolhidos
            resultado = [dict(insumo)] + [dict(r) for r in outras]
            resultado.sort(key=lambda x: x["publicado_em"], reverse=True)
            return resultado

        # Sem insumo na janela → fallback cronologico puro
        rows = c.execute(
            """
            SELECT id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em
            FROM noticias
            WHERE publicado_em >= ?
            ORDER BY publicado_em DESC
            LIMIT 3
            """,
            (desde,),
        ).fetchall()
    return [dict(r) for r in rows]


def list_noticias_da_janela(*, horas: int = 24) -> list[dict]:
    """Todas as noticias relevantes da janela (sem limite). Usada pra debug/admin."""
    desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()
    with _conn() as c:
        rows = c.execute(
            """
            SELECT id, titulo, fonte, url, imagem, categoria, publicado_em, ingerido_em
            FROM noticias
            WHERE publicado_em >= ?
            ORDER BY publicado_em DESC
            """,
            (desde,),
        ).fetchall()
    return [dict(r) for r in rows]


def ultima_atualizacao() -> Optional[str]:
    """Maior valor de ingerido_em no banco. None se vazio."""
    with _conn() as c:
        row = c.execute("SELECT MAX(ingerido_em) AS m FROM noticias").fetchone()
    return row["m"] if row and row["m"] else None


def cleanup_antigas(*, dias: int = 30) -> int:
    """Remove noticias com publicado_em mais velho que N dias. Retorna qtd removida."""
    limite = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
    with _conn() as c:
        cur = c.execute("DELETE FROM noticias WHERE publicado_em < ?", (limite,))
        return cur.rowcount or 0
