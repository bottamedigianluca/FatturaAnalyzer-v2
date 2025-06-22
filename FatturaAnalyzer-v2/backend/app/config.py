"""
Configuration management per FastAPI - VERSIONE ENTERPRISE ROBUSTA
Legge sia da .env (con priorità) che da config.ini, garantendo che tutte
le impostazioni siano disponibili e prevenendo AttributeError.
"""
import os
import configparser
from pathlib import Path
from dotenv import load_dotenv

# Carica le variabili d'ambiente dal file .env nella root del backend
# Questo assicura che os.getenv() funzioni come previsto.
backend_root = Path(__file__).resolve().parent.parent
dotenv_path = backend_root / '.env'
load_dotenv(dotenv_path=dotenv_path)

class Settings:
    """Configurazioni unificate per l'applicazione FastAPI."""
    
    def __init__(self):
        # 1. Carica da .env (ha la priorità per lo sviluppo)
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
        self.HOST: str = os.getenv("HOST", "127.0.0.1")
        self.PORT: int = int(os.getenv("PORT", 8000))
        self.DATABASE_PATH: str = os.getenv("DATABASE_PATH", "data/database.db")
        
        # 2. Carica da config.ini per compatibilità e valori di base
        self._load_from_ini()

        # 3. Imposta altre configurazioni da .env, con fallback
        self.MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", 100))
        self.PAGINATION_SIZE: int = int(os.getenv("PAGINATION_SIZE", 50))
        self.SYNC_ENABLED: bool = os.getenv("SYNC_ENABLED", "false").lower() in ("true", "1", "yes")
        self.GOOGLE_CREDENTIALS_FILE: str = os.getenv("GOOGLE_CREDENTIALS_FILE", "google_credentials.json")
        
        # Valori che potrebbero non essere in .env e presi solo da config.ini
        # Se non sono stati caricati da _load_from_ini(), imposta un default sicuro.
        if not hasattr(self, 'COMPANY_NAME'):
            self.COMPANY_NAME: str = "Azienda non configurata"
        if not hasattr(self, 'COMPANY_VAT'):
            self.COMPANY_VAT: str = ""
        if not hasattr(self, 'COMPANY_CF'):
            self.COMPANY_CF: str = ""

    def _load_from_ini(self):
        """Carica la configurazione da config.ini, ma non sovrascrive i valori già presi da .env"""
        config = configparser.ConfigParser()
        config_path = backend_root / 'config.ini'

        if not config_path.exists():
            logger.warning(f"File config.ini non trovato in {config_path}. L'app si baserà solo su .env e valori di default.")
            return

        try:
            config.read(config_path, encoding='utf-8')
            logger.info(f"📄 Loaded config.ini from: {config_path}")

            # Carica solo se non già impostato da .env
            if self.DATABASE_PATH == "data/database.db": # Default value from .env
                self.DATABASE_PATH = config.get('Paths', 'DatabaseFile', fallback=self.DATABASE_PATH)

            self.COMPANY_NAME = config.get('Azienda', 'RagioneSociale', fallback='Azienda Demo')
            self.COMPANY_VAT = config.get('Azienda', 'PartitaIVA', fallback='')
            self.COMPANY_CF = config.get('Azienda', 'CodiceFiscale', fallback='')
            
        except Exception as e:
            logger.error(f"⚠️ Error reading config.ini from {config_path}: {e}")

    def get_database_path(self) -> str:
        """Restituisce il percorso completo e assoluto del database."""
        db_path_obj = Path(self.DATABASE_PATH)
        if db_path_obj.is_absolute():
            return str(db_path_obj)
        # Se il percorso è relativo, lo consideriamo relativo alla root del backend
        return str(backend_root / self.DATABASE_PATH)

# Istanza singola delle impostazioni, importata da tutto il resto dell'applicazione
settings = Settings()

# Setup del logger dopo che la configurazione è stata caricata
import logging
logger = logging.getLogger(__name__)
