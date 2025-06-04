"""
Reconciliation Adapter per FastAPI
Fornisce interfaccia async per il core/reconciliation.py esistente senza modificarlo
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# Import del core esistente (INVARIATO)
from app.core.reconciliation import (
    suggest_reconciliation_matches_enhanced,
    suggest_cumulative_matches,
    apply_manual_match_optimized,
    attempt_auto_reconciliation_optimized,
    find_automatic_matches_optimized,
    ignore_transaction,
    find_anagraphics_id_from_description,
    update_items_statuses_batch
)

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=4)

class ReconciliationAdapter:
    """
    Adapter che fornisce interfaccia async per il reconciliation core esistente
    """
    
    @staticmethod
    async def suggest_1_to_1_matches_async(
        invoice_id: Optional[int] = None,
        transaction_id: Optional[int] = None,
        anagraphics_id_filter: Optional[int] = None
    ) -> List[Dict]:
        """Versione async di suggest_reconciliation_matches_enhanced"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            suggest_reconciliation_matches_enhanced,
            invoice_id,
            transaction_id,
            anagraphics_id_filter
        )
    
    @staticmethod
    async def suggest_n_to_m_matches_async(
        transaction_id: int,
        anagraphics_id_filter: Optional[int] = None,
        max_combination_size: int = 5,
        max_search_time_ms: int = 30000,
        exclude_invoice_ids: Optional[List[int]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Versione async di suggest_cumulative_matches"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            suggest_cumulative_matches,
            transaction_id,
            anagraphics_id_filter,
            max_combination_size,
            max_search_time_ms,
            exclude_invoice_ids,
            start_date,
            end_date
        )
    
    @staticmethod
    async def apply_manual_match_async(
        invoice_id: int,
        transaction_id: int,
        amount_to_match: float
    ) -> tuple:
        """Versione async di apply_manual_match_optimized"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            apply_manual_match_optimized,
            invoice_id,
            transaction_id,
            amount_to_match
        )
    
    @staticmethod
    async def apply_auto_reconciliation_async(
        transaction_ids: List[int],
        invoice_ids: List[int]
    ) -> tuple:
        """Versione async di attempt_auto_reconciliation_optimized"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            attempt_auto_reconciliation_optimized,
            transaction_ids,
            invoice_ids
        )
    
    @staticmethod
    async def find_automatic_matches_async(confidence_level: str = 'Exact') -> List[Dict]:
        """Versione async di find_automatic_matches_optimized"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            find_automatic_matches_optimized,
            confidence_level
        )
    
    @staticmethod
    async def ignore_transaction_async(transaction_id: int) -> tuple:
        """Versione async di ignore_transaction"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            ignore_transaction,
            transaction_id
        )
    
    @staticmethod
    async def find_anagraphics_from_description_async(description: str) -> Optional[int]:
        """Versione async di find_anagraphics_id_from_description"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            find_anagraphics_id_from_description,
            description
        )
    
    @staticmethod
    async def update_items_statuses_async(
        invoice_ids: Optional[List[int]] = None,
        transaction_ids: Optional[List[int]] = None
    ) -> bool:
        """Versione async di update_items_statuses_batch"""
        def _update_statuses():
            from app.core.database import get_connection
            conn = get_connection()
            try:
                return update_items_statuses_batch(conn, invoice_ids, transaction_ids)
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_statuses)

# Istanza globale dell'adapter
reconciliation_adapter = ReconciliationAdapter()