"""
System Management API endpoints
"""

import logging
import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models import APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/info")
async def get_system_info():
    """Informazioni complete del sistema"""
    try:
        from app.api.first_run import FirstRunManager
        
        # Sistema base
        system_status = await FirstRunManager.get_system_status()
        
        # Informazioni ambiente
        environment_info = {
            "version": "2.0.0",
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "platform": os.name,
            "working_directory": os.getcwd(),
            "debug_mode": settings.DEBUG,
            "host": settings.HOST,
            "port": settings.PORT
        }
        
        # Informazioni configurazione
        config_info = {
            "config_path": str(Path("config.ini").resolve()),
            "database_path": settings.get_database_path(),
            "company_name": settings.COMPANY_NAME,
            "company_vat": settings.COMPANY_VAT,
            "sync_enabled": settings.SYNC_ENABLED
        }
        
        # Informazioni file system
        paths_info = {}
        important_paths = {
            "config": "config.ini",
            "database": settings.get_database_path(),
            "logs": "logs",
            "uploads": "uploads", 
            "temp": "temp",
            "backups": "backups"
        }
        
        for name, path in important_paths.items():
            path_obj = Path(path)
            if path_obj.exists():
                if path_obj.is_file():
                    size = path_obj.stat().st_size
                    paths_info[name] = {
                        "exists": True,
                        "type": "file",
                        "size_bytes": size,
                        "size_mb": round(size / 1024 / 1024, 2),
                        "path": str(path_obj.resolve())
                    }
                else:
                    # Directory
                    try:
                        total_size = sum(f.stat().st_size for f in path_obj.rglob('*') if f.is_file())
                        file_count = len([f for f in path_obj.rglob('*') if f.is_file()])
                        paths_info[name] = {
                            "exists": True,
                            "type": "directory",
                            "total_size_bytes": total_size,
                            "total_size_mb": round(total_size / 1024 / 1024, 2),
                            "file_count": file_count,
                            "path": str(path_obj.resolve())
                        }
                    except:
                        paths_info[name] = {
                            "exists": True,
                            "type": "directory",
                            "path": str(path_obj.resolve()),
                            "error": "Could not calculate size"
                        }
            else:
                paths_info[name] = {
                    "exists": False,
                    "path": str(path_obj.resolve())
                }
        
        return APIResponse(
            success=True,
            message="System information retrieved",
            data={
                "system_status": system_status,
                "environment": environment_info,
                "configuration": config_info,
                "paths": paths_info,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving system information")


@router.post("/maintenance/cleanup")
async def cleanup_system():
    """Pulizia sistema - rimuove file temporanei"""
    try:
        cleanup_results = {
            "temp_files_removed": 0,
            "log_files_cleaned": 0,
            "space_freed_mb": 0,
            "errors": []
        }
        
        # Pulizia directory temp
        temp_dir = Path("temp")
        if temp_dir.exists():
            try:
                for file in temp_dir.rglob("*"):
                    if file.is_file():
                        size = file.stat().st_size
                        file.unlink()
                        cleanup_results["temp_files_removed"] += 1
                        cleanup_results["space_freed_mb"] += size / 1024 / 1024
            except Exception as e:
                cleanup_results["errors"].append(f"Error cleaning temp: {str(e)}")
        
        # Pulizia log vecchi (più di 30 giorni)
        logs_dir = Path("logs")
        if logs_dir.exists():
            try:
                import time
                cutoff_time = time.time() - (30 * 24 * 60 * 60)  # 30 giorni
                
                for log_file in logs_dir.glob("*.log*"):
                    if log_file.stat().st_mtime < cutoff_time:
                        size = log_file.stat().st_size
                        log_file.unlink()
                        cleanup_results["log_files_cleaned"] += 1
                        cleanup_results["space_freed_mb"] += size / 1024 / 1024
            except Exception as e:
                cleanup_results["errors"].append(f"Error cleaning logs: {str(e)}")
        
        # Pulizia upload vecchi
        uploads_dir = Path("uploads")
        if uploads_dir.exists():
            try:
                import time
                cutoff_time = time.time() - (7 * 24 * 60 * 60)  # 7 giorni
                
                for upload_file in uploads_dir.rglob("*"):
                    if upload_file.is_file() and upload_file.stat().st_mtime < cutoff_time:
                        size = upload_file.stat().st_size
                        upload_file.unlink()
                        cleanup_results["temp_files_removed"] += 1
                        cleanup_results["space_freed_mb"] += size / 1024 / 1024
            except Exception as e:
                cleanup_results["errors"].append(f"Error cleaning uploads: {str(e)}")
        
        cleanup_results["space_freed_mb"] = round(cleanup_results["space_freed_mb"], 2)
        
        return APIResponse(
            success=True,
            message=f"Cleanup completed: {cleanup_results['temp_files_removed'] + cleanup_results['log_files_cleaned']} files removed, {cleanup_results['space_freed_mb']} MB freed",
            data=cleanup_results
        )
        
    except Exception as e:
        logger.error(f"Error during system cleanup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error during system cleanup")


@router.post("/maintenance/optimize-database")
async def optimize_database():
    """Ottimizza il database"""
    try:
        from app.adapters.database_adapter import db_adapter
        
        optimization_results = await db_adapter.optimize_database_async()
        
        return APIResponse(
            success=True,
            message="Database optimization completed",
            data=optimization_results
        )
        
    except Exception as e:
        logger.error(f"Error optimizing database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error optimizing database")


@router.post("/maintenance/clear-caches")
async def clear_caches():
    """Pulisce le cache del sistema"""
    try:
        from app.adapters.database_adapter import db_adapter
        
        cache_results = await db_adapter.clear_all_caches_async()
        
        return APIResponse(
            success=True,
            message="All caches cleared successfully",
            data=cache_results
        )
        
    except Exception as e:
        logger.error(f"Error clearing caches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error clearing caches")


@router.get("/performance/stats")
async def get_performance_stats():
    """Statistiche performance del sistema"""
    try:
        from app.adapters.database_adapter import db_adapter
        
        # Database stats
        db_stats = await db_adapter.get_database_stats_async()
        
        # Sistema stats
        import psutil
        process = psutil.Process(os.getpid())
        
        performance_stats = {
            "database": db_stats,
            "system": {
                "cpu_percent": process.cpu_percent(),
                "memory_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                "memory_percent": process.memory_percent(),
                "open_files": process.num_fds() if hasattr(process, 'num_fds') else 0,
                "threads": process.num_threads(),
                "uptime_seconds": time.time() - process.create_time() if hasattr(process, 'create_time') else 0
            },
            "disk_usage": {
                "total_gb": round(shutil.disk_usage('.').total / 1024 / 1024 / 1024, 2),
                "used_gb": round((shutil.disk_usage('.').total - shutil.disk_usage('.').free) / 1024 / 1024 / 1024, 2),
                "free_gb": round(shutil.disk_usage('.').free / 1024 / 1024 / 1024, 2),
                "free_percent": round((shutil.disk_usage('.').free / shutil.disk_usage('.').total) * 100, 1)
            }
        }
        
        return APIResponse(
            success=True,
            message="Performance statistics retrieved",
            data=performance_stats
        )
        
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving performance statistics")


@router.post("/backup/create")
async def create_system_backup():
    """Crea backup completo del sistema"""
    try:
        from datetime import datetime
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"fattura_analyzer_backup_{timestamp}"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            backup_dir = os.path.join(temp_dir, backup_name)
            os.makedirs(backup_dir)
            
            backup_files = []
            
            # Backup database
            db_path = settings.get_database_path()
            if os.path.exists(db_path):
                db_backup_path = os.path.join(backup_dir, "database.db")
                shutil.copy2(db_path, db_backup_path)
                backup_files.append("database.db")
                logger.info(f"Database backed up: {db_path}")
            
            # Backup configurazione
            config_paths = ["config.ini"]
            for config_path in config_paths:
                if os.path.exists(config_path):
                    shutil.copy2(config_path, backup_dir)
                    backup_files.append(config_path)
                    logger.info(f"Config backed up: {config_path}")
            
            # Backup credenziali (se esistono)
            credential_files = [
                settings.GOOGLE_CREDENTIALS_FILE,
                "google_token.json",
                "wizard_state.json"
            ]
            for cred_file in credential_files:
                if os.path.exists(cred_file):
                    shutil.copy2(cred_file, backup_dir)
                    backup_files.append(cred_file)
                    logger.info(f"Credentials backed up: {cred_file}")
            
            # Crea ZIP
            zip_path = os.path.join(temp_dir, f"{backup_name}.zip")
            shutil.make_archive(zip_path[:-4], 'zip', backup_dir)
            
            backup_size = os.path.getsize(zip_path)
            
            # Salva backup nella directory backups
            backups_dir = Path("backups")
            backups_dir.mkdir(exist_ok=True)
            
            final_backup_path = backups_dir / f"{backup_name}.zip"
            shutil.copy2(zip_path, final_backup_path)
            
            logger.info(f"Backup created: {final_backup_path}")
            
            return APIResponse(
                success=True,
                message="System backup created successfully",
                data={
                    "backup_name": backup_name,
                    "backup_path": str(final_backup_path),
                    "backup_size_mb": round(backup_size / 1024 / 1024, 2),
                    "files_included": backup_files,
                    "timestamp": timestamp
                }
            )
        
    except Exception as e:
        logger.error(f"Error creating backup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating system backup")


@router.get("/logs/recent")
async def get_recent_logs(lines: int = 100):
    """Ottiene log recenti del sistema"""
    try:
        logs_dir = Path("logs")
        if not logs_dir.exists():
            return APIResponse(
                success=True,
                message="No logs directory found",
                data={"logs": [], "message": "Logs directory does not exist"}
            )
        
        # Trova il file di log più recente
        log_files = list(logs_dir.glob("*.log"))
        if not log_files:
            return APIResponse(
                success=True,
                message="No log files found",
                data={"logs": [], "message": "No log files in logs directory"}
            )
        
        # Ordina per data di modifica (più recente per primo)
        log_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        latest_log = log_files[0]
        
        # Leggi le ultime N righe
        try:
            with open(latest_log, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
                recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            
            return APIResponse(
                success=True,
                message=f"Retrieved {len(recent_lines)} recent log lines",
                data={
                    "log_file": str(latest_log),
                    "total_lines": len(all_lines),
                    "returned_lines": len(recent_lines),
                    "logs": [line.strip() for line in recent_lines]
                }
            )
            
        except Exception as e:
            return APIResponse(
                success=False,
                message="Error reading log file",
                data={"error": str(e), "log_file": str(latest_log)}
            )
        
    except Exception as e:
        logger.error(f"Error getting recent logs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving recent logs")


@router.post("/restart")
async def restart_system():
    """Riavvia il sistema (solo in development)"""
    try:
        if not settings.DEBUG:
            raise HTTPException(status_code=403, detail="Restart only available in debug mode")
        
        # In un vero sistema di produzione, questo richiederebbe privilegi speciali
        # Per ora, restituisce solo un messaggio
        return APIResponse(
            success=True,
            message="Restart requested - please restart the server manually",
            data={
                "note": "In development mode, restart the server with: python scripts/start_dev.py",
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during restart: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error during restart")


@router.get("/version")
async def get_version_info():
    """Informazioni sulla versione del sistema"""
    try:
        import sys
        from app.api.first_run import FirstRunManager
        
        # Sistema status
        system_status = await FirstRunManager.get_system_status()
        
        version_info = {
            "application": {
                "name": "FatturaAnalyzer",
                "version": "2.0.0",
                "build": "development",
                "release_date": "2025-06-18"
            },
            "python": {
                "version": sys.version,
                "executable": sys.executable,
                "platform": sys.platform
            },
            "dependencies": {
                "fastapi": "Available",
                "uvicorn": "Available", 
                "sqlite": "Available",
                "pandas": "Available"
            },
            "system_status": {
                "setup_completed": system_status["setup_completed"],
                "first_run_required": system_status["is_first_run"],
                "database_initialized": system_status["database_initialized"]
            }
        }
        
        # Test dipendenze
        dependencies_to_test = ["fastapi", "uvicorn", "pandas", "sqlite3", "configparser"]
        for dep in dependencies_to_test:
            try:
                __import__(dep)
                version_info["dependencies"][dep] = "Available"
            except ImportError:
                version_info["dependencies"][dep] = "Missing"
        
        return APIResponse(
            success=True,
            message="Version information retrieved",
            data=version_info
        )
        
    except Exception as e:
        logger.error(f"Error getting version info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving version information")
