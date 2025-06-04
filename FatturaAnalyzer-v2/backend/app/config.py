"""
Configuration management per FastAPI che usa il core esistente
"""

import os
import configparser
from pathlib import Path
from typing import Optional

class Settings:
    """Configurazioni FastAPI che integrano con il core esistente"""
    
    def __init__(self):
        self.load_config()
    
    def load_config(self):
        """Carica configurazione dal core esistente"""
        
        # Settings FastAPI
        self.DEBUG = os.getenv("DEBUG", "false").lower() == "true"
        self.HOST = os.getenv("HOST", "127.0.0.1")
        self.PORT = int(os.getenv("PORT", "8000"))
        
        # Usa la configurazione del core esistente
        self._load_from_core_config()
        
        # API settings
        self.MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", "100"))  # MB
        self.PAGINATION_SIZE = int(os.getenv("PAGINATION_SIZE", "50"))
    
    def _load_from_core_config(self):
        """Carica configurazione dal config.ini del core esistente"""
        
        # Trova il percorso del config.ini del core
        config_paths = [
            "config.ini",
            "../config.ini", 
            "../../config.ini",
            os.path.expanduser("~/.fattura_analyzer/config.ini")
        ]
        
        config = configparser.ConfigParser()
        config_found = False
        
        for config_path in config_paths:
            if os.path.exists(config_path):
                try:
                    config.read(config_path, encoding='utf-8')
                    print(f"📄 Loaded config from: {config_path}")
                    config_found = True
                    break
                except Exception as e:
                    print(f"⚠️ Error reading config from {config_path}: {e}")
                    continue
        
        if not config_found:
            print("⚠️ No config.ini found, using defaults")
        
        # Database settings (dal core)
        if config.has_section('Paths'):
            self.DATABASE_PATH = config.get('Paths', 'DatabaseFile', fallback='database.db')
        else:
            self.DATABASE_PATH = 'database.db'
        
        # Company settings (dal core)
        if config.has_section('Azienda'):
            self.COMPANY_NAME = config.get('Azienda', 'RagioneSociale', fallback='')
            self.COMPANY_VAT = config.get('Azienda', 'PartitaIVA', fallback='')
            self.COMPANY_CF = config.get('Azienda', 'CodiceFiscale', fallback='')
        else:
            self.COMPANY_NAME = ''
            self.COMPANY_VAT = ''
            self.COMPANY_CF = ''
        
        # Cloud sync settings (dal core)
        if config.has_section('CloudSync'):
            self.SYNC_ENABLED = config.getboolean('CloudSync', 'enabled', fallback=False)
            self.GOOGLE_CREDENTIALS_FILE = config.get('CloudSync', 'credentials_file', fallback='google_credentials.json')
        else:
            self.SYNC_ENABLED = False
            self.GOOGLE_CREDENTIALS_FILE = 'google_credentials.json'
    
    @property
    def company_data(self) -> dict:
        """Dati azienda per il processing delle fatture (compatibile con core)"""
        return {
            'name': self.COMPANY_NAME,
            'piva': self.COMPANY_VAT, 
            'cf': self.COMPANY_CF
        }
    
    def get_database_path(self) -> str:
        """Percorso database (usa la logica del core)"""
        if os.path.isabs(self.DATABASE_PATH):
            return self.DATABASE_PATH
        else:
            # Relativo al progetto root
            project_root = Path(__file__).parent.parent.parent
            return str(project_root / self.DATABASE_PATH)

# Istanza settings globale
settings = Settings()

# Configurazioni per diversi ambienti
class DevelopmentConfig(Settings):
    """Configurazione sviluppo"""
    def __init__(self):
        super().__init__()
        self.DEBUG = True
        self.HOST = "127.0.0.1"
        self.PORT = 8000

class ProductionConfig(Settings):
    """Configurazione produzione"""
    def __init__(self):
        super().__init__()
        self.DEBUG = False
        self.HOST = "127.0.0.1"
        self.PORT = 8000

class TestConfig(Settings):
    """Configurazione test"""
    def __init__(self):
        super().__init__()
        self.DEBUG = True
        self.DATABASE_PATH = ":memory:"  # In-memory per test

def get_config(env: str = None) -> Settings:
    """Ottiene configurazione basata su ambiente"""
    env = env or os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        return ProductionConfig()
    elif env == "test":
        return TestConfig()
    else:
        return DevelopmentConfig()

# Export
__all__ = ["settings", "get_config"]