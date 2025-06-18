"""
First Run API endpoints - Sistema di rilevamento primo avvio COMPLETO - VERSIONE CORRETTA E COMPLETA
"""

import logging
import os
import configparser
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.models import APIResponse
from app.config import settings
from app.utils.config_auto_update import ConfigManager

logger = logging.getLogger(__name__)
router = APIRouter()


class FirstRunManager:
    """Gestisce il rilevamento e setup del primo avvio - VERSIONE CORRETTA E COMPLETA"""
    
    WIZARD_STATE_FILE = "wizard_state.json"
    
    @staticmethod
    async def check_database_setup_status() -> Dict[str, Any]:
        """Controlla lo stato setup nel database - NUOVO METODO CORRETTO"""
        try:
            from app.adapters.database_adapter import db_adapter
            
            # Controlla se esistono tabelle
            tables_result = await db_adapter.execute_query_async("""
                SELECT COUNT(*) as count FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """)
            
            has_tables = tables_result and tables_result[0]['count'] > 0
            
            if not has_tables:
                return {
                    "database_exists": False,
                    "has_tables": False,
                    "setup_completed": False,
                    "wizard_completed": False
                }
            
            # Controlla se esiste tabella Settings
            settings_table_result = await db_adapter.execute_query_async("""
                SELECT COUNT(*) as count FROM sqlite_master 
                WHERE type='table' AND name='Settings'
            """)
            
            has_settings_table = settings_table_result and settings_table_result[0]['count'] > 0
            
            if not has_settings_table:
                # Crea tabella Settings se non esiste
                await db_adapter.execute_write_async("""
                    CREATE TABLE IF NOT EXISTS Settings (
                        key TEXT PRIMARY KEY,
                        value TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                logger.info("Created Settings table")
            
            # Controlla impostazioni setup
            setup_settings = await db_adapter.execute_query_async("""
                SELECT key, value FROM Settings 
                WHERE key IN ('setup_completed', 'wizard_completed', 'database_initialized', 'first_run_completed')
            """)
            
            settings_dict = {row['key']: row['value'] for row in setup_settings} if setup_settings else {}
            
            setup_completed = settings_dict.get('setup_completed', 'false').lower() == 'true'
            wizard_completed = settings_dict.get('wizard_completed', 'false').lower() == 'true'
            database_initialized = settings_dict.get('database_initialized', 'false').lower() == 'true'
            first_run_completed = settings_dict.get('first_run_completed', 'false').lower() == 'true'
            
            return {
                "database_exists": True,
                "has_tables": has_tables,
                "has_settings_table": has_settings_table,
                "setup_completed": setup_completed,
                "wizard_completed": wizard_completed,
                "database_initialized": database_initialized,
                "first_run_completed": first_run_completed,
                "settings_found": settings_dict
            }
            
        except Exception as e:
            logger.error(f"Error checking database setup status: {e}")
            return {
                "database_exists": False,
                "has_tables": False,
                "setup_completed": False,
                "wizard_completed": False,
                "error": str(e)
            }
    
    @staticmethod
    async def is_first_run() -> bool:
        """Determina se è il primo avvio del sistema - VERSIONE CORRETTA"""
        
        # 1. Prima controlla il database (priorità alta) - NUOVO
        db_status = await FirstRunManager.check_database_setup_status()
        
        # Se il database dice che il setup è completato, non è primo avvio
        if db_status.get("setup_completed") and db_status.get("wizard_completed"):
            logger.info("✅ Database indicates setup is completed - not first run")
            return False
        
        # 2. Controlla se esiste config.ini con dati validi (logica originale)
        config_path = "config.ini"
        if not Path(config_path).exists():
            logger.info("❌ config.ini not found - first run required")
            return True
        
        try:
            config = configparser.ConfigParser()
            config.read(config_path, encoding='utf-8')
            
            # Verifica sezioni essenziali
            if not config.has_section('Azienda'):
                logger.info("❌ Azienda section missing in config.ini - first run required")
                return True
            
            # Verifica dati azienda essenziali
            ragione_sociale = config.get('Azienda', 'RagioneSociale', fallback='').strip()
            partita_iva = config.get('Azienda', 'PartitaIVA', fallback='').strip()
            
            if not ragione_sociale or ragione_sociale == 'La Tua Azienda SRL':
                logger.info("❌ Company name not configured - first run required")
                return True
            
            if not partita_iva or len(partita_iva) < 11:
                logger.info("❌ VAT number not configured - first run required")
                return True
            
            # 3. Verifica se database esiste e ha dati (controllo finale)
            db_path = settings.get_database_path()
            if not Path(db_path).exists():
                logger.info("❌ Database file not found - first run required")
                return True
            
            # Se tutto sembra configurato E il database non dice diversamente, non è primo avvio
            logger.info("✅ All checks passed - not first run")
            return False
            
        except Exception as e:
            logger.warning(f"Error checking first run status: {e}")
            return True
    
    @staticmethod
    def is_first_run_sync() -> bool:
        """Versione sincrona per compatibilità - MANTIENE LOGICA ORIGINALE"""
        
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
    async def get_system_status() -> Dict[str, Any]:
        """Ottiene stato completo del sistema - VERSIONE MIGLIORATA"""
        
        config_path = "config.ini"
        db_path = settings.get_database_path()
        
        # Controlla stato database - NUOVO
        db_status = await FirstRunManager.check_database_setup_status()
        
        # Stato base
        is_first_run = await FirstRunManager.is_first_run()
        
        status = {
            "is_first_run": is_first_run,
            "config_exists": Path(config_path).exists(),
            "database_exists": Path(db_path).exists(),
            "company_configured": False,
            "database_initialized": db_status.get("database_initialized", False),
            "setup_completed": db_status.get("setup_completed", False),
            "wizard_completed": db_status.get("wizard_completed", False),
            "config_version": "unknown",
            "last_check": datetime.now().isoformat(),
            "database_status": db_status  # NUOVO
        }
        
        # Analizza configurazione se esiste (logica originale)
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
        
        # Controlla database fisico (logica originale)
        if status["database_exists"]:
            try:
                # Verifica se database ha tabelle (controllo semplificato)
                db_size = Path(db_path).stat().st_size
                status["database_file_initialized"] = db_size > 1024  # Almeno 1KB
            except Exception as e:
                logger.error(f"Error checking database file: {e}")
                status["database_file_initialized"] = False
        else:
            status["database_file_initialized"] = False
        
        # Determina se setup è completato (logica corretta)
        status["setup_completed"] = (
            not status["is_first_run"] and
            status["config_exists"] and 
            status["company_configured"] and 
            status["database_initialized"] and
            status["wizard_completed"]
        )
        
        return status
    
    @staticmethod
    async def mark_setup_completed() -> bool:
        """Marca il setup come completato nel database - NUOVO METODO"""
        try:
            from app.adapters.database_adapter import db_adapter
            
            # Assicurati che la tabella Settings esista
            await db_adapter.execute_write_async("""
                CREATE TABLE IF NOT EXISTS Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Marca tutte le impostazioni come completate
            settings_to_set = [
                ('setup_completed', 'true'),
                ('wizard_completed', 'true'),
                ('database_initialized', 'true'),
                ('first_run_completed', 'true'),
                ('company_configured', 'true'),
                ('setup_timestamp', datetime.now().isoformat())
            ]
            
            for key, value in settings_to_set:
                await db_adapter.execute_write_async("""
                    INSERT OR REPLACE INTO Settings (key, value, updated_at) 
                    VALUES (?, ?, datetime('now'))
                """, (key, value))
                logger.info(f"✅ Set {key} = {value}")
            
            logger.info("✅ Setup marked as completed in database")
            return True
            
        except Exception as e:
            logger.error(f"Error marking setup as completed: {e}")
            return False
    
    @staticmethod
    async def save_wizard_state(state: Dict[str, Any]) -> bool:
        """Salva stato wizard su file"""
        try:
            with open(FirstRunManager.WIZARD_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, default=str)
            return True
        except Exception as e:
            logger.error(f"Error saving wizard state: {e}")
            return False
    
    @staticmethod
    def load_wizard_state() -> Dict[str, Any]:
        """Carica stato wizard da file"""
        try:
            if Path(FirstRunManager.WIZARD_STATE_FILE).exists():
                with open(FirstRunManager.WIZARD_STATE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading wizard state: {e}")
        
        # Ritorna stato default
        return {
            "wizard_started": False,
            "current_step": 1,
            "steps_completed": [],
            "last_update": datetime.now().isoformat()
        }


@router.get("/check")
async def check_first_run():
    """Controlla se è il primo avvio del sistema"""
    try:
        status = await FirstRunManager.get_system_status()
        
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
        status = await FirstRunManager.get_system_status()
        
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
        
        # Salva stato wizard
        wizard_state = {
            "wizard_started": True,
            "current_step": current_step,
            "steps": wizard_steps,
            "system_status": status,
            "last_update": datetime.now().isoformat()
        }
        await FirstRunManager.save_wizard_state(wizard_state)
        
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


@router.post("/wizard/database-setup")
async def setup_database_step():
    """Step 3: Inizializza database e crea tabelle"""
    try:
        logger.info("🗄️ Starting database setup...")
        
        # Verifica stato sistema
        status = await FirstRunManager.get_system_status()
        
        if status["database_initialized"]:
            return APIResponse(
                success=True,
                message="Database già inizializzato",
                data={
                    "database_exists": True,
                    "already_initialized": True,
                    "next_step": "final_setup"
                }
            )
        
        # Crea directory per database se non esiste
        db_path = settings.get_database_path()
        db_dir = Path(db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📁 Database directory created: {db_dir}")
        
        # Inizializza database tramite adapter
        from app.adapters.database_adapter import db_adapter
        
        logger.info("🔧 Creating database tables...")
        await db_adapter.create_tables_async()
        
        # Assicurati che la tabella Settings esista e marca database come inizializzato
        await db_adapter.execute_write_async("""
            CREATE TABLE IF NOT EXISTS Settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db_adapter.execute_write_async("""
            INSERT OR REPLACE INTO Settings (key, value, updated_at) 
            VALUES ('database_initialized', 'true', datetime('now'))
        """)
        
        # Test connessione database
        logger.info("🧪 Testing database connection...")
        test_result = await db_adapter.execute_query_async("SELECT 1 as test")
        if not test_result or test_result[0]['test'] != 1:
            raise Exception("Database connection test failed")
        
        logger.info("✅ Database connection test successful")
        
        # Verifica dimensione database
        db_size = Path(db_path).stat().st_size if Path(db_path).exists() else 0
        logger.info(f"📊 Database size: {db_size} bytes")
        
        # Aggiorna stato wizard
        wizard_state = FirstRunManager.load_wizard_state()
        wizard_state["current_step"] = 4
        wizard_state["steps_completed"] = wizard_state.get("steps_completed", []) + [3]
        wizard_state["database_initialized"] = True
        wizard_state["last_update"] = datetime.now().isoformat()
        
        await FirstRunManager.save_wizard_state(wizard_state)
        
        # Aggiorna app state per rimuovere middleware first-run
        try:
            from app.main import app
            if hasattr(app, 'state'):
                updated_status = await FirstRunManager.get_system_status()
                if updated_status["setup_completed"]:
                    app.state.first_run_required = False
                    logger.info("🎯 Updated app state: first_run_required = False")
        except Exception as e:
            logger.warning(f"Could not update app state: {e}")
        
        return APIResponse(
            success=True,
            message="✅ Database inizializzato con successo",
            data={
                "database_created": True,
                "tables_created": True,
                "database_path": db_path,
                "database_size_bytes": db_size,
                "connection_tested": True,
                "current_step": 4,
                "next_step": "final_setup",
                "next_action": "Completa la configurazione",
                "endpoints": {
                    "complete_setup": "/api/first-run/wizard/complete",
                    "wizard_status": "/api/first-run/wizard/status"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"❌ Errore inizializzazione database: {str(e)}",
            data={
                "error": str(e),
                "error_type": type(e).__name__,
                "troubleshooting": [
                    "Verifica che la directory del database sia scrivibile",
                    "Controlla che non ci siano altri processi che usano il database",
                    "Verifica la configurazione del percorso database in config.ini"
                ]
            }
        )


@router.post("/wizard/complete")
async def complete_setup_wizard():
    """Step 4: Completa setup e finalizza configurazione"""
    try:
        logger.info("🏁 Completing setup wizard...")
        
        # Verifica stato finale
        status = await FirstRunManager.get_system_status()
        
        if not status["database_initialized"]:
            raise HTTPException(
                status_code=400, 
                detail="Database non inizializzato. Completa prima lo step 3."
            )
        
        if not status["company_configured"]:
            logger.warning("⚠️ Company data not fully configured, but proceeding...")
        
        # Marca setup come completato nel database - NUOVO
        success = await FirstRunManager.mark_setup_completed()
        if not success:
            raise HTTPException(status_code=500, detail="Errore marcatura setup completato")
        
        # Aggiorna configurazione per marcare setup completato
        config_path = "config.ini"
        if Path(config_path).exists():
            config = configparser.ConfigParser()
            config.read(config_path, encoding='utf-8')
            
            # Aggiungi sezione System se non esiste
            if not config.has_section('System'):
                config.add_section('System')
            
            config.set('System', 'SetupCompleted', 'true')
            config.set('System', 'SetupCompletedAt', datetime.now().isoformat())
            config.set('System', 'LastUpdated', datetime.now().isoformat())
            
            # Salva config aggiornata
            with open(config_path, 'w', encoding='utf-8') as f:
                config.write(f)
            
            logger.info("📝 Config.ini updated with setup completion")
        
        # Aggiorna stato wizard finale
        wizard_state = FirstRunManager.load_wizard_state()
        wizard_state["current_step"] = 4
        wizard_state["steps_completed"] = [1, 2, 3, 4]
        wizard_state["setup_completed"] = True
        wizard_state["completed_at"] = datetime.now().isoformat()
        wizard_state["last_update"] = datetime.now().isoformat()
        
        await FirstRunManager.save_wizard_state(wizard_state)
        
        # Aggiorna app state definitivamente
        try:
            from app.main import app
            if hasattr(app, 'state'):
                app.state.first_run_required = False
                app.state.setup_wizard_enabled = False
                app.state.company_configured = status["company_configured"]
                logger.info("🎯 App state updated: setup completed")
        except Exception as e:
            logger.warning(f"Could not update app state: {e}")
        
        # Verifica stato finale
        final_status = await FirstRunManager.get_system_status()
        
        return APIResponse(
            success=True,
            message="🎉 Setup completato con successo!",
            data={
                "setup_completed": True,
                "wizard_completed": True,
                "system_ready": True,
                "final_status": final_status,
                "next_steps": [
                    "Importa le tue fatture tramite /api/import/",
                    "Configura la sincronizzazione cloud se necessaria",
                    "Esplora il dashboard API su /api/docs",
                    "Verifica lo stato sistema su /health"
                ],
                "important_urls": {
                    "api_docs": "/api/docs",
                    "health_check": "/health",
                    "import_data": "/api/import/",
                    "analytics": "/api/analytics/",
                    "invoices": "/api/invoices/"
                },
                "completion_time": datetime.now().isoformat(),
                "version": "2.0.0"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Setup completion failed: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"❌ Errore completamento setup: {str(e)}",
            data={
                "error": str(e),
                "error_type": type(e).__name__,
                "recovery_steps": [
                    "Verifica che tutti i passi precedenti siano completati",
                    "Controlla i log per errori specifici",
                    "Riavvia il setup wizard se necessario"
                ]
            }
        )


@router.get("/wizard/status")
async def get_wizard_status():
    """Ottiene stato attuale del wizard"""
    try:
        status = await FirstRunManager.get_system_status()
        wizard_state = FirstRunManager.load_wizard_state()
        
        return APIResponse(
            success=True,
            message="Stato wizard recuperato",
            data={
                "wizard_needed": status["is_first_run"],
                "wizard_state": wizard_state,
                "system_status": status,
                "current_step": wizard_state.get("current_step", 1),
                "steps_completed": wizard_state.get("steps_completed", []),
                "progress_percent": (len(wizard_state.get("steps_completed", [])) / 4) * 100,
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
        status = await FirstRunManager.get_system_status()
        
        if not status["is_first_run"]:
            return APIResponse(
                success=False,
                message="Wizard non necessario - sistema già configurato"
            )
        
        logger.info("⏭️ Skipping wizard, creating minimal configuration...")
        
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
            
            # Test database
            test_result = await db_adapter.execute_query_async("SELECT 1 as test")
            db_working = test_result and test_result[0]['test'] == 1
            
            # Marca setup come saltato
            wizard_state = {
                "wizard_skipped": True,
                "setup_completed": True,
                "config_minimal": True,
                "skipped_at": datetime.now().isoformat()
            }
            await FirstRunManager.save_wizard_state(wizard_state)
            
            # Aggiorna app state
            try:
                from app.main import app
                if hasattr(app, 'state'):
                    app.state.first_run_required = False
                    app.state.setup_wizard_enabled = False
                    app.state.company_configured = False  # Perché è configurazione minimale
            except Exception as e:
                logger.warning(f"Could not update app state: {e}")
            
            return APIResponse(
                success=True,
                message="⚠️ Configurazione minima creata - ATTENZIONE: devi configurare i dati aziendali reali",
                data={
                    "wizard_skipped": True,
                    "config_created": True,
                    "database_initialized": db_working,
                    "warning": "Dati aziendali fittizi - aggiorna subito tramite /api/setup/",
                    "next_actions": [
                        "Aggiorna i dati aziendali reali tramite /api/setup/company",
                        "Configura le impostazioni di sincronizzazione",
                        "Importa i tuoi dati esistenti"
                    ],
                    "urgent_configuration_needed": {
                        "company_data": "/api/setup/company",
                        "full_setup": "/api/setup/"
                    }
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
        status = await FirstRunManager.get_system_status()
        wizard_state = FirstRunManager.load_wizard_state()
        
        # Informazioni aggiuntive
        system_info = {
            "version": "2.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
            "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "platform": os.name,
            "working_directory": os.getcwd(),
            "config_path": str(Path("config.ini").resolve()),
            "database_path": settings.get_database_path(),
            "wizard_state_file": str(Path(FirstRunManager.WIZARD_STATE_FILE).resolve())
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
                "wizard_state": wizard_state,
                "system_info": system_info,
                "health_checks": health_checks,
                "overall_health": all(health_checks.values()) and status["setup_completed"],
                "disk_usage": {
                    "config_size": Path("config.ini").stat().st_size if Path("config.ini").exists() else 0,
                    "database_size": Path(settings.get_database_path()).stat().st_size if Path(settings.get_database_path()).exists() else 0,
                    "wizard_state_size": Path(FirstRunManager.WIZARD_STATE_FILE).stat().st_size if Path(FirstRunManager.WIZARD_STATE_FILE).exists() else 0
                }
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
        
        logger.info("🔄 Forcing first run reset (development only)...")
        
        # Backup config esistente
        config_path = Path("config.ini")
        backup_created = False
        if config_path.exists():
            backup_path = f"config_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ini"
            config_path.rename(backup_path)
            backup_created = True
            logger.info(f"Config backed up to {backup_path}")
        
        # Reset wizard state
        wizard_state_path = Path(FirstRunManager.WIZARD_STATE_FILE)
        if wizard_state_path.exists():
            wizard_backup_path = f"wizard_state_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            wizard_state_path.rename(wizard_backup_path)
            logger.info(f"Wizard state backed up to {wizard_backup_path}")
        
        # Reset database settings - NUOVO
        try:
            from app.adapters.database_adapter import db_adapter
            
            # Rimuovi tutte le impostazioni di setup dal database
            reset_keys = [
                'setup_completed', 'wizard_completed', 'database_initialized', 
                'first_run_completed', 'company_configured', 'setup_timestamp'
            ]
            
            for key in reset_keys:
                await db_adapter.execute_write_async("""
                    DELETE FROM Settings WHERE key = ?
                """, (key,))
                logger.info(f"Removed database setting: {key}")
            
        except Exception as e:
            logger.warning(f"Could not reset database settings: {e}")
        
        # Reset app state
        try:
            from app.main import app
            if hasattr(app, 'state'):
                app.state.first_run_required = True
                app.state.setup_wizard_enabled = True
                app.state.company_configured = False
                logger.info("App state reset for first run")
        except Exception as e:
            logger.warning(f"Could not reset app state: {e}")
        
        # Verifica stato dopo reset
        status_after_reset = await FirstRunManager.get_system_status()
        
        return APIResponse(
            success=True,
            message="🔄 Reset primo avvio completato (solo sviluppo)",
            data={
                "reset_completed": True,
                "config_backup_created": backup_created,
                "wizard_state_reset": True,
                "database_settings_reset": True,
                "app_state_reset": True,
                "status_after_reset": status_after_reset,
                "note": "Questo endpoint è disponibile solo in modalità sviluppo",
                "next_steps": [
                    "Il sistema è ora in stato di primo avvio",
                    "Riavvia il wizard con /api/first-run/wizard/start",
                    "Oppure usa la configurazione automatica"
                ]
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
        status = await FirstRunManager.get_system_status()
        wizard_state = FirstRunManager.load_wizard_state()
        
        health_status = "healthy" if status["setup_completed"] else "needs_setup"
        
        return APIResponse(
            success=True,
            message=f"First run system health: {health_status}",
            data={
                "health_status": health_status,
                "first_run_required": status["is_first_run"],
                "system_ready": status["setup_completed"],
                "wizard_progress": len(wizard_state.get("steps_completed", [])),
                "components": {
                    "config": "ok" if status["config_exists"] else "missing",
                    "company_data": "ok" if status["company_configured"] else "incomplete",
                    "database": "ok" if status["database_initialized"] else "not_initialized"
                },
                "recommendations": [
                    "Run setup wizard" if status["is_first_run"] else "System ready for use",
                    "Check configuration" if not status["company_configured"] else "Configuration valid",
                    "Initialize database" if not status["database_initialized"] else "Database ready"
                ],
                "available_actions": {
                    "start_wizard": "/api/first-run/wizard/start",
                    "database_setup": "/api/first-run/wizard/database-setup",
                    "complete_setup": "/api/first-run/wizard/complete",
                    "skip_wizard": "/api/first-run/wizard/skip",
                    "system_info": "/api/first-run/system/info"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error in first run health check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing health check")


@router.post("/wizard/test-database")
async def test_database_connection():
    """Testa la connessione al database (utility per debugging)"""
    try:
        logger.info("🧪 Testing database connection...")
        
        from app.adapters.database_adapter import db_adapter
        
        # Test di base
        test_result = await db_adapter.execute_query_async("SELECT 1 as test")
        
        if not test_result:
            raise Exception("No result from test query")
        
        if test_result[0]['test'] != 1:
            raise Exception("Unexpected result from test query")
        
        # Test più avanzato - controlla se esistono tabelle
        tables_query = """
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """
        
        tables_result = await db_adapter.execute_query_async(tables_query)
        table_names = [row['name'] for row in tables_result] if tables_result else []
        
        # Test Settings table
        settings_test = None
        try:
            settings_result = await db_adapter.execute_query_async("SELECT key, value FROM Settings LIMIT 5")
            settings_test = "accessible"
            settings_count = len(settings_result) if settings_result else 0
        except Exception as e:
            settings_test = f"error: {str(e)}"
            settings_count = 0
        
        # Informazioni database
        db_path = settings.get_database_path()
        db_exists = Path(db_path).exists()
        db_size = Path(db_path).stat().st_size if db_exists else 0
        
        return APIResponse(
            success=True,
            message="✅ Database connection test successful",
            data={
                "connection_working": True,
                "test_query_result": test_result[0] if test_result else None,
                "database_path": db_path,
                "database_exists": db_exists,
                "database_size_bytes": db_size,
                "tables_found": len(table_names),
                "table_names": table_names,
                "database_initialized": len(table_names) > 0,
                "settings_table": settings_test,
                "settings_count": settings_count,
                "test_timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Database test failed: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"❌ Database connection test failed: {str(e)}",
            data={
                "connection_working": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "database_path": settings.get_database_path(),
                "troubleshooting": [
                    "Verify database file permissions",
                    "Check if database file is corrupted",
                    "Ensure database directory exists and is writable",
                    "Try recreating database with /api/first-run/wizard/database-setup"
                ]
            }
        )


@router.post("/wizard/generate-sample-data")
async def generate_sample_data():
    """Genera dati di esempio per test (opzionale dopo setup database)"""
    try:
        logger.info("📊 Generating sample data...")
        
        # Verifica che database sia inizializzato
        status = await FirstRunManager.get_system_status()
        if not status["database_initialized"]:
            raise HTTPException(
                status_code=400,
                detail="Database non inizializzato. Completa prima il setup database."
            )
        
        # Importa e esegui script generazione dati campione
        try:
            # Esegui script di generazione in modo asincrono
            import asyncio
            import subprocess
            import sys
            
            # Path dello script
            script_path = Path(__file__).parent.parent.parent / "scripts" / "generate_sample_data.py"
            
            if not script_path.exists():
                raise FileNotFoundError(f"Script generate_sample_data.py not found at {script_path}")
            
            # Esegui script in subprocess
            process = await asyncio.create_subprocess_exec(
                sys.executable, str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info("✅ Sample data generation completed")
                return APIResponse(
                    success=True,
                    message="✅ Dati di esempio generati con successo",
                    data={
                        "sample_data_generated": True,
                        "script_output": stdout.decode('utf-8') if stdout else "",
                        "generation_time": datetime.now().isoformat(),
                        "next_steps": [
                            "Esplora i dati generati tramite /api/invoices/",
                            "Visualizza le anagrafiche su /api/anagraphics/",
                            "Controlla le transazioni su /api/transactions/"
                        ]
                    }
                )
            else:
                error_output = stderr.decode('utf-8') if stderr else "Unknown error"
                logger.error(f"Sample data generation failed: {error_output}")
                raise Exception(f"Script failed with return code {process.returncode}: {error_output}")
                
        except FileNotFoundError as e:
            logger.warning(f"Sample data script not found: {e}")
            return APIResponse(
                success=False,
                message="Script generazione dati non trovato",
                data={
                    "sample_data_generated": False,
                    "error": "Script not available in current installation",
                    "alternative": "Importa i tuoi dati reali tramite /api/import/"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating sample data: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message=f"❌ Errore generazione dati di esempio: {str(e)}",
            data={
                "sample_data_generated": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
        )


@router.get("/wizard/steps")
async def get_wizard_steps():
    """Ottiene lista dettagliata degli step del wizard"""
    try:
        status = await FirstRunManager.get_system_status()
        wizard_state = FirstRunManager.load_wizard_state()
        
        steps = [
            {
                "step": 1,
                "name": "welcome",
                "title": "Benvenuto",
                "description": "Introduzione al sistema e verifica prerequisiti",
                "completed": status["config_exists"],
                "required": True,
                "estimated_time": "2 minuti",
                "actions": ["Verifica sistema", "Controllo dipendenze"],
                "endpoint": "/api/first-run/wizard/start"
            },
            {
                "step": 2,
                "name": "company_data",
                "title": "Configurazione Azienda",
                "description": "Inserimento dati aziendali per fatturazione",
                "completed": status["company_configured"],
                "required": True,
                "estimated_time": "5 minuti",
                "actions": ["Inserisci Partita IVA", "Compila dati fiscali", "Verifica configurazione"],
                "endpoint": "/api/setup/company"
            },
            {
                "step": 3,
                "name": "database_setup",
                "title": "Inizializzazione Database",
                "description": "Creazione database e strutture dati",
                "completed": status["database_initialized"],
                "required": True,
                "estimated_time": "3 minuti",
                "actions": ["Crea database", "Inizializza tabelle", "Test connessione"],
                "endpoint": "/api/first-run/wizard/database-setup"
            },
            {
                "step": 4,
                "name": "final_setup",
                "title": "Finalizzazione",
                "description": "Completamento configurazione e test finale",
                "completed": status["setup_completed"],
                "required": True,
                "estimated_time": "2 minuti",
                "actions": ["Verifica configurazione", "Test sistema", "Attivazione"],
                "endpoint": "/api/first-run/wizard/complete"
            }
        ]
        
        # Step opzionali
        optional_steps = [
            {
                "step": 5,
                "name": "sample_data",
                "title": "Dati di Esempio",
                "description": "Generazione dati di test per esplorare le funzionalità",
                "completed": False,
                "required": False,
                "estimated_time": "1 minuto",
                "actions": ["Genera fatture esempio", "Crea anagrafiche test", "Simula transazioni"],
                "endpoint": "/api/first-run/wizard/generate-sample-data"
            },
            {
                "step": 6,
                "name": "cloud_sync",
                "title": "Sincronizzazione Cloud",
                "description": "Configurazione backup automatico su Google Drive",
                "completed": False,
                "required": False,
                "estimated_time": "10 minuti",
                "actions": ["Configura credenziali", "Test connessione", "Primo backup"],
                "endpoint": "/api/sync/setup"
            }
        ]
        
        current_step = wizard_state.get("current_step", 1)
        completed_steps = wizard_state.get("steps_completed", [])
        
        return APIResponse(
            success=True,
            message="Step wizard recuperati",
            data={
                "required_steps": steps,
                "optional_steps": optional_steps,
                "current_step": current_step,
                "completed_steps": completed_steps,
                "total_required_steps": len(steps),
                "total_optional_steps": len(optional_steps),
                "progress": {
                    "required_completed": sum(1 for s in steps if s["completed"]),
                    "required_remaining": sum(1 for s in steps if not s["completed"]),
                    "overall_progress_percent": (sum(1 for s in steps if s["completed"]) / len(steps)) * 100,
                    "estimated_time_remaining": sum(2 if s["estimated_time"] == "2 minuti" else 5 if s["estimated_time"] == "5 minuti" else 3 for s in steps if not s["completed"])
                },
                "next_recommended_action": next(
                    (s["endpoint"] for s in steps if not s["completed"]), 
                    "Sistema configurato completamente"
                )
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting wizard steps: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error getting wizard steps")


# Export del router
__all__ = ["router", "FirstRunManager"]
