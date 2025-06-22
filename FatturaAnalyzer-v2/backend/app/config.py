"""
Configuration Management - VERSIONE ENTERPRISE CON PYDANTIC
Questo modulo fornisce un sistema di configurazione robusto, validato e immutabile,
utilizzando Pydantic per leggere le impostazioni da un file .env.
È il cuore della configurazione dell'applicazione.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator

# Trova la root del backend in modo affidabile, partendo da questo file
# Questo permette di trovare il file .env in qualsiasi contesto (run, test, etc.)
backend_root = Path(__file__).resolve().parent.parent

class AppSettings(BaseSettings):
    """
    Definisce e valida tutte le impostazioni dell'applicazione.
    Pydantic leggerà automaticamente le variabili da un file .env e dall'ambiente di sistema.
    """
    # Configurazione per Pydantic
    model_config = SettingsConfigDict(
        env_file=str(backend_root / '.env'),
        env_file_encoding='utf-8',
        extra='ignore'  # Ignora variabili d'ambiente extra non definite qui
    )

    # Application Environment
    ENVIRONMENT: str = Field(default="development", description="Application environment: development, production, test")
    DEBUG: bool = Field(default=True, description="Enable debug mode")

    # Server Configuration
    HOST: str = Field(default="127.0.0.1", description="Server host")
    PORT: int = Field(default=8000, description="Server port")

    # Database Configuration
    DATABASE_PATH: str = Field(default="data/database.db", description="Path to the SQLite database file")

    # Company Information (letto da .env per essere facilmente configurabile)
    COMPANY_NAME: str = Field(default="La Tua Azienda Srl", description="Company's legal name")
    COMPANY_VAT: str = Field(default="", description="Company's VAT number (Partita IVA)")
    COMPANY_CF: str = Field(default="", description="Company's fiscal code (Codice Fiscale)")
    
    @validator('COMPANY_VAT')
    def validate_company_vat(cls, v):
        if not v:
            raise ValueError("COMPANY_VAT must be set in the .env file for the application to work correctly.")
        return v

    # API Configuration
    MAX_UPLOAD_SIZE: int = Field(default=100, description="Maximum upload size in MB")
    PAGINATION_SIZE: int = Field(default=50, description="Default pagination size")

    # Security
    LOCAL_API_KEY: str = Field(default="your-secure-api-key-here", description="API key for local/secure access")
    SECRET_KEY: str = Field(default="your-secret-key-for-jwt-tokens", description="Secret key for JWT tokens")
    
    # Google Drive Sync Configuration
    GOOGLE_CREDENTIALS_FILE: str = Field(default="google_credentials.json")
    SYNC_ENABLED: bool = Field(default=False)

    # Logging Configuration
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FILE: str = Field(default="logs/fattura_analyzer_api.log")

    def get_database_path(self) -> str:
        """Restituisce il percorso completo e assoluto del database."""
        db_path_obj = Path(self.DATABASE_PATH)
        if db_path_obj.is_absolute():
            return str(db_path_obj)
        return str(backend_root / self.DATABASE_PATH)

# Istanza singola e immutabile delle impostazioni, caricata una sola volta all'avvio.
# Qualsiasi modulo che importa `settings` avrà accesso a questi valori validati.
try:
    settings = AppSettings()
except Exception as e:
    print(f"FATAL ERROR: Could not initialize settings. Check your .env file. Error: {e}")
    # In un ambiente di produzione, si potrebbe voler uscire
    # sys.exit(1)
    raise e
