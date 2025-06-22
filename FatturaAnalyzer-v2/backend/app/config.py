"""
Configuration Management - VERSIONE ENTERPRISE CON PYDANTIC
Questo modulo fornisce un sistema di configurazione robusto, validato e immutabile,
utilizzando Pydantic per leggere le impostazioni da un file .env.
È il cuore della configurazione dell'applicazione.
"""
import os
import configparser
import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator

# Definisci il logger PRIMA di usarlo. Questo risolve il NameError.
logger = logging.getLogger(__name__)

# Trova la root del backend in modo affidabile, partendo da questo file
backend_root = Path(__file__).resolve().parent.parent

class AppSettings(BaseSettings):
    """
    Definisce e valida tutte le impostazioni dell'applicazione.
    Pydantic leggerà automaticamente le variabili da un file .env e dall'ambiente di sistema.
    """
    model_config = SettingsConfigDict(
        env_file=str(backend_root / '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

    ENVIRONMENT: str = Field(default="development", description="Application environment: development, production, test")
    DEBUG: bool = Field(default=True, description="Enable debug mode")
    HOST: str = Field(default="127.0.0.1", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    DATABASE_PATH: str = Field(default="data/database.db", description="Path to the SQLite database file")
    COMPANY_NAME: str = Field(default="La Tua Azienda Srl", description="Company's legal name")
    COMPANY_VAT: str = Field(default="", description="Company's VAT number (Partita IVA)")
    COMPANY_CF: str = Field(default="", description="Company's fiscal code (Codice Fiscale)")
    
    @validator('COMPANY_VAT')
    def validate_company_vat(cls, v):
        if not v:
            raise ValueError("COMPANY_VAT must be set in the .env file or config.ini for the application to work correctly.")
        return v

    MAX_UPLOAD_SIZE: int = Field(default=100, description="Maximum upload size in MB")
    PAGINATION_SIZE: int = Field(default=50, description="Default pagination size")
    LOCAL_API_KEY: str = Field(default="your-secure-api-key-here", description="API key for local/secure access")
    SECRET_KEY: str = Field(default="your-secret-key-for-jwt-tokens", description="Secret key for JWT tokens")
    GOOGLE_CREDENTIALS_FILE: str = Field(default="google_credentials.json")
    SYNC_ENABLED: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FILE: str = Field(default="logs/fattura_analyzer_api.log")

    def get_database_path(self) -> str:
        db_path_obj = Path(self.DATABASE_PATH)
        if db_path_obj.is_absolute():
            return str(db_path_obj)
        return str(backend_root / self.DATABASE_PATH)

# Istanza singola delle impostazioni
settings = AppSettings()
