"""
Terminal API — FastAPI Application
====================================
Expõe os engines de cálculo como REST API.

Rodar:
    uvicorn api.main:app --reload --port 8000

Docs:
    http://localhost:8000/docs
"""

import os
import sys

# Garante que a raiz do projeto está no path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import cotacoes, terminacao

app = FastAPI(
    title="Terminal API",
    description="Inteligência Financeira para Pecuária de Corte",
    version="1.0.0",
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


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
