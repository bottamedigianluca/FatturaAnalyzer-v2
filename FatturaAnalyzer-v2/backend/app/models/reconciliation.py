# app/models/reconciliation.py
"""
Modelli Pydantic specifici per la riconciliazione
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, validator
from app.models import BaseConfig, PaymentStatus, ReconciliationStatus


class MatchType(str, Enum):
    """Tipo di match per riconciliazione"""
    EXACT = "Exact"  # Match esatto per importo e data
    AMOUNT_EXACT = "Amount_Exact"  # Solo importo esatto
    AMOUNT_CLOSE = "Amount_Close"  # Importo simile (entro tolleranza)
    PARTIAL = "Partial"  # Match parziale
    SPLIT = "Split"  # Una fattura, più transazioni
    MERGE = "Merge"  # Più fatture, una transazione
    MANUAL = "Manual"  # Match manuale


class ConfidenceLevel(str, Enum):
    """Livello di confidenza match"""
    HIGH = "Alta"  # > 80%
    MEDIUM = "Media"  # 50-80%
    LOW = "Bassa"  # < 50%


class ReconciliationMethod(str, Enum):
    """Metodo di riconciliazione"""
    AUTOMATIC = "Automatica"
    SEMI_AUTOMATIC = "Semi-Automatica"
    MANUAL = "Manuale"
    BULK = "Massiva"
    AI_ASSISTED = "AI-Assistita"


class ReconciliationRule(BaseModel, BaseConfig):
    """Regola per riconciliazione automatica"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Criteri matching
    amount_tolerance_percent: float = Field(default=0.0, ge=0, le=100, description="Tolleranza importo %")
    amount_tolerance_absolute: float = Field(default=0.01, ge=0, description="Tolleranza importo assoluta")
    date_tolerance_days: int = Field(default=30, ge=0, le=365, description="Tolleranza giorni")
    
    # Criteri descrizione
    description_matching: bool = Field(default=True, description="Abilita match descrizione")
    description_similarity_threshold: float = Field(default=0.7, ge=0, le=1, description="Soglia similarità")
    keywords: List[str] = Field(default=[], description="Parole chiave")
    
    # Filtri
    invoice_types: Optional[List[str]] = Field(None, description="Tipi fattura applicabili")
    anagraphics_ids: Optional[List[int]] = Field(None, description="Anagrafiche specifiche")
    amount_min: Optional[float] = Field(None, ge=0, description="Importo minimo")
    amount_max: Optional[float] = Field(None, ge=0, description="Importo massimo")
    
    # Configurazione
    is_active: bool = Field(default=True)
    priority: int = Field(default=100, ge=1, le=999, description="Priorità (1=massima)")
    auto_apply: bool = Field(default=False, description="Applica automaticamente se confidenza alta")
    confidence_threshold: float = Field(default=0.8, ge=0, le=1, description="Soglia confidenza per auto-apply")
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MatchScore(BaseModel, BaseConfig):
    """Punteggio di match per riconciliazione"""
    overall_score: float = Field(..., ge=0, le=1, description="Punteggio complessivo")
    amount_score: float = Field(..., ge=0, le=1, description="Punteggio importo")
    date_score: float = Field(..., ge=0, le=1, description="Punteggio data")
    description_score: float = Field(..., ge=0, le=1, description="Punteggio descrizione")
    anagraphics_score: float = Field(..., ge=0, le=1, description="Punteggio anagrafica")
    
    # Dettagli calcolo
    amount_difference: float = Field(..., description="Differenza importo")
    date_difference_days: int = Field(..., description="Differenza giorni")
    description_similarity: float = Field(..., ge=0, le=1, description="Similarità descrizione")
    
    # Fattori boost/penalty
    boost_factors: List[str] = Field(default=[], description="Fattori che aumentano il punteggio")
    penalty_factors: List[str] = Field(default=[], description="Fattori che riducono il punteggio")


class ReconciliationSuggestionExtended(BaseModel, BaseConfig):
    """Suggerimento di riconciliazione esteso"""
    id: Optional[str] = Field(None, description="ID univoco suggerimento")
    
    # Elementi coinvolti
    invoice_ids: List[int] = Field(..., min_items=1, description="IDs fatture")
    transaction_ids: List[int] = Field(..., min_items=1, description="IDs transazioni")
    
    # Scoring
    confidence: ConfidenceLevel = Field(..., description="Livello confidenza")
    confidence_score: float = Field(..., ge=0, le=1, description="Punteggio numerico")
    match_type: MatchType = Field(..., description="Tipo di match")
    match_score: MatchScore = Field(..., description="Dettaglio punteggi")
    
    # Dettagli match
    suggested_amount: float = Field(..., gt=0, description="Importo suggerito")
    description: str = Field(..., description="Descrizione match")
    reasons: List[str] = Field(default=[], description="Motivi del match")
    warnings: List[str] = Field(default=[], description="Avvertimenti")
    
    # Metadati
    created_at: datetime = Field(default_factory=datetime.now)
    rule_applied: Optional[str] = Field(None, description="Regola applicata")
    manual_review_required: bool = Field(default=False, description="Richiede revisione manuale")
    
    # Dati aggregati per display
    total_invoice_amount: float = Field(..., description="Totale fatture")
    total_transaction_amount: float = Field(..., description="Totale transazioni")
    counterparty_name: Optional[str] = Field(None, description="Nome controparte")
    
    # Relazioni
    invoices_data: List[Dict[str, Any]] = Field(default=[], description="Dati fatture")
    transactions_data: List[Dict[str, Any]] = Field(default=[], description="Dati transazioni")


class ReconciliationLinkExtended(BaseModel, BaseConfig):
    """Link di riconciliazione esteso"""
    id: Optional[int] = None
    
    # Elementi collegati
    invoice_id: int = Field(..., gt=0)
    transaction_id: int = Field(..., gt=0)
    
    # Dettagli riconciliazione
    reconciled_amount: float = Field(..., gt=0, description="Importo riconciliato")
    reconciliation_date: datetime = Field(default_factory=datetime.now)
    reconciliation_method: ReconciliationMethod = Field(..., description="Metodo utilizzato")
    
    # Metadati
    notes: Optional[str] = Field(None, max_length=1000, description="Note")
    created_by: Optional[str] = Field(None, max_length=100, description="Creato da")
    approved_by: Optional[str] = Field(None, max_length=100, description="Approvato da")
    approval_date: Optional[datetime] = None
    
    # Tracciamento
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Confidenza originale")
    rule_applied: Optional[str] = Field(None, max_length=100, description="Regola applicata")
    manual_adjustments: Optional[Dict[str, Any]] = Field(None, description="Aggiustamenti manuali")
    
    # Status
    is_active: bool = Field(default=True)
    is_disputed: bool = Field(default=False, description="In contestazione")
    dispute_reason: Optional[str] = Field(None, max_length=500)
    dispute_date: Optional[datetime] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Dati correlati (per display)
    invoice_data: Optional[Dict[str, Any]] = None
    transaction_data: Optional[Dict[str, Any]] = None
    counterparty_name: Optional[str] = None


class ReconciliationBatch(BaseModel, BaseConfig):
    """Batch di riconciliazioni"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Configurazione batch
    batch_type: str = Field(..., description="Tipo batch: auto, manual, scheduled")
    criteria: Dict[str, Any] = Field(default={}, description="Criteri selezione")
    
    # Risultati
    total_suggestions: int = Field(default=0)
    processed_suggestions: int = Field(default=0)
    successful_reconciliations: int = Field(default=0)
    failed_reconciliations: int = Field(default=0)
    total_amount_reconciled: float = Field(default=0.0)
    
    # Status
    status: str = Field(default="Pending", description="Stato: Pending, Running, Completed, Failed")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    
    # Errori
    errors: List[str] = Field(default=[], description="Errori riscontrati")
    warnings: List[str] = Field(default=[], description="Avvertimenti")
    
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = None


class ReconciliationReport(BaseModel, BaseConfig):
    """Report riconciliazione"""
    report_type: str = Field(..., description="Tipo report")
    period_from: date
    period_to: date
    
    # Statistiche generali
    total_invoices: int = Field(default=0)
    total_transactions: int = Field(default=0)
    total_reconciled: int = Field(default=0)
    reconciliation_rate: float = Field(default=0.0, ge=0, le=100, description="Tasso riconciliazione %")
    
    # Per metodo
    by_method: Dict[str, Dict[str, Union[int, float]]] = Field(default={})
    
    # Per confidenza
    by_confidence: Dict[str, Dict[str, Union[int, float]]] = Field(default={})
    
    # Per importo
    amount_ranges: List[Dict[str, Any]] = Field(default=[])
    
    # Trend temporali
    daily_stats: List[Dict[str, Any]] = Field(default=[])
    monthly_stats: List[Dict[str, Any]] = Field(default=[])
    
    # Top performing
    top_rules: List[Dict[str, Any]] = Field(default=[])
    top_counterparties: List[Dict[str, Any]] = Field(default=[])
    
    # Issues
    unreconciled_items: List[Dict[str, Any]] = Field(default=[])
    disputed_reconciliations: List[Dict[str, Any]] = Field(default=[])
    
    generated_at: datetime = Field(default_factory=datetime.now)
    generated_by: Optional[str] = None


class ReconciliationWorkflow(BaseModel, BaseConfig):
    """Workflow di riconciliazione"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    # Steps del workflow
    steps: List[Dict[str, Any]] = Field(..., min_items=1, description="Passi del workflow")
    
    # Configurazione
    is_active: bool = Field(default=True)
    is_automatic: bool = Field(default=False, description="Esecuzione automatica")
    schedule_cron: Optional[str] = Field(None, description="Scheduling cron")
    
    # Notifiche
    notify_on_completion: bool = Field(default=True)
    notify_on_errors: bool = Field(default=True)
    notification_emails: List[str] = Field(default=[])
    
    # Risultati ultima esecuzione
    last_run_date: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_run_results: Optional[Dict[str, Any]] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ReconciliationAudit(BaseModel, BaseConfig):
    """Audit trail per riconciliazioni"""
    id: Optional[int] = None
    
    # Riferimenti
    reconciliation_link_id: Optional[int] = None
    invoice_id: Optional[int] = None
    transaction_id: Optional[int] = None
    
    # Azione
    action: str = Field(..., max_length=50, description="Azione: create, update, delete, approve, dispute")
    action_details: Optional[Dict[str, Any]] = Field(None, description="Dettagli azione")
    
    # Valori prima/dopo
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    
    # Metadati
    performed_by: Optional[str] = Field(None, max_length=100)
    performed_at: datetime = Field(default_factory=datetime.now)
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = Field(None, max_length=500)
    
    # Risultato
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(None, max_length=1000)


class ReconciliationFilter(BaseModel, BaseConfig):
    """Filtri per ricerca riconciliazioni"""
    # Date
    reconciliation_date_from: Optional[date] = None
    reconciliation_date_to: Optional[date] = None
    invoice_date_from: Optional[date] = None
    invoice_date_to: Optional[date] = None
    transaction_date_from: Optional[date] = None
    transaction_date_to: Optional[date] = None
    
    # Importi
    amount_min: Optional[float] = Field(None, ge=0)
    amount_max: Optional[float] = Field(None, ge=0)
    
    # Metodi e tipi
    reconciliation_methods: Optional[List[ReconciliationMethod]] = None
    match_types: Optional[List[MatchType]] = None
    confidence_levels: Optional[List[ConfidenceLevel]] = None
    
    # Status
    is_active: Optional[bool] = None
    is_disputed: Optional[bool] = None
    
    # Anagrafiche
    anagraphics_ids: Optional[List[int]] = None
    counterparty_search: Optional[str] = Field(None, max_length=200)
    
    # Utenti
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    
    # Metadati
    has_notes: Optional[bool] = None
    rule_applied: Optional[str] = None


class ReconciliationStats(BaseModel, BaseConfig):
    """Statistiche riconciliazione"""
    # Contatori generali
    total_reconciliations: int = Field(default=0)
    active_reconciliations: int = Field(default=0)
    disputed_reconciliations: int = Field(default=0)
    
    # Per metodo
    automatic_reconciliations: int = Field(default=0)
    manual_reconciliations: int = Field(default=0)
    ai_assisted_reconciliations: int = Field(default=0)
    
    # Per confidenza
    high_confidence_reconciliations: int = Field(default=0)
    medium_confidence_reconciliations: int = Field(default=0)
    low_confidence_reconciliations: int = Field(default=0)
    
    # Importi
    total_amount_reconciled: float = Field(default=0.0)
    average_reconciliation_amount: float = Field(default=0.0)
    largest_reconciliation_amount: float = Field(default=0.0)
    
    # Tempi
    average_processing_time_hours: float = Field(default=0.0)
    fastest_reconciliation_minutes: Optional[float] = None
    slowest_reconciliation_hours: Optional[float] = None
    
    # Efficienza
    reconciliation_accuracy: float = Field(default=0.0, ge=0, le=100, description="Accuratezza %")
    automation_rate: float = Field(default=0.0, ge=0, le=100, description="Tasso automazione %")
    dispute_rate: float = Field(default=0.0, ge=0, le=100, description="Tasso contestazioni %")
    
    # Tendenze
    reconciliations_last_7_days: int = Field(default=0)
    reconciliations_last_30_days: int = Field(default=0)
    trend_percentage: float = Field(default=0.0, description="% variazione rispetto periodo precedente")


class ReconciliationExport(BaseModel, BaseConfig):
    """Configurazione export riconciliazioni"""
    export_type: str = Field(..., description="Tipo export: summary, detailed, audit")
    format: str = Field(..., description="Formato: csv, excel, pdf, json")
    
    # Filtri
    filters: ReconciliationFilter = Field(default_factory=ReconciliationFilter)
    
    # Campi da includere
    include_invoice_details: bool = Field(default=True)
    include_transaction_details: bool = Field(default=True)
    include_counterparty_details: bool = Field(default=True)
    include_scoring_details: bool = Field(default=False)
    include_audit_trail: bool = Field(default=False)
    
    # Configurazione
    group_by: Optional[str] = Field(None, description="Raggruppa per: month, counterparty, method")
    sort_by: str = Field(default="reconciliation_date", description="Campo ordinamento")
    sort_order: str = Field(default="desc", description="Ordine: asc, desc")
    
    # Metadati
    requested_by: Optional[str] = None
    requested_at: datetime = Field(default_factory=datetime.now)


# Export all reconciliation models
__all__ = [
    'MatchType', 'ConfidenceLevel', 'ReconciliationMethod', 'ReconciliationRule',
    'MatchScore', 'ReconciliationSuggestionExtended', 'ReconciliationLinkExtended',
    'ReconciliationBatch', 'ReconciliationReport', 'ReconciliationWorkflow',
    'ReconciliationAudit', 'ReconciliationFilter', 'ReconciliationStats',
    'ReconciliationExport'
]
