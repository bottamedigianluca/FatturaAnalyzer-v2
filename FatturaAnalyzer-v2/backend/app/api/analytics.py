"""
Analytics API endpoints
"""

import logging
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import JSONResponse

from app.core.database import execute_query_async
from app.models import (
    KPIData, CashFlowData, MonthlyRevenueData, TopClientData,
    ProductAnalysisData, AgingSummary, DashboardData, APIResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data():
    """Get comprehensive dashboard data with KPIs and summaries"""
    try:
        from app.core.analysis import (
            calculate_main_kpis,
            get_monthly_cash_flow_analysis,
            get_top_clients_by_revenue,
            get_top_overdue_invoices
        )
        
        # Calculate main KPIs
        kpis = calculate_main_kpis()
        
        # Get recent invoices
        recent_invoices_query = """
            SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount,
                   i.payment_status, i.due_date, a.denomination as counterparty_name,
                   (i.total_amount - i.paid_amount) as open_amount
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            ORDER BY i.created_at DESC
            LIMIT 10
        """
        
        recent_invoices = await execute_query_async(recent_invoices_query)
        
        # Get recent transactions
        recent_transactions_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount
            FROM BankTransactions
            WHERE reconciliation_status != 'Ignorato'
            ORDER BY transaction_date DESC, id DESC
            LIMIT 10
        """
        
        recent_transactions = await execute_query_async(recent_transactions_query)
        
        # Get cash flow data (last 6 months)
        cash_flow_df = get_monthly_cash_flow_analysis(6)
        cash_flow_summary = cash_flow_df.to_dict('records') if not cash_flow_df.empty else []
        
        # Get top clients
        top_clients_df = get_top_clients_by_revenue(10)
        top_clients = top_clients_df.to_dict('records') if not top_clients_df.empty else []
        
        # Get overdue invoices
        overdue_invoices_df = get_top_overdue_invoices(5)
        overdue_invoices = overdue_invoices_df.to_dict('records') if not overdue_invoices_df.empty else []
        
        return DashboardData(
            kpis=kpis,
            recent_invoices=recent_invoices,
            recent_transactions=recent_transactions,
            cash_flow_summary=cash_flow_summary,
            top_clients=top_clients,
            overdue_invoices=overdue_invoices
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving dashboard data")


@router.get("/kpis", response_model=KPIData)
async def get_kpis():
    """Get main KPIs"""
    try:
        from app.core.analysis import calculate_main_kpis
        
        kpis = calculate_main_kpis()
        return kpis
        
    except Exception as e:
        logger.error(f"Error getting KPIs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error calculating KPIs")


@router.get("/cash-flow/monthly")
async def get_monthly_cash_flow(
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze")
):
    """Get monthly cash flow analysis"""
    try:
        from app.core.analysis import get_monthly_cash_flow_analysis
        
        cash_flow_df = get_monthly_cash_flow_analysis(months)
        
        if cash_flow_df.empty:
            return APIResponse(
                success=True,
                message="No cash flow data available",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Cash flow data for {months} months",
            data=cash_flow_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting monthly cash flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving cash flow data")


@router.get("/revenue/monthly")
async def get_monthly_revenue(
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze"),
    invoice_type: Optional[str] = Query(None, description="Filter by invoice type: Attiva or Passiva")
):
    """Get monthly revenue analysis"""
    try:
        from app.core.analysis import get_monthly_revenue_analysis
        
        revenue_df = get_monthly_revenue_analysis(months, invoice_type)
        
        if revenue_df.empty:
            return APIResponse(
                success=True,
                message="No revenue data available",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Revenue data for {months} months",
            data=revenue_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting monthly revenue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving revenue data")


@router.get("/clients/top")
async def get_top_clients(
    limit: int = Query(20, ge=1, le=100, description="Number of top clients"),
    period_months: int = Query(12, ge=1, le=60, description="Analysis period in months"),
    min_revenue: Optional[float] = Query(None, description="Minimum revenue filter")
):
    """Get top clients by revenue"""
    try:
        from app.core.analysis import get_top_clients_by_revenue
        
        clients_df = get_top_clients_by_revenue(limit, period_months, min_revenue)
        
        if clients_df.empty:
            return APIResponse(
                success=True,
                message="No client data available",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Top {len(clients_df)} clients by revenue",
            data=clients_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting top clients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving top clients")


@router.get("/products/analysis")
async def get_product_analysis(
    limit: int = Query(50, ge=1, le=200, description="Number of top products"),
    period_months: int = Query(12, ge=1, le=60, description="Analysis period in months"),
    min_quantity: Optional[float] = Query(None, description="Minimum quantity filter"),
    invoice_type: Optional[str] = Query(None, description="Filter by invoice type")
):
    """Get product analysis by quantity and value"""
    try:
        from app.core.analysis import get_product_analysis
        
        products_df = get_product_analysis(limit, period_months, min_quantity, invoice_type)
        
        if products_df.empty:
            return APIResponse(
                success=True,
                message="No product data available",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Product analysis for {len(products_df)} items",
            data=products_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting product analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving product analysis")


@router.get("/aging/invoices")
async def get_invoices_aging(
    invoice_type: str = Query("Attiva", description="Invoice type: Attiva or Passiva")
):
    """Get aging analysis for invoices"""
    try:
        from app.core.analysis import get_aging_summary
        
        aging_data = get_aging_summary(invoice_type)
        
        # Convert to API response format
        buckets = []
        total_amount = 0.0
        total_count = 0
        
        for label, data in aging_data.items():
            amount = float(data['amount'])
            count = data['count']
            buckets.append({
                "label": label,
                "amount": amount,
                "count": count
            })
            total_amount += amount
            total_count += count
        
        return APIResponse(
            success=True,
            message=f"Aging analysis for {invoice_type} invoices",
            data={
                "buckets": buckets,
                "total_amount": total_amount,
                "total_count": total_count,
                "invoice_type": invoice_type
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting aging analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving aging analysis")


@router.get("/overdue/invoices")
async def get_overdue_invoices(
    limit: int = Query(20, ge=1, le=100, description="Number of invoices to return"),
    priority_sort: bool = Query(True, description="Sort by priority (amount and days overdue)")
):
    """Get overdue invoices with priority scoring"""
    try:
        from app.core.analysis import get_top_overdue_invoices
        
        overdue_df = get_top_overdue_invoices(limit, priority_sort)
        
        if overdue_df.empty:
            return APIResponse(
                success=True,
                message="No overdue invoices found",
                data=[]
            )
        
        return APIResponse(
            success=True,
            message=f"Found {len(overdue_df)} overdue invoices",
            data=overdue_df.to_dict('records')
        )
        
    except Exception as e:
        logger.error(f"Error getting overdue invoices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving overdue invoices")


@router.get("/trends/revenue")
async def get_revenue_trends(
    period: str = Query("monthly", description="Period: daily, weekly, monthly, quarterly"),
    months_back: int = Query(12, ge=1, le=60, description="Months to look back"),
    compare_previous: bool = Query(True, description="Include previous period comparison")
):
    """Get revenue trends analysis"""
    try:
        # Base query for revenue trends
        if period == "daily":
            date_format = "%Y-%m-%d"
            date_trunc = "date(doc_date)"
        elif period == "weekly":
            date_format = "%Y-W%W"
            date_trunc = "strftime('%Y-W%W', doc_date)"
        elif period == "quarterly":
            date_format = "%Y-Q%q"
            date_trunc = "strftime('%Y', doc_date) || '-Q' || ((CAST(strftime('%m', doc_date) AS INTEGER) - 1) / 3 + 1)"
        else:  # monthly
            date_format = "%Y-%m"
            date_trunc = "strftime('%Y-%m', doc_date)"
        
        trends_query = f"""
            SELECT 
                {date_trunc} as period,
                type,
                COUNT(*) as invoice_count,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_invoice_amount,
                SUM(paid_amount) as total_paid,
                SUM(total_amount - paid_amount) as total_outstanding
            FROM Invoices
            WHERE doc_date >= date('now', '-{months_back} months')
            GROUP BY {date_trunc}, type
            ORDER BY period, type
        """
        
        trends = await execute_query_async(trends_query)
        
        # Calculate period-over-period changes if requested
        if compare_previous and trends:
            # This would require more complex logic to compare with previous periods
            # For now, return the basic trends
            pass
        
        return APIResponse(
            success=True,
            message=f"Revenue trends for {period} periods",
            data={
                "trends": trends,
                "period": period,
                "months_analyzed": months_back
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting revenue trends: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving revenue trends")


@router.get("/performance/payment")
async def get_payment_performance():
    """Get payment performance metrics"""
    try:
        # Average days to payment
        payment_performance_query = """
            WITH payment_times AS (
                SELECT 
                    i.id,
                    i.doc_date,
                    i.due_date,
                    i.total_amount,
                    i.payment_status,
                    CASE 
                        WHEN i.payment_status = 'Pagata Tot.' THEN
                            -- Use the latest reconciliation date as payment date approximation
                            (SELECT MAX(reconciliation_date) FROM ReconciliationLinks rl WHERE rl.invoice_id = i.id)
                        ELSE NULL
                    END as estimated_payment_date
                FROM Invoices i
                WHERE i.type = 'Attiva'
                  AND i.payment_status IN ('Pagata Tot.', 'Aperta', 'Scaduta', 'Pagata Parz.')
            )
            SELECT 
                payment_status,
                COUNT(*) as count,
                AVG(
                    CASE 
                        WHEN estimated_payment_date IS NOT NULL THEN
                            julianday(estimated_payment_date) - julianday(doc_date)
                        WHEN due_date IS NOT NULL THEN
                            julianday('now') - julianday(due_date)
                        ELSE NULL
                    END
                ) as avg_days,
                SUM(total_amount) as total_amount
            FROM payment_times
            GROUP BY payment_status
        """
        
        performance = await execute_query_async(payment_performance_query)
        
        # Collection efficiency
        collection_query = """
            SELECT 
                strftime('%Y-%m', doc_date) as month,
                COUNT(*) as invoices_issued,
                COUNT(CASE WHEN payment_status = 'Pagata Tot.' THEN 1 END) as invoices_paid,
                SUM(total_amount) as total_issued,
                SUM(paid_amount) as total_collected,
                (CAST(COUNT(CASE WHEN payment_status = 'Pagata Tot.' THEN 1 END) AS REAL) / COUNT(*)) * 100 as collection_rate_pct
            FROM Invoices
            WHERE type = 'Attiva'
              AND doc_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', doc_date)
            ORDER BY month
        """
        
        collection = await execute_query_async(collection_query)
        
        return APIResponse(
            success=True,
            message="Payment performance metrics retrieved",
            data={
                "payment_performance": performance,
                "collection_efficiency": collection
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting payment performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving payment performance")


@router.get("/forecasting/cash-flow")
async def get_cash_flow_forecast(
    months_ahead: int = Query(6, ge=1, le=24, description="Months to forecast ahead"),
    include_scheduled: bool = Query(True, description="Include scheduled payments from due dates")
):
    """Get cash flow forecasting based on historical data and scheduled payments"""
    try:
        # Get historical monthly patterns
        historical_query = """
            SELECT 
                strftime('%m', transaction_date) as month_num,
                AVG(monthly_inflow) as avg_inflow,
                AVG(monthly_outflow) as avg_outflow,
                AVG(monthly_net) as avg_net
            FROM (
                SELECT 
                    strftime('%Y-%m', transaction_date) as year_month,
                    transaction_date,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as monthly_inflow,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as monthly_outflow,
                    SUM(amount) as monthly_net
                FROM BankTransactions
                WHERE transaction_date >= date('now', '-24 months')
                GROUP BY strftime('%Y-%m', transaction_date)
            ) monthly_data
            GROUP BY strftime('%m', transaction_date)
            ORDER BY month_num
        """
        
        historical = await execute_query_async(historical_query)
        
        # Get scheduled receivables (open invoices with due dates)
        if include_scheduled:
            scheduled_receivables_query = """
                SELECT 
                    strftime('%Y-%m', due_date) as due_month,
                    SUM(total_amount - paid_amount) as expected_inflow,
                    COUNT(*) as invoice_count
                FROM Invoices
                WHERE type = 'Attiva'
                  AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND due_date IS NOT NULL
                  AND due_date <= date('now', '+{months_ahead} months')
                  AND (total_amount - paid_amount) > 0
                GROUP BY strftime('%Y-%m', due_date)
                ORDER BY due_month
            """.format(months_ahead=months_ahead)
            
            scheduled_payables_query = """
                SELECT 
                    strftime('%Y-%m', due_date) as due_month,
                    SUM(total_amount - paid_amount) as expected_outflow,
                    COUNT(*) as invoice_count
                FROM Invoices
                WHERE type = 'Passiva'
                  AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND due_date IS NOT NULL
                  AND due_date <= date('now', '+{months_ahead} months')
                  AND (total_amount - paid_amount) > 0
                GROUP BY strftime('%Y-%m', due_date)
                ORDER BY due_month
            """.format(months_ahead=months_ahead)
            
            scheduled_receivables = await execute_query_async(scheduled_receivables_query)
            scheduled_payables = await execute_query_async(scheduled_payables_query)
        else:
            scheduled_receivables = []
            scheduled_payables = []
        
        # Generate forecast
        forecast = []
        current_date = datetime.now()
        
        for i in range(months_ahead):
            forecast_date = current_date + timedelta(days=30 * i)
            month_num = forecast_date.strftime('%m')
            year_month = forecast_date.strftime('%Y-%m')
            
            # Find historical pattern for this month
            historical_pattern = next(
                (h for h in historical if h['month_num'] == month_num), 
                {'avg_inflow': 0, 'avg_outflow': 0, 'avg_net': 0}
            )
            
            # Find scheduled amounts for this month
            scheduled_in = next(
                (s['expected_inflow'] for s in scheduled_receivables if s['due_month'] == year_month),
                0
            )
            scheduled_out = next(
                (s['expected_outflow'] for s in scheduled_payables if s['due_month'] == year_month),
                0
            )
            
            # Combine historical and scheduled
            forecast_inflow = (historical_pattern['avg_inflow'] or 0) + scheduled_in
            forecast_outflow = (historical_pattern['avg_outflow'] or 0) + scheduled_out
            forecast_net = forecast_inflow - forecast_outflow
            
            forecast.append({
                'month': year_month,
                'forecasted_inflow': forecast_inflow,
                'forecasted_outflow': forecast_outflow,
                'forecasted_net': forecast_net,
                'scheduled_receivables': scheduled_in,
                'scheduled_payables': scheduled_out,
                'historical_avg_inflow': historical_pattern['avg_inflow'] or 0,
                'historical_avg_outflow': historical_pattern['avg_outflow'] or 0
            })
        
        return APIResponse(
            success=True,
            message=f"Cash flow forecast for {months_ahead} months",
            data={
                'forecast': forecast,
                'historical_patterns': historical,
                'methodology': 'Historical averages + scheduled payments'
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting cash flow forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating cash flow forecast")


@router.get("/comparison/year-over-year")
async def get_year_over_year_comparison(
    metric: str = Query("revenue", description="Metric to compare: revenue, profit, volume"),
    current_year: Optional[int] = Query(None, description="Current year (default: current year)")
):
    """Get year-over-year comparison analysis"""
    try:
        if current_year is None:
            current_year = datetime.now().year
        
        previous_year = current_year - 1
        
        if metric == "revenue":
            comparison_query = """
                SELECT 
                    strftime('%m', doc_date) as month,
                    CAST(strftime('%Y', doc_date) AS INTEGER) as year,
                    type,
                    SUM(total_amount) as total_amount,
                    COUNT(*) as invoice_count,
                    AVG(total_amount) as avg_invoice_amount
                FROM Invoices
                WHERE CAST(strftime('%Y', doc_date) AS INTEGER) IN (?, ?)
                GROUP BY strftime('%m', doc_date), CAST(strftime('%Y', doc_date) AS INTEGER), type
                ORDER BY month, year, type
            """
            
            comparison = await execute_query_async(comparison_query, (previous_year, current_year))
            
        elif metric == "profit":
            # Simplified profit calculation (revenue - costs)
            comparison_query = """
                SELECT 
                    strftime('%m', doc_date) as month,
                    CAST(strftime('%Y', doc_date) AS INTEGER) as year,
                    SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) as revenue,
                    SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END) as costs,
                    (SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) - 
                     SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END)) as profit
                FROM Invoices
                WHERE CAST(strftime('%Y', doc_date) AS INTEGER) IN (?, ?)
                GROUP BY strftime('%m', doc_date), CAST(strftime('%Y', doc_date) AS INTEGER)
                ORDER BY month, year
            """
            
            comparison = await execute_query_async(comparison_query, (previous_year, current_year))
            
        elif metric == "volume":
            comparison_query = """
                SELECT 
                    strftime('%m', doc_date) as month,
                    CAST(strftime('%Y', doc_date) AS INTEGER) as year,
                    type,
                    COUNT(*) as invoice_count,
                    COUNT(DISTINCT anagraphics_id) as unique_clients
                FROM Invoices
                WHERE CAST(strftime('%Y', doc_date) AS INTEGER) IN (?, ?)
                GROUP BY strftime('%m', doc_date), CAST(strftime('%Y', doc_date) AS INTEGER), type
                ORDER BY month, year, type
            """
            
            comparison = await execute_query_async(comparison_query, (previous_year, current_year))
        
        # Calculate percentage changes
        comparison_with_changes = []
        current_year_data = [c for c in comparison if c['year'] == current_year]
        previous_year_data = [c for c in comparison if c['year'] == previous_year]
        
        for current in current_year_data:
            # Find corresponding previous year data
            previous = next(
                (p for p in previous_year_data 
                 if p['month'] == current['month'] and 
                    (p.get('type') == current.get('type') if 'type' in current else True)),
                None
            )
            
            if previous:
                # Calculate changes for numeric fields
                changes = {}
                for key in current:
                    if key not in ['month', 'year', 'type'] and isinstance(current[key], (int, float)):
                        prev_val = previous.get(key, 0) or 0
                        curr_val = current[key] or 0
                        if prev_val != 0:
                            changes[f'{key}_change_pct'] = ((curr_val - prev_val) / prev_val) * 100
                        else:
                            changes[f'{key}_change_pct'] = 0 if curr_val == 0 else 100
                        changes[f'{key}_change_abs'] = curr_val - prev_val
                
                comparison_with_changes.append({
                    **current,
                    'previous_year_data': previous,
                    'changes': changes
                })
            else:
                comparison_with_changes.append({
                    **current,
                    'previous_year_data': None,
                    'changes': {'note': 'No previous year data available'}
                })
        
        return APIResponse(
            success=True,
            message=f"Year-over-year {metric} comparison: {previous_year} vs {current_year}",
            data={
                'metric': metric,
                'current_year': current_year,
                'previous_year': previous_year,
                'comparison': comparison_with_changes,
                'raw_data': comparison
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting year-over-year comparison: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating year-over-year comparison")


@router.get("/segmentation/clients")
async def get_client_segmentation(
    segmentation_type: str = Query("revenue", description="Segmentation type: revenue, frequency, recency"),
    period_months: int = Query(12, ge=1, le=60, description="Analysis period in months")
):
    """Get client segmentation analysis"""
    try:
        if segmentation_type == "revenue":
            # RFM-style revenue segmentation
            segmentation_query = """
                WITH client_metrics AS (
                    SELECT 
                        a.id,
                        a.denomination,
                        COUNT(i.id) as invoice_count,
                        SUM(i.total_amount) as total_revenue,
                        AVG(i.total_amount) as avg_order_value,
                        MAX(i.doc_date) as last_order_date,
                        MIN(i.doc_date) as first_order_date
                    FROM Anagraphics a
                    JOIN Invoices i ON a.id = i.anagraphics_id
                    WHERE a.type = 'Cliente'
                      AND i.type = 'Attiva'
                      AND i.doc_date >= date('now', '-{period_months} months')
                    GROUP BY a.id, a.denomination
                ),
                revenue_quartiles AS (
                    SELECT 
                        *,
                        NTILE(4) OVER (ORDER BY total_revenue) as revenue_quartile
                    FROM client_metrics
                )
                SELECT 
                    revenue_quartile,
                    CASE 
                        WHEN revenue_quartile = 4 THEN 'High Value'
                        WHEN revenue_quartile = 3 THEN 'Medium-High Value'
                        WHEN revenue_quartile = 2 THEN 'Medium Value'
                        ELSE 'Low Value'
                    END as segment_name,
                    COUNT(*) as client_count,
                    SUM(total_revenue) as segment_revenue,
                    AVG(total_revenue) as avg_revenue_per_client,
                    AVG(invoice_count) as avg_orders_per_client,
                    AVG(avg_order_value) as avg_order_value
                FROM revenue_quartiles
                GROUP BY revenue_quartile
                ORDER BY revenue_quartile DESC
            """.format(period_months=period_months)
            
        elif segmentation_type == "frequency":
            segmentation_query = """
                WITH client_frequency AS (
                    SELECT 
                        a.id,
                        a.denomination,
                        COUNT(i.id) as order_frequency,
                        SUM(i.total_amount) as total_revenue
                    FROM Anagraphics a
                    JOIN Invoices i ON a.id = i.anagraphics_id
                    WHERE a.type = 'Cliente'
                      AND i.type = 'Attiva'
                      AND i.doc_date >= date('now', '-{period_months} months')
                    GROUP BY a.id, a.denomination
                )
                SELECT 
                    CASE 
                        WHEN order_frequency >= 10 THEN 'Very Frequent (10+)'
                        WHEN order_frequency >= 5 THEN 'Frequent (5-9)'
                        WHEN order_frequency >= 2 THEN 'Regular (2-4)'
                        ELSE 'Occasional (1)'
                    END as segment_name,
                    COUNT(*) as client_count,
                    SUM(total_revenue) as segment_revenue,
                    AVG(total_revenue) as avg_revenue_per_client,
                    AVG(order_frequency) as avg_order_frequency
                FROM client_frequency
                GROUP BY 
                    CASE 
                        WHEN order_frequency >= 10 THEN 'Very Frequent (10+)'
                        WHEN order_frequency >= 5 THEN 'Frequent (5-9)'
                        WHEN order_frequency >= 2 THEN 'Regular (2-4)'
                        ELSE 'Occasional (1)'
                    END
                ORDER BY avg_order_frequency DESC
            """.format(period_months=period_months)
            
        elif segmentation_type == "recency":
            segmentation_query = """
                WITH client_recency AS (
                    SELECT 
                        a.id,
                        a.denomination,
                        MAX(i.doc_date) as last_order_date,
                        julianday('now') - julianday(MAX(i.doc_date)) as days_since_last_order,
                        COUNT(i.id) as total_orders,
                        SUM(i.total_amount) as total_revenue
                    FROM Anagraphics a
                    JOIN Invoices i ON a.id = i.anagraphics_id
                    WHERE a.type = 'Cliente'
                      AND i.type = 'Attiva'
                    GROUP BY a.id, a.denomination
                )
                SELECT 
                    CASE 
                        WHEN days_since_last_order <= 30 THEN 'Active (≤30 days)'
                        WHEN days_since_last_order <= 90 THEN 'Recent (31-90 days)'
                        WHEN days_since_last_order <= 180 THEN 'Lapsed (91-180 days)'
                        WHEN days_since_last_order <= 365 THEN 'At Risk (181-365 days)'
                        ELSE 'Lost (>365 days)'
                    END as segment_name,
                    COUNT(*) as client_count,
                    SUM(total_revenue) as segment_revenue,
                    AVG(total_revenue) as avg_revenue_per_client,
                    AVG(days_since_last_order) as avg_days_since_last_order
                FROM client_recency
                GROUP BY 
                    CASE 
                        WHEN days_since_last_order <= 30 THEN 'Active (≤30 days)'
                        WHEN days_since_last_order <= 90 THEN 'Recent (31-90 days)'
                        WHEN days_since_last_order <= 180 THEN 'Lapsed (91-180 days)'
                        WHEN days_since_last_order <= 365 THEN 'At Risk (181-365 days)'
                        ELSE 'Lost (>365 days)'
                    END
                ORDER BY avg_days_since_last_order
            """
        
        segmentation = await execute_query_async(segmentation_query)
        
        return APIResponse(
            success=True,
            message=f"Client segmentation by {segmentation_type}",
            data={
                'segmentation_type': segmentation_type,
                'period_months': period_months,
                'segments': segmentation
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting client segmentation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating client segmentation")


@router.get("/export/report")
async def export_analytics_report(
    report_type: str = Query("dashboard", description="Report type: dashboard, financial, operational"),
    format: str = Query("json", description="Export format: json, csv"),
    period_months: int = Query(12, ge=1, le=60, description="Analysis period")
):
    """Export comprehensive analytics report"""
    try:
        report_data = {}
        
        if report_type == "dashboard":
            # Get dashboard data
            from app.core.analysis import calculate_main_kpis
            
            report_data['kpis'] = calculate_main_kpis()
            report_data['generated_at'] = datetime.now().isoformat()
            report_data['period_months'] = period_months
            
        elif report_type == "financial":
            # Financial report with revenue, costs, profit
            financial_query = """
                SELECT 
                    strftime('%Y-%m', doc_date) as month,
                    type,
                    COUNT(*) as invoice_count,
                    SUM(total_amount) as total_amount,
                    SUM(paid_amount) as paid_amount,
                    SUM(total_amount - paid_amount) as outstanding_amount
                FROM Invoices
                WHERE doc_date >= date('now', '-{period_months} months')
                GROUP BY strftime('%Y-%m', doc_date), type
                ORDER BY month, type
            """.format(period_months=period_months)
            
            financial_data = await execute_query_async(financial_query)
            report_data['financial_summary'] = financial_data
            
        elif report_type == "operational":
            # Operational metrics
            operational_query = """
                SELECT 
                    'invoices' as metric_type,
                    payment_status as status,
                    COUNT(*) as count,
                    SUM(total_amount) as total_amount
                FROM Invoices
                WHERE doc_date >= date('now', '-{period_months} months')
                GROUP BY payment_status
                
                UNION ALL
                
                SELECT 
                    'transactions' as metric_type,
                    reconciliation_status as status,
                    COUNT(*) as count,
                    SUM(ABS(amount)) as total_amount
                FROM BankTransactions
                WHERE transaction_date >= date('now', '-{period_months} months')
                GROUP BY reconciliation_status
            """.format(period_months=period_months)
            
            operational_data = await execute_query_async(operational_query)
            report_data['operational_metrics'] = operational_data
        
        # Add metadata
        report_data['metadata'] = {
            'report_type': report_type,
            'generated_at': datetime.now().isoformat(),
            'period_months': period_months,
            'format': format
        }
        
        if format == "csv":
            # Convert to CSV format (simplified)
            import io
            import csv
            
            output = io.StringIO()
            if report_data:
                # Flatten the data for CSV
                flattened_data = []
                for key, value in report_data.items():
                    if isinstance(value, list):
                        for item in value:
                            flattened_item = {'section': key}
                            flattened_item.update(item)
                            flattened_data.append(flattened_item)
                
                if flattened_data:
                    writer = csv.DictWriter(output, fieldnames=flattened_data[0].keys())
                    writer.writeheader()
                    writer.writerows(flattened_data)
            
            csv_content = output.getvalue()
            output.close()
            
            return APIResponse(
                success=True,
                message=f"{report_type.title()} report exported as CSV",
                data={
                    'format': 'csv',
                    'content': csv_content,
                    'filename': f"analytics_report_{report_type}_{datetime.now().strftime('%Y%m%d')}.csv"
                }
            )
        else:
            return APIResponse(
                success=True,
                message=f"{report_type.title()} report exported as JSON",
                data=report_data
            )
        
    except Exception as e:
        logger.error(f"Error exporting analytics report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting analytics report")