e questo?
"""
Transactions API endpoints - Versione V4.0 Parte 1/4
IMPORTS, SETUP, CACHE E MODELLI BASE
"""

import logging
import asyncio
import time
import uuid
import hashlib
import json
from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import pandas as pd
import numpy as np
from io import StringIO, BytesIO

from fastapi import APIRouter, HTTPException, Query, Path, Body, BackgroundTasks, Request, Depends
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, validator, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import structlog

# Models - importati direttamente per evitare loop
from app.models import (
    BankTransaction, BankTransactionCreate, BankTransactionUpdate,
    TransactionFilter, PaginationParams, TransactionListResponse,
    APIResponse, ReconciliationStatus
)

# ================== IMPORT HELPERS (evita loop import) ==================

def get_db_adapter():
    """Import dinamico per evitare loop"""
    from app.adapters.database_adapter import db_adapter
    return db_adapter

def get_reconciliation_adapter_v4():
    """Import dinamico per evitare loop"""
    from app.adapters.reconciliation_adapter import get_reconciliation_adapter_v4
    return get_reconciliation_adapter_v4()

# ================== SETUP LOGGING E ROUTER ==================

logger = structlog.get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

# ================== CACHE SYSTEM V4.0 ==================

class TransactionStatsCache:
    """Cache ottimizzato con pattern learning V4.0"""
    def __init__(self, ttl_minutes=5):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self.hit_count = 0
        self.miss_count = 0
        self.access_patterns = {}
    
    def get_stats(self, cache_key="default"):
        now = datetime.now()
        if (cache_key not in self.cache or 
            now - self.cache[cache_key]['timestamp'] > self.ttl):
            self.miss_count += 1
            return None
        
        self.hit_count += 1
        self._update_access_pattern(cache_key)
        return self.cache[cache_key]['data']
    
    def set_stats(self, data, cache_key="default"):
        self.cache[cache_key] = {
            'data': data,
            'timestamp': datetime.now(),
            'access_count': 1
        }
    
    def _update_access_pattern(self, cache_key):
        if cache_key not in self.access_patterns:
            self.access_patterns[cache_key] = 0
        self.access_patterns[cache_key] += 1
        if cache_key in self.cache:
            self.cache[cache_key]['access_count'] += 1
    
    def get_hit_rate(self):
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0.0
    
    def get_cache_stats(self):
        return {
            'hit_rate': self.get_hit_rate(),
            'cache_size': len(self.cache),
            'access_patterns': self.access_patterns,
            'total_hits': self.hit_count,
            'total_misses': self.miss_count
        }

stats_cache = TransactionStatsCache()

# ================== MODELS V4.0 ==================

class TransactionFilters(BaseModel):
    """Filtri avanzati per transazioni con validazione V4.0"""
    status_filter: Optional[ReconciliationStatus] = Field(None, description="Filter by reconciliation status")
    search: Optional[str] = Field(None, min_length=2, max_length=200, description="Search in description")
    start_date: Optional[date] = Field(None, description="Filter by start date")
    end_date: Optional[date] = Field(None, description="Filter by end date")
    min_amount: Optional[float] = Field(None, ge=0, description="Minimum amount filter")
    max_amount: Optional[float] = Field(None, ge=0, description="Maximum amount filter")
    anagraphics_id_heuristic: Optional[int] = Field(None, gt=0, description="Filter by likely anagraphics ID")
    hide_pos: bool = Field(False, description="Hide POS transactions")
    hide_worldline: bool = Field(False, description="Hide Worldline transactions")
    hide_cash: bool = Field(False, description="Hide cash transactions")
    hide_commissions: bool = Field(False, description="Hide bank commissions")
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v
    
    @validator('max_amount')
    def max_greater_than_min(cls, v, values):
        if v and values.get('min_amount') and v < values['min_amount']:
            raise ValueError('max_amount must be greater than min_amount')
        return v

class EnhancedTransactionResponse(BaseModel):
    """Response model avanzato V4.0"""
    id: int
    transaction_date: str
    value_date: Optional[str]
    amount: float
    remaining_amount: float
    description: Optional[str]
    causale_abi: Optional[str]
    reconciliation_status: str
    reconciled_amount: float
    is_income: bool
    is_expense: bool
    unique_hash: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Campi V4.0 Enhanced
    ai_insights: Optional[Dict[str, Any]] = None
    smart_suggestions_available: bool = False
    pattern_strength: Optional[float] = None
    potential_client: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class BatchUpdateRequest(BaseModel):
    """Richiesta batch update V4.0"""
    transaction_ids: List[int] = Field(..., min_items=1, max_items=1000)
    reconciliation_status: ReconciliationStatus
    
    @validator('transaction_ids')
    def validate_transaction_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate transaction IDs not allowed')
        return v

class BatchReconciliationRequest(BaseModel):
    """Richiesta batch reconciliation V4.0"""
    reconciliation_pairs: List[Dict[str, Any]] = Field(..., min_items=1, max_items=200)
    enable_ai_validation: bool = Field(True, description="Enable AI validation")
    enable_parallel_processing: bool = Field(True, description="Enable parallel processing")
    force_background: bool = Field(False, description="Force background processing")

class TransactionInsightRequest(BaseModel):
    """Richiesta insights transazione V4.0"""
    include_ai_analysis: bool = Field(True, description="Include AI analysis")
    include_pattern_matching: bool = Field(True, description="Include pattern matching")
    include_client_analysis: bool = Field(True, description="Include client analysis")
    include_smart_suggestions: bool = Field(False, description="Include smart suggestions")

# ================== BACKGROUND TASKS MANAGER V4.0 ==================

background_tasks_status = {}

class BackgroundTasksManager:
    """Manager per background tasks V4.0"""
    
    @staticmethod
    def create_task(task_type: str, params: Dict) -> str:
        task_id = str(uuid.uuid4())
        background_tasks_status[task_id] = {
            'task_id': task_id,
            'type': task_type,
            'status': 'created',
            'created_at': datetime.now(),
            'params': params,
            'progress': 0,
            'total': params.get('total_items', 0),
            'adapter_version': '4.0'
        }
        return task_id
    
    @staticmethod
    def update_task(task_id: str, updates: Dict):
        if task_id in background_tasks_status:
            background_tasks_status[task_id].update(updates)
            background_tasks_status[task_id]['updated_at'] = datetime.now()
    
    @staticmethod
    def complete_task(task_id: str, results: Dict):
        if task_id in background_tasks_status:
            background_tasks_status[task_id].update({
                'status': 'completed',
                'completed_at': datetime.now(),
                'results': results
            })
    
    @staticmethod
    def fail_task(task_id: str, error: str):
        if task_id in background_tasks_status:
            background_tasks_status[task_id].update({
                'status': 'failed',
                'failed_at': datetime.now(),
                'error': error
            })

# ================== PERFORMANCE UTILITIES ==================

def apply_dataframe_filters_vectorized(df: pd.DataFrame, filters: TransactionFilters) -> pd.DataFrame:
    """Applica filtri usando operazioni vettoriali ottimizzate"""
    if df.empty:
        return df
    
    filtered_df = df.copy()
    
    # Filtri numerici vettoriali
    if filters.min_amount is not None:
        filtered_df = filtered_df[filtered_df['amount'].abs() >= filters.min_amount]
    
    if filters.max_amount is not None:
        filtered_df = filtered_df[filtered_df['amount'].abs() <= filters.max_amount]
    
    # Filtro testo vettoriale
    if filters.search:
        search_mask = filtered_df['description'].str.contains(
            filters.search, case=False, na=False, regex=False
        )
        filtered_df = filtered_df[search_mask]
    
    return filtered_df

def calculate_enhanced_fields_vectorized(df: pd.DataFrame) -> pd.DataFrame:
    """Calcola campi aggiuntivi usando operazioni vettoriali"""
    if df.empty:
        return df
    
    # Operazioni vettoriali per performance
    df['remaining_amount'] = df['amount'] - df['reconciled_amount'].fillna(0)
    df['is_income'] = df['amount'] > 0
    df['is_expense'] = df['amount'] < 0
    
    return df

async def process_heavy_operations_async(df: pd.DataFrame, filters: TransactionFilters) -> pd.DataFrame:
    """Processa operazioni pesanti in thread pool"""
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Esegui filtri e calcoli in parallelo
        filter_task = loop.run_in_executor(executor, apply_dataframe_filters_vectorized, df, filters)
        filtered_df = await filter_task
        
        if not filtered_df.empty:
            calc_task = loop.run_in_executor(executor, calculate_enhanced_fields_vectorized, filtered_df)
            result_df = await calc_task
        else:
            result_df = filtered_df
    
    return result_df

# ================== DECORATORI PERFORMANCE ==================

def transaction_performance_tracked(operation_name: str):
    """Decoratore per tracking performance V4.0"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            
            try:
                result = await func(*args, **kwargs)
                execution_time = (time.perf_counter() - start_time) * 1000
                
                if execution_time > 5000:  # >5 secondi
                    logger.warning(
                        "Slow transaction operation V4.0",
                        operation=operation_name,
                        execution_time_ms=execution_time
                    )
                
                return result
                
            except Exception as e:
                execution_time = (time.perf_counter() - start_time) * 1000
                logger.error(
                    "Transaction operation failed V4.0",
                    operation=operation_name,
                    execution_time_ms=execution_time,
                    error=str(e)
                )
                raise
        
        return wrapper
    return decorator

# ================== AI UTILITY FUNCTIONS ==================

def _generate_transaction_ai_insights(transaction: Dict) -> Dict[str, Any]:
    """Genera AI insights basic per transazione"""
    insights = {
        'amount_category': _categorize_amount(transaction.get('amount', 0)),
        'description_patterns': _analyze_description_basic(transaction.get('description', '')),
        'reconciliation_probability': _estimate_reconciliation_probability(transaction),
        'suggested_actions': []
    }
    
    # Suggerimenti base
    if transaction.get('reconciliation_status') == 'Da Riconciliare':
        if abs(transaction.get('amount', 0)) > 1000:
            insights['suggested_actions'].append('High value - priority reconciliation recommended')
        if 'bonifico' in transaction.get('description', '').lower():
            insights['suggested_actions'].append('Bank transfer detected - check invoice matches')
    
    return insights

def _categorize_amount(amount: float) -> str:
    """Categorizza importo"""
    abs_amount = abs(amount)
    if abs_amount < 50:
        return 'micro'
    elif abs_amount < 500:
        return 'small'
    elif abs_amount < 5000:
        return 'medium'
    else:
        return 'large'

def _analyze_description_basic(description: str) -> List[str]:
    """Analisi basic della descrizione"""
    patterns = []
    desc_lower = description.lower()
    
    if 'bonifico' in desc_lower:
        patterns.append('bank_transfer')
    if 'pos' in desc_lower or 'carta' in desc_lower:
        patterns.append('card_payment')
    if 'riba' in desc_lower or 'rid' in desc_lower:
        patterns.append('direct_debit')
    
    return patterns

def _estimate_reconciliation_probability(transaction: Dict) -> float:
    """Stima probabilità riconciliazione"""
    probability = 0.5  # Base
    
    amount = abs(transaction.get('amount', 0))
    if amount > 10:  # Non micro-transazioni
        probability += 0.2
    
    if 'bonifico' in transaction.get('description', '').lower():
        probability += 0.2
    
    if transaction.get('reconciliation_status') == 'Riconciliato Parz.':
        probability += 0.3
    
    return min(1.0, probability)

# ================== FINE PARTE 1/4 ==================
# ================== TRANSACTIONS API V4.0 - PARTE 2/4 ==================
# ENDPOINT PRINCIPALI: LISTA, DETTAGLIO, SMART SUGGESTIONS, RECONCILIATION

# ================== ENDPOINT PRINCIPALE: LISTA TRANSAZIONI ==================

@router.get("/", response_model=Union[TransactionListResponse, Dict[str, Any]])
@limiter.limit("100/minute")
@transaction_performance_tracked("get_transactions_list_v4")
async def get_transactions_list_v4(
    request: Request,
    # Parametri originali mantenuti per compatibilità
    status_filter: Optional[ReconciliationStatus] = Query(None, description="Filter by reconciliation status"),
    search: Optional[str] = Query(None, description="Search in description"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    anagraphics_id_heuristic: Optional[int] = Query(None, description="Filter by likely anagraphics ID"),
    hide_pos: bool = Query(False, description="Hide POS transactions"),
    hide_worldline: bool = Query(False, description="Hide Worldline transactions"),
    hide_cash: bool = Query(False, description="Hide cash transactions"),
    hide_commissions: bool = Query(False, description="Hide bank commissions"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=1000, description="Page size"),
    
    # Nuovi parametri V4.0
    enhanced: bool = Query(False, description="Return enhanced response format with AI insights"),
    include_summary: bool = Query(False, description="Include summary statistics"),
    enable_ai_insights: bool = Query(False, description="Include AI insights for each transaction"),
    cache_enabled: bool = Query(True, description="Enable intelligent caching")
):
    """📋 Get paginated list of transactions - Enhanced V4.0 with AI insights"""
    
    log = logger.bind(
        operation="get_transactions_list_v4",
        page=page,
        size=size,
        enhanced=enhanced,
        ai_insights=enable_ai_insights
    )
    
    start_time = time.time()
    
    try:
        # Validazione con modello Pydantic
        try:
            filters = TransactionFilters(
                status_filter=status_filter,
                search=search,
                start_date=start_date,
                end_date=end_date,
                min_amount=min_amount,
                max_amount=max_amount,
                anagraphics_id_heuristic=anagraphics_id_heuristic,
                hide_pos=hide_pos,
                hide_worldline=hide_worldline,
                hide_cash=hide_cash,
                hide_commissions=hide_commissions
            )
        except ValueError as ve:
            log.warning("Validation error", error=str(ve))
            raise HTTPException(status_code=422, detail=str(ve))
        
        pagination = PaginationParams(page=page, size=size)
        
        # Check cache se abilitato
        cache_key = None
        if cache_enabled:
            cache_data = {
                'filters': filters.dict(exclude_none=True),
                'page': page,
                'size': size,
                'enhanced': enhanced,
                'ai_insights': enable_ai_insights
            }
            cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()
            cached_result = stats_cache.get_stats(cache_key)
            if cached_result:
                log.info("Returning cached result")
                return cached_result
        
        log.info("Fetching transactions from database")
        
        # Ottieni transazioni dal database
        db_adapter = get_db_adapter()
        df_transactions = await db_adapter.get_transactions_async(
            start_date=start_date.isoformat() if start_date else None,
            end_date=end_date.isoformat() if end_date else None,
            status_filter=status_filter.value if status_filter else None,
            limit=None,
            anagraphics_id_heuristic_filter=anagraphics_id_heuristic,
            hide_pos=hide_pos,
            hide_worldline=hide_worldline,
            hide_cash=hide_cash,
            hide_commissions=hide_commissions
        )
        
        if df_transactions.empty:
            base_response = {
                "items": [],
                "total": 0,
                "page": page,
                "size": size,
                "pages": 0
            }
            
            if enhanced or include_summary:
                base_response.update({
                    "filters_applied": filters.dict(exclude_none=True),
                    "summary": {"total_amount": 0.0, "total_income": 0.0, "total_expenses": 0.0},
                    "ai_enhanced": False,
                    "cache_hit": False
                })
            
            return base_response
        
        # Applica filtri aggiuntivi con processing ottimizzato
        log.debug("Applying additional filters")
        df_filtered = await process_heavy_operations_async(df_transactions, filters)
        
        total = len(df_filtered)
        
        # Paginazione
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_filtered.iloc[start_idx:end_idx] if not df_filtered.empty else df_filtered
        
        # Conversione ottimizzata
        items = []
        if not df_paginated.empty:
            items_data = df_paginated.to_dict('records')
            
            # AI Insights se richiesto
            if enable_ai_insights and items_data:
                try:
                    for item in items_data:
                        # Aggiungi AI insights base
                        item['ai_insights'] = _generate_transaction_ai_insights(item)
                        item['smart_suggestions_available'] = item.get('reconciliation_status') in ['Da Riconciliare', 'Riconciliato Parz.']
                except Exception as e:
                    log.warning("AI insights generation failed", error=str(e))
            
            items = items_data
        
        pages = (total + size - 1) // size
        
        # Prepara risposta
        base_response = {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
        
        # Enhanced response se richiesto
        if enhanced or include_summary:
            summary = {}
            if not df_filtered.empty:
                summary = {
                    "total_amount": float(df_filtered['amount'].sum()),
                    "total_income": float(df_filtered[df_filtered['amount'] > 0]['amount'].sum()),
                    "total_expenses": float(abs(df_filtered[df_filtered['amount'] < 0]['amount'].sum())),
                    "count_by_status": df_filtered['reconciliation_status'].value_counts().to_dict(),
                    "avg_amount": float(df_filtered['amount'].mean()),
                    "unreconciled_count": len(df_filtered[df_filtered['reconciliation_status'] == 'Da Riconciliare']),
                    "reconciliation_rate": (len(df_filtered[df_filtered['reconciliation_status'] == 'Riconciliato Tot.']) / total * 100) if total > 0 else 0
                }
            
            base_response.update({
                "filters_applied": filters.dict(exclude_none=True),
                "summary": summary,
                "ai_enhanced": enable_ai_insights,
                "cache_hit": False,
                "adapter_version": "4.0"
            })
        
        # Cache result
        if cache_enabled and cache_key:
            stats_cache.set_stats(base_response, cache_key)
        
        processing_time = (time.time() - start_time) * 1000
        log.info("Request completed successfully", 
                processing_time_ms=processing_time,
                total_returned=len(items))
        
        return base_response
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        log.error("Unexpected error", error=str(e), processing_time_ms=processing_time)
        raise HTTPException(status_code=500, detail="Internal server error")

# ================== ENDPOINT: DETTAGLIO TRANSAZIONE ==================

@router.get("/{transaction_id}", response_model=Union[BankTransaction, EnhancedTransactionResponse])
@transaction_performance_tracked("get_transaction_by_id_v4")
async def get_transaction_by_id_v4(
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    enhanced: bool = Query(False, description="Return enhanced response with AI insights"),
    include_suggestions: bool = Query(False, description="Include smart reconciliation suggestions"),
    include_similar: bool = Query(False, description="Include similar transactions")
):
    """🔍 Get transaction by ID with enhanced V4.0 capabilities"""
    
    log = logger.bind(transaction_id=transaction_id, operation="get_transaction_by_id_v4")
    
    try:
        log.info("Fetching transaction details")
        
        db_adapter = get_db_adapter()
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        
        if not transaction:
            log.warning("Transaction not found")
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Aggiungi campi computati
        transaction['remaining_amount'] = transaction['amount'] - transaction.get('reconciled_amount', 0)
        transaction['is_income'] = transaction['amount'] > 0
        transaction['is_expense'] = transaction['amount'] < 0
        
        # Enhanced response con AI insights
        if enhanced:
            try:
                # AI insights dettagliati
                transaction['ai_insights'] = await _generate_detailed_ai_insights_v4(transaction)
                
                # Pattern analysis
                transaction['pattern_analysis'] = await _analyze_transaction_patterns_v4(transaction)
                
                # Smart suggestions se richiesto
                if include_suggestions and transaction.get('reconciliation_status') in ['Da Riconciliare', 'Riconciliato Parz.']:
                    adapter_v4 = get_reconciliation_adapter_v4()
                    suggestions = await adapter_v4.suggest_1_to_1_matches_async(
                        transaction_id=transaction_id,
                        enable_ai=True,
                        enable_caching=True
                    )
                    transaction['smart_suggestions'] = suggestions[:5]  # Top 5
                
                # Transazioni simili se richiesto
                if include_similar:
                    similar_transactions = await _find_similar_transactions_v4(transaction)
                    transaction['similar_transactions'] = similar_transactions[:10]
                
                return EnhancedTransactionResponse(**transaction)
                
            except Exception as e:
                log.warning("Enhanced features failed, returning basic response", error=str(e))
                return transaction
        
        log.info("Transaction retrieved successfully")
        return transaction
        
    except HTTPException:
        raise
    except Exception as e:
        log.error("Unexpected error retrieving transaction", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

# ================== FUNZIONI AI AVANZATE ==================

async def _generate_detailed_ai_insights_v4(transaction: Dict) -> Dict[str, Any]:
    """Genera AI insights dettagliati V4.0"""
    insights = {
        'description_analysis': _analyze_description_patterns_v4(transaction.get('description', '')),
        'amount_analysis': _analyze_amount_patterns_v4(transaction.get('amount', 0)),
        'timing_analysis': _analyze_timing_patterns_v4(transaction.get('transaction_date', '')),
        'reconciliation_prediction': _predict_reconciliation_success_v4(transaction),
        'risk_assessment': _assess_transaction_risk_v4(transaction)
    }
    
    return insights

def _analyze_description_patterns_v4(description: str) -> Dict[str, Any]:
    """Analizza pattern descrizione V4.0"""
    patterns = {
        'payment_type': 'unknown',
        'keywords': [],
        'confidence': 0.0,
        'client_hints': []
    }
    
    desc_lower = description.lower()
    
    # Pattern detection avanzato
    if any(word in desc_lower for word in ['bonifico', 'wire', 'transfer']):
        patterns['payment_type'] = 'bank_transfer'
        patterns['confidence'] = 0.9
    elif any(word in desc_lower for word in ['pos', 'card', 'carta']):
        patterns['payment_type'] = 'card_payment'
        patterns['confidence'] = 0.8
    elif any(word in desc_lower for word in ['riba', 'rid', 'sdd']):
        patterns['payment_type'] = 'direct_debit'
        patterns['confidence'] = 0.95
    
    # Estrai keywords significative
    words = [word for word in description.split() if len(word) > 3]
    patterns['keywords'] = words[:5]
    
    # Client hints
    for word in words:
        if len(word) > 5 and word.isalpha():
            patterns['client_hints'].append(word)
    
    return patterns

def _analyze_amount_patterns_v4(amount: float) -> Dict[str, Any]:
    """Analizza pattern importo V4.0"""
    return {
        'amount_category': _categorize_amount(amount),
        'is_round_number': amount == round(amount),
        'likely_invoice_amount': _is_likely_invoice_amount_v4(amount),
        'vat_analysis': _analyze_vat_patterns_v4(amount)
    }

def _is_likely_invoice_amount_v4(amount: float) -> bool:
    """Determina se è probabilmente un importo fattura"""
    decimal_part = abs(amount) % 1
    common_vat_decimals = [0.0, 0.20, 0.22, 0.04, 0.10]  # IVA comuni
    return any(abs(decimal_part - vat) < 0.01 for vat in common_vat_decimals)

def _analyze_vat_patterns_v4(amount: float) -> Dict[str, Any]:
    """Analizza pattern IVA"""
    decimal_part = abs(amount) % 1
    
    vat_analysis = {
        'has_vat_pattern': False,
        'likely_vat_rate': None,
        'net_amount_estimate': None
    }
    
    # Pattern IVA 22%
    if abs(decimal_part - 0.22) < 0.01:
        vat_analysis.update({
            'has_vat_pattern': True,
            'likely_vat_rate': 22,
            'net_amount_estimate': amount / 1.22
        })
    # Pattern IVA 20%
    elif abs(decimal_part - 0.20) < 0.01:
        vat_analysis.update({
            'has_vat_pattern': True,
            'likely_vat_rate': 20,
            'net_amount_estimate': amount / 1.20
        })
    
    return vat_analysis

def _analyze_timing_patterns_v4(transaction_date: str) -> Dict[str, Any]:
    """Analizza pattern temporali V4.0"""
    try:
        date_obj = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        return {
            'day_of_week': date_obj.strftime('%A'),
            'is_weekend': date_obj.weekday() >= 5,
            'is_month_end': date_obj.day >= 25,
            'quarter_position': _get_quarter_position_v4(date_obj),
            'business_day_pattern': _analyze_business_day_pattern_v4(date_obj)
        }
    except:
        return {'error': 'Invalid date format'}

def _get_quarter_position_v4(date_obj: datetime) -> str:
    """Determina posizione nel trimestre"""
    month_in_quarter = ((date_obj.month - 1) % 3) + 1
    if month_in_quarter == 1:
        return 'quarter_start'
    elif month_in_quarter == 3:
        return 'quarter_end'
    else:
        return 'quarter_middle'

def _analyze_business_day_pattern_v4(date_obj: datetime) -> str:
    """Analizza pattern giorni lavorativi"""
    if date_obj.weekday() >= 5:
        return 'weekend'
    elif date_obj.weekday() == 0:
        return 'monday'
    elif date_obj.weekday() == 4:
        return 'friday'
    else:
        return 'mid_week'

def _predict_reconciliation_success_v4(transaction: Dict) -> Dict[str, Any]:
    """Predice successo riconciliazione V4.0"""
    prediction = {
        'success_probability': 0.5,
        'confidence': 0.6,
        'factors': []
    }
    
    # Fattori che aumentano probabilità
    amount = abs(transaction.get('amount', 0))
    if amount > 50:  # Non micro-transazioni
        prediction['success_probability'] += 0.2
        prediction['factors'].append('significant_amount')
    
    if 'bonifico' in transaction.get('description', '').lower():
        prediction['success_probability'] += 0.25
        prediction['factors'].append('bank_transfer_pattern')
    
    if transaction.get('reconciliation_status') == 'Riconciliato Parz.':
        prediction['success_probability'] += 0.3
        prediction['factors'].append('partial_reconciliation_exists')
    
    # Normalizza probabilità
    prediction['success_probability'] = min(1.0, prediction['success_probability'])
    
    return prediction

def _assess_transaction_risk_v4(transaction: Dict) -> Dict[str, Any]:
    """Valuta rischio transazione V4.0"""
    risk = {
        'risk_level': 'low',
        'risk_score': 0.0,
        'risk_factors': []
    }
    
    amount = abs(transaction.get('amount', 0))
    
    # Fattori di rischio
    if amount > 10000:
        risk['risk_score'] += 0.3
        risk['risk_factors'].append('high_amount')
    
    if amount < 1:
        risk['risk_score'] += 0.2
        risk['risk_factors'].append('micro_transaction')
    
    description = transaction.get('description', '').lower()
    if len(description) < 10:
        risk['risk_score'] += 0.1
        risk['risk_factors'].append('short_description')
    
    # Determina livello rischio
    if risk['risk_score'] > 0.5:
        risk['risk_level'] = 'high'
    elif risk['risk_score'] > 0.2:
        risk['risk_level'] = 'medium'
    
    return risk

async def _analyze_transaction_patterns_v4(transaction: Dict) -> Dict[str, Any]:
    """Analizza pattern transazione V4.0"""
    patterns = {
        'similar_transactions_count': 0,
        'pattern_strength': 0.0,
        'recurring_pattern': False,
        'common_characteristics': []
    }
    
    try:
        # Trova transazioni simili
        similar_transactions = await _find_similar_transactions_v4(transaction)
        patterns['similar_transactions_count'] = len(similar_transactions)
        
        if len(similar_transactions) >= 3:
            patterns['recurring_pattern'] = True
            patterns['pattern_strength'] = min(1.0, len(similar_transactions) / 10.0)
            
            # Analizza caratteristiche comuni
            reconciled_count = len([t for t in similar_transactions 
                                  if t.get('reconciliation_status') == 'Riconciliato Tot.'])
            
            if reconciled_count / len(similar_transactions) > 0.7:
                patterns['common_characteristics'].append('high_reconciliation_success_rate')
            
            # Pattern temporali
            dates = [t.get('transaction_date') for t in similar_transactions if t.get('transaction_date')]
            if len(dates) >= 3:
                patterns['common_characteristics'].append('recurring_timing_pattern')
    
    except Exception as e:
        logger.warning(f"Pattern analysis failed: {e}")
    
    return patterns

async def _find_similar_transactions_v4(transaction: Dict) -> List[Dict]:
    """Trova transazioni simili V4.0"""
    try:
        db_adapter = get_db_adapter()
        amount = transaction.get('amount', 0)
        description = transaction.get('description', '')
        
        # Query migliorata per transazioni simili
        similar_query = """
        SELECT id, amount, description, transaction_date, reconciliation_status,
               ABS(amount - ?) as amount_diff
        FROM BankTransactions
        WHERE (ABS(amount - ?) < (ABS(?) * 0.1)  -- +/- 10% amount
               OR description LIKE ?)  -- Similar description
          AND id != ?  -- Exclude same transaction
        ORDER BY amount_diff ASC, LENGTH(description) DESC
        LIMIT 20
        """
        
        params = (amount, amount, amount, f"%{description[:20]}%", transaction.get('id', 0))
        similar = await db_adapter.execute_query_async(similar_query, params)
        
        return similar or []
        
    except Exception as e:
        logger.warning(f"Similar transactions search failed: {e}")
        return []

# ================== ENDPOINT: SMART SUGGESTIONS V4.0 ==================

@router.get("/{transaction_id}/smart-suggestions")
@limiter.limit("20/minute")
@transaction_performance_tracked("smart_suggestions_v4")
async def get_smart_reconciliation_suggestions_v4(
    request: Request,
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    anagraphics_hint: Optional[int] = Query(None, gt=0, description="Anagraphics ID hint"),
    enable_ai: bool = Query(True, description="Enable AI enhancements"),
    enable_smart_patterns: bool = Query(True, description="Enable smart pattern matching"),
    enable_predictive: bool = Query(True, description="Enable predictive scoring"),
    max_suggestions: int = Query(10, ge=1, le=50, description="Maximum suggestions"),
    confidence_threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum confidence threshold")
):
    """🤖 Get smart reconciliation suggestions using V4.0 adapter with multi-strategy approach"""
    
    try:
        # Verifica esistenza transazione
        db_adapter = get_db_adapter()
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Ottieni adapter V4.0
        adapter_v4 = get_reconciliation_adapter_v4()
        
        logger.info("Generating smart suggestions V4.0", 
                   transaction_id=transaction_id,
                   amount=transaction.get('amount', 0),
                   ai_enabled=enable_ai,
                   smart_patterns=enable_smart_patterns)
        
        # Multi-strategy approach
        all_suggestions = []
        strategy_results = {}
        
        # Strategy 1: 1:1 matching (sempre)
        suggestions_1to1 = await adapter_v4.suggest_1_to_1_matches_async(
            transaction_id=transaction_id,
            anagraphics_id_filter=anagraphics_hint,
            enable_ai=enable_ai,
            enable_caching=True
        )
        if suggestions_1to1:
            all_suggestions.extend(suggestions_1to1[:5])
            strategy_results['1_to_1'] = len(suggestions_1to1)
        
        # Strategy 2: N:M matching se importo significativo
        if abs(transaction.get('amount', 0)) > 100:
            suggestions_ntom = await adapter_v4.suggest_n_to_m_matches_async(
                transaction_id=transaction_id,
                anagraphics_id_filter=anagraphics_hint,
                enable_ai=enable_ai,
                enable_parallel=True
            )
            if suggestions_ntom:
                all_suggestions.extend(suggestions_ntom[:3])
                strategy_results['n_to_m'] = len(suggestions_ntom)
        
        # Strategy 3: Smart client se hint disponibile
        if anagraphics_hint and enable_smart_patterns:
            suggestions_smart = await adapter_v4.suggest_smart_client_reconciliation_async(
                transaction_id=transaction_id,
                anagraphics_id=anagraphics_hint,
                enhance_with_ml=enable_ai,
                enable_predictive=enable_predictive
            )
            if suggestions_smart:
                all_suggestions.extend(suggestions_smart[:2])
                strategy_results['smart_client'] = len(suggestions_smart)
        
        # Deduplica e filtra per confidence
        unique_suggestions = []
        seen_keys = set()
        
        for suggestion in all_suggestions:
            # Crea chiave unica basata su invoice_ids
            key = tuple(sorted(suggestion.get('invoice_ids', [])))
            if key not in seen_keys:
                confidence_score = suggestion.get('ai_confidence_score', suggestion.get('confidence_score', 0))
                if confidence_score >= confidence_threshold:
                    seen_keys.add(key)
                    unique_suggestions.append(suggestion)
        
        # Ordina per confidence (AI se disponibile, altrimenti standard)
        unique_suggestions.sort(
            key=lambda x: x.get('ai_confidence_score', x.get('confidence_score', 0)),
            reverse=True
        )
        
        # Limita risultati
        final_suggestions = unique_suggestions[:max_suggestions]
        
        # Aggiungi insights aggregati
        ai_enhanced_count = sum(1 for s in final_suggestions if s.get('ai_enhanced', False))
        smart_enhanced_count = sum(1 for s in final_suggestions if s.get('smart_enhanced', False))
        
        # Calcola confidence distribution
        confidence_distribution = {
            'high': len([s for s in final_suggestions if s.get('confidence_score', 0) >= 0.8]),
            'medium': len([s for s in final_suggestions if 0.6 <= s.get('confidence_score', 0) < 0.8]),
            'low': len([s for s in final_suggestions if s.get('confidence_score', 0) < 0.6])
        }
        
        response_data = {
            'transaction_id': transaction_id,
            'transaction_context': {
                'amount': transaction.get('amount', 0),
                'description': transaction.get('description', ''),
                'status': transaction.get('reconciliation_status', ''),
                'date': transaction.get('transaction_date', '')
            },
            'suggestions': final_suggestions,
            'strategies_used': strategy_results,
            'insights': {
                'total_suggestions': len(final_suggestions),
                'ai_enhanced_count': ai_enhanced_count,
                'smart_enhanced_count': smart_enhanced_count,
                'confidence_distribution': confidence_distribution,
                'average_confidence': sum(s.get('confidence_score', 0) for s in final_suggestions) / max(1, len(final_suggestions))
            },
            'configuration': {
                'ai_enabled': enable_ai,
                'smart_patterns': enable_smart_patterns,
                'predictive_enabled': enable_predictive,
                'confidence_threshold': confidence_threshold,
                'anagraphics_hint': anagraphics_hint
            },
            'adapter_version': '4.0'
        }
        
        return APIResponse(
            success=True,
            message=f"Smart suggestions V4.0: {len(final_suggestions)} high-quality matches found",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Smart suggestions V4.0 failed for transaction {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail="Error generating smart suggestions V4.0")

# ================== ENDPOINT: MANUAL RECONCILIATION V4.0 ==================

@router.post("/{transaction_id}/reconcile-with/{invoice_id}")
@limiter.limit("30/minute")
@transaction_performance_tracked("manual_reconciliation_v4")
async def reconcile_transaction_with_invoice_v4(
    request: Request,
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    invoice_id: int = Path(..., gt=0, description="Invoice ID"),
    amount_to_match: float = Body(..., gt=0, description="Amount to reconcile"),
    enable_ai_validation: bool = Body(True, description="Enable AI pre-validation"),
    enable_learning: bool = Body(True, description="Enable pattern learning"),
    user_confidence: Optional[float] = Body(None, ge=0.0, le=1.0, description="User confidence level"),
    user_notes: Optional[str] = Body(None, max_length=500, description="User notes"),
    force_match: bool = Body(False, description="Force match even if AI suggests risks")
):
    """🎯 Reconcile transaction with invoice using V4.0 adapter - Enhanced with AI validation"""
    
    try:
        # Verifica esistenza di entrambi gli elementi
        db_adapter = get_db_adapter()
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        invoice = await db_adapter.get_item_details_async('invoice', invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Ottieni adapter V4.0
        adapter_v4 = get_reconciliation_adapter_v4()
        
        logger.info("Processing manual reconciliation V4.0",
                   transaction_id=transaction_id,
                   invoice_id=invoice_id,
                   amount=amount_to_match,
                   ai_validation=enable_ai_validation)
        
        # Validazioni preliminari
        if amount_to_match > abs(transaction.get('amount', 0)):
            raise HTTPException(
                status_code=400,
                detail=f"Amount to match ({amount_to_match}) cannot exceed transaction amount ({abs(transaction.get('amount', 0))})"
            )
        
        # Applica manual match usando adapter V4.0
        result = await adapter_v4.apply_manual_match_async(
            invoice_id=invoice_id,
            transaction_id=transaction_id,
            amount_to_match=amount_to_match,
            validate_ai=enable_ai_validation and not force_match,
            enable_learning=enable_learning
        )
        
        # Arricchisci response con context V4.0
        enhanced_result = result.copy()
        enhanced_result.update({
            'transaction_context': {
                'transaction_id': transaction_id,
                'amount': transaction.get('amount', 0),
                'description': transaction.get('description', ''),
                'date': transaction.get('transaction_date', ''),
                'remaining_before': transaction.get('amount', 0) - transaction.get('reconciled_amount', 0)
            },
            'invoice_context': {
                'invoice_id': invoice_id,
                'doc_number': invoice.get('doc_number', ''),
                'total_amount': invoice.get('total_amount', 0),
                'counterparty': invoice.get('counterparty_name', ''),
                'due_date': invoice.get('due_date', '')
            },
            'reconciliation_metadata': {
                'amount_matched': amount_to_match,
                'user_confidence': user_confidence,
                'user_notes': user_notes,
                'forced_match': force_match,
                'pattern_learning_enabled': enable_learning,
                'ai_validation_used': enable_ai_validation,
                'adapter_version': '4.0',
                'timestamp': datetime.now().isoformat()
            }
        })
        
        # Aggiungi AI insights se validazione abilitata
        if enable_ai_validation and result.get('ai_validated'):
            enhanced_result['ai_validation_details'] = result.get('ai_details', {})
        
        # Log successful reconciliation
        if result['success']:
            logger.info("Manual reconciliation V4.0 successful",
                       transaction_id=transaction_id,
                       invoice_id=invoice_id,
                       amount=amount_to_match,
                       ai_validated=result.get('ai_validated', False))
        
        return APIResponse(
            success=result['success'],
            message=result['message'],
            data=enhanced_result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual reconciliation V4.0 failed T:{transaction_id}<->I:{invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Error applying manual reconciliation V4.0")

# ================== FINE PARTE 2/4 ==================
# ================== TRANSACTIONS API V4.0 - PARTE 3/4 ==================
# BATCH OPERATIONS, INSIGHTS, SEARCH E ANALYTICS

# ================== ENDPOINT: BATCH RECONCILIATION V4.0 ==================

@router.post("/batch/reconcile")
@limiter.limit("5/minute")
@transaction_performance_tracked("batch_reconcile_v4")
async def batch_reconcile_transactions_v4(
    request: Request,
    background_tasks: BackgroundTasks,
    batch_request: BatchReconciliationRequest
):
    """⚡ Batch reconcile multiple transaction-invoice pairs using V4.0 adapter"""
    
    try:
        reconciliation_pairs = batch_request.reconciliation_pairs
        enable_ai_validation = batch_request.enable_ai_validation
        enable_parallel_processing = batch_request.enable_parallel_processing
        force_background = batch_request.force_background
        
        logger.info("Processing batch reconciliation V4.0",
                   batch_size=len(reconciliation_pairs),
                   ai_validation=enable_ai_validation,
                   parallel=enable_parallel_processing)
        
        # Validazione input
        for i, pair in enumerate(reconciliation_pairs):
            required_fields = ['transaction_id', 'invoice_id', 'amount']
            for field in required_fields:
                if field not in pair:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Missing '{field}' in reconciliation pair {i}"
                    )
                if not isinstance(pair[field], (int, float)) or pair[field] <= 0:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Invalid '{field}' value in reconciliation pair {i}"
                    )
        
        # Ottieni adapter V4.0
        adapter_v4 = get_reconciliation_adapter_v4()
        
        # Per batch grandi, usa background processing
        if len(reconciliation_pairs) > 50 or force_background:
            task_id = BackgroundTasksManager.create_task(
                'batch_reconciliation_v4',
                {
                    'total_items': len(reconciliation_pairs),
                    'ai_validation': enable_ai_validation,
                    'parallel_processing': enable_parallel_processing
                }
            )
            
            background_tasks.add_task(
                _process_batch_reconciliation_v4_background,
                task_id,
                reconciliation_pairs,
                enable_ai_validation,
                enable_parallel_processing,
                adapter_v4
            )
            
            return APIResponse(
                success=True,
                message=f"Batch reconciliation V4.0 scheduled - Task ID: {task_id}",
                data={
                    'task_id': task_id,
                    'batch_size': len(reconciliation_pairs),
                    'estimated_completion': (datetime.now() + timedelta(minutes=len(reconciliation_pairs) // 10)).isoformat(),
                    'status': 'scheduled',
                    'adapter_version': '4.0'
                }
            )
        
        # Processing immediato per batch piccoli
        results = await _process_batch_reconciliation_immediate(
            reconciliation_pairs, enable_ai_validation, enable_parallel_processing, adapter_v4
        )
        
        return APIResponse(
            success=True,
            message=f"Batch reconciliation V4.0: {results['successful']} successful, {results['failed']} failed",
            data=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch reconciliation V4.0 failed: {e}")
        raise HTTPException(status_code=500, detail="Error in batch reconciliation V4.0")

async def _process_batch_reconciliation_immediate(
    reconciliation_pairs: List[Dict[str, Any]], 
    enable_ai_validation: bool, 
    enable_parallel_processing: bool, 
    adapter_v4
) -> Dict[str, Any]:
    """Processa batch reconciliation immediato"""
    
    results = []
    
    if enable_parallel_processing:
        # Processing parallelo con adapter V4.0
        tasks = []
        for pair in reconciliation_pairs:
            task = adapter_v4.apply_manual_match_async(
                invoice_id=pair['invoice_id'],
                transaction_id=pair['transaction_id'],
                amount_to_match=pair['amount'],
                validate_ai=enable_ai_validation,
                enable_learning=True
            )
            tasks.append(task)
        
        parallel_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(parallel_results):
            if isinstance(result, Exception):
                results.append({
                    'pair_index': i,
                    'success': False,
                    'error': str(result),
                    'transaction_id': reconciliation_pairs[i]['transaction_id'],
                    'invoice_id': reconciliation_pairs[i]['invoice_id']
                })
            else:
                results.append({
                    'pair_index': i,
                    'success': result['success'],
                    'message': result['message'],
                    'transaction_id': reconciliation_pairs[i]['transaction_id'],
                    'invoice_id': reconciliation_pairs[i]['invoice_id'],
                    'ai_validated': result.get('ai_validated', False),
                    'amount_matched': reconciliation_pairs[i]['amount']
                })
    else:
        # Processing sequenziale
        for i, pair in enumerate(reconciliation_pairs):
            try:
                result = await adapter_v4.apply_manual_match_async(
                    invoice_id=pair['invoice_id'],
                    transaction_id=pair['transaction_id'],
                    amount_to_match=pair['amount'],
                    validate_ai=enable_ai_validation,
                    enable_learning=True
                )
                
                results.append({
                    'pair_index': i,
                    'success': result['success'],
                    'message': result['message'],
                    'transaction_id': pair['transaction_id'],
                    'invoice_id': pair['invoice_id'],
                    'ai_validated': result.get('ai_validated', False),
                    'amount_matched': pair['amount']
                })
                
            except Exception as e:
                results.append({
                    'pair_index': i,
                    'success': False,
                    'error': str(e),
                    'transaction_id': pair['transaction_id'],
                    'invoice_id': pair['invoice_id']
                })
    
    # Calcola statistiche dettagliate
    successful = len([r for r in results if r.get('success', False)])
    failed = len(results) - successful
    ai_validated_count = len([r for r in results if r.get('ai_validated', False)])
    total_amount_matched = sum(
        r.get('amount_matched', 0) for r in results if r.get('success', False)
    )
    
    return {
        'results': results,
        'summary': {
            'total_pairs': len(reconciliation_pairs),
            'successful': successful,
            'failed': failed,
            'success_rate': (successful / len(reconciliation_pairs)) * 100,
            'ai_validated': ai_validated_count,
            'total_amount_matched': total_amount_matched,
            'adapter_version': '4.0'
        },
        'processing_metadata': {
            'ai_validation_enabled': enable_ai_validation,
            'timestamp': datetime.now().isoformat()
        }
    }

async def _process_batch_reconciliation_v4_background(
    task_id: str,
    reconciliation_pairs: List[Dict[str, Any]],
    enable_ai_validation: bool,
    enable_parallel_processing: bool,
    adapter_v4
):
    """Process batch reconciliation in background usando V4.0 adapter"""
    
    try:
        BackgroundTasksManager.update_task(task_id, {'status': 'processing'})
        
        results = []
        
        # Process in chunks per evitare timeout
        chunk_size = 20 if enable_parallel_processing else 10
        
        for i in range(0, len(reconciliation_pairs), chunk_size):
            chunk = reconciliation_pairs[i:i + chunk_size]
            
            chunk_results = await _process_batch_reconciliation_immediate(
                chunk, enable_ai_validation, enable_parallel_processing, adapter_v4
            )
            
            results.extend(chunk_results['results'])
            
            # Update progress
            progress = min(i + chunk_size, len(reconciliation_pairs))
            BackgroundTasksManager.update_task(task_id, {'progress': progress})
        
        # Complete task con statistiche dettagliate
        successful = len([r for r in results if r.get('success', False)])
        ai_validated = len([r for r in results if r.get('ai_validated', False)])
        
        BackgroundTasksManager.complete_task(task_id, {
            'total': len(results),
            'successful': successful,
            'failed': len(results) - successful,
            'ai_validated': ai_validated,
            'success_rate': (successful / len(results)) * 100 if results else 0,
            'details': results
        })
        
        logger.info(f"Background batch reconciliation V4.0 completed: {successful}/{len(results)} successful")
        
    except Exception as e:
        logger.error(f"Background batch reconciliation V4.0 failed: {e}")
        BackgroundTasksManager.fail_task(task_id, str(e))

# ================== ENDPOINT: BATCH STATUS UPDATE V4.0 ==================

@router.post("/batch/update-status")
@limiter.limit("10/minute")
@transaction_performance_tracked("batch_update_status_v4")
async def batch_update_transaction_status_v4(
    background_tasks: BackgroundTasks,
    request: BatchUpdateRequest,
    enhanced: bool = Query(False, description="Return enhanced response format"),
    force_background: bool = Query(False, description="Force background processing"),
    enable_smart_validation: bool = Query(True, description="Enable smart validation")
):
    """📝 Update reconciliation status for multiple transactions - Enhanced V4.0"""
    
    try:
        transaction_ids = request.transaction_ids
        new_status = request.reconciliation_status
        
        logger.info("Processing batch status update V4.0",
                   batch_size=len(transaction_ids),
                   target_status=new_status.value,
                   smart_validation=enable_smart_validation)
        
        # Per batch grandi, usa background processing
        if len(transaction_ids) > 100 or force_background:
            task_id = BackgroundTasksManager.create_task(
                'batch_status_update_v4',
                {
                    'total_items': len(transaction_ids),
                    'target_status': new_status.value,
                    'smart_validation': enable_smart_validation
                }
            )
            
            background_tasks.add_task(
                _process_batch_status_update_background,
                task_id,
                transaction_ids,
                new_status,
                enable_smart_validation
            )
            
            response_data = {
                "task_id": task_id,
                "status": "processing",
                "total": len(transaction_ids),
                "message": f"Batch status update V4.0 scheduled with ID: {task_id}"
            }
            
            return APIResponse(
                success=True,
                message=response_data["message"],
                data=response_data
            )
        
        # Per batch piccoli, processa immediatamente
        results = await _process_batch_status_update_immediate(
            transaction_ids, new_status, enable_smart_validation
        )
        
        return APIResponse(
            success=True,
            message=f"Batch status update V4.0: {results['successful']} successful, {results['failed']} failed",
            data=results
        )
        
    except Exception as e:
        logger.error(f"Batch status update V4.0 failed: {e}")
        raise HTTPException(status_code=500, detail="Error in batch status update V4.0")

async def _process_batch_status_update_immediate(
    transaction_ids: List[int], 
    new_status: ReconciliationStatus, 
    enable_smart_validation: bool
) -> Dict[str, Any]:
    """Processa batch status update immediato"""
    
    results = {
        'total': len(transaction_ids),
        'successful': 0,
        'failed': 0,
        'details': [],
        'validation_applied': enable_smart_validation
    }
    
    db_adapter = get_db_adapter()
    for transaction_id in transaction_ids:
        try:
            # Ottieni transazione corrente
            current = await db_adapter.execute_query_async(
                "SELECT amount, reconciled_amount, reconciliation_status FROM BankTransactions WHERE id = ?",
                (transaction_id,)
            )
            
            if not current:
                results['failed'] += 1
                results['details'].append({
                    'transaction_id': transaction_id,
                    'success': False,
                    'message': 'Transaction not found'
                })
                continue
            
            current_status = current[0]['reconciliation_status']
            
            # Smart validation se abilitata
            if enable_smart_validation:
                validation_result = _validate_status_change_v4(
                    current_status, new_status.value, current[0]
                )
                
                if not validation_result['valid']:
                    results['failed'] += 1
                    results['details'].append({
                        'transaction_id': transaction_id,
                        'success': False,
                        'message': f"Validation failed: {validation_result['message']}"
                    })
                    continue
            
            # Verifica se già nello stato richiesto
            if current_status == new_status.value:
                results['successful'] += 1
                results['details'].append({
                    'transaction_id': transaction_id,
                    'success': True,
                    'message': f'Already in status {new_status.value}'
                })
                continue
            
            # Aggiorna stato
            success = await db_adapter.update_transaction_state_async(
                transaction_id,
                new_status.value,
                current[0]['reconciled_amount']
            )
            
            if success:
                results['successful'] += 1
                results['details'].append({
                    'transaction_id': transaction_id,
                    'success': True,
                    'message': f'Status updated to {new_status.value}'
                })
            else:
                results['failed'] += 1
                results['details'].append({
                    'transaction_id': transaction_id,
                    'success': False,
                    'message': 'Update failed'
                })
                
        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                'transaction_id': transaction_id,
                'success': False,
                'message': f'Error: {str(e)}'
            })
    
    return results

async def _process_batch_status_update_background(
    task_id: str,
    transaction_ids: List[int],
    new_status: ReconciliationStatus,
    enable_smart_validation: bool
):
    """Process batch status update in background"""
    
    try:
        BackgroundTasksManager.update_task(task_id, {'status': 'processing'})
        
        results = {'successful': 0, 'failed': 0, 'details': []}
        
        # Process in chunks
        chunk_size = 50
        
        for i in range(0, len(transaction_ids), chunk_size):
            chunk = transaction_ids[i:i + chunk_size]
            
            chunk_results = await _process_batch_status_update_immediate(
                chunk, new_status, enable_smart_validation
            )
            
            results['successful'] += chunk_results['successful']
            results['failed'] += chunk_results['failed']
            results['details'].extend(chunk_results['details'])
            
            # Update progress
            progress = min(i + chunk_size, len(transaction_ids))
            BackgroundTasksManager.update_task(task_id, {'progress': progress})
        
        # Complete task
        BackgroundTasksManager.complete_task(task_id, results)
        
        logger.info(f"Background batch status update V4.0 completed: {results['successful']}/{len(transaction_ids)} successful")
        
    except Exception as e:
        logger.error(f"Background batch status update V4.0 failed: {e}")
        BackgroundTasksManager.fail_task(task_id, str(e))

def _validate_status_change_v4(current_status: str, new_status: str, transaction: Dict) -> Dict[str, Any]:
    """Valida cambio status con logica smart V4.0"""
    
    # Transizioni valide
    valid_transitions = {
        'Da Riconciliare': ['Riconciliato Parz.', 'Riconciliato Tot.', 'Ignorato'],
        'Riconciliato Parz.': ['Riconciliato Tot.', 'Da Riconciliare'],
        'Riconciliato Tot.': ['Da Riconciliare'],  # Solo in casi eccezionali
        'Ignorato': ['Da Riconciliare']
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        return {
            'valid': False,
            'message': f"Invalid transition from {current_status} to {new_status}"
        }
    
    # Validazioni specifiche V4.0
    if new_status == 'Riconciliato Tot.':
        remaining_amount = transaction.get('amount', 0) - transaction.get('reconciled_amount', 0)
        if abs(remaining_amount) > 0.01:
            return {
                'valid': False,
                'message': f"Cannot mark as fully reconciled: remaining amount {remaining_amount}"
            }
    
    return {'valid': True, 'message': 'Status change validated'}

# ================== ENDPOINT: TRANSACTION INSIGHTS V4.0 ==================

@router.get("/{transaction_id}/insights")
@limiter.limit("30/minute")
@transaction_performance_tracked("transaction_insights_v4")
async def get_transaction_insights_v4(
    request: Request,
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    insight_request: TransactionInsightRequest = Depends()
):
    """🧠 Get comprehensive transaction insights using V4.0 AI capabilities"""
    
    try:
        # Verifica esistenza transaction
        db_adapter = get_db_adapter()
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        logger.info("Generating transaction insights V4.0",
                   transaction_id=transaction_id,
                   ai_analysis=insight_request.include_ai_analysis,
                   pattern_matching=insight_request.include_pattern_matching)
        
        insights = {
            'transaction_id': transaction_id,
            'basic_info': {
                'amount': transaction.get('amount', 0),
                'date': transaction.get('transaction_date'),
                'description': transaction.get('description', ''),
                'status': transaction.get('reconciliation_status'),
                'remaining_amount': transaction.get('amount', 0) - transaction.get('reconciled_amount', 0)
            },
            'ai_analysis': {},
            'pattern_insights': {},
            'client_insights': {},
            'smart_suggestions': [],
            'recommendations': []
        }
        
        # AI Analysis se richiesta
        if insight_request.include_ai_analysis:
            try:
                ai_analysis = await _generate_detailed_ai_insights_v4(transaction)
                insights['ai_analysis'] = ai_analysis
            except Exception as e:
                logger.warning("AI analysis failed", error=str(e))
                insights['ai_analysis'] = {'error': 'AI analysis temporarily unavailable'}
        
        # Pattern Matching se richiesto
        if insight_request.include_pattern_matching:
            try:
                pattern_insights = await _analyze_transaction_patterns_v4(transaction)
                insights['pattern_insights'] = pattern_insights
            except Exception as e:
                logger.warning("Pattern analysis failed", error=str(e))
                insights['pattern_insights'] = {'error': 'Pattern analysis temporarily unavailable'}
        
        # Client Analysis se richiesta e identificabile
        if insight_request.include_client_analysis:
            try:
                potential_client = await _identify_potential_client_v4(transaction)
                if potential_client:
                    adapter_v4 = get_reconciliation_adapter_v4()
                    client_reliability = await adapter_v4.analyze_client_payment_reliability_async(
                        potential_client['anagraphics_id']
                    )
                    insights['client_insights'] = {
                        'identified_client': potential_client,
                        'reliability_analysis': client_reliability
                    }
            except Exception as e:
                logger.warning("Client analysis failed", error=str(e))
                insights['client_insights'] = {'error': 'Client analysis temporarily unavailable'}
        
        # Smart Suggestions se richiesto
        if insight_request.include_smart_suggestions:
            try:
                if transaction.get('reconciliation_status') in ['Da Riconciliare', 'Riconciliato Parz.']:
                    adapter_v4 = get_reconciliation_adapter_v4()
                    smart_suggestions = await adapter_v4.suggest_1_to_1_matches_async(
                        transaction_id=transaction_id,
                        enable_ai=True,
                        enable_caching=True
                    )
                    insights['smart_suggestions'] = smart_suggestions[:3]  # Top 3
            except Exception as e:
                logger.warning("Smart suggestions failed", error=str(e))
                insights['smart_suggestions'] = []
        
        # Genera raccomandazioni intelligenti V4.0
        recommendations = _generate_transaction_recommendations_v4(insights)
        insights['recommendations'] = recommendations
        
        # Aggiungi metadata V4.0
        insights['metadata'] = {
            'adapter_version': '4.0',
            'analysis_timestamp': datetime.now().isoformat(),
            'features_used': {
                'ai_analysis': insight_request.include_ai_analysis,
                'pattern_matching': insight_request.include_pattern_matching,
                'client_analysis': insight_request.include_client_analysis,
                'smart_suggestions': insight_request.include_smart_suggestions
            }
        }
        
        return APIResponse(
            success=True,
            message=f"Transaction insights V4.0 for transaction {transaction_id}",
            data=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transaction insights V4.0 failed for {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail="Error generating transaction insights V4.0")

async def _identify_potential_client_v4(transaction: Dict) -> Optional[Dict]:
    """Identifica potenziale cliente dalla transazione V4.0"""
    try:
        db_adapter = get_db_adapter()
        description = transaction.get('description', '').lower()
        amount = transaction.get('amount', 0)
        
        # Cerca in base alla descrizione con query migliorata
        client_search_query = """
        SELECT a.id as anagraphics_id, a.denomination, 
               COUNT(*) as match_count,
               AVG(ABS(bt.amount)) as avg_transaction_amount,
               MAX(bt.transaction_date) as last_transaction_date
        FROM Anagraphics a
        JOIN BankTransactions bt ON (
            LOWER(bt.description) LIKE '%' || LOWER(a.denomination) || '%' 
            OR LOWER(a.denomination) LIKE '%' || ? || '%'
        )
        WHERE a.type = 'Cliente'
          AND ABS(bt.amount - ?) < (ABS(?) * 0.5)  -- +/- 50% amount tolerance
        GROUP BY a.id, a.denomination
        ORDER BY match_count DESC, ABS(avg_transaction_amount - ABS(?)) ASC
        LIMIT 3
        """
        
        # Estrai prima parola significativa dalla descrizione
        keywords = [word for word in description.split() if len(word) > 3]
        if not keywords:
            return None
        
        main_keyword = keywords[0]
        
        result = await db_adapter.execute_query_async(
            client_search_query, (main_keyword, amount, amount, amount)
        )
        
        if result:
            best_match = result[0]
            
            # Calcola confidence score migliorato
            match_count = best_match['match_count']
            amount_similarity = 1 - abs(best_match['avg_transaction_amount'] - abs(amount)) / max(abs(amount), best_match['avg_transaction_amount'])
            
            confidence = min(1.0, (match_count / 10.0) * 0.7 + amount_similarity * 0.3)
            
            return {
                'anagraphics_id': best_match['anagraphics_id'],
                'denomination': best_match['denomination'],
                'match_confidence': confidence,
                'match_count': match_count,
                'avg_transaction_amount': best_match['avg_transaction_amount'],
                'last_transaction_date': best_match['last_transaction_date'],
                'identification_method': 'description_and_amount_matching_v4'
            }
        
        return None
        
    except Exception as e:
        logger.warning(f"Client identification V4.0 failed: {e}")
        return None

def _generate_transaction_recommendations_v4(insights: Dict) -> List[Dict]:
    """Genera raccomandazioni intelligenti V4.0"""
    recommendations = []
    
    # Raccomandazioni basate su AI analysis
    ai_analysis = insights.get('ai_analysis', {})
    if ai_analysis and not ai_analysis.get('error'):
        amount_analysis = ai_analysis.get('amount_analysis', {})
        if amount_analysis.get('likely_invoice_amount'):
            recommendations.append({
                'type': 'reconciliation_opportunity',
                'priority': 'high',
                'message': 'Importo compatibile con fatturazione - alta probabilità di riconciliazione',
                'action': 'Usa smart-suggestions endpoint per trovare fatture compatibili',
                'confidence': 0.8
            })
        
        # Raccomandazioni da prediction
        prediction = ai_analysis.get('reconciliation_prediction', {})
        if prediction.get('success_probability', 0) > 0.8:
            recommendations.append({
                'type': 'high_success_probability',
                'priority': 'medium',
                'message': f"Alta probabilità di riconciliazione ({prediction['success_probability']:.1%})",
                'action': 'Priorità processing per questa transazione',
                'confidence': prediction.get('confidence', 0.6)
            })
    
    # Raccomandazioni basate su pattern
    pattern_insights = insights.get('pattern_insights', {})
    if pattern_insights and not pattern_insights.get('error'):
        if pattern_insights.get('recurring_pattern'):
            recommendations.append({
                'type': 'pattern_automation',
                'priority': 'medium',
                'message': 'Pattern ricorrente identificato - considera automatizzazione',
                'action': 'Implementa regole automatiche per transazioni simili',
                'confidence': pattern_insights.get('pattern_strength', 0.5)
            })
    
    # Raccomandazioni basate su client
    client_insights = insights.get('client_insights', {})
    if client_insights and not client_insights.get('error'):
        identified_client = client_insights.get('identified_client')
        if identified_client and identified_client.get('match_confidence', 0) > 0.7:
            reliability = client_insights.get('reliability_analysis', {})
            reliability_score = reliability.get('reliability_score', 0.5)
            
            if reliability_score > 0.8:
                recommendations.append({
                    'type': 'reliable_client',
                    'priority': 'low',
                    'message': f"Cliente affidabile identificato: {identified_client['denomination']}",
                    'action': 'Riconciliazione prioritaria con alta confidenza',
                    'confidence': identified_client['match_confidence']
                })
            elif reliability_score < 0.3:
                recommendations.append({
                    'type': 'risky_client',
                    'priority': 'high',
                    'message': f"Cliente a rischio identificato: {identified_client['denomination']}",
                    'action': 'Verifica accurata prima della riconciliazione',
                    'confidence': identified_client['match_confidence']
                })
    
    # Smart suggestions available
    smart_suggestions = insights.get('smart_suggestions', [])
    if smart_suggestions:
        high_conf_suggestions = [s for s in smart_suggestions if s.get('confidence_score', 0) > 0.8]
        if high_conf_suggestions:
            recommendations.append({
                'type': 'smart_suggestions_available',
                'priority': 'high',
                'message': f'{len(high_conf_suggestions)} suggerimenti ad alta confidenza disponibili',
                'action': 'Rivedi suggerimenti smart per riconciliazione rapida',
                'confidence': max(s.get('confidence_score', 0) for s in high_conf_suggestions)
            })
    
    # Raccomandazione default se nessuna specifica
    if not recommendations:
        basic_info = insights.get('basic_info', {})
        if basic_info.get('status') == 'Da Riconciliare':
            recommendations.append({
                'type': 'general_reconciliation',
                'priority': 'medium',
                'message': 'Transazione non riconciliata - usa strumenti smart per suggerimenti',
                'action': 'Utilizza endpoint smart-suggestions per opzioni di riconciliazione',
                'confidence': 0.5
            })
    
    return recommendations

# ================== ENDPOINT: STATUS TASKS ==================

@router.get("/batch/status/{task_id}")
async def get_batch_task_status_v4(task_id: str = Path(..., description="Background task ID")):
    """📋 Get status of background batch task V4.0"""
    
    if task_id not in background_tasks_status:
        raise HTTPException(
            status_code=404,
            detail=f"Task {task_id} not found"
        )
    
    task_status = background_tasks_status[task_id].copy()
    
    # Add progress percentage
    if task_status.get('total', 0) > 0:
        task_status['progress_percentage'] = (task_status.get('progress', 0) / task_status['total']) * 100
    
    # Add estimated completion time
    if task_status.get('status') == 'processing':
        progress = task_status.get('progress', 0)
        total = task_status.get('total', 1)
        if progress > 0:
            elapsed_time = (datetime.now() - task_status.get('started_at', datetime.now())).total_seconds()
            estimated_total_time = (elapsed_time / progress) * total
            estimated_completion = task_status.get('started_at', datetime.now()) + timedelta(seconds=estimated_total_time)
            task_status['estimated_completion'] = estimated_completion.isoformat()
    
    return APIResponse(
        success=True,
        message="Task status retrieved",
        data=task_status
    )

# ================== FINE PARTE 3/4 ==================
# ================== TRANSACTIONS API V4.0 - PARTE 4/4 ==================
# SEARCH, ANALYTICS, EXPORT, HEALTH, ENDPOINT ORIGINALI

# ================== ENDPOINT: SEARCH AVANZATO V4.0 ==================

@router.get("/search/{query}")
@limiter.limit("60/minute")
@transaction_performance_tracked("search_transactions_v4")
async def search_transactions_v4(
    request: Request,
    query: str = Path(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=100),
    include_reconciled: bool = Query(False, description="Include fully reconciled transactions"),
    search_mode: str = Query("smart", regex="^(smart|exact|fuzzy|ai_enhanced)$", description="Search mode"),
    enhanced_results: bool = Query(False, description="Include AI insights in results"),
    enable_client_matching: bool = Query(False, description="Enable client matching in search")
):
    """🔍 Search transactions with V4.0 AI-enhanced capabilities"""
    
    try:
        logger.info("Processing transaction search V4.0",
                   query=query[:50],
                   search_mode=search_mode,
                   enhanced=enhanced_results)
        
        start_time = time.time()
        
        # Build search conditions based on mode
        search_conditions = []
        search_params = []
        
        if search_mode == "exact":
            search_conditions.append("description = ?")
            search_params.append(query)
        elif search_mode == "fuzzy":
            # Fuzzy search con multiple parole
            words = query.split()
            for word in words:
                if len(word) >= 3:
                    search_conditions.append("description LIKE ?")
                    search_params.append(f"%{word}%")
        elif search_mode == "ai_enhanced":
            # AI-enhanced search con pattern recognition
            enhanced_patterns = _generate_ai_search_patterns_v4(query)
            for pattern in enhanced_patterns:
                search_conditions.append("description LIKE ?")
                search_params.append(f"%{pattern}%")
        else:  # smart mode (default)
            search_conditions.append("description LIKE ?")
            search_params.append(f"%{query}%")
        
        # Try amount search
        try:
            amount_value = float(query.replace(',', '.'))
            search_conditions.append("ABS(amount) = ?")
            search_params.append(abs(amount_value))
        except ValueError:
            pass
        
        if not search_conditions:
            raise HTTPException(status_code=400, detail="No valid search conditions")
        
        # Build final query
        base_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount,
                   CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END as type,
                   unique_hash, reconciled_amount
            FROM BankTransactions
            WHERE ({})
        """.format(" OR ".join(search_conditions))
        
        if not include_reconciled:
            base_query += " AND reconciliation_status != 'Riconciliato Tot.'"
        
        # Smart ordering
        if search_mode == "smart" or search_mode == "ai_enhanced":
            base_query += """
                ORDER BY 
                    CASE WHEN description = ? THEN 0 ELSE 1 END,
                    ABS(amount) DESC,
                    transaction_date DESC 
                LIMIT ?
            """
            search_params.insert(0, query)
            search_params.append(limit)
        else:
            base_query += " ORDER BY transaction_date DESC LIMIT ?"
            search_params.append(limit)
        
        logger.debug("Executing search query V4.0", conditions_count=len(search_conditions))
        db_adapter = get_db_adapter()
        results = await db_adapter.execute_query_async(base_query, tuple(search_params))
        
        # Enhanced results processing
        processed_results = []
        for result in results:
            processed_result = result.copy()
            
            # Add computed fields
            processed_result['is_income'] = result['amount'] > 0
            processed_result['is_expense'] = result['amount'] < 0
            processed_result['amount_formatted'] = f"{result['amount']:,.2f}"
            
            # AI-enhanced relevance scoring
            if search_mode in ["smart", "ai_enhanced"]:
                relevance_score = _calculate_relevance_score_v4(result, query)
                processed_result['relevance_score'] = relevance_score
            
            # Enhanced results con AI insights
            if enhanced_results:
                try:
                    ai_insights = _generate_search_result_insights_v4(result, query)
                    processed_result['ai_insights'] = ai_insights
                except Exception as e:
                    logger.warning("AI insights generation failed for search result", error=str(e))
            
            # Client matching se abilitato
            if enable_client_matching:
                try:
                    potential_client = await _identify_potential_client_v4(result)
                    if potential_client:
                        processed_result['potential_client'] = potential_client
                except Exception as e:
                    logger.warning("Client matching failed for search result", error=str(e))
            
            processed_results.append(processed_result)
        
        # Sort by relevance for smart searches
        if search_mode in ["smart", "ai_enhanced"] and processed_results:
            processed_results = sorted(
                processed_results, 
                key=lambda x: x.get('relevance_score', 0), 
                reverse=True
            )
        
        processing_time = (time.time() - start_time) * 1000
        
        response_data = {
            "query": query,
            "search_mode": search_mode,
            "results": processed_results,
            "total": len(processed_results),
            "processing_time_ms": processing_time,
            "search_metadata": {
                "include_reconciled": include_reconciled,
                "enhanced_results": enhanced_results,
                "client_matching": enable_client_matching,
                "conditions_used": len(search_conditions),
                "has_amount_search": any("amount" in condition for condition in search_conditions),
                "adapter_version": "4.0"
            }
        }
        
        logger.info("Search V4.0 completed", 
                   results_count=len(processed_results),
                   processing_time_ms=processing_time)
        
        return APIResponse(
            success=True,
            message=f"Found {len(processed_results)} results",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search V4.0 failed: {e}")
        raise HTTPException(status_code=500, detail="Search operation failed")

def _generate_ai_search_patterns_v4(query: str) -> List[str]:
    """Genera pattern di ricerca AI-enhanced V4.0"""
    patterns = [query]  # Pattern base
    
    query_lower = query.lower()
    
    # Pattern sinonimi per pagamenti
    payment_synonyms = {
        'bonifico': ['transfer', 'wire', 'banca'],
        'pos': ['carta', 'card', 'payment'],
        'riba': ['rid', 'sdd', 'addebito'],
        'contante': ['cash', 'denaro']
    }
    
    for term, synonyms in payment_synonyms.items():
        if term in query_lower:
            patterns.extend(synonyms)
    
    # Pattern parziali per nomi azienda
    if len(query) > 5 and query.replace(' ', '').isalpha():
        # Aggiungi pattern parziali
        patterns.append(query[:len(query)//2])  # Prima metà
        if ' ' in query:
            patterns.extend(query.split())  # Singole parole
    
    return patterns[:5]  # Max 5 pattern

def _calculate_relevance_score_v4(result: Dict, query: str) -> float:
    """Calcola relevance score V4.0 con AI logic"""
    score = 0.0
    description = result.get('description', '').lower()
    query_lower = query.lower()
    
    # Exact match
    if query_lower == description:
        insights['match_quality'] = 'exact'
        insights['reconciliation_probability'] = 0.9
    elif query_lower in description:
        insights['match_quality'] = 'high'
        insights['reconciliation_probability'] = 0.7
    
    # Suggerimenti azioni
    status = result.get('reconciliation_status', '')
    if status == 'Da Riconciliare':
        insights['suggested_actions'].append('Consider for immediate reconciliation')
        
        amount = abs(result.get('amount', 0))
        if amount > 5000:
            insights['suggested_actions'].append('High value - verify before reconciliation')
            insights['risk_factors'].append('high_amount')
    
    return insights

# ================== ENDPOINT: STATISTICHE AVANZATE V4.0 ==================

@router.get("/stats/summary")
@limiter.limit("30/minute")
@transaction_performance_tracked("stats_summary_v4")
async def get_transactions_stats_v4(
    request: Request,
    use_cache: bool = Query(True, description="Use cached statistics if available"),
    include_trends: bool = Query(False, description="Include trend analysis"),
    include_ai_insights: bool = Query(False, description="Include AI-powered insights"),
    period_months: int = Query(12, ge=1, le=60, description="Period for analysis in months")
):
    """📊 Get transaction statistics summary - Enhanced V4.0 with AI insights"""
    
    try:
        logger.info("Computing transaction statistics V4.0",
                   use_cache=use_cache,
                   include_trends=include_trends,
                   include_ai_insights=include_ai_insights)
        
        # Check cache se abilitato
        cache_key = f"stats_summary_v4_{period_months}_{include_trends}_{include_ai_insights}"
        if use_cache:
            cached_stats = stats_cache.get_stats(cache_key)
            if cached_stats:
                logger.info("Returning cached statistics V4.0")
                return APIResponse(
                    success=True,
                    message="Transaction statistics V4.0 retrieved (cached)",
                    data=cached_stats
                )
        
        start_time = time.time()
        
        # Esegui query parallele per performance ottimali
        db_adapter = get_db_adapter()
        stats_tasks = []
        
        # Core statistics
        stats_tasks.append(db_adapter.execute_query_async("""
            SELECT 
                reconciliation_status,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                SUM(ABS(amount) - reconciled_amount) as remaining_amount,
                AVG(ABS(amount)) as avg_amount,
                MIN(transaction_date) as earliest_date,
                MAX(transaction_date) as latest_date
            FROM BankTransactions
            WHERE transaction_date >= date('now', '-{} months')
            GROUP BY reconciliation_status
        """.format(period_months)))
        
        # Type statistics (Income/Expense)
        stats_tasks.append(db_adapter.execute_query_async("""
            SELECT 
                CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END as type,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                AVG(ABS(amount)) as avg_amount
            FROM BankTransactions
            WHERE transaction_date >= date('now', '-{} months')
            GROUP BY CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END
        """.format(period_months)))
        
        # Recent transactions per context
        stats_tasks.append(db_adapter.execute_query_async("""
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount
            FROM BankTransactions
            WHERE transaction_date >= date('now', '-{} months')
            ORDER BY transaction_date DESC, id DESC
            LIMIT 10
        """.format(period_months)))
        
        # Esegui tutte le query in parallelo
        stats_results = await asyncio.gather(*stats_tasks, return_exceptions=True)
        
        # Processa risultati
        status_stats = stats_results[0] if not isinstance(stats_results[0], Exception) else []
        type_stats = stats_results[1] if not isinstance(stats_results[1], Exception) else []
        recent_transactions = stats_results[2] if not isinstance(stats_results[2], Exception) else []
        
        # Calcola metriche aggregate avanzate
        total_transactions = sum(stat['count'] for stat in status_stats)
        total_volume = sum(stat['total_amount'] for stat in status_stats)
        total_remaining = sum(stat['remaining_amount'] for stat in status_stats)
        
        # Calcola reconciliation rate
        reconciled_count = sum(stat['count'] for stat in status_stats if stat['reconciliation_status'] == 'Riconciliato Tot.')
        reconciliation_rate = (reconciled_count / total_transactions * 100) if total_transactions > 0 else 0
        
        # Calcola efficiency metrics
        efficiency_metrics = {
            'reconciliation_rate_percent': reconciliation_rate,
            'volume_reconciled_percent': ((total_volume - total_remaining) / total_volume * 100) if total_volume > 0 else 0,
            'avg_transaction_amount': total_volume / total_transactions if total_transactions > 0 else 0,
            'total_unreconciled_amount': total_remaining
        }
        
        # Componi statistiche complete V4.0
        stats_data = {
            "period_months": period_months,
            "status_statistics": status_stats,
            "type_statistics": type_stats,
            "recent_transactions": recent_transactions,
            "efficiency_metrics": efficiency_metrics,
            "summary_metrics": {
                "total_transactions": total_transactions,
                "total_volume": total_volume,
                "total_remaining_amount": total_remaining,
                "reconciliation_rate": reconciliation_rate,
                "cache_hit_rate": stats_cache.get_hit_rate(),
                "analysis_period": f"Last {period_months} months",
                "last_updated": datetime.now().isoformat(),
                "adapter_version": "4.0"
            }
        }
        
        # Aggiungi trend analysis se richiesto
        if include_trends:
            try:
                monthly_trends = await db_adapter.execute_query_async("""
                    SELECT 
                        strftime('%Y-%m', transaction_date) as month,
                        COUNT(*) as transaction_count,
                        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
                        SUM(amount) as net_flow,
                        COUNT(CASE WHEN reconciliation_status = 'Riconciliato Tot.' THEN 1 END) as reconciled_count,
                        AVG(ABS(amount)) as avg_transaction_amount
                    FROM BankTransactions
                    WHERE transaction_date >= date('now', '-{} months')
                    GROUP BY strftime('%Y-%m', transaction_date)
                    ORDER BY month
                """.format(period_months))
                
                if monthly_trends:
                    trend_analysis = _analyze_monthly_trends_v4(monthly_trends)
                    stats_data["monthly_trends"] = monthly_trends
                    stats_data["trend_analysis"] = trend_analysis
            except Exception as e:
                logger.warning("Trend analysis failed", error=str(e))
        
        # Aggiungi AI insights se richiesto
        if include_ai_insights:
            try:
                ai_insights = _generate_transaction_ai_insights_v4(stats_data)
                stats_data["ai_insights"] = ai_insights
            except Exception as e:
                logger.warning("AI insights generation failed", error=str(e))
                stats_data["ai_insights"] = {"error": "AI insights temporarily unavailable"}
        
        # Cache result
        if use_cache:
            stats_cache.set_stats(stats_data, cache_key)
        
        processing_time = (time.time() - start_time) * 1000
        logger.info("Statistics V4.0 computed successfully", processing_time_ms=processing_time)
        
        return APIResponse(
            success=True,
            message="Transaction statistics V4.0 retrieved",
            data=stats_data
        )
        
    except Exception as e:
        logger.error(f"Statistics V4.0 computation failed: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving statistics V4.0")

def _analyze_monthly_trends_v4(monthly_data: List[Dict]) -> Dict[str, Any]:
    """Analizza trend mensili V4.0"""
    if not monthly_data or len(monthly_data) < 3:
        return {"error": "Insufficient data for trend analysis"}
    
    # Converti in DataFrame per analisi
    df = pd.DataFrame(monthly_data)
    
    trend_analysis = {
        "total_months": len(monthly_data),
        "income_trend": _calculate_trend_v4(df['total_income'].tolist()),
        "expense_trend": _calculate_trend_v4(df['total_expenses'].tolist()),
        "transaction_volume_trend": _calculate_trend_v4(df['transaction_count'].tolist()),
        "reconciliation_efficiency_trend": _calculate_trend_v4((df['reconciled_count'] / df['transaction_count']).tolist()),
        "net_flow_analysis": _analyze_net_flow_v4(df['net_flow'].tolist())
    }
    
    return trend_analysis

def _calculate_trend_v4(values: List[float]) -> Dict[str, Any]:
    """Calcola trend per serie di valori V4.0"""
    if len(values) < 2:
        return {"trend": "insufficient_data"}
    
    # Calcola slope semplice
    x = list(range(len(values)))
    n = len(values)
    
    sum_x = sum(x)
    sum_y = sum(values)
    sum_xy = sum(x[i] * values[i] for i in range(n))
    sum_x2 = sum(xi * xi for xi in x)
    
    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    
    # Determina direzione trend
    if slope > 0.1:
        trend_direction = "increasing"
    elif slope < -0.1:
        trend_direction = "decreasing"
    else:
        trend_direction = "stable"
    
    # Calcola variabilità
    avg_value = sum(values) / len(values)
    variance = sum((v - avg_value) ** 2 for v in values) / len(values)
    volatility = (variance ** 0.5) / avg_value if avg_value > 0 else 0
    
    return {
        "trend": trend_direction,
        "slope": slope,
        "volatility": volatility,
        "average": avg_value,
        "latest_value": values[-1],
        "change_from_start": ((values[-1] - values[0]) / values[0] * 100) if values[0] != 0 else 0
    }

def _analyze_net_flow_v4(net_flows: List[float]) -> Dict[str, Any]:
    """Analizza net flow V4.0"""
    positive_months = len([f for f in net_flows if f > 0])
    negative_months = len([f for f in net_flows if f < 0])
    
    return {
        "positive_months": positive_months,
        "negative_months": negative_months,
        "neutral_months": len(net_flows) - positive_months - negative_months,
        "positive_ratio": positive_months / len(net_flows) if net_flows else 0,
        "total_net_flow": sum(net_flows),
        "avg_monthly_net_flow": sum(net_flows) / len(net_flows) if net_flows else 0,
        "best_month": max(net_flows) if net_flows else 0,
        "worst_month": min(net_flows) if net_flows else 0
    }

def _generate_transaction_ai_insights_v4(stats_data: Dict) -> Dict[str, Any]:
    """Genera AI insights complessivi per transazioni V4.0"""
    insights = {
        "performance_assessment": "good",
        "reconciliation_health": "healthy",
        "key_recommendations": [],
        "risk_indicators": [],
        "opportunities": [],
        "efficiency_score": 0.0
    }
    
    # Analizza reconciliation rate
    reconciliation_rate = stats_data.get("summary_metrics", {}).get("reconciliation_rate", 0)
    
    if reconciliation_rate >= 80:
        insights["reconciliation_health"] = "excellent"
        insights["opportunities"].append("Ottima efficienza riconciliazione - considera automazione avanzata")
    elif reconciliation_rate >= 60:
        insights["reconciliation_health"] = "good"
        insights["key_recommendations"].append("Buona efficienza - migliora con AI suggestions")
    else:
        insights["reconciliation_health"] = "needs_improvement"
        insights["key_recommendations"].append("Bassa efficienza riconciliazione - abilita tutte le funzionalità AI")
        insights["risk_indicators"].append("high_unreconciled_volume")
    
    # Analizza volume e pattern
    total_volume = stats_data.get("summary_metrics", {}).get("total_volume", 0)
    total_transactions = stats_data.get("summary_metrics", {}).get("total_transactions", 0)
    
    if total_transactions > 1000:
        insights["opportunities"].append("Alto volume transazioni - ideale per pattern learning automatico")
    
    avg_amount = total_volume / total_transactions if total_transactions > 0 else 0
    if avg_amount > 1000:
        insights["opportunities"].append("Transazioni alto valore - priorità reconciliation intelligente")
    
    # Calcola efficiency score
    efficiency_factors = []
    if reconciliation_rate > 0:
        efficiency_factors.append(min(100, reconciliation_rate) / 100)
    
    cache_hit_rate = stats_data.get("summary_metrics", {}).get("cache_hit_rate", 0)
    if cache_hit_rate > 0:
        efficiency_factors.append(cache_hit_rate)
    
    insights["efficiency_score"] = sum(efficiency_factors) / len(efficiency_factors) if efficiency_factors else 0.5
    
    # Performance assessment complessivo
    if insights["efficiency_score"] >= 0.8:
        insights["performance_assessment"] = "excellent"
    elif insights["efficiency_score"] >= 0.6:
        insights["performance_assessment"] = "good"
    else:
        insights["performance_assessment"] = "needs_improvement"
    
    return insights

# ================== ENDPOINT: HEALTH & METRICS ==================

@router.get("/health")
async def health_check_v4():
    """Health check endpoint V4.0"""
    try:
        # Test database connection
        db_adapter = get_db_adapter()
        await db_adapter.execute_query_async("SELECT 1")
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "transactions_api_v4",
            "version": "4.0.0",
            "adapter_version": "4.0",
            "cache_status": "operational",
            "cache_hit_rate": stats_cache.get_hit_rate()
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/metrics")
async def get_api_metrics_v4():
    """Get API performance metrics V4.0"""
    try:
        db_adapter = get_db_adapter()
        
        # Get basic transaction counts
        total_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM BankTransactions"
        )
        
        reconciled_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM BankTransactions WHERE reconciliation_status = 'Riconciliato Tot.'"
        )
        
        total = total_count[0]['count'] if total_count else 0
        reconciled = reconciled_count[0]['count'] if reconciled_count else 0
        
        return APIResponse(
            success=True,
            message="API metrics V4.0 retrieved",
            data={
                "total_transactions": total,
                "reconciled_transactions": reconciled,
                "reconciliation_percentage": (reconciled / total * 100) if total > 0 else 0,
                "cache_metrics": stats_cache.get_cache_stats(),
                "background_tasks_active": len([
                    task for task in background_tasks_status.values() 
                    if task.get('status') == 'processing'
                ]),
                "background_tasks_total": len(background_tasks_status),
                "api_version": "4.0.0",
                "adapter_version": "4.0",
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error("Metrics collection failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Metrics collection failed"
        )

# ================== ENDPOINT ORIGINALI MANTENUTI PER COMPATIBILITÀ ==================

@router.post("/", response_model=BankTransaction)
async def create_transaction(transaction_data: BankTransactionCreate):
    """Create new bank transaction - Original implementation maintained"""
    try:
        db_adapter = get_db_adapter()
        
        # Verifica duplicati usando hash unico
        existing = await db_adapter.check_duplicate_async(
            'BankTransactions', 'unique_hash', transaction_data.unique_hash
        )
        
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"Transaction with hash {transaction_data.unique_hash} already exists"
            )
        
        # Crea transazione usando adapter
        insert_query = """
            INSERT INTO BankTransactions 
            (transaction_date, value_date, amount, description, causale_abi, 
             unique_hash, reconciled_amount, reconciliation_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0.0, 'Da Riconciliare', datetime('now'))
        """
        
        params = (
            transaction_data.transaction_date.isoformat(),
            transaction_data.value_date.isoformat() if transaction_data.value_date else None,
            transaction_data.amount,
            transaction_data.description,
            transaction_data.causale_abi,
            transaction_data.unique_hash
        )
        
        new_id = await db_adapter.execute_write_async(insert_query, params)
        
        if not new_id:
            raise HTTPException(status_code=500, detail="Failed to create transaction")
        
        # Restituisci la transazione creata
        return await get_transaction_by_id_v4(new_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating transaction")

@router.put("/{transaction_id}", response_model=BankTransaction)
async def update_transaction(
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    transaction_data: BankTransactionUpdate = Body(..., description="Transaction data to update")
):
    """Update existing bank transaction - Enhanced with V4.0 validation"""
    try:
        db_adapter = get_db_adapter()
        
        # Verifica esistenza
        existing = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Prepara update query dinamico
        update_fields = []
        params = []
        
        if transaction_data.transaction_date is not None:
            update_fields.append("transaction_date = ?")
            params.append(transaction_data.transaction_date.isoformat())
        
        if transaction_data.value_date is not None:
            update_fields.append("value_date = ?")
            params.append(transaction_data.value_date.isoformat())
        
        if transaction_data.amount is not None:
            update_fields.append("amount = ?")
            params.append(transaction_data.amount)
        
        if transaction_data.description is not None:
            update_fields.append("description = ?")
            params.append(transaction_data.description)
        
        if transaction_data.causale_abi is not None:
            update_fields.append("causale_abi = ?")
            params.append(transaction_data.causale_abi)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Aggiungi timestamp update
        update_fields.append("updated_at = datetime('now')")
        params.append(transaction_id)
        
        update_query = f"""
            UPDATE BankTransactions 
            SET {', '.join(update_fields)}
            WHERE id = ?
        """
        
        success = await db_adapter.execute_write_async(update_query, params)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update transaction")
        
        # Restituisci la transazione aggiornata
        return await get_transaction_by_id_v4(transaction_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transaction {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail="Error updating transaction")

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    confirm: bool = Query(False, description="Confirm deletion")
):
    """Delete bank transaction - Enhanced with safety checks"""
    try:
        if not confirm:
            raise HTTPException(
                status_code=400, 
                detail="Deletion must be confirmed with confirm=true parameter"
            )
        
        db_adapter = get_db_adapter()
        
        # Verifica esistenza e stato
        existing = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verifica se è sicuro eliminare
        if existing.get('reconciliation_status') == 'Riconciliato Tot.':
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete fully reconciled transaction"
            )
        
        # Elimina transazione
        delete_query = "DELETE FROM BankTransactions WHERE id = ?"
        success = await db_adapter.execute_write_async(delete_query, (transaction_id,))
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete transaction")
        
        logger.info(f"Transaction {transaction_id} deleted successfully")
        
        return APIResponse(
            success=True,
            message=f"Transaction {transaction_id} deleted successfully",
            data={"transaction_id": transaction_id, "deleted": True}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail="Error deleting transaction")

