# app/models/setup.py
"""
Modelli Pydantic per Setup Wizard
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator, EmailStr
from app.models import BaseConfig


class InvoiceType(str, Enum):
    ACTIVE = "active"
    PASSIVE = "passive"


class SetupStage(str, Enum):
    NOT_STARTED = "not_started"
    COMPANY_DATA = "company_data"
    API_CONFIG = "api_config"
    CLOUD_SYNC = "cloud_sync"
    COMPLETED = "completed"


class CompanyDataExtraction(BaseModel, BaseConfig):
    """Dati aziendali estratti da fattura"""
    ragione_sociale: str = Field(..., min_length=1, max_length=200)
    partita_iva: str = Field(..., min_length=11, max_length=11)
    codice_fiscale: Optional[str] = Field(None, max_length=16)
    indirizzo: Optional[str] = Field(None, max_length=200)
    cap: Optional[str] = Field(None, max_length=10)
    citta: Optional[str] = Field(None, max_length=100)
    provincia: Optional[str] = Field(None, max_length=5)
    paese: str = Field(default="IT", max_length=5)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    codice_destinatario: Optional[str] = Field(None, max_length=10)
    regime_fiscale: str = Field(default="RF01", max_length=10)
    
    @validator('partita_iva')
    def validate_partita_iva(cls, v):
        import re
        # Rimuovi spazi e caratteri non numerici
        cleaned = re.sub(r'\D', '', v)
        if len(cleaned) != 11:
            raise ValueError('Partita IVA deve essere di 11 cifre')
        return cleaned
    
    @validator('provincia')
    def validate_provincia(cls, v):
        if v and len(v) != 2:
            raise ValueError('Provincia deve essere di 2 caratteri')
        return v.upper() if v else v


class APISettings(BaseModel, BaseConfig):
    """Configurazioni API"""
    host: str = Field(default="127.0.0.1", description="Host API")
    port: int = Field(default=8000, ge=1000, le=65535, description="Porta API")
    debug: bool = Field(default=False, description="Modalità debug")
    cors_origins: str = Field(
        default="tauri://localhost,http://localhost:3000",
        description="Origins CORS separati da virgola"
    )
    max_upload_size: int = Field(default=100, ge=1, le=1000, description="Dimensione massima upload (MB)")
    rate_limit: int = Field(default=60, ge=10, le=1000, description="Rate limit per minuto")


class CloudSyncSettings(BaseModel, BaseConfig):
    """Configurazioni sincronizzazione cloud"""
    enabled: bool = Field(default=False, description="Abilita sincronizzazione")
    credentials_file: str = Field(
        default="google_credentials.json",
        description="File credenziali Google Drive"
    )
    auto_sync_interval: int = Field(
        default=3600,
        ge=300,
        le=86400,
        description="Intervallo auto-sync in secondi"
    )
    remote_backup: bool = Field(default=True, description="Backup automatico su cloud")


class SetupRequest(BaseModel, BaseConfig):
    """Richiesta setup completo"""
    company_data: CompanyDataExtraction
    api_settings: Optional[APISettings] = None
    cloud_settings: Optional[CloudSyncSettings] = None
    create_sample_data: bool = Field(default=False, description="Genera dati di esempio")
    accept_terms: bool = Field(..., description="Accettazione termini")
    
    @validator('accept_terms')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('Devi accettare i termini per continuare')
        return v


class ValidationResult(BaseModel, BaseConfig):
    """Risultato validazione dati"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []


class SetupStatus(BaseModel, BaseConfig):
    """Stato configurazione sistema"""
    has_config: bool
    company_configured: bool
    api_configured: bool
    cloud_sync_configured: bool
    database_exists: bool
    google_credentials_exists: bool
    setup_required: bool
    current_stage: SetupStage
    config_sections: List[str] = []
    company_data: Dict[str, Any] = {}


class ExtractionResult(BaseModel, BaseConfig):
    """Risultato estrazione dati da fattura"""
    company_data: CompanyDataExtraction
    extraction_source: str
    suggested_config: Dict[str, str]
    validation_warnings: Optional[List[str]] = []


class ImportSuggestion(BaseModel, BaseConfig):
    """Suggerimento per importazione file"""
    file_type: str
    supported_formats: List[str]
    description: str
    examples: List[str]
    required_columns: Optional[List[str]] = None
    optional_columns: Optional[List[str]] = None


class SetupStep(BaseModel, BaseConfig):
    """Singolo step del wizard"""
    step_number: int
    step_name: str
    title: str
    description: str
    completed: bool = False
    required: bool = True
    estimated_time: Optional[str] = None


class SetupWizardProgress(BaseModel, BaseConfig):
    """Progress del wizard di setup"""
    current_step: int
    total_steps: int
    completed_steps: List[int]
    steps: List[SetupStep]
    overall_progress: float = Field(ge=0.0, le=100.0)
    
    @validator('overall_progress', pre=True, always=True)
    def calculate_progress(cls, v, values):
        if 'completed_steps' in values and 'total_steps' in values:
            return (len(values['completed_steps']) / values['total_steps']) * 100
        return 0.0


class CompanyValidation(BaseModel, BaseConfig):
    """Validazione specifica per dati aziendali"""
    partita_iva_valid: bool
    codice_fiscale_valid: bool
    email_valid: bool
    address_complete: bool
    contacts_provided: bool
    overall_score: float = Field(ge=0.0, le=100.0)


class SetupCompletion(BaseModel, BaseConfig):
    """Risultato completamento setup"""
    config_created: bool
    database_initialized: bool
    company_id: Optional[int] = None
    sample_data_created: bool
    next_steps: List[str]
    setup_duration: Optional[str] = None
    warnings: List[str] = []


# Aggiorna __init__.py per includere i nuovi modelli
# In app/models/__init__.py aggiungi:

SETUP_MODELS = [
    'InvoiceType', 'SetupStage', 'CompanyDataExtraction', 'APISettings',
    'CloudSyncSettings', 'SetupRequest', 'ValidationResult', 'SetupStatus', 
    'ExtractionResult', 'ImportSuggestion', 'SetupStep', 'SetupWizardProgress',
    'CompanyValidation', 'SetupCompletion'
]
