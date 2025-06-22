"""
Modelli Pydantic specifici per le anagrafiche - VERSIONE ENTERPRISE COMPLETA
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator, EmailStr
from . import BaseConfig, AnagraphicsType, APIResponse

class CompanySize(str, Enum):
    MICRO = "Micro"
    SMALL = "Piccola"
    MEDIUM = "Media"
    LARGE = "Grande"
    UNKNOWN = "Non Specificata"

class BusinessSector(str, Enum):
    TRADE = "Commercio"
    MANUFACTURING = "Manifatturiero"
    OTHER = "Altro"

class CreditRating(str, Enum):
    EXCELLENT = "Eccellente"
    GOOD = "Buono"
    POOR = "Scarso"
    NOT_RATED = "Non Valutato"

class RelationshipType(str, Enum):
    CUSTOMER = "Cliente"
    SUPPLIER = "Fornitore"
    BOTH = "Cliente e Fornitore"
    PROSPECT = "Prospect"

# ==============================================================================
# MODELLO PRINCIPALE (Il tuo modello enterprise, ora usato come standard)
# ==============================================================================
class Anagraphics(BaseModel, BaseConfig):
    """Modello completo per un record anagrafico."""
    id: int
    type: AnagraphicsType
    piva: Optional[str] = None
    cf: Optional[str] = None
    denomination: str
    address: Optional[str] = None
    cap: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = 'IT'
    email: Optional[EmailStr] = None
    pec: Optional[str] = None
    phone: Optional[str] = None
    codice_destinatario: Optional[str] = None
    score: Optional[float] = 100.0
    created_at: datetime
    updated_at: datetime

# ==============================================================================
# MODELLI PER INTERAZIONE API (Data Transfer Objects)
# ==============================================================================

class AnagraphicsBase(BaseModel, BaseConfig):
    """Modello con i campi essenziali per la creazione/aggiornamento."""
    type: AnagraphicsType
    denomination: str = Field(..., min_length=2, max_length=200)
    piva: Optional[str] = Field(None, max_length=20)
    cf: Optional[str] = Field(None, max_length=16)
    address: Optional[str] = Field(None, max_length=200)
    cap: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=2)
    email: Optional[EmailStr] = None
    pec: Optional[EmailStr] = None
    codice_destinatario: Optional[str] = Field(None, min_length=6, max_length=7)

class AnagraphicsCreate(AnagraphicsBase):
    pass

class AnagraphicsUpdate(BaseModel, BaseConfig):
    """Modello per l'aggiornamento, dove tutti i campi sono opzionali."""
    type: Optional[AnagraphicsType] = None
    denomination: Optional[str] = Field(None, min_length=2, max_length=200)
    piva: Optional[str] = Field(None, max_length=20)
    cf: Optional[str] = Field(None, max_length=16)
    address: Optional[str] = Field(None, max_length=200)
    cap: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=2)
    email: Optional[EmailStr] = None
    pec: Optional[EmailStr] = None
    codice_destinatario: Optional[str] = Field(None, min_length=6, max_length=7)
    is_active: Optional[bool] = None # Campo dal tuo modello esteso

# Modello per la risposta paginata della lista anagrafiche
class AnagraphicsListResponse(APIResponse):
    items: List[Anagraphics]
    total: int
    page: int
    size: int
    pages: int
