"""
First Run API endpoints - Sistema di rilevamento primo avvio
"""

import logging
import os
import configparser
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models import APIResponse
from app.config import settings
from app.utils.config_auto_update import ConfigManager

logger = logging.getLogger(__name__)
router = APIRouter()


class FirstRunManager:
    """Gestisce il rilevamento e setup del primo avvio"""
    
    @staticmethod
    def is_first_run() -> bool:
        """Determina se è il primo avvio del sistema"""
        
        # Controlla se esiste config.ini con dati validi
        config_path = "config.ini"
        if not Path(config_path).exists():
            return True
        
        try:
            config = configparser.ConfigParser()
            config.read(config_path, encoding='utf-8')
            
            # Verifica sezioni essenziali
            if not config.has_section('Azienda'):
                return True
            
            # Verifica dati azienda essenziali
            ragione_sociale = config.get('Azienda', 'RagioneSociale', fallback='').strip()
            partita_iva = config.get('Azienda', 'PartitaIVA', fallback='').strip()
            
            if not ragione_sociale or ragione_sociale == 'La Tua Azienda SRL':
                return True
            
            if not partita_iva or len(partita_iva) < 11:
                return True
            
            # Verifica se database esiste e ha dati
            db_path = settings.get_database_path()
            if not Path(db_path).exists():
                return True
            
            # Se tutto sembra configurato, non è primo avvio
            return False
            
        except Exception as e:
            logger.warning(f"Error checking first run status: {e}")
            return True
    
    @staticmethod
    def get_system_status() -> Dict[str, Any]:
        """Ottiene stato completo del sistema"""
        
        config_path = "config.ini"
        db_path = settings.get_database_path()
        
        status = {
            "is_first_run": FirstRunManager.is_first_run(),
            "config_exists": Path(config_path).exists(),
            "database_exists": Path(db_path).exists(),
            "company_configured": False,
            "database_initialized": False,
            "setup_completed": False,
            "config_version": "unknown",
            "last_check": datetime.now().isoformat()
        }
        
        # Analizza configurazione se esiste
        if status["config_exists"]:
            try:
                config = configparser.ConfigParser()
                config.read(config_path, encoding='utf-8')
                
                # Controlla versione config
                status["config_version"] = config.get('System', 'ConfigVersion', fallback='1.0')
                
                # Controlla configurazione azienda
                if config.has_section('Azienda'):
                    ragione_sociale = config.get('Azienda', 'RagioneSociale', fallback='').strip()
                    partita_iva = config.get('Azienda', 'PartitaIVA', fallback='').strip()
                    
                    status["company_configured"] = (
                        ragione_sociale and 
                        ragione_sociale != 'La Tua Azienda SRL' and
                        partita_iva and 
                        len(partita_iva) >= 11
                    )
                
            except Exception as e:
                logger.error(f"Error analyzing config: {e}")
        
        # Controlla database
        if status["database_exists"]:
            try:
                # Verifica se database ha tabelle (controllo semplificato)
                db_size = Path(db_path).stat().st_size
                status["database_initialized"] = db_size > 1024  # Almeno 1KB
            except Exception as e:
                logger.error(f"Error checking database: {e}")
        
        # Determina se setup è completato
        status["setup_completed"] = (
            status["config_exists"] and 
            status["company_configured"] and 
            status["database_initialized"] and
            not status["is_first_run"]
        )
        
        return status


@router.get("/check")
async def check_first_run():
    """Controlla se è il primo avvio del sistema"""
    try:
        status = FirstRunManager.get_system_status()
        
        if status["is_first_run"]:
            return APIResponse(
                success=True,
                message="🎯 Primo avvio rilevato - configurazione necessaria",
                data={
                    **status,
                    "next_steps": [
                        "Il sistema non è ancora configurato",
                        "Avvia il wizard di setup guidato",
                        "Configura i dati della tua azienda",
                        "Inizializza il database"
                    ],
                    "wizard_url": "/api/first-run/wizard/start",
                    "setup_url": "/api/setup/status"
                }
            )
        else:
            return APIResponse(
                success=True,
                message="✅ Sistema già configurato",
                data={
                    **status,
                    "ready_for_use": True,
                    "dashboard_url": "/api/docs",
                    "health_check_url": "/health"
                }
            )
        
    except Exception as e:
        logger.error(f"Error checking first run: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error checking system status")


@router.get("/wizard/start")
async def start_setup_wizard():
    """Avvia il wizard di setup guidato"""
    try:
        status = FirstRunManager.get_system_status()
        
        if not status["is_first_run"]:
            return APIResponse(
                success=False,
                message="Sistema già configurato",
                data={
                    "wizard_not_needed": True,
                    "current_status": status
                }
            )
        
        # Determina passo iniziale del wizard
        if not status["config_exists"]:
            current_step = 1
            step_name = "welcome"
        elif not status["company_configured"]:
            current_step = 2
            step_name = "company_data"
        elif not status["database_initialized"]:
            current_step = 3
            step_name = "database_setup"
        else:
            current_step = 4
            step_name = "final_setup"
        
        wizard_steps = [
            {
                "step": 1,
                "name": "welcome",
                "title": "Benvenuto in FatturaAnalyzer v2",
                "description": "Configurazione iniziale del sistema",
                "completed": status["config_exists"]
            },
            {
                "step": 2,
                "name": "company_data",
                "title": "Dati Aziendali",
                "description": "Configura i dati della tua azienda",
                "completed": status["company_configured"]
            },
            {
                "step": 3,
                "name": "database_setup",
                "title": "Inizializzazione Database",
                "description": "Setup del database e strutture dati",
                "completed": status["database_initialized"]
            },
            {
                "step": 4,
                "name": "final_setup",
                "title": "Completamento",
                "description": "Finalizzazione della configurazione",
                "completed": status["setup_completed"]
            }
        ]
        
        return APIResponse(
            success=True,
            message="🚀 Setup wizard avviato",
            data={
                "wizard_active": True,
                "current_step": current_step,
                "current_step_name": step_name,
                "total_steps": len(wizard_steps),
                "steps": wizard_steps,
                "progress_percent": (sum(1 for s in wizard_steps if s["completed"]) / len(wizard_steps)) * 100,
                "system_status": status,
                "next_action": {
                    1: "Procedi con la configurazione iniziale",
                    2: "Inserisci i dati della tua azienda",
                    3: "Inizializza il database",
                    4: "Completa la configurazione"
                }.get(current_step, "Procedi con il prossimo passo")
            }
        )
        
    except Exception as e:
        logger.error(f"Error starting setup wizard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error starting setup wizard")


@router.get("/wizard/status")
async def get_wizard_status():
    """Ottiene stato attuale del wizard"""
    try:
        status = FirstRunManager.get_system_status()
        
        return APIResponse(
            success=True,
            message="Stato wizard recuperato",
            data={
                "wizard_needed": status["is_first_run"],
                "system_status": status,
                "recommendations": [
                    "Usa il wizard guidato per la configurazione iniziale" if status["is_first_run"] 
                    else "Sistema configurato e pronto all'uso",
                    "Consulta la documentazione per configurazioni avanzate",
                    "Verifica le impostazioni di sicurezza dopo il setup"
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting wizard status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error getting wizard status")


@router.post("/wizard/skip")
async def skip_wizard():
    """Salta il wizard (crea configurazione minima)"""
    try:
        status = FirstRunManager.get_system_status()
        
        if not status["is_first_run"]:
            return APIResponse(
                success=False,
                message="Wizard non necessario - sistema già configurato"
            )
        
        # Crea configurazione minima
        config_manager = ConfigManager()
        
        # Dati azienda minimi
        minimal_company_data = {
            'ragione_sociale': 'Azienda Non Configurata',
            'partita_iva': '00000000000',
            'codice_fiscale': '00000000000',
            'indirizzo': '',
            'cap': '',
            'citta': '',
            'provincia': '',
            'paese': 'IT',
            'telefono': '',
            'email': '',
            'codice_destinatario': '',
            'regime_fiscale': 'RF01'
        }
        
        success = config_manager.create_default_config_v2(minimal_company_data)
        
        if success:
            # Inizializza database
            from app.adapters.database_adapter import db_adapter
            await db_adapter.create_tables_async()
            
            return APIResponse(
                success=True,
                message="⚠️ Configurazione minima creata - ATTENZIONE: devi configurare i dati aziendali reali",
                data={
                    "wizard_skipped": True,
                    "config_created": True,
                    "database_initialized": True,
                    "warning": "Dati aziendali fittizi - aggiorna subito tramite /api/setup/",
                    "next_actions": [
                        "Aggiorna i dati aziendali reali",
                        "Configura le impostazioni di sincronizzazione",
                        "Importa i tuoi dati esistenti"
                    ]
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Errore creazione configurazione minima")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error skipping wizard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error skipping wizard")


@router.get("/system/info")
async def get_system_info():
    """Ottiene informazioni dettagliate del sistema"""
    try:
        status = FirstRunManager.get_system_status()
        
        # Informazioni aggiuntive
        system_info = {
            "version": "2.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "platform": os.name,
            "working_directory": os.getcwd(),
            "config_path": str(Path("config.ini").resolve()),
            "database_path": settings.get_database_path()
        }
        
        # Controlli aggiuntivi
        health_checks = {
            "config_readable": False,
            "database_accessible": False,
            "core_modules_available": False,
            "adapters_functional": False
        }
        
        # Test config
        try:
            config = configparser.ConfigParser()
            config.read("config.ini", encoding='utf-8')
            health_checks["config_readable"] = True
        except:
            pass
        
        # Test database
        try:
            db_path = settings.get_database_path()
            health_checks["database_accessible"] = Path(db_path).exists()
        except:
            pass
        
        # Test core modules
        try:
            from app.core import database
            health_checks["core_modules_available"] = True
        except:
            pass
        
        # Test adapters
        try:
            from app.adapters.database_adapter import db_adapter
            health_checks["adapters_functional"] = True
        except:
            pass
        
        return APIResponse(
            success=True,
            message="Informazioni sistema recuperate",
            data={
                "system_status": status,
                "system_info": system_info,
                "health_checks": health_checks,
                "overall_health": all(health_checks.values()) and status["setup_completed"]
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error getting system information")


@router.post("/force-reset")
async def force_reset_first_run():
    """Forza reset dello stato primo avvio (solo per sviluppo)"""
    try:
        if os.getenv("ENVIRONMENT") != "development":
            raise HTTPException(status_code=404, detail="Endpoint disponibile solo in sviluppo")
        
        # Backup config esistente
        config_path = Path("config.ini")
        if config_path.exists():
            backup_path = f"config_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ini"
            config_path.rename(backup_path)
            logger.info(f"Config backed up to {backup_path}")
        
        # Reset stato
        status_after_reset = FirstRunManager.get_system_status()
        
        return APIResponse(
            success=True,
            message="🔄 Reset primo avvio completato (solo sviluppo)",
            data={
                "reset_completed": True,
                "backup_created": config_path.exists(),
                "status_after_reset": status_after_reset,
                "note": "Questo endpoint è disponibile solo in modalità sviluppo"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error forcing reset")


@router.get("/health")
async def first_run_health_check():
    """Health check specifico per il sistema first run"""
    try:
        status = FirstRunManager.get_system_status()
        
        health_status = "healthy" if status["setup_completed"] else "needs_setup"
        
        return APIResponse(
            success=True,
            message=f"First run system health: {health_status}",
            data={
                "health_status": health_status,
                "first_run_required": status["is_first_run"],
                "system_ready": status["setup_completed"],
                "components": {
                    "config": "ok" if status["config_exists"] else "missing",
                    "company_data": "ok" if status["company_configured"] else "incomplete",
                    "database": "ok" if status["database_initialized"] else "not_initialized"
                },
                "recommendations": [
                    "Run setup wizard" if status["is_first_run"] else "System ready for use",
                    "Check configuration" if not status["company_configured"] else "Configuration valid",
                    "Initialize database" if not status["database_initialized"] else "Database ready"
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Error in first run health check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing health check")
