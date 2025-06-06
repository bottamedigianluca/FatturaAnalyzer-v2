"""
Analytics API COMPLETA
Espone TUTTE le funzionalità di analisi del core tramite l'adapter completo
"""

import logging
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import JSONResponse

# Uso dell'adapter COMPLETO
from app.adapters.analytics_adapter import analytics_adapter
from app.adapters.database_adapter import db_adapter
from app.models import APIResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# ===== ENDPOINT BASE GIÀ CORRETTI =====

@router.get("/dashboard")
async def get_dashboard_data():
    """Dashboard base migliorata"""
    try:
        dashboard_data = await analytics_adapter.get_dashboard_data_async()
        
        recent_invoices_query = """
            SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount,
                   i.payment_status, i.due_date, a.denomination as counterparty_name,
                   (i.total_amount - i.paid_amount) as open_amount
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            ORDER BY i.created_at DESC
            LIMIT 10
        """
        
        recent_transactions_query = """
            SELECT id, transaction_date, amount, description, reconciliation_status,
                   (amount - reconciled_amount) as remaining_amount
            FROM BankTransactions
            WHERE reconciliation_status != 'Ignorato'
            ORDER BY transaction_date DESC, id DESC
            LIMIT 10
        """
        
        recent_invoices = await db_adapter.execute_query_async(recent_invoices_query)
        recent_transactions = await db_adapter.execute_query_async(recent_transactions_query)
        
        dashboard_data.update({
            'recent_invoices': recent_invoices,
            'recent_transactions': recent_transactions
        })
        
        return APIResponse(
            success=True,
            message="Dashboard data retrieved successfully",
            data=dashboard_data
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving dashboard data")

@router.get("/kpis")
async def get_kpis():
    """KPI avanzati"""
    try:
        kpis = await analytics_adapter.get_dashboard_kpis_async()
        return APIResponse(
            success=True,
            message="Advanced KPIs calculated successfully",
            data=kpis
        )
        
    except Exception as e:
        logger.error(f"Error getting KPIs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error calculating KPIs")

# ===== I NUOVI ENDPOINT - IL TESORO FINALMENTE ESPOSTO! =====

@router.get("/profitability/monthly")
async def get_monthly_profitability(
    start_date: Optional[str] = Query(None, description="Data inizio (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data fine (YYYY-MM-DD)")
):
    """🔥 NUOVO: Analisi margini di profitto mensili"""
    try:
        profitability_df = await analytics_adapter.get_monthly_revenue_costs_async(start_date, end_date)
        profitability_data = profitability_df.to_dict('records') if not profitability_df.empty else []
        
        return APIResponse(
            success=True,
            message="Monthly profitability analysis completed",
            data=profitability_data
        )
        
    except Exception as e:
        logger.error(f"Error getting monthly profitability: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving profitability analysis")

@router.get("/seasonality/products")
async def get_product_seasonality(
    product_category: str = Query("all", description="Categoria: all, frutta, verdura"),
    years_back: int = Query(3, ge=1, le=10, description="Anni di storico da analizzare")
):
    """🔥 NUOVO: Analisi stagionalità prodotti - ORO per frutta/verdura!"""
    try:
        seasonal_df = await analytics_adapter.get_seasonal_product_analysis_async(product_category, years_back)
        seasonal_data = seasonal_df.to_dict('records') if not seasonal_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Seasonal analysis for {product_category} products completed",
            data={
                'category': product_category,
                'years_analyzed': years_back,
                'seasonal_patterns': seasonal_data
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting product seasonality: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving seasonal analysis")

@router.get("/clients/performance")
async def get_clients_performance(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine"),
    limit: int = Query(20, ge=1, le=100, description="Numero clienti")
):
    """🔥 NUOVO: Analisi performance clienti AVANZATA con segmentazione"""
    try:
        performance_df = await analytics_adapter.get_top_clients_performance_async(start_date, end_date, limit)
        performance_data = performance_df.to_dict('records') if not performance_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Advanced client performance analysis for {len(performance_data)} clients",
            data=performance_data
        )
        
    except Exception as e:
        logger.error(f"Error getting client performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving client performance")

@router.get("/suppliers/analysis")
async def get_supplier_analysis(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Analisi fornitori con reliability score"""
    try:
        suppliers_df = await analytics_adapter.get_supplier_analysis_async(start_date, end_date)
        suppliers_data = suppliers_df.to_dict('records') if not suppliers_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Supplier analysis completed for {len(suppliers_data)} suppliers",
            data=suppliers_data
        )
        
    except Exception as e:
        logger.error(f"Error getting supplier analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving supplier analysis")

@router.get("/waste/analysis")
async def get_waste_analysis(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Analisi scarti e deterioramento - CRITICA per prodotti freschi!"""
    try:
        waste_data = await analytics_adapter.get_waste_and_spoilage_analysis_async(start_date, end_date)
        
        return APIResponse(
            success=True,
            message="Waste and spoilage analysis completed",
            data=waste_data
        )
        
    except Exception as e:
        logger.error(f"Error getting waste analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving waste analysis")

@router.get("/inventory/turnover")
async def get_inventory_turnover(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Analisi rotazione inventario per prodotti deperibili"""
    try:
        turnover_df = await analytics_adapter.get_inventory_turnover_analysis_async(start_date, end_date)
        turnover_data = turnover_df.to_dict('records') if not turnover_df.empty else []
        
        return APIResponse(
            success=True,
            message="Inventory turnover analysis completed",
            data=turnover_data
        )
        
    except Exception as e:
        logger.error(f"Error getting inventory turnover: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving inventory turnover")

@router.get("/pricing/trends")
async def get_price_trends(
    product_name: Optional[str] = Query(None, description="Nome prodotto specifico"),
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Analisi trend prezzi con volatilità"""
    try:
        price_data = await analytics_adapter.get_price_trend_analysis_async(product_name, start_date, end_date)
        
        return APIResponse(
            success=True,
            message=f"Price trend analysis completed{' for ' + product_name if product_name else ''}",
            data=price_data
        )
        
    except Exception as e:
        logger.error(f"Error getting price trends: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving price trends")

@router.get("/market-basket/analysis")
async def get_market_basket(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine"),
    min_support: float = Query(0.01, ge=0.001, le=0.5, description="Supporto minimo")
):
    """🔥 NUOVO: Market basket analysis per cross-selling"""
    try:
        basket_data = await analytics_adapter.get_market_basket_analysis_async(start_date, end_date, min_support)
        
        return APIResponse(
            success=True,
            message="Market basket analysis completed",
            data=basket_data
        )
        
    except Exception as e:
        logger.error(f"Error getting market basket analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving market basket analysis")

@router.get("/customers/rfm")
async def get_customer_rfm(
    analysis_date: Optional[str] = Query(None, description="Data di riferimento per l'analisi (YYYY-MM-DD)")
):
    """🔥 NUOVO: Segmentazione RFM avanzata (Champions, At Risk, etc.)"""
    try:
        rfm_data = await analytics_adapter.get_customer_rfm_analysis_async(analysis_date)
        
        return APIResponse(
            success=True,
            message="RFM customer segmentation completed",
            data=rfm_data
        )
        
    except Exception as e:
        logger.error(f"Error getting RFM analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving RFM analysis")

@router.get("/customers/churn-risk")
async def get_churn_risk():
    """🔥 NUOVO: Analisi rischio abbandono clienti con azioni suggerite"""
    try:
        churn_df = await analytics_adapter.get_customer_churn_analysis_async()
        churn_data = churn_df.to_dict('records') if not churn_df.empty else []
        
        # Raggruppa per categoria di rischio
        risk_summary = {}
        for customer in churn_data:
            risk_cat = customer.get('risk_category', 'Unknown')
            if risk_cat not in risk_summary:
                risk_summary[risk_cat] = 0
            risk_summary[risk_cat] += 1
        
        return APIResponse(
            success=True,
            message="Customer churn risk analysis completed",
            data={
                'customers': churn_data,
                'risk_summary': risk_summary,
                'total_analyzed': len(churn_data)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting churn analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving churn analysis")

@router.get("/payments/behavior")
async def get_payment_behavior():
    """🔥 NUOVO: Analisi comportamentale pagamenti"""
    try:
        behavior_data = await analytics_adapter.get_payment_behavior_analysis_async()
        
        return APIResponse(
            success=True,
            message="Payment behavior analysis completed",
            data=behavior_data
        )
        
    except Exception as e:
        logger.error(f"Error getting payment behavior: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving payment behavior")

@router.get("/competitive/analysis")
async def get_competitive_analysis():
    """🔥 NUOVO: Analisi competitiva margini acquisto/vendita"""
    try:
        competitive_df = await analytics_adapter.get_competitive_analysis_async()
        competitive_data = competitive_df.to_dict('records') if not competitive_df.empty else []
        
        return APIResponse(
            success=True,
            message="Competitive analysis completed",
            data=competitive_data
        )
        
    except Exception as e:
        logger.error(f"Error getting competitive analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving competitive analysis")

@router.get("/forecasting/sales")
async def get_sales_forecast(
    product_name: Optional[str] = Query(None, description="Nome prodotto specifico"),
    months_ahead: int = Query(3, ge=1, le=12, description="Mesi da prevedere")
):
    """🔥 NUOVO: Previsioni vendite basate su trend storici"""
    try:
        forecast_df = await analytics_adapter.get_sales_forecast_async(product_name, months_ahead)
        forecast_data = forecast_df.to_dict('records') if not forecast_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Sales forecast completed for {months_ahead} months ahead",
            data={
                'product': product_name,
                'months_ahead': months_ahead,
                'forecast': forecast_data
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting sales forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving sales forecast")

@router.get("/insights/business")
async def get_business_insights(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Insights business con raccomandazioni automatiche"""
    try:
        insights_data = await analytics_adapter.get_business_insights_summary_async(start_date, end_date)
        
        return APIResponse(
            success=True,
            message="Business insights analysis completed",
            data=insights_data
        )
        
    except Exception as e:
        logger.error(f"Error getting business insights: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving business insights")

# ===== DASHBOARD AVANZATE =====

@router.get("/dashboard/executive")
async def get_executive_dashboard():
    """🔥 NUOVO: Dashboard executive con insights automatici"""
    try:
        executive_data = await analytics_adapter.get_executive_dashboard_async()
        
        return APIResponse(
            success=True,
            message="Executive dashboard data retrieved",
            data=executive_data
        )
        
    except Exception as e:
        logger.error(f"Error getting executive dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving executive dashboard")

@router.get("/dashboard/operations")
async def get_operations_dashboard():
    """🔥 NUOVO: Dashboard operativa per gestione quotidiana"""
    try:
        operations_data = await analytics_adapter.get_operations_dashboard_async()
        
        return APIResponse(
            success=True,
            message="Operations dashboard data retrieved",
            data=operations_data
        )
        
    except Exception as e:
        logger.error(f"Error getting operations dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving operations dashboard")

# ===== FUNZIONI DI SUPPORTO ESPOSTE =====

@router.get("/commissions/summary")
async def get_commission_summary(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """Sommario commissioni bancarie"""
    try:
        commission_df = await analytics_adapter.get_commission_summary_async(start_date, end_date)
        commission_data = commission_df.to_dict('records') if not commission_df.empty else []
        
        return APIResponse(
            success=True,
            message="Commission summary completed",
            data=commission_data
        )
        
    except Exception as e:
        logger.error(f"Error getting commission summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving commission summary")

@router.get("/clients/by-score")
async def get_clients_by_score(
    order: str = Query("DESC", description="Ordine: ASC o DESC"),
    limit: int = Query(20, ge=1, le=100, description="Numero clienti")
):
    """Clienti ordinati per score"""
    try:
        clients_df = await analytics_adapter.get_clients_by_score_async(order, limit)
        clients_data = clients_df.to_dict('records') if not clients_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Clients by score retrieved ({order} order)",
            data=clients_data
        )
        
    except Exception as e:
        logger.error(f"Error getting clients by score: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving clients by score")

@router.get("/products/{normalized_description}/monthly-sales")
async def get_product_monthly_sales(
    normalized_description: str = Path(..., description="Descrizione normalizzata del prodotto"),
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """Vendite mensili prodotto specifico"""
    try:
        sales_df = await analytics_adapter.get_product_monthly_sales_async(
            normalized_description, start_date, end_date
        )
        sales_data = sales_df.to_dict('records') if not sales_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Monthly sales for '{normalized_description}' retrieved",
            data={
                'product': normalized_description,
                'monthly_sales': sales_data
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting product monthly sales: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving product monthly sales")

@router.get("/products/{normalized_description}/comparison")
async def get_product_comparison(
    normalized_description: str = Path(..., description="Descrizione normalizzata del prodotto"),
    year1: int = Query(..., description="Primo anno da confrontare"),
    year2: int = Query(..., description="Secondo anno da confrontare")
):
    """Confronto vendite prodotto tra due anni"""
    try:
        comparison_df = await analytics_adapter.get_product_sales_comparison_async(
            normalized_description, year1, year2
        )
        comparison_data = comparison_df.to_dict('records') if not comparison_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Sales comparison for '{normalized_description}' ({year1} vs {year2})",
            data={
                'product': normalized_description,
                'year1': year1,
                'year2': year2,
                'comparison': comparison_data
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting product comparison: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving product comparison")

@router.get("/suppliers/top-by-cost")
async def get_top_suppliers(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine"),
    limit: int = Query(20, ge=1, le=100, description="Numero fornitori")
):
    """Top fornitori per costo"""
    try:
        suppliers_df = await analytics_adapter.get_top_suppliers_by_cost_async(start_date, end_date, limit)
        suppliers_data = suppliers_df.to_dict('records') if not suppliers_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Top {len(suppliers_data)} suppliers by cost",
            data=suppliers_data
        )
        
    except Exception as e:
        logger.error(f"Error getting top suppliers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving top suppliers")

@router.get("/calendar/due-dates/{year}/{month}")
async def get_due_dates_calendar(
    year: int = Path(..., description="Anno"),
    month: int = Path(..., ge=1, le=12, description="Mese")
):
    """Date con scadenze nel mese per calendario"""
    try:
        due_dates = await analytics_adapter.get_due_dates_in_month_async(year, month)
        
        # Converti le date in stringhe per JSON
        due_dates_str = [d.isoformat() for d in due_dates]
        
        return APIResponse(
            success=True,
            message=f"Due dates for {year}-{month:02d} retrieved",
            data={
                'year': year,
                'month': month,
                'due_dates': due_dates_str,
                'count': len(due_dates)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting due dates calendar: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving due dates calendar")

@router.get("/invoices/due-on/{due_date}")
async def get_invoices_due_on_date(
    due_date: str = Path(..., description="Data scadenza (YYYY-MM-DD)")
):
    """Fatture in scadenza in data specifica"""
    try:
        from datetime import datetime
        due_date_obj = datetime.strptime(due_date, "%Y-%m-%d").date()
        
        invoices_df = await analytics_adapter.get_invoices_due_on_date_async(due_date_obj)
        invoices_data = invoices_df.to_dict('records') if not invoices_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Invoices due on {due_date} retrieved",
            data={
                'due_date': due_date,
                'invoices': invoices_data,
                'count': len(invoices_data)
            }
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Error getting invoices due on date: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving invoices due on date")

# ===== ENDPOINT ORIGINALI MANTENUTI E MIGLIORATI =====

@router.get("/cash-flow/monthly")
async def get_monthly_cash_flow(
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze")
):
    """Get monthly cash flow analysis using adapter"""
    try:
        cash_flow_df = await analytics_adapter.get_monthly_cash_flow_analysis_async(months)
        cash_flow_data = cash_flow_df.to_dict('records') if not cash_flow_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Cash flow data for {months} months",
            data=cash_flow_data
        )
        
    except Exception as e:
        logger.error(f"Error getting monthly cash flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving cash flow data")

@router.get("/cash-flow/advanced")
async def get_advanced_cash_flow(
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """🔥 NUOVO: Cash flow AVANZATO con categorizzazione business"""
    try:
        advanced_cf_df = await analytics_adapter.get_advanced_cashflow_analysis_async(start_date, end_date)
        advanced_cf_data = advanced_cf_df.to_dict('records') if not advanced_cf_df.empty else []
        
        return APIResponse(
            success=True,
            message="Advanced cash flow analysis completed",
            data=advanced_cf_data
        )
        
    except Exception as e:
        logger.error(f"Error getting advanced cash flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving advanced cash flow")

@router.get("/revenue/monthly")
async def get_monthly_revenue(
    months: int = Query(12, ge=1, le=60, description="Number of months to analyze"),
    invoice_type: Optional[str] = Query(None, description="Filter by invoice type: Attiva or Passiva")
):
    """Get monthly revenue analysis using adapter"""
    try:
        revenue_df = await analytics_adapter.get_monthly_revenue_analysis_async(months, invoice_type)
        revenue_data = revenue_df.to_dict('records') if not revenue_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Revenue data for {months} months",
            data=revenue_data
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
    """Get top clients by revenue using adapter"""
    try:
        clients_df = await analytics_adapter.get_top_clients_by_revenue_async(limit, period_months, min_revenue)
        clients_data = clients_df.to_dict('records') if not clients_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Top {len(clients_data)} clients by revenue",
            data=clients_data
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
    """Get product analysis using adapter"""
    try:
        products_df = await analytics_adapter.get_product_analysis_async(
            limit, period_months, min_quantity, invoice_type
        )
        products_data = products_df.to_dict('records') if not products_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Product analysis for {len(products_data)} items",
            data=products_data
        )
        
    except Exception as e:
        logger.error(f"Error getting product analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving product analysis")

@router.get("/aging/invoices")
async def get_invoices_aging(
    invoice_type: str = Query("Attiva", description="Invoice type: Attiva or Passiva")
):
    """Get aging analysis for invoices using adapter"""
    try:
        aging_data = await analytics_adapter.get_aging_summary_async(invoice_type)
        
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
    """Get overdue invoices using adapter"""
    try:
        overdue_df = await analytics_adapter.get_top_overdue_invoices_async(limit, priority_sort)
        overdue_data = overdue_df.to_dict('records') if not overdue_df.empty else []
        
        return APIResponse(
            success=True,
            message=f"Found {len(overdue_data)} overdue invoices",
            data=overdue_data
        )
        
    except Exception as e:
        logger.error(f"Error getting overdue invoices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving overdue invoices")

@router.get("/trends/revenue")
async def get_revenue_trends(
    period: str = Query("monthly", description="Period: daily, weekly, monthly, quarterly"),
    months_back: int = Query(12, ge=1, le=60, description="Months to look back")
):
    """Get revenue trends analysis using adapter"""
    try:
        trends = await analytics_adapter.get_revenue_trends_async(period, months_back)
        
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
        performance_data = await analytics_adapter.get_payment_performance_async()
        
        return APIResponse(
            success=True,
            message="Payment performance metrics retrieved",
            data=performance_data
        )
        
    except Exception as e:
        logger.error(f"Error getting payment performance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving payment performance")

@router.get("/forecasting/cash-flow")
async def get_cash_flow_forecast(
    months_ahead: int = Query(6, ge=1, le=24, description="Months to forecast ahead"),
    include_scheduled: bool = Query(True, description="Include scheduled payments from due dates")
):
    """Get cash flow forecasting"""
    try:
        forecast_data = await analytics_adapter.get_cash_flow_forecast_async(
            months_ahead, include_scheduled
        )
        
        return APIResponse(
            success=True,
            message=f"Cash flow forecast for {months_ahead} months",
            data=forecast_data
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
        comparison_data = await analytics_adapter.get_year_over_year_comparison_async(
            metric, current_year
        )
        
        return APIResponse(
            success=True,
            message=f"Year-over-year {metric} comparison",
            data=comparison_data
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
        segmentation_data = await analytics_adapter.get_client_segmentation_async(
            segmentation_type, period_months
        )
        
        return APIResponse(
            success=True,
            message=f"Client segmentation by {segmentation_type}",
            data={
                'segmentation_type': segmentation_type,
                'period_months': period_months,
                'segments': segmentation_data
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting client segmentation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating client segmentation")

@router.get("/clients/scores/update")
async def update_client_scores():
    """Update client scores using adapter"""
    try:
        success = await analytics_adapter.calculate_and_update_client_scores_async()
        
        return APIResponse(
            success=success,
            message="Client scores updated successfully" if success else "Failed to update client scores",
            data={"updated": success}
        )
        
    except Exception as e:
        logger.error(f"Error updating client scores: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating client scores")

@router.get("/clients/{anagraphics_id}/financial-summary")
async def get_client_financial_summary(anagraphics_id: int):
    """Get financial summary for specific client"""
    try:
        summary = await analytics_adapter.get_anagraphic_financial_summary_async(anagraphics_id)
        
        return APIResponse(
            success=True,
            message=f"Financial summary for client {anagraphics_id}",
            data=summary
        )
        
    except Exception as e:
        logger.error(f"Error getting client financial summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving client financial summary")

# ===== FUNZIONI DI EXPORT =====

@router.get("/export/analysis")
async def export_analysis(
    analysis_type: str = Query(..., description="Tipo di analisi da esportare"),
    format: str = Query("excel", description="Formato: excel, csv"),
    start_date: Optional[str] = Query(None, description="Data inizio"),
    end_date: Optional[str] = Query(None, description="Data fine")
):
    """Esporta analisi in formato Excel/CSV"""
    try:
        # Raccoglie i dati basati sul tipo di analisi
        data_to_export = {}
        
        if analysis_type == "seasonal":
            seasonal_df = await analytics_adapter.get_seasonal_product_analysis_async()
            data_to_export['seasonal_analysis'] = seasonal_df
            
        elif analysis_type == "profitability":
            profit_df = await analytics_adapter.get_monthly_revenue_costs_async(start_date, end_date)
            data_to_export['profitability'] = profit_df
            
        elif analysis_type == "customers":
            clients_df = await analytics_adapter.get_top_clients_performance_async(start_date, end_date)
            rfm_data = await analytics_adapter.get_customer_rfm_analysis_async()
            churn_df = await analytics_adapter.get_customer_churn_analysis_async()
            data_to_export = {
                'top_clients': clients_df,
                'rfm_analysis': rfm_data.get('rfm_data', pd.DataFrame()),
                'churn_risk': churn_df
            }
            
        elif analysis_type == "operations":
            waste_data = await analytics_adapter.get_waste_and_spoilage_analysis_async(start_date, end_date)
            inventory_df = await analytics_adapter.get_inventory_turnover_analysis_async(start_date, end_date)
            suppliers_df = await analytics_adapter.get_supplier_analysis_async(start_date, end_date)
            data_to_export = {
                'waste_analysis': waste_data.get('monthly_waste', pd.DataFrame()),
                'inventory_turnover': inventory_df,
                'suppliers': suppliers_df
            }
            
        else:
            raise HTTPException(status_code=400, detail=f"Analysis type '{analysis_type}' not supported")
        
        # Esporta in formato richiesto
        if format.lower() == "excel":
            filename = await analytics_adapter.export_analysis_to_excel_async(
                analysis_type, data_to_export
            )
            
            return APIResponse(
                success=True,
                message=f"Analysis exported successfully",
                data={
                    'filename': filename,
                    'format': 'excel',
                    'analysis_type': analysis_type
                }
            )
        else:
            # Per CSV, ritorna i dati che il frontend può convertire
            return APIResponse(
                success=True,
                message=f"Analysis data prepared for CSV export",
                data={
                    'analysis_type': analysis_type,
                    'format': 'csv',
                    'data': data_to_export
                }
            )
        
    except Exception as e:
        logger.error(f"Error exporting analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting analysis")

# ===== ENDPOINT DI RIEPILOGO =====

@router.get("/")
async def list_analytics_endpoints():
    """Lista di tutti gli endpoint analytics disponibili"""
    endpoints = {
        "basic": {
            "dashboard": "Dashboard base",
            "kpis": "KPI principali",
            "cash-flow/monthly": "Cash flow mensile",
            "revenue/monthly": "Fatturato mensile",
            "clients/top": "Top clienti",
            "products/analysis": "Analisi prodotti",
            "aging/invoices": "Aging fatture",
            "overdue/invoices": "Fatture scadute"
        },
        "advanced": {
            "profitability/monthly": "🔥 Margini di profitto",
            "seasonality/products": "🔥 Stagionalità prodotti",
            "clients/performance": "🔥 Performance clienti avanzata",
            "suppliers/analysis": "🔥 Analisi fornitori",
            "waste/analysis": "🔥 Analisi scarti",
            "inventory/turnover": "🔥 Rotazione inventario",
            "pricing/trends": "🔥 Trend prezzi",
            "market-basket/analysis": "🔥 Market basket",
            "customers/rfm": "🔥 Segmentazione RFM",
            "customers/churn-risk": "🔥 Rischio abbandono",
            "payments/behavior": "🔥 Comportamento pagamenti",
            "competitive/analysis": "🔥 Analisi competitiva",
            "forecasting/sales": "🔥 Previsioni vendite",
            "insights/business": "🔥 Insights automatici"
        },
        "dashboards": {
            "dashboard/executive": "🔥 Dashboard executive",
            "dashboard/operations": "🔥 Dashboard operativa",
            "cash-flow/advanced": "🔥 Cash flow avanzato"
        },
        "forecasting": {
            "forecasting/cash-flow": "Previsioni cash flow",
            "comparison/year-over-year": "Confronto anno su anno"
        }
    }
    
    return APIResponse(
        success=True,
        message="Analytics endpoints available",
        data={
            "total_endpoints": sum(len(category) for category in endpoints.values()),
            "new_advanced_features": len(endpoints["advanced"]),
            "endpoints": endpoints,
            "note": "🔥 = Nuove funzionalità ora finalmente esposte!"
        }
    )
