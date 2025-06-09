# app/main.py - Aggiornato con First Run Wizard
#!/usr/bin/env python3
"""
FatturaAnalyzer v2 - FastAPI Backend
Main application entry point con First Run Wizard integrato
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

# Add path per importare il core esistente
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.config import settings
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.cors import add_cors_middleware
from app.middleware.auth import add_security_middleware
from app.utils.config_auto_update import ConfigManager
from app.api import (
    anagraphics,
    analytics,
    invoices,
    transactions,
    reconciliation,
    import_export,
    sync,
    setup,
    first_run
)

# Configure logging
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
    from app.adapters.database_adapter import db_adapter
    """Application lifespan events con First Run Detection"""
    # Startup
    logger.info("🚀 Starting FatturaAnalyzer API v2...")
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    os.makedirs('uploads', exist_ok=True)
    os.makedirs('temp', exist_ok=True)
    os.makedirs('backups', exist_ok=True)
    
    # Check for first run
    from app.api.first_run import FirstRunManager
    is_first_run = FirstRunManager.is_first_run()
    
    if is_first_run:
        logger.info("🎯 First run detected - setup wizard will be available")
        
        # Initialize minimal database structure for setup wizard
        try:
            await db_adapter.create_tables_async()
            logger.info("✅ Basic database structure created for setup")
        except Exception as e:
            logger.warning(f"⚠️ Could not create basic database structure: {e}")
        
        # Check for auto-configuration opportunities
        config_manager = ConfigManager()
        auto_update_info = config_manager.auto_update_check()
        
        if auto_update_info.get("auto_update_available"):
            logger.info("🔧 Auto-update configuration available")
            try:
                result = config_manager.perform_auto_update()
                if result["success"]:
                    logger.info(f"✅ Configuration auto-updated: {result['message']}")
                    is_first_run = False  # Configuration was auto-updated
                else:
                    logger.warning(f"⚠️ Auto-update failed: {result['message']}")
            except Exception as e:
                logger.error(f"❌ Auto-update error: {e}")
        
        # Store first run status in app state
        app.state.first_run_required = is_first_run
        app.state.setup_wizard_enabled = True
        
    else:
        logger.info("✅ System already configured - normal startup")
        app.state.first_run_required = False
        app.state.setup_wizard_enabled = False
        
        # Initialize database normally for configured system
        try:
            await db_adapter.create_tables_async()
            logger.info("✅ Database initialized successfully")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            raise
        
        # Test database connection
        try:
            result = await db_adapter.execute_query_async("SELECT 1 as test")
            if result and result[0]['test'] == 1:
                logger.info("✅ Database connection test successful")
            else:
                raise Exception("Unexpected result from test query")
        except Exception as e:
            logger.error(f"❌ Database connection test failed: {e}")
            raise
        
        # Validate company configuration only if not first run
        if not settings.COMPANY_VAT and not settings.COMPANY_CF:
            logger.warning("⚠️ Company VAT/CF not configured. Some features may not work properly.")
            app.state.company_configured = False
        else:
            logger.info(f"✅ Company config loaded: {settings.COMPANY_NAME}")
            app.state.company_configured = True
    
    logger.info("🎉 FatturaAnalyzer API startup completed!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down FatturaAnalyzer API...")

# Create FastAPI application
app = FastAPI(
    title="FatturaAnalyzer API v2",
    description="Modern invoice and financial management system for Italian businesses - Con Setup Wizard Integrato",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ErrorHandlerMiddleware)

# CORS configuration
add_cors_middleware(app)

# Security middleware (rate limiting, etc.)
add_security_middleware(app)


# First Run Detection Middleware
@app.middleware("http")
async def first_run_detection_middleware(request: Request, call_next):
    """Middleware per rilevare primo avvio e redirigere al setup se necessario"""
    
    # Skip middleware per endpoint specifici
    skip_paths = [
        "/health",
        "/api/first-run",
        "/api/setup", 
        "/api/docs",
        "/api/redoc",
        "/openapi.json",
        "/static"
    ]
    
    path = request.url.path
    
    # Se il path inizia con uno dei percorsi da saltare, continua normalmente
    if any(path.startswith(skip_path) for skip_path in skip_paths):
        return await call_next(request)
    
    # Se è primo avvio e l'utente non sta già facendo setup, suggerisci setup
    if getattr(app.state, 'first_run_required', False):
        # Per richieste API, restituisci JSON con info setup
        if path.startswith("/api/"):
            return JSONResponse(
                status_code=200,  # Non è un errore, è informativo
                content={
                    "first_run_detected": True,
                    "message": "Sistema non configurato - setup richiesto",
                    "setup_wizard_url": "/api/first-run/check",
                    "recommendation": "Avvia il setup wizard per configurare il sistema"
                }
            )
        else:
            # Per richieste non-API, continua normalmente
            return await call_next(request)
    
    # Normale processing
    return await call_next(request)


# Health check endpoint (sempre disponibile)
@app.get("/health")
async def health_check():
    """Health check endpoint con info setup"""
    try:
        # Test database se non è primo avvio
        database_status = "not_initialized"
        if not getattr(app.state, 'first_run_required', True):
            try:
                test_result = await db_adapter.execute_query_async("SELECT 1 as test")
                database_status = "connected" if test_result else "error"
            except:
                database_status = "error"
        
        # Test core availability
        core_status = "available"
        try:
            from app.core.database import get_connection
            conn = get_connection()
            conn.close()
        except Exception as e:
            core_status = f"error: {str(e)}"
        
        return {
            "status": "healthy",
            "version": "2.0.0",
            "database": database_status,
            "core_integration": core_status,
            "first_run_required": getattr(app.state, 'first_run_required', True),
            "setup_wizard_enabled": getattr(app.state, 'setup_wizard_enabled', True),
            "company_configured": getattr(app.state, 'company_configured', False),
            "timestamp": "2025-06-05T12:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service Unavailable")


# API Routes
# First Run e Setup sempre disponibili
app.include_router(first_run.router, prefix="/api/first-run", tags=["First Run Wizard"])
app.include_router(setup.router, prefix="/api/setup", tags=["Setup & Configuration"])

# API Routes principali (disponibili dopo setup o durante primo avvio per testing)
app.include_router(anagraphics.router, prefix="/api/anagraphics", tags=["Anagraphics"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(import_export.router, prefix="/api/import", tags=["Import/Export"])
app.include_router(sync.router, prefix="/api/sync", tags=["Cloud Sync"])

# Serve static files (if needed)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred" if not settings.DEBUG else str(exc),
            "first_run_required": getattr(app.state, 'first_run_required', False)
        }
    )


# Root endpoint con first run detection
@app.get("/")
async def root():
    """Root endpoint con supporto first run"""
    
    base_response = {
        "message": "FatturaAnalyzer API v2.0 - Sistema Gestione Fatture Italiane",
        "status": "running",
        "version": "2.0.0",
        "core_integration": "active"
    }
    
    # Se è primo avvio, aggiungi informazioni setup
    if getattr(app.state, 'first_run_required', False):
        base_response.update({
            "first_run_detected": True,
            "setup_required": True,
            "setup_wizard": "/api/first-run/check",
            "message": "🎯 Benvenuto! Sistema non configurato - avvia il setup wizard per iniziare",
            "quick_start": {
                "step_1": "GET /api/first-run/check - Controlla stato setup",
                "step_2": "GET /api/first-run/wizard/start - Avvia wizard guidato",
                "step_3": "Segui i passaggi del wizard per configurare il sistema"
            }
        })
    else:
        base_response.update({
            "setup_completed": True,
            "docs": "/api/docs" if settings.DEBUG else "disabled",
            "health": "/health",
            "company_configured": getattr(app.state, 'company_configured', False),
            "features": [
                "Invoice Management",
                "Bank Transaction Processing", 
                "Smart Reconciliation",
                "Analytics & Reporting",
                "Google Drive Sync",
                "Multi-format Import/Export"
            ]
        })
    
    return base_response


# Endpoint per il controllo configurazione
@app.get("/api/config/status")
async def get_config_status():
    """Ottiene stato configurazione sistema"""
    try:
        config_manager = ConfigManager()
        auto_update_info = config_manager.auto_update_check()
        
        return {
            "first_run_required": getattr(app.state, 'first_run_required', False),
            "company_configured": getattr(app.state, 'company_configured', False),
            "config_version": auto_update_info.get("current_version", "unknown"),
            "config_valid": auto_update_info.get("config_valid", False),
            "needs_update": auto_update_info.get("needs_update", False),
            "auto_update_available": auto_update_info.get("auto_update_available", False),
            "database_initialized": not getattr(app.state, 'first_run_required', True)
        }
    except Exception as e:
        logger.error(f"Error getting config status: {e}")
        return {
            "error": "Could not determine config status",
            "first_run_required": True
        }


# Endpoint per forzare ricontrollo primo avvio (utile per sviluppo)
@app.post("/api/system/recheck-first-run")
async def recheck_first_run():
    """Ricontrolla se è primo avvio (solo per sviluppo)"""
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Endpoint disponibile solo in modalità debug")
    
    try:
        from app.api.first_run import FirstRunManager
        is_first_run = FirstRunManager.is_first_run()
        
        # Aggiorna stato app
        app.state.first_run_required = is_first_run
        app.state.setup_wizard_enabled = is_first_run
        
        return {
            "first_run_required": is_first_run,
            "state_updated": True,
            "message": "First run status rechecked and updated"
        }
    except Exception as e:
        logger.error(f"Error rechecking first run: {e}")
        raise HTTPException(status_code=500, detail="Error rechecking first run status")


def main():
    """Main function for running the server"""
    # Pre-flight check per primo avvio
    try:
        from app.api.first_run import FirstRunManager
        if FirstRunManager.is_first_run():
            print("🎯 PRIMO AVVIO RILEVATO!")
            print("📋 Il sistema non è ancora configurato.")
            print("🌐 Dopo l'avvio, visita: http://127.0.0.1:8000/api/first-run/check")
            print("🚀 per avviare il setup wizard guidato.\n")
        else:
            print("✅ Sistema configurato - avvio normale.\n")
    except:
        print("ℹ️ Controllo primo avvio non riuscito - continuando con avvio normale.\n")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
