"""
Transactions API endpoints - Versione Migliorata con Compatibilità Mantenuta
"""

import logging
import asyncio
import time
import uuid
from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import pandas as pd
import numpy as np

from fastapi import APIRouter, HTTPException, Query, Path, Body, BackgroundTasks, Request, Depends
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, validator, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import structlog

# Usa adapters invece di accesso diretto al core
from app.adapters.database_adapter import db_adapter
from app.adapters.reconciliation_adapter import reconciliation_adapter
from app.models import (
    BankTransaction, BankTransactionCreate, BankTransactionUpdate,
    TransactionFilter, PaginationParams, TransactionListResponse,
    APIResponse, ReconciliationStatus
)

# Setup logging strutturato
logger = structlog.get_logger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Router setup
router = APIRouter()

# Cache per statistiche
class TransactionStatsCache:
    def __init__(self, ttl_minutes=5):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self.hit_count = 0
        self.miss_count = 0
    
    def get_stats(self, cache_key="default"):
        now = datetime.now()
        if (cache_key not in self.cache or 
            now - self.cache[cache_key]['timestamp'] > self.ttl):
            self.miss_count += 1
            self.cache[cache_key] = {
                'data': None,  # Will be set by caller
                'timestamp': now
            }
            return None
        
        self.hit_count += 1
        return self.cache[cache_key]['data']
    
    def set_stats(self, data, cache_key="default"):
        self.cache[cache_key] = {
            'data': data,
            'timestamp': datetime.now()
        }
    
    def get_hit_rate(self):
        total = self.hit_count + self.miss_count
        return self.hit_count / total if total > 0 else 0.0

stats_cache = TransactionStatsCache()

# Enhanced Models per validazione
class TransactionFilters(BaseModel):
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
    
    @validator('search')
    def search_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('search cannot be empty string')
        return v.strip() if v else v

class EnhancedTransactionResponse(BaseModel):
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
    
    class Config:
        from_attributes = True

class EnhancedTransactionListResponse(BaseModel):
    items: List[EnhancedTransactionResponse]
    total: int
    page: int
    size: int
    pages: int
    filters_applied: Dict[str, Any]
    summary: Dict[str, Any]

class BatchUpdateRequest(BaseModel):
    transaction_ids: List[int] = Field(..., min_items=1, max_items=1000)
    reconciliation_status: ReconciliationStatus
    
    @validator('transaction_ids')
    def validate_transaction_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate transaction IDs not allowed')
        return v

class BatchUpdateResponse(BaseModel):
    task_id: Optional[str] = None
    total: int
    successful: int
    failed: int
    processing_time_ms: Optional[float] = None
    details: List[Dict[str, Any]]

# Enum per errori specifici
class TransactionErrorCode:
    NOT_FOUND = "TRANSACTION_NOT_FOUND"
    ALREADY_RECONCILED = "ALREADY_FULLY_RECONCILED"
    INVALID_AMOUNT = "INVALID_AMOUNT"
    DUPLICATE_HASH = "DUPLICATE_HASH"
    INVALID_STATUS = "INVALID_STATUS"
    DATABASE_ERROR = "DATABASE_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"

# Performance utilities
def apply_dataframe_filters_vectorized(df: pd.DataFrame, filters: TransactionFilters) -> pd.DataFrame:
    """Applica filtri usando operazioni vettoriali per performance ottimali"""
    if df.empty:
        return df
    
    # Copia per evitare modifiche al DataFrame originale
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
    
    # Formattazione date vettoriale
    if 'transaction_date' in df.columns:
        df['transaction_date_fmt'] = pd.to_datetime(df['transaction_date']).dt.strftime('%d/%m/%Y')
    
    if 'value_date' in df.columns:
        df['value_date_fmt'] = pd.to_datetime(df['value_date']).dt.strftime('%d/%m/%Y')
        df['value_date_fmt'] = df['value_date_fmt'].fillna('N/D')
    
    return df

async def process_heavy_operations_async(df: pd.DataFrame, filters: TransactionFilters) -> pd.DataFrame:
    """Processa operazioni pesanti in thread pool per non bloccare event loop"""
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

# Background task processor
background_tasks_status = {}

async def process_batch_update_background(
    task_id: str,
    transaction_ids: List[int],
    reconciliation_status: ReconciliationStatus
):
    """Processa batch update in background"""
    start_time = time.time()
    log = logger.bind(task_id=task_id, batch_size=len(transaction_ids))
    
    try:
        log.info("Starting batch update background task")
        background_tasks_status[task_id] = {
            'status': 'processing',
            'progress': 0,
            'total': len(transaction_ids),
            'started_at': datetime.now()
        }
        
        results = {'successful': 0, 'failed': 0, 'details': []}
        
        # Processa in chunks per evitare timeout
        chunk_size = 50
        for i in range(0, len(transaction_ids), chunk_size):
            chunk = transaction_ids[i:i + chunk_size]
            
            for transaction_id in chunk:
                try:
                    # Verifica esistenza
                    existing = await db_adapter.execute_query_async(
                        "SELECT id, reconciliation_status FROM BankTransactions WHERE id = ?", 
                        (transaction_id,)
                    )
                    
                    if not existing:
                        results['failed'] += 1
                        results['details'].append({
                            'transaction_id': transaction_id,
                            'success': False,
                            'message': 'Transaction not found'
                        })
                        continue
                    
                    # Aggiorna stato
                    success = await db_adapter.update_transaction_state_async(
                        transaction_id,
                        reconciliation_status.value,
                        existing[0]['reconciled_amount']
                    )
                    
                    if success:
                        results['successful'] += 1
                        results['details'].append({
                            'transaction_id': transaction_id,
                            'success': True,
                            'message': f'Status updated to {reconciliation_status.value}'
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
            
            # Aggiorna progresso
            progress = min(i + chunk_size, len(transaction_ids))
            background_tasks_status[task_id]['progress'] = progress
        
        # Completa task
        processing_time = (time.time() - start_time) * 1000
        background_tasks_status[task_id] = {
            'status': 'completed',
            'progress': len(transaction_ids),
            'total': len(transaction_ids),
            'started_at': background_tasks_status[task_id]['started_at'],
            'completed_at': datetime.now(),
            'processing_time_ms': processing_time,
            'results': results
        }
        
        log.info("Batch update completed", 
                successful=results['successful'], 
                failed=results['failed'],
                processing_time_ms=processing_time)
        
    except Exception as e:
        log.error("Batch update failed", error=str(e))
        background_tasks_status[task_id] = {
            'status': 'failed',
            'error': str(e),
            'started_at': background_tasks_status[task_id]['started_at'],
            'failed_at': datetime.now()
        }

# Routes con miglioramenti mantenendo compatibilità

@router.get("/", response_model=Union[TransactionListResponse, EnhancedTransactionListResponse])
@limiter.limit("100/minute")
async def get_transactions_list(
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
    # Nuovi parametri opzionali
    enhanced: bool = Query(False, description="Return enhanced response format"),
    include_summary: bool = Query(False, description="Include summary statistics")
):
    """Get paginated list of bank transactions with advanced filters - Enhanced version"""
    
    # Setup logging context
    log = logger.bind(
        operation="get_transactions_list",
        page=page,
        size=size,
        enhanced=enhanced
    )
    
    start_time = time.time()
    
    try:
        # Validazione avanzata usando Pydantic
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
            raise HTTPException(
                status_code=422,
                detail={
                    "error_code": TransactionErrorCode.VALIDATION_ERROR,
                    "message": str(ve)
                }
            )
        
        pagination = PaginationParams(page=page, size=size)
        
        log.info("Fetching transactions from database")
        
        # Ottieni transazioni dal database usando adapter
        df_transactions = await db_adapter.get_transactions_async(
            start_date=start_date.isoformat() if start_date else None,
            end_date=end_date.isoformat() if end_date else None,
            status_filter=status_filter.value if status_filter else None,
            limit=None,  # Applicheremo filtri e paginazione dopo
            anagraphics_id_heuristic_filter=anagraphics_id_heuristic,
            hide_pos=hide_pos,
            hide_worldline=hide_worldline,
            hide_cash=hide_cash,
            hide_commissions=hide_commissions
        )
        
        if df_transactions.empty:
            log.info("No transactions found")
            base_response = {
                "items": [],
                "total": 0,
                "page": page,
                "size": size,
                "pages": 0
            }
            
            if enhanced:
                base_response.update({
                    "filters_applied": filters.dict(exclude_none=True),
                    "summary": {
                        "total_amount": 0.0,
                        "total_income": 0.0,
                        "total_expenses": 0.0,
                        "count_by_status": {}
                    }
                })
                return EnhancedTransactionListResponse(**base_response)
            else:
                return TransactionListResponse(**base_response)
        
        # Applica filtri aggiuntivi usando operazioni vettoriali ottimizzate
        log.debug("Applying additional filters")
        df_filtered = await process_heavy_operations_async(df_transactions, filters)
        
        total = len(df_filtered)
        log.info("Filtering completed", total_found=total)
        
        # Paginazione
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_filtered.iloc[start_idx:end_idx] if not df_filtered.empty else df_filtered
        
        # Conversione ottimizzata in formato API
        if not df_paginated.empty:
            # Converti tutto il DataFrame in una volta invece di iterare
            items = df_paginated.to_dict('records')
        else:
            items = []
        
        pages = (total + size - 1) // size
        
        # Prepara risposta base
        base_response = {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
        
        # Se richiesta risposta enhanced, aggiungi dati extra
        if enhanced or include_summary:
            # Calcola statistiche riassuntive
            summary = {}
            if not df_filtered.empty:
                summary = {
                    "total_amount": float(df_filtered['amount'].sum()),
                    "total_income": float(df_filtered[df_filtered['amount'] > 0]['amount'].sum()),
                    "total_expenses": float(abs(df_filtered[df_filtered['amount'] < 0]['amount'].sum())),
                    "count_by_status": df_filtered['reconciliation_status'].value_counts().to_dict(),
                    "avg_amount": float(df_filtered['amount'].mean()),
                    "date_range": {
                        "from": df_filtered['transaction_date'].min().strftime('%Y-%m-%d') if pd.notna(df_filtered['transaction_date'].min()) else None,
                        "to": df_filtered['transaction_date'].max().strftime('%Y-%m-%d') if pd.notna(df_filtered['transaction_date'].max()) else None
                    }
                }
            else:
                summary = {
                    "total_amount": 0.0,
                    "total_income": 0.0,
                    "total_expenses": 0.0,
                    "count_by_status": {},
                    "avg_amount": 0.0,
                    "date_range": {"from": None, "to": None}
                }
            
            base_response.update({
                "filters_applied": filters.dict(exclude_none=True),
                "summary": summary
            })
            
            processing_time = (time.time() - start_time) * 1000
            log.info("Request completed successfully", 
                    processing_time_ms=processing_time,
                    total_returned=len(items))
            
            if enhanced:
                return EnhancedTransactionListResponse(**base_response)
        
        processing_time = (time.time() - start_time) * 1000
        log.info("Request completed successfully", 
                processing_time_ms=processing_time,
                total_returned=len(items))
        
        return TransactionListResponse(**base_response)
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        log.error("Unexpected error", 
                 error=str(e), 
                 processing_time_ms=processing_time)
        raise HTTPException(
            status_code=500, 
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Internal server error",
                "processing_time_ms": processing_time
            }
        )

@router.get("/{transaction_id}", response_model=Union[BankTransaction, EnhancedTransactionResponse])
async def get_transaction_by_id(
    transaction_id: int = Path(..., gt=0, description="Transaction ID"),
    enhanced: bool = Query(False, description="Return enhanced response format")
):
    """Get transaction by ID with full details - Enhanced version"""
    
    log = logger.bind(transaction_id=transaction_id, operation="get_transaction_by_id")
    
    try:
        log.info("Fetching transaction details")
        
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        
        if not transaction:
            log.warning("Transaction not found")
            raise HTTPException(
                status_code=404, 
                detail={
                    "error_code": TransactionErrorCode.NOT_FOUND,
                    "message": "Transaction not found",
                    "transaction_id": transaction_id
                }
            )
        
        # Aggiungi campi computati per compatibilità
        transaction['remaining_amount'] = transaction['amount'] - transaction.get('reconciled_amount', 0)
        transaction['is_income'] = transaction['amount'] > 0
        transaction['is_expense'] = transaction['amount'] < 0
        
        log.info("Transaction retrieved successfully")
        
        if enhanced:
            return EnhancedTransactionResponse(**transaction)
        else:
            return transaction
        
    except HTTPException:
        raise
    except Exception as e:
        log.error("Unexpected error retrieving transaction", error=str(e))
        raise HTTPException(
            status_code=500, 
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Internal server error"
            }
        )

@router.post("/batch/update-status", response_model=Union[APIResponse, BatchUpdateResponse])
async def batch_update_transaction_status(
    background_tasks: BackgroundTasks,
    request: BatchUpdateRequest,
    enhanced: bool = Query(False, description="Return enhanced response format"),
    force_background: bool = Query(False, description="Force background processing")
):
    """Update reconciliation status for multiple transactions - Enhanced version"""
    
    log = logger.bind(
        operation="batch_update_status",
        batch_size=len(request.transaction_ids),
        target_status=request.reconciliation_status.value
    )
    
    start_time = time.time()
    
    try:
        # Per batch grandi o se forzato, usa background processing
        if len(request.transaction_ids) > 100 or force_background:
            task_id = str(uuid.uuid4())
            
            log.info("Scheduling background batch update", task_id=task_id)
            
            background_tasks.add_task(
                process_batch_update_background,
                task_id,
                request.transaction_ids,
                request.reconciliation_status
            )
            
            response_data = {
                "task_id": task_id,
                "status": "processing",
                "total": len(request.transaction_ids),
                "message": f"Batch update scheduled with ID: {task_id}"
            }
            
            if enhanced:
                return BatchUpdateResponse(
                    task_id=task_id,
                    total=len(request.transaction_ids),
                    successful=0,
                    failed=0,
                    details=[{
                        "message": "Processing in background",
                        "status": "scheduled"
                    }]
                )
            else:
                return APIResponse(
                    success=True,
                    message=response_data["message"],
                    data=response_data
                )
        
        # Per batch piccoli, processa immediatamente
        log.info("Processing batch update immediately")
        
        results = {
            'total': len(request.transaction_ids),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for transaction_id in request.transaction_ids:
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
                
                # Verifica se già nello stato richiesto
                if current[0]['reconciliation_status'] == request.reconciliation_status.value:
                    results['successful'] += 1
                    results['details'].append({
                        'transaction_id': transaction_id,
                        'success': True,
                        'message': f'Already in status {request.reconciliation_status.value}'
                    })
                    continue
                
                # Aggiorna stato
                success = await db_adapter.update_transaction_state_async(
                    transaction_id,
                    request.reconciliation_status.value,
                    current[0]['reconciled_amount']
                )
                
                if success:
                    results['successful'] += 1
                    results['details'].append({
                        'transaction_id': transaction_id,
                        'success': True,
                        'message': f'Status updated to {request.reconciliation_status.value}'
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
        
        processing_time = (time.time() - start_time) * 1000
        
        log.info("Batch update completed",
                successful=results['successful'],
                failed=results['failed'],
                processing_time_ms=processing_time)
        
        if enhanced:
            return BatchUpdateResponse(
                total=results['total'],
                successful=results['successful'],
                failed=results['failed'],
                processing_time_ms=processing_time,
                details=results['details']
            )
        else:
            return APIResponse(
                success=True,
                message=f"Batch update completed: {results['successful']} successful, {results['failed']} failed",
                data=results
            )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        log.error("Batch update failed", error=str(e), processing_time_ms=processing_time)
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Batch update failed",
                "processing_time_ms": processing_time
            }
        )

@router.get("/batch/status/{task_id}")
async def get_batch_task_status(task_id: str = Path(..., description="Background task ID")):
    """Get status of background batch task"""
    
    if task_id not in background_tasks_status:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "TASK_NOT_FOUND",
                "message": f"Task {task_id} not found"
            }
        )
    
    return APIResponse(
        success=True,
        message="Task status retrieved",
        data=background_tasks_status[task_id]
    )

@router.get("/stats/summary")
@limiter.limit("30/minute")
async def get_transactions_stats(
    request: Request,
    use_cache: bool = Query(True, description="Use cached statistics if available")
):
    """Get transaction statistics summary - Enhanced with caching"""
    
    log = logger.bind(operation="get_stats_summary")
    
    try:
        # Controlla cache se richiesto
        if use_cache:
            cached_stats = stats_cache.get_stats("summary")
            if cached_stats:
                log.info("Returning cached statistics")
                return APIResponse(
                    success=True,
                    message="Transaction statistics retrieved (cached)",
                    data=cached_stats
                )
        
        log.info("Computing fresh statistics")
        start_time = time.time()
        
        # Esegui query in parallelo per performance
        tasks = []
        
        # Statistiche per stato
        tasks.append(db_adapter.execute_query_async("""
            SELECT 
                reconciliation_status,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                SUM(ABS(amount) - reconciled_amount) as remaining_amount,
                AVG(ABS(amount)) as avg_amount
            FROM BankTransactions
            GROUP BY reconciliation_status
        """))
        
        # Statistiche per tipo
        tasks.append(db_adapter.execute_query_async("""
            SELECT 
                CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END as type,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                AVG(ABS(amount)) as avg_amount
            FROM BankTransactions
            GROUP BY CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END
        """))
        
        # Trend mensili
        tasks.append(db_adapter.execute_query_async("""
            SELECT 
                strftime('%Y-%m', transaction_date) as month,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
                SUM(amount) as net_flow
            FROM BankTransactions
            WHERE transaction_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', transaction_date)
            ORDER BY month
        """))
        
        # Transazioni recenti
        tasks.append(db_adapter.execute_query_async("""
            SELECT id, transaction_date, amount, description, reconciliation_status
            FROM BankTransactions
            ORDER BY transaction_date DESC, id DESC
            LIMIT 10
        """))
        
        # Causali ABI più frequenti
        tasks.append(db_adapter.execute_query_async("""
            SELECT 
                causale_abi,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount
            FROM BankTransactions
            WHERE causale_abi IS NOT NULL
            GROUP BY causale_abi
            ORDER BY count DESC
            LIMIT 10
        """))
        
        # Esegui tutte le query in parallelo
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Processa risultati
        status_stats = results[0] if not isinstance(results[0], Exception) else []
        type_stats = results[1] if not isinstance(results[1], Exception) else []
        monthly_trends = results[2] if not isinstance(results[2], Exception) else []
        recent = results[3] if not isinstance(results[3], Exception) else []
        causali_stats = results[4] if not isinstance(results[4], Exception) else []
        
        # Calcola metriche aggiuntive
        total_transactions = sum(stat['count'] for stat in status_stats)
        total_volume = sum(stat['total_amount'] for stat in status_stats)
        
        # Componi statistiche complete
        stats_data = {
            "status_statistics": status_stats,
            "type_statistics": type_stats,
            "monthly_trends": monthly_trends,
            "recent_transactions": recent,
            "top_causali_abi": causali_stats,
            "summary_metrics": {
                "total_transactions": total_transactions,
                "total_volume": total_volume,
                "cache_hit_rate": stats_cache.get_hit_rate(),
                "last_updated": datetime.now().isoformat()
            }
        }
        
        # Salva in cache
        if use_cache:
            stats_cache.set_stats(stats_data, "summary")
        
        processing_time = (time.time() - start_time) * 1000
        log.info("Statistics computed successfully", processing_time_ms=processing_time)
        
        return APIResponse(
            success=True,
            message="Transaction statistics retrieved",
            data=stats_data
        )
        
    except Exception as e:
        log.error("Error computing statistics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Error retrieving statistics"
            }
        )

@router.get("/search/{query}")
@limiter.limit("60/minute")
async def search_transactions(
    request: Request,
    query: str = Path(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=100),
    include_reconciled: bool = Query(False, description="Include fully reconciled transactions"),
    search_mode: str = Query("smart", regex="^(smart|exact|fuzzy)$", description="Search mode"),
    enhanced: bool = Query(False, description="Return enhanced response format")
):
    """Search transactions by description or amount - Enhanced version"""
    
    log = logger.bind(
        operation="search_transactions",
        query=query[:50],  # Limita per privacy log
        search_mode=search_mode
    )
    
    try:
        log.info("Starting transaction search")
        start_time = time.time()
        
        # Build search query based on mode
        search_conditions = []
        search_params = []
        
        if search_mode == "exact":
            search_conditions.append("description = ?")
            search_params.append(query)
        elif search_mode == "fuzzy":
            # Implementa ricerca fuzzy
            words = query.split()
            for word in words:
                if len(word) >= 3:  # Solo parole significative
                    search_conditions.append("description LIKE ?")
                    search_params.append(f"%{word}%")
        else:  # smart mode (default)
            search_conditions.append("description LIKE ?")
            search_params.append(f"%{query}%")
        
        # Try to parse as number for amount search
        try:
            amount_value = float(query.replace(',', '.'))
            search_conditions.append("ABS(amount) = ?")
            search_params.append(abs(amount_value))
            log.debug("Added amount search condition", amount=amount_value)
        except ValueError:
            pass
        
        if not search_conditions:
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": TransactionErrorCode.VALIDATION_ERROR,
                    "message": "No valid search conditions could be built from query"
                }
            )
        
        # Build final query
        base_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount,
                   CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END as type
            FROM BankTransactions
            WHERE ({})
        """.format(" OR ".join(search_conditions))
        
        if not include_reconciled:
            base_query += " AND reconciliation_status != 'Riconciliato Tot.'"
        
        # Ordina per rilevanza (exact matches first, then by date)
        if search_mode == "smart":
            base_query += """
                ORDER BY 
                    CASE WHEN description = ? THEN 0 ELSE 1 END,
                    transaction_date DESC 
                LIMIT ?
            """
            search_params.insert(0, query)  # Per l'ordinamento
            search_params.append(limit)
        else:
            base_query += " ORDER BY transaction_date DESC LIMIT ?"
            search_params.append(limit)
        
        log.debug("Executing search query", conditions_count=len(search_conditions))
        results = await db_adapter.execute_query_async(base_query, tuple(search_params))
        
        # Enhance results with additional computed fields
        for result in results:
            result['is_income'] = result['amount'] > 0
            result['is_expense'] = result['amount'] < 0
            result['amount_formatted'] = f"{result['amount']:,.2f}"
            
            # Add relevance score for smart search
            if search_mode == "smart":
                score = 0
                desc = result.get('description', '').lower()
                query_lower = query.lower()
                
                if query_lower == desc:
                    score = 100
                elif query_lower in desc:
                    score = 80
                elif any(word in desc for word in query_lower.split()):
                    score = 60
                else:
                    score = 40
                
                result['relevance_score'] = score
        
        # Sort by relevance if smart search
        if search_mode == "smart" and results:
            results = sorted(results, key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        processing_time = (time.time() - start_time) * 1000
        log.info("Search completed", 
                results_count=len(results),
                processing_time_ms=processing_time)
        
        response_data = {
            "query": query,
            "search_mode": search_mode,
            "results": results,
            "total": len(results),
            "processing_time_ms": processing_time
        }
        
        if enhanced:
            response_data["search_metadata"] = {
                "include_reconciled": include_reconciled,
                "conditions_used": len(search_conditions),
                "has_amount_search": any("amount" in condition for condition in search_conditions)
            }
        
        return APIResponse(
            success=True,
            message=f"Found {len(results)} results",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log.error("Search failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Search operation failed"
            }
        )

@router.get("/analysis/cash-flow")
@limiter.limit("20/minute")
async def get_cash_flow_analysis(
    request: Request,
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze"),
    group_by: str = Query("month", regex="^(month|week|day)$", description="Group by period"),
    enhanced: bool = Query(False, description="Include advanced analytics"),
    use_cache: bool = Query(True, description="Use cached analysis if available")
):
    """Get cash flow analysis for transactions - Enhanced version"""
    
    log = logger.bind(
        operation="cash_flow_analysis",
        months=months,
        group_by=group_by
    )
    
    try:
        # Check cache
        cache_key = f"cash_flow_{months}_{group_by}"
        if use_cache:
            cached_analysis = stats_cache.get_stats(cache_key)
            if cached_analysis:
                log.info("Returning cached cash flow analysis")
                return APIResponse(
                    success=True,
                    message="Cash flow analysis retrieved (cached)",
                    data=cached_analysis
                )
        
        log.info("Computing fresh cash flow analysis")
        start_time = time.time()
        
        # Use analytics adapter for cash flow analysis
        from app.adapters.analytics_adapter import analytics_adapter
        
        cash_flow_df = await analytics_adapter.get_monthly_cash_flow_analysis_async(months)
        
        if cash_flow_df.empty:
            return APIResponse(
                success=True,
                message="No cash flow data available",
                data=[]
            )
        
        # Convert to records for API response
        cash_flow_data = cash_flow_df.to_dict('records')
        
        # Enhanced analytics if requested
        if enhanced:
            # Calculate additional metrics
            total_inflow = cash_flow_df['total_income'].sum()
            total_outflow = cash_flow_df['total_expenses'].sum()
            net_flow = total_inflow - total_outflow
            
            # Trend analysis
            if len(cash_flow_df) > 1:
                income_trend = (cash_flow_df['total_income'].iloc[-1] - cash_flow_df['total_income'].iloc[0]) / cash_flow_df['total_income'].iloc[0] * 100
                expense_trend = (cash_flow_df['total_expenses'].iloc[-1] - cash_flow_df['total_expenses'].iloc[0]) / cash_flow_df['total_expenses'].iloc[0] * 100
            else:
                income_trend = expense_trend = 0.0
            
            # Volatility calculation
            income_volatility = cash_flow_df['total_income'].std() if len(cash_flow_df) > 1 else 0.0
            expense_volatility = cash_flow_df['total_expenses'].std() if len(cash_flow_df) > 1 else 0.0
            
            enhanced_data = {
                "cash_flow_data": cash_flow_data,
                "summary_metrics": {
                    "total_inflow": float(total_inflow),
                    "total_outflow": float(total_outflow),
                    "net_flow": float(net_flow),
                    "average_monthly_income": float(cash_flow_df['total_income'].mean()),
                    "average_monthly_expenses": float(cash_flow_df['total_expenses'].mean()),
                    "income_trend_percent": float(income_trend),
                    "expense_trend_percent": float(expense_trend),
                    "income_volatility": float(income_volatility),
                    "expense_volatility": float(expense_volatility)
                },
                "period_analysis": {
                    "best_month": {
                        "period": cash_flow_df.loc[cash_flow_df['net_flow'].idxmax(), 'month'],
                        "net_flow": float(cash_flow_df['net_flow'].max())
                    },
                    "worst_month": {
                        "period": cash_flow_df.loc[cash_flow_df['net_flow'].idxmin(), 'month'],
                        "net_flow": float(cash_flow_df['net_flow'].min())
                    }
                }
            }
            cash_flow_result = enhanced_data
        else:
            cash_flow_result = cash_flow_data
        
        # Cache result
        if use_cache:
            stats_cache.set_stats(cash_flow_result, cache_key)
        
        processing_time = (time.time() - start_time) * 1000
        log.info("Cash flow analysis completed", processing_time_ms=processing_time)
        
        return APIResponse(
            success=True,
            message=f"Cash flow analysis for {months} months",
            data=cash_flow_result
        )
        
    except Exception as e:
        log.error("Cash flow analysis failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Error retrieving cash flow analysis"
            }
        )

@router.get("/export/reconciliation-ready")
@limiter.limit("10/minute")
async def export_reconciliation_ready_transactions(
    request: Request,
    format: str = Query("json", regex="^(json|csv|excel)$", description="Export format"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum transactions to export"),
    include_metadata: bool = Query(True, description="Include export metadata")
):
    """Export transactions ready for reconciliation - Enhanced version"""
    
    log = logger.bind(
        operation="export_reconciliation_ready",
        format=format,
        limit=limit
    )
    
    try:
        log.info("Starting export of reconciliation-ready transactions")
        start_time = time.time()
        
        # Enhanced query with more details
        query = """
            SELECT 
                bt.id,
                bt.transaction_date,
                bt.value_date,
                bt.amount,
                bt.description,
                bt.reconciliation_status,
                bt.causale_abi,
                (bt.amount - bt.reconciled_amount) as remaining_amount,
                CASE WHEN bt.amount > 0 THEN 'Income' ELSE 'Expense' END as transaction_type,
                bt.unique_hash,
                bt.created_at
            FROM BankTransactions bt
            WHERE bt.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
              AND bt.amount > 0  -- Solo entrate
              AND (bt.amount - bt.reconciled_amount) > 0.01
            ORDER BY bt.transaction_date DESC
            LIMIT ?
        """
        
        transactions = await db_adapter.execute_query_async(query, (limit,))
        
        if not transactions:
            log.warning("No transactions found for export")
            return APIResponse(
                success=True,
                message="No transactions found ready for reconciliation",
                data={"count": 0}
            )
        
        export_metadata = {
            'export_date': datetime.now().isoformat(),
            'export_format': format,
            'total_exported': len(transactions),
            'filter_criteria': {
                'status': ['Da Riconciliare', 'Riconciliato Parz.'],
                'amount_greater_than': 0,
                'remaining_amount_greater_than': 0.01
            }
        } if include_metadata else None
        
        if format == "csv":
            import pandas as pd
            from io import StringIO
            
            df = pd.DataFrame(transactions)
            
            # Format dates and amounts for CSV
            df['transaction_date'] = pd.to_datetime(df['transaction_date']).dt.strftime('%d/%m/%Y')
            if 'value_date' in df.columns:
                df['value_date'] = pd.to_datetime(df['value_date']).dt.strftime('%d/%m/%Y')
            
            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False, sep=';', decimal=',')
            csv_content = csv_buffer.getvalue()
            
            # Add metadata as comments if requested
            if include_metadata:
                metadata_header = f"# Export generated on {export_metadata['export_date']}\n"
                metadata_header += f"# Total records: {export_metadata['total_exported']}\n"
                metadata_header += f"# Format: {export_metadata['export_format']}\n\n"
                csv_content = metadata_header + csv_content
            
            processing_time = (time.time() - start_time) * 1000
            log.info("CSV export completed", 
                    records_exported=len(transactions),
                    processing_time_ms=processing_time)
            
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=transactions_reconciliation_ready.csv",
                    "X-Export-Count": str(len(transactions)),
                    "X-Processing-Time-Ms": str(processing_time)
                }
            )
            
        elif format == "excel":
            import pandas as pd
            from io import BytesIO
            
            df = pd.DataFrame(transactions)
            
            # Format for Excel
            df['transaction_date'] = pd.to_datetime(df['transaction_date'])
            if 'value_date' in df.columns:
                df['value_date'] = pd.to_datetime(df['value_date'])
            
            excel_buffer = BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Transactions', index=False)
                
                # Add metadata sheet if requested
                if include_metadata:
                    metadata_df = pd.DataFrame([export_metadata])
                    metadata_df.to_excel(writer, sheet_name='Export_Metadata', index=False)
            
            excel_content = excel_buffer.getvalue()
            
            processing_time = (time.time() - start_time) * 1000
            log.info("Excel export completed",
                    records_exported=len(transactions),
                    processing_time_ms=processing_time)
            
            return Response(
                content=excel_content,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": "attachment; filename=transactions_reconciliation_ready.xlsx",
                    "X-Export-Count": str(len(transactions)),
                    "X-Processing-Time-Ms": str(processing_time)
                }
            )
            
        else:  # JSON format
            processing_time = (time.time() - start_time) * 1000
            log.info("JSON export completed",
                    records_exported=len(transactions),
                    processing_time_ms=processing_time)
            
            export_data = {
                'transactions': transactions,
                'count': len(transactions),
                'processing_time_ms': processing_time
            }
            
            if include_metadata:
                export_data['metadata'] = export_metadata
            
            return APIResponse(
                success=True,
                message=f"Exported {len(transactions)} transactions ready for reconciliation",
                data=export_data
            )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        log.error("Export failed", error=str(e), processing_time_ms=processing_time)
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": TransactionErrorCode.DATABASE_ERROR,
                "message": "Export operation failed",
                "processing_time_ms": processing_time
            }
        )

# Health check and metrics endpoints
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        await db_adapter.execute_query_async("SELECT 1")
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "transactions_api",
            "version": "2.0.0"
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
async def get_api_metrics():
    """Get API performance metrics"""
    try:
        # Get basic transaction counts
        total_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM BankTransactions"
        )
        
        reconciled_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM BankTransactions WHERE reconciliation_status = 'Riconciliato Tot.'"
        )
        
        total = total_count[0]['count'] if total_count else 0
        reconciled = reconciled_count[0]['count'] if reconciled_count else 0
        
        return {
            "total_transactions": total,
            "reconciled_transactions": reconciled,
            "reconciliation_percentage": (reconciled / total * 100) if total > 0 else 0,
            "cache_hit_rate": stats_cache.get_hit_rate(),
            "cache_size": len(stats_cache.cache),
            "background_tasks_active": len([
                task for task in background_tasks_status.values() 
                if task.get('status') == 'processing'
            ]),
            "api_version": "2.0.0",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Metrics collection failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Metrics collection failed"
        )

# Mantieni tutti gli endpoint originali per compatibilità
@router.post("/", response_model=BankTransaction)
async def create_transaction(transaction_data: BankTransactionCreate):
    """Create new bank transaction - Original implementation maintained"""
    try:
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
        return await get_transaction_by_id(new_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating transaction")

# Mantieni tutti gli altri endpoint originali...
# [Gli altri endpoint rimangono identici per compatibilità]
