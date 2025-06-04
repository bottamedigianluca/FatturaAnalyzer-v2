"""
Analytics Adapter per FastAPI
Fornisce interfaccia async per il core/analysis.py esistente senza modificarlo
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor
import pandas as pd

# Import del core esistente (INVARIATO)
from app.core.analysis import (
    calculate_main_kpis,
    get_monthly_cash_flow_analysis,
    get_monthly_revenue_analysis,
    get_top_clients_by_revenue,
    get_top_overdue_invoices,
    get_product_analysis,
    get_aging_summary,
    get_anagraphic_financial_summary,
    calculate_and_update_client_scores
)

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=3)  # Più workers per analisi

class AnalyticsAdapter:
    """
    Adapter che fornisce interfaccia async per le funzioni di analisi del core esistente
    """
    
    @staticmethod
    async def calculate_main_kpis_async() -> Dict[str, Any]:
        """Versione async di calculate_main_kpis"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, calculate_main_kpis)
    
    @staticmethod
    async def get_monthly_cash_flow_analysis_async(months: int = 12) -> pd.DataFrame:
        """Versione async di get_monthly_cash_flow_analysis"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool, 
            get_monthly_cash_flow_analysis, 
            months
        )
    
    @staticmethod
    async def get_monthly_revenue_analysis_async(
        months: int = 12, 
        invoice_type: Optional[str] = None
    ) -> pd.DataFrame:
        """Versione async di get_monthly_revenue_analysis"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_monthly_revenue_analysis,
            months,
            invoice_type
        )
    
    @staticmethod
    async def get_top_clients_by_revenue_async(
        limit: int = 20,
        period_months: int = 12,
        min_revenue: Optional[float] = None
    ) -> pd.DataFrame:
        """Versione async di get_top_clients_by_revenue"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_top_clients_by_revenue,
            limit,
            period_months,
            min_revenue
        )
    
    @staticmethod
    async def get_top_overdue_invoices_async(
        limit: int = 20,
        priority_sort: bool = True
    ) -> pd.DataFrame:
        """Versione async di get_top_overdue_invoices"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_top_overdue_invoices,
            limit,
            priority_sort
        )
    
    @staticmethod
    async def get_product_analysis_async(
        limit: int = 50,
        period_months: int = 12,
        min_quantity: Optional[float] = None,
        invoice_type: Optional[str] = None
    ) -> pd.DataFrame:
        """Versione async di get_product_analysis"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_product_analysis,
            limit,
            period_months,
            min_quantity,
            invoice_type
        )
    
    @staticmethod
    async def get_aging_summary_async(invoice_type: str = "Attiva") -> Dict[str, Dict]:
        """Versione async di get_aging_summary"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_aging_summary,
            invoice_type
        )
    
    @staticmethod
    async def get_anagraphic_financial_summary_async(anagraphics_id: int) -> Dict[str, Any]:
        """Versione async di get_anagraphic_financial_summary"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            get_anagraphic_financial_summary,
            anagraphics_id
        )
    
    @staticmethod
    async def calculate_and_update_client_scores_async() -> bool:
        """Versione async di calculate_and_update_client_scores"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            calculate_and_update_client_scores
        )
    
    @staticmethod
    async def get_dashboard_data_async() -> Dict[str, Any]:
        """Ottiene tutti i dati dashboard in una chiamata"""
        def _get_dashboard_data():
            try:
                # Calcola KPI principali
                kpis = calculate_main_kpis()
                
                # Cash flow ultimi 6 mesi
                cash_flow_df = get_monthly_cash_flow_analysis(6)
                cash_flow_summary = cash_flow_df.to_dict('records') if not cash_flow_df.empty else []
                
                # Top clienti
                top_clients_df = get_top_clients_by_revenue(10)
                top_clients = top_clients_df.to_dict('records') if not top_clients_df.empty else []
                
                # Fatture scadute
                overdue_invoices_df = get_top_overdue_invoices(5)
                overdue_invoices = overdue_invoices_df.to_dict('records') if not overdue_invoices_df.empty else []
                
                return {
                    'kpis': kpis,
                    'cash_flow_summary': cash_flow_summary,
                    'top_clients': top_clients,
                    'overdue_invoices': overdue_invoices
                }
                
            except Exception as e:
                logger.error(f"Error getting dashboard data: {e}")
                # Ritorna dati vuoti in caso di errore
                return {
                    'kpis': {},
                    'cash_flow_summary': [],
                    'top_clients': [],
                    'overdue_invoices': []
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_dashboard_data)
    
    @staticmethod
    async def get_revenue_trends_async(
        period: str = "monthly",
        months_back: int = 12
    ) -> List[Dict[str, Any]]:
        """Calcola trend fatturato usando database adapter"""
        from app.adapters.database_adapter import db_adapter
        
        # Formatta date based on period
        if period == "daily":
            date_trunc = "date(doc_date)"
        elif period == "weekly":
            date_trunc = "strftime('%Y-W%W', doc_date)"
        elif period == "quarterly":
            date_trunc = "strftime('%Y', doc_date) || '-Q' || ((CAST(strftime('%m', doc_date) AS INTEGER) - 1) / 3 + 1)"
        else:  # monthly
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
        
        return await db_adapter.execute_query_async(trends_query)
    
    @staticmethod
    async def get_payment_performance_async() -> Dict[str, Any]:
        """Calcola metriche performance pagamenti"""
        from app.adapters.database_adapter import db_adapter
        
        # Performance pagamenti
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
        
        performance = await db_adapter.execute_query_async(payment_performance_query)
        
        # Efficienza incasso
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
        
        collection = await db_adapter.execute_query_async(collection_query)
        
        return {
            'payment_performance': performance,
            'collection_efficiency': collection
        }
    
    @staticmethod
    async def get_client_segmentation_async(
        segmentation_type: str = "revenue",
        period_months: int = 12
    ) -> List[Dict[str, Any]]:
        """Calcola segmentazione clienti"""
        from app.adapters.database_adapter import db_adapter
        
        if segmentation_type == "revenue":
            # Segmentazione RFM per fatturato
            segmentation_query = f"""
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
            """
            
        elif segmentation_type == "frequency":
            segmentation_query = f"""
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
            """
            
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
        else:
            raise ValueError(f"Unsupported segmentation type: {segmentation_type}")
        
        return await db_adapter.execute_query_async(segmentation_query)
    
    @staticmethod
    async def get_cash_flow_forecast_async(
        months_ahead: int = 6,
        include_scheduled: bool = True
    ) -> Dict[str, Any]:
        """Genera forecast cash flow"""
        from app.adapters.database_adapter import db_adapter
        from datetime import datetime, timedelta
        
        # Ottieni pattern storici mensili
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
        
        historical = await db_adapter.execute_query_async(historical_query)
        
        scheduled_receivables = []
        scheduled_payables = []
        
        if include_scheduled:
            # Crediti programmati (fatture aperte con scadenza)
            scheduled_receivables_query = f"""
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
            """
            
            scheduled_payables_query = f"""
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
            """
            
            scheduled_receivables = await db_adapter.execute_query_async(scheduled_receivables_query)
            scheduled_payables = await db_adapter.execute_query_async(scheduled_payables_query)
        
        # Genera forecast
        forecast = []
        current_date = datetime.now()
        
        for i in range(months_ahead):
            forecast_date = current_date + timedelta(days=30 * i)
            month_num = forecast_date.strftime('%m')
            year_month = forecast_date.strftime('%Y-%m')
            
            # Trova pattern storico per questo mese
            historical_pattern = next(
                (h for h in historical if h['month_num'] == month_num), 
                {'avg_inflow': 0, 'avg_outflow': 0, 'avg_net': 0}
            )
            
            # Trova importi programmati per questo mese
            scheduled_in = next(
                (s['expected_inflow'] for s in scheduled_receivables if s['due_month'] == year_month),
                0
            )
            scheduled_out = next(
                (s['expected_outflow'] for s in scheduled_payables if s['due_month'] == year_month),
                0
            )
            
            # Combina storico e programmato
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
        
        return {
            'forecast': forecast,
            'historical_patterns': historical,
            'methodology': 'Historical averages + scheduled payments'
        }
    
    @staticmethod
    async def get_year_over_year_comparison_async(
        metric: str = "revenue",
        current_year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Confronto anno su anno"""
        from app.adapters.database_adapter import db_adapter
        from datetime import datetime
        
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
            
            comparison = await db_adapter.execute_query_async(comparison_query, (previous_year, current_year))
            
        elif metric == "profit":
            # Calcolo profit semplificato (ricavi - costi)
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
            
            comparison = await db_adapter.execute_query_async(comparison_query, (previous_year, current_year))
            
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
            
            comparison = await db_adapter.execute_query_async(comparison_query, (previous_year, current_year))
        else:
            raise ValueError(f"Unsupported metric: {metric}")
        
        # Calcola variazioni percentuali
        comparison_with_changes = []
        current_year_data = [c for c in comparison if c['year'] == current_year]
        previous_year_data = [c for c in comparison if c['year'] == previous_year]
        
        for current in current_year_data:
            # Trova dato anno precedente corrispondente
            previous = next(
                (p for p in previous_year_data 
                 if p['month'] == current['month'] and 
                    (p.get('type') == current.get('type') if 'type' in current else True)),
                None
            )
            
            if previous:
                # Calcola variazioni per campi numerici
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
        
        return {
            'metric': metric,
            'current_year': current_year,
            'previous_year': previous_year,
            'comparison': comparison_with_changes,
            'raw_data': comparison
        }

# Istanza globale dell'adapter
analytics_adapter = AnalyticsAdapter()