"""
Modelli Pydantic specifici per la riconciliazione - VERSIONE PERFETTA E AGGIORNATA
File: app/models/reconciliation.py
Compatibile con Pydantic v2 e ottimizzato per performance
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any, Union, Literal
from enum import Enum
from pydantic import BaseModel, Field, field_validator, ConfigDict

class BaseConfig:
    """Configurazione base per tutti i modelli Pydantic"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True,
        arbitrary_types_allowed=True,
        extra='forbid'  # Migliora la validazione
    )

class OperationType(str, Enum):
    """Tipo di operazione riconciliazione"""
    ONE_TO_ONE = "1_to_1"
    N_TO_M = "n_to_m"
    SMART_CLIENT = "smart_client"
    AUTO = "auto"
    ULTRA_SMART = "ultra_smart"

class MatchType(str, Enum):
    """Tipo di match per riconciliazione"""
    EXACT = "Exact"
    AMOUNT_EXACT = "Amount_Exact"
    AMOUNT_CLOSE = "Amount_Close"
    PARTIAL = "Partial"
    SPLIT = "Split"
    MERGE = "Merge"
    MANUAL = "Manual"

class ConfidenceLevel(str, Enum):
    """Livello di confidenza match"""
    HIGH = "Alta"
    MEDIUM = "Media"
    LOW = "Bassa"

class Priority(str, Enum):
    """Livelli di priorità"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class RiskLevel(str, Enum):
    """Livelli di rischio"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProcessingStatus(str, Enum):
    """Stati di processamento"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class UltraReconciliationRequest(BaseModel, BaseConfig):
    """Request model per reconciliation V4.0 con tutte le opzioni avanzate"""
    operation_type: OperationType = Field(..., description="Tipo di operazione riconciliazione")
    invoice_id: Optional[int] = Field(None, gt=0, description="ID fattura specifica")
    transaction_id: Optional[int] = Field(None, gt=0, description="ID transazione specifica")
    anagraphics_id_filter: Optional[int] = Field(None, gt=0, description="Filtro per anagrafica")
    
    # AI/ML Options
    enable_ai_enhancement: bool = Field(True, description="Abilita miglioramenti AI/ML")
    enable_smart_patterns: bool = Field(True, description="Abilita riconoscimento pattern intelligenti")
    enable_predictive_scoring: bool = Field(True, description="Abilita scoring predittivo")
    enable_parallel_processing: bool = Field(True, description="Abilita elaborazione parallela")
    enable_caching: bool = Field(True, description="Abilita cache intelligente")
    
    # Performance & Limits
    confidence_threshold: float = Field(0.6, ge=0.0, le=1.0, description="Soglia di confidenza minima")
    max_suggestions: int = Field(20, ge=1, le=100, description="Numero massimo suggerimenti")
    max_combination_size: int = Field(6, ge=1, le=10, description="Dimensione massima combinazioni")
    max_search_time_ms: int = Field(60000, ge=1000, le=120000, description="Tempo massimo ricerca (ms)")
    
    # Filters
    exclude_invoice_ids: Optional[List[int]] = Field(None, description="IDs fatture da escludere")
    start_date: Optional[date] = Field(None, description="Data inizio periodo")
    end_date: Optional[date] = Field(None, description="Data fine periodo")
    
    # Processing Options
    priority: Priority = Field(Priority.NORMAL, description="Priorità elaborazione")
    real_time: bool = Field(False, description="Forza elaborazione real-time (bypassa cache)")
    include_low_confidence: bool = Field(False, description="Includi match a bassa confidenza")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        if v and info.data.get('start_date') and v < info.data['start_date']:
            raise ValueError('end_date deve essere successiva a start_date')
        return v
    
    @field_validator('exclude_invoice_ids')
    @classmethod
    def validate_exclude_ids(cls, v):
        if v and len(v) > 1000:
            raise ValueError('Troppi IDs da escludere (max 1000)')
        return v

class ManualMatchRequestV4(BaseModel, BaseConfig):
    """Manual match request V4.0 con AI validation"""
    invoice_id: int = Field(..., gt=0, description="ID fattura")
    transaction_id: int = Field(..., gt=0, description="ID transazione")
    amount_to_match: float = Field(..., gt=0, description="Importo da riconciliare")
    
    # AI Options
    enable_ai_validation: bool = Field(True, description="Abilita pre-validazione AI")
    enable_learning: bool = Field(True, description="Abilita apprendimento da match")
    force_match: bool = Field(False, description="Forza match anche se AI suggerisce rischi")
    
    # User Input
    user_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidenza utente nel match")
    notes: Optional[str] = Field(None, max_length=500, description="Note aggiuntive")
    override_warnings: bool = Field(False, description="Ignora avvertimenti del sistema")
    
    # Metadata
    source: str = Field("manual", description="Fonte del match")
    user_id: Optional[str] = Field(None, description="ID utente che effettua il match")
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        if v and len(v.strip()) < 3:
            raise ValueError('Le note devono essere almeno 3 caratteri se specificate')
        return v.strip() if v else v

class BatchReconciliationRequestV4(BaseModel, BaseConfig):
    """Batch request V4.0 con ottimizzazioni avanzate"""
    requests: List[UltraReconciliationRequest] = Field(..., min_length=1, max_length=50, description="Lista richieste")
    
    # Execution Options
    parallel_execution: bool = Field(True, description="Esecuzione parallela")
    enable_cross_request_optimization: bool = Field(True, description="Ottimizzazione tra richieste")
    enable_intelligent_prioritization: bool = Field(True, description="Prioritizzazione AI")
    
    # Performance
    timeout_seconds: int = Field(300, ge=30, le=600, description="Timeout in secondi")
    max_concurrent_operations: int = Field(10, ge=1, le=20, description="Operazioni concorrenti max")
    
    # Caching
    enable_batch_caching: bool = Field(True, description="Cache a livello batch")
    cache_sharing: bool = Field(True, description="Condivisione cache tra richieste")
    cache_ttl_minutes: int = Field(30, ge=1, le=240, description="TTL cache in minuti")
    
    # Monitoring
    enable_progress_tracking: bool = Field(True, description="Tracciamento progresso")
    batch_id: Optional[str] = Field(None, description="ID batch per tracking")
    
    @field_validator('requests')
    @classmethod
    def validate_requests_not_empty(cls, v):
        if not v:
            raise ValueError('La lista delle richieste non può essere vuota')
        return v

class ReconciliationSuggestion(BaseModel, BaseConfig):
    """Suggestion per riconciliazione con dettagli estesi"""
    # Core Match Info
    confidence: ConfidenceLevel = Field(..., description="Livello confidenza")
    confidence_score: float = Field(..., ge=0, le=1, description="Punteggio confidenza numerico")
    invoice_ids: List[int] = Field(..., min_length=1, description="IDs fatture coinvolte")
    transaction_ids: Optional[List[int]] = Field(None, description="IDs transazioni coinvolte")
    
    # Match Details
    description: str = Field(..., min_length=1, description="Descrizione match")
    total_amount: float = Field(..., description="Importo totale del match")
    match_type: Optional[MatchType] = Field(None, description="Tipo di match")
    
    # Enhanced Info
    match_details: Optional[Dict[str, Any]] = Field(None, description="Dettagli tecnici match")
    reasons: List[str] = Field(default_factory=list, description="Ragioni del match")
    warnings: List[str] = Field(default_factory=list, description="Avvertimenti")
    
    # AI Enhancement Flags
    ai_enhanced: bool = Field(False, description="Migliorato con AI")
    smart_enhanced: bool = Field(False, description="Migliorato con pattern intelligenti")
    ml_scored: bool = Field(False, description="Scored con Machine Learning")
    
    # Risk Assessment
    risk_level: RiskLevel = Field(RiskLevel.LOW, description="Livello di rischio")
    risk_factors: List[str] = Field(default_factory=list, description="Fattori di rischio")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Timestamp creazione")
    expires_at: Optional[datetime] = Field(None, description="Scadenza suggestion")

class ReconciliationResponse(BaseModel, BaseConfig):
    """Response model per reconciliation operations"""
    success: bool = Field(..., description="Successo operazione")
    message: str = Field(..., description="Messaggio di risposta")
    
    # Data
    suggestions: Optional[List[ReconciliationSuggestion]] = Field(None, description="Lista suggerimenti")
    total_suggestions: int = Field(default=0, ge=0, description="Numero totale suggerimenti")
    
    # Performance Metrics
    processing_time_ms: Optional[float] = Field(None, ge=0, description="Tempo elaborazione (ms)")
    cache_hit: bool = Field(default=False, description="Cache hit")
    cache_key: Optional[str] = Field(None, description="Chiave cache utilizzata")
    
    # System Info
    adapter_version: str = Field(default="4.0", description="Versione adapter")
    ai_enhanced: bool = Field(default=False, description="Elaborazione AI utilizzata")
    processing_node: Optional[str] = Field(None, description="Nodo di elaborazione")
    
    # Quality Metrics
    average_confidence: Optional[float] = Field(None, ge=0, le=1, description="Confidenza media")
    high_confidence_count: int = Field(default=0, ge=0, description="Suggerimenti alta confidenza")
    
    # Request Context
    request_id: Optional[str] = Field(None, description="ID richiesta")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp risposta")

class ReconciliationStatus(BaseModel, BaseConfig):
    """Status del sistema di riconciliazione"""
    status: ProcessingStatus = Field(..., description="Stato corrente del sistema")
    adapter_version: str = Field(..., description="Versione adapter")
    
    # Features
    features_available: List[str] = Field(..., description="Funzionalità disponibili")
    ai_features_enabled: bool = Field(default=True, description="Funzionalità AI abilitate")
    
    # Performance
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="Metriche performance")
    current_load: float = Field(default=0.0, ge=0, le=1, description="Carico corrente sistema")
    
    # Health
    health_score: float = Field(default=1.0, ge=0, le=1, description="Punteggio salute sistema")
    last_updated: datetime = Field(default_factory=datetime.now, description="Ultimo aggiornamento")
    uptime_seconds: Optional[int] = Field(None, ge=0, description="Uptime in secondi")

class ClientReliabilityAnalysis(BaseModel, BaseConfig):
    """Analisi affidabilità cliente avanzata"""
    anagraphics_id: int = Field(..., gt=0, description="ID anagrafica")
    
    # Core Metrics
    reliability_score: float = Field(..., ge=0.0, le=1.0, description="Punteggio affidabilità")
    risk_level: RiskLevel = Field(..., description="Livello di rischio")
    
    # Payment History
    payment_history: Dict[str, Any] = Field(..., description="Storico pagamenti")
    average_payment_delay: Optional[float] = Field(None, description="Ritardo medio pagamenti (giorni)")
    payment_consistency: float = Field(default=0.0, ge=0, le=1, description="Consistenza pagamenti")
    
    # Predictions
    risk_assessment: str = Field(..., description="Valutazione rischio testuale")
    recommendations: List[str] = Field(..., description="Raccomandazioni")
    predicted_payment_behavior: Optional[str] = Field(None, description="Comportamento predetto")
    
    # AI Insights
    ai_insights: Optional[Dict[str, Any]] = Field(None, description="Insights AI")
    confidence_in_analysis: float = Field(default=0.8, ge=0, le=1, description="Confidenza nell'analisi")
    
    # Context
    analysis_date: datetime = Field(default_factory=datetime.now, description="Data analisi")
    data_points_analyzed: int = Field(default=0, ge=0, description="Punti dati analizzati")

class AutoReconciliationTrigger(BaseModel, BaseConfig):
    """Trigger per auto-reconciliation avanzato"""
    # Core Settings
    confidence_threshold: float = Field(0.9, ge=0.0, le=1.0, description="Soglia confidenza minima")
    max_matches: int = Field(100, ge=1, le=1000, description="Numero massimo match")
    
    # AI Options
    enable_ai_filtering: bool = Field(True, description="Abilita filtri AI")
    enable_risk_assessment: bool = Field(True, description="Abilita valutazione rischio")
    enable_pattern_learning: bool = Field(True, description="Abilita apprendimento pattern")
    
    # Safety
    dry_run: bool = Field(False, description="Simula senza riconciliazione effettiva")
    require_manual_approval: bool = Field(False, description="Richiedi approvazione manuale")
    max_amount_threshold: Optional[float] = Field(None, gt=0, description="Soglia importo massimo")
    
    # Scheduling
    schedule_execution: bool = Field(False, description="Pianifica esecuzione")
    execution_time: Optional[datetime] = Field(None, description="Orario esecuzione pianificata")
    
    # Monitoring
    enable_notifications: bool = Field(True, description="Abilita notifiche")
    notification_email: Optional[str] = Field(None, description="Email per notifiche")
    
    @field_validator('execution_time')
    @classmethod
    def validate_execution_time(cls, v):
        if v and v <= datetime.now():
            raise ValueError('execution_time deve essere nel futuro')
        return v

class ReconciliationMetrics(BaseModel, BaseConfig):
    """Metriche di riconciliazione complete"""
    # Core Metrics
    total_processed: int = Field(default=0, ge=0, description="Totale elaborati")
    successful_matches: int = Field(default=0, ge=0, description="Match riusciti")
    failed_matches: int = Field(default=0, ge=0, description="Match falliti")
    
    # Match Types
    auto_matches: int = Field(default=0, ge=0, description="Match automatici")
    manual_matches: int = Field(default=0, ge=0, description="Match manuali")
    ai_assisted_matches: int = Field(default=0, ge=0, description="Match assistiti da AI")
    
    # Quality Metrics
    success_rate: float = Field(default=0.0, ge=0, le=1, description="Tasso di successo")
    average_confidence: float = Field(default=0.0, ge=0, le=1, description="Confidenza media")
    accuracy_score: float = Field(default=0.0, ge=0, le=1, description="Punteggio accuratezza")
    
    # Performance
    processing_time_total: float = Field(default=0.0, ge=0, description="Tempo totale elaborazione")
    average_processing_time: float = Field(default=0.0, ge=0, description="Tempo medio elaborazione")
    cache_hit_rate: float = Field(default=0.0, ge=0, le=1, description="Tasso hit cache")
    
    # Period Info
    period_start: datetime = Field(..., description="Inizio periodo")
    period_end: datetime = Field(..., description="Fine periodo")
    period_duration_hours: float = Field(default=0.0, ge=0, description="Durata periodo (ore)")
    
    # Trends
    trend_direction: Literal["up", "down", "stable"] = Field(default="stable", description="Direzione trend")
    improvement_rate: float = Field(default=0.0, description="Tasso di miglioramento")

class ReconciliationAuditLog(BaseModel, BaseConfig):
    """Log di audit per riconciliazioni"""
    id: Optional[str] = Field(None, description="ID univoco log")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp operazione")
    
    # Operation Info
    operation_type: str = Field(..., description="Tipo operazione")
    user_id: Optional[str] = Field(None, description="ID utente")
    invoice_id: Optional[int] = Field(None, description="ID fattura")
    transaction_id: Optional[int] = Field(None, description="ID transazione")
    
    # Change Details
    before_state: Optional[Dict[str, Any]] = Field(None, description="Stato precedente")
    after_state: Optional[Dict[str, Any]] = Field(None, description="Stato successivo")
    changes_made: List[str] = Field(default_factory=list, description="Modifiche effettuate")
    
    # Context
    reason: Optional[str] = Field(None, description="Motivo operazione")
    automated: bool = Field(False, description="Operazione automatica")
    confidence_score: Optional[float] = Field(None, description="Punteggio confidenza")
    
    # System Info
    system_version: str = Field(default="4.0", description="Versione sistema")
    ip_address: Optional[str] = Field(None, description="Indirizzo IP")
    user_agent: Optional[str] = Field(None, description="User agent")

# Export all models
__all__ = [
    # Enums
    'OperationType', 'MatchType', 'ConfidenceLevel', 'Priority', 'RiskLevel', 'ProcessingStatus',
    
    # Request Models
    'UltraReconciliationRequest', 'ManualMatchRequestV4', 'BatchReconciliationRequestV4', 'AutoReconciliationTrigger',
    
    # Response Models
    'ReconciliationSuggestion', 'ReconciliationResponse', 'ReconciliationStatus', 'ReconciliationMetrics',
    
    # Analysis Models
    'ClientReliabilityAnalysis',
    
    # Audit Models
    'ReconciliationAuditLog'
]
