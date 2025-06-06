"""
Reconciliation Adapter per FastAPI - Versione Completa
Fornisce interfaccia async per il core/reconciliation.py esistente senza modificarlo
Include supporto per smart client reconciliation e tutte le funzionalità API
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date

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

# Import smart client reconciliation
try:
    from app.core.smart_client_reconciliation import (
        suggest_client_based_reconciliation,
        enhance_cumulative_matches_with_client_patterns,
        analyze_client_payment_reliability,
        get_smart_reconciler
    )
    SMART_RECONCILIATION_AVAILABLE = True
except ImportError:
    logging.warning("Smart client reconciliation non disponibile")
    SMART_RECONCILIATION_AVAILABLE = False

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=4)

class ReconciliationAdapter:
    """
    Adapter che fornisce interfaccia async per il reconciliation core esistente
    Include tutte le funzionalità per l'API
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

    # === NUOVE FUNZIONALITÀ PER L'API ===

    @staticmethod
    async def get_reconciliation_suggestions_async(
        max_suggestions: int = 50,
        confidence_threshold: float = 0.5
    ) -> List[Dict]:
        """Ottiene suggerimenti di riconciliazione generali"""
        def _get_suggestions():
            from app.core.database import get_connection
            
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                # Trova transazioni candidate per suggerimenti
                cursor.execute("""
                    SELECT id, amount, reconciled_amount, description
                    FROM BankTransactions 
                    WHERE reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                      AND ABS(amount - reconciled_amount) > 0.01
                    ORDER BY ABS(amount - reconciled_amount) DESC
                    LIMIT ?
                """, (min(max_suggestions * 2, 100),))
                
                transactions = cursor.fetchall()
                all_suggestions = []
                
                for trans in transactions:
                    trans_id = trans['id']
                    
                    # Ottieni suggerimenti 1:1 per questa transazione
                    suggestions_1_1 = suggest_reconciliation_matches_enhanced(
                        transaction_id=trans_id
                    )
                    
                    # Filtra per confidenza
                    filtered_suggestions = [
                        s for s in suggestions_1_1 
                        if s.get('confidence_score', 0) >= confidence_threshold
                    ]
                    
                    all_suggestions.extend(filtered_suggestions)
                    
                    if len(all_suggestions) >= max_suggestions:
                        break
                
                # Ordina per confidenza e limita
                all_suggestions.sort(
                    key=lambda x: x.get('confidence_score', 0), 
                    reverse=True
                )
                
                return all_suggestions[:max_suggestions]
                
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_suggestions)

    @staticmethod
    async def get_reconciliation_opportunities_async(
        limit: int = 20,
        amount_tolerance: float = 0.01
    ) -> List[Dict]:
        """Ottiene opportunità di riconciliazione avanzate"""
        def _get_opportunities():
            from app.core.database import get_connection
            
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                # Query per trovare opportunità di match
                cursor.execute("""
                    SELECT 
                        t.id as transaction_id,
                        t.amount - t.reconciled_amount as trans_remaining,
                        t.description,
                        i.id as invoice_id,
                        i.doc_number,
                        i.total_amount - i.paid_amount as inv_remaining,
                        a.denomination,
                        ABS((t.amount - t.reconciled_amount) - (i.total_amount - i.paid_amount)) as amount_diff
                    FROM BankTransactions t
                    CROSS JOIN Invoices i
                    JOIN Anagraphics a ON i.anagraphics_id = a.id
                    WHERE t.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                      AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                      AND ABS(t.amount - t.reconciled_amount) > 0.01
                      AND ABS(i.total_amount - i.paid_amount) > 0.01
                      AND SIGN(t.amount - t.reconciled_amount) = CASE 
                            WHEN i.type = 'Attiva' THEN 1 
                            ELSE -1 
                          END
                      AND ABS((t.amount - t.reconciled_amount) - (i.total_amount - i.paid_amount)) <= ?
                    ORDER BY amount_diff ASC
                    LIMIT ?
                """, (amount_tolerance, limit))
                
                opportunities = []
                for row in cursor.fetchall():
                    opportunities.append({
                        'transaction_id': row['transaction_id'],
                        'invoice_id': row['invoice_id'],
                        'counterparty': row['denomination'],
                        'invoice_number': row['doc_number'],
                        'amount_difference': float(row['amount_diff']),
                        'transaction_amount': float(row['trans_remaining']),
                        'invoice_amount': float(row['inv_remaining']),
                        'confidence_score': 1.0 - (float(row['amount_diff']) / amount_tolerance),
                        'match_type': 'exact_amount'
                    })
                
                return opportunities
                
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_opportunities)

    @staticmethod
    async def smart_reconcile_by_client_async(
        anagraphics_id: int,
        max_suggestions: int = 10
    ) -> List[Dict]:
        """Riconciliazione intelligente basata sui pattern del cliente"""
        if not SMART_RECONCILIATION_AVAILABLE:
            return []
        
        def _smart_reconcile():
            from app.core.database import get_connection
            
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                # Trova transazioni non riconciliate che potrebbero appartenere al cliente
                cursor.execute("""
                    SELECT t.id, t.description, t.amount, t.reconciled_amount
                    FROM BankTransactions t
                    WHERE t.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                      AND ABS(t.amount - t.reconciled_amount) > 0.01
                    ORDER BY t.transaction_date DESC
                    LIMIT 50
                """)
                
                transactions = cursor.fetchall()
                all_suggestions = []
                
                for trans in transactions:
                    trans_id = trans['id']
                    description = trans['description'] or ""
                    
                    # Verifica se la descrizione potrebbe riferirsi al cliente
                    detected_anag_id = find_anagraphics_id_from_description(description)
                    
                    if detected_anag_id == anagraphics_id:
                        # Usa riconciliazione intelligente
                        smart_suggestions = suggest_client_based_reconciliation(
                            trans_id, anagraphics_id
                        )
                        all_suggestions.extend(smart_suggestions)
                
                # Ordina per confidenza e limita
                all_suggestions.sort(
                    key=lambda x: x.get('confidence_score', 0),
                    reverse=True
                )
                
                return all_suggestions[:max_suggestions]
                
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _smart_reconcile)

    @staticmethod
    async def perform_reconciliation_async(
        invoice_id: int,
        transaction_id: int,
        amount: float
    ) -> Dict[str, Any]:
        """Esegue una riconciliazione singola"""
        try:
            success, message = await ReconciliationAdapter.apply_manual_match_async(
                invoice_id, transaction_id, amount
            )
            
            return {
                'success': success,
                'message': message,
                'data': {
                    'invoice_id': invoice_id,
                    'transaction_id': transaction_id,
                    'reconciled_amount': amount
                }
            }
        except Exception as e:
            logger.error(f"Errore riconciliazione I:{invoice_id} T:{transaction_id}: {e}")
            return {
                'success': False,
                'message': f"Errore durante riconciliazione: {str(e)}"
            }

    @staticmethod
    async def perform_batch_reconciliation_async(
        reconciliations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Esegue riconciliazioni multiple in batch"""
        results = {
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for recon in reconciliations:
            try:
                result = await ReconciliationAdapter.perform_reconciliation_async(
                    recon['invoice_id'],
                    recon['transaction_id'],
                    recon['amount']
                )
                
                results['details'].append({
                    'invoice_id': recon['invoice_id'],
                    'transaction_id': recon['transaction_id'],
                    'success': result['success'],
                    'message': result['message']
                })
                
                if result['success']:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    
            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'invoice_id': recon.get('invoice_id'),
                    'transaction_id': recon.get('transaction_id'),
                    'success': False,
                    'message': f"Errore: {str(e)}"
                })
        
        return results

    @staticmethod
    async def auto_reconcile_suggestions_async(
        confidence_threshold: float = 0.8,
        max_auto_reconcile: int = 10
    ) -> Dict[str, Any]:
        """Esegue riconciliazione automatica sui suggerimenti ad alta confidenza"""
        def _auto_reconcile():
            try:
                # Trova match automatici
                automatic_matches = find_automatic_matches_optimized('Exact')
                
                # Filtra per confidenza
                high_confidence_matches = [
                    match for match in automatic_matches
                    if match.get('confidence_score', 0) >= confidence_threshold
                ][:max_auto_reconcile]
                
                successful = 0
                failed = 0
                details = []
                
                for match in high_confidence_matches:
                    try:
                        success, message = apply_manual_match_optimized(
                            match['invoice_id'],
                            match['transaction_id'],
                            float(match['amount'])
                        )
                        
                        details.append({
                            'invoice_id': match['invoice_id'],
                            'transaction_id': match['transaction_id'],
                            'amount': float(match['amount']),
                            'success': success,
                            'message': message
                        })
                        
                        if success:
                            successful += 1
                        else:
                            failed += 1
                            
                    except Exception as e:
                        failed += 1
                        details.append({
                            'invoice_id': match.get('invoice_id'),
                            'transaction_id': match.get('transaction_id'),
                            'success': False,
                            'message': f"Errore: {str(e)}"
                        })
                
                return {
                    'success': True,
                    'message': f"Auto-riconciliazione completata: {successful} successi, {failed} fallimenti",
                    'data': {
                        'successful': successful,
                        'failed': failed,
                        'total_processed': len(high_confidence_matches),
                        'details': details
                    }
                }
                
            except Exception as e:
                logger.error(f"Errore auto-riconciliazione: {e}")
                return {
                    'success': False,
                    'message': f"Errore durante auto-riconciliazione: {str(e)}"
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _auto_reconcile)

    @staticmethod
    async def undo_reconciliation_async(
        invoice_id: Optional[int] = None,
        transaction_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Annulla riconciliazioni per una fattura o transazione"""
        def _undo_reconciliation():
            from app.core.database import get_connection, remove_reconciliation_links
            
            conn = get_connection()
            try:
                conn.execute("BEGIN TRANSACTION")
                
                if invoice_id:
                    success, (affected_invoices, affected_transactions) = remove_reconciliation_links(
                        conn, invoice_id=invoice_id
                    )
                    target_type = "fattura"
                    target_id = invoice_id
                elif transaction_id:
                    success, (affected_invoices, affected_transactions) = remove_reconciliation_links(
                        conn, transaction_id=transaction_id
                    )
                    target_type = "transazione"
                    target_id = transaction_id
                else:
                    return {
                        'success': False,
                        'message': "Specificare invoice_id o transaction_id"
                    }
                
                if not success:
                    conn.rollback()
                    return {
                        'success': False,
                        'message': f"Errore rimozione link per {target_type} {target_id}"
                    }
                
                # Aggiorna stati
                all_items_updated = update_items_statuses_batch(
                    conn, 
                    invoice_ids=affected_invoices if affected_invoices else None,
                    transaction_ids=affected_transactions if affected_transactions else None
                )
                
                if not all_items_updated:
                    conn.rollback()
                    return {
                        'success': False,
                        'message': "Errore aggiornamento stati dopo rimozione link"
                    }
                
                conn.commit()
                
                return {
                    'success': True,
                    'message': f"Riconciliazioni annullate per {target_type} {target_id}",
                    'data': {
                        'affected_invoices': affected_invoices or [],
                        'affected_transactions': affected_transactions or []
                    }
                }
                
            except Exception as e:
                conn.rollback()
                logger.error(f"Errore undo riconciliazione: {e}")
                return {
                    'success': False,
                    'message': f"Errore durante annullamento: {str(e)}"
                }
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _undo_reconciliation)

    @staticmethod
    async def get_reconciliation_status_async() -> Dict[str, Any]:
        """Ottiene stato completo delle riconciliazioni"""
        def _get_status():
            from app.core.database import get_connection
            
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                # Statistiche fatture
                cursor.execute("""
                    SELECT 
                        payment_status,
                        COUNT(*) as count,
                        SUM(total_amount) as total_amount,
                        SUM(paid_amount) as paid_amount
                    FROM Invoices 
                    WHERE type = 'Attiva'
                    GROUP BY payment_status
                """)
                
                invoice_stats = {}
                total_invoices = 0
                total_amount = 0
                total_paid = 0
                
                for row in cursor.fetchall():
                    status = row['payment_status']
                    count = row['count']
                    amount = row['total_amount'] or 0
                    paid = row['paid_amount'] or 0
                    
                    invoice_stats[status] = {
                        'count': count,
                        'total_amount': amount,
                        'paid_amount': paid,
                        'open_amount': amount - paid
                    }
                    
                    total_invoices += count
                    total_amount += amount
                    total_paid += paid
                
                # Statistiche transazioni
                cursor.execute("""
                    SELECT 
                        reconciliation_status,
                        COUNT(*) as count,
                        SUM(ABS(amount)) as total_amount,
                        SUM(ABS(reconciled_amount)) as reconciled_amount
                    FROM BankTransactions
                    GROUP BY reconciliation_status
                """)
                
                transaction_stats = {}
                total_transactions = 0
                total_trans_amount = 0
                total_reconciled = 0
                
                for row in cursor.fetchall():
                    status = row['reconciliation_status']
                    count = row['count']
                    amount = row['total_amount'] or 0
                    reconciled = row['reconciled_amount'] or 0
                    
                    transaction_stats[status] = {
                        'count': count,
                        'total_amount': amount,
                        'reconciled_amount': reconciled,
                        'unreconciled_amount': amount - reconciled
                    }
                    
                    total_transactions += count
                    total_trans_amount += amount
                    total_reconciled += reconciled
                
                # Summary generale
                summary = {
                    'total_invoices': total_invoices,
                    'total_invoice_amount': total_amount,
                    'total_paid_amount': total_paid,
                    'total_open_amount': total_amount - total_paid,
                    'total_transactions': total_transactions,
                    'total_transaction_amount': total_trans_amount,
                    'total_reconciled_amount': total_reconciled,
                    'total_unreconciled_amount': total_trans_amount - total_reconciled,
                    'reconciliation_rate': (total_reconciled / total_trans_amount * 100) if total_trans_amount > 0 else 0
                }
                
                return {
                    'success': True,
                    'data': {
                        'summary': summary,
                        'invoice_statistics': invoice_stats,
                        'transaction_statistics': transaction_stats,
                        'timestamp': datetime.now().isoformat()
                    }
                }
                
            except Exception as e:
                logger.error(f"Errore getting reconciliation status: {e}")
                return {
                    'success': False,
                    'message': f"Errore: {str(e)}"
                }
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_status)

    # === FUNZIONALITÀ SMART CLIENT ===
    
    @staticmethod
    async def analyze_client_reliability_async(anagraphics_id: int) -> Dict[str, Any]:
        """Analizza l'affidabilità di pagamento di un cliente"""
        if not SMART_RECONCILIATION_AVAILABLE:
            return {
                'error': 'Smart client reconciliation non disponibile',
                'reliability_score': 0.0
            }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            analyze_client_payment_reliability,
            anagraphics_id
        )

    @staticmethod
    async def get_client_payment_patterns_async(anagraphics_id: int) -> Dict[str, Any]:
        """Ottiene i pattern di pagamento di un cliente"""
        if not SMART_RECONCILIATION_AVAILABLE:
            return {'error': 'Smart client reconciliation non disponibile'}
        
        def _get_patterns():
            reconciler = get_smart_reconciler()
            pattern = reconciler.get_client_pattern(anagraphics_id)
            
            if not pattern:
                return {'error': 'Nessun pattern trovato per il cliente'}
            
            return {
                'anagraphics_id': anagraphics_id,
                'confidence_score': pattern.confidence_score,
                'payment_count': len(pattern.payment_intervals),
                'average_payment_interval': sum(pattern.payment_intervals) / len(pattern.payment_intervals) if pattern.payment_intervals else 0,
                'typical_payment_interval': pattern.get_typical_payment_interval(),
                'typical_amounts_count': len(pattern.typical_amounts),
                'description_patterns_count': len(pattern.description_patterns),
                'payment_methods': dict(pattern.payment_methods),
                'last_updated': datetime.now().isoformat()
            }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_patterns)

# Istanza globale dell'adapter
reconciliation_adapter = ReconciliationAdapter()
