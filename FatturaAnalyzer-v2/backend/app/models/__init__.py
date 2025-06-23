"""
Pydantic models for FastAPI request/response validation
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, validator


# Base configuration for all models
class BaseConfig:
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True
    )


# Enums for type safety
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


# Anagraphics Models
class AnagraphicsBase(BaseModel, BaseConfig):
    type: AnagraphicsType
    piva: Optional[str] = Field(None, max_length=20, description="Partita IVA")
    cf: Optional[str] = Field(None, max_length=16, description="Codice Fiscale")
    denomination: str = Field(..., min_length=1, max_length=200, description="Denominazione")
    address: Optional[str] = Field(None, max_length=200)
    cap: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=5)
    country: str = Field(default="IT", max_length=5)
    iban: Optional[str] = Field(None, max_length=34)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    pec: Optional[str] = Field(None, max_length=100)
    codice_destinatario: Optional[str] = Field(None, max_length=10)

    @validator('piva')
    def validate_piva(cls, v):
        if v and len(v) < 5:
            raise ValueError('Partita IVA must be at least 5 characters')
        return v

    @validator('cf')
    def validate_cf(cls, v):
        if v and len(v) < 10:
            raise ValueError('Codice Fiscale must be at least 10 characters')
        return v


class AnagraphicsCreate(AnagraphicsBase):
    pass


class AnagraphicsUpdate(BaseModel, BaseConfig):
    type: Optional[AnagraphicsType] = None
    piva: Optional[str] = None
    cf: Optional[str] = None
    denomination: Optional[str] = None
    address: Optional[str] = None
    cap: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    iban: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    pec: Optional[str] = None
    codice_destinatario: Optional[str] = None


class Anagraphics(AnagraphicsBase):
    id: int
    score: float = Field(default=100.0, ge=0, le=100)
    created_at: datetime
    updated_at: datetime


# Invoice Models
class InvoiceLineBase(BaseModel, BaseConfig):
    line_number: int = Field(..., ge=1)
    description: Optional[str] = Field(None, max_length=500)
    quantity: Optional[float] = Field(None, ge=0)
    unit_measure: Optional[str] = Field(None, max_length=20)
    unit_price: Optional[float] = Field(None, ge=0)
    total_price: float = Field(..., ge=0)
    vat_rate: float = Field(..., ge=0, le=100)
    item_code: Optional[str] = Field(None, max_length=50)
    item_type: Optional[str] = Field(None, max_length=50)


class InvoiceLineCreate(InvoiceLineBase):
    pass


class InvoiceLine(InvoiceLineBase):
    id: int
    invoice_id: int


class InvoiceVATSummaryBase(BaseModel, BaseConfig):
    vat_rate: float = Field(..., ge=0, le=100)
    taxable_amount: float = Field(..., ge=0)
    vat_amount: float = Field(..., ge=0)


class InvoiceVATSummaryCreate(InvoiceVATSummaryBase):
    pass


class InvoiceVATSummary(InvoiceVATSummaryBase):
    id: int
    invoice_id: int


class InvoiceBase(BaseModel, BaseConfig):
    anagraphics_id: int = Field(..., gt=0)
    type: InvoiceType
    doc_type: Optional[str] = Field(None, max_length=10)
    doc_number: str = Field(..., min_length=1, max_length=50)
    doc_date: date
    total_amount: float = Field(..., ge=0)
    due_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)
    xml_filename: Optional[str] = Field(None, max_length=200)
    p7m_source_file: Optional[str] = Field(None, max_length=200)


class InvoiceCreate(InvoiceBase):
    lines: Optional[List[InvoiceLineCreate]] = []
    vat_summary: Optional[List[InvoiceVATSummaryCreate]] = []


class InvoiceUpdate(BaseModel, BaseConfig):
    anagraphics_id: Optional[int] = None
    type: Optional[InvoiceType] = None
    doc_type: Optional[str] = None
    doc_number: Optional[str] = None
    doc_date: Optional[date] = None
    total_amount: Optional[float] = None
    due_date: Optional[date] = None
    payment_status: Optional[PaymentStatus] = None
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class Invoice(InvoiceBase):
    id: int
    payment_status: PaymentStatus = PaymentStatus.APERTA
    paid_amount: float = Field(default=0.0, ge=0)
    unique_hash: str
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    open_amount: Optional[float] = None
    counterparty_name: Optional[str] = None
    
    # Relations
    lines: List[InvoiceLine] = []
    vat_summary: List[InvoiceVATSummary] = []


# Transaction Models
class BankTransactionBase(BaseModel, BaseConfig):
    transaction_date: date
    value_date: Optional[date] = None
    amount: float = Field(..., description="Transaction amount (positive for income, negative for expense)")
    description: Optional[str] = Field(None, max_length=500)
    causale_abi: Optional[int] = Field(None, ge=0)


class BankTransactionCreate(BankTransactionBase):
    unique_hash: str = Field(..., min_length=1, max_length=100)


class BankTransactionUpdate(BaseModel, BaseConfig):
    transaction_date: Optional[date] = None
    value_date: Optional[date] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    causale_abi: Optional[int] = None
    reconciliation_status: Optional[ReconciliationStatus] = None
    reconciled_amount: Optional[float] = None


class BankTransaction(BankTransactionBase):
    id: int
    reconciliation_status: ReconciliationStatus = ReconciliationStatus.DA_RICONCILIARE
    reconciled_amount: float = Field(default=0.0, ge=0)
    unique_hash: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Computed fields
    remaining_amount: Optional[float] = None


# Reconciliation Models
class ReconciliationLinkBase(BaseModel, BaseConfig):
    transaction_id: int = Field(..., gt=0)
    invoice_id: int = Field(..., gt=0)
    reconciled_amount: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class ReconciliationLinkCreate(ReconciliationLinkBase):
    pass


class ReconciliationLink(ReconciliationLinkBase):
    id: int
    reconciliation_date: datetime
    created_at: datetime


class ReconciliationSuggestion(BaseModel, BaseConfig):
    confidence: str = Field(..., description="Alta, Media, Bassa")
    confidence_score: float = Field(..., ge=0, le=1)
    invoice_ids: List[int]
    transaction_ids: Optional[List[int]] = None
    description: str
    total_amount: float
    match_details: Optional[Dict[str, Any]] = None
    reasons: Optional[List[str]] = []


class ReconciliationRequest(BaseModel, BaseConfig):
    invoice_id: int = Field(..., gt=0)
    transaction_id: int = Field(..., gt=0)
    amount: float = Field(..., gt=0)


class ReconciliationBatchRequest(BaseModel, BaseConfig):
    invoice_ids: List[int] = Field(..., min_items=1)
    transaction_ids: List[int] = Field(..., min_items=1)


# Analytics Models
class KPIData(BaseModel, BaseConfig):
    total_receivables: float
    total_payables: float
    overdue_receivables_count: int
    overdue_receivables_amount: float
    overdue_payables_count: int
    overdue_payables_amount: float
    revenue_ytd: float
    revenue_prev_year_ytd: float
    revenue_yoy_change_ytd: Optional[float] = None
    gross_margin_ytd: float
    margin_percent_ytd: Optional[float] = None
    avg_days_to_payment: Optional[float] = None
    inventory_turnover_estimate: Optional[float] = None
    active_customers_month: int
    new_customers_month: int


class CashFlowData(BaseModel, BaseConfig):
    month: str
    incassi_clienti: float
    incassi_contanti: float
    altri_incassi: float
    pagamenti_fornitori: float
    spese_carte: float
    carburanti: float
    trasporti: float
    utenze: float
    tasse_tributi: float
    commissioni_bancarie: float
    altri_pagamenti: float
    net_operational_flow: float
    total_inflows: float
    total_outflows: float
    net_cash_flow: float


class MonthlyRevenueData(BaseModel, BaseConfig):
    month: str
    revenue: float
    cost: float
    gross_margin: float
    margin_percent: float


class TopClientData(BaseModel, BaseConfig):
    id: int
    denomination: str
    total_revenue: float
    num_invoices: int
    score: float
    avg_order_value: float
    last_order_date: Optional[date] = None


class ProductAnalysisData(BaseModel, BaseConfig):
    normalized_product: str
    total_quantity: float
    total_value: float
    num_invoices: int
    avg_unit_price: float
    original_descriptions: List[str]


class AgingBucket(BaseModel, BaseConfig):
    label: str
    amount: float
    count: int


class AgingSummary(BaseModel, BaseConfig):
    buckets: List[AgingBucket]
    total_amount: float
    total_count: int


# Import/Export Models
class ImportResult(BaseModel, BaseConfig):
    processed: int
    success: int
    duplicates: int
    errors: int
    unsupported: int
    files: List[Dict[str, str]]


class FileUploadResponse(BaseModel, BaseConfig):
    filename: str
    size: int
    content_type: str
    status: str
    message: Optional[str] = None


# Cloud Sync Models
class SyncStatus(BaseModel, BaseConfig):
    enabled: bool
    service_available: bool
    remote_file_id: Optional[str] = None
    last_sync_time: Optional[datetime] = None
    auto_sync_running: bool


class SyncResult(BaseModel, BaseConfig):
    success: bool
    action: Optional[str] = None
    message: str
    timestamp: datetime


# Filter and Pagination Models
class PaginationParams(BaseModel, BaseConfig):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=50, ge=1, le=1000)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size
    
    @property
    def limit(self) -> int:
        return self.size


class DateRangeFilter(BaseModel, BaseConfig):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class AnagraphicsFilter(BaseModel, BaseConfig):
    type: Optional[AnagraphicsType] = None
    search: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=5)


class InvoiceFilter(BaseModel, BaseConfig):
    type: Optional[InvoiceType] = None
    status: Optional[PaymentStatus] = None
    anagraphics_id: Optional[int] = None
    search: Optional[str] = Field(None, max_length=100)
    date_range: Optional[DateRangeFilter] = None
    min_amount: Optional[float] = Field(None, ge=0)
    max_amount: Optional[float] = Field(None, ge=0)


class TransactionFilter(BaseModel, BaseConfig):
    status: Optional[ReconciliationStatus] = None
    search: Optional[str] = Field(None, max_length=100)
    date_range: Optional[DateRangeFilter] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    anagraphics_id_heuristic: Optional[int] = None
    hide_pos: bool = False
    hide_worldline: bool = False
    hide_cash: bool = False
    hide_commissions: bool = False


# Response Models with Pagination
class PaginatedResponse(BaseModel, BaseConfig):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int


class AnagraphicsListResponse(BaseModel, BaseConfig):
    items: List[Anagraphics]
    total: int
    page: int
    size: int
    pages: int


class InvoiceListResponse(BaseModel, BaseConfig):
    items: List[Invoice]
    total: int
    page: int
    size: int
    pages: int


class TransactionListResponse(BaseModel, BaseConfig):
    items: List[BankTransaction]
    total: int
    page: int
    size: int
    pages: int


# API Response Models
class APIResponse(BaseModel, BaseConfig):
    success: bool
    message: str
    data: Optional[Any] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponse(BaseModel, BaseConfig):
    success: bool = False
    error: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)


# Dashboard Models
class DashboardKPIs(BaseModel, BaseConfig):
    # Financial KPIs
    total_receivables: float = Field(description="Total amount receivable")
    total_payables: float = Field(description="Total amount payable")
    overdue_receivables_amount: float = Field(description="Overdue receivables amount")
    overdue_receivables_count: int = Field(description="Number of overdue receivables")
    overdue_payables_amount: float = Field(description="Overdue payables amount")
    overdue_payables_count: int = Field(description="Number of overdue payables")
    
    # Revenue KPIs
    revenue_ytd: float = Field(description="Revenue year-to-date")
    revenue_prev_year_ytd: float = Field(description="Revenue previous year YTD")
    revenue_yoy_change_ytd: Optional[float] = Field(None, description="YoY revenue change percentage")
    gross_margin_ytd: float = Field(description="Gross margin YTD")
    margin_percent_ytd: Optional[float] = Field(None, description="Margin percentage YTD")
    
    # Operational KPIs
    avg_days_to_payment: Optional[float] = Field(None, description="Average days to payment")
    inventory_turnover_estimate: Optional[float] = Field(None, description="Estimated inventory turnover")
    active_customers_month: int = Field(description="Active customers this month")
    new_customers_month: int = Field(description="New customers this month")


class DashboardData(BaseModel, BaseConfig):
    kpis: DashboardKPIs
    recent_invoices: List[Invoice]
    recent_transactions: List[BankTransaction]
    cash_flow_summary: List[CashFlowData]
    top_clients: List[TopClientData]
    overdue_invoices: List[Invoice]


# Search Models
class SearchResult(BaseModel, BaseConfig):
    type: str = Field(description="Type of result: invoice, transaction, anagraphics")
    id: int
    title: str
    subtitle: str
    amount: Optional[float] = None
    date: Optional[date] = None
    status: Optional[str] = None


class SearchResponse(BaseModel, BaseConfig):
    query: str
    results: List[SearchResult]
    total: int
    took_ms: int


# Export all models
__all__ = [
    # Enums
    'AnagraphicsType', 'InvoiceType', 'PaymentStatus', 'ReconciliationStatus',
    
    # Anagraphics
    'AnagraphicsBase', 'AnagraphicsCreate', 'AnagraphicsUpdate', 'Anagraphics',
    
    # Invoices
    'InvoiceLineBase', 'InvoiceLineCreate', 'InvoiceLine',
    'InvoiceVATSummaryBase', 'InvoiceVATSummaryCreate', 'InvoiceVATSummary',
    'InvoiceBase', 'InvoiceCreate', 'InvoiceUpdate', 'Invoice',
    
    # Transactions
    'BankTransactionBase', 'BankTransactionCreate', 'BankTransactionUpdate', 'BankTransaction',
    
    # Reconciliation
    'ReconciliationLinkBase', 'ReconciliationLinkCreate', 'ReconciliationLink',
    'ReconciliationSuggestion', 'ReconciliationRequest', 'ReconciliationBatchRequest',
    
    # Analytics
    'KPIData', 'CashFlowData', 'MonthlyRevenueData', 'TopClientData', 'ProductAnalysisData',
    'AgingBucket', 'AgingSummary',
    
    # Import/Export
    'ImportResult', 'FileUploadResponse',
    
    # Sync
    'SyncStatus', 'SyncResult',
    
    # Filters and Pagination
    'PaginationParams', 'DateRangeFilter', 'AnagraphicsFilter', 'InvoiceFilter', 'TransactionFilter',
    
    # Responses
    'PaginatedResponse', 'AnagraphicsListResponse', 'InvoiceListResponse', 'TransactionListResponse',
    'APIResponse', 'ErrorResponse',
    
    # Dashboard
    'DashboardKPIs', 'DashboardData',
    
    # Search
    'SearchResult', 'SearchResponse'
]
