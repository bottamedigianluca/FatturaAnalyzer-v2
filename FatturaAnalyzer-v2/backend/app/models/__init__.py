"""
Pydantic models for FastAPI request/response validation
VERSIONE ENTERPRISE - Centralizza i modelli base per prevenire importazioni circolari.
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

# --- Configurazione Base per tutti i modelli ---
class BaseConfig:
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True
    )

# --- ENUM Comuni a tutta l'applicazione ---
class AnagraphicsType(str, Enum):
    CLIENTE = "Cliente"
    FORNITORE = "Fornitore"

class InvoiceType(str, Enum):
    ATTIVA = "Attiva"
    PASSIVA = "Passiva"

class PaymentStatus(str, Enum):
    APERTA = "Aperta"
    SCADUTA = "Scaduta"
    PAGATA_PARZ = "Pagata Parz."
    PAGATA_TOT = "Pagata Tot."
    INSOLUTA = "Insoluta"
    RICONCILIATA = "Riconciliata"

class ReconciliationStatus(str, Enum):
    DA_RICONCILIARE = "Da Riconciliare"
    RICONCILIATO_PARZ = "Riconciliato Parz."
    RICONCILIATO_TOT = "Riconciliato Tot."
    RICONCILIATO_ECCESSO = "Riconciliato Eccesso"
    IGNORATO = "Ignorato"
    
# --- Modelli di Risposta Standard ---
class APIResponse(BaseModel, BaseConfig):
    success: bool
    message: str
    data: Optional[Any] = None

class ErrorResponse(BaseModel, BaseConfig):
    success: bool = False
    error: str
    message: str

# Esporta tutto per un facile accesso da altri moduli
__all__ = [
    "BaseConfig",
    "AnagraphicsType",
    "InvoiceType",
    "PaymentStatus",
    "ReconciliationStatus",
    "APIResponse",
    "ErrorResponse",
]
