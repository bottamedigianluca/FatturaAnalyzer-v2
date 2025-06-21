#!/usr/bin/env python3
"""
FatturaAnalyzer v2 - FastAPI Backend
Main application entry point con CORS corretto e configurazione completa
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response

# Add path per importare il core esistente
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.config import settings
from app.middleware.error_handler import ErrorHandlerMiddleware
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
    first_run,
    health,
    system
)

# Configure logging
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
    """Application lifespan events con First Run Detection"""
    # Startup
    logger.info("🚀 Starting FatturaAnalyzer API v2...")
    
    # Create directories
    directories = ['logs', 'data', 'uploads', 'temp', 'backups']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Check for first run con gestione errori completa
    is_first_run = True
    try:
        # Import FirstRunManager
        from app.api.first_run import FirstRunManager
        is_first_run = await FirstRunManager.is_first_run()
        
        if is_first_run:
            logger.info("🎯 First run detected - setup wizard will be available")
            app.state.first_run_required = True
            app.state.setup_wizard_enabled = True
            
            # Try to initialize basic database
            try:
                from app.adapters.database_adapter import db_adapter_optimized
                await db_adapter_optimized.create_tables_async()
                logger.info("✅ Basic database structure created")
            except Exception as e:
                logger.warning(f"Could not create database structure: {e}")
            
            # Try auto-configuration
            try:
                config_manager = ConfigManager()
                auto_update_info = config_manager.auto_update_check()
                
                if auto_update_info.get("auto_update_available"):
                    logger.info("🔧 Auto-update configuration available")
                    result = config_manager.perform_auto_update()
                    if result["success"]:
                        logger.info(f"✅ Configuration auto-updated: {result['message']}")
                        # Re-check first run status
                        is_first_run = await FirstRunManager.is_first_run()
            except Exception as e:
                logger.warning(f"Auto-update error: {e}")
        else:
            logger.info("✅ System already configured - normal startup")
            app.state.first_run_required = False
            app.state.setup_wizard_enabled = False
            
            # Initialize database normally
            try:
                from app.adapters.database_adapter import db_adapter_optimized
                await db_adapter_optimized.create_tables_async()
                logger.info("✅ Database initialized successfully")
                
                # Test database connection
                result = await db_adapter_optimized.execute_query_async("SELECT 1 as test")
                if result and result[0]['test'] == 1:
                    logger.info("✅ Database connection test successful")
                    app.state.company_configured = True
                else:
                    raise Exception("Unexpected result from test query")
            except Exception as e:
                logger.error(f"Database error: {e}")
                app.state.company_configured = False
    
    except Exception as e:
        logger.error(f"Startup error: {e}")
        app.state.first_run_required = True
        app.state.setup_wizard_enabled = True
        app.state.company_configured = False
    
    logger.info("🎉 FatturaAnalyzer API startup completed!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down FatturaAnalyzer API...")

# Create FastAPI application
app = FastAPI(
    title="FatturaAnalyzer API v2",
    description="Modern invoice and financial management system for Italian businesses",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# ===== CONFIGURAZIONE CORS COMPLETA =====
logger.info("🔧 Configurando CORS per sviluppo...")

# Lista completa di origins permessi
allowed_origins = [
    "http://localhost:1420",      # Tauri dev server
    "http://127.0.0.1:1420",
    "http://localhost:3000",      # React dev server
    "http://127.0.0.1:3000",
    "http://localhost:5173",      # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:8080",      # Altri dev servers
    "http://127.0.0.1:8080",
    "http://localhost:4200",      # Angular dev server
    "http://127.0.0.1:4200",
    "tauri://localhost",          # Tauri app
    "https://tauri.localhost",
    "tauri://app.localhost",
    "https://app.localhost",
]

# In modalità debug, aggiungi configurazione più permissiva
if settings.DEBUG:
    logger.warning("⚠️ MODALITÀ DEBUG: CORS permissivo attivo")
    allowed_origins.append("*")

# Aggiungi middleware CORS PRIMA di altri middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-API-Key",
        "X-Request-ID",
        "Cache-Control",
        "Pragma",
        "Origin",
        "User-Agent",
        "DNT",
        "If-Modified-Since",
        "Keep-Alive",
        "X-Custom-Header",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Methods", 
        "Access-Control-Allow-Headers",
        "X-Enhanced",
        "X-Force-Background",
        "X-Smart-Validation"
    ],
    expose_headers=[
        "Content-Range",
        "X-Content-Range", 
        "X-Total-Count",
        "X-Request-ID",
        "X-API-Version",
    ],
    max_age=600,  # Cache preflight per 10 minuti
)

# Altri middleware DOPO CORS
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ErrorHandlerMiddleware)

# Handler esplicito per OPTIONS - MIGLIORATO
@app.options("/{path:path}")
async def enhanced_options_handler(request: Request, path: str):
    """
    Handler migliorato per richieste OPTIONS con logging dettagliato
    """
    origin = request.headers.get("origin", "unknown")
    method = request.headers.get("access-control-request-method", "unknown")
    headers = request.headers.get("access-control-request-headers", "")
    
    logger.info(f"🔍 OPTIONS: /{path} | Origin: {origin} | Method: {method}")
    
    response_headers = {
        "Access-Control-Allow-Origin": origin if origin in allowed_origins or "*" in allowed_origins else "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
        "Access-Control-Allow-Headers": ", ".join([
            "Accept", "Accept-Language", "Content-Language", "Content-Type",
            "Authorization", "X-Requested-With", "X-API-Key", "X-Request-ID",
            "Cache-Control", "Pragma", "Origin", "User-Agent", "DNT",
            "If-Modified-Since", "Keep-Alive", "X-Custom-Header",
            "Access-Control-Allow-Origin", "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers", "X-Enhanced", "X-Force-Background",
            "X-Smart-Validation"
        ]) + (f", {headers}" if headers else ""),
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600"
    }
    
    return Response(
        status_code=200,
        headers=response_headers,
        content=""
    )

# Security middleware DOPO CORS  
add_security_middleware(app)

# Middleware per debug CORS
@app.middleware("http")
async def debug_cors_middleware(request: Request, call_next):
    """Middleware per debug CORS"""
    if settings.DEBUG:
        origin = request.headers.get("origin")
        if origin:
            logger.info(f"🌐 Request: {request.method} {request.url.path} | Origin: {origin}")
    
    response = await call_next(request)
    
    # Aggiungi headers CORS extra se necessario
    if settings.DEBUG and hasattr(response, 'headers'):
        response.headers["X-Debug-CORS"] = "enabled"
    
    return response

# First Run Detection Middleware
@app.middleware("http") 
async def first_run_detection_middleware(request: Request, call_next):
    """Middleware per rilevare primo avvio e redirigere al setup se necessario"""
    
    # Skip middleware per endpoint specifici
    skip_paths = [
        "/health",
        "/api/health",
        "/api/first-run",
        "/api/setup", 
        "/api/system",
        "/api/docs",
        "/api/redoc",
        "/openapi.json",
        "/static"
    ]
    
    path = request.url.path
    
    # Se il path inizia con uno dei percorsi da saltare, continua normalmente
    if any(path.startswith(skip_path) for skip_path in skip_paths):
        return await call_next(request)
    
    # Controlla first run usando la logica aggiornata
    try:
        from app.api.first_run import FirstRunManager
        is_first_run_needed = await FirstRunManager.is_first_run()
        
        # Se è primo avvio e l'utente non sta già facendo setup, suggerisci setup
        if is_first_run_needed:
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
    except Exception as e:
        logger.warning(f"Error in first run middleware: {e}")
        # In caso di errore nel middleware, continua normalmente
        pass
    
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
                from app.adapters.database_adapter import db_adapter_optimized
                test_result = await db_adapter_optimized.execute_query_async("SELECT 1 as test")
                database_status = "connected" if test_result else "error"
            except:
                database_status = "error"
        else:
            # Anche durante primo avvio, prova a testare il database
            try:
                from app.adapters.database_adapter import db_adapter_optimized
                test_result = await db_adapter_optimized.execute_query_async("SELECT 1 as test")
                database_status = "initialized" if test_result else "not_initialized"
            except:
                database_status = "not_initialized"
        
        # Test core availability
        core_status = "available"
        try:
            from app.core.database import get_connection
            conn = get_connection()
            conn.close()
        except Exception as e:
            core_status = f"error: {str(e)}"
        
        # Usa la logica aggiornata per first run
        try:
            from app.api.first_run import FirstRunManager
            is_first_run = await FirstRunManager.is_first_run()
            system_status = await FirstRunManager.get_system_status()
            company_configured = system_status.get("company_configured", False)
        except Exception as e:
            logger.warning(f"Error getting system status: {e}")
            is_first_run = getattr(app.state, 'first_run_required', True)
            company_configured = getattr(app.state, 'company_configured', False)
        
        return {
            "status": "healthy",
            "version": "2.0.0",
            "database": database_status,
            "core_integration": core_status,
            "first_run_required": is_first_run,
            "setup_wizard_enabled": getattr(app.state, 'setup_wizard_enabled', True),
            "company_configured": company_configured,
            "cors_configured": True,
            "allowed_origins": allowed_origins if settings.DEBUG else "configured",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service Unavailable")

# API Routes
# First Run e Setup sempre disponibili
app.include_router(first_run.router, prefix="/api/first-run", tags=["First Run Wizard"])
app.include_router(setup.router, prefix="/api/setup", tags=["Setup & Configuration"])

# Nuovi endpoint di sistema
app.include_router(health.router, prefix="/api/health", tags=["Health Check"])
app.include_router(system.router, prefix="/api/system", tags=["System Management"])

# API Routes principali (disponibili dopo setup o durante primo avvio per testing)
app.include_router(anagraphics.router, prefix="/api/anagraphics", tags=["Anagraphics"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(import_export.router, prefix="/api/import-export", tags=["Import/Export"])
app.include_router(sync.router, prefix="/api/sync", tags=["Cloud Sync"])

# Serve static files (if needed)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    
    # Controlla first run per la risposta
    try:
        from app.api.first_run import FirstRunManager
        is_first_run = await FirstRunManager.is_first_run()
    except:
        is_first_run = getattr(app.state, 'first_run_required', False)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred" if not settings.DEBUG else str(exc),
            "first_run_required": is_first_run
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
        "core_integration": "active",
        "cors_status": "configured"
    }
    
    # Usa la logica aggiornata per controllare first run
    try:
        from app.api.first_run import FirstRunManager
        is_first_run = await FirstRunManager.is_first_run()
        system_status = await FirstRunManager.get_system_status()
        company_configured = system_status.get("company_configured", False)
    except Exception as e:
        logger.warning(f"Error getting first run status in root endpoint: {e}")
        is_first_run = getattr(app.state, 'first_run_required', False)
        company_configured = getattr(app.state, 'company_configured', False)
    
    # Se è primo avvio, aggiungi informazioni setup
    if is_first_run:
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
            "company_configured": company_configured,
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

# Endpoint per test CORS
@app.get("/api/cors-test")
async def cors_test(request: Request):
    """Endpoint per testare CORS"""
    return {
        "message": "CORS test successful",
        "origin": request.headers.get("origin", "No origin header"),
        "user_agent": request.headers.get("user-agent", "No user agent"),
        "method": request.method,
        "cors_configured": True,
        "timestamp": datetime.now().isoformat()
    }

# Endpoint per il controllo configurazione
@app.get("/api/config/status")
async def get_config_status():
    """Ottiene stato configurazione sistema"""
    try:
        from app.api.first_run import FirstRunManager
        
        system_status = await FirstRunManager.get_system_status()
        config_manager = ConfigManager()
        auto_update_info = config_manager.auto_update_check()
        
        return {
            "first_run_required": system_status["is_first_run"],
            "company_configured": system_status["company_configured"],
            "setup_completed": system_status["setup_completed"],
            "wizard_completed": system_status.get("wizard_completed", False),
            "database_initialized": system_status["database_initialized"],
            "config_version": auto_update_info.get("current_version", "unknown"),
            "config_valid": auto_update_info.get("config_valid", False),
            "needs_update": auto_update_info.get("needs_update", False),
            "auto_update_available": auto_update_info.get("auto_update_available", False)
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
        is_first_run = await FirstRunManager.is_first_run()
        
        # Aggiorna stato app
        app.state.first_run_required = is_first_run
        app.state.setup_wizard_enabled = is_first_run
        
        return {
            "first_run_required": is_first_run,
            "state_updated": True,
            "message": "First run status rechecked and updated using new logic"
        }
    except Exception as e:
        logger.error(f"Error rechecking first run: {e}")
        raise HTTPException(status_code=500, detail="Error rechecking first run status")

def main():
    """Main function for running the server"""
    # Pre-flight check per primo avvio
    try:
        print("🎯 Checking system status...")
        config_path = Path("config.ini")
        if not config_path.exists():
            print("🎯 PRIMO AVVIO RILEVATO!")
            print("📋 Il sistema non è ancora configurato.")
            print("🌐 Dopo l'avvio, visita: http://127.0.0.1:8000/api/first-run/check")
            print("🚀 per avviare il setup wizard guidato.\n")
        else:
            print("✅ Sistema configurato - avvio normale.\n")
    except:
        print("ℹ️ Controllo primo avvio non riuscito - continuando con avvio normale.\n")
    
    print("🌐 CORS configurato per:")
    for origin in allowed_origins:
        print(f"   • {origin}")
    print()
    
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
