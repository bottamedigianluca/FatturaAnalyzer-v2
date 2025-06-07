"""
Reconciliation API endpoints - CORRETTO - Errori di scoping risolti
Tutte le chiamate passano attraverso l'adapter invece di accedere direttamente al core
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
    """Get reconciliation suggestions using adapter"""
    try:
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
        # 🔧 CORREZIONE: Verifica cliente prima di procedere
        anag_check = await db_adapter.execute_query_async(
            "SELECT id, denomination FROM Anagraphics WHERE id = ? AND type = 'Cliente'",
            (anagraphics_id,)
        )
        
        if not anag_check:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # 🔧 CORREZIONE: Salva i dati del cliente in una variabile
        client_data = anag_check[0]
        
        # Usa adapter per smart reconciliation
        suggestions = await reconciliation_adapter.smart_reconcile_by_client_async(
            anagraphics_id=anagraphics_id,
            max_suggestions=max_suggestions
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(suggestions)} suggestions for client {client_data['denomination']}",  # 🔧 CORRETTO
            data={
                "client": client_data,  # 🔧 CORRETTO
                "suggestions": suggestions
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client reconciliation suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving client suggestions")


@router.get("/client/{anagraphics_id}/patterns")
async def get_client_payment_patterns(
    anagraphics_id: int = Path(..., description="Anagraphics ID")
):
    """Get payment patterns for a specific client (Smart Reconciliation)"""
    try:
        # 🔧 CORREZIONE: Stessa logica per evitare errori di scoping
        anag_check = await db_adapter.execute_query_async(
            "SELECT id, denomination FROM Anagraphics WHERE id = ? AND type = 'Cliente'",
            (anagraphics_id,)
        )
        
        if not anag_check:
            raise HTTPException(status_code=404, detail="Client not found")
        
        client_data = anag_check[0]  # 🔧 SALVA DATI CLIENTE
        
        # Ottieni pattern di pagamento
        patterns = await reconciliation_adapter.get_client_payment_patterns_async(anagraphics_id)
        
        if 'error' in patterns:
            return APIResponse(
                success=False,
                message=patterns['error'],
                data={"client": client_data}  # 🔧 USA VARIABILE SALVATA
            )
        
        return APIResponse(
            success=True,
            message=f"Payment patterns retrieved for client {client_data['denomination']}",  # 🔧 CORRETTO
            data={
                "client": client_data,  # 🔧 CORRETTO
                "patterns": patterns
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client payment patterns: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving client patterns")


@router.get("/client/{anagraphics_id}/reliability")
async def get_client_reliability_analysis(
    anagraphics_id: int = Path(..., description="Anagraphics ID")
):
    """Get payment reliability analysis for a specific client"""
    try:
        # 🔧 CORREZIONE: Pattern corretto per evitare scope errors
        anag_check = await db_adapter.execute_query_async(
            "SELECT id, denomination FROM Anagraphics WHERE id = ? AND type = 'Cliente'",
            (anagraphics_id,)
        )
        
        if not anag_check:
            raise HTTPException(status_code=404, detail="Client not found")
        
        client_data = anag_check[0]  # 🔧 SALVA DATI
        
        # Analisi affidabilità
        reliability = await reconciliation_adapter.analyze_client_reliability_async(anagraphics_id)
        
        return APIResponse(
            success=True,
            message=f"Reliability analysis completed for client {client_data['denomination']}",  # 🔧 CORRETTO
            data={
                "client": client_data,  # 🔧 CORRETTO
                "reliability_analysis": reliability
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client reliability analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reliability analysis")


@router.get("/suggestions/1-to-1")
async def get_1_to_1_suggestions(
    invoice_id: Optional[int] = Query(None, description="Invoice ID"),
    transaction_id: Optional[int] = Query(None, description="Transaction ID"),
    anagraphics_id_filter: Optional[int] = Query(None, description="Filter by anagraphics ID")
):
    """Get 1:1 reconciliation suggestions using enhanced algorithm"""
    try:
        if not invoice_id and not transaction_id:
            raise HTTPException(status_code=400, detail="Either invoice_id or transaction_id must be provided")
        
        suggestions = await reconciliation_adapter.suggest_1_to_1_matches_async(
            invoice_id=invoice_id,
            transaction_id=transaction_id,
            anagraphics_id_filter=anagraphics_id_filter
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(suggestions)} 1:1 suggestions",
            data={
                "suggestions": suggestions,
                "search_parameters": {
                    "invoice_id": invoice_id,
                    "transaction_id": transaction_id,
                    "anagraphics_id_filter": anagraphics_id_filter
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting 1:1 suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving 1:1 suggestions")


@router.get("/suggestions/n-to-m")
async def get_n_to_m_suggestions(
    transaction_id: int = Query(..., description="Transaction ID"),
    anagraphics_id_filter: Optional[int] = Query(None, description="Filter by anagraphics ID"),
    max_combination_size: int = Query(5, ge=2, le=10, description="Maximum combination size"),
    max_search_time_ms: int = Query(30000, ge=1000, le=120000, description="Maximum search time in milliseconds"),
    exclude_invoice_ids: Optional[str] = Query(None, description="Comma-separated invoice IDs to exclude"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """Get N:M reconciliation suggestions using enhanced algorithm with smart client patterns"""
    try:
        # Parse exclude_invoice_ids
        exclude_ids = []
        if exclude_invoice_ids:
            try:
                exclude_ids = [int(x.strip()) for x in exclude_invoice_ids.split(',') if x.strip()]
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid exclude_invoice_ids format")
        
        suggestions = await reconciliation_adapter.suggest_n_to_m_matches_async(
            transaction_id=transaction_id,
            anagraphics_id_filter=anagraphics_id_filter,
            max_combination_size=max_combination_size,
            max_search_time_ms=max_search_time_ms,
            exclude_invoice_ids=exclude_ids if exclude_ids else None,
            start_date=start_date,
            end_date=end_date
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(suggestions)} N:M suggestions",
            data={
                "suggestions": suggestions,
                "search_parameters": {
                    "transaction_id": transaction_id,
                    "anagraphics_id_filter": anagraphics_id_filter,
                    "max_combination_size": max_combination_size,
                    "max_search_time_ms": max_search_time_ms,
                    "excluded_invoice_ids": exclude_ids,
                    "date_range": {"start": start_date, "end": end_date}
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting N:M suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving N:M suggestions")


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


@router.get("/automatic-matches")
async def get_automatic_matches(
    confidence_level: str = Query("Exact", description="Confidence level for automatic matching")
):
    """Get automatic matches using optimized algorithm"""
    try:
        matches = await reconciliation_adapter.find_automatic_matches_async(confidence_level)
        
        return APIResponse(
            success=True,
            message=f"Found {len(matches)} automatic matches",
            data={
                "matches": matches,
                "confidence_level": confidence_level
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting automatic matches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving automatic matches")


@router.post("/transaction/{transaction_id}/ignore")
async def ignore_transaction(
    transaction_id: int = Path(..., description="Transaction ID")
):
    """Mark a transaction as ignored using adapter"""
    try:
        # Verifica che la transazione esista
        transaction_check = await db_adapter.execute_query_async(
            "SELECT id, description FROM BankTransactions WHERE id = ?",
            (transaction_id,)
        )
        
        if not transaction_check:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        success, message, affected_invoices = await reconciliation_adapter.ignore_transaction_async(transaction_id)
        
        if success:
            return APIResponse(
                success=True,
                message=message,
                data={
                    "transaction_id": transaction_id,
                    "affected_invoices": affected_invoices
                }
            )
        else:
            raise HTTPException(status_code=500, detail=message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ignoring transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error ignoring transaction")


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
            },
            'smart_reconciliation': {
                'enabled': True,
                'client_pattern_weight': 0.3,
                'sequence_detection': True,
                'amount_pattern_analysis': True
            }
        }
        
        return APIResponse(
            success=True,
            message="Matching rules retrieved",
            data={
                'rules': matching_rules,
                'last_updated': '2025-06-06T00:00:00Z',
                'version': '2.1'
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting matching rules: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving matching rules")


@router.get("/smart/overview")
async def get_smart_reconciliation_overview():
    """Get overview of smart reconciliation capabilities and status"""
    try:
        # Verifica disponibilità smart reconciliation
        try:
            from app.core.smart_client_reconciliation import get_smart_reconciler
            smart_available = True
            
            # Ottieni statistiche pattern
            reconciler = get_smart_reconciler()
            pattern_count = len(reconciler.client_patterns) if hasattr(reconciler, 'client_patterns') else 0
            
        except ImportError:
            smart_available = False
            pattern_count = 0
        
        # Statistiche clienti con pattern
        if smart_available:
            client_pattern_stats = await db_adapter.execute_query_async("""
                SELECT 
                    COUNT(DISTINCT i.anagraphics_id) as clients_with_history,
                    COUNT(DISTINCT rl.transaction_id) as pattern_transactions,
                    AVG(julianday(rl.reconciliation_date) - julianday(i.doc_date)) as avg_payment_delay
                FROM ReconciliationLinks rl
                JOIN Invoices i ON rl.invoice_id = i.id
                WHERE rl.reconciliation_date >= date('now', '-2 years')
                  AND i.type = 'Attiva'
            """)
            
            stats = client_pattern_stats[0] if client_pattern_stats else {}
        else:
            stats = {}
        
        overview_data = {
            'smart_reconciliation_available': smart_available,
            'active_client_patterns': pattern_count,
            'statistics': {
                'clients_with_payment_history': stats.get('clients_with_history', 0),
                'historical_pattern_transactions': stats.get('pattern_transactions', 0),
                'average_payment_delay_days': round(stats.get('avg_payment_delay', 0), 1) if stats.get('avg_payment_delay') else 0
            },
            'features': {
                'client_pattern_analysis': smart_available,
                'sequence_detection': smart_available,
                'payment_reliability_scoring': smart_available,
                'automatic_pattern_learning': smart_available
            }
        }
        
        return APIResponse(
            success=True,
            message="Smart reconciliation overview retrieved",
            data=overview_data
        )
        
    except Exception as e:
        logger.error(f"Error getting smart reconciliation overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving smart reconciliation overview")


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
        
        # Test smart reconciliation
        smart_status = "not_available"
        try:
            from app.core.smart_client_reconciliation import get_smart_reconciler
            reconciler = get_smart_reconciler()
            smart_status = "healthy"
        except ImportError:
            smart_status = "not_available"
        except Exception as smart_error:
            smart_status = f"error: {str(smart_error)}"
        
        health_data = {
            'status': 'healthy' if core_status == 'healthy' else 'degraded',
            'core_reconciliation': core_status,
            'smart_reconciliation': smart_status,
            'data_availability': {
                'open_invoices': invoice_count[0]['count'] if invoice_count else 0,
                'unreconciled_transactions': transaction_count[0]['count'] if transaction_count else 0,
                'recent_reconciliations': recent_reconciliations[0]['count'] if recent_reconciliations else 0
            },
            'system_info': {
                'adapter_version': '2.1',
                'database_connection': 'active',
                'smart_features_available': smart_status != "not_available",
                'last_check': '2025-06-06T00:00:00Z'
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
