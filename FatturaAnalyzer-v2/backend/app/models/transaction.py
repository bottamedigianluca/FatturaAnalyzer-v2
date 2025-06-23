"""
Modelli Pydantic specifici per le transazioni bancarie - VERSIONE CORRETTA
Fix per errore HTTP 422 durante chiamate API V4.0
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, validator
from app.models import BaseConfig, ReconciliationStatus

class TransactionType(str, Enum):
    """Tipo di transazione bancaria"""
    INCOME = "Entrata"
    EXPENSE = "Uscita"
    TRANSFER = "Bonifico"
    DEBIT_CARD = "Carta di Debito"
    CREDIT_CARD = "Carta di Credito"
    BANK_FEE = "Commissione Bancaria"
    INTEREST = "Interessi"
    OTHER = "Altro"

class TransactionCategory(str, Enum):
    """Categoria transazione per analisi"""
    CUSTOMER_PAYMENT = "Pagamento Cliente"
    SUPPLIER_PAYMENT = "Pagamento Fornitore"
    TAX_PAYMENT = "Pagamento Tasse"
    SALARY = "Stipendi"
    UTILITIES = "Utenze"
    FUEL = "Carburante"
    TRANSPORT = "Trasporti"
    BANK_CHARGES = "Commissioni Bancarie"
    CASH_WITHDRAWAL = "Prelievo Contanti"
    POS_PAYMENT = "Pagamento POS"
    WORLDLINE = "Worldline"
    UNKNOWN = "Non Classificato"

class BankAccount(BaseModel, BaseConfig):
    """Modello per conto bancario"""
    id: Optional[int] = None
    bank_name: str = Field(..., min_length=1, max_length=100)
    account_number: str = Field(..., min_length=1, max_length=50)
    iban: Optional[str] = Field(None, max_length=34)
    swift_bic: Optional[str] = Field(None, max_length=11)
    account_type: str = Field(default="Corrente", max_length=50)
    currency: str = Field(default="EUR", max_length=3)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = None

    @validator('iban')
    def validate_iban(cls, v):
        if v and len(v) < 15:
            raise ValueError('IBAN deve essere almeno 15 caratteri')
        return v.upper() if v else v

class TransactionRule(BaseModel, BaseConfig):
    """Regola per categorizzazione automatica transazioni"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description_pattern: str = Field(..., min_length=1, max_length=200)
    amount_min: Optional[float] = Field(None, ge=0)
    amount_max: Optional[float] = Field(None, ge=0)
    transaction_type: Optional[TransactionType] = None
    category: TransactionCategory = Field(..., description="Categoria da assegnare")
    anagraphics_id: Optional[int] = Field(None, description="ID anagrafica collegata")
    is_active: bool = Field(default=True)
    priority: int = Field(default=100, ge=1, le=999, description="Priorità regola (1=massima)")
    created_at: Optional[datetime] = None

    @validator('amount_max')
    def validate_amount_range(cls, v, values):
        if v and values.get('amount_min') and v < values['amount_min']:
            raise ValueError('amount_max deve essere maggiore di amount_min')
        return v

class TransactionBase(BaseModel, BaseConfig):
    """Modello base per transazioni bancarie"""
    transaction_date: date = Field(..., description="Data operazione")
    value_date: Optional[date] = Field(None, description="Data valuta")
    amount: float = Field(..., description="Importo (positivo=entrata, negativo=uscita)")
    description: Optional[str] = Field(None, max_length=500, description="Descrizione")
    causale_abi: Optional[int] = Field(None, ge=0, description="Codice causale ABI")
    transaction_type: Optional[TransactionType] = Field(None, description="Tipo transazione")
    category: TransactionCategory = Field(default=TransactionCategory.UNKNOWN)
    anagraphics_id_heuristic: Optional[int] = Field(None, description="ID anagrafica collegata (euristica)")
    bank_account_id: Optional[int] = Field(None, description="ID conto bancario")
    reference_number: Optional[str] = Field(None, max_length=50, description="Numero riferimento")
    ordering_party: Optional[str] = Field(None, max_length=200, description="Ordinante")
    beneficiary: Optional[str] = Field(None, max_length=200, description="Beneficiario")

    @validator('amount')
    def validate_amount(cls, v):
        if v == 0:
            raise ValueError('Amount cannot be zero')
        return round(v, 2)

class TransactionCreate(TransactionBase):
    """Modello per creazione transazione"""
    unique_hash: str = Field(..., min_length=1, max_length=100, description="Hash univoco")

    @validator('unique_hash')
    def validate_unique_hash(cls, v):
        if len(v) < 10:
            raise ValueError('Hash deve essere almeno 10 caratteri')
        return v

class TransactionUpdate(BaseModel, BaseConfig):
    """Modello per aggiornamento transazione"""
    transaction_date: Optional[date] = None
    value_date: Optional[date] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    causale_abi: Optional[int] = None
    reconciliation_status: Optional[ReconciliationStatus] = None
    reconciled_amount: Optional[float] = None
    transaction_type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    anagraphics_id_heuristic: Optional[int] = None
    bank_account_id: Optional[int] = None
    reference_number: Optional[str] = None
    ordering_party: Optional[str] = None
    beneficiary: Optional[str] = None
    
class TransactionFull(TransactionBase):
    """Modello completo transazione con tutti i campi"""
    id: int
    reconciliation_status: ReconciliationStatus = Field(default=ReconciliationStatus.DA_RICONCILIARE)
    reconciled_amount: float = Field(default=0.0, ge=0)
    unique_hash: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    remaining_amount: Optional[float] = Field(None, description="Importo rimanente da riconciliare")
    is_fully_reconciled: Optional[bool] = Field(None, description="Completamente riconciliata")
    days_since_transaction: Optional[int] = Field(None, description="Giorni dalla transazione")
    bank_account: Optional[BankAccount] = None
    matched_anagraphics: Optional[Dict[str, Any]] = None
    reconciliation_links: Optional[List[Dict[str, Any]]] = []

class TransactionImport(BaseModel, BaseConfig):
    """Modello per importazione massiva transazioni"""
    bank_account_id: Optional[int] = None
    file_type: str = Field(..., description="Tipo file: csv, excel, ofx, etc.")
    date_format: str = Field(default="%d/%m/%Y", description="Formato data nel file")
    decimal_separator: str = Field(default=",", description="Separatore decimali")
    encoding: str = Field(default="utf-8", description="Encoding file")
    skip_duplicates: bool = Field(default=True, description="Salta duplicati")
    auto_categorize: bool = Field(default=True, description="Categorizzazione automatica")

class TransactionMatch(BaseModel, BaseConfig):
    """Modello per match transazione-fattura"""
    transaction_id: int
    invoice_id: Optional[int] = None
    confidence_score: float = Field(..., ge=0, le=1, description="Punteggio di confidenza")
    match_type: str = Field(..., description="Tipo di match: exact, fuzzy, partial")
    match_reasons: List[str] = Field(default=[], description="Motivi del match")
    suggested_amount: float = Field(..., gt=0, description="Importo suggerito per riconciliazione")
    
class TransactionSummary(BaseModel, BaseConfig):
    """Riassunto transazioni per periodo"""
    period: str = Field(..., description="Periodo: YYYY-MM o YYYY")
    total_income: float = Field(default=0.0, description="Totale entrate")
    total_expenses: float = Field(default=0.0, description="Totale uscite")
    net_amount: float = Field(default=0.0, description="Bilancio netto")
    transaction_count: int = Field(default=0, description="Numero transazioni")
    reconciled_count: int = Field(default=0, description="Transazioni riconciliate")
    unreconciled_count: int = Field(default=0, description="Transazioni non riconciliate")
    reconciliation_rate: float = Field(default=0.0, ge=0, le=100, description="Tasso riconciliazione %")

class TransactionAnalytics(BaseModel, BaseConfig):
    """Analytics approfondite per transazioni"""
    period_start: date
    period_end: date
    by_category: List[Dict[str, Any]] = Field(default=[], description="Analisi per categoria")
    by_type: List[Dict[str, Any]] = Field(default=[], description="Analisi per tipo")
    by_month: List[TransactionSummary] = Field(default=[], description="Analisi mensile")
    top_amounts: List[Dict[str, Any]] = Field(default=[], description="Transazioni per importo")
    reconciliation_stats: Dict[str, Any] = Field(default={}, description="Statistiche riconciliazione")
    cash_flow_analysis: Dict[str, Any] = Field(default={}, description="Analisi cash flow")

class TransactionFilter(BaseModel, BaseConfig):
    """
    Filtri per ricerca transazioni - VERSIONE CORRETTA V4.0
    Include TUTTI i campi utilizzati dall'API frontend per evitare errori HTTP 422
    """
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    transaction_type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    reconciliation_status: Optional[str] = None # Modificato da ReconciliationStatus a str
    bank_account_id: Optional[int] = None
    anagraphics_id: Optional[int] = None
    description_contains: Optional[str] = Field(None, max_length=100)
    unreconciled_only: bool = Field(default=False)
    hide_pos: bool = Field(default=False, description="Nascondi pagamenti POS")
    hide_worldline: bool = Field(default=False, description="Nascondi Worldline")
    hide_cash: bool = Field(default=False, description="Nascondi contanti")
    hide_commissions: bool = Field(default=False, description="Nascondi commissioni")
    enhanced: Optional[bool] = Field(default=False, description="Return enhanced response format with AI insights")
    include_summary: Optional[bool] = Field(default=False, description="Include summary statistics")
    enable_ai_insights: Optional[bool] = Field(default=False, description="Include AI insights for each transaction")
    cache_enabled: Optional[bool] = Field(default=True, description="Enable intelligent caching")
    search: Optional[str] = Field(None, min_length=2, max_length=200, description="Search in description")
    start_date: Optional[date] = Field(None, description="Filter by start date")
    end_date: Optional[date] = Field(None, description="Filter by end date")
    status_filter: Optional[str] = Field(None, description="Filter by reconciliation status") # Modificato da ReconciliationStatus a str
    anagraphics_id_heuristic: Optional[int] = Field(None, gt=0, description="Filter by likely anagraphics ID")

    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

    @validator('date_to')
    def date_to_after_date_from(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('date_to must be after date_from')
        return v
    
    @validator('amount_max')
    def amount_max_greater_than_min(cls, v, values):
        if v and values.get('amount_min') and v < values['amount_min']:
            raise ValueError('amount_max must be greater than amount_min')
        return v

    @validator('search')
    def validate_search_length(cls, v):
        if v and len(v.strip()) < 2:
            raise ValueError('Search query must be at least 2 characters')
        return v.strip() if v else v

class TransactionBulkOperation(BaseModel, BaseConfig):
    """Operazione massiva su transazioni"""
    transaction_ids: List[int] = Field(..., min_items=1, max_items=1000)
    operation: str = Field(..., description="Operazione: categorize, reconcile, mark_ignored")
    parameters: Dict[str, Any] = Field(default={}, description="Parametri operazione")

class BankStatementImport(BaseModel, BaseConfig):
    """Importazione estratto conto con supporto ZIP"""
    file_name: str
    bank_account_id: int
    statement_date: date
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    transactions_count: int = Field(default=0)
    import_successful: bool = Field(default=False)
    import_errors: List[str] = Field(default=[])
    duplicates_found: int = Field(default=0)
    new_transactions: int = Field(default=0)
    is_zip_archive: bool = Field(default=False, description="File ZIP contenente più estratti")
    zip_files_processed: List[str] = Field(default=[], description="File processati dallo ZIP")
    zip_extraction_errors: List[str] = Field(default=[], description="Errori estrazione ZIP")

__all__ = [
    'TransactionType', 'TransactionCategory', 'BankAccount', 'TransactionRule',
    'TransactionBase', 'TransactionCreate', 'TransactionUpdate', 'TransactionFull',
    'TransactionImport', 'TransactionMatch', 'TransactionSummary', 'TransactionAnalytics',
    'TransactionFilter', 'TransactionBulkOperation', 'BankStatementImport'
]
