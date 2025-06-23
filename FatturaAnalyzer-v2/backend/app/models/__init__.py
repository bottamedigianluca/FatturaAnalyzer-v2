"""
Modelli base per FastAPI - VERSIONE COMPLETA E FINALE
File: app/models/__init__.py
"""
from typing import Optional, Any, Dict, List
from enum import Enum
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

class BaseConfig:
    """Configurazione base per tutti i modelli Pydantic"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True,
        arbitrary_types_allowed=True
    )

# ==================== ENUMS BASE ====================

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

# ==================== RESPONSE MODELS ====================

class APIResponse(BaseModel, BaseConfig):
    """Response model standard per tutte le API"""
    success: bool
    message: str
    data: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ErrorResponse(BaseModel, BaseConfig):
    """Response model per errori"""
    success: bool = False
    error: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)
    details: Optional[Dict[str, Any]] = None

class PaginatedResponse(BaseModel, BaseConfig):
    """Response model per liste paginate"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    success: bool = True
    message: str = "Data retrieved successfully"

# ==================== UTILITY MODELS ====================

class PaginationParams(BaseModel, BaseConfig):
    """Parametri di paginazione"""
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=50, ge=1, le=1000, description="Page size")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size
    
    @property
    def limit(self) -> int:
        return self.size

class DateRangeFilter(BaseModel, BaseConfig):
    """Filtro per range di date"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    def validate_date_range(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be before end_date")

# ==================== IMPORT/EXPORT MODELS ====================

class ImportResult(BaseModel, BaseConfig):
    """Risultato operazione di import"""
    processed: int = 0
    success: int = 0
    duplicates: int = 0
    errors: int = 0
    unsupported: int = 0
    files: List[Dict[str, Any]] = Field(default_factory=list)
    import_time: Optional[datetime] = Field(default_factory=datetime.now)
    summary: Optional[str] = None

class FileUploadResponse(BaseModel, BaseConfig):
    """Response per upload file"""
    filename: str
    size: int
    content_type: str
    status: str
    message: Optional[str] = None
    file_id: Optional[str] = None

# ==================== SYNC MODELS ====================

class SyncStatus(BaseModel, BaseConfig):
    """Status sincronizzazione cloud"""
    enabled: bool
    service_available: bool
    remote_file_id: Optional[str] = None
    last_sync_time: Optional[datetime] = None
    auto_sync_running: bool = False
    sync_interval: Optional[int] = None
    next_sync_time: Optional[datetime] = None

class SyncResult(BaseModel, BaseConfig):
    """Risultato operazione di sync"""
    success: bool
    action: Optional[str] = None
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)
    file_size: Optional[int] = None
    duration_ms: Optional[int] = None
    sync_direction: Optional[str] = None

# ==================== TRANSACTION MODELS BASE ====================

class BankTransactionBase(BaseModel, BaseConfig):
    """Modello base per transazioni bancarie"""
    transaction_date: date = Field(..., description="Data operazione")
    value_date: Optional[date] = Field(None, description="Data valuta")
    amount: float = Field(..., description="Importo (positivo=entrata, negativo=uscita)")
    description: Optional[str] = Field(None, max_length=500, description="Descrizione")
    causale_abi: Optional[int] = Field(None, ge=0, description="Codice causale ABI")

class BankTransactionCreate(BankTransactionBase):
    """Modello per creazione transazione"""
    unique_hash: str = Field(..., min_length=1, max_length=100, description="Hash univoco")

class BankTransactionUpdate(BaseModel, BaseConfig):
    """Modello per aggiornamento transazione"""
    transaction_date: Optional[date] = None
    value_date: Optional[date] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    causale_abi: Optional[int] = None
    reconciliation_status: Optional[ReconciliationStatus] = None
    reconciled_amount: Optional[float] = None

class BankTransaction(BankTransactionBase):
    """Modello completo transazione"""
    id: int
    reconciliation_status: ReconciliationStatus = Field(default=ReconciliationStatus.DA_RICONCILIARE)
    reconciled_amount: float = Field(default=0.0, ge=0)
    unique_hash: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    remaining_amount: Optional[float] = Field(None, description="Importo rimanente")
    is_fully_reconciled: Optional[bool] = Field(None, description="Completamente riconciliata")

class TransactionListResponse(PaginatedResponse):
    """Response per lista transazioni"""
    items: List[BankTransaction]

# ==================== ANALYTICS MODELS ====================

class KPIData(BaseModel, BaseConfig):
    """Dati KPI dashboard"""
    total_receivables: float = 0.0
    total_payables: float = 0.0
    overdue_receivables_count: int = 0
    overdue_receivables_amount: float = 0.0
    overdue_payables_count: int = 0
    overdue_payables_amount: float = 0.0
    revenue_ytd: float = 0.0
    revenue_prev_year_ytd: float = 0.0
    revenue_yoy_change_ytd: Optional[float] = None
    gross_margin_ytd: float = 0.0
    margin_percent_ytd: Optional[float] = None
    avg_days_to_payment: Optional[float] = None
    inventory_turnover_estimate: Optional[float] = None
    active_customers_month: int = 0
    new_customers_month: int = 0

class CashFlowData(BaseModel, BaseConfig):
    """Dati cash flow mensile"""
    month: str
    incassi_clienti: float = 0.0
    incassi_contanti: float = 0.0
    altri_incassi: float = 0.0
    pagamenti_fornitori: float = 0.0
    spese_carte: float = 0.0
    carburanti: float = 0.0
    trasporti: float = 0.0
    utenze: float = 0.0
    tasse_tributi: float = 0.0
    commissioni_bancarie: float = 0.0
    altri_pagamenti: float = 0.0
    net_operational_flow: float = 0.0
    total_inflows: float = 0.0
    total_outflows: float = 0.0
    net_cash_flow: float = 0.0

# ==================== HEALTH CHECK MODELS ====================

class HealthStatus(BaseModel, BaseConfig):
    """Status di salute del sistema"""
    status: str  # healthy, degraded, unhealthy
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = "4.0.0"
    adapter_version: str = "4.0"
    database_connection: bool = True
    cache_status: bool = True
    external_services: Dict[str, bool] = Field(default_factory=dict)
    performance_metrics: Optional[Dict[str, Any]] = None

class SystemMetrics(BaseModel, BaseConfig):
    """Metriche di sistema"""
    uptime_seconds: int
    memory_usage_mb: float
    cpu_usage_percent: float
    active_connections: int
    cache_hit_rate: float
    average_response_time_ms: float
    requests_per_minute: int
    error_rate_percent: float

# ==================== SEARCH MODELS ====================

class SearchResult(BaseModel, BaseConfig):
    """Risultato ricerca"""
    type: str = Field(description="Tipo risultato: invoice, transaction, anagraphics")
    id: int
    title: str
    subtitle: str
    amount: Optional[float] = None
    date: Optional[date] = None
    status: Optional[str] = None
    relevance_score: Optional[float] = None

class SearchResponse(BaseModel, BaseConfig):
    """Response ricerca"""
    query: str
    results: List[SearchResult]
    total: int
    took_ms: int
    search_mode: str = "standard"

# ==================== TASK MODELS ====================

class BackgroundTask(BaseModel, BaseConfig):
    """Task in background"""
    task_id: str
    task_type: str
    status: str  # created, processing, completed, failed
    progress: int = 0
    total: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

# ==================== IMPORT MODELLI INVOICE ====================

# Importa tutti i modelli dalle fatture
try:
    from .invoice import (
        DocumentType, PaymentMethod, VATRegime, InvoiceLineExtended,
        InvoiceVATSummaryExtended, InvoiceAttachment, InvoicePayment,
        InvoiceExtended, InvoiceValidation, InvoiceStats, InvoiceSearch,
        InvoiceBulkOperation, InvoiceTemplate, InvoiceReminder, InvoiceReport,
        ElectronicInvoiceData
    )
    
    # Alias per compatibilità
    Invoice = InvoiceExtended
    InvoiceLine = InvoiceLineExtended
    InvoiceVATSummary = InvoiceVATSummaryExtended
    
except ImportError as e:
    # Fallback se il modulo invoice non esiste
    print(f"Warning: Could not import invoice models: {e}")
    
    # Definisci modelli base per evitare errori
    class Invoice(BaseModel, BaseConfig):
        id: Optional[int] = None
        doc_number: str
        doc_date: date
        total_amount: float
        type: InvoiceType
        anagraphics_id: int
    
    class InvoiceLine(BaseModel, BaseConfig):
        id: Optional[int] = None
        invoice_id: int
        description: str
        quantity: float = 1.0
        unit_price: float
        total_price: float

# ==================== IMPORT MODELLI TRANSACTION ====================

# Importa modelli transazioni estesi se disponibili
try:
    from .transaction import (
        TransactionType, TransactionCategory, BankAccount, TransactionRule,
        TransactionBase, TransactionCreate, TransactionUpdate, TransactionFull,
        TransactionImport, TransactionMatch, TransactionSummary, TransactionAnalytics,
        TransactionFilter, TransactionBulkOperation, BankStatementImport
    )
    
    # Alias per compatibilità
    Transaction = TransactionFull
    
except ImportError as e:
    print(f"Warning: Could not import extended transaction models: {e}")
    # I modelli base sono già definiti sopra

# ==================== IMPORT MODELLI ANAGRAPHICS ====================

# Importa modelli anagrafiche estesi se disponibili
try:
    from .anagraphics import (
        Anagraphics, AnagraphicsCreate, AnagraphicsUpdate, AnagraphicsListResponse
    )
except ImportError as e:
    print(f"Warning: Could not import anagraphics models: {e}")
    
    # Fallback per modelli base anagrafiche
    class Anagraphics(BaseModel, BaseConfig):
        id: int
        type: AnagraphicsType
        denomination: str
        piva: Optional[str] = None
        cf: Optional[str] = None
        created_at: datetime
        updated_at: datetime
    
    class AnagraphicsCreate(BaseModel, BaseConfig):
        type: AnagraphicsType
        denomination: str
        piva: Optional[str] = None
        cf: Optional[str] = None
    
    class AnagraphicsUpdate(BaseModel, BaseConfig):
        type: Optional[AnagraphicsType] = None
        denomination: Optional[str] = None
        piva: Optional[str] = None
        cf: Optional[str] = None
    
    class AnagraphicsListResponse(PaginatedResponse):
        items: List[Anagraphics]

# ==================== EXPORTS ====================

__all__ = [
    # Base
    'BaseConfig',
    
    # Enums
    'AnagraphicsType', 'InvoiceType', 'PaymentStatus', 'ReconciliationStatus',
    
    # Response Models
    'APIResponse', 'ErrorResponse', 'PaginatedResponse',
    
    # Utility Models
    'PaginationParams', 'DateRangeFilter',
    
    # Import/Export
    'ImportResult', 'FileUploadResponse',
    
    # Sync
    'SyncStatus', 'SyncResult',
    
    # Transactions
    'BankTransactionBase', 'BankTransactionCreate', 'BankTransactionUpdate', 
    'BankTransaction', 'TransactionListResponse', 'Transaction',
    
    # Analytics
    'KPIData', 'CashFlowData',
    
    # Health & Metrics
    'HealthStatus', 'SystemMetrics',
    
    # Search
    'SearchResult', 'SearchResponse',
    
    # Tasks
    'BackgroundTask',
    
    # Anagraphics
    'Anagraphics', 'AnagraphicsCreate', 'AnagraphicsUpdate', 'AnagraphicsListResponse',
    
    # Invoices
    'Invoice', 'InvoiceExtended', 'InvoiceLine', 'InvoiceLineExtended',
    'InvoiceVATSummary', 'InvoiceVATSummaryExtended', 'InvoiceAttachment',
    'InvoicePayment', 'InvoiceValidation', 'InvoiceStats', 'InvoiceSearch',
    'InvoiceBulkOperation', 'InvoiceTemplate', 'InvoiceReminder', 'InvoiceReport',
    'ElectronicInvoiceData', 'DocumentType', 'PaymentMethod', 'VATRegime'
]
