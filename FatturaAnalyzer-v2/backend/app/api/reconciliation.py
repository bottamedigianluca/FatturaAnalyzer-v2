"""
Reconciliation API endpoints - Aggiornato per usare adapter pattern
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse

# Usa adapters invece di accesso diretto al core
from app.adapters.reconciliation_adapter import reconciliation_adapter
from app.adapters.database_adapter import db_adapter
from app.models import (
    ReconciliationSuggestion, ReconciliationRequest, ReconciliationBatchRequest,
    ReconciliationLink, APIResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/suggestions")
async def get_reconciliation_suggestions(
    max_suggestions: int = Query(50, ge=1, le=200, description="Maximum number of suggestions"),
    confidence_threshold: float = Query(0.5, ge=0.0, le=1.0, description="Minimum confidence threshold")
):
    """Get reconciliation suggestions using core adapter"""
    try:
        # Usa adapter per ottenere suggerimenti dal core
        suggestions = await reconciliation_adapter.get_reconciliation_suggestions_async(
            max_suggestions=max_suggestions,
            confidence_threshold=confidence_threshold
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(suggestions)} reconciliation suggestions",
            data={
                "suggestions": suggestions,
                "parameters": {
                    "max_suggestions": max_suggestions,
                    "confidence_threshold": confidence_threshold
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation suggestions")


@router.get("/opportunities")
async def get_reconciliation_opportunities(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of opportunities"),
    amount_tolerance: float = Query(0.01, ge=0.0, le=100.0, description="Amount tolerance for matching")
):
    """Get reconciliation opportunities using advanced matching"""
    try:
        opportunities = await reconciliation_adapter.get_reconciliation_opportunities_async(
            limit=limit,
            amount_tolerance=amount_tolerance
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(opportunities)} reconciliation opportunities",
            data={
                "opportunities": opportunities,
                "parameters": {
                    "limit": limit,
                    "amount_tolerance": amount_tolerance
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation opportunities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation opportunities")


@router.get("/client/{anagraphics_id}/suggestions")
async def get_client_reconciliation_suggestions(
    anagraphics_id: int = Path(..., description="Anagraphics ID"),
    max_suggestions: int = Query(10, ge=1, le=50, description="Maximum number of suggestions")
):
    """Get reconciliation suggestions for specific client using smart reconciliation"""
    try:
        # Verifica che l'anagrafica esista
        anag_check = await db_adapter.execute_query_async(
            "SELECT id, denomination FROM Anagraphics WHERE id = ? AND type = 'Cliente'",
            (anagraphics_id,)
        )
        
        if not anag_check:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Usa adapter per smart reconciliation
        suggestions = await reconciliation_adapter.smart_reconcile_by_client_async(
            anagraphics_id=anagraphics_id,
            max_suggestions=max_suggestions
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(suggestions)} suggestions for client {anag_check[0]['denomination']}",
            data={
                "client": anag_check[0],
                "suggestions": suggestions
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client reconciliation suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving client suggestions")


@router.post("/reconcile")
async def perform_reconciliation(
    reconciliation: ReconciliationRequest
):
    """Perform single reconciliation using adapter"""
    try:
        result = await reconciliation_adapter.perform_reconciliation_async(
            invoice_id=reconciliation.invoice_id,
            transaction_id=reconciliation.transaction_id,
            amount=reconciliation.amount
        )
        
        if result['success']:
            return APIResponse(
                success=True,
                message=result['message'],
                data=result.get('data')
            )
        else:
            raise HTTPException(status_code=400, detail=result['message'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing reconciliation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing reconciliation")


@router.post("/reconcile/batch")
async def perform_batch_reconciliation(
    reconciliations: List[ReconciliationRequest]
):
    """Perform multiple reconciliations in batch using adapter"""
    try:
        if len(reconciliations) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 reconciliations per batch")
        
        # Converti in formato per adapter
        recon_data = [
            {
                'invoice_id': r.invoice_id,
                'transaction_id': r.transaction_id,
                'amount': r.amount
            }
            for r in reconciliations
        ]
        
        results = await reconciliation_adapter.perform_batch_reconciliation_async(recon_data)
        
        return APIResponse(
            success=True,
            message=f"Batch reconciliation completed: {results['successful']} successful, {results['failed']} failed",
            data=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing batch reconciliation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing batch reconciliation")


@router.post("/auto-reconcile")
async def auto_reconcile_high_confidence(
    confidence_threshold: float = Query(0.8, ge=0.5, le=1.0, description="Minimum confidence for auto reconciliation"),
    max_auto_reconcile: int = Query(10, ge=1, le=50, description="Maximum number of auto reconciliations")
):
    """Automatically reconcile high-confidence matches using adapter"""
    try:
        results = await reconciliation_adapter.auto_reconcile_suggestions_async(
            confidence_threshold=confidence_threshold,
            max_auto_reconcile=max_auto_reconcile
        )
        
        if results['success']:
            return APIResponse(
                success=True,
                message=results['message'],
                data=results['data']
            )
        else:
            raise HTTPException(status_code=500, detail=results['message'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in auto reconciliation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error in auto reconciliation")


@router.delete("/undo/invoice/{invoice_id}")
async def undo_invoice_reconciliation(
    invoice_id: int = Path(..., description="Invoice ID")
):
    """Undo all reconciliations for an invoice using adapter"""
    try:
        # Verifica che la fattura esista
        invoice_check = await db_adapter.execute_query_async(
            "SELECT id, doc_number FROM Invoices WHERE id = ?",
            (invoice_id,)
        )
        
        if not invoice_check:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        result = await reconciliation_adapter.undo_reconciliation_async(invoice_id=invoice_id)
        
        if result['success']:
            return APIResponse(
                success=True,
                message=result['message'],
                data=result.get('data')
            )
        else:
            raise HTTPException(status_code=500, detail=result['message'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error undoing invoice reconciliation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error undoing reconciliation")


@router.delete("/undo/transaction/{transaction_id}")
async def undo_transaction_reconciliation(
    transaction_id: int = Path(..., description="Transaction ID")
):
    """Undo all reconciliations for a transaction using adapter"""
    try:
        # Verifica che la transazione esista
        transaction_check = await db_adapter.execute_query_async(
            "SELECT id, description FROM BankTransactions WHERE id = ?",
            (transaction_id,)
        )
        
        if not transaction_check:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        result = await reconciliation_adapter.undo_reconciliation_async(transaction_id=transaction_id)
        
        if result['success']:
            return APIResponse(
                success=True,
                message=result['message'],
                data=result.get('data')
            )
        else:
            raise HTTPException(status_code=500, detail=result['message'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error undoing transaction reconciliation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error undoing reconciliation")


@router.get("/status")
async def get_reconciliation_status():
    """Get comprehensive reconciliation status using adapter"""
    try:
        status = await reconciliation_adapter.get_reconciliation_status_async()
        
        if status['success']:
            return APIResponse(
                success=True,
                message="Reconciliation status retrieved",
                data=status['data']
            )
        else:
            raise HTTPException(status_code=500, detail=status['message'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reconciliation status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation status")


@router.get("/links")
async def get_reconciliation_links(
    invoice_id: Optional[int] = Query(None, description="Filter by invoice ID"),
    transaction_id: Optional[int] = Query(None, description="Filter by transaction ID"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of links"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """Get reconciliation links with optional filters using database adapter"""
    try:
        # Build query con filtri
        conditions = []
        params = []
        
        base_query = """
            SELECT 
                rl.id,
                rl.invoice_id,
                rl.transaction_id,
                rl.reconciled_amount,
                rl.reconciliation_date,
                rl.notes,
                i.doc_number,
                i.doc_date,
                i.total_amount as invoice_amount,
                bt.transaction_date,
                bt.amount as transaction_amount,
                bt.description as transaction_description,
                a.denomination as counterparty
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
        """
        
        if invoice_id:
            conditions.append("rl.invoice_id = ?")
            params.append(invoice_id)
        
        if transaction_id:
            conditions.append("rl.transaction_id = ?")
            params.append(transaction_id)
        
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        base_query += " ORDER BY rl.reconciliation_date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        # Ottieni link
        links = await db_adapter.execute_query_async(base_query, tuple(params))
        
        # Count totale per paginazione
        count_query = "SELECT COUNT(*) as total FROM ReconciliationLinks rl"
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions[:-2])  # Rimuovi limit/offset params
            count_params = params[:-2]
        else:
            count_params = []
        
        total_result = await db_adapter.execute_query_async(count_query, tuple(count_params))
        total = total_result[0]['total'] if total_result else 0
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(links)} reconciliation links",
            data={
                "links": links,
                "pagination": {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + len(links)) < total
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation links: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation links")


@router.get("/analytics/summary")
async def get_reconciliation_analytics():
    """Get reconciliation analytics and trends using database adapter"""
    try:
        # Trend riconciliazioni per mese
        monthly_trends = await db_adapter.execute_query_async("""
            SELECT 
                strftime('%Y-%m', reconciliation_date) as month,
                COUNT(*) as reconciliation_count,
                SUM(reconciled_amount) as total_amount,
                AVG(reconciled_amount) as avg_amount
            FROM ReconciliationLinks
            WHERE reconciliation_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', reconciliation_date)
            ORDER BY month
        """)
        
        # Top controparti per riconciliazioni
        top_counterparties = await db_adapter.execute_query_async("""
            SELECT 
                a.denomination,
                COUNT(rl.id) as reconciliation_count,
                SUM(rl.reconciled_amount) as total_reconciled
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE rl.reconciliation_date >= date('now', '-6 months')
            GROUP BY a.id, a.denomination
            ORDER BY total_reconciled DESC
            LIMIT 10
        """)
        
        # Tempi medi di riconciliazione
        avg_reconciliation_time = await db_adapter.execute_query_async("""
            SELECT 
                AVG(julianday(rl.reconciliation_date) - julianday(i.doc_date)) as avg_days_to_reconcile,
                AVG(julianday(rl.reconciliation_date) - julianday(bt.transaction_date)) as avg_days_from_transaction
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            WHERE rl.reconciliation_date >= date('now', '-6 months')
        """)
        
        # Efficienza riconciliazione per mese
        efficiency_stats = await db_adapter.execute_query_async("""
            SELECT 
                strftime('%Y-%m', doc_date) as month,
                COUNT(*) as invoices_issued,
                SUM(CASE WHEN payment_status = 'Pagata Tot.' THEN 1 ELSE 0 END) as fully_paid,
                SUM(CASE WHEN payment_status IN ('Pagata Parz.', 'Pagata Tot.') THEN 1 ELSE 0 END) as partially_paid,
                (CAST(SUM(CASE WHEN payment_status = 'Pagata Tot.' THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) * 100 as full_payment_rate
            FROM Invoices
            WHERE type = 'Attiva'
              AND doc_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', doc_date)
            ORDER BY month
        """)
        
        return APIResponse(
            success=True,
            message="Reconciliation analytics retrieved",
            data={
                "monthly_trends": monthly_trends,
                "top_counterparties": top_counterparties,
                "average_reconciliation_time": avg_reconciliation_time[0] if avg_reconciliation_time else {},
                "efficiency_statistics": efficiency_stats
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation analytics")


@router.post("/validate-match")
async def validate_reconciliation_match(
    invoice_id: int = Body(..., description="Invoice ID"),
    transaction_id: int = Body(..., description="Transaction ID"),
    amount: float = Body(..., description="Amount to reconcile")
):
    """Validate a potential reconciliation match before performing it"""
    try:
        # Ottieni dettagli fattura e transazione
        invoice = await db_adapter.get_item_details_async('invoice', invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Calcola importi disponibili
        invoice_open_amount = invoice['total_amount'] - invoice['paid_amount']
        transaction_remaining = transaction['amount'] - transaction['reconciled_amount']
        
        # Validazioni
        validation_results = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'details': {
                'invoice': {
                    'id': invoice_id,
                    'doc_number': invoice['doc_number'],
                    'total_amount': invoice['total_amount'],
                    'paid_amount': invoice['paid_amount'],
                    'open_amount': invoice_open_amount
                },
                'transaction': {
                    'id': transaction_id,
                    'transaction_date': transaction['transaction_date'],
                    'amount': transaction['amount'],
                    'reconciled_amount': transaction['reconciled_amount'],
                    'remaining_amount': transaction_remaining
                },
                'proposed_amount': amount
            }
        }
        
        # Controlli di validazione
        if amount <= 0:
            validation_results['valid'] = False
            validation_results['errors'].append("Amount must be greater than 0")
        
        if amount > invoice_open_amount:
            validation_results['valid'] = False
            validation_results['errors'].append(f"Amount {amount} exceeds invoice open amount {invoice_open_amount}")
        
        if abs(amount) > abs(transaction_remaining):
            validation_results['valid'] = False
            validation_results['errors'].append(f"Amount {amount} exceeds transaction remaining amount {transaction_remaining}")
        
        # Avvertimenti
        if abs(amount - invoice_open_amount) > 0.01:
            validation_results['warnings'].append("Amount does not fully reconcile the invoice")
        
        if abs(abs(amount) - abs(transaction_remaining)) > 0.01:
            validation_results['warnings'].append("Amount does not fully reconcile the transaction")
        
        # Controllo date
        try:
            from datetime import datetime
            invoice_date = datetime.fromisoformat(invoice['doc_date'])
            transaction_date = datetime.fromisoformat(transaction['transaction_date'])
            days_diff = (transaction_date - invoice_date).days
            
            if days_diff < 0:
                validation_results['warnings'].append("Transaction date is before invoice date")
            elif days_diff > 180:
                validation_results['warnings'].append("Transaction date is more than 6 months after invoice date")
                
        except:
            validation_results['warnings'].append("Could not validate date relationship")
        
        return APIResponse(
            success=True,
            message="Validation completed",
            data=validation_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating reconciliation match: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error validating match")


@router.get("/rules/matching")
async def get_matching_rules():
    """Get current matching rules and configuration"""
    try:
        # Regole di matching attuali (potrebbero essere configurabili in futuro)
        matching_rules = {
            'amount_tolerance': {
                'exact_match': 0.01,
                'close_match': 0.05,  # 5% tolerance
                'max_difference': 100.0  # Max 100€ difference
            },
            'date_constraints': {
                'max_days_before_invoice': 0,
                'max_days_after_invoice': 180,
                'preferred_window_days': 60
            },
            'description_matching': {
                'enabled': True,
                'minimum_similarity': 0.7,
                'keywords_boost': ['pagamento', 'bonifico', 'fattura']
            },
            'confidence_thresholds': {
                'high': 0.8,
                'medium': 0.6,
                'low': 0.4
            },
            'auto_reconciliation': {
                'enabled': True,
                'min_confidence': 0.8,
                'exact_match_only': True,
                'max_per_batch': 10
            }
        }
        
        return APIResponse(
            success=True,
            message="Matching rules retrieved",
            data={
                'rules': matching_rules,
                'last_updated': '2025-06-03T00:00:00Z',
                'version': '2.0'
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting matching rules: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving matching rules")


@router.get("/health-check")
async def reconciliation_health_check():
    """Health check for reconciliation system"""
    try:
        # Verifica accesso ai dati
        invoice_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM Invoices WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')"
        )
        
        transaction_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM BankTransactions WHERE reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')"
        )
        
        recent_reconciliations = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM ReconciliationLinks WHERE reconciliation_date >= date('now', '-7 days')"
        )
        
        # Test funzionalità core
        try:
            # Test rapido del core reconciliation
            suggestions = await reconciliation_adapter.get_reconciliation_suggestions_async(
                max_suggestions=1,
                confidence_threshold=0.9
            )
            core_status = "healthy"
        except Exception as core_error:
            logger.error(f"Core reconciliation test failed: {core_error}")
            core_status = f"error: {str(core_error)}"
        
        health_data = {
            'status': 'healthy' if core_status == 'healthy' else 'degraded',
            'core_reconciliation': core_status,
            'data_availability': {
                'open_invoices': invoice_count[0]['count'] if invoice_count else 0,
                'unreconciled_transactions': transaction_count[0]['count'] if transaction_count else 0,
                'recent_reconciliations': recent_reconciliations[0]['count'] if recent_reconciliations else 0
            },
            'system_info': {
                'adapter_version': '2.0',
                'database_connection': 'active',
                'last_check': '2025-06-03T00:00:00Z'
            }
        }
        
        return APIResponse(
            success=True,
            message="Reconciliation system health check completed",
            data=health_data
        )
        
    except Exception as e:
        logger.error(f"Error in reconciliation health check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing health check")


@router.post("/suggestions/manual")
async def create_manual_suggestion(
    invoice_id: int = Body(..., description="Invoice ID"),
    transaction_id: int = Body(..., description="Transaction ID"),
    confidence: str = Body(..., description="Confidence level: Alta, Media, Bassa"),
    notes: Optional[str] = Body(None, description="Optional notes")
):
    """Create a manual reconciliation suggestion"""
    try:
        # Valida input
        if confidence not in ['Alta', 'Media', 'Bassa']:
            raise HTTPException(status_code=400, detail="Confidence must be 'Alta', 'Media', or 'Bassa'")
        
        # Verifica che fattura e transazione esistano
        invoice = await db_adapter.get_item_details_async('invoice', invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verifica che non sia già riconciliata
        existing_link = await db_adapter.execute_query_async(
            "SELECT id FROM ReconciliationLinks WHERE invoice_id = ? AND transaction_id = ?",
            (invoice_id, transaction_id)
        )
        
        if existing_link:
            raise HTTPException(status_code=409, detail="Reconciliation link already exists")
        
        # Calcola importi
        invoice_open_amount = invoice['total_amount'] - invoice['paid_amount']
        transaction_remaining = transaction['amount'] - transaction['reconciled_amount']
        suggested_amount = min(abs(invoice_open_amount), abs(transaction_remaining))
        
        # Crea suggerimento manuale
        manual_suggestion = {
            'confidence': confidence,
            'confidence_score': {'Alta': 0.9, 'Media': 0.7, 'Bassa': 0.5}[confidence],
            'invoice_ids': [invoice_id],
            'transaction_ids': [transaction_id],
            'description': f"Manual suggestion: {invoice['doc_number']} <-> {transaction.get('description', 'Transaction')}",
            'total_amount': suggested_amount,
            'match_details': {
                'type': 'manual',
                'invoice_open_amount': invoice_open_amount,
                'transaction_remaining': transaction_remaining,
                'suggested_amount': suggested_amount,
                'notes': notes
            },
            'reasons': ['Manual suggestion by user']
        }
        
        return APIResponse(
            success=True,
            message="Manual suggestion created",
            data=manual_suggestion
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating manual suggestion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating manual suggestion")


@router.get("/export/report")
async def export_reconciliation_report(
    format: str = Query("json", description="Export format: json, csv"),
    period_months: int = Query(12, ge=1, le=60, description="Period in months"),
    include_unmatched: bool = Query(True, description="Include unmatched items")
):
    """Export comprehensive reconciliation report"""
    try:
        # Usa la funzionalità esistente dall'import/export API
        from app.api.import_export import export_reconciliation_report as export_func
        
        # Delega alla funzione di export esistente
        return await export_func(format, period_months, include_unmatched)
        
    except Exception as e:
        logger.error(f"Error exporting reconciliation report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting reconciliation report")


@router.get("/dashboard")
async def get_reconciliation_dashboard():
    """Get comprehensive reconciliation dashboard data"""
    try:
        # Combina varie chiamate per dashboard completa
        status_result = await reconciliation_adapter.get_reconciliation_status_async()
        
        if not status_result['success']:
            raise HTTPException(status_code=500, detail="Error getting reconciliation status")
        
        # Ottieni top suggerimenti
        opportunities = await reconciliation_adapter.get_reconciliation_opportunities_async(limit=5)
        
        # Link recenti
        recent_links = await db_adapter.execute_query_async("""
            SELECT 
                rl.reconciled_amount,
                rl.reconciliation_date,
                i.doc_number,
                i.doc_date,
                bt.description,
                a.denomination
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            ORDER BY rl.reconciliation_date DESC
            LIMIT 10
        """)
        
        # Statistiche veloci
        quick_stats = await db_adapter.execute_query_async("""
            SELECT 
                (SELECT COUNT(*) FROM Invoices WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')) as open_invoices,
                (SELECT COUNT(*) FROM BankTransactions WHERE reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')) as unreconciled_transactions,
                (SELECT COUNT(*) FROM ReconciliationLinks WHERE DATE(reconciliation_date) = DATE('now')) as today_reconciliations,
                (SELECT COALESCE(SUM(reconciled_amount), 0) FROM ReconciliationLinks WHERE DATE(reconciliation_date) = DATE('now')) as today_amount
        """)
        
        dashboard_data = {
            'summary': status_result['data']['summary'],
            'quick_stats': quick_stats[0] if quick_stats else {},
            'top_opportunities': opportunities[:5],
            'recent_reconciliations': recent_links,
            'status_breakdown': {
                'invoices': status_result['data']['invoice_statistics'],
                'transactions': status_result['data']['transaction_statistics']
            }
        }
        
        return APIResponse(
            success=True,
            message="Reconciliation dashboard data retrieved",
            data=dashboard_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reconciliation dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving dashboard data")