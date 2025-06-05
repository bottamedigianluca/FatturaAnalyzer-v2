"""
Invoices API endpoints
"""

import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.responses import JSONResponse

from app.adapters.database_adapter import db_adapter
from app.models import (
    Invoice, InvoiceCreate, InvoiceUpdate, InvoiceFilter,
    PaginationParams, InvoiceListResponse, APIResponse,
    PaymentStatus, InvoiceType
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=InvoiceListResponse)
async def get_invoices_list(
    type_filter: Optional[InvoiceType] = Query(None, description="Filter by invoice type"),
    status_filter: Optional[PaymentStatus] = Query(None, description="Filter by payment status"),
    anagraphics_id: Optional[int] = Query(None, description="Filter by anagraphics ID"),
    search: Optional[str] = Query(None, description="Search in doc_number or counterparty name"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    min_amount: Optional[float] = Query(None, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, description="Maximum amount filter"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=1000, description="Page size")
):
    """Get paginated list of invoices with filters"""
    try:
        pagination = PaginationParams(page=page, size=size)
        
        base_query = """
            SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount, i.due_date,
                   i.payment_status, i.paid_amount, i.payment_method, i.anagraphics_id,
                   i.unique_hash, i.created_at, i.updated_at, i.notes,
                   a.denomination as counterparty_name,
                   (i.total_amount - i.paid_amount) as open_amount
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
        """
        
        count_query = """
            SELECT COUNT(*) as total
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
        """
        
        conditions = []
        params = []
        
        if type_filter:
            conditions.append("i.type = ?")
            params.append(type_filter.value)
        
        if status_filter:
            conditions.append("i.payment_status = ?")
            params.append(status_filter.value)
        
        if anagraphics_id:
            conditions.append("i.anagraphics_id = ?")
            params.append(anagraphics_id)
        
        if search:
            search_condition = "(i.doc_number LIKE ? OR a.denomination LIKE ?)"
            conditions.append(search_condition)
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
        
        if start_date:
            conditions.append("i.doc_date >= ?")
            params.append(start_date.isoformat())
        
        if end_date:
            conditions.append("i.doc_date <= ?")
            params.append(end_date.isoformat())
        
        if min_amount is not None:
            conditions.append("i.total_amount >= ?")
            params.append(min_amount)
        
        if max_amount is not None:
            conditions.append("i.total_amount <= ?")
            params.append(max_amount)
        
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            base_query += where_clause
            count_query += where_clause
        
        total_result = await db_adapter.execute_query_async(count_query, tuple(params))
        total = total_result[0]['total'] if total_result else 0
        
        base_query += " ORDER BY i.doc_date DESC, i.id DESC LIMIT ? OFFSET ?"
        params.extend([pagination.limit, pagination.offset])
        
        items = await db_adapter.execute_query_async(base_query, tuple(params))
        
        pages = (total + pagination.size - 1) // pagination.size
        
        return InvoiceListResponse(
            items=items,
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Error getting invoices list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving invoices: {str(e)}")


@router.get("/{invoice_id}", response_model=Invoice)
async def get_invoice_by_id(
    invoice_id: int = Path(..., description="Invoice ID")
):
    """Get invoice by ID with full details"""
    try:
        invoice_query = """
            SELECT i.id, i.type, i.doc_type, i.doc_number, i.doc_date, i.total_amount, 
                   i.due_date, i.payment_status, i.paid_amount, i.payment_method,
                   i.notes, i.xml_filename, i.p7m_source_file, i.unique_hash,
                   i.anagraphics_id, i.created_at, i.updated_at,
                   a.denomination as counterparty_name,
                   (i.total_amount - i.paid_amount) as open_amount
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.id = ?
        """
        
        invoice_result = await db_adapter.execute_query_async(invoice_query, (invoice_id,))
        
        if not invoice_result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice_data = invoice_result[0]
        
        lines_query = """
            SELECT id, line_number, description, quantity, unit_measure, 
                   unit_price, total_price, vat_rate, item_code, item_type
            FROM InvoiceLines
            WHERE invoice_id = ?
            ORDER BY line_number
        """
        
        lines = await db_adapter.execute_query_async(lines_query, (invoice_id,))
        
        vat_query = """
            SELECT id, vat_rate, taxable_amount, vat_amount
            FROM InvoiceVATSummary
            WHERE invoice_id = ?
            ORDER BY vat_rate
        """
        
        vat_summary = await db_adapter.execute_query_async(vat_query, (invoice_id,))
        
        invoice_data['lines'] = lines
        invoice_data['vat_summary'] = vat_summary
        
        return invoice_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoice {invoice_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving invoice")


@router.post("/", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate):
    """Create new invoice with lines and VAT summary"""
    try:
        anag_check = await db_adapter.execute_query_async(
            "SELECT id FROM Anagraphics WHERE id = ?", 
            (invoice_data.anagraphics_id,)
        )
        if not anag_check:
            raise HTTPException(
                status_code=400, 
                detail=f"Anagraphics ID {invoice_data.anagraphics_id} not found"
            )
        
        import hashlib
        from datetime import datetime
        hash_input = f"{invoice_data.anagraphics_id}_{invoice_data.doc_number}_{invoice_data.doc_date}_{datetime.now().isoformat()}"
        unique_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        
        invoice_insert = """
            INSERT INTO Invoices 
            (anagraphics_id, type, doc_type, doc_number, doc_date, total_amount, 
             due_date, payment_method, notes, xml_filename, p7m_source_file, 
             unique_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        
        invoice_params = (
            invoice_data.anagraphics_id,
            invoice_data.type.value,
            invoice_data.doc_type,
            invoice_data.doc_number,
            invoice_data.doc_date.isoformat(),
            invoice_data.total_amount,
            invoice_data.due_date.isoformat() if invoice_data.due_date else None,
            invoice_data.payment_method,
            invoice_data.notes,
            invoice_data.xml_filename,
            invoice_data.p7m_source_file,
            unique_hash
        )
        
        invoice_id = await db_adapter.execute_write_async(invoice_insert, invoice_params)
        
        if not invoice_id:
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        
        if invoice_data.lines:
            lines_insert = """
                INSERT INTO InvoiceLines 
                (invoice_id, line_number, description, quantity, unit_measure, 
                 unit_price, total_price, vat_rate, item_code, item_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            for line in invoice_data.lines:
                line_params = (
                    invoice_id,
                    line.line_number,
                    line.description,
                    line.quantity,
                    line.unit_measure,
                    line.unit_price,
                    line.total_price,
                    line.vat_rate,
                    line.item_code,
                    line.item_type
                )
                await db_adapter.execute_write_async(lines_insert, line_params)
        
        if invoice_data.vat_summary:
            vat_insert = """
                INSERT INTO InvoiceVATSummary 
                (invoice_id, vat_rate, taxable_amount, vat_amount)
                VALUES (?, ?, ?, ?)
            """
            
            for vat in invoice_data.vat_summary:
                vat_params = (
                    invoice_id,
                    vat.vat_rate,
                    vat.taxable_amount,
                    vat.vat_amount
                )
                await db_adapter.execute_write_async(vat_insert, vat_params)
        
        return await get_invoice_by_id(invoice_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating invoice")


@router.put("/{invoice_id}", response_model=Invoice)
async def update_invoice(
    invoice_id: int = Path(..., description="Invoice ID"),
    invoice_data: InvoiceUpdate = ...
):
    """Update invoice"""
    try:
        existing = await db_adapter.execute_query_async("SELECT id FROM Invoices WHERE id = ?", (invoice_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        update_fields = []
        params = []
        
        for field, value in invoice_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field in ['doc_date', 'due_date'] and hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif hasattr(value, 'value'):
                    value = value.value
                update_fields.append(f"{field} = ?")
                params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("updated_at = datetime('now')")
        params.append(invoice_id)
        
        update_query = f"UPDATE Invoices SET {', '.join(update_fields)} WHERE id = ?"
        
        rows_affected = await db_adapter.execute_write_async(update_query, tuple(params))
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return await get_invoice_by_id(invoice_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice {invoice_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating invoice")


@router.delete("/{invoice_id}", response_model=APIResponse)
async def delete_invoice(
    invoice_id: int = Path(..., description="Invoice ID")
):
    """Delete invoice and related data"""
    try:
        links_query = "SELECT COUNT(*) as count FROM ReconciliationLinks WHERE invoice_id = ?"
        links_result = await db_adapter.execute_query_async(links_query, (invoice_id,))
        
        if links_result and links_result[0]['count'] > 0:
            raise HTTPException(
                status_code=409, 
                detail="Cannot delete invoice with existing reconciliation links"
            )
        
        delete_query = "DELETE FROM Invoices WHERE id = ?"
        rows_affected = await db_adapter.execute_write_async(delete_query, (invoice_id,))
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return APIResponse(
            success=True,
            message="Invoice deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice {invoice_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error deleting invoice")


@router.get("/{invoice_id}/reconciliation-links")
async def get_invoice_reconciliation_links(
    invoice_id: int = Path(..., description="Invoice ID")
):
    """Get reconciliation links for invoice"""
    try:
        query = """
            SELECT rl.id, rl.transaction_id, rl.reconciled_amount, rl.reconciliation_date,
                   bt.transaction_date, bt.amount as transaction_amount, bt.description
            FROM ReconciliationLinks rl
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            WHERE rl.invoice_id = ?
            ORDER BY rl.reconciliation_date DESC
        """
        
        links = await db_adapter.execute_query_async(query, (invoice_id,))
        
        return APIResponse(
            success=True,
            message=f"Found {len(links)} reconciliation links",
            data=links
        )
        
    except Exception as e:
        logger.error(f"Error getting reconciliation links for invoice {invoice_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving reconciliation links")


@router.get("/overdue/list")
async def get_overdue_invoices(
    limit: int = Query(20, ge=1, le=100, description="Limit number of results")
):
    """Get overdue invoices ordered by priority"""
    try:
        query = f"""
            SELECT 
                i.id,
                i.doc_number,
                i.doc_date,
                i.due_date,
                i.total_amount,
                i.paid_amount,
                (i.total_amount - i.paid_amount) as open_amount,
                (julianday('now') - julianday(i.due_date)) as days_overdue,
                a.denomination as counterparty_name,
                (julianday('now') - julianday(i.due_date)) * (i.total_amount - i.paid_amount) as priority_score
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.type = 'Attiva'
              AND i.payment_status IN ('Scaduta', 'Aperta')
              AND i.due_date < date('now')
              AND (i.total_amount - i.paid_amount) > 0.01
            ORDER BY priority_score DESC, i.due_date ASC
            LIMIT {limit}
        """
        
        overdue_invoices = await db_adapter.execute_query_async(query)
        
        return APIResponse(
            success=True,
            message=f"Found {len(overdue_invoices)} overdue invoices",
            data=overdue_invoices
        )
        
    except Exception as e:
        logger.error(f"Error getting overdue invoices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving overdue invoices")


@router.get("/aging/summary")
async def get_aging_summary(
    invoice_type: InvoiceType = Query(InvoiceType.ATTIVA, description="Invoice type for aging analysis")
):
    """Get aging summary for invoices"""
    try:
        query = f"""
            SELECT 
                CASE 
                    WHEN julianday('now') - julianday(due_date) <= 0 THEN 'Not Due'
                    WHEN julianday('now') - julianday(due_date) <= 30 THEN '1-30 days'
                    WHEN julianday('now') - julianday(due_date) <= 60 THEN '31-60 days'
                    WHEN julianday('now') - julianday(due_date) <= 90 THEN '61-90 days'
                    ELSE 'Over 90 days'
                END as aging_bucket,
                COUNT(*) as count,
                SUM(total_amount - paid_amount) as amount
            FROM Invoices
            WHERE type = '{invoice_type.value}'
              AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND (total_amount - paid_amount) > 0.01
            GROUP BY aging_bucket
            ORDER BY 
                CASE aging_bucket
                    WHEN 'Not Due' THEN 1
                    WHEN '1-30 days' THEN 2
                    WHEN '31-60 days' THEN 3
                    WHEN '61-90 days' THEN 4
                    ELSE 5
                END
        """
        
        result = await db_adapter.execute_query_async(query)
        
        buckets = []
        total_amount = 0.0
        total_count = 0
        
        for row in result:
            amount = float(row['amount'] or 0)
            count = row['count'] or 0
            buckets.append({
                "label": row['aging_bucket'],
                "amount": amount,
                "count": count
            })
            total_amount += amount
            total_count += count
        
        return APIResponse(
            success=True,
            message="Aging summary calculated",
            data={
                "buckets": buckets,
                "total_amount": total_amount,
                "total_count": total_count,
                "invoice_type": invoice_type.value
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting aging summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error calculating aging summary")


@router.get("/stats/summary")
async def get_invoices_stats():
    """Get invoice statistics summary"""
    try:
        stats_query = """
            SELECT 
                type,
                payment_status,
                COUNT(*) as count,
                SUM(total_amount) as total_amount,
                SUM(paid_amount) as paid_amount,
                SUM(total_amount - paid_amount) as open_amount
            FROM Invoices
            GROUP BY type, payment_status
        """
        
        stats = await db_adapter.execute_query_async(stats_query)
        
        recent_query = """
            SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount,
                   i.payment_status, a.denomination as counterparty_name
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            ORDER BY i.created_at DESC
            LIMIT 10
        """
        
        recent = await db_adapter.execute_query_async(recent_query)
        
        return APIResponse(
            success=True,
            message="Statistics retrieved",
            data={
                "status_stats": stats,
                "recent_invoices": recent
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting invoice stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics")


@router.get("/search/{query}")
async def search_invoices(
    query: str = Path(..., description="Search query"),
    type_filter: Optional[InvoiceType] = Query(None, description="Filter by type"),
    limit: int = Query(10, ge=1, le=100)
):
    """Search invoices by document number or counterparty name"""
    try:
        search_query = """
            SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount,
                   i.payment_status, a.denomination as counterparty_name,
                   (i.total_amount - i.paid_amount) as open_amount
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE (
                i.doc_number LIKE ? OR 
                a.denomination LIKE ?
            )
        """
        
        params = [f"%{query}%", f"%{query}%"]
        
        if type_filter:
            search_query += " AND i.type = ?"
            params.append(type_filter.value)
        
        search_query += " ORDER BY i.doc_date DESC LIMIT ?"
        params.append(limit)
        
        results = await db_adapter.execute_query_async(search_query, tuple(params))
        
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
        logger.error(f"Error searching invoices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error searching invoices")


@router.post("/{invoice_id}/update-payment-status", response_model=APIResponse)
async def update_invoice_payment_status(
    invoice_id: int = Path(..., description="Invoice ID"),
    payment_status: PaymentStatus = Query(..., description="New payment status"),
    paid_amount: Optional[float] = Query(None, description="Amount paid")
):
    """Update invoice payment status and paid amount"""
    try:
        current_query = "SELECT total_amount, paid_amount FROM Invoices WHERE id = ?"
        current_result = await db_adapter.execute_query_async(current_query, (invoice_id,))
        
        if not current_result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        current_data = current_result[0]
        
        if paid_amount is None:
            if payment_status == PaymentStatus.PAGATA_TOT:
                paid_amount = current_data['total_amount']
            elif payment_status == PaymentStatus.APERTA:
                paid_amount = 0.0
            else:
                paid_amount = current_data['paid_amount']
        
        if paid_amount < 0 or paid_amount > current_data['total_amount']:
            raise HTTPException(
                status_code=400, 
                detail="Paid amount must be between 0 and total amount"
            )
        
        update_query = """
            UPDATE Invoices 
            SET payment_status = ?, paid_amount = ?, updated_at = datetime('now')
            WHERE id = ?
        """
        
        rows_affected = await db_adapter.execute_write_async(
            update_query, 
            (payment_status.value, paid_amount, invoice_id)
        )
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return APIResponse(
            success=True,
            message=f"Payment status updated to {payment_status.value}",
            data={
                "invoice_id": invoice_id,
                "new_status": payment_status.value,
                "paid_amount": paid_amount
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment status for invoice {invoice_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating payment status")
