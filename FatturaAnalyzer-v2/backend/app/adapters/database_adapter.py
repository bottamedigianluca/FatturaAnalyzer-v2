"""
Database Adapter per FastAPI
Fornisce interfaccia async per il core/database.py esistente senza modificarlo
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
import pandas as pd

# Import del core esistente (INVARIATO)
from app.core.database import (
    get_connection, create_tables, get_anagraphics, get_invoices, 
    get_transactions, add_anagraphics_if_not_exists, add_transactions,
    check_entity_duplicate, get_item_details, update_invoice_reconciliation_state,
    update_transaction_reconciliation_state, add_or_update_reconciliation_link,
    remove_reconciliation_links
)

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=4)

class DatabaseAdapter:
    """
    Adapter che fornisce interfaccia async per il database core esistente
    """
    
    @staticmethod
    async def get_anagraphics_async(type_filter: Optional[str] = None) -> pd.DataFrame:
        """Versione async di get_anagraphics"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, get_anagraphics, type_filter)
    
    @staticmethod
    async def get_invoices_async(
        type_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        anagraphics_id_filter: Optional[int] = None,
        limit: Optional[int] = None
    ) -> pd.DataFrame:
        """Versione async di get_invoices"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool, 
            get_invoices, 
            type_filter, 
            status_filter, 
            anagraphics_id_filter, 
            limit
        )
    
    @staticmethod
    async def get_transactions_async(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: Optional[int] = None,
        anagraphics_id_heuristic_filter: Optional[int] = None,
        hide_pos: bool = False,
        hide_worldline: bool = False,
        hide_cash: bool = False,
        hide_commissions: bool = False
    ) -> pd.DataFrame:
        """Versione async di get_transactions"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_transactions,
            start_date,
            end_date,
            status_filter,
            limit,
            anagraphics_id_heuristic_filter,
            hide_pos,
            hide_worldline,
            hide_cash,
            hide_commissions
        )
    
    @staticmethod
    async def add_anagraphics_async(anag_data: Dict[str, Any], anag_type: str) -> Optional[int]:
        """Versione async di add_anagraphics_if_not_exists"""
        def _add_anag():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                return add_anagraphics_if_not_exists(cursor, anag_data, anag_type)
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_anag)
    
    @staticmethod
    async def add_transactions_async(transactions_df: pd.DataFrame) -> tuple:
        """Versione async di add_transactions"""
        def _add_transactions():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                result = add_transactions(cursor, transactions_df)
                conn.commit()
                return result
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_transactions)
    
    @staticmethod
    async def execute_query_async(query: str, params: tuple = None) -> List[Dict]:
        """Esegue una query personalizzata in modo async"""
        def _execute_query():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                # Converte sqlite3.Row in dict
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _execute_query)
    
    @staticmethod
    async def execute_write_async(query: str, params: tuple = None) -> int:
        """Esegue una query di scrittura in modo async"""
        def _execute_write():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                conn.commit()
                return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _execute_write)
    
    @staticmethod
    async def execute_many_async(query: str, params_list: List[tuple]) -> int:
        """Esegue query multiple in modo async"""
        def _execute_many():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                cursor.executemany(query, params_list)
                conn.commit()
                return cursor.rowcount
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _execute_many)
    
    @staticmethod
    async def check_duplicate_async(table: str, column: str, value: Any) -> bool:
        """Versione async di check_entity_duplicate"""
        def _check_duplicate():
            conn = get_connection()
            try:
                cursor = conn.cursor()
                return check_entity_duplicate(cursor, table, column, value)
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _check_duplicate)
    
    @staticmethod
    async def get_item_details_async(item_type: str, item_id: int) -> Optional[Dict]:
        """Versione async di get_item_details"""
        def _get_item_details():
            conn = get_connection()
            try:
                result = get_item_details(conn, item_type, item_id)
                return dict(result) if result else None
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_item_details)
    
    @staticmethod
    async def update_invoice_state_async(invoice_id: int, payment_status: str, paid_amount: float) -> bool:
        """Versione async di update_invoice_reconciliation_state"""
        def _update_invoice():
            conn = get_connection()
            try:
                result = update_invoice_reconciliation_state(conn, invoice_id, payment_status, paid_amount)
                conn.commit()
                return result
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_invoice)
    
    @staticmethod
    async def update_transaction_state_async(transaction_id: int, reconciliation_status: str, reconciled_amount: float) -> bool:
        """Versione async di update_transaction_reconciliation_state"""
        def _update_transaction():
            conn = get_connection()
            try:
                result = update_transaction_reconciliation_state(conn, transaction_id, reconciliation_status, reconciled_amount)
                conn.commit()
                return result
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_transaction)
    
    @staticmethod
    async def add_reconciliation_link_async(invoice_id: int, transaction_id: int, amount: float) -> bool:
        """Versione async di add_or_update_reconciliation_link"""
        def _add_link():
            conn = get_connection()
            try:
                result = add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount)
                conn.commit()
                return result
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_link)
    
    @staticmethod
    async def remove_reconciliation_links_async(transaction_id: int = None, invoice_id: int = None) -> tuple:
        """Versione async di remove_reconciliation_links"""
        def _remove_links():
            conn = get_connection()
            try:
                result = remove_reconciliation_links(conn, transaction_id, invoice_id)
                conn.commit()
                return result
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _remove_links)
    
    @staticmethod
    async def create_tables_async():
        """Versione async di create_tables"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, create_tables)

# Istanza globale dell'adapter
db_adapter = DatabaseAdapter()