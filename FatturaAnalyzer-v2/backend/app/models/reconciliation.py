"""
Modelli Pydantic specifici per la riconciliazione - VERSIONE ENTERPRISE
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from . import BaseConfig  # Importa la configurazione base dal __init__.py

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
    operation_type: str = Field(..., pattern="^(1_to_1|n_to_m|smart_client|auto|ultra_smart)$")
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
    priority: str = Field("normal", pattern="^(low|normal|high|urgent)$")
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
    requests: List[UltraReconciliationRequest] = Field(..., min_length=1, max_items=50)
    parallel_execution: bool = Field(True)
    enable_cross_request_optimization: bool = Field(True, description="Optimize across requests")
    enable_intelligent_prioritization: bool = Field(True, description="AI-based request prioritization")
    timeout_seconds: int = Field(300, ge=30, le=600)
    max_concurrent_operations: int = Field(10, ge=1, le=20)
    enable_batch_caching: bool = Field(True, description="Enable batch-level caching")
    cache_sharing: bool = Field(True, description="Share cache between requests")
