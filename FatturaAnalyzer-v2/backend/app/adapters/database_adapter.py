"""
Database Adapter per FastAPI
Fornisce interfaccia async per le operazioni del database core
"""

import asyncio
import logging
import os
from typing import Dict, Any, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor
import pandas as pd

# Import dal core esistente
from app.core.database import (
    get_connection, create_tables, get_anagraphics, get_invoices, get_transactions,
    add_anagraphics_if_not_exists, add_transactions,
    get_reconciliation_links_for_item, get_item_details,
    update_invoice_reconciliation_state, update_transaction_reconciliation_state,
    add_or_update_reconciliation_link, remove_reconciliation_links
)

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del database
_thread_pool = ThreadPoolExecutor(max_workers=3)

class DatabaseAdapter:
    """
    Adapter che fornisce interfaccia async per le operazioni database core
    """

    @staticmethod
    async def create_tables_async():
        """Crea tabelle del database in modo async"""
        def _create_tables():
            create_tables()
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _create_tables)

    @staticmethod
    async def execute_query_async(query: str, params: tuple = None) -> List[Dict]:
        """Esegue query SELECT generica e restituisce lista di dict"""
        def _execute_query():
            conn = None
            try:
                conn = get_connection()
                cursor = conn.cursor()
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                # Converte Row objects in dizionari
                rows = cursor.fetchall()
                return [dict(row) for row in rows] if rows else []
                
            except Exception as e:
                logger.error(f"Errore execute_query_async: {e}")
                raise
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _execute_query)

    @staticmethod
    async def execute_write_async(query: str, params: tuple = None) -> int:
        """Esegue query INSERT/UPDATE/DELETE e restituisce lastrowid o rowcount"""
        def _execute_write():
            conn = None
            try:
                conn = get_connection()
                cursor = conn.cursor()
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                conn.commit()
                
                # Per INSERT restituisce lastrowid, per UPDATE/DELETE rowcount
                if query.strip().upper().startswith('INSERT'):
                    return cursor.lastrowid
                else:
                    return cursor.rowcount
                    
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Errore execute_write_async: {e}")
                raise
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _execute_write)

    @staticmethod
    async def get_anagraphics_async(type_filter: str = None) -> List[Dict]:
        """Ottiene anagrafiche in modo async"""
        def _get_anagraphics():
            df = get_anagraphics(type_filter)
            return df.to_dict('records') if not df.empty else []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_anagraphics)

    @staticmethod
    async def get_invoices_async(
        type_filter: str = None, 
        status_filter: str = None, 
        anagraphics_id_filter: int = None, 
        limit: int = None
    ) -> List[Dict]:
        """Ottiene fatture in modo async usando la logica del core"""
        def _get_invoices():
            df = get_invoices(
                type_filter=type_filter,
                status_filter=status_filter, 
                anagraphics_id_filter=anagraphics_id_filter,
                limit=limit
            )
            return df.to_dict('records') if not df.empty else []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_invoices)

    @staticmethod
    async def get_transactions_async(
        start_date: str = None,
        end_date: str = None,
        status_filter: str = None,
        limit: int = None,
        anagraphics_id_heuristic_filter: int = None,
        hide_pos: bool = False,
        hide_worldline: bool = False,
        hide_cash: bool = False,
        hide_commissions: bool = False
    ) -> List[Dict]:
        """Ottiene transazioni in modo async"""
        def _get_transactions():
            df = get_transactions(
                start_date=start_date,
                end_date=end_date,
                status_filter=status_filter,
                limit=limit,
                anagraphics_id_heuristic_filter=anagraphics_id_heuristic_filter,
                hide_pos=hide_pos,
                hide_worldline=hide_worldline,
                hide_cash=hide_cash,
                hide_commissions=hide_commissions
            )
            return df.to_dict('records') if not df.empty else []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_transactions)

    @staticmethod
    async def add_anagraphics_async(anag_data: Dict, anag_type: str) -> Optional[int]:
        """Aggiunge anagrafica in modo async"""
        def _add_anag_and_commit():
            conn = None
            try:
                conn = get_connection()
                cursor = conn.cursor()
                new_id = add_anagraphics_if_not_exists(cursor, anag_data, anag_type)
                if new_id:
                    conn.commit()
                    return new_id
                else:
                    conn.rollback()
                    return None
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error in _add_anag_and_commit: {e}")
                return None
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_anag_and_commit)

    @staticmethod
    async def add_transactions_async(transactions_df: pd.DataFrame) -> Tuple[int, int, int, int]:
        """Aggiunge transazioni in modo async"""
        def _add_transactions():
            conn = None
            try:
                conn = get_connection()
                cursor = conn.cursor()
                result = add_transactions(cursor, transactions_df)
                conn.commit()
                return result
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error in add_transactions_async: {e}")
                raise
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_transactions)

    @staticmethod
    async def get_reconciliation_links_async(item_type: str, item_id: int) -> List[Dict]:
        """Ottiene link riconciliazione in modo async"""
        def _get_links():
            df = get_reconciliation_links_for_item(item_type, item_id)
            return df.to_dict('records') if not df.empty else []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_links)

    @staticmethod
    async def get_item_details_async(item_type: str, item_id: int) -> Optional[Dict]:
        """Ottiene dettagli elemento in modo async"""
        def _get_details():
            conn = None
            try:
                conn = get_connection()
                row = get_item_details(conn, item_type, item_id)
                return dict(row) if row else None
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_details)

    @staticmethod
    async def update_invoice_reconciliation_async(invoice_id: int, payment_status: str, paid_amount: float) -> bool:
        """Aggiorna stato riconciliazione fattura in modo async"""
        def _update_invoice():
            conn = None
            try:
                conn = get_connection()
                success = update_invoice_reconciliation_state(conn, invoice_id, payment_status, paid_amount)
                if success:
                    conn.commit()
                return success
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error updating invoice reconciliation: {e}")
                return False
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_invoice)

    @staticmethod
    async def update_transaction_reconciliation_async(transaction_id: int, reconciliation_status: str, reconciled_amount: float) -> bool:
        """Aggiorna stato riconciliazione transazione in modo async"""
        def _update_transaction():
            conn = None
            try:
                conn = get_connection()
                success = update_transaction_reconciliation_state(conn, transaction_id, reconciliation_status, reconciled_amount)
                if success:
                    conn.commit()
                return success
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error updating transaction reconciliation: {e}")
                return False
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_transaction)

    @staticmethod
    async def add_reconciliation_link_async(invoice_id: int, transaction_id: int, amount_to_add: float) -> bool:
        """Aggiunge/aggiorna link riconciliazione in modo async"""
        def _add_link():
            conn = None
            try:
                conn = get_connection()
                success = add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount_to_add)
                if success:
                    conn.commit()
                return success
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error adding reconciliation link: {e}")
                return False
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _add_link)

    @staticmethod
    async def remove_reconciliation_links_async(transaction_id: int = None, invoice_id: int = None) -> Tuple[bool, Tuple[List, List]]:
        """Rimuove link riconciliazione in modo async"""
        def _remove_links():
            conn = None
            try:
                conn = get_connection()
                success, affected = remove_reconciliation_links(conn, transaction_id, invoice_id)
                if success:
                    conn.commit()
                return success, affected
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Error removing reconciliation links: {e}")
                return False, ([], [])
            finally:
                if conn:
                    conn.close()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _remove_links)

    @staticmethod
    async def check_database_exists_async() -> bool:
        """Verifica se il database esiste e ha le tabelle necessarie"""
        def _check_database():
            try:
                conn = get_connection()
                cursor = conn.cursor()
                # Verifica se esiste almeno la tabella Anagraphics
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Anagraphics'")
                result = cursor.fetchone()
                conn.close()
                return result is not None
            except Exception as e:
                logger.error(f"Error checking database: {e}")
                return False

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _check_database)

# Istanza globale dell'adapter
db_adapter = DatabaseAdapter()

# Per esportare l'istanza se il file è usato come modulo
__all__ = ["db_adapter", "DatabaseAdapter"]
