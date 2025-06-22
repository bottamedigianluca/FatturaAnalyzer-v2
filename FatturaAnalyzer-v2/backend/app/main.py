"""
FatturaAnalyzer v2 - FastAPI Backend
Main application entry point con CORS corretto e configurazione completa
"""
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# Assicura che i moduli del progetto siano nel path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.config import settings
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.api import (
    anagraphics,
    analytics,
    invoices,
    transactions,
    reconciliation,
    import_export,
    sync,
    setup,
    first_run,
    health,
    system
)

# Configurazione del logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/fattura_analyzer_api.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestisce gli eventi di avvio e spegnimento dell'applicazione."""
    logger.info("🚀 Starting FatturaAnalyzer API v2...")
    # Logica di avvio...
    yield
    # Logica di spegnimento...
    logger.info("👋 Shutting down FatturaAnalyzer API...")

app = FastAPI(
    title="FatturaAnalyzer API v2",
    description="Modern invoice and financial management system for Italian businesses",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# 1. Middleware per la gestione degli errori (il più esterno)
app.add_middleware(ErrorHandlerMiddleware)

# 2. Middleware CORS (subito dopo gli errori)
# CORREZIONE: Configurazioni CORS più permissive per lo sviluppo locale
allowed_origins = [
    "http://localhost:1420",      
    "http://127.0.0.1:1420",
    "http://localhost:3000",      
    "http://127.0.0.1:3000",
    "http://localhost:5173",      
    "http://127.0.0.1:5173",
    "tauri://localhost",
]
if settings.DEBUG:
    logger.warning("⚠️ MODALITÀ DEBUG: CORS permissivo attivo per tutti gli origins")
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permette tutti i metodi, inclusi POST
    allow_headers=["*"],
)

# 3. Altri middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Inclusione dei router API
# CORREZIONE: Assicuriamo che tutti i router siano inclusi correttamente
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(first_run.router, prefix="/api/first-run", tags=["First Run"])
app.include_router(setup.router, prefix="/api/setup", tags=["Setup"])
app.include_router(anagraphics.router, prefix="/api/anagraphics", tags=["Anagraphics"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"])
app.include_router(import_export.router, prefix="/api/import-export", tags=["Import/Export"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(sync.router, prefix="/api/sync", tags=["Cloud Sync"])
app.include_router(system.router, prefix="/api/system", tags=["System"])


@app.get("/")
async def root():
    return JSONResponse(content={
        "message": "FatturaAnalyzer API v2 is running",
        "version": "2.0.0",
        "docs": "/api/docs"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
