"""
FatturaAnalyzer v2 - FastAPI Backend
Main application entry point - VERSIONE ENTERPRISE STABILE E COMPLETA
"""
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# Assicura che la root del backend sia nel sys.path
backend_path = Path(__file__).resolve().parent.parent
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

# Configurazione robusta del logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(backend_path / 'logs' / 'fattura_analyzer_api.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestisce gli eventi di avvio e spegnimento dell'applicazione."""
    logger.info("==================================================")
    logger.info("🚀 Starting FatturaAnalyzer API v2 - Enterprise Edition")
    logger.info(f"Running in {settings.ENVIRONMENT.upper()} mode")
    logger.info("==================================================")
    yield
    logger.info("==================================================")
    logger.info("👋 Shutting down FatturaAnalyzer API...")
    logger.info("==================================================")

app = FastAPI(
    title="FatturaAnalyzer API v2",
    description="Modern invoice and financial management system for Italian businesses",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# 1. Middleware per la gestione degli errori (deve essere il più esterno per catturare tutto)
app.add_middleware(ErrorHandlerMiddleware)

# 2. Middleware CORS
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
    logger.warning("⚠️ DEBUG MODE: Allowing all origins for CORS.")
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Middleware per la compressione GZip
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 4. Inclusione dei router API
logger.info("Including API routers...")
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
logger.info("✅ All API routers included successfully.")

@app.get("/")
async def root():
    """Endpoint principale per verificare che l'API sia online."""
    return JSONResponse(content={
        "message": "FatturaAnalyzer API v2 is running",
        "version": "2.0.0",
        "docs_url": app.docs_url,
        "health_check": "/health"
    })

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server on {settings.HOST}:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
