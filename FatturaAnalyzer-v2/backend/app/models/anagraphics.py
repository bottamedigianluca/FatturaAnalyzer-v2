# app/models/anagraphics.py
"""
Modelli Pydantic specifici per le anagrafiche
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from decimal import Decimal

from pydantic import BaseModel, Field, validator, EmailStr
from app.models import BaseConfig, AnagraphicsType


class CompanySize(str, Enum):
    """Dimensione azienda"""
    MICRO = "Micro"  # < 10 dipendenti
    SMALL = "Piccola"  # 10-49 dipendenti
    MEDIUM = "Media"  # 50-249 dipendenti
    LARGE = "Grande"  # 250+ dipendenti
    UNKNOWN = "Non Specificata"


class BusinessSector(str, Enum):
    """Settore di attività"""
    AGRICULTURE = "Agricoltura"
    MANUFACTURING = "Manifatturiero"
    CONSTRUCTION = "Costruzioni"
    TRADE = "Commercio"
    TRANSPORT = "Trasporti"
    HOSPITALITY = "Ricettivo"
    ICT = "ICT"
    FINANCE = "Finanziario"
    REAL_ESTATE = "Immobiliare"
    PROFESSIONAL = "Servizi Professionali"
    ADMINISTRATIVE = "Servizi Amministrativi"
    PUBLIC = "Pubblica Amministrazione"
    EDUCATION = "Istruzione"
    HEALTH = "Sanità"
    ARTS = "Arte e Spettacolo"
    OTHER = "Altro"


class CreditRating(str, Enum):
    """Rating creditizio"""
    EXCELLENT = "Eccellente"  # AAA
    VERY_GOOD = "Molto Buono"  # AA
    GOOD = "Buono"  # A
    SATISFACTORY = "Soddisfacente"  # BBB
    ADEQUATE = "Adeguato"  # BB
    SPECULATIVE = "Speculativo"  # B
    POOR = "Scarso"  # CCC
    VERY_POOR = "Molto Scarso"  # CC
    DEFAULT = "Default"  # D
    NOT_RATED = "Non Valutato"


class RelationshipType(str, Enum):
    """Tipo relazione commerciale"""
    CUSTOMER = "Cliente"
    SUPPLIER = "Fornitore"
    BOTH = "Cliente e Fornitore"
    PARTNER = "Partner"
    COMPETITOR = "Concorrente"
    PROSPECT = "Prospect"
    INACTIVE = "Inattivo"


class AnagraphicsContact(BaseModel, BaseConfig):
    """Contatto anagrafica"""
    id: Optional[int] = None
    anagraphics_id: int
    contact_type: str = Field(..., max_length=50, description="Tipo contatto: Amministrativo, Commerciale, Tecnico")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: Optional[str] = Field(None, max_length=100, description="Ruolo aziendale")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    mobile: Optional[str] = Field(None, max_length=20)
    fax: Optional[str] = Field(None, max_length=20)
    is_primary: bool = Field(default=False, description="Contatto principale")
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(None, max_length=500)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AnagraphicsAddress(BaseModel, BaseConfig):
    """Indirizzo anagrafica"""
    id: Optional[int] = None
    anagraphics_id: int
    address_type: str = Field(..., max_length=50, description="Tipo: Sede Legale, Operativa, Fatturazione, Spedizione")
    address: str = Field(..., min_length=1, max_length=200)
    civic_number: Optional[str] = Field(None, max_length=20)
    postal_code: str = Field(..., max_length=10)
    city: str = Field(..., min_length=1, max_length=100)
    province: str = Field(..., max_length=5)
    country: str = Field(default="IT", max_length=5)
    is_primary: bool = Field(default=False, description="Indirizzo principale")
    is_active: bool = Field(default=True)
    coordinates: Optional[Dict[str, float]] = Field(None, description="Coordinate GPS: {lat: float, lng: float}")
    created_at: Optional[datetime] = None


class AnagraphicsBankAccount(BaseModel, BaseConfig):
    """Conto bancario anagrafica"""
    id: Optional[int] = None
    anagraphics_id: int
    bank_name: str = Field(..., min_length=1, max_length=100)
    iban: str = Field(..., min_length=15, max_length=34)
    bic_swift: Optional[str] = Field(None, max_length=11)
    account_holder: Optional[str] = Field(None, max_length=200, description="Intestatario se diverso")
    is_primary: bool = Field(default=False, description="Conto principale")
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(None, max_length=500)
    created_at: Optional[datetime] = None
    
    @validator('iban')
    def validate_iban(cls, v):
        # Rimuovi spazi e converti in maiuscolo
        cleaned = v.replace(' ', '').upper()
        if len(cleaned) < 15:
            raise ValueError('IBAN deve essere almeno 15 caratteri')
        return cleaned


class AnagraphicsNote(BaseModel, BaseConfig):
    """Nota/Commento su anagrafica"""
    id: Optional[int] = None
    anagraphics_id: int
    note_type: str = Field(default="General", max_length=50, description="Tipo nota")
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=1, max_length=2000)
    is_private: bool = Field(default=False, description="Nota privata")
    is_alert: bool = Field(default=False, description="Nota di avviso")
    created_by: Optional[str] = Field(None, max_length=100, description="Autore nota")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None


class AnagraphicsExtended(BaseModel, BaseConfig):
    """Anagrafica estesa con tutti i campi"""
    id: Optional[int] = None
    
    # Dati base
    type: AnagraphicsType = Field(..., description="Tipo anagrafica")
    relationship_type: RelationshipType = Field(default=RelationshipType.CUSTOMER)
    
    # Identificazione fiscale
    piva: Optional[str] = Field(None, max_length=20, description="Partita IVA")
    cf: Optional[str] = Field(None, max_length=16, description="Codice Fiscale")
    
    # Denominazione
    denomination: str = Field(..., min_length=1, max_length=200, description="Ragione sociale/Nome")
    commercial_name: Optional[str] = Field(None, max_length=200, description="Nome commerciale")
    legal_form: Optional[str] = Field(None, max_length=100, description="Forma giuridica")
    
    # Indirizzo principale
    address: Optional[str] = Field(None, max_length=200)
    civic_number: Optional[str] = Field(None, max_length=20)
    cap: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=5)
    country: str = Field(default="IT", max_length=5)
    
    # Contatti
    phone: Optional[str] = Field(None, max_length=20)
    mobile: Optional[str] = Field(None, max_length=20)
    fax: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    pec: Optional[str] = Field(None, max_length=100, description="PEC")
    website: Optional[str] = Field(None, max_length=200)
    
    # Fatturazione elettronica
    codice_destinatario: Optional[str] = Field(None, max_length=10)
    
    # Dati commerciali
    business_sector: BusinessSector = Field(default=BusinessSector.OTHER)
    company_size: CompanySize = Field(default=CompanySize.UNKNOWN)
    employees_count: Optional[int] = Field(None, ge=0, description="Numero dipendenti")
    annual_revenue: Optional[float] = Field(None, ge=0, description="Fatturato annuo stimato")
    
    # Rating e scoring
    score: float = Field(default=100.0, ge=0, le=100, description="Score interno")
    credit_rating: CreditRating = Field(default=CreditRating.NOT_RATED)
    credit_limit: Optional[float] = Field(None, ge=0, description="Limite di credito")
    payment_terms_days: int = Field(default=30, ge=0, le=365, description="Giorni pagamento")
    
    # Banking
    iban: Optional[str] = Field(None, max_length=34)
    bic_swift: Optional[str] = Field(None, max_length=11)
    
    # Preferences
    preferred_language: str = Field(default="it", max_length=5)
    preferred_currency: str = Field(default="EUR", max_length=3)
    communication_preferences: Dict[str, bool] = Field(
        default={"email": True, "sms": False, "postal": False},
        description="Preferenze comunicazione"
    )
    
    # Status
    is_active: bool = Field(default=True)
    is_blocked: bool = Field(default=False, description="Bloccato per rischio")
    block_reason: Optional[str] = Field(None, max_length=500)
    
    # Metadati
    registration_date: Optional[date] = Field(None, description="Data registrazione")
    last_contact_date: Optional[date] = Field(None, description="Ultimo contatto")
    source: Optional[str] = Field(None, max_length=100, description="Fonte acquisizione")
    tags: List[str] = Field(default=[], description="Tag personalizzati")
    custom_fields: Dict[str, Any] = Field(default={}, description="Campi personalizzati")
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Campi computati
    full_address: Optional[str] = Field(None, description="Indirizzo completo")
    days_since_last_contact: Optional[int] = Field(None, description="Giorni dall'ultimo contatto")
    total_invoices_count: Optional[int] = Field(None, description="Numero fatture totali")
    total_revenue: Optional[float] = Field(None, description="Fatturato totale")
    average_payment_days: Optional[float] = Field(None, description="Giorni medi pagamento")
    last_invoice_date: Optional[date] = Field(None, description="Data ultima fattura")
    
    # Relazioni
    contacts: List[AnagraphicsContact] = Field(default=[], description="Contatti")
    addresses: List[AnagraphicsAddress] = Field(default=[], description="Indirizzi")
    bank_accounts: List[AnagraphicsBankAccount] = Field(default=[], description="Conti bancari")
    notes: List[AnagraphicsNote] = Field(default=[], description="Note")
    
    @validator('piva')
    def validate_piva(cls, v):
        if v:
            # Rimuovi spazi e caratteri non numerici
            import re
            cleaned = re.sub(r'\D', '', v)
            if len(cleaned) not in [11, 13]:  # IT + 11 cifre o solo 11 cifre
                raise ValueError('Partita IVA deve essere 11 cifre (o 13 con prefisso IT)')
            return cleaned
        return v
    
    @validator('cf')
    def validate_cf(cls, v):
        if v and len(v) not in [11, 16]:  # P.IVA (11) o CF (16)
            raise ValueError('Codice Fiscale deve essere 11 o 16 caratteri')
        return v.upper() if v else v
    
    @validator('full_address', pre=True, always=True)
    def build_full_address(cls, v, values):
        if v is None:
            parts = []
            if values.get('address'):
                parts.append(values['address'])
            if values.get('civic_number'):
                parts.append(values['civic_number'])
            if values.get('cap'):
                parts.append(values['cap'])
            if values.get('city'):
                parts.append(values['city'])
            if values.get('province'):
                parts.append(f"({values['province']})")
            return ' '.join(parts) if parts else None
        return v


class AnagraphicsStats(BaseModel, BaseConfig):
    """Statistiche anagrafiche"""
    total_count: int = Field(default=0)
    active_count: int = Field(default=0)
    inactive_count: int = Field(default=0)
    blocked_count: int = Field(default=0)
    
    # Per tipo
    customers_count: int = Field(default=0)
    suppliers_count: int = Field(default=0)
    both_count: int = Field(default=0)
    
    # Per settore
    by_sector: Dict[str, int] = Field(default={})
    by_company_size: Dict[str, int] = Field(default={})
    by_province: Dict[str, int] = Field(default={})
    
    # Revenue stats
    total_revenue: float = Field(default=0.0)
    average_revenue_per_customer: float = Field(default=0.0)
    top_customers_revenue_share: float = Field(default=0.0, description="% fatturato primi 10 clienti")


class AnagraphicsSearch(BaseModel, BaseConfig):
    """Criteri ricerca anagrafiche"""
    query: Optional[str] = Field(None, max_length=200, description="Testo da cercare")
    types: Optional[List[AnagraphicsType]] = None
    relationship_types: Optional[List[RelationshipType]] = None
    business_sectors: Optional[List[BusinessSector]] = None
    provinces: Optional[List[str]] = None
    cities: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_blocked: Optional[bool] = None
    has_piva: Optional[bool] = None
    has_email: Optional[bool] = None
    has_pec: Optional[bool] = None
    score_min: Optional[float] = Field(None, ge=0, le=100)
    score_max: Optional[float] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    created_after: Optional[date] = None
    created_before: Optional[date] = None
    last_contact_after: Optional[date] = None
    last_contact_before: Optional[date] = None
    
    # Ordinamento
    sort_by: str = Field(default="denomination", description="Campo ordinamento")
    sort_order: str = Field(default="asc", description="Ordine: asc, desc")


class AnagraphicsImport(BaseModel, BaseConfig):
    """Configurazione importazione anagrafiche"""
    file_type: str = Field(..., description="Tipo file: csv, excel, vcard")
    encoding: str = Field(default="utf-8")
    delimiter: str = Field(default=",", description="Separatore CSV")
    has_header: bool = Field(default=True)
    skip_duplicates: bool = Field(default=True)
    update_existing: bool = Field(default=False)
    
    # Mapping colonne
    column_mapping: Dict[str, str] = Field(
        default={},
        description="Mapping colonne file -> campi anagrafica"
    )
    
    # Validazione
    validate_piva: bool = Field(default=True)
    validate_cf: bool = Field(default=True)
    validate_email: bool = Field(default=True)


class AnagraphicsBulkOperation(BaseModel, BaseConfig):
    """Operazione massiva su anagrafiche"""
    anagraphics_ids: List[int] = Field(..., min_items=1, max_items=1000)
    operation: str = Field(..., description="Operazione da eseguire")
    parameters: Dict[str, Any] = Field(default={}, description="Parametri operazione")
    
    # Operazioni supportate:
    # - update_tags: {tags: List[str], action: "add"|"remove"|"replace"}
    # - update_sector: {sector: BusinessSector}
    # - update_status: {is_active: bool, is_blocked: bool}
    # - update_payment_terms: {payment_terms_days: int}
    # - send_communication: {template: str, method: str}
    # - export: {format: str, fields: List[str]}


class AnagraphicsRelationship(BaseModel, BaseConfig):
    """Relazione tra anagrafiche"""
    id: Optional[int] = None
    primary_anagraphics_id: int
    related_anagraphics_id: int
    relationship_type: str = Field(..., max_length=50, description="Tipo relazione: Controllata, Collegata, Partner")
    description: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = None


# Export all anagraphics models
__all__ = [
    'CompanySize', 'BusinessSector', 'CreditRating', 'RelationshipType',
    'AnagraphicsContact', 'AnagraphicsAddress', 'AnagraphicsBankAccount', 
    'AnagraphicsNote', 'AnagraphicsExtended', 'AnagraphicsStats', 
    'AnagraphicsSearch', 'AnagraphicsImport', 'AnagraphicsBulkOperation',
    'AnagraphicsRelationship'
]
