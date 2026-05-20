"""
Terminal API — FastAPI Application
====================================
Expõe os engines de cálculo como REST API.

Rodar:
    uvicorn api.main:app --reload --port 8000

Docs:
    http://localhost:8000/docs
"""

import logging
import os
import sys

# Garante que a raiz do projeto está no path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import cotacoes, terminacao, simulator, noticias as noticias_route
from api.services.noticias import ingestar_feed
from api.db.noticias import init_schema

logger = logging.getLogger("uvicorn")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Inicializa SQLite + APScheduler na subida. Para o scheduler na descida."""
    # Inicializa schema
    init_schema()

    # APScheduler: 6x/dia em America/Sao_Paulo (07, 10, 13, 16, 19, 22h)
    scheduler = None
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")
        scheduler.add_job(
            ingestar_feed,
            trigger=CronTrigger(hour="7,10,13,16,19,22", minute=0),
            id="noticias_ingest",
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()
        logger.info("APScheduler iniciado: ingestao de noticias 6x/dia (BRT)")

        # Roda uma ingestao imediata em background pra popular o banco no primeiro deploy
        try:
            ingestar_feed()
        except Exception as e:
            logger.warning("Ingestao inicial falhou: %s", e)
    except Exception as e:
        logger.warning("APScheduler nao iniciou: %s. Cron desabilitado.", e)

    yield

    if scheduler:
        try:
            scheduler.shutdown(wait=False)
        except Exception:
            pass


app = FastAPI(
    title="Terminal API",
    description="Inteligência Financeira para Pecuária de Corte",
    version="1.0.0",
    lifespan=lifespan,
)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        FRONTEND_URL,
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cotacoes.router, prefix="/api", tags=["Cotações"])
app.include_router(terminacao.router, prefix="/api", tags=["Terminação"])
app.include_router(simulator.router, prefix="/api", tags=["Simulador"])
app.include_router(noticias_route.router, prefix="/api", tags=["Notícias"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
