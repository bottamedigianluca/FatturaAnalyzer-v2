"""
Transactions API endpoints - Aggiornato per usare adapter pattern
"""

import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse

# Usa adapters invece di accesso diretto al core
from app.adapters.database_adapter import db_adapter
from app.adapters.reconciliation_adapter import reconciliation_adapter
from app.models import (
    BankTransaction, BankTransactionCreate, BankTransactionUpdate,
    TransactionFilter, PaginationParams, TransactionListResponse,
    APIResponse, ReconciliationStatus
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=TransactionListResponse)
async def get_transactions_list(
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
    size: int = Query(50, ge=1, le=1000, description="Page size")
):
    """Get paginated list of bank transactions with advanced filters"""
    try:
        pagination = PaginationParams(page=page, size=size)
        
        # Usa adapter per ottenere transazioni dal core
        df_transactions = await db_adapter.get_transactions_async(
            start_date=start_date.isoformat() if start_date else None,
            end_date=end_date.isoformat() if end_date else None,
            status_filter=status_filter.value if status_filter else None,
            limit=None,  # Applicheremo filtri e paginazione qui
            anagraphics_id_heuristic_filter=anagraphics_id_heuristic,
            hide_pos=hide_pos,
            hide_worldline=hide_worldline,
            hide_cash=hide_cash,
            hide_commissions=hide_commissions
        )
        
        if df_transactions.empty:
            return TransactionListResponse(
                items=[],
                total=0,
                page=page,
                size=size,
                pages=0
            )
        
        # Applica filtri aggiuntivi
        if search:
            search_mask = df_transactions['description'].str.contains(
                search, case=False, na=False
            )
            df_transactions = df_transactions[search_mask]
        
        if min_amount is not None:
            df_transactions = df_transactions[
                df_transactions['amount'].abs() >= min_amount
            ]
        
        if max_amount is not None:
            df_transactions = df_transactions[
                df_transactions['amount'].abs() <= max_amount
            ]
        
        total = len(df_transactions)
        
        # Paginazione
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_transactions.iloc[start_idx:end_idx]
        
        # Converti in formato API con campi aggiuntivi
        items = []
        for _, row in df_paginated.iterrows():
            item = row.to_dict()
            # Aggiungi campi computati
            item['remaining_amount'] = item['amount'] - item.get('reconciled_amount', 0)
            item['is_income'] = item['amount'] > 0
            item['is_expense'] = item['amount'] < 0
            items.append(item)
        
        pages = (total + size - 1) // size
        
        return TransactionListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Error getting transactions list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving transactions: {str(e)}")


@router.get("/{transaction_id}", response_model=BankTransaction)
async def get_transaction_by_id(
    transaction_id: int = Path(..., description="Transaction ID")
):
    """Get transaction by ID with full details"""
    try:
        # Usa adapter per ottenere dettagli
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Aggiungi campi computati
        transaction['remaining_amount'] = transaction['amount'] - transaction.get('reconciled_amount', 0)
        transaction['is_income'] = transaction['amount'] > 0
        transaction['is_expense'] = transaction['amount'] < 0
        
        return transaction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving transaction")


@router.post("/", response_model=BankTransaction)
async def create_transaction(transaction_data: BankTransactionCreate):
    """Create new bank transaction"""
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


@router.put("/{transaction_id}", response_model=BankTransaction)
async def update_transaction(
    transaction_id: int = Path(..., description="Transaction ID"),
    transaction_data: BankTransactionUpdate = ...
):
    """Update transaction"""
    try:
        # Verifica esistenza
        existing = await db_adapter.execute_query_async(
            "SELECT id FROM BankTransactions WHERE id = ?", (transaction_id,)
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Build update query dinamica
        update_fields = []
        params = []
        
        for field, value in transaction_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field in ['transaction_date', 'value_date'] and hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif hasattr(value, 'value'):  # Enum
                    value = value.value
                update_fields.append(f"{field} = ?")
                params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Aggiungi updated_at
        update_fields.append("updated_at = datetime('now')")
        params.append(transaction_id)
        
        update_query = f"UPDATE BankTransactions SET {', '.join(update_fields)} WHERE id = ?"
        
        rows_affected = await db_adapter.execute_write_async(update_query, tuple(params))
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Restituisci transazione aggiornata
        return await get_transaction_by_id(transaction_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating transaction")


@router.delete("/{transaction_id}", response_model=APIResponse)
async def delete_transaction(
    transaction_id: int = Path(..., description="Transaction ID")
):
    """Delete transaction and related reconciliation links"""
    try:
        # Verifica se ha link di riconciliazione
        links_query = "SELECT COUNT(*) as count FROM ReconciliationLinks WHERE transaction_id = ?"
        links_result = await db_adapter.execute_query_async(links_query, (transaction_id,))
        
        if links_result and links_result[0]['count'] > 0:
            # Prima rimuovi i link
            await reconciliation_adapter.undo_reconciliation_async(transaction_id=transaction_id)
        
        # Elimina transazione
        delete_query = "DELETE FROM BankTransactions WHERE id = ?"
        rows_affected = await db_adapter.execute_write_async(delete_query, (transaction_id,))
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return APIResponse(
            success=True,
            message="Transaction deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error deleting transaction")


@router.get("/{transaction_id}/reconciliation-links")
async def get_transaction_reconciliation_links(
    transaction_id: int = Path(..., description="Transaction ID")
):
    """Get reconciliation links for transaction"""
    try:
        query = """
            SELECT rl.id, rl.invoice_id, rl.reconciled_amount, rl.reconciliation_date,
                   i.doc_number, i.doc_date, i.total_amount as invoice_amount, 
                   a.denomination as counterparty
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE rl.transaction_id = ?
            ORDER BY rl.reconciliation_date DESC
        """
        
        links = await db_adapter.execute_query_async(query, (transaction_id,))
        
        return APIResponse(
            success=True,
            message=f"Found {len(links)} reconciliation links",
            data=links
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation links for transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation links")


@router.get("/{transaction_id}/potential-matches")
async def get_transaction_potential_matches(
    transaction_id: int = Path(..., description="Transaction ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of matches")
):
    """Get potential invoice matches for transaction"""
    try:
        # Ottieni dettagli transazione
        transaction = await db_adapter.get_item_details_async('transaction', transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Se non è un incasso, non cercare match
        if transaction['amount'] <= 0:
            return APIResponse(
                success=True,
                message="No matches for expense transactions",
                data=[]
            )
        
        # Usa reconciliation adapter per trovare opportunità
        opportunities = await reconciliation_adapter.get_reconciliation_opportunities_async(
            limit=limit * 2  # Ottieni più opportunità per filtrare
        )
        
        # Filtra solo quelle per questa transazione
        transaction_opportunities = [
            opp for opp in opportunities 
            if opp['transaction_id'] == transaction_id
        ]
        
        return APIResponse(
            success=True,
            message=f"Found {len(transaction_opportunities)} potential matches",
            data=transaction_opportunities[:limit]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding potential matches for transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error finding potential matches")


@router.post("/{transaction_id}/update-status", response_model=APIResponse)
async def update_transaction_reconciliation_status(
    transaction_id: int = Path(..., description="Transaction ID"),
    reconciliation_status: ReconciliationStatus = Body(..., description="New reconciliation status"),
    reconciled_amount: Optional[float] = Body(None, description="Amount reconciled")
):
    """Update transaction reconciliation status and amount"""
    try:
        # Ottieni dati transazione correnti
        current_query = "SELECT amount, reconciled_amount FROM BankTransactions WHERE id = ?"
        current_result = await db_adapter.execute_query_async(current_query, (transaction_id,))
        
        if not current_result:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        current_data = current_result[0]
        
        # Se reconciled_amount non fornito, mantieni quello attuale
        if reconciled_amount is None:
            reconciled_amount = current_data['reconciled_amount']
        
        # Validazioni
        if reconciled_amount < 0:
            raise HTTPException(status_code=400, detail="Reconciled amount cannot be negative")
        
        if reconciled_amount > abs(current_data['amount']):
            raise HTTPException(
                status_code=400, 
                detail="Reconciled amount cannot exceed transaction amount"
            )
        
        # Aggiorna usando adapter
        success = await db_adapter.update_transaction_state_async(
            transaction_id, 
            reconciliation_status.value, 
            reconciled_amount
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update transaction status")
        
        return APIResponse(
            success=True,
            message=f"Transaction status updated to {reconciliation_status.value}",
            data={
                "transaction_id": transaction_id,
                "new_status": reconciliation_status.value,
                "reconciled_amount": reconciled_amount,
                "remaining_amount": abs(current_data['amount']) - reconciled_amount
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating transaction status {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating transaction status")


@router.get("/stats/summary")
async def get_transactions_stats():
    """Get transaction statistics summary"""
    try:
        # Statistiche per stato
        status_stats_query = """
            SELECT 
                reconciliation_status,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                SUM(ABS(amount) - reconciled_amount) as remaining_amount,
                AVG(ABS(amount)) as avg_amount
            FROM BankTransactions
            GROUP BY reconciliation_status
        """
        
        status_stats = await db_adapter.execute_query_async(status_stats_query)
        
        # Statistiche per tipo (entrate/uscite)
        type_stats_query = """
            SELECT 
                CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END as type,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                AVG(ABS(amount)) as avg_amount
            FROM BankTransactions
            GROUP BY CASE WHEN amount > 0 THEN 'Income' ELSE 'Expense' END
        """
        
        type_stats = await db_adapter.execute_query_async(type_stats_query)
        
        # Trend mensili
        monthly_trends_query = """
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
        """
        
        monthly_trends = await db_adapter.execute_query_async(monthly_trends_query)
        
        # Transazioni recenti
        recent_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status
            FROM BankTransactions
            ORDER BY transaction_date DESC, id DESC
            LIMIT 10
        """
        
        recent = await db_adapter.execute_query_async(recent_query)
        
        # Statistiche causali ABI più frequenti
        causali_stats_query = """
            SELECT 
                causale_abi,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount
            FROM BankTransactions
            WHERE causale_abi IS NOT NULL
            GROUP BY causale_abi
            ORDER BY count DESC
            LIMIT 10
        """
        
        causali_stats = await db_adapter.execute_query_async(causali_stats_query)
        
        return APIResponse(
            success=True,
            message="Transaction statistics retrieved",
            data={
                "status_statistics": status_stats,
                "type_statistics": type_stats,
                "monthly_trends": monthly_trends,
                "recent_transactions": recent,
                "top_causali_abi": causali_stats
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting transaction stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics")


@router.get("/search/{query}")
async def search_transactions(
    query: str = Path(..., description="Search query"),
    limit: int = Query(10, ge=1, le=100),
    include_reconciled: bool = Query(False, description="Include fully reconciled transactions")
):
    """Search transactions by description or amount"""
    try:
        # Build search query
        search_conditions = ["description LIKE ?"]
        search_params = [f"%{query}%"]
        
        # Try to parse as number for amount search
        try:
            amount_value = float(query.replace(',', '.'))
            search_conditions.append("ABS(amount) = ?")
            search_params.append(abs(amount_value))
        except ValueError:
            pass
        
        # Build final query
        base_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount
            FROM BankTransactions
            WHERE ({})
        """.format(" OR ".join(search_conditions))
        
        if not include_reconciled:
            base_query += " AND reconciliation_status != 'Riconciliato Tot.'"
        
        base_query += " ORDER BY transaction_date DESC LIMIT ?"
        search_params.append(limit)
        
        results = await db_adapter.execute_query_async(base_query, tuple(search_params))
        
        return APIResponse(
            success=True,
            message=f"Found {len(results)} results",
            data={
                "query": query,
                "results": results,
                "total": len(results)
            }
        )
        
    except Exception as e:
        logger.error(f"Error searching transactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error searching transactions")


@router.get("/analysis/cash-flow")
async def get_cash_flow_analysis(
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze"),
    group_by: str = Query("month", description="Group by: month, week, day")
):
    """Get cash flow analysis for transactions"""
    try:
        # Usa analytics adapter per analisi cash flow
        from app.adapters.analytics_adapter import analytics_adapter
        
        cash_flow_df = await analytics_adapter.get_monthly_cash_flow_analysis_async(months)
        
        if cash_flow_df.empty:
            return APIResponse(
                success=True,
                message="No cash flow data available",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Cash flow analysis for {months} months",
            data=cash_flow_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting cash flow analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving cash flow analysis")


@router.post("/batch/update-status")
async def batch_update_transaction_status(
    transaction_ids: List[int] = Body(..., description="List of transaction IDs"),
    reconciliation_status: ReconciliationStatus = Body(..., description="New status for all transactions")
):
    """Update reconciliation status for multiple transactions"""
    try:
        if len(transaction_ids) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 transactions per batch")
        
        results = {
            'total': len(transaction_ids),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for transaction_id in transaction_ids:
            try:
                # Ottieni transazione corrente
                current = await db_adapter.execute_query_async(
                    "SELECT amount, reconciled_amount FROM BankTransactions WHERE id = ?",
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
                
                # Aggiorna stato
                success = await db_adapter.update_transaction_state_async(
                    transaction_id,
                    reconciliation_status.value,
                    current[0]['reconciled_amount']  # Mantieni importo riconciliato attuale
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
        
        return APIResponse(
            success=True,
            message=f"Batch update completed: {results['successful']} successful, {results['failed']} failed",
            data=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch update: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error in batch update")


@router.get("/export/reconciliation-ready")
async def export_reconciliation_ready_transactions(
    format: str = Query("json", description="Export format: json, csv"),
    limit: int = Query(1000, ge=1, le=5000, description="Maximum transactions to export")
):
    """Export transactions ready for reconciliation"""
    try:
        # Ottieni transazioni pronte per riconciliazione
        query = """
            SELECT 
                bt.id,
                bt.transaction_date,
                bt.amount,
                bt.description,
                bt.reconciliation_status,
                (bt.amount - bt.reconciled_amount) as remaining_amount
            FROM BankTransactions bt
            WHERE bt.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
              AND bt.amount > 0  -- Solo entrate
              AND (bt.amount - bt.reconciled_amount) > 0.01
            ORDER BY bt.transaction_date DESC
            LIMIT ?
        """
        
        transactions = await db_adapter.execute_query_async(query, (limit,))
        
        if format == "csv":
            import pandas as pd
            from io import StringIO
            
            df = pd.DataFrame(transactions)
            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False, sep=';')
            csv_content = csv_buffer.getvalue()
            
            from fastapi.responses import Response
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=transactions_reconciliation_ready.csv"}
            )
        else:
            return APIResponse(
                success=True,
                message=f"Exported {len(transactions)} transactions ready for reconciliation",
                data={
                    'transactions': transactions,
                    'count': len(transactions),
                    'export_date': datetime.now().isoformat()
                }
            )
        
    except Exception as e:
        logger.error(f"Error exporting reconciliation-ready transactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting transactions")
