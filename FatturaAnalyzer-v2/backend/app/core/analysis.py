# core/analysis.py - Analisi ottimizzate per business ingrosso frutta e verdura

import logging
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta, datetime
import sqlite3
from dateutil.relativedelta import relativedelta
import re
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from collections import defaultdict

try:
    from .database import get_connection, DB_PATH
    from .utils import to_decimal, quantize, AMOUNT_TOLERANCE, normalize_product_name
except ImportError:
    logging.warning("Import relativo fallito in analysis.py, tento import assoluto.")
    try:
        from database import get_connection, DB_PATH
        from utils import to_decimal, quantize, AMOUNT_TOLERANCE, normalize_product_name
    except ImportError as e:
        logging.critical(f"Impossibile importare dipendenze database/utils in analysis.py: {e}")
        raise ImportError(f"Impossibile importare dipendenze database/utils in analysis.py: {e}") from e

logger = logging.getLogger(__name__)

# ===== ANALISI CORE BUSINESS =====

def get_monthly_revenue_costs(start_date=None, end_date=None):
    """Analisi ricavi e costi mensili con margini di profitto"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1) + relativedelta(days=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            logger.error("Date di inizio o fine non valide per get_monthly_revenue_costs.")
            return pd.DataFrame(columns=['month', 'revenue', 'cost', 'gross_margin', 'margin_percent'])

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
        query = """
            SELECT strftime('%Y-%m', doc_date) AS month, type, SUM(total_amount) AS monthly_total
            FROM Invoices
            WHERE doc_date BETWEEN ? AND ?
            GROUP BY month, type
            ORDER BY month, type;
        """
        df = pd.read_sql_query(query, conn, params=(start_str, end_str))

        if df.empty:
            logger.info("Nessuna fattura trovata nel periodo per revenue/costs.")
            return pd.DataFrame(columns=['month', 'revenue', 'cost', 'gross_margin', 'margin_percent'])

        df_pivot = df.pivot(index='month', columns='type', values='monthly_total').fillna(0.0)
        df_pivot.rename(columns={'Attiva': 'revenue', 'Passiva': 'cost'}, inplace=True)
        if 'revenue' not in df_pivot: df_pivot['revenue'] = 0.0
        if 'cost' not in df_pivot: df_pivot['cost'] = 0.0

        # Converti in Decimal e poi float per calcoli
        df_pivot['revenue'] = df_pivot['revenue'].apply(lambda x: float(quantize(to_decimal(x))))
        df_pivot['cost'] = df_pivot['cost'].apply(lambda x: float(quantize(to_decimal(x))))
        
        # Calcola margine lordo e percentuale
        df_pivot['gross_margin'] = df_pivot['revenue'] - df_pivot['cost']
        df_pivot['margin_percent'] = np.where(
            df_pivot['revenue'] > 0, 
            (df_pivot['gross_margin'] / df_pivot['revenue']) * 100, 
            0
        ).round(2)
        
        df_pivot.reset_index(inplace=True)
        df_pivot['month'] = pd.to_datetime(df_pivot['month'], format='%Y-%m').dt.strftime('%Y-%m')

        return df_pivot[['month', 'revenue', 'cost', 'gross_margin', 'margin_percent']]
    except Exception as e:
        logger.error(f"Errore calcolo revenue/cost: {e}", exc_info=True)
        return pd.DataFrame(columns=['month', 'revenue', 'cost', 'gross_margin', 'margin_percent'])
    finally:
        if conn: conn.close()

def get_seasonal_product_analysis(product_category='all', years_back=3):
    """Analisi stagionalità prodotti specifici per frutta e verdura"""
    conn = None
    try:
        conn = get_connection()
        end_date = date.today()
        start_date = end_date - relativedelta(years=years_back)
        
        query = """
            SELECT 
                strftime('%m', i.doc_date) as month_num,
                strftime('%Y', i.doc_date) as year,
                il.description,
                SUM(il.quantity) as total_quantity,
                SUM(il.total_price) as total_value,
                COUNT(DISTINCT i.id) as invoice_count,
                AVG(il.unit_price) as avg_unit_price
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = 'Attiva' 
              AND i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL 
              AND TRIM(il.description) != ''
              AND il.quantity > 0
            GROUP BY month_num, year, il.description
            ORDER BY month_num, year, total_value DESC
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date.isoformat(), end_date.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza nomi prodotti
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        df = df.dropna(subset=['normalized_product'])
        
        # Filtro per categoria se specificato
        if product_category != 'all':
            fruit_keywords = ['mela', 'pera', 'banana', 'arancia', 'limone', 'uva', 'pesca', 'albicocca', 'ciliegia', 'fragola', 'kiwi', 'ananas', 'cocco', 'melone', 'anguria', 'pompelmo', 'mandarino']
            vegetable_keywords = ['pomodoro', 'lattuga', 'carota', 'cipolla', 'patata', 'zucchina', 'melanzana', 'peperone', 'broccoli', 'cavolo', 'spinaci', 'finocchio', 'sedano', 'rucola', 'basilico', 'prezzemolo']
            
            if product_category == 'frutta':
                df = df[df['normalized_product'].str.contains('|'.join(fruit_keywords), case=False, na=False)]
            elif product_category == 'verdura':
                df = df[df['normalized_product'].str.contains('|'.join(vegetable_keywords), case=False, na=False)]
        
        # Aggrega per prodotto normalizzato e mese
        seasonal_data = df.groupby(['normalized_product', 'month_num']).agg({
            'total_quantity': 'sum',
            'total_value': 'sum',
            'invoice_count': 'sum',
            'avg_unit_price': 'mean'
        }).reset_index()
        
        # Calcola indice di stagionalità (media del mese / media annuale)
        product_yearly_avg = seasonal_data.groupby('normalized_product')['total_value'].mean()
        seasonal_data['seasonality_index'] = seasonal_data.apply(
            lambda row: row['total_value'] / product_yearly_avg[row['normalized_product']] 
            if product_yearly_avg[row['normalized_product']] > 0 else 0, axis=1
        )
        
        # Formatta per output
        seasonal_data['month_name'] = seasonal_data['month_num'].map({
            '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
            '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
            '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic'
        })
        
        return seasonal_data.sort_values(['normalized_product', 'month_num'])
        
    except Exception as e:
        logger.error(f"Errore analisi stagionalità: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def get_top_clients_performance(start_date=None, end_date=None, limit=20):
    """Analisi performance clienti con metriche specifiche per ingrosso"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return pd.DataFrame()

        query = """
            SELECT 
                a.id,
                a.denomination,
                a.city,
                a.score,
                COUNT(i.id) as total_invoices,
                SUM(i.total_amount) as total_revenue,
                AVG(i.total_amount) as avg_order_value,
                MIN(i.doc_date) as first_order_date,
                MAX(i.doc_date) as last_order_date,
                COUNT(DISTINCT strftime('%Y-%m', i.doc_date)) as active_months,
                SUM(CASE WHEN i.payment_status = 'Pagata Tot.' THEN i.total_amount ELSE 0 END) as paid_revenue,
                AVG(CASE 
                    WHEN i.due_date IS NOT NULL AND i.payment_status = 'Pagata Tot.' 
                    THEN julianday(MAX(bt.transaction_date)) - julianday(i.due_date)
                    ELSE NULL 
                END) as avg_payment_delay
            FROM Anagraphics a
            JOIN Invoices i ON a.id = i.anagraphics_id
            LEFT JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
            LEFT JOIN BankTransactions bt ON rl.transaction_id = bt.id
            WHERE a.type = 'Cliente'
              AND i.type = 'Attiva'
              AND i.doc_date BETWEEN ? AND ?
            GROUP BY a.id, a.denomination, a.city, a.score
            HAVING total_revenue > 0
            ORDER BY total_revenue DESC
            LIMIT ?
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat(), limit))
        
        if df.empty:
            return pd.DataFrame()
        
        # Calcola metriche aggiuntive
        df['payment_ratio'] = (df['paid_revenue'] / df['total_revenue'] * 100).round(1)
        df['order_frequency'] = (df['total_invoices'] / df['active_months']).round(2)
        df['customer_lifetime_days'] = (pd.to_datetime(df['last_order_date']) - pd.to_datetime(df['first_order_date'])).dt.days
        
        # Classifica clienti
        df['customer_segment'] = pd.cut(df['total_revenue'], 
                                      bins=[0, 10000, 50000, 100000, float('inf')],
                                      labels=['Bronze', 'Silver', 'Gold', 'Platinum'])
        
        # Formatta importi
        df['total_revenue_fmt'] = df['total_revenue'].apply(lambda x: f"{x:,.2f}€")
        df['avg_order_value_fmt'] = df['avg_order_value'].apply(lambda x: f"{x:,.2f}€")
        
        return df
        
    except Exception as e:
        logger.error(f"Errore analisi performance clienti: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def get_supplier_analysis(start_date=None, end_date=None):
    """Analisi fornitori con focus su affidabilità e costi"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        query = """
            SELECT 
                a.id,
                a.denomination,
                a.city,
                a.province,
                COUNT(i.id) as total_orders,
                SUM(i.total_amount) as total_cost,
                AVG(i.total_amount) as avg_order_value,
                COUNT(DISTINCT strftime('%Y-%m', i.doc_date)) as active_months,
                MIN(i.doc_date) as first_order_date,
                MAX(i.doc_date) as last_order_date,
                SUM(CASE WHEN i.payment_status = 'Pagata Tot.' THEN i.total_amount ELSE 0 END) as paid_amount,
                COUNT(CASE WHEN i.payment_status = 'Scaduta' THEN 1 END) as overdue_invoices,
                COUNT(DISTINCT il.description) as product_variety
            FROM Anagraphics a
            JOIN Invoices i ON a.id = i.anagraphics_id
            LEFT JOIN InvoiceLines il ON i.id = il.invoice_id
            WHERE a.type = 'Fornitore'
              AND i.type = 'Passiva'
              AND i.doc_date BETWEEN ? AND ?
            GROUP BY a.id, a.denomination, a.city, a.province
            HAVING total_cost > 0
            ORDER BY total_cost DESC
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Calcola reliability score (0-100)
        df['payment_ratio'] = df['paid_amount'] / df['total_cost']
        df['order_consistency'] = df['total_orders'] / df['active_months']
        df['overdue_ratio'] = df['overdue_invoices'] / df['total_orders']
        
        df['reliability_score'] = (
            (df['payment_ratio'] * 40) +  # 40% peso pagamenti
            (np.minimum(df['order_consistency'] / 2, 1) * 30) +  # 30% peso consistenza ordini
            ((1 - df['overdue_ratio']) * 20) +  # 20% peso puntualità
            (np.minimum(df['product_variety'] / 10, 1) * 10)  # 10% peso varietà
        ).round(1)
        
        # Classifica fornitori
        df['supplier_tier'] = pd.cut(df['reliability_score'], 
                                   bins=[0, 60, 75, 85, 100],
                                   labels=['Basic', 'Good', 'Excellent', 'Premium'])
        
        # Formatta importi
        df['total_cost_fmt'] = df['total_cost'].apply(lambda x: f"{x:,.2f}€")
        df['avg_order_value_fmt'] = df['avg_order_value'].apply(lambda x: f"{x:,.2f}€")
        
        return df
        
    except Exception as e:
        logger.error(f"Errore analisi fornitori: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

# ===== ANALISI CASH FLOW AVANZATO =====

def get_advanced_cashflow_analysis(start_date=None, end_date=None):
    """Analisi cash flow avanzato con proiezioni per business stagionale"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        # Analisi dettagliata dei flussi
        query = """
            SELECT 
                strftime('%Y-%m', bt.transaction_date) as month,
                bt.amount,
                bt.description,
                CASE 
                    WHEN bt.amount > 0 AND rl.id IS NOT NULL THEN 'Incassi_Clienti'
                    WHEN bt.amount > 0 AND bt.description LIKE '%VERSAMENTO CONTANT%' THEN 'Incassi_Contanti'
                    WHEN bt.amount > 0 THEN 'Altri_Incassi'
                    WHEN bt.amount < 0 AND rl.id IS NOT NULL AND i.type = 'Passiva' THEN 'Pagamenti_Fornitori'
                    WHEN bt.amount < 0 AND (bt.description LIKE '%POS%' OR bt.description LIKE '%CARTA%') THEN 'Spese_Carte'
                    WHEN bt.amount < 0 AND bt.description LIKE '%COMMISSIONI%' THEN 'Commissioni_Bancarie'
                    WHEN bt.amount < 0 AND (bt.description LIKE '%F24%' OR bt.description LIKE '%TRIBUTI%') THEN 'Tasse_Tributi'
                    WHEN bt.amount < 0 AND bt.description LIKE '%STIPENDI%' THEN 'Stipendi'
                    ELSE 'Altri_Pagamenti'
                END as cash_category
            FROM BankTransactions bt
            LEFT JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id
            LEFT JOIN Invoices i ON rl.invoice_id = i.id
            WHERE bt.transaction_date BETWEEN ? AND ?
              AND bt.reconciliation_status != 'Ignorato'
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Aggrega per mese e categoria
        df_monthly = df.groupby(['month', 'cash_category'])['amount'].sum().unstack(fill_value=0).reset_index()
        
        # Calcola metriche chiave
        df_monthly['net_cash_flow'] = df_monthly.sum(axis=1, numeric_only=True)
        df_monthly['cash_conversion_cycle'] = df_monthly.get('Incassi_Clienti', 0) / (df_monthly.get('Pagamenti_Fornitori', 1) * -1 + 1)
        
        # Trend analysis
        df_monthly['month_date'] = pd.to_datetime(df_monthly['month'])
        df_monthly = df_monthly.sort_values('month_date')
        
        # Rolling averages per stabilità
        for col in df_monthly.select_dtypes(include=[np.number]).columns:
            if col not in ['month_date']:
                df_monthly[f'{col}_3m_avg'] = df_monthly[col].rolling(window=3, min_periods=1).mean()
        
        return df_monthly
        
    except Exception as e:
        logger.error(f"Errore analisi cash flow avanzato: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def get_waste_and_spoilage_analysis(start_date=None, end_date=None):
    """Analisi perdite e deterioramento prodotti deperibili"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(months=6))

        # Identifica note di credito e resi
        query = """
            SELECT 
                strftime('%Y-%m', i.doc_date) as month,
                il.description,
                SUM(CASE WHEN i.doc_type IN ('TD04', 'TD08') THEN il.total_price ELSE 0 END) as credit_notes,
                SUM(CASE WHEN i.doc_type NOT IN ('TD04', 'TD08') THEN il.total_price ELSE 0 END) as normal_sales,
                COUNT(CASE WHEN i.doc_type IN ('TD04', 'TD08') THEN 1 END) as credit_count,
                AVG(il.unit_price) as avg_unit_price
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = 'Attiva'
              AND i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL
            GROUP BY month, il.description
            HAVING (credit_notes > 0 OR normal_sales > 0)
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza prodotti
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        
        # Aggrega per prodotto normalizzato
        df_agg = df.groupby(['month', 'normalized_product']).agg({
            'credit_notes': 'sum',
            'normal_sales': 'sum',
            'credit_count': 'sum',
            'avg_unit_price': 'mean'
        }).reset_index()
        
        # Calcola tasso di perdita
        df_agg['waste_ratio'] = np.where(
            df_agg['normal_sales'] > 0,
            (df_agg['credit_notes'] / df_agg['normal_sales']) * 100,
            0
        )
        
        # Identifica prodotti ad alto deterioramento
        high_waste_products = df_agg[df_agg['waste_ratio'] > 5]['normalized_product'].unique()
        
        # Analisi stagionale del deterioramento
        df_agg['month_num'] = pd.to_datetime(df_agg['month']).dt.month
        seasonal_waste = df_agg.groupby(['month_num', 'normalized_product'])['waste_ratio'].mean().reset_index()
        
        return {
            'monthly_waste': df_agg,
            'high_waste_products': high_waste_products.tolist(),
            'seasonal_patterns': seasonal_waste
        }
        
    except Exception as e:
        logger.error(f"Errore analisi perdite: {e}", exc_info=True)
        return {}
    finally:
        if conn: conn.close()

def get_inventory_turnover_analysis(start_date=None, end_date=None):
    """Analisi rotazione inventario per prodotti freschi"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(months=3))

        # Query per analisi acquisti vs vendite per prodotto
        query = """
            SELECT 
                il.description,
                SUM(CASE WHEN i.type = 'Passiva' THEN il.quantity ELSE 0 END) as total_purchased,
                SUM(CASE WHEN i.type = 'Attiva' THEN il.quantity ELSE 0 END) as total_sold,
                SUM(CASE WHEN i.type = 'Passiva' THEN il.total_price ELSE 0 END) as purchase_value,
                SUM(CASE WHEN i.type = 'Attiva' THEN il.total_price ELSE 0 END) as sales_value,
                COUNT(DISTINCT CASE WHEN i.type = 'Passiva' THEN i.doc_date END) as purchase_days,
                COUNT(DISTINCT CASE WHEN i.type = 'Attiva' THEN i.doc_date END) as sales_days,
                AVG(CASE WHEN i.type = 'Passiva' THEN il.unit_price END) as avg_purchase_price,
                AVG(CASE WHEN i.type = 'Attiva' THEN il.unit_price END) as avg_sales_price
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL
              AND il.quantity > 0
            GROUP BY il.description
            HAVING total_purchased > 0 OR total_sold > 0
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza prodotti
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        
        # Aggrega per prodotto normalizzato
        df_agg = df.groupby('normalized_product').agg({
            'total_purchased': 'sum',
            'total_sold': 'sum',
            'purchase_value': 'sum',
            'sales_value': 'sum',
            'purchase_days': 'sum',
            'sales_days': 'sum',
            'avg_purchase_price': 'mean',
            'avg_sales_price': 'mean'
        }).reset_index()
        
        # Calcola metriche di rotazione
        period_days = (end_date_obj - start_date_obj).days
        
        df_agg['inventory_turnover'] = np.where(
            df_agg['total_purchased'] > 0,
            df_agg['total_sold'] / df_agg['total_purchased'],
            0
        )
        
        df_agg['days_to_sell'] = np.where(
            df_agg['sales_days'] > 0,
            period_days / df_agg['sales_days'],
            period_days
        )
        
        df_agg['gross_margin'] = df_agg['sales_value'] - df_agg['purchase_value']
        df_agg['margin_percent'] = np.where(
            df_agg['sales_value'] > 0,
            (df_agg['gross_margin'] / df_agg['sales_value']) * 100,
            0
        )
        
        # Classifica prodotti per velocità di rotazione
        df_agg['turnover_category'] = pd.cut(
            df_agg['inventory_turnover'],
            bins=[0, 0.5, 1.0, 2.0, float('inf')],
            labels=['Lento', 'Normale', 'Veloce', 'Molto Veloce']
        )
        
        return df_agg.sort_values('inventory_turnover', ascending=False)
        
    except Exception as e:
        logger.error(f"Errore analisi rotazione inventario: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def get_price_trend_analysis(product_name=None, start_date=None, end_date=None):
    """Analisi andamento prezzi per prodotti specifici"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=2))

        where_clause = ""
        params = [start_date_obj.isoformat(), end_date_obj.isoformat()]
        
        if product_name:
            where_clause = "AND il.description LIKE ?"
            params.append(f"%{product_name}%")

        query = f"""
            SELECT 
                i.doc_date,
                il.description,
                i.type as invoice_type,
                AVG(il.unit_price) as avg_price,
                SUM(il.quantity) as total_quantity,
                COUNT(*) as transaction_count
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.doc_date BETWEEN ? AND ?
              AND il.unit_price > 0
              AND il.quantity > 0
              {where_clause}
            GROUP BY i.doc_date, il.description, i.type
            ORDER BY i.doc_date, il.description
        """
        
        df = pd.read_sql_query(query, conn, params=params)
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza prodotti
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        df['doc_date'] = pd.to_datetime(df['doc_date'])
        df['week'] = df['doc_date'].dt.isocalendar().week
        df['month'] = df['doc_date'].dt.to_period('M')
        
        # Aggrega per settimana/mese
        weekly_prices = df.groupby(['week', 'normalized_product', 'invoice_type']).agg({
            'avg_price': 'mean',
            'total_quantity': 'sum',
            'transaction_count': 'sum'
        }).reset_index()
        
        monthly_prices = df.groupby(['month', 'normalized_product', 'invoice_type']).agg({
            'avg_price': 'mean',
            'total_quantity': 'sum',
            'transaction_count': 'sum'
        }).reset_index()
        
        # Calcola volatilità prezzi
        price_volatility = df.groupby(['normalized_product', 'invoice_type'])['avg_price'].agg(['std', 'mean']).reset_index()
        price_volatility['volatility_coefficient'] = (price_volatility['std'] / price_volatility['mean']) * 100
        
        return {
            'daily_prices': df,
            'weekly_prices': weekly_prices,
            'monthly_prices': monthly_prices,
            'price_volatility': price_volatility
        }
        
    except Exception as e:
        logger.error(f"Errore analisi trend prezzi: {e}", exc_info=True)
        return {}
    finally:
        if conn: conn.close()

def get_market_basket_analysis(start_date=None, end_date=None, min_support=0.01):
    """Analisi prodotti frequentemente venduti insieme"""
    conn = None
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(months=6))

        # Query per ottenere prodotti per fattura
        query = """
            SELECT 
                i.id as invoice_id,
                i.doc_date,
                a.denomination as customer,
                il.description,
                il.quantity,
                il.total_price
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.type = 'Attiva'
              AND i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL
              AND il.quantity > 0
        """
        
        df = pd.read_sql_query(query, conn, params=(start_date_obj.isoformat(), end_date_obj.isoformat()))
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza prodotti
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        
        # Crea matrice transazioni
        basket_df = df.groupby(['invoice_id', 'normalized_product'])['quantity'].sum().unstack(fill_value=0)
        basket_df = basket_df.applymap(lambda x: 1 if x > 0 else 0)
        
        # Calcola support per singoli prodotti
        product_support = basket_df.mean()
        frequent_products = product_support[product_support >= min_support].index.tolist()
        
        # Analisi associazioni per coppie di prodotti
        associations = []
        for i, prod1 in enumerate(frequent_products):
            for prod2 in frequent_products[i+1:]:
                # Support per coppia
                support_both = (basket_df[prod1] & basket_df[prod2]).mean()
                
                if support_both >= min_support:
                    # Confidence A -> B e B -> A
                    confidence_1_2 = support_both / product_support[prod1]
                    confidence_2_1 = support_both / product_support[prod2]
                    
                    # Lift
                    lift = support_both / (product_support[prod1] * product_support[prod2])
                    
                    associations.append({
                        'product_1': prod1,
                        'product_2': prod2,
                        'support': support_both,
                        'confidence_1_2': confidence_1_2,
                        'confidence_2_1': confidence_2_1,
                        'lift': lift
                    })
        
        associations_df = pd.DataFrame(associations)
        if not associations_df.empty:
            associations_df = associations_df.sort_values('lift', ascending=False)
        
        return {
            'product_support': product_support.sort_values(ascending=False),
            'associations': associations_df,
            'basket_matrix': basket_df
        }
        
    except Exception as e:
        logger.error(f"Errore market basket analysis: {e}", exc_info=True)
        return {}
    finally:
        if conn: conn.close()

def get_customer_rfm_analysis(analysis_date=None):
    """Analisi RFM (Recency, Frequency, Monetary) per segmentazione clienti"""
    conn = None
    try:
        conn = get_connection()
        analysis_date_obj = pd.to_datetime(analysis_date, errors='coerce').date() if analysis_date else date.today()

        query = """
            SELECT 
                a.id as customer_id,
                a.denomination,
                MAX(i.doc_date) as last_purchase_date,
                COUNT(i.id) as frequency,
                SUM(i.total_amount) as monetary_value,
                AVG(i.total_amount) as avg_order_value,
                MIN(i.doc_date) as first_purchase_date
            FROM Anagraphics a
            JOIN Invoices i ON a.id = i.anagraphics_id
            WHERE a.type = 'Cliente'
              AND i.type = 'Attiva'
              AND i.payment_status != 'Annullata'
            GROUP BY a.id, a.denomination
            HAVING frequency > 0
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return pd.DataFrame()
        
        # Calcola Recency (giorni dall'ultimo acquisto)
        df['last_purchase_date'] = pd.to_datetime(df['last_purchase_date'])
        df['recency'] = (analysis_date_obj - df['last_purchase_date'].dt.date).dt.days
        
        # Calcola Customer Lifetime (giorni)
        df['first_purchase_date'] = pd.to_datetime(df['first_purchase_date'])
        df['customer_lifetime'] = (df['last_purchase_date'] - df['first_purchase_date']).dt.days + 1
        
        # Score RFM (1-5, dove 5 è il migliore)
        df['recency_score'] = pd.qcut(df['recency'], q=5, labels=[5, 4, 3, 2, 1], duplicates='drop')
        df['frequency_score'] = pd.qcut(df['frequency'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        df['monetary_score'] = pd.qcut(df['monetary_value'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        # Converti in numerico
        df['recency_score'] = pd.to_numeric(df['recency_score'])
        df['frequency_score'] = pd.to_numeric(df['frequency_score'])
        df['monetary_score'] = pd.to_numeric(df['monetary_score'])
        
        # Score RFM combinato
        df['rfm_score'] = df['recency_score'].astype(str) + df['frequency_score'].astype(str) + df['monetary_score'].astype(str)
        df['rfm_score_numeric'] = df['recency_score'] + df['frequency_score'] + df['monetary_score']
        
        # Segmentazione clienti
        def assign_segment(row):
            r, f, m = row['recency_score'], row['frequency_score'], row['monetary_score']
            
            if r >= 4 and f >= 4 and m >= 4:
                return 'Champions'
            elif r >= 3 and f >= 3 and m >= 3:
                return 'Loyal Customers'
            elif r >= 4 and f <= 2:
                return 'New Customers'
            elif r <= 2 and f >= 3 and m >= 3:
                return 'At Risk'
            elif r <= 2 and f <= 2 and m >= 3:
                return 'Cannot Lose Them'
            elif r <= 2 and f <= 2 and m <= 2:
                return 'Lost Customers'
            elif f >= 3 and m <= 2:
                return 'Potential Loyalists'
            else:
                return 'Others'
        
        df['customer_segment'] = df.apply(assign_segment, axis=1)
        
        # Statistiche per segmento
        segment_stats = df.groupby('customer_segment').agg({
            'customer_id': 'count',
            'recency': 'mean',
            'frequency': 'mean',
            'monetary_value': ['mean', 'sum'],
            'avg_order_value': 'mean'
        }).round(2)
        
        return {
            'rfm_data': df.sort_values('rfm_score_numeric', ascending=False),
            'segment_stats': segment_stats
        }
        
    except Exception as e:
        logger.error(f"Errore analisi RFM: {e}", exc_info=True)
        return {}
    finally:
        if conn: conn.close()

# ===== ANALISI CASH FLOW AGGIORNATO =====

def _get_categorized_transactions(start_date_str, end_date_str):
    """Categorizzazione transazioni migliorata per business frutta e verdura"""
    conn = None
    try:
        conn = get_connection()
        query_trans = """
            SELECT
                bt.id as transaction_id,
                bt.transaction_date,
                bt.amount,
                bt.description,
                GROUP_CONCAT(rl.id) as link_ids,
                GROUP_CONCAT(i.type) as linked_invoice_types,
                SUM(rl.reconciled_amount) as total_linked_amount
            FROM BankTransactions bt
            LEFT JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id
            LEFT JOIN Invoices i ON rl.invoice_id = i.id
            WHERE bt.transaction_date BETWEEN ? AND ?
              AND bt.reconciliation_status != 'Ignorato'
            GROUP BY bt.id, bt.transaction_date, bt.amount, bt.description
            ORDER BY bt.transaction_date;
        """
        df = pd.read_sql_query(query_trans, conn, params=(start_date_str, end_date_str), parse_dates=['transaction_date'])

        if df.empty:
            logger.info("Nessuna transazione trovata nel periodo per la categorizzazione.")
            return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])

        df['amount_dec'] = df['amount'].apply(lambda x: quantize(to_decimal(x)))
        df['category'] = 'Altro'

        # Pattern migliorati per business frutta e verdura
        pos_pattern = r'\b(POS|PAGOBANCOMAT|CIRRUS|MAESTRO|VISA|MASTERCARD|AMEX|WORLDLINE|ESE COMM)\b'
        cash_pattern = r'(VERSAMENTO CONTANT|CONTANTI|CASSA)'
        commission_pattern = r'^(COMMISSIONI|COMPETENZE BANC|SPESE TENUTA CONTO|IMPOSTA DI BOLLO)'
        fuel_pattern = r'(BENZINA|GASOLIO|CARBURANTE|DISTRIBUTORE|ENI|AGIP|Q8)'
        transport_pattern = r'(AUTOSTRADA|PEDAGGI|TELEPASS|TRASPORT)'
        utilities_pattern = r'(ENEL|GAS|ACQUA|TELEFON|INTERNET|TIM|VODAFONE)'
        taxes_pattern = r'(F24|TRIBUTI|INPS|INAIL|AGENZIA ENTRATE)'
        bank_fees_pattern = r'(CANONE|BOLLO|COMMISSIONI)'

        for index, row in df.iterrows():
            trans_id = row['transaction_id']
            amount = row['amount_dec']
            desc = str(row['description'] or '').upper()
            has_links = pd.notna(row['link_ids'])
            linked_types = set(str(row['linked_invoice_types'] or '').split(',')) if has_links else set()

            if has_links:
                if amount > 0 and 'Attiva' in linked_types:
                    df.loc[index, 'category'] = 'Incassi_Clienti'
                elif amount < 0 and 'Passiva' in linked_types:
                    df.loc[index, 'category'] = 'Pagamenti_Fornitori'
                else:
                    df.loc[index, 'category'] = 'Riconciliati_Altri'
            else:
                if amount > 0:
                    if re.search(cash_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Incassi_Contanti'
                    else:
                        df.loc[index, 'category'] = 'Altri_Incassi'
                elif amount < 0:
                    if re.search(commission_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Commissioni_Bancarie'
                    elif re.search(pos_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Spese_Carte'
                    elif re.search(fuel_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Carburanti'
                    elif re.search(transport_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Trasporti'
                    elif re.search(utilities_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Utenze'
                    elif re.search(taxes_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Tasse_Tributi'
                    elif re.search(bank_fees_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Commissioni_Bancarie'
                    else:
                        df.loc[index, 'category'] = 'Altri_Pagamenti'

        return df

    except Exception as e:
        logger.error(f"Errore durante la categorizzazione delle transazioni: {e}", exc_info=True)
        return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])
    finally:
        if conn: conn.close()

def get_cashflow_data(start_date=None, end_date=None):
    """Cash flow data con categorizzazione migliorata"""
    cols_out = ['month', 'incassi_clienti', 'incassi_contanti', 'altri_incassi', 
                'pagamenti_fornitori', 'spese_carte', 'carburanti', 'trasporti', 
                'utenze', 'tasse_tributi', 'commissioni_bancarie', 'altri_pagamenti',
                'net_operational_flow', 'total_inflows', 'total_outflows', 'net_cash_flow']
    
    empty_df = pd.DataFrame(columns=cols_out).astype(float)
    empty_df['month'] = pd.Series(dtype='str')

    try:
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1) + relativedelta(days=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            logger.error("Date inizio/fine non valide per get_cashflow_data")
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
        df_categorized = _get_categorized_transactions(start_str, end_str)

        if df_categorized.empty:
            logger.info("Nessuna transazione categorizzata trovata per il cash flow.")
            return empty_df

        df_categorized['month'] = df_categorized['transaction_date'].dt.strftime('%Y-%m')
        
        # Aggrega per mese e categoria
        df_monthly = df_categorized.groupby(['month', 'category'])['amount_dec'].sum().unstack(fill_value=Decimal('0.0')).reset_index()

        # Mappa categorie alle colonne di output
        category_mapping = {
            'Incassi_Clienti': 'incassi_clienti',
            'Incassi_Contanti': 'incassi_contanti',
            'Altri_Incassi': 'altri_incassi',
            'Riconciliati_Altri': 'altri_incassi',
            'Pagamenti_Fornitori': 'pagamenti_fornitori',
            'Spese_Carte': 'spese_carte',
            'Carburanti': 'carburanti',
            'Trasporti': 'trasporti',
            'Utenze': 'utenze',
            'Tasse_Tributi': 'tasse_tributi',
            'Commissioni_Bancarie': 'commissioni_bancarie',
            'Altri_Pagamenti': 'altri_pagamenti'
        }

        df_out = pd.DataFrame()
        df_out['month'] = df_monthly['month']

        # Inizializza tutte le colonne
        for col in cols_out[1:-4]:  # Escludi month e le colonne calcolate
            df_out[col] = 0.0

        # Popola le colonne con i dati
        for category, column in category_mapping.items():
            if category in df_monthly.columns:
                if column in ['pagamenti_fornitori', 'spese_carte', 'carburanti', 'trasporti', 
                             'utenze', 'tasse_tributi', 'commissioni_bancarie', 'altri_pagamenti']:
                    # Converti importi negativi in positivi per le uscite
                    df_out[column] = df_monthly[category].apply(lambda x: float(abs(x)) if x < 0 else 0.0)
                else:
                    # Mantieni solo importi positivi per le entrate
                    df_out[column] = df_monthly[category].apply(lambda x: float(x) if x > 0 else 0.0)

        # Calcola totali e flussi netti
        inflow_cols = ['incassi_clienti', 'incassi_contanti', 'altri_incassi']
        outflow_cols = ['pagamenti_fornitori', 'spese_carte', 'carburanti', 'trasporti', 
                       'utenze', 'tasse_tributi', 'commissioni_bancarie', 'altri_pagamenti']
        
        df_out['total_inflows'] = df_out[inflow_cols].sum(axis=1)
        df_out['total_outflows'] = df_out[outflow_cols].sum(axis=1)
        df_out['net_cash_flow'] = df_out['total_inflows'] - df_out['total_outflows']
        df_out['net_operational_flow'] = df_out['incassi_clienti'] + df_out['incassi_contanti'] - df_out['pagamenti_fornitori']

        df_out['month'] = pd.to_datetime(df_out['month'], format='%Y-%m').dt.strftime('%Y-%m')

        return df_out[cols_out]

    except Exception as e:
        logger.error(f"Errore recupero dati cash flow categorizzato: {e}", exc_info=True)
        return empty_df

def get_cashflow_table(start_date=None, end_date=None):
    """Tabella cash flow formattata per UI"""
    cols_out = ['Mese', 'Incassi Clienti', 'Incassi Contanti', 'Altri Incassi', 'Tot. Entrate',
                'Pagam. Fornitori', 'Spese Varie', 'Carburanti', 'Utenze', 'Tasse', 'Commissioni', 'Tot. Uscite',
                'Flusso Operativo', 'Flusso Netto']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        df_data = get_cashflow_data(start_date, end_date)
        if df_data.empty: 
            return empty_df

        df_table = pd.DataFrame()
        try:
            df_table['Mese'] = pd.to_datetime(df_data['month'], format='%Y-%m').dt.strftime('%b %Y')
        except ValueError:
            df_table['Mese'] = df_data['month']

        def format_currency(val):
            if pd.isna(val): 
                return 'N/A'
            try:
                d = quantize(Decimal(str(val)))
                return f"{d:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            except (InvalidOperation, TypeError):
                return "0,00"

        # Mappiamo i dati alle colonne della tabella
        df_table['Incassi Clienti'] = df_data['incassi_clienti'].apply(format_currency)
        df_table['Incassi Contanti'] = df_data['incassi_contanti'].apply(format_currency)
        df_table['Altri Incassi'] = df_data['altri_incassi'].apply(format_currency)
        df_table['Tot. Entrate'] = df_data['total_inflows'].apply(format_currency)
        
        df_table['Pagam. Fornitori'] = df_data['pagamenti_fornitori'].apply(format_currency)
        # Raggruppiamo alcune spese per semplicità
        df_data['spese_varie'] = (df_data['spese_carte'] + df_data['trasporti'] + df_data['altri_pagamenti'])
        df_table['Spese Varie'] = df_data['spese_varie'].apply(format_currency)
        df_table['Carburanti'] = df_data['carburanti'].apply(format_currency)
        df_table['Utenze'] = df_data['utenze'].apply(format_currency)
        df_table['Tasse'] = df_data['tasse_tributi'].apply(format_currency)
        df_table['Commissioni'] = df_data['commissioni_bancarie'].apply(format_currency)
        df_table['Tot. Uscite'] = df_data['total_outflows'].apply(format_currency)
        
        df_table['Flusso Operativo'] = df_data['net_operational_flow'].apply(format_currency)
        df_table['Flusso Netto'] = df_data['net_cash_flow'].apply(format_currency)

        return df_table[cols_out]

    except Exception as e:
        logger.error(f"Errore creazione tabella cash flow: {e}", exc_info=True)
        return empty_df

# ===== MANTENUTE LE FUNZIONI ORIGINALI (aggiornate) =====

def get_products_analysis(invoice_type='Attiva', start_date=None, end_date=None):
    """Analisi prodotti con normalizzazione migliorata"""
    conn = None
    cols_out = ['Prodotto Normalizzato', 'Quantità Tot.', 'Valore Totale', 'N. Fatture', 'Prezzo Medio', 'Descrizioni Originali']
    empty_df = pd.DataFrame(columns=cols_out)

    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - timedelta(days=90))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()

        query_lines = """
            SELECT
                il.description,
                il.quantity,
                il.total_price,
                il.unit_price,
                i.id as invoice_id
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = ? AND i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL AND TRIM(il.description) != '';
        """
        df_lines = pd.read_sql_query(query_lines, conn, params=(invoice_type, start_str, end_str))

        if df_lines.empty:
            return empty_df

        df_lines['normalized_product'] = df_lines['description'].apply(normalize_product_name)
        df_lines.dropna(subset=['normalized_product'], inplace=True)

        if df_lines.empty:
            return empty_df

        # Converti in Decimal prima di aggregare
        df_lines['quantity_dec'] = df_lines['quantity'].apply(lambda x: to_decimal(x, default='NaN'))
        df_lines['total_price_dec'] = df_lines['total_price'].apply(lambda x: to_decimal(x, default='NaN'))
        df_lines['unit_price_dec'] = df_lines['unit_price'].apply(lambda x: to_decimal(x, default='NaN'))

        # Aggrega
        df_agg = df_lines.groupby('normalized_product').agg(
            TotalQuantityDec=('quantity_dec', lambda x: x.dropna().sum()),
            TotalValueDec=('total_price_dec', lambda x: x.dropna().sum()),
            AvgUnitPriceDec=('unit_price_dec', lambda x: x.dropna().mean()),
            NumInvoices=('invoice_id', 'nunique'),
            OriginalDescriptions=('description', lambda x: '|'.join(sorted(list(set(x)))))
        ).reset_index()

        df_agg.rename(columns={'normalized_product': 'Prodotto Normalizzato',
                               'NumInvoices': 'N. Fatture'}, inplace=True)

        # Formatta DOPO l'aggregazione
        df_agg['Valore Totale'] = df_agg['TotalValueDec'].apply(lambda x: f"{quantize(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if x.is_finite() else '0,00')
        df_agg['Quantità Tot.'] = df_agg['TotalQuantityDec'].apply(lambda x: f"{quantize(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if x.is_finite() else '')
        df_agg['Prezzo Medio'] = df_agg['AvgUnitPriceDec'].apply(lambda x: f"{quantize(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if x.is_finite() else '0,00')
        df_agg['Descrizioni Originali'] = df_agg['OriginalDescriptions']

        # Ordina per valore numerico prima di formattare
        df_agg = df_agg.sort_values(by='TotalValueDec', ascending=False)

        return df_agg[cols_out]

    except Exception as e:
        logging.error(f"Errore analisi prodotti ({invoice_type}): {e}", exc_info=True)
        return empty_df
    finally:
        if conn: conn.close()

def calculate_and_update_client_scores():
    """Calcolo score clienti con logica migliorata"""
    conn = None
    today = date.today()
    client_delays = {}
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Query migliorata per includere più fattori
        query = """
            SELECT 
                i.anagraphics_id, 
                i.due_date, 
                MAX(bt.transaction_date) AS payment_date,
                i.total_amount,
                COUNT(*) as payment_frequency
            FROM Invoices i
            JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            WHERE i.type = 'Attiva'
              AND i.payment_status IN ('Pagata Tot.', 'Riconciliata')
              AND i.due_date IS NOT NULL
              AND DATE(i.due_date) IS NOT NULL 
              AND DATE(bt.transaction_date) IS NOT NULL
            GROUP BY i.id, i.anagraphics_id, i.due_date, i.total_amount;
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()

        for row in rows:
            client_id = row['anagraphics_id']
            try:
                due_date_obj = date.fromisoformat(row['due_date'])
                payment_date_obj = date.fromisoformat(row['payment_date'])
                delay = (payment_date_obj - due_date_obj).days
                amount = float(row['total_amount'])
                
                if client_id not in client_delays:
                    client_delays[client_id] = []
                    
                # Pesare i ritardi per importo (ritardi su fatture maggiori pesano di più)
                weighted_delay = delay * (amount / 1000.0)  # Normalizza per 1000€
                client_delays[client_id].append({
                    'delay': delay,
                    'weighted_delay': weighted_delay,
                    'amount': amount
                })
                
            except (ValueError, TypeError) as date_ex:
                logging.warning(f"Errore conversione data per score client {client_id}: {date_ex}")

        conn.execute("BEGIN TRANSACTION")
        updated_count = 0
        
        for client_id, delay_data in client_delays.items():
            if not delay_data:
                continue
                
            # Calcola metriche avanzate
            delays = [d['delay'] for d in delay_data]
            weighted_delays = [d['weighted_delay'] for d in delay_data]
            amounts = [d['amount'] for d in delay_data]
            
            avg_delay = sum(delays) / len(delays)
            avg_weighted_delay = sum(weighted_delays) / len(weighted_delays)
            total_amount = sum(amounts)
            
            # Score basato su multiple componenti
            delay_penalty = max(0, avg_delay) * 1.5
            weighted_penalty = max(0, avg_weighted_delay) * 0.5
            
            # Bonus per clienti con fatturato alto
            volume_bonus = min(10, total_amount / 10000)  # Max 10 punti per 100k€+
            
            # Bonus per frequenza pagamenti
            frequency_bonus = min(5, len(delays) / 10)  # Max 5 punti per 10+ fatture
            
            score = max(0.0, min(100.0, round(100.0 - delay_penalty - weighted_penalty + volume_bonus + frequency_bonus, 1)))
            
            cursor.execute("UPDATE Anagraphics SET score = ?, updated_at = ? WHERE id = ?", 
                         (score, datetime.now(), client_id))
            if cursor.rowcount > 0:
                updated_count += 1

        conn.commit()
        logging.info(f"Score calculation completed. Updated: {updated_count} clients.")
        return True
        
    except Exception as e:
        logging.error(f"Errore calcolo score: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            conn.close()

def get_commission_summary(start_date=None, end_date=None):
    """Analisi commissioni bancarie migliorata"""
    conn = None
    cols_out = ['Mese', 'Totale Commissioni', 'N. Operazioni', 'Commissione Media', 'Tipo Principale']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()

        query = """
            SELECT
                strftime('%Y-%m', transaction_date) AS month,
                SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS total_commissions,
                COUNT(id) as operation_count,
                AVG(CASE WHEN amount < 0 THEN amount ELSE NULL END) as avg_commission,
                description
            FROM BankTransactions
            WHERE transaction_date BETWEEN ? AND ?
              AND amount < 0
              AND reconciliation_status != 'Ignorato'
              AND (LOWER(description) LIKE 'commissioni%' OR
                   LOWER(description) LIKE 'competenze banc%' OR
                   LOWER(description) LIKE 'spese tenuta conto%' OR
                   LOWER(description) LIKE 'imposta di bollo%' OR
                   LOWER(description) LIKE 'canone%')
            GROUP BY month, description
            ORDER BY month;
        """
        df = pd.read_sql_query(query, conn, params=(start_str, end_str))

        if df.empty:
            return empty_df

        # Aggrega per mese
        df_monthly = df.groupby('month').agg({
            'total_commissions': 'sum',
            'operation_count': 'sum',
            'avg_commission': 'mean',
            'description': lambda x: x.value_counts().index[0]  # Tipo più frequente
        }).reset_index()

        df_monthly['TotalDec'] = df_monthly['total_commissions'].apply(lambda x: quantize(to_decimal(x)))
        df_monthly['AvgDec'] = df_monthly['avg_commission'].apply(lambda x: quantize(to_decimal(x)))

        try:
            df_monthly['Mese'] = pd.to_datetime(df_monthly['month'], format='%Y-%m').dt.strftime('%b %Y')
        except ValueError:
            df_monthly['Mese'] = df_monthly['month']

        df_monthly['Totale Commissioni'] = df_monthly['TotalDec'].apply(lambda x: f"{x.copy_abs():,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
        df_monthly['N. Operazioni'] = df_monthly['operation_count']
        df_monthly['Commissione Media'] = df_monthly['AvgDec'].apply(lambda x: f"{x.copy_abs():,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
        df_monthly['Tipo Principale'] = df_monthly['description'].str.title()

        return df_monthly[cols_out]

    except Exception as e:
        logger.error(f"Errore sommario commissioni: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_top_clients_by_revenue(start_date=None, end_date=None, limit=20):
    """Top clienti con metriche aggiuntive"""
    conn = None
    cols_out = ['ID', 'Denominazione', 'Fatturato Totale', 'N. Fatture', 'Score', 'Ticket Medio', 'Margine %']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
        
        # Query estesa con calcolo del margine
        query = """
            SELECT 
                a.id, 
                a.denomination AS Denominazione, 
                SUM(i.total_amount) AS FatturatoTotale,
                COUNT(i.id) AS NumeroFatture, 
                a.score AS ScoreCliente,
                AVG(i.total_amount) AS TicketMedio,
                -- Stima margine basata su differenza prezzi vendita vs acquisto per prodotti simili
                (SELECT AVG(
                    CASE WHEN il_sell.unit_price > 0 AND il_buy.unit_price > 0 
                    THEN ((il_sell.unit_price - il_buy.unit_price) / il_sell.unit_price) * 100 
                    ELSE NULL END
                ) FROM InvoiceLines il_sell 
                JOIN Invoices i_sell ON il_sell.invoice_id = i_sell.id
                LEFT JOIN InvoiceLines il_buy ON il_sell.description = il_buy.description
                LEFT JOIN Invoices i_buy ON il_buy.invoice_id = i_buy.id AND i_buy.type = 'Passiva'
                WHERE i_sell.anagraphics_id = a.id AND i_sell.type = 'Attiva'
                AND i_sell.doc_date BETWEEN ? AND ?
                ) AS MargineStimato
            FROM Invoices i 
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.type = 'Attiva' AND i.doc_date BETWEEN ? AND ?
            GROUP BY a.id, a.denomination, a.score 
            ORDER BY FatturatoTotale DESC LIMIT ?;
        """
        
        df = pd.read_sql_query(query, conn, params=(start_str, end_str, start_str, end_str, limit))

        if df.empty:
            return empty_df

        df['Fatturato Totale'] = df['FatturatoTotale'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['N. Fatture'] = df['NumeroFatture']
        df['Score'] = df['ScoreCliente'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else 'N/D')
        df['Ticket Medio'] = df['TicketMedio'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['Margine %'] = df['MargineStimato'].apply(lambda x: f"{x:.1f}%" if pd.notna(x) and x > 0 else 'N/D')
        df['ID'] = df['id']
        
        return df[cols_out]
        
    except Exception as e:
        logging.error(f"Errore top clienti: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_clients_by_score(order='DESC', limit=20):
    """Clienti ordinati per score con info aggiuntive"""
    conn = None
    cols_out = ['ID', 'Denominazione', 'P.IVA', 'C.F.', 'Città', 'Score', 'Ultimo Ordine', 'Fatturato YTD']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        sort_order = "ASC" if order.upper() == 'ASC' else "DESC"
        nulls_placement = "NULLS LAST" if sort_order == "DESC" else "NULLS FIRST"
        
        current_year = date.today().year
        
        query = f"""
            SELECT 
                a.id, 
                a.denomination, 
                a.piva, 
                a.cf, 
                a.city, 
                a.score,
                MAX(i.doc_date) as ultimo_ordine,
                SUM(CASE WHEN strftime('%Y', i.doc_date) = '{current_year}' THEN i.total_amount ELSE 0 END) as fatturato_ytd
            FROM Anagraphics a
            LEFT JOIN Invoices i ON a.id = i.anagraphics_id AND i.type = 'Attiva'
            WHERE a.type = 'Cliente'
            GROUP BY a.id, a.denomination, a.piva, a.cf, a.city, a.score
            ORDER BY a.score {sort_order} {nulls_placement}, a.denomination COLLATE NOCASE
            LIMIT ?;
        """
        
        df = pd.read_sql_query(query, conn, params=(limit,))

        if df.empty:
            return empty_df

        df['ID'] = df['id']
        df['Denominazione'] = df['denomination']
        df['P.IVA'] = df['piva'].fillna('')
        df['C.F.'] = df['cf'].fillna('')
        df['Città'] = df['city'].fillna('')
        df['Score'] = df['score'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else 'N/D')
        df['Ultimo Ordine'] = pd.to_datetime(df['ultimo_ordine'], errors='coerce').dt.strftime('%d/%m/%Y').fillna('Mai')
        df['Fatturato YTD'] = df['fatturato_ytd'].apply(lambda x: f"{quantize(to_decimal(x)):,.0f}€" if pd.notna(x) and x > 0 else '0€')
        
        return df[cols_out]
        
    except Exception as e:
        logging.error(f"Errore clienti per score: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_product_monthly_sales(normalized_description, start_date=None, end_date=None):
    """Vendite mensili prodotto con trend analysis"""
    conn = None
    cols_out = ['Mese', 'Quantità', 'Valore', 'Prezzo Medio', 'Trend %']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=2))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()

        query_all_lines = """
            SELECT 
                i.doc_date, 
                il.description, 
                il.quantity, 
                il.total_price,
                il.unit_price
            FROM InvoiceLines il 
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = 'Attiva' AND i.doc_date BETWEEN ? AND ?
              AND il.description IS NOT NULL AND TRIM(il.description) != '';
        """
        
        df_lines = pd.read_sql_query(query_all_lines, conn, params=(start_str, end_str), parse_dates=['doc_date'])

        if df_lines.empty:
            return empty_df

        df_lines['normalized_product'] = df_lines['description'].apply(normalize_product_name)
        df_filtered = df_lines[df_lines['normalized_product'] == normalized_description].copy()

        if df_filtered.empty:
            return empty_df

        df_filtered['month'] = df_filtered['doc_date'].dt.strftime('%Y-%m')
        
        # Converti a Decimal
        df_filtered['quantity_dec'] = df_filtered['quantity'].apply(lambda x: to_decimal(x, default='NaN'))
        df_filtered['total_price_dec'] = df_filtered['total_price'].apply(lambda x: to_decimal(x, default='NaN'))
        df_filtered['unit_price_dec'] = df_filtered['unit_price'].apply(lambda x: to_decimal(x, default='NaN'))

        df_monthly = df_filtered.groupby('month').agg(
            monthly_quantity=('quantity_dec', lambda x: x.dropna().sum()),
            monthly_value=('total_price_dec', lambda x: x.dropna().sum()),
            avg_unit_price=('unit_price_dec', lambda x: x.dropna().mean())
        ).reset_index().sort_values(by='month')

        # Calcola trend percentuale mese su mese
        df_monthly['trend_percent'] = df_monthly['monthly_value'].pct_change() * 100

        try:
            df_monthly['Mese'] = pd.to_datetime(df_monthly['month'], format='%Y-%m').dt.strftime('%b %Y')
        except:
            df_monthly['Mese'] = df_monthly['month']
            
        df_monthly['Quantità'] = df_monthly['monthly_quantity'].apply(lambda x: f"{quantize(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if x.is_finite() else '0,00')
        df_monthly['Valore'] = df_monthly['monthly_value'].apply(lambda x: f"{quantize(x):,.2f}€")
        df_monthly['Prezzo Medio'] = df_monthly['avg_unit_price'].apply(lambda x: f"{quantize(x):,.2f}€" if x.is_finite() else '0,00€')
        df_monthly['Trend %'] = df_monthly['trend_percent'].apply(lambda x: f"{x:+.1f}%" if pd.notna(x) else 'N/D')
        
        return df_monthly[cols_out]
        
    except Exception as e:
        logger.error(f"Errore vendite mensili '{normalized_description}': {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_product_sales_comparison(normalized_description, year1, year2):
    """Confronto vendite prodotto tra due anni con analisi dettagliata"""
    conn = None
    qty_col1, val_col1 = f'Q.tà {year1}', f'Valore {year1}'
    qty_col2, val_col2 = f'Q.tà {year2}', f'Valore {year2}'
    cols_final = ['Mese', qty_col1, val_col1, qty_col2, val_col2, 'Var. Valore %', 'Var. Q.tà %']
    empty_df = pd.DataFrame(columns=cols_final)

    if not normalized_description or not year1 or not year2:
        return empty_df

    try:
        conn = get_connection()
        
        query = """
            SELECT 
                strftime('%m', i.doc_date) AS month_num,
                strftime('%Y', i.doc_date) AS year,
                il.description,
                il.quantity,
                il.total_price
            FROM InvoiceLines il 
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = 'Attiva'
              AND strftime('%Y', i.doc_date) IN (?, ?)
              AND il.description IS NOT NULL AND TRIM(il.description) != '';
        """
        
        df = pd.read_sql_query(query, conn, params=(str(year1), str(year2)))

        if df.empty:
            return empty_df

        df['normalized_product'] = df['description'].apply(normalize_product_name)
        df_filtered = df[df['normalized_product'] == normalized_description].copy()

        if df_filtered.empty:
            return empty_df

        # Converti a Decimal
        df_filtered['quantity_dec'] = df_filtered['quantity'].apply(lambda x: to_decimal(x, default='NaN'))
        df_filtered['total_price_dec'] = df_filtered['total_price'].apply(lambda x: to_decimal(x, default='NaN'))

        df_agg = df_filtered.groupby(['year', 'month_num']).agg(
            total_quantity=('quantity_dec', lambda x: x.dropna().sum()),
            total_value=('total_price_dec', lambda x: x.dropna().sum())
        ).reset_index()

        df_pivot_qty = df_agg.pivot_table(index='month_num', columns='year', values='total_quantity', fill_value=Decimal('0.0'))
        df_pivot_val = df_agg.pivot_table(index='month_num', columns='year', values='total_value', fill_value=Decimal('0.0'))

        df_pivot_qty.rename(columns={str(year1): qty_col1, str(year2): qty_col2}, inplace=True)
        df_pivot_val.rename(columns={str(year1): val_col1, str(year2): val_col2}, inplace=True)

        df_comparison = pd.merge(df_pivot_qty, df_pivot_val, left_index=True, right_index=True, how='outer').fillna(Decimal('0.0'))

        # Assicura che tutte le colonne esistano
        for col in [qty_col1, val_col1, qty_col2, val_col2]:
            if col not in df_comparison.columns:
                df_comparison[col] = Decimal('0.0')

        # Calcola variazioni percentuali prima di formattare
        df_comparison['var_valore'] = np.where(
            df_comparison[val_col1] > 0,
            ((df_comparison[val_col2] - df_comparison[val_col1]) / df_comparison[val_col1]) * 100,
            np.nan
        )
        
        df_comparison['var_quantita'] = np.where(
            df_comparison[qty_col1] > 0,
            ((df_comparison[qty_col2] - df_comparison[qty_col1]) / df_comparison[qty_col1]) * 100,
            np.nan
        )

        # Formatta le colonne numeriche
        for col in [qty_col1, qty_col2]:
            df_comparison[col] = df_comparison[col].apply(lambda x: f"{quantize(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if x.is_finite() else '0,00')
        for col in [val_col1, val_col2]:
            df_comparison[col] = df_comparison[col].apply(lambda x: f"{quantize(x):,.2f}€")

        df_comparison['Var. Valore %'] = df_comparison['var_valore'].apply(lambda x: f"{x:+.1f}%" if pd.notna(x) else 'N/D')
        df_comparison['Var. Q.tà %'] = df_comparison['var_quantita'].apply(lambda x: f"{x:+.1f}%" if pd.notna(x) else 'N/D')

        # Mappa mesi
        month_map = {'01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mag', '06': 'Giu', 
                    '07': 'Lug', '08': 'Ago', '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic'}
        df_comparison['Mese'] = df_comparison.index.map(month_map)
        
        # Ordina per mese
        df_comparison['month_num_int'] = df_comparison.index.astype(int)
        df_comparison = df_comparison.sort_values(by='month_num_int').drop(columns=['month_num_int', 'var_valore', 'var_quantita'])

        return df_comparison[cols_final]

    except Exception as e:
        logger.error(f"Errore comparazione vendite '{normalized_description}' ({year1} vs {year2}): {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_aging_summary(invoice_type='Attiva'):
    """Aging analysis con classificazione migliorata"""
    conn = None
    today = date.today()
    
    # Buckets più granulari per business frutta e verdura
    buckets = {
        'Non Scaduto': 0, 
        '1-7 gg': 7, 
        '8-15 gg': 15,
        '16-30 gg': 30, 
        '31-60 gg': 60, 
        '61-90 gg': 90, 
        '>90 gg': float('inf')
    }
    
    aging_summary = {label: {'amount': Decimal('0.0'), 'count': 0} for label in buckets}

    try:
        conn = get_connection()
        
        query = """
            SELECT id, due_date, total_amount, paid_amount, doc_number, anagraphics_id
            FROM Invoices
            WHERE type = ? AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
        """
        
        cursor = conn.cursor()
        cursor.execute(query, (invoice_type,))
        rows = cursor.fetchall()

        for row in rows:
            total_dec = to_decimal(row['total_amount'])
            paid_dec = to_decimal(row['paid_amount'])
            open_amount = quantize(total_dec - paid_dec)

            if open_amount.copy_abs() <= AMOUNT_TOLERANCE / 2:
                continue

            days_overdue = -1
            due_date_value = row['due_date']

            if due_date_value:
                try:
                    if isinstance(due_date_value, str):
                        due_date_obj = date.fromisoformat(due_date_value)
                    elif isinstance(due_date_value, date):
                        due_date_obj = due_date_value
                    elif isinstance(due_date_value, datetime):
                        due_date_obj = due_date_value.date()
                    else:
                        pd_date = pd.to_datetime(due_date_value, errors='coerce')
                        if pd.notna(pd_date):
                            due_date_obj = pd_date.date()
                        else:
                            continue

                    if due_date_obj and due_date_obj <= today:
                        days_overdue = (today - due_date_obj).days

                except (ValueError, TypeError) as date_err:
                    logger.warning(f"Errore conversione data scadenza per aging (ID: {row['id']}): {date_err}")
                    continue

            # Assegna al bucket appropriato
            assigned_bucket = None
            if days_overdue < 0:
                assigned_bucket = 'Non Scaduto'
            else:
                for label, upper_limit in buckets.items():
                    if label != 'Non Scaduto' and days_overdue <= upper_limit:
                        assigned_bucket = label
                        break

            if assigned_bucket:
                aging_summary[assigned_bucket]['amount'] += open_amount
                aging_summary[assigned_bucket]['count'] += 1

        return aging_summary
        
    except Exception as e:
        logging.error(f"Errore calcolo aging ({invoice_type}): {e}", exc_info=True)
        return {}
    finally:
        if conn:
            conn.close()

def get_top_suppliers_by_cost(start_date=None, end_date=None, limit=20):
    """Top fornitori con analisi performance"""
    conn = None
    cols_out = ['ID', 'Denominazione', 'Costo Totale', 'N. Fatture', 'Ticket Medio', 'Giorni Medi Pag.', 'Affidabilità']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
        
        query = """
            SELECT 
                a.id, 
                a.denomination AS Denominazione, 
                SUM(i.total_amount) AS CostoTotale,
                COUNT(i.id) AS NumeroFatture,
                AVG(i.total_amount) AS TicketMedio,
                AVG(CASE 
                    WHEN i.payment_status = 'Pagata Tot.' AND i.due_date IS NOT NULL 
                    THEN julianday(
                        (SELECT MAX(bt.transaction_date) FROM BankTransactions bt 
                         JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id 
                         WHERE rl.invoice_id = i.id)
                    ) - julianday(i.due_date)
                    ELSE NULL 
                END) AS GiorniMediPagamento,
                COUNT(CASE WHEN i.payment_status = 'Pagata Tot.' THEN 1 END) * 100.0 / COUNT(i.id) AS PercentualePagata
            FROM Invoices i 
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.type = 'Passiva' AND i.doc_date BETWEEN ? AND ?
            GROUP BY a.id, a.denomination 
            ORDER BY CostoTotale DESC LIMIT ?;
        """
        
        df = pd.read_sql_query(query, conn, params=(start_str, end_str, limit))

        if df.empty:
            return empty_df

        df['Costo Totale'] = df['CostoTotale'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['N. Fatture'] = df['NumeroFatture']
        df['Ticket Medio'] = df['TicketMedio'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['Giorni Medi Pag.'] = df['GiorniMediPagamento'].apply(lambda x: f"{x:.0f}" if pd.notna(x) else 'N/D')
        
        # Score affidabilità basato su % pagamento e puntualità
        df['Affidabilità'] = df.apply(lambda row: 
            'Eccellente' if row['PercentualePagata'] >= 95 and (pd.isna(row['GiorniMediPagamento']) or row['GiorniMediPagamento'] <= 0)
            else 'Buona' if row['PercentualePagata'] >= 80
            else 'Media' if row['PercentualePagata'] >= 60
            else 'Scarsa', axis=1)
        
        df['ID'] = df['id']
        
        return df[cols_out]
        
    except Exception as e:
        logging.error(f"Errore top fornitori: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_dashboard_kpis():
    """KPI dashboard con metriche specifiche per ingrosso frutta e verdura"""
    conn = None
    kpis = {
        'total_receivables': Decimal('0.0'),
        'total_payables': Decimal('0.0'),
        'overdue_receivables_count': 0,
        'overdue_receivables_amount': Decimal('0.0'),
        'overdue_payables_count': 0,
        'overdue_payables_amount': Decimal('0.0'),
        'revenue_ytd': Decimal('0.0'),
        'revenue_prev_year_ytd': Decimal('0.0'),
        'revenue_yoy_change_ytd': None,
        'gross_margin_ytd': Decimal('0.0'),
        'margin_percent_ytd': None,
        'avg_days_to_payment': None,
        'inventory_turnover_estimate': None,
        'active_customers_month': 0,
        'new_customers_month': 0
    }
    
    today = date.today()
    today_str = today.isoformat()
    start_of_year = date(today.year, 1, 1).isoformat()
    start_of_prev_year_period = date(today.year - 1, 1, 1).isoformat()
    end_of_prev_year_period = date(today.year - 1, today.month, today.day).isoformat()
    start_of_month = date(today.year, today.month, 1).isoformat()

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # KPI esistenti - crediti e debiti aperti
        cursor.execute("""
            SELECT type, SUM(total_amount - paid_amount) as open_balance
            FROM Invoices
            WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
            GROUP BY type;
        """)
        for row in cursor.fetchall():
            open_bal = quantize(to_decimal(row['open_balance']))
            if row['type'] == 'Attiva':
                kpis['total_receivables'] = open_bal
            elif row['type'] == 'Passiva':
                kpis['total_payables'] = open_bal

        # Scaduti
        cursor.execute("""
            SELECT type,
                   SUM(CASE WHEN due_date < ? THEN (total_amount - paid_amount) ELSE 0 END) as overdue_amount,
                   SUM(CASE WHEN due_date < ? THEN 1 ELSE 0 END) as overdue_count
            FROM Invoices
            WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND due_date IS NOT NULL
            GROUP BY type;
        """, (today_str, today_str))
        for row in cursor.fetchall():
            overdue_bal = quantize(to_decimal(row['overdue_amount']))
            overdue_count = row['overdue_count'] if row['overdue_count'] else 0
            if row['type'] == 'Attiva':
                kpis['overdue_receivables_count'] = overdue_count
                kpis['overdue_receivables_amount'] = overdue_bal
            elif row['type'] == 'Passiva':
                kpis['overdue_payables_count'] = overdue_count
                kpis['overdue_payables_amount'] = overdue_bal

        # Revenue YTD
        cursor.execute("""
            SELECT SUM(total_amount) as revenue_ytd
            FROM Invoices
            WHERE type = 'Attiva' AND doc_date >= ? AND doc_date <= ?
        """, (start_of_year, today_str))
        ytd_data = cursor.fetchone()
        if ytd_data and ytd_data['revenue_ytd'] is not None:
            kpis['revenue_ytd'] = quantize(to_decimal(ytd_data['revenue_ytd']))

        # Revenue anno precedente
        cursor.execute("""
            SELECT SUM(total_amount) as revenue_prev_year_ytd
            FROM Invoices
            WHERE type = 'Attiva' AND doc_date BETWEEN ? AND ?
        """, (start_of_prev_year_period, end_of_prev_year_period))
        prev_ytd_data = cursor.fetchone()
        if prev_ytd_data and prev_ytd_data['revenue_prev_year_ytd'] is not None:
            kpis['revenue_prev_year_ytd'] = quantize(to_decimal(prev_ytd_data['revenue_prev_year_ytd']))

        # Calcola YoY change
        if kpis['revenue_prev_year_ytd'] != Decimal('0.0'):
            try:
                change = ((kpis['revenue_ytd'] - kpis['revenue_prev_year_ytd']) / kpis['revenue_prev_year_ytd']) * 100
                kpis['revenue_yoy_change_ytd'] = round(float(change), 1)
            except Exception:
                kpis['revenue_yoy_change_ytd'] = None

        # Costi YTD per calcolare margine
        cursor.execute("""
            SELECT SUM(total_amount) as costs_ytd
            FROM Invoices
            WHERE type = 'Passiva' AND doc_date >= ? AND doc_date <= ?
        """, (start_of_year, today_str))
        costs_data = cursor.fetchone()
        if costs_data and costs_data['costs_ytd'] is not None:
            costs_ytd = quantize(to_decimal(costs_data['costs_ytd']))
            kpis['gross_margin_ytd'] = kpis['revenue_ytd'] - costs_ytd
            if kpis['revenue_ytd'] > 0:
                kpis['margin_percent_ytd'] = round(float((kpis['gross_margin_ytd'] / kpis['revenue_ytd']) * 100), 1)

        # Giorni medi di pagamento - QUERY CORRETTA
        cursor.execute("""
            SELECT AVG(payment_delay) as avg_payment_days
            FROM (
                SELECT 
                    i.id,
                    julianday(MAX(bt.transaction_date)) - julianday(i.due_date) as payment_delay
                FROM Invoices i
                JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                WHERE i.type = 'Attiva' 
                  AND i.payment_status = 'Pagata Tot.'
                  AND i.due_date IS NOT NULL
                  AND i.doc_date >= ?
                GROUP BY i.id, i.due_date
            )
        """, (start_of_year,))
        payment_days_data = cursor.fetchone()
        if payment_days_data and payment_days_data['avg_payment_days'] is not None:
            kpis['avg_days_to_payment'] = round(payment_days_data['avg_payment_days'], 1)

        # Stima rotazione inventario (vendite/acquisti ratio)
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN i.type = 'Attiva' THEN il.quantity ELSE 0 END) as total_sold,
                SUM(CASE WHEN i.type = 'Passiva' THEN il.quantity ELSE 0 END) as total_purchased
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.doc_date >= ?
              AND il.quantity > 0
        """, (start_of_year,))
        inventory_data = cursor.fetchone()
        if inventory_data and inventory_data['total_purchased'] and inventory_data['total_purchased'] > 0:
            turnover = inventory_data['total_sold'] / inventory_data['total_purchased']
            kpis['inventory_turnover_estimate'] = round(turnover, 2)

        # Clienti attivi nel mese corrente
        cursor.execute("""
            SELECT COUNT(DISTINCT anagraphics_id) as active_customers
            FROM Invoices
            WHERE type = 'Attiva' 
              AND doc_date >= ?
              AND doc_date <= ?
        """, (start_of_month, today_str))
        active_data = cursor.fetchone()
        if active_data:
            kpis['active_customers_month'] = active_data['active_customers'] or 0

        # Nuovi clienti nel mese (prima fattura)
        cursor.execute("""
            SELECT COUNT(*) as new_customers
            FROM (
                SELECT anagraphics_id, MIN(doc_date) as first_invoice
                FROM Invoices
                WHERE type = 'Attiva'
                GROUP BY anagraphics_id
                HAVING first_invoice >= ? AND first_invoice <= ?
            )
        """, (start_of_month, today_str))
        new_data = cursor.fetchone()
        if new_data:
            kpis['new_customers_month'] = new_data['new_customers'] or 0

        logger.debug(f"KPI Dashboard calcolati: {kpis}")
        return kpis
        
    except Exception as e:
        logger.error(f"Errore calcolo KPI dashboard: {e}", exc_info=True)
        return kpis
    finally:
        if conn:
            conn.close()

def get_top_overdue_invoices(limit=10):
    """Top fatture scadute con priorità business"""
    conn = None
    today_py = date.today()
    cols_out = ['id', 'type', 'doc_number', 'due_date_fmt', 'counterparty_name', 'open_amount_fmt', 'days_overdue', 'priority']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        
        query = """
            SELECT
                i.id, i.type, i.doc_number, i.due_date,
                a.denomination AS counterparty_name,
                (i.total_amount - i.paid_amount) AS open_amount_raw,
                a.score as customer_score
            FROM Invoices i 
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE i.type = 'Attiva'
              AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND i.due_date IS NOT NULL 
              AND date(i.due_date) < date(?)
            ORDER BY date(i.due_date) ASC
            LIMIT ?;
        """
        
        df = pd.read_sql_query(query, conn, params=(today_py.isoformat(), limit * 2), parse_dates=['due_date'])

        if df is None or df.empty:
            return empty_df

        df['open_amount_dec'] = df['open_amount_raw'].apply(to_decimal).apply(quantize)
        df = df[df['open_amount_dec'].abs() > AMOUNT_TOLERANCE / 2].copy()
        
        if df.empty:
            return empty_df

        df['due_date_fmt'] = df['due_date'].dt.strftime('%d/%m/%Y')
        df['days_overdue'] = (today_py - df['due_date'].dt.date).apply(lambda x: x.days if pd.notna(x) else pd.NA)
        df['open_amount_fmt'] = df['open_amount_dec'].apply(lambda x: f"{x:,.2f}€")

        # Calcola priorità basata su importo, giorni di ritardo e score cliente
        df['priority_score'] = (
            (df['open_amount_dec'].astype(float) / 1000) * 0.4 +  # Peso importo
            (df['days_overdue'].fillna(0) / 10) * 0.4 +  # Peso giorni ritardo
            ((100 - df['customer_score'].fillna(50)) / 20) * 0.2  # Peso score cliente (inverso)
        )

        # Classifica priorità
        df['priority'] = pd.cut(
            df['priority_score'],
            bins=[0, 2, 5, 10, float('inf')],
            labels=['Bassa', 'Media', 'Alta', 'Critica']
        )

        # Ordina per priorità e giorni di ritardo
        df_sorted = df.sort_values(['priority_score'], ascending=False).head(limit)

        return df_sorted[cols_out]
        
    except Exception as e:
        logger.error(f"Errore recupero top fatture scadute: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_due_dates_in_month(year, month):
    """Date con scadenze nel mese per calendario"""
    conn = None
    try:
        conn = get_connection()
        start_date = date(year, month, 1)
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)
        start_str, end_str = start_date.isoformat(), end_date.isoformat()
        
        query = """
            SELECT DISTINCT date(due_date) as due_day
            FROM Invoices
            WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND due_date BETWEEN ? AND ?
            ORDER BY due_day;
        """
        
        cursor = conn.cursor()
        cursor.execute(query, (start_str, end_str))
        dates = [date.fromisoformat(row['due_day']) for row in cursor.fetchall() if row['due_day']]
        return dates
        
    except Exception as e:
        logger.error(f"Errore recupero date scadenza per {year}-{month}: {e}", exc_info=True)
        return []
    finally:
        if conn:
            conn.close()

def get_invoices_due_on_date(due_date_py):
    """Fatture in scadenza in una data specifica"""
    conn = None
    today_py = date.today()
    cols_out = ['id', 'type', 'doc_number', 'counterparty_name', 'open_amount_fmt', 'days_overdue']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        due_date_str = due_date_py.isoformat()
        
        query = """
            SELECT
                i.id, i.type, i.doc_number, a.denomination AS counterparty_name,
                (i.total_amount - i.paid_amount) AS open_amount_raw,
                i.due_date
            FROM Invoices i 
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE date(i.due_date) = date(?)
              AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
            ORDER BY a.denomination COLLATE NOCASE, i.type;
        """
        
        df = pd.read_sql_query(query, conn, params=(due_date_str,), parse_dates=['due_date'])

        if df is None or df.empty:
            return empty_df

        df['open_amount_dec'] = df['open_amount_raw'].apply(to_decimal).apply(quantize)
        df = df[df['open_amount_dec'].abs() > AMOUNT_TOLERANCE / 2].copy()
        
        if df.empty:
            return empty_df

        df['days_overdue'] = (today_py - df['due_date'].dt.date).apply(lambda x: x.days if pd.notna(x) else pd.NA)
        df['open_amount_fmt'] = df['open_amount_dec'].apply(lambda x: f"{x:,.2f}€")

        return df[cols_out]
        
    except Exception as e:
        logger.error(f"Errore recupero fatture per scadenza {due_date_str}: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_anagraphic_financial_summary(anagraphic_id):
    """Sommario finanziario anagrafica con metriche avanzate"""
    summary = {
        'total_invoiced': Decimal('0.0'),
        'total_paid': Decimal('0.0'),
        'open_balance': Decimal('0.0'),
        'overdue_amount': Decimal('0.0'),
        'overdue_count': 0,
        'avg_payment_days': None,
        'avg_order_value_ytd': None,
        'avg_order_value_prev_year': None,
        'revenue_ytd': Decimal('0.0'),
        'revenue_prev_year': Decimal('0.0'),
        'revenue_yoy_change': None,
        'order_frequency': None,
        'last_order_date': None,
        'customer_segment': None,
        'preferred_products': []
    }
    
    conn = None
    today = date.today()
    today_str = today.isoformat()
    start_of_year = date(today.year, 1, 1).isoformat()
    start_of_prev_year = date(today.year - 1, 1, 1).isoformat()
    end_of_prev_year = date(today.year - 1, 12, 31).isoformat()

    if anagraphic_id is None:
        return summary

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Dati base
        cursor.execute("""
            SELECT
                SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END) as total_cost,
                SUM(CASE WHEN type = 'Attiva' THEN paid_amount ELSE 0 END) as total_received,
                COUNT(CASE WHEN type = 'Attiva' THEN 1 END) as total_invoices,
                MAX(CASE WHEN type = 'Attiva' THEN doc_date END) as last_order_date
            FROM Invoices
            WHERE anagraphics_id = ?
        """, (anagraphic_id,))
        
        totals = cursor.fetchone()
        if totals:
            summary['total_invoiced'] = quantize(to_decimal(totals['total_revenue'])) if totals['total_revenue'] else Decimal('0.0')
            summary['total_paid'] = quantize(to_decimal(totals['total_received'])) if totals['total_received'] else Decimal('0.0')
            summary['open_balance'] = summary['total_invoiced'] - summary['total_paid']
            summary['last_order_date'] = totals['last_order_date']
            
            # Frequenza ordini (ordini per mese negli ultimi 12 mesi)
            if totals['total_invoices'] and totals['last_order_date']:
                last_order = pd.to_datetime(totals['last_order_date']).date()
                months_active = max(1, (today - last_order).days / 30)
                summary['order_frequency'] = round(totals['total_invoices'] / months_active, 2)

        # Scaduti
        cursor.execute("""
            SELECT 
                SUM(total_amount - paid_amount) as overdue_amount,
                COUNT(*) as overdue_count
            FROM Invoices
            WHERE anagraphics_id = ?
              AND type = 'Attiva'
              AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND due_date < ?
        """, (anagraphic_id, today_str))
        
        overdue_data = cursor.fetchone()
        if overdue_data:
            summary['overdue_amount'] = quantize(to_decimal(overdue_data['overdue_amount'])) if overdue_data['overdue_amount'] else Decimal('0.0')
            summary['overdue_count'] = overdue_data['overdue_count'] or 0

        # YTD e anno precedente
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN doc_date >= ? AND doc_date <= ? THEN total_amount ELSE 0 END) as revenue_ytd,
                COUNT(CASE WHEN doc_date >= ? AND doc_date <= ? THEN 1 END) as count_ytd,
                SUM(CASE WHEN doc_date BETWEEN ? AND ? THEN total_amount ELSE 0 END) as revenue_prev_year,
                COUNT(CASE WHEN doc_date BETWEEN ? AND ? THEN 1 END) as count_prev_year
            FROM Invoices
            WHERE anagraphics_id = ? AND type = 'Attiva'
        """, (start_of_year, today_str, start_of_year, today_str, 
              start_of_prev_year, end_of_prev_year, start_of_prev_year, end_of_prev_year, anagraphic_id))
        
        yearly_data = cursor.fetchone()
        if yearly_data:
            summary['revenue_ytd'] = quantize(to_decimal(yearly_data['revenue_ytd'])) if yearly_data['revenue_ytd'] else Decimal('0.0')
            summary['revenue_prev_year'] = quantize(to_decimal(yearly_data['revenue_prev_year'])) if yearly_data['revenue_prev_year'] else Decimal('0.0')
            
            if yearly_data['count_ytd'] and yearly_data['count_ytd'] > 0:
                summary['avg_order_value_ytd'] = quantize(summary['revenue_ytd'] / Decimal(yearly_data['count_ytd']))
            if yearly_data['count_prev_year'] and yearly_data['count_prev_year'] > 0:
                summary['avg_order_value_prev_year'] = quantize(summary['revenue_prev_year'] / Decimal(yearly_data['count_prev_year']))
            
            # YoY change
            if summary['revenue_prev_year'] > 0:
                change = ((summary['revenue_ytd'] - summary['revenue_prev_year']) / summary['revenue_prev_year']) * 100
                summary['revenue_yoy_change'] = round(float(change), 1)

        # Giorni medi di pagamento dallo score
        cursor.execute("SELECT score FROM Anagraphics WHERE id = ?", (anagraphic_id,))
        score_row = cursor.fetchone()
        if score_row and score_row['score'] is not None and score_row['score'] < 100:
            summary['avg_payment_days'] = round((100.0 - score_row['score']) / 1.5)

        # Segmentazione cliente basata su revenue YTD
        revenue_ytd_float = float(summary['revenue_ytd'])
        if revenue_ytd_float >= 100000:
            summary['customer_segment'] = 'Platinum'
        elif revenue_ytd_float >= 50000:
            summary['customer_segment'] = 'Gold'
        elif revenue_ytd_float >= 10000:
            summary['customer_segment'] = 'Silver'
        elif revenue_ytd_float > 0:
            summary['customer_segment'] = 'Bronze'
        else:
            summary['customer_segment'] = 'Inactive'

        # Top 3 prodotti preferiti (ultimi 6 mesi)
        six_months_ago = (today - relativedelta(months=6)).isoformat()
        cursor.execute("""
            SELECT 
                il.description,
                SUM(il.total_price) as total_value,
                SUM(il.quantity) as total_quantity
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.anagraphics_id = ?
              AND i.type = 'Attiva'
              AND i.doc_date >= ?
              AND il.description IS NOT NULL
            GROUP BY il.description
            ORDER BY total_value DESC
            LIMIT 3
        """, (anagraphic_id, six_months_ago))
        
        preferred_products = cursor.fetchall()
        summary['preferred_products'] = [
            {
                'product': row['description'],
                'value': f"{quantize(to_decimal(row['total_value'])):,.2f}€",
                'quantity': f"{quantize(to_decimal(row['total_quantity'])):,.2f}"
            }
            for row in preferred_products
        ]

    except Exception as e:
        logger.error(f"Errore sommario finanziario per ID {anagraphic_id}: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

    return summary

# ===== FUNZIONI DI SUPPORTO PER BUSINESS INTELLIGENCE =====

def get_business_insights_summary(start_date=None, end_date=None):
    """Riepilogo insights business per dashboard executive"""
    insights = {
        'seasonal_trends': {},
        'top_performing_products': [],
        'cash_flow_health': '',
        'customer_retention': 0.0,
        'inventory_alerts': [],
        'profitability_trend': '',
        'recommendations': []
    }
    
    try:
        # Analisi stagionalità
        seasonal_data = get_seasonal_product_analysis('all', 2)
        if not seasonal_data.empty:
            # Identifica mese con maggiori vendite
            monthly_sales = seasonal_data.groupby('month_num')['total_value'].sum()
            peak_month = monthly_sales.idxmax()
            insights['seasonal_trends']['peak_month'] = peak_month
            insights['seasonal_trends']['peak_value'] = f"{monthly_sales[peak_month]:,.2f}€"
        
        # Cash flow health
        cashflow_data = get_cashflow_data(start_date, end_date)
        if not cashflow_data.empty:
            avg_net_flow = cashflow_data['net_cash_flow'].mean()
            if avg_net_flow > 10000:
                insights['cash_flow_health'] = 'Eccellente'
            elif avg_net_flow > 5000:
                insights['cash_flow_health'] = 'Buono'
            elif avg_net_flow > 0:
                insights['cash_flow_health'] = 'Stabile'
            else:
                insights['cash_flow_health'] = 'Critico'
        
        # Prodotti top performance
        products_analysis = get_products_analysis('Attiva', start_date, end_date)
        if not products_analysis.empty:
            insights['top_performing_products'] = products_analysis.head(5)['Prodotto Normalizzato'].tolist()
        
        # Raccomandazioni basate sui dati
        recommendations = []
        
        # Raccomandazione su stagionalità
        if 'peak_month' in insights['seasonal_trends']:
            peak = insights['seasonal_trends']['peak_month']
            if peak in ['11', '12', '01']:  # Inverno
                recommendations.append("Incrementa stock agrumi e verdure invernali per il periodo di picco")
            elif peak in ['06', '07', '08']:  # Estate
                recommendations.append("Pianifica maggiori approvvigionamenti frutta estiva")
        
        # Raccomandazione su cash flow
        if insights['cash_flow_health'] == 'Critico':
            recommendations.append("Rivedere termini di pagamento clienti e ottimizzare incassi")
        
        insights['recommendations'] = recommendations
        
        return insights
        
    except Exception as e:
        logger.error(f"Errore generazione business insights: {e}", exc_info=True)
        return insights

def export_analysis_to_excel(analysis_type, data, filename=None):
    """Esporta analisi in formato Excel per condivisione"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analisi_{analysis_type}_{timestamp}.xlsx"
    
    try:
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            if isinstance(data, dict):
                for sheet_name, df in data.items():
                    if isinstance(df, pd.DataFrame) and not df.empty:
                        df.to_excel(writer, sheet_name=sheet_name[:31], index=False)  # Max 31 chars per sheet name
            elif isinstance(data, pd.DataFrame) and not data.empty:
                data.to_excel(writer, sheet_name='Analisi', index=False)
        
        logger.info(f"Analisi esportata in: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"Errore esportazione Excel: {e}", exc_info=True)
        return None

# ===== FUNZIONI ORIGINALI MANTENUTE E MIGLIORATE =====

def _get_categorized_transactions(start_date_str, end_date_str):
    """Categorizzazione transazioni migliorata per business frutta e verdura"""
    conn = None
    try:
        conn = get_connection()
        query_trans = """
            SELECT
                bt.id as transaction_id,
                bt.transaction_date,
                bt.amount,
                bt.description,
                GROUP_CONCAT(rl.id) as link_ids,
                GROUP_CONCAT(i.type) as linked_invoice_types,
                SUM(rl.reconciled_amount) as total_linked_amount
            FROM BankTransactions bt
            LEFT JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id
            LEFT JOIN Invoices i ON rl.invoice_id = i.id
            WHERE bt.transaction_date BETWEEN ? AND ?
              AND bt.reconciliation_status != 'Ignorato'
            GROUP BY bt.id, bt.transaction_date, bt.amount, bt.description
            ORDER BY bt.transaction_date;
        """
        df = pd.read_sql_query(query_trans, conn, params=(start_date_str, end_date_str), parse_dates=['transaction_date'])

        if df.empty:
            logger.info("Nessuna transazione trovata nel periodo per la categorizzazione.")
            return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])

        df['amount_dec'] = df['amount'].apply(lambda x: quantize(to_decimal(x)))
        df['category'] = 'Altro'

        # Pattern migliorati per business frutta e verdura
        pos_pattern = r'\b(POS|PAGOBANCOMAT|CIRRUS|MAESTRO|VISA|MASTERCARD|AMEX|WORLDLINE|ESE COMM)\b'
        cash_pattern = r'(VERSAMENTO CONTANT|CONTANTI|CASSA)'
        commission_pattern = r'^(COMMISSIONI|COMPETENZE BANC|SPESE TENUTA CONTO|IMPOSTA DI BOLLO)'
        fuel_pattern = r'(BENZINA|GASOLIO|CARBURANTE|DISTRIBUTORE|ENI|AGIP|Q8)'
        transport_pattern = r'(AUTOSTRADA|PEDAGGI|TELEPASS|TRASPORT)'
        utilities_pattern = r'(ENEL|GAS|ACQUA|TELEFON|INTERNET|TIM|VODAFONE)'
        taxes_pattern = r'(F24|TRIBUTI|INPS|INAIL|AGENZIA ENTRATE)'
        bank_fees_pattern = r'(CANONE|BOLLO|COMMISSIONI)'

        for index, row in df.iterrows():
            trans_id = row['transaction_id']
            amount = row['amount_dec']
            desc = str(row['description'] or '').upper()
            has_links = pd.notna(row['link_ids'])
            linked_types = set(str(row['linked_invoice_types'] or '').split(',')) if has_links else set()

            if has_links:
                if amount > 0 and 'Attiva' in linked_types:
                    df.loc[index, 'category'] = 'IngrossoIn'
                elif amount < 0 and 'Passiva' in linked_types:
                    df.loc[index, 'category'] = 'IngrossoOut'
                else:
                    df.loc[index, 'category'] = 'Altro'
            else:
                if amount > 0:
                    if re.search(cash_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'DettaglioIn'
                    else:
                        df.loc[index, 'category'] = 'DettaglioIn'
                elif amount < 0:
                    if re.search(commission_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'Commissioni'
                    elif re.search(pos_pattern, desc, re.IGNORECASE):
                        df.loc[index, 'category'] = 'DettaglioOut'
                    else:
                        df.loc[index, 'category'] = 'Altro'

        return df

    except Exception as e:
        logger.error(f"Errore durante la categorizzazione delle transazioni: {e}", exc_info=True)
        return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])
    finally:
        if conn: 
            conn.close()

def get_cashflow_data_original(start_date=None, end_date=None):
    """Versione originale del cash flow data mantenuta per compatibilità"""
    cols_out = ['month', 'inflow_ingrosso', 'outflow_ingrosso', 'inflow_dettaglio',
                'outflow_dettaglio', 'outflow_commissioni', 'inflow_altro', 'outflow_altro',
                'balance_ingrosso', 'balance_dettaglio', 'balance_commissioni', 'balance_altro',
                'total_balance']
    empty_df = pd.DataFrame(columns=cols_out).astype(float)
    empty_df['month'] = pd.Series(dtype='str')

    try:
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date() if end_date else date.today()
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date() if start_date else (end_date_obj - relativedelta(years=1) + relativedelta(days=1))

        if pd.isna(start_date_obj) or pd.isna(end_date_obj):
            logger.error("Date inizio/fine non valide per get_cashflow_data")
            return empty_df

        start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
        df_categorized = _get_categorized_transactions(start_str, end_str)

        if df_categorized.empty:
            logger.info("Nessuna transazione categorizzata trovata per il cash flow.")
            return empty_df

        df_categorized['month'] = df_categorized['transaction_date'].dt.strftime('%Y-%m')
        
        # Somma importi per mese e categoria
        df_monthly = df_categorized.groupby(['month', 'category'])['amount_dec'].sum().unstack(fill_value=Decimal('0.0')).reset_index()

        all_categories = ['IngrossoIn', 'IngrossoOut', 'DettaglioIn', 'DettaglioOut', 'Commissioni', 'Altro']
        for cat in all_categories:
            if cat not in df_monthly.columns:
                df_monthly[cat] = Decimal('0.0')

        df_out = pd.DataFrame()
        df_out['month'] = df_monthly['month']
        df_out['inflow_ingrosso'] = df_monthly['IngrossoIn'].apply(lambda x: x if x > 0 else Decimal('0.0'))
        df_out['outflow_ingrosso'] = df_monthly['IngrossoOut'].apply(lambda x: x.copy_abs() if x < 0 else Decimal('0.0'))
        df_out['inflow_dettaglio'] = df_monthly['DettaglioIn'].apply(lambda x: x if x > 0 else Decimal('0.0'))
        df_out['outflow_dettaglio'] = df_monthly['DettaglioOut'].apply(lambda x: x.copy_abs() if x < 0 else Decimal('0.0'))
        df_out['outflow_commissioni'] = df_monthly['Commissioni'].apply(lambda x: x.copy_abs() if x < 0 else Decimal('0.0'))
        df_out['inflow_altro'] = df_monthly['Altro'].apply(lambda x: x if x > 0 else Decimal('0.0'))
        df_out['outflow_altro'] = df_monthly['Altro'].apply(lambda x: x.copy_abs() if x < 0 else Decimal('0.0'))

        df_out['balance_ingrosso'] = df_out['inflow_ingrosso'] - df_out['outflow_ingrosso']
        df_out['balance_dettaglio'] = df_out['inflow_dettaglio'] - df_out['outflow_dettaglio']
        df_out['balance_commissioni'] = -df_out['outflow_commissioni']
        df_out['balance_altro'] = df_out['inflow_altro'] - df_out['outflow_altro']
        df_out['total_balance'] = df_monthly[all_categories].sum(axis=1)

        # Converti in float alla fine
        for col in cols_out[1:]:
            df_out[col] = df_out[col].astype(float)

        df_out['month'] = pd.to_datetime(df_out['month'], format='%Y-%m').dt.strftime('%Y-%m')

        return df_out[cols_out]

    except Exception as e:
        logger.error(f"Errore recupero dati cash flow categorizzato: {e}", exc_info=True)
        return empty_df

def get_cashflow_table_original(start_date=None, end_date=None):
    """Versione originale della tabella cash flow"""
    cols_out = ['Mese', 'Entrate Ingrosso', 'Uscite Ingrosso', 'Saldo Ingrosso',
                'Entrate Dettaglio', 'Uscite Dettaglio', 'Saldo Dettaglio',
                'Commissioni', 'Saldo Altro', 'Saldo Totale']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        df_data = get_cashflow_data_original(start_date, end_date)
        if df_data.empty: 
            return empty_df

        df_table = pd.DataFrame()
        try:
            df_table['Mese'] = pd.to_datetime(df_data['month'], format='%Y-%m').dt.strftime('%b %Y')
        except ValueError:
            df_table['Mese'] = df_data['month']

        def format_dec_curr(val):
            if pd.isna(val): 
                return 'N/A'
            try:
                d = quantize(Decimal(str(val)))
                return f"{d:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            except (InvalidOperation, TypeError):
                return "Errore"

        df_table['Entrate Ingrosso'] = df_data['inflow_ingrosso'].apply(format_dec_curr)
        df_table['Uscite Ingrosso'] = df_data['outflow_ingrosso'].apply(format_dec_curr)
        df_table['Saldo Ingrosso'] = df_data['balance_ingrosso'].apply(format_dec_curr)
        df_table['Entrate Dettaglio'] = df_data['inflow_dettaglio'].apply(format_dec_curr)
        df_table['Uscite Dettaglio'] = df_data['outflow_dettaglio'].apply(format_dec_curr)
        df_table['Saldo Dettaglio'] = df_data['balance_dettaglio'].apply(format_dec_curr)
        df_table['Commissioni'] = df_data['outflow_commissioni'].apply(format_dec_curr)
        df_table['Saldo Altro'] = df_data['balance_altro'].apply(format_dec_curr)
        df_table['Saldo Totale'] = df_data['total_balance'].apply(format_dec_curr)

        return df_table[cols_out]

    except Exception as e:
        logger.error(f"Errore creazione tabella cash flow categorizzato: {e}", exc_info=True)
        return empty_df

# ===== ANALISI PREDITTIVE E AVANZATE =====

def get_sales_forecast(product_name=None, months_ahead=3):
    """Previsione vendite basata su trend storici"""
    conn = None
    try:
        conn = get_connection()
        
        # Query per dati storici ultimi 24 mesi
        two_years_ago = (date.today() - relativedelta(years=2)).isoformat()
        today_str = date.today().isoformat()
        
        where_clause = ""
        params = [two_years_ago, today_str]
        
        if product_name:
            where_clause = "AND il.description LIKE ?"
            params.append(f"%{product_name}%")

        query = f"""
            SELECT 
                strftime('%Y-%m', i.doc_date) as month,
                il.description,
                SUM(il.quantity) as total_quantity,
                SUM(il.total_price) as total_value,
                AVG(il.unit_price) as avg_price
            FROM InvoiceLines il
            JOIN Invoices i ON il.invoice_id = i.id
            WHERE i.type = 'Attiva' 
              AND i.doc_date BETWEEN ? AND ?
              AND il.quantity > 0
              {where_clause}
            GROUP BY month, il.description
            ORDER BY month
        """
        
        df = pd.read_sql_query(query, conn, params=params)
        
        if df.empty:
            return pd.DataFrame()
        
        # Normalizza prodotti se necessario
        if product_name:
            df['normalized_product'] = df['description'].apply(normalize_product_name)
            df = df[df['normalized_product'].str.contains(product_name, case=False, na=False)]
        
        # Aggrega per mese
        df_monthly = df.groupby('month').agg({
            'total_quantity': 'sum',
            'total_value': 'sum',
            'avg_price': 'mean'
        }).reset_index()
        
        # Conversione a serie temporale
        df_monthly['month_date'] = pd.to_datetime(df_monthly['month'])
        df_monthly = df_monthly.sort_values('month_date')
        
        # Calcolo trend lineare semplice
        if len(df_monthly) >= 6:  # Minimo 6 mesi per forecast
            # Trend quantity
            x_vals = np.arange(len(df_monthly))
            qty_trend = np.polyfit(x_vals, df_monthly['total_quantity'], 1)
            val_trend = np.polyfit(x_vals, df_monthly['total_value'], 1)
            
            # Previsioni per i prossimi mesi
            forecasts = []
            last_month = df_monthly['month_date'].max()
            
            for i in range(1, months_ahead + 1):
                future_month = last_month + relativedelta(months=i)
                future_x = len(df_monthly) + i - 1
                
                pred_qty = qty_trend[0] * future_x + qty_trend[1]
                pred_val = val_trend[0] * future_x + val_trend[1]
                pred_price = pred_val / pred_qty if pred_qty > 0 else 0
                
                forecasts.append({
                    'month': future_month.strftime('%Y-%m'),
                    'month_name': future_month.strftime('%b %Y'),
                    'predicted_quantity': max(0, pred_qty),  # Non negativo
                    'predicted_value': max(0, pred_val),
                    'predicted_avg_price': max(0, pred_price),
                    'confidence': max(0.3, 1.0 - (i * 0.15))  # Confidenza decrescente
                })
            
            return pd.DataFrame(forecasts)
        
        return pd.DataFrame()
        
    except Exception as e:
        logger.error(f"Errore forecast vendite: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()

def get_customer_churn_analysis():
    """Analisi rischio abbandono clienti"""
    conn = None
    try:
        conn = get_connection()
        today = date.today()
        
        query = """
            SELECT 
                a.id,
                a.denomination,
                MAX(i.doc_date) as last_order_date,
                COUNT(i.id) as total_orders,
                SUM(i.total_amount) as total_revenue,
                AVG(i.total_amount) as avg_order_value,
                COUNT(DISTINCT strftime('%Y-%m', i.doc_date)) as active_months
            FROM Anagraphics a
            JOIN Invoices i ON a.id = i.anagraphics_id
            WHERE a.type = 'Cliente'
              AND i.type = 'Attiva'
            GROUP BY a.id, a.denomination
            HAVING total_orders > 0
        """
        
        df = pd.read_sql_query(query, conn, parse_dates=['last_order_date'])
        
        if df.empty:
            return pd.DataFrame()
        
        # Calcola giorni dall'ultimo ordine
        df['days_since_last_order'] = (today - df['last_order_date'].dt.date).dt.days
        
        # Calcola frequenza media ordini (ordini per mese)
        df['avg_order_frequency'] = df['total_orders'] / df['active_months']
        
        # Calcola score di rischio churn
        # Fattori: giorni dall'ultimo ordine, frequenza ordini, valore cliente
        df['churn_risk_score'] = (
            (df['days_since_last_order'] / 30) * 0.5 +  # Mesi senza ordini
            (1 / (df['avg_order_frequency'] + 0.1)) * 0.3 +  # Bassa frequenza
            (1 / (df['total_revenue'] / 1000 + 0.1)) * 0.2  # Basso valore
        )
        
        # Normalizza score 0-100
        max_score = df['churn_risk_score'].max()
        df['churn_risk_score'] = (df['churn_risk_score'] / max_score * 100).round(1)
        
        # Classifica rischio
        df['risk_category'] = pd.cut(
            df['churn_risk_score'],
            bins=[0, 25, 50, 75, 100],
            labels=['Basso', 'Medio', 'Alto', 'Critico']
        )
        
        # Suggerimenti azione
        def get_action_suggestion(row):
            if row['risk_category'] == 'Critico':
                return "Contatto immediato, offerta speciale"
            elif row['risk_category'] == 'Alto':
                return "Chiamata commerciale, verifica soddisfazione"
            elif row['risk_category'] == 'Medio':
                return "Email promozionale, newsletter"
            else:
                return "Mantenimento relazione standard"
        
        df['suggested_action'] = df.apply(get_action_suggestion, axis=1)
        
        # Ordina per rischio decrescente
        return df.sort_values('churn_risk_score', ascending=False)
        
    except Exception as e:
        logger.error(f"Errore analisi churn: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()

def get_payment_behavior_analysis():
    """Analisi comportamento pagamenti per migliorare cash flow"""
    conn = None
    try:
        conn = get_connection()
        
        query = """
            SELECT 
                a.id,
                a.denomination,
                i.due_date,
                i.total_amount,
                MAX(bt.transaction_date) as payment_date,
                julianday(MAX(bt.transaction_date)) - julianday(i.due_date) as payment_delay_days,
                CASE 
                    WHEN strftime('%w', i.due_date) = '0' THEN 'Domenica'
                    WHEN strftime('%w', i.due_date) = '1' THEN 'Lunedì'
                    WHEN strftime('%w', i.due_date) = '2' THEN 'Martedì'
                    WHEN strftime('%w', i.due_date) = '3' THEN 'Mercoledì'
                    WHEN strftime('%w', i.due_date) = '4' THEN 'Giovedì'
                    WHEN strftime('%w', i.due_date) = '5' THEN 'Venerdì'
                    WHEN strftime('%w', i.due_date) = '6' THEN 'Sabato'
                END as due_day_of_week,
                strftime('%m', i.due_date) as due_month
            FROM Invoices i
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            WHERE i.type = 'Attiva'
              AND i.payment_status = 'Pagata Tot.'
              AND i.due_date IS NOT NULL
              AND i.doc_date >= date('now', '-2 years')
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return {}
        
        # Analisi per cliente
        client_behavior = df.groupby(['id', 'denomination']).agg({
            'payment_delay_days': ['mean', 'std', 'count'],
            'total_amount': 'sum'
        }).round(2)
        
        client_behavior.columns = ['avg_delay', 'delay_std', 'payment_count', 'total_paid']
        client_behavior = client_behavior.reset_index()
        
        # Classifica clienti per comportamento
        client_behavior['behavior_category'] = pd.cut(
            client_behavior['avg_delay'],
            bins=[-float('inf'), -5, 5, 15, float('inf')],
            labels=['Anticipato', 'Puntuale', 'Lieve Ritardo', 'Ritardo Cronico']
        )
        
        # Analisi per giorno della settimana
        day_analysis = df.groupby('due_day_of_week')['payment_delay_days'].agg(['mean', 'count']).round(2)
        
        # Analisi per mese
        month_analysis = df.groupby('due_month')['payment_delay_days'].agg(['mean', 'count']).round(2)
        
        # Correlazione importo vs ritardo
        amount_delay_corr = df['total_amount'].corr(df['payment_delay_days'])
        
        # Statistiche generali
        general_stats = {
            'avg_delay_all': df['payment_delay_days'].mean(),
            'median_delay': df['payment_delay_days'].median(),
            'std_delay': df['payment_delay_days'].std(),
            'on_time_percentage': (df['payment_delay_days'] <= 0).mean() * 100,
            'late_percentage': (df['payment_delay_days'] > 0).mean() * 100,
            'amount_delay_correlation': amount_delay_corr
        }
        
        return {
            'client_behavior': client_behavior,
            'day_analysis': day_analysis,
            'month_analysis': month_analysis,
            'general_stats': general_stats,
            'raw_data': df
        }
        
    except Exception as e:
        logger.error(f"Errore analisi comportamento pagamenti: {e}", exc_info=True)
        return {}
    finally:
        if conn:
            conn.close()

def get_competitive_analysis():
    """Analisi competitiva basata sui dati di acquisto/vendita"""
    conn = None
    try:
        conn = get_connection()
        
        # Analizza differenze di prezzo tra acquisto e vendita per prodotto
        query = """
            SELECT 
                il_buy.description as product,
                AVG(il_buy.unit_price) as avg_purchase_price,
                AVG(il_sell.unit_price) as avg_selling_price,
                COUNT(DISTINCT i_buy.anagraphics_id) as num_suppliers,
                COUNT(DISTINCT i_sell.anagraphics_id) as num_customers,
                SUM(il_buy.quantity) as total_purchased,
                SUM(il_sell.quantity) as total_sold
            FROM InvoiceLines il_buy
            JOIN Invoices i_buy ON il_buy.invoice_id = i_buy.id
            LEFT JOIN InvoiceLines il_sell ON il_buy.description = il_sell.description
            LEFT JOIN Invoices i_sell ON il_sell.invoice_id = i_sell.id AND i_sell.type = 'Attiva'
            WHERE i_buy.type = 'Passiva'
              AND i_buy.doc_date >= date('now', '-1 year')
              AND il_buy.unit_price > 0
              AND il_sell.unit_price > 0
            GROUP BY il_buy.description
            HAVING COUNT(DISTINCT i_buy.anagraphics_id) >= 1
            ORDER BY (avg_selling_price - avg_purchase_price) DESC
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return pd.DataFrame()
        
        # Calcola metriche competitive
        df['markup_amount'] = df['avg_selling_price'] - df['avg_purchase_price']
        df['markup_percentage'] = ((df['avg_selling_price'] - df['avg_purchase_price']) / df['avg_purchase_price'] * 100).round(2)
        df['supplier_diversification'] = df['num_suppliers']
        df['market_penetration'] = (df['total_sold'] / df['total_purchased'] * 100).round(2)
        
        # Normalizza nomi prodotti
        df['normalized_product'] = df['product'].apply(normalize_product_name)
        
        # Classifica competitive position
        df['competitive_position'] = pd.cut(
            df['markup_percentage'],
            bins=[0, 10, 25, 50, float('inf')],
            labels=['Basso Margine', 'Margine Normale', 'Buon Margine', 'Alto Margine']
        )
        
        # Identifica opportunità
        def identify_opportunity(row):
            if row['markup_percentage'] < 15 and row['market_penetration'] > 80:
                return "Aumentare prezzi vendita"
            elif row['supplier_diversification'] == 1:
                return "Diversificare fornitori"
            elif row['market_penetration'] < 50:
                return "Aumentare vendite"
            else:
                return "Ottimizzazione generale"
        
        df['opportunity'] = df.apply(identify_opportunity, axis=1)
        
        # Formatta prezzi per display
        df['avg_purchase_price_fmt'] = df['avg_purchase_price'].apply(lambda x: f"{x:.2f}€")
        df['avg_selling_price_fmt'] = df['avg_selling_price'].apply(lambda x: f"{x:.2f}€")
        df['markup_amount_fmt'] = df['markup_amount'].apply(lambda x: f"{x:.2f}€")
        
        return df.sort_values('markup_amount', ascending=False)
        
    except Exception as e:
        logger.error(f"Errore analisi competitiva: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()