"""
Modelli Pydantic specifici per la riconciliazione - VERSIONE COMPLETA E FINALE
File: app/models/reconciliation.py
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from app.models import BaseConfig

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

class UltraReconciliationRequest(BaseModel, BaseConfig):
    """Request model per reconciliation V4.0 con tutte le opzioni avanzate"""
    operation_type: OperationType
    invoice_id: Optional[int] = Field(None, gt=0)
    transaction_id: Optional[int] = Field(None, gt=0)
    anagraphics_id_filter: Optional[int] = Field(None, gt=0)
    enable_ai_enhancement: bool = Field(True, description="Enable AI/ML enhancements")
    enable_smart_patterns: bool = Field(True, description="Enable smart pattern recognition")
    enable_predictive_scoring: bool = Field(True, description="Enable predictive scoring")
    enable_parallel_processing: bool = Field(True, description="Enable parallel processing")
    enable_caching: bool = Field(True, description="Enable intelligent caching")
    confidence_threshold: float = Field(0.6, ge=0.0, le=1.0)
    max_suggestions: int = Field(20, ge=1, le=100)
    max_combination_size: int = Field(6, ge=1, le=10)
    max_search_time_ms: int = Field(60000, ge=1000, le=120000)
    exclude_invoice_ids: Optional[List[int]] = Field(None)
    start_date: Optional[str] = Field(None)
    end_date: Optional[str] = Field(None)
    priority: str = Field("normal", regex="^(low|normal|high|urgent)$")
    real_time: bool = Field(False, description="Force real-time processing (bypass cache)")

class ManualMatchRequestV4(BaseModel, BaseConfig):
    """Manual match request V4.0 con AI validation"""
    invoice_id: int = Field(..., gt=0)
    transaction_id: int = Field(..., gt=0)
    amount_to_match: float = Field(..., gt=0)
    enable_ai_validation: bool = Field(True, description="Enable AI pre-validation")
    enable_learning: bool = Field(True, description="Enable pattern learning from match")
    force_match: bool = Field(False, description="Force match even if AI suggests risks")
    user_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="User confidence in match")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

class BatchReconciliationRequestV4(BaseModel, BaseConfig):
    """Batch request V4.0 con ottimizzazioni avanzate"""
    requests: List[UltraReconciliationRequest] = Field(..., min_items=1, max_items=50)
    parallel_execution: bool = Field(True)
    enable_cross_request_optimization: bool = Field(True, description="Optimize across requests")
    enable_intelligent_prioritization: bool = Field(True, description="AI-based request prioritization")
    timeout_seconds: int = Field(300, ge=30, le=600)
    max_concurrent_operations: int = Field(10, ge=1, le=20)
    enable_batch_caching: bool = Field(True, description="Enable batch-level caching")
    cache_sharing: bool = Field(True, description="Share cache between requests")

class ReconciliationSuggestion(BaseModel, BaseConfig):
    """Suggestion per riconciliazione"""
    confidence: str = Field(..., description="Alta, Media, Bassa")
    confidence_score: float = Field(..., ge=0, le=1)
    invoice_ids: List[int]
    transaction_ids: Optional[List[int]] = None
    description: str
    total_amount: float
    match_details: Optional[Dict[str, Any]] = None
    reasons: Optional[List[str]] = []
    ai_enhanced: bool = Field(False, description="Enhanced with AI")
    smart_enhanced: bool = Field(False, description="Enhanced with smart patterns")
    match_type: Optional[MatchType] = None

class ReconciliationResponse(BaseModel, BaseConfig):
    """Response model per reconciliation operations"""
    success: bool
    message: str
    suggestions: Optional[List[ReconciliationSuggestion]] = None
    total_suggestions: int = Field(default=0)
    processing_time_ms: Optional[float] = None
    adapter_version: str = Field(default="4.0")
    ai_enhanced: bool = Field(default=False)
    cache_hit: bool = Field(default=False)

class ReconciliationStatus(BaseModel, BaseConfig):
    """Status del sistema di riconciliazione"""
    status: str
    adapter_version: str
    features_available: List[str]
    performance_metrics: Optional[Dict[str, Any]] = None
    last_updated: datetime

class ClientReliabilityAnalysis(BaseModel, BaseConfig):
    """Analisi affidabilità cliente"""
    anagraphics_id: int
    reliability_score: float = Field(ge=0.0, le=1.0)
    payment_history: Dict[str, Any]
    risk_assessment: str
    recommendations: List[str]
    ai_insights: Optional[Dict[str, Any]] = None

class AutoReconciliationTrigger(BaseModel, BaseConfig):
    """Trigger per auto-reconciliation"""
    confidence_threshold: float = Field(0.9, ge=0.0, le=1.0)
    max_matches: int = Field(100, ge=1, le=1000)
    enable_ai_filtering: bool = Field(True)
    enable_risk_assessment: bool = Field(True)
    dry_run: bool = Field(False, description="Simulate without actual reconciliation")

class ReconciliationMetrics(BaseModel, BaseConfig):
    """Metriche di riconciliazione"""
    total_processed: int
    successful_matches: int
    failed_matches: int
    auto_matches: int
    manual_matches: int
    success_rate: float
    average_confidence: float
    processing_time_total: float
    cache_hit_rate: float

__all__ = [
    'OperationType', 'MatchType', 'ConfidenceLevel',
    'UltraReconciliationRequest', 'ManualMatchRequestV4', 'BatchReconciliationRequestV4',
    'ReconciliationSuggestion', 'ReconciliationResponse', 'ReconciliationStatus',
    'ClientReliabilityAnalysis', 'AutoReconciliationTrigger', 'ReconciliationMetrics'
]
