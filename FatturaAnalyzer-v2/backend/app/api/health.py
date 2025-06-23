"""
Health Check API endpoints
"""

import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from app.models import APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/")
async def get_detailed_health_status():
    """Health check dettagliato con stato configurazione - LOGICA CORRETTA"""
    try:
        from app.adapters.database_adapter import db_adapter
        from app.api.first_run import FirstRunManager
        
        db_path = settings.get_database_path()
        db_exists = Path(db_path).exists()
        db_status = "unknown"
        db_error = None
        
        if db_exists:
            try:
                test_result = await db_adapter.execute_query_async("SELECT 1 as test")
                if test_result and test_result[0]['test'] == 1:
                    db_status = "connected"
                else:
                    db_status = "error"
                    db_error = "Unexpected result from test query"
            except Exception as e:
                db_status = "error"
                db_error = str(e)
        else:
            db_status = "not_found"

        system_status = await FirstRunManager.get_system_status()
        
        # 🔥 LOGICA CORRETTA PER LO STATO GENERALE
        overall_status = "healthy"
        recommendations = []
        
        if system_status["is_first_run"]:
            overall_status = "needs_setup"
            recommendations.append("Eseguire il wizard di configurazione iniziale.")
        elif db_status != "connected":
            overall_status = "unhealthy"
            recommendations.append("Errore critico di connessione al database.")
        
        if not recommendations:
            recommendations.append("System is healthy and ready for use.")

        health_data = {
            "status": overall_status, # <-- USA LO STATO CALCOLATO
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "status": db_status,
                "path": db_path,
                "exists": db_exists,
                "size_mb": round(Path(db_path).stat().st_size / 1024 / 1024, 2) if db_exists else 0,
                "error": db_error
            },
            "configuration": {
                "config_exists": Path("config.ini").exists(),
                "company_configured": system_status["company_configured"],
                "first_run_required": system_status["is_first_run"],
            },
            "recommendations": recommendations
        }
        
        return APIResponse(success=True, message="Health check completed", data=health_data)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return APIResponse(success=False, message="Health check failed", data={"status": "error", "error": str(e)})


@router.get("/database")
async def check_database_health():
    """Controllo specifico per la salute del database"""
    try:
        from app.adapters.database_adapter import db_adapter
        
        # Test connessione base
        start_time = time.time()
        test_result = await db_adapter.execute_query_async("SELECT 1 as test")
        connection_time = (time.time() - start_time) * 1000
        
        if not test_result or test_result[0]['test'] != 1:
            raise Exception("Connection test failed")
        
        # Conta tabelle
        tables_result = await db_adapter.execute_query_async("""
            SELECT COUNT(*) as count FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        """)
        table_count = tables_result[0]['count'] if tables_result else 0
        
        # Statistiche database
        stats = await db_adapter.get_database_stats_async()
        
        db_path = settings.get_database_path()
        db_size = Path(db_path).stat().st_size if Path(db_path).exists() else 0
        
        return APIResponse(
            success=True,
            message="Database health check passed",
            data={
                "connection": "healthy",
                "connection_time_ms": round(connection_time, 2),
                "database_path": db_path,
                "database_size_mb": round(db_size / 1024 / 1024, 2),
                "table_count": table_count,
                "statistics": stats
            }
        )
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return APIResponse(
            success=False,
            message="Database health check failed",
            data={
                "connection": "failed",
                "error": str(e),
                "database_path": settings.get_database_path(),
                "database_exists": Path(settings.get_database_path()).exists()
            }
        )


@router.get("/system")
async def check_system_health():
    """Controllo salute sistema generale"""
    try:
        from app.api.first_run import FirstRunManager
        
        # Status generale del sistema
        system_status = await FirstRunManager.get_system_status()
        
        # Controlli file system
        important_paths = {
            "config": Path("config.ini"),
            "database": Path(settings.get_database_path()),
            "logs": Path("logs"),
            "uploads": Path("uploads"),
            "temp": Path("temp")
        }
        
        path_status = {}
        for name, path in important_paths.items():
            path_status[name] = {
                "exists": path.exists(),
                "path": str(path),
                "is_dir": path.is_dir() if path.exists() else False,
                "size_mb": round(path.stat().st_size / 1024 / 1024, 2) if path.exists() and path.is_file() else 0
            }
        
        # Controlli moduli
        module_status = {}
        core_modules = [
            "app.core.database",
            "app.adapters.database_adapter", 
            "app.adapters.importer_adapter",
            "app.adapters.cloud_sync_adapter"
        ]
        
        for module in core_modules:
            try:
                __import__(module)
                module_status[module] = "available"
            except Exception as e:
                module_status[module] = f"error: {str(e)}"
        
        # Stato configurazione
        config_health = {
            "company_configured": system_status["company_configured"],
            "database_initialized": system_status["database_initialized"],
            "setup_completed": system_status["setup_completed"],
            "first_run_required": system_status["is_first_run"]
        }
        
        # Determina stato generale
        overall_health = "healthy"
        issues = []
        
        if system_status["is_first_run"]:
            overall_health = "needs_setup"
            issues.append("First run setup required")
        
        if not system_status["database_initialized"]:
            overall_health = "degraded"
            issues.append("Database not initialized")
        
        if "error" in str(module_status):
            overall_health = "degraded" 
            issues.append("Some modules unavailable")
        
        return APIResponse(
            success=True,
            message="System health check completed",
            data={
                "overall_health": overall_health,
                "issues": issues,
                "system_status": system_status,
                "paths": path_status,
                "modules": module_status,
                "configuration": config_health,
                "environment": {
                    "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
                    "platform": os.name,
                    "working_directory": os.getcwd(),
                    "debug_mode": settings.DEBUG
                }
            }
        )
        
    except Exception as e:
        logger.error(f"System health check failed: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message="System health check failed",
            data={
                "overall_health": "error",
                "error": str(e)
            }
        )
