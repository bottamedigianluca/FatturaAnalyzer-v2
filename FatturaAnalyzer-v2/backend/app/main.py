#!/usr/bin/env python3
"""
FatturaAnalyzer v2 - FastAPI Backend
Main application entry point che integra con il core PySide6 esistente
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Add path per importare il core esistente
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.config import settings
from app.adapters.database_adapter import db_adapter
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.api import (
    anagraphics,
    analytics,
    invoices,
    transactions,
    reconciliation,
    import_export,
    sync
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
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting FatturaAnalyzer API...")
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Initialize database usando il core esistente
    try:
        await db_adapter.create_tables_async()
        logger.info("✅ Database initialized successfully using existing core")
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
    
    # Validate company configuration
    if not settings.COMPANY_VAT and not settings.COMPANY_CF:
        logger.warning("⚠️ Company VAT/CF not configured. Invoice type detection may not work properly.")
    else:
        logger.info(f"✅ Company config loaded: {settings.COMPANY_NAME} (VAT: {settings.COMPANY_VAT}, CF: {settings.COMPANY_CF})")
    
    logger.info("🎉 FatturaAnalyzer API started successfully!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down FatturaAnalyzer API...")

# Create FastAPI application
app = FastAPI(
    title="FatturaAnalyzer API",
    description="Modern invoice and financial management system for Italian businesses - Integrated with PySide6 Core",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ErrorHandlerMiddleware)

# CORS configuration for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "https://tauri.localhost",
        "http://localhost:3000",  # Development
        "http://127.0.0.1:3000",
        "http://localhost:1420",  # Tauri dev
        "http://127.0.0.1:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection usando adapter
        test_result = await db_adapter.execute_query_async("SELECT 1 as test")
        
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
            "database": "connected" if test_result else "error",
            "core_integration": core_status,
            "company_configured": bool(settings.COMPANY_VAT or settings.COMPANY_CF),
            "timestamp": "2025-06-03T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service Unavailable")

# API Routes
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
            "message": "An unexpected error occurred" if not settings.DEBUG else str(exc)
        }
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "FatturaAnalyzer API v2.0 - Integrated with PySide6 Core",
        "status": "running",
        "docs": "/api/docs" if settings.DEBUG else "disabled",
        "health": "/health",
        "core_integration": "active",
        "features": [
            "Invoice Management",
            "Bank Transaction Processing", 
            "Smart Reconciliation",
            "Analytics & Reporting",
            "Google Drive Sync",
            "Multi-format Import/Export"
        ]
    }

def main():
    """Main function for running the server"""
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