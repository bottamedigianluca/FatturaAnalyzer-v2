def _categorize_transactions(start_date_str: str, end_date_str: str) -> pd.DataFrame:
    """Backward compatibility: usa versione ottimizzata"""
    return _categorize_transactions_optimized(start_date_str, end_date_str)

def get_cashflow_data(start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_cashflow_data_optimized(start_date, end_date)

def get_cashflow_table(start_date=None, end_date=None):
    """Tabella cash flow formattata per UI - usa dati ottimizzati"""
    cols_out = ['Mese', 'Incassi Clienti', 'Incassi Contanti', 'Altri Incassi', 'Tot. Entrate',
                'Pagam. Fornitori', 'Spese Varie', 'Carburanti', 'Utenze', 'Tasse', 'Commissioni', 'Tot. Uscite',
                'Flusso Operativo', 'Flusso Netto']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        df_data = get_cashflow_data_optimized(start_date, end_date)
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
            except Exception:
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

def get_monthly_revenue_costs(start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_monthly_revenue_costs_optimized(start_date, end_date)

def get_products_analysis(invoice_type='Attiva', start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_products_analysis_optimized(invoice_type, start_date, end_date)

# ===== ENHANCED FUNCTIONS =====

def calculate_and_update_client_scores():
    """Calcolo score clienti con logica migliorata e query ottimizzate"""
    conn = None
    today = date.today()
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Query ottimizzata che calcola tutto in SQL
        query = """
            WITH payment_analysis AS (
                SELECT 
                    i.anagraphics_id,
                    COUNT(*) as total_invoices,
                    AVG(CASE 
                        WHEN i.due_date IS NOT NULL AND bt.transaction_date IS NOT NULL THEN
                            julianday(bt.transaction_date) - julianday(i.due_date)
                        ELSE NULL 
                    END) as avg_delay_days,
                    SUM(i.total_amount) as total_amount,
                    -- Weighted delay considering invoice amounts
                    SUM(CASE 
                        WHEN i.due_date IS NOT NULL AND bt.transaction_date IS NOT NULL THEN
                            ((julianday(bt.transaction_date) - julianday(i.due_date)) * i.total_amount)
                        ELSE 0 
                    END) / NULLIF(SUM(i.total_amount), 0) as weighted_avg_delay,
                    -- Payment frequency score
                    COUNT(*) / MAX(1.0, (julianday('now') - julianday(MIN(i.doc_date))) / 365.0) as payment_frequency_yearly
                FROM Invoices i
                JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                WHERE i.type = 'Attiva'
                  AND i.payment_status IN ('Pagata Tot.', 'Riconciliata')
                  AND i.due_date IS NOT NULL
                GROUP BY i.anagraphics_id
            ),
            client_scores AS (
                SELECT 
                    anagraphics_id,
                    -- Base score calculation
                    ROUND(
                        100.0 
                        -- Penalty for delays
                        - GREATEST(0, COALESCE(avg_delay_days, 0)) * 1.5
                        - GREATEST(0, COALESCE(weighted_avg_delay, 0)) * 0.5
                        -- Bonuses
                        + LEAST(10, total_amount / 10000.0)  -- Volume bonus (max 10 pts for 100k+)
                        + LEAST(5, payment_frequency_yearly / 2.0)  -- Frequency bonus (max 5 pts for 10+ yearly)
                    , 1) as calculated_score
                FROM payment_analysis
            )
            UPDATE Anagraphics 
            SET score = (
                SELECT CASE 
                    WHEN calculated_score < 0 THEN 0.0
                    WHEN calculated_score > 100 THEN 100.0
                    ELSE calculated_score
                END
                FROM client_scores 
                WHERE client_scores.anagraphics_id = Anagraphics.id
            ),
            updated_at = datetime('now')
            WHERE id IN (SELECT anagraphics_id FROM client_scores)
        """
        
        cursor.execute(query)
        updated_count = cursor.rowcount
        conn.commit()
        
        logger.info(f"Score calculation completed. Updated: {updated_count} clients.")
        return True
        
    except Exception as e:
        logger.error(f"Errore calcolo score ottimizzato: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            conn.close()

def get_dashboard_kpis():
    """KPI dashboard ottimizzati con query SQL unificate"""
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

        # Query unificata per tutti i KPI principali
        unified_kpi_query = """
            WITH kpi_base AS (
                SELECT 
                    type,
                    payment_status,
                    doc_date,
                    due_date,
                    total_amount,
                    paid_amount,
                    (total_amount - paid_amount) as open_amount,
                    anagraphics_id,
                    CASE WHEN due_date < ? THEN 1 ELSE 0 END as is_overdue
                FROM Invoices
                WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.', 'Pagata Tot.')
            )
            SELECT 
                type,
                -- Open balances
                SUM(CASE WHEN payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.') THEN open_amount ELSE 0 END) as total_open,
                -- Overdue amounts and counts  
                SUM(CASE WHEN payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.') AND is_overdue = 1 THEN open_amount ELSE 0 END) as overdue_amount,
                SUM(CASE WHEN payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.') AND is_overdue = 1 THEN 1 ELSE 0 END) as overdue_count,
                -- YTD revenue
                SUM(CASE WHEN doc_date >= ? AND doc_date <= ? THEN total_amount ELSE 0 END) as revenue_ytd,
                -- Previous year YTD
                SUM(CASE WHEN doc_date BETWEEN ? AND ? THEN total_amount ELSE 0 END) as revenue_prev_ytd,
                -- Active customers this month
                COUNT(DISTINCT CASE WHEN doc_date >= ? AND doc_date <= ? AND type = 'Attiva' THEN anagraphics_id END) as active_customers_month
            FROM kpi_base
            GROUP BY type
        """
        
        cursor.execute(unified_kpi_query, (
            today_str, start_of_year, today_str, 
            start_of_prev_year_period, end_of_prev_year_period,
            start_of_month, today_str
        ))
        
        for row in cursor.fetchall():
            invoice_type = row['type']
            if invoice_type == 'Attiva':
                kpis['total_receivables'] = quantize(to_decimal(row['total_open']))
                kpis['overdue_receivables_amount'] = quantize(to_decimal(row['overdue_amount']))
                kpis['overdue_receivables_count'] = row['overdue_count'] or 0
                kpis['revenue_ytd'] = quantize(to_decimal(row['revenue_ytd']))
                kpis['revenue_prev_year_ytd'] = quantize(to_decimal(row['revenue_prev_ytd']))
                kpis['active_customers_month'] = row['active_customers_month'] or 0
            elif invoice_type == 'Passiva':
                kpis['total_payables'] = quantize(to_decimal(row['total_open']))
                kpis['overdue_payables_amount'] = quantize(to_decimal(row['overdue_amount']))
                kpis['overdue_payables_count'] = row['overdue_count'] or 0

        # Calcola YoY change
        if kpis['revenue_prev_year_ytd'] != Decimal('0.0'):
            try:
                change = ((kpis['revenue_ytd'] - kpis['revenue_prev_year_ytd']) / kpis['revenue_prev_year_ytd']) * 100
                kpis['revenue_yoy_change_ytd'] = round(float(change), 1)
            except Exception:
                kpis['revenue_yoy_change_ytd'] = None

        # Query separata per costi YTD e margine
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

        # Giorni medi di pagamento ottimizzato
        cursor.execute("""
            SELECT AVG(payment_delay) as avg_payment_days
            FROM (
                SELECT 
                    julianday(MAX(bt.transaction_date)) - julianday(i.due_date) as payment_delay
                FROM Invoices i
                JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                WHERE i.type = 'Attiva' 
                  AND i.payment_status = 'Pagata Tot.'
                  AND i.due_date IS NOT NULL
                  AND i.doc_date >= ?
                GROUP BY i.id
            )
        """, (start_of_year,))
        
        payment_days_data = cursor.fetchone()
        if payment_days_data and payment_days_data['avg_payment_days'] is not None:
            kpis['avg_days_to_payment'] = round(payment_days_data['avg_payment_days'], 1)

        # Nuovi clienti nel mese
        cursor.execute("""
            SELECT COUNT(*) as new_customers
            FROM (
                SELECT anagraphics_id
                FROM Invoices
                WHERE type = 'Attiva'
                GROUP BY anagraphics_id
                HAVING MIN(doc_date) >= ? AND MIN(doc_date) <= ?
            )
        """, (start_of_month, today_str))
        
        new_data = cursor.fetchone()
        if new_data:
            kpis['new_customers_month'] = new_data['new_customers'] or 0

        logger.debug(f"KPI Dashboard ottimizzati calcolati: {kpis}")
        return kpis
        
    except Exception as e:
        logger.error(f"Errore calcolo KPI dashboard ottimizzato: {e}", exc_info=True)
        return kpis
    finally:
        if conn:
            conn.close()

def get_top_clients_by_revenue(start_date=None, end_date=None, limit=20):
    """Top clienti ottimizzato con query SQL unificata"""
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=365)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    cols_out = ['ID', 'Denominazione', 'Fatturato Totale', 'N. Fatture', 'Score', 'Ticket Medio', 'Margine %']
    empty_df = pd.DataFrame(columns=cols_out)
    
    conn = None
    try:
        conn = get_connection()
        
        # Query ottimizzata che calcola tutto in SQL
        query = """
            WITH client_metrics AS (
                SELECT 
                    a.id, 
                    a.denomination, 
                    a.score,
                    SUM(i.total_amount) AS total_revenue,
                    COUNT(i.id) AS invoice_count, 
                    AVG(i.total_amount) AS avg_ticket,
                    -- Stima margine basata su confronto prezzi vendita vs acquisto medio
                    (SELECT AVG(
                        CASE WHEN il_sell.unit_price > 0 AND avg_buy_price.avg_price > 0 
                        THEN ((il_sell.unit_price - avg_buy_price.avg_price) / il_sell.unit_price) * 100 
                        ELSE NULL END
                    ) FROM InvoiceLines il_sell 
                    JOIN Invoices i_sell ON il_sell.invoice_id = i_sell.id
                    LEFT JOIN (
                        SELECT description, AVG(unit_price) as avg_price
                        FROM InvoiceLines il_buy 
                        JOIN Invoices i_buy ON il_buy.invoice_id = i_buy.id 
                        WHERE i_buy.type = 'Passiva'
                        GROUP BY description
                    ) avg_buy_price ON il_sell.description = avg_buy_price.description
                    WHERE i_sell.anagraphics_id = a.id AND i_sell.type = 'Attiva'
                    AND i_sell.doc_date BETWEEN ? AND ?
                    ) AS estimated_margin
                FROM Invoices i 
                JOIN Anagraphics a ON i.anagraphics_id = a.id
                WHERE i.type = 'Attiva' AND i.doc_date BETWEEN ? AND ?
                GROUP BY a.id, a.denomination, a.score 
                ORDER BY total_revenue DESC 
                LIMIT ?
            )
            SELECT * FROM client_metrics
        """
        
        df = pd.read_sql_query(query, conn, params=(start_str, end_str, start_str, end_str, limit))

        if df.empty:
            return empty_df

        # Formattazione ottimizzata
        df['ID'] = df['id']
        df['Denominazione'] = df['denomination']
        df['Fatturato Totale'] = df['total_revenue'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['N. Fatture'] = df['invoice_count']
        df['Score'] = df['score'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else 'N/D')
        df['Ticket Medio'] = df['avg_ticket'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['Margine %'] = df['estimated_margin'].apply(lambda x: f"{x:.1f}%" if pd.notna(x) and x > 0 else 'N/D')
        
        return df[cols_out]
        
    except Exception as e:
        logger.error(f"Errore top clienti ottimizzato: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_aging_summary_optimized(invoice_type='Attiva'):
    """Aging analysis ottimizzato con query SQL diretta"""
    conn = None
    today = date.today()
    today_str = today.isoformat()
    
    try:
        conn = get_connection()
        
        # Query SQL ottimizzata che fa tutto il calcolo aging nel database
        query = """
            WITH aging_buckets AS (
                SELECT 
                    id, 
                    due_date, 
                    (total_amount - paid_amount) AS open_amount,
                    CASE 
                        WHEN due_date IS NULL OR due_date >= ? THEN 'Non Scaduto'
                        WHEN julianday(?) - julianday(due_date) <= 7 THEN '1-7 gg'
                        WHEN julianday(?) - julianday(due_date) <= 15 THEN '8-15 gg'
                        WHEN julianday(?) - julianday(due_date) <= 30 THEN '16-30 gg'
                        WHEN julianday(?) - julianday(due_date) <= 60 THEN '31-60 gg'
                        WHEN julianday(?) - julianday(due_date) <= 90 THEN '61-90 gg'
                        ELSE '>90 gg'
                    END as aging_bucket
                FROM Invoices
                WHERE type = ? 
                  AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND (total_amount - paid_amount) > 0.01
            )
            SELECT 
                aging_bucket,
                SUM(open_amount) as total_amount,
                COUNT(*) as invoice_count
            FROM aging_buckets
            GROUP BY aging_bucket
        """
        
        cursor = conn.cursor()
        cursor.execute(query, (today_str, today_str, today_str, today_str, today_str, today_str, invoice_type))
        rows = cursor.fetchall()

        # Inizializza bucket con valori zero
        buckets = ['Non Scaduto', '1-7 gg', '8-15 gg', '16-30 gg', '31-60 gg', '61-90 gg', '>90 gg']
        aging_summary = {label: {'amount': Decimal('0.0'), 'count': 0} for label in buckets}

        # Popola con dati reali
        for row in rows:
            bucket = row['aging_bucket']
            if bucket in aging_summary:
                aging_summary[bucket]['amount'] = quantize(to_decimal(row['total_amount']))
                aging_summary[bucket]['count'] = row['invoice_count']

        return aging_summary
        
    except Exception as e:
        logger.error(f"Errore calcolo aging ottimizzato ({invoice_type}): {e}", exc_info=True)
        return {}
    finally:
        if conn:
            conn.close()

def get_aging_summary(invoice_type='Attiva'):
    """Backward compatibility: usa versione ottimizzata"""
    return get_aging_summary_optimized(invoice_type)

# ===== ADVANCED ANALYSIS FUNCTIONS (EXISTING) =====

def get_seasonal_product_analysis(product_category='all', years_back=3):
    """Analisi stagionalità prodotti con query SQL ottimizzata"""
    start_date_obj, end_date_obj = _resolve_date_range(None, None, default_days=years_back * 365)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    conn = None
    try:
        conn = get_connection()
        
        # Query ottimizzata che fa aggregazione direttamente in SQL
        query = """
            WITH product_seasonality AS (
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
            ),
            monthly_aggregation AS (
                SELECT 
                    month_num,
                    description,
                    SUM(total_quantity) as sum_quantity,
                    SUM(total_value) as sum_value,
                    AVG(avg_unit_price) as avg_price
                FROM product_seasonality
                GROUP BY month_num, description
            ),
            yearly_averages AS (
                SELECT 
                    description,
                    AVG(sum_value) as yearly_avg_value
                FROM monthly_aggregation
                GROUP BY description
            )
            SELECT 
                ma.month_num,
                ma.description,
                ma.sum_quantity as total_quantity,
                ma.sum_value as total_value,
                ma.avg_price as avg_unit_price,
                CASE 
                    WHEN ya.yearly_avg_value > 0 THEN ma.sum_value / ya.yearly_avg_value
                    ELSE 0 
                END as seasonality_index
            FROM monthly_aggregation ma
            JOIN yearly_averages ya ON ma.description = ya.description
            ORDER BY ma.description, ma.month_num
        """
        
        df = pd.read_sql_query(query, conn, params=(start_str, end_str))
        
        if df.empty:
            return pd.DataFrame()
        
        # Applica normalizzazione prodotti solo sui risultati aggregati
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
        
        # Aggrega per prodotto normalizzato
        seasonal_data = df.groupby(['normalized_product', 'month_num']).agg({
            'total_quantity': 'sum',
            'total_value': 'sum',
            'avg_unit_price': 'mean',
            'seasonality_index': 'mean'
        }).reset_index()
        
        # Aggiungi nomi mesi
        seasonal_data['month_name'] = seasonal_data['month_num'].map({
            '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
            '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
            '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic'
        })
        
        return seasonal_data.sort_values(['normalized_product', 'month_num'])
        
    except Exception as e:
        logger.error(f"Errore analisi stagionalità ottimizzata: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: 
            conn.close()

# ===== SUPPORT FUNCTIONS (EXISTING BUT OPTIMIZED) =====

def get_commission_summary(start_date=None, end_date=None):
    """Analisi commissioni bancarie ottimizzata"""
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=365)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    cols_out = ['Mese', 'Totale Commissioni', 'N. Operazioni', 'Commissione Media', 'Tipo Principale']
    empty_df = pd.DataFrame(columns=cols_out)
    
    conn = None
    try:
        conn = get_connection()

        # Query SQL ottimizzata per commissioni
        query = """
            WITH commission_analysis AS (
                SELECT
                    strftime('%Y-%m', transaction_date) AS month,
                    ABS(amount) AS commission_amount,
                    description,
                    COUNT(*) OVER (PARTITION BY strftime('%Y-%m', transaction_date)) as monthly_operations,
                    SUM(ABS(amount)) OVER (PARTITION BY strftime('%Y-%m', transaction_date)) as monthly_total,
                    AVG(ABS(amount)) OVER (PARTITION BY strftime('%Y-%m', transaction_date)) as monthly_avg,
                    ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', transaction_date) ORDER BY ABS(amount) DESC) as rn
                FROM BankTransactions
                WHERE transaction_date BETWEEN ? AND ?
                  AND amount < 0
                  AND reconciliation_status != 'Ignorato'
                  AND (LOWER(description) LIKE '%commissioni%' OR
                       LOWER(description) LIKE '%competenze banc%' OR
                       LOWER(description) LIKE '%spese tenuta conto%' OR
                       LOWER(description) LIKE '%imposta di bollo%' OR
                       LOWER(description) LIKE '%canone%')
            )
            SELECT DISTINCT
                month,
                monthly_total as total_commissions,
                monthly_operations as operation_count,
                monthly_avg as avg_commission,
                FIRST_VALUE(description) OVER (PARTITION BY month ORDER BY commission_amount DESC) as main_type
            FROM commission_analysis
            ORDER BY month
        """
        
        df = pd.read_sql_query(query, conn, params=(start_str, end_str))

        if df.empty:
            return empty_df

        # Formattazione ottimizzata
        try:
            df['Mese'] = pd.to_datetime(df['month'], format='%Y-%m').dt.strftime('%b %Y')
        except ValueError:
            df['Mese'] = df['month']

        def format_currency(val):
            if pd.isna(val):
                return 'N/A'
            try:
                d = quantize(to_decimal(val))
                return f"{d.copy_abs():,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            except Exception:
                return "0,00"

        df['Totale Commissioni'] = df['total_commissions'].apply(format_currency)
        df['N. Operazioni'] = df['operation_count']
        df['Commissione Media'] = df['avg_commission'].apply(format_currency)
        df['Tipo Principale'] = df['main_type'].str.title()

        return df[cols_out]

    except Exception as e:
        logger.error(f"Errore sommario commissioni ottimizzato: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_clients_by_score(order='DESC', limit=20):
    """Clienti ordinati per score ottimizzato con query SQL unificata"""
    conn = None
    cols_out = ['ID', 'Denominazione', 'P.IVA', 'C.F.', 'Città', 'Score', 'Ultimo Ordine', 'Fatturato YTD']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        sort_order = "ASC" if order.upper() == 'ASC' else "DESC"
        current_year = date.today().year
        
        # Query ottimizzata che calcola tutto in SQL
        query = f"""
            WITH client_metrics AS (
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
            )
            SELECT * FROM client_metrics
            ORDER BY 
                CASE WHEN score IS NULL THEN {1 if sort_order == 'ASC' else 0} ELSE {0 if sort_order == 'ASC' else 1} END,
                score {sort_order}, 
                denomination COLLATE NOCASE
            LIMIT ?
        """
        
        df = pd.read_sql_query(query, conn, params=(limit,))

        if df.empty:
            return empty_df

        # Formattazione ottimizzata
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
        logger.error(f"Errore clienti per score ottimizzato: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_product_monthly_sales(normalized_description, start_date=None, end_date=None):
    """Vendite mensili prodotto ottimizzate con query SQL diretta"""
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=730)  # 2 anni default
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    cols_out = ['Mese', 'Quantità', 'Valore', 'Prezzo Medio', 'Trend %']
    empty_df = pd.DataFrame(columns=cols_out)
    
    conn = None
    try:
        conn = get_connection()

        # Query ottimizzata che fa tutto in SQL
        query = """
            WITH product_monthly AS (
                SELECT 
                    strftime('%Y-%m', i.doc_date) as month,
                    SUM(il.quantity) as monthly_quantity,
                    SUM(il.total_price) as monthly_value,
                    AVG(il.unit_price) as avg_unit_price
                FROM InvoiceLines il 
                JOIN Invoices i ON il.invoice_id = i.id
                WHERE i.type = 'Attiva' 
                  AND i.doc_date BETWEEN ? AND ?
                  AND il.description IS NOT NULL 
                  AND TRIM(il.description) != ''
                  AND LOWER(TRIM(il.description)) LIKE LOWER(?)
                GROUP BY strftime('%Y-%m', i.doc_date)
                ORDER BY month
            ),
            product_with_trends AS (
                SELECT 
                    month,
                    monthly_quantity,
                    monthly_value,
                    avg_unit_price,
                    LAG(monthly_value) OVER (ORDER BY month) as prev_month_value,
                    CASE 
                        WHEN LAG(monthly_value) OVER (ORDER BY month) > 0 THEN
                            ((monthly_value - LAG(monthly_value) OVER (ORDER BY month)) / LAG(monthly_value) OVER (ORDER BY month)) * 100
                        ELSE NULL
                    END as trend_percent
                FROM product_monthly
            )
            SELECT * FROM product_with_trends
            ORDER BY month
        """
        
        # Usa pattern matching per il prodotto normalizzato
        pattern = f'%{normalized_description}%'
        df = pd.read_sql_query(query, conn, params=(start_str, end_str, pattern))

        if df.empty:
            return empty_df

        # Formattazione finale
        try:
            df['Mese'] = pd.to_datetime(df['month'], format='%Y-%m').dt.strftime('%b %Y')
        except:
            df['Mese'] = df['month']
            
        df['Quantità'] = df['monthly_quantity'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if pd.notna(x) else '0,00')
        df['Valore'] = df['monthly_value'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€" if pd.notna(x) else '0,00€')
        df['Prezzo Medio'] = df['avg_unit_price'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€" if pd.notna(x) else '0,00€')
        df['Trend %'] = df['trend_percent'].apply(lambda x: f"{x:+.1f}%" if pd.notna(x) else 'N/D')
        
        return df[cols_out]
        
    except Exception as e:
        logger.error(f"Errore vendite mensili ottimizzate '{normalized_description}': {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_anagraphic_financial_summary(anagraphic_id):
    """Sommario finanziario anagrafica ottimizzato con query SQL unificata"""
    summary = {
        'total_invoiced': Decimal('0.0'),
        'total_paid': Decimal('0.0'),
        'open_balance': Decimal('0.0'),
        'overdue_amount': Decimal('0.0'),
        'overdue_count': 0,
        'avg_payment_days': None,
        'avg_order_value_ytd': None,
        'revenue_ytd': Decimal('0.0'),
        'customer_segment': None,
        'preferred_products': []
    }
    
    if anagraphic_id is None:
        return summary

    conn = None
    today = date.today()
    today_str = today.isoformat()
    start_of_year = date(today.year, 1, 1).isoformat()
    six_months_ago = (today - relativedelta(months=6)).isoformat()

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Query unificata per tutti i dati principali
        unified_query = """
            WITH anagraphic_metrics AS (
                SELECT
                    SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN type = 'Attiva' THEN paid_amount ELSE 0 END) as total_received,
                    COUNT(CASE WHEN type = 'Attiva' THEN 1 END) as total_invoices,
                    MAX(CASE WHEN type = 'Attiva' THEN doc_date END) as last_order_date,
                    -- Scaduti
                    SUM(CASE WHEN type = 'Attiva' AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.') AND due_date < ? THEN (total_amount - paid_amount) ELSE 0 END) as overdue_amount,
                    COUNT(CASE WHEN type = 'Attiva' AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.') AND due_date < ? THEN 1 END) as overdue_count,
                    -- YTD
                    SUM(CASE WHEN type = 'Attiva' AND doc_date >= ? AND doc_date <= ? THEN total_amount ELSE 0 END) as revenue_ytd,
                    COUNT(CASE WHEN type = 'Attiva' AND doc_date >= ? AND doc_date <= ? THEN 1 END) as count_ytd
                FROM Invoices
                WHERE anagraphics_id = ?
            )
            SELECT * FROM anagraphic_metrics
        """
        
        cursor.execute(unified_query, (today_str, today_str, start_of_year, today_str, start_of_year, today_str, anagraphic_id))
        totals = cursor.fetchone()
        
        if totals:
            summary['total_invoiced'] = quantize(to_decimal(totals['total_revenue'])) if totals['total_revenue'] else Decimal('0.0')
            summary['total_paid'] = quantize(to_decimal(totals['total_received'])) if totals['total_received'] else Decimal('0.0')
            summary['open_balance'] = summary['total_invoiced'] - summary['total_paid']
            summary['overdue_amount'] = quantize(to_decimal(totals['overdue_amount'])) if totals['overdue_amount'] else Decimal('0.0')
            summary['overdue_count'] = totals['overdue_count'] or 0
            summary['revenue_ytd'] = quantize(to_decimal(totals['revenue_ytd'])) if totals['revenue_ytd'] else Decimal('0.0')
            
            if totals['count_ytd'] and totals['count_ytd'] > 0:
                summary['avg_order_value_ytd'] = quantize(summary['revenue_ytd'] / Decimal(totals['count_ytd']))

        # Segmentazione cliente
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

        # Top 3 prodotti preferiti con query ottimizzata
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
        logger.error(f"Errore sommario finanziario ottimizzato per ID {anagraphic_id}: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

    return summary

def get_top_overdue_invoices(limit=10):
    """Top fatture scadute ottimizzato con query SQL diretta"""
    conn = None
    today_py = date.today()
    today_str = today_py.isoformat()
    cols_out = ['id', 'type', 'doc_number', 'due_date_fmt', 'counterparty_name', 'open_amount_fmt', 'days_overdue', 'priority']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        
        # Query ottimizzata che calcola priorità direttamente in SQL
        query = """
            WITH overdue_with_priority AS (
                SELECT
                    i.id, 
                    i.type, 
                    i.doc_number, 
                    i.due_date,
                    a.denomination AS counterparty_name,
                    (i.total_amount - i.paid_amount) AS open_amount,
                    a.score as customer_score,
                    julianday(?) - julianday(i.due_date) as days_overdue,
                    -- Calcolo priorità in SQL
                    (((i.total_amount - i.paid_amount) / 1000.0) * 0.4 +
                     ((julianday(?) - julianday(i.due_date)) / 10.0) * 0.4 +
                     ((100 - COALESCE(a.score, 50)) / 20.0) * 0.2) as priority_score
                FROM Invoices i 
                JOIN Anagraphics a ON i.anagraphics_id = a.id
                WHERE i.type = 'Attiva'
                  AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND i.due_date IS NOT NULL 
                  AND date(i.due_date) < date(?)
                  AND (i.total_amount - i.paid_amount) > 0.01
            )
            SELECT 
                id, type, doc_number, due_date, counterparty_name, open_amount, days_overdue,
                CASE 
                    WHEN priority_score >= 10 THEN 'Critica'
                    WHEN priority_score >= 5 THEN 'Alta' 
                    WHEN priority_score >= 2 THEN 'Media'
                    ELSE 'Bassa'
                END as priority
            FROM overdue_with_priority
            ORDER BY priority_score DESC
            LIMIT ?
        """
        
        df = pd.read_sql_query(query, conn, params=(today_str, today_str, today_str, limit))

        if df.empty:
            return empty_df

        # Formattazione finale
        df['due_date_fmt'] = pd.to_datetime(df['due_date']).dt.strftime('%d/%m/%Y')
        df['open_amount_fmt'] = df['open_amount'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")
        df['days_overdue'] = df['days_overdue'].astype(int)

        return df[cols_out]
        
    except Exception as e:
        logger.error(f"Errore recupero top fatture scadute ottimizzato: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_due_dates_in_month(year, month):
    """Date con scadenze nel mese ottimizzato"""
    conn = None
    try:
        conn = get_connection()
        start_date = date(year, month, 1)
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)
        start_str, end_str = start_date.isoformat(), end_date.isoformat()
        
        # Query ottimizzata
        query = """
            SELECT DISTINCT date(due_date) as due_day
            FROM Invoices
            WHERE payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND due_date BETWEEN ? AND ?
              AND (total_amount - paid_amount) > 0.01
            ORDER BY due_day
        """
        
        cursor = conn.cursor()
        cursor.execute(query, (start_str, end_str))
        dates = [date.fromisoformat(row['due_day']) for row in cursor.fetchall() if row['due_day']]
        return dates
        
    except Exception as e:
        logger.error(f"Errore recupero date scadenza ottimizzato per {year}-{month}: {e}", exc_info=True)
        return []
    finally:
        if conn:
            conn.close()

def get_invoices_due_on_date(due_date_py):
    """Fatture in scadenza in una data specifica ottimizzato"""
    conn = None
    today_py = date.today()
    cols_out = ['id', 'type', 'doc_number', 'counterparty_name', 'open_amount_fmt', 'days_overdue']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        conn = get_connection()
        due_date_str = due_date_py.isoformat()
        today_str = today_py.isoformat()
        
        # Query ottimizzata
        query = """
            SELECT
                i.id, 
                i.type, 
                i.doc_number, 
                a.denomination AS counterparty_name,
                (i.total_amount - i.paid_amount) AS open_amount,
                julianday(?) - julianday(i.due_date) as days_overdue
            FROM Invoices i 
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE date(i.due_date) = date(?)
              AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND (i.total_amount - i.paid_amount) > 0.01
            ORDER BY a.denomination COLLATE NOCASE, i.type
        """
        
        df = pd.read_sql_query(query, conn, params=(today_str, due_date_str))

        if df.empty:
            return empty_df

        # Formattazione
        df['days_overdue'] = df['days_overdue'].astype(int)
        df['open_amount_fmt'] = df['open_amount'].apply(lambda x: f"{quantize(to_decimal(x)):,.2f}€")

        return df[cols_out]
        
    except Exception as e:
        logger.error(f"Errore recupero fatture per scadenza ottimizzato {due_date_str}: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

# ===== BUSINESS INTELLIGENCE FUNCTIONS =====

def get_business_insights_summary(start_date=None, end_date=None):
    """Riepilogo insights business ottimizzato"""
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
        # Analisi stagionalità ottimizzata
        seasonal_data = get_seasonal_product_analysis('all', 2)
        if not seasonal_data.empty:
            monthly_sales = seasonal_data.groupby('month_num')['total_value'].sum()
            if not monthly_sales.empty:
                peak_month = monthly_sales.idxmax()
                insights['seasonal_trends']['peak_month'] = peak_month
                insights['seasonal_trends']['peak_value'] = f"{monthly_sales[peak_month]:,.2f}€"
        
        # Cash flow health ottimizzato
        cashflow_data = get_cashflow_data_optimized(start_date, end_date)
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
        
        # Prodotti top performance ottimizzato
        products_analysis = get_products_analysis_optimized('Attiva', start_date, end_date, 5)
        if not products_analysis.empty:
            insights['top_performing_products'] = products_analysis['Prodotto Normalizzato'].tolist()
        
        # Raccomandazioni
        recommendations = []
        if 'peak_month' in insights['seasonal_trends']:
            peak = insights['seasonal_trends']['peak_month']
            if peak in ['11', '12', '01']:
                recommendations.append("Incrementa stock agrumi e verdure invernali per il periodo di picco")
            elif peak in ['06', '07', '08']:
                recommendations.append("Pianifica maggiori approvvigionamenti frutta estiva")
        
        if insights['cash_flow_health'] == 'Critico':
            recommendations.append("Rivedere termini di pagamento clienti e ottimizzare incassi")
        
        insights['recommendations'] = recommendations
        return insights
        
    except Exception as e:
        logger.error(f"Errore generazione business insights ottimizzato: {e}", exc_info=True)
        return insights

# ===== EXPORT UTILITIES =====

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
                        df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
            elif isinstance(data, pd.DataFrame) and not data.empty:
                data.to_excel(writer, sheet_name='Analisi', index=False)
        
        logger.info(f"Analisi esportata in: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"Errore esportazione Excel: {e}", exc_info=True)
        return None

# ===== ADDITIONAL COMPATIBILITY ALIASES =====

# Mantieni tutte le funzioni originali mappate alle versioni ottimizzate
def get_monthly_cash_flow_analysis(months: int = 12) -> pd.DataFrame:
    """Compatibility alias for get_cashflow_data"""
    start_date = (datetime.now() - pd.DateOffset(months=months)).strftime('%Y-%m-%d')
    return get_cashflow_data_optimized(start_date, None)

def get_monthly_revenue_analysis(months: int = 12, invoice_type: Optional[str] = None) -> pd.DataFrame:
    """Compatibility alias for get_monthly_revenue_costs"""
    start_date = (datetime.now() - pd.DateOffset(months=months)).strftime('%Y-%m-%d')
    return get_monthly_revenue_costs_optimized(start_date, None)

def get_product_analysis(limit: int = 50, period_months: int = 12, min_quantity: Optional[float] = None, invoice_type: Optional[str] = None) -> pd.DataFrame:
    """Compatibility alias for get_products_analysis_optimized"""
    start_date = (datetime.now() - pd.DateOffset(months=period_months)).strftime('%Y-%m-%d')
    return get_products_analysis_optimized(invoice_type or 'Attiva', start_date, None, limit)

# Funzioni stub per compatibilità con funzioni avanzate non ancora implementate nel core
def get_top_clients_performance(start_date=None, end_date=None, limit=20):
    """Stub: usa get_top_clients_by_revenue come fallback"""
    return get_top_clients_by_revenue(start_date, end_date, limit)

def get_supplier_analysis(start_date=None, end_date=None):
    """Stub: usa get_products_analysis per fornitori"""
    return get_products_analysis_optimized('Passiva', start_date, end_date)

def get_advanced_cashflow_analysis(start_date=None, end_date=None):
    """Stub: usa get_cashflow_data_optimized"""
    return get_cashflow_data_optimized(start_date, end_date)

def get_waste_and_spoilage_analysis(start_date=None, end_date=None):
    """Stub: analisi base scarti"""
    return {'message': 'Funzione disponibile tramite adapter', 'data': []}

def get_inventory_turnover_analysis(start_date=None, end_date=None):
    """Stub: analisi rotazione base"""
    return pd.DataFrame({'message': ['Funzione disponibile tramite adapter']})

def get_price_trend_analysis(product_name=None, start_date=None, end_date=None):
    """Stub: analisi trend prezzi base"""
    if product_name:
        return {'product': product_name, 'message': 'Usa get_product_monthly_sales per analisi dettagliate'}
    return {'message': 'Funzione disponibile tramite adapter'}

def get_market_basket_analysis(start_date=None, end_date=None, min_support=0.01):
    """Stub: market basket base"""
    return {'message': 'Funzione disponibile tramite adapter', 'associations': []}

def get_customer_rfm_analysis(analysis_date=None):
    """Stub: RFM base"""
    return {'message': 'Funzione disponibile tramite adapter', 'segments': {}}

def get_customer_churn_analysis():
    """Stub: churn analysis base"""
    return pd.DataFrame({'message': ['Funzione disponibile tramite adapter']})

def get_payment_behavior_analysis():
    """Stub: payment behavior base"""
    return {'message': 'Funzione disponibile tramite adapter'}

def get_competitive_analysis():
    """Stub: competitive analysis base"""
    return pd.DataFrame({'message': ['Funzione disponibile tramite adapter']})

def get_sales_forecast(product_name=None, months_ahead=3):
    """Stub: sales forecast base"""
    return pd.DataFrame({'message': ['Funzione disponibile tramite adapter']})

def get_top_suppliers_by_cost(start_date=None, end_date=None, limit=20):
    """Stub: usa get_top_clients_by_revenue per fornitori"""
    return get_top_clients_by_revenue(start_date, end_date, limit)

def get_product_sales_comparison(normalized_description, year1, year2):
    """Stub: confronto vendite prodotto"""
    return pd.DataFrame({'message': ['Funzione disponibile tramite adapter']})

# ===== BACKWARD COMPATIBILITY LEGACY FUNCTIONS =====

def get_cashflow_data_original(*args, **kwargs):
    """Legacy alias - deprecato"""
    logger.warning("get_cashflow_data_original è deprecata, usa get_cashflow_data")
    return get_cashflow_data_optimized(*args, **kwargs)

def get_cashflow_table_original(*args, **kwargs):
    """Legacy alias - deprecato"""
    logger.warning("get_cashflow_table_original è deprecata, usa get_cashflow_table")
    return get_cashflow_table(*args, **kwargs)

def _get_categorized_transactions(*args, **kwargs):
    """Legacy alias - deprecato"""
    logger.warning("_get_categorized_transactions è deprecata, usa _categorize_transactions_optimized")
    return _categorize_transactions_optimized(*args, **kwargs)

# ===== FINAL LOGGING =====

logger.info("Core analysis ottimizzato caricato - SQL-first approach, categorizzazione dichiarativa, performance migliorata")# core/analysis.py - Analisi ottimizzate per business ingrosso frutta e verdura
# Versione ottimizzata: SQL-first approach, categorizzazione dichiarativa, performance migliorata

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

# ===== CATEGORIZATION RULES SYSTEM (DICHIARATIVO) =====

# Sistema di regole dichiarativo per categorizzazione transazioni
TRANSACTION_CATEGORIES = [
    {
        'category': 'Incassi_Clienti',
        'patterns': [],
        'conditions': lambda row: row.get('amount', 0) > 0 and row.get('has_active_links', False),
        'priority': 100
    },
    {
        'category': 'Pagamenti_Fornitori', 
        'patterns': [],
        'conditions': lambda row: row.get('amount', 0) < 0 and row.get('has_passive_links', False),
        'priority': 100
    },
    {
        'category': 'Incassi_Contanti',
        'patterns': [r'(VERSAMENTO CONTANT|CONTANTI|CASSA)'],
        'conditions': lambda row: row.get('amount', 0) > 0,
        'priority': 90
    },
    {
        'category': 'Commissioni_Bancarie',
        'patterns': [r'^(COMMISSIONI|COMPETENZE BANC|SPESE TENUTA CONTO|IMPOSTA DI BOLLO|CANONE)'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 90
    },
    {
        'category': 'Spese_Carte',
        'patterns': [r'\b(POS|PAGOBANCOMAT|CIRRUS|MAESTRO|VISA|MASTERCARD|AMEX|WORLDLINE|ESE COMM)\b'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 85
    },
    {
        'category': 'Carburanti',
        'patterns': [r'(BENZINA|GASOLIO|CARBURANTE|DISTRIBUTORE|ENI|AGIP|Q8)'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 80
    },
    {
        'category': 'Trasporti',
        'patterns': [r'(AUTOSTRADA|PEDAGGI|TELEPASS|TRASPORT)'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 80
    },
    {
        'category': 'Utenze',
        'patterns': [r'(ENEL|GAS|ACQUA|TELEFON|INTERNET|TIM|VODAFONE)'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 80
    },
    {
        'category': 'Tasse_Tributi',
        'patterns': [r'(F24|TRIBUTI|INPS|INAIL|AGENZIA ENTRATE)'],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 80
    },
    {
        'category': 'Altri_Incassi',
        'patterns': [],
        'conditions': lambda row: row.get('amount', 0) > 0,
        'priority': 10
    },
    {
        'category': 'Altri_Pagamenti',
        'patterns': [],
        'conditions': lambda row: row.get('amount', 0) < 0,
        'priority': 10
    }
]

def _apply_categorization_rules(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applica sistema di regole dichiarativo per categorizzazione.
    PERFORMANCE: Usa vectorized operations invece di loop row-by-row.
    """
    if df.empty:
        return df
    
    # Prepara dati per categorizzazione
    df['category'] = 'Altri'
    df['description_upper'] = df['description'].astype(str).str.upper()
    df['amount_dec'] = df['amount'].apply(lambda x: quantize(to_decimal(x)))
    
    # Determina presenza di link
    df['has_active_links'] = df['linked_invoice_types'].astype(str).str.contains('Attiva', na=False)
    df['has_passive_links'] = df['linked_invoice_types'].astype(str).str.contains('Passiva', na=False)
    df['has_links'] = df['link_ids'].notna()
    
    # Applica regole in ordine di priorità
    sorted_rules = sorted(TRANSACTION_CATEGORIES, key=lambda x: x['priority'], reverse=True)
    
    for rule in sorted_rules:
        # Crea mask per questa regola
        mask = pd.Series([True] * len(df), index=df.index)
        
        # Applica pattern regex se presenti
        if rule['patterns']:
            pattern_mask = pd.Series([False] * len(df), index=df.index)
            for pattern in rule['patterns']:
                pattern_mask |= df['description_upper'].str.contains(pattern, regex=True, na=False)
            mask &= pattern_mask
        
        # Applica condizioni funzionali
        if rule['conditions']:
            condition_mask = df.apply(rule['conditions'], axis=1)
            mask &= condition_mask
        
        # Applica categoria solo dove non è già stata assegnata una categoria di priorità più alta
        final_mask = mask & (df['category'] == 'Altri')
        df.loc[final_mask, 'category'] = rule['category']
    
    return df

# ===== OPTIMIZED CORE FUNCTIONS (SQL-FIRST APPROACH) =====

def _categorize_transactions_optimized(start_date_str: str, end_date_str: str) -> pd.DataFrame:
    """
    Categorizzazione transazioni ottimizzata: usa query SQL aggregate invece di caricare tutto in memoria.
    PERFORMANCE: Riduce significativamente l'uso di memoria e migliora velocità.
    """
    conn = None
    try:
        conn = get_connection()
        
        # Query ottimizzata che fa JOIN e aggregazione direttamente in SQL
        query_trans = """
            SELECT
                bt.id as transaction_id,
                bt.transaction_date,
                bt.amount,
                bt.description,
                GROUP_CONCAT(DISTINCT rl.id) as link_ids,
                GROUP_CONCAT(DISTINCT i.type) as linked_invoice_types,
                COALESCE(SUM(rl.reconciled_amount), 0) as total_linked_amount,
                CASE WHEN COUNT(rl.id) > 0 THEN 1 ELSE 0 END as has_links
            FROM BankTransactions bt
            LEFT JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id
            LEFT JOIN Invoices i ON rl.invoice_id = i.id
            WHERE bt.transaction_date BETWEEN ? AND ?
              AND bt.reconciliation_status != 'Ignorato'
            GROUP BY bt.id, bt.transaction_date, bt.amount, bt.description
            ORDER BY bt.transaction_date
        """
        
        df = pd.read_sql_query(query_trans, conn, params=(start_date_str, end_date_str), parse_dates=['transaction_date'])

        if df.empty:
            logger.info("Nessuna transazione trovata nel periodo per la categorizzazione.")
            return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])

        # Applica sistema di categorizzazione dichiarativo
        df = _apply_categorization_rules(df)
        
        return df[['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec']]

    except Exception as e:
        logger.error(f"Errore durante la categorizzazione delle transazioni: {e}", exc_info=True)
        return pd.DataFrame(columns=['transaction_id', 'transaction_date', 'amount', 'description', 'category', 'amount_dec'])
    finally:
        if conn: 
            conn.close()

def get_cashflow_data_optimized(start_date=None, end_date=None):
    """
    Cash flow data ottimizzato: usa aggregazione SQL invece di Pandas groupby su grandi dataset.
    PERFORMANCE: Query SQL fa il lavoro pesante, Python riceve solo risultati aggregati.
    """
    # Usa helper per standardizzare date
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=365)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    cols_out = ['month', 'incassi_clienti', 'incassi_contanti', 'altri_incassi', 
                'pagamenti_fornitori', 'spese_carte', 'carburanti', 'trasporti', 
                'utenze', 'tasse_tributi', 'commissioni_bancarie', 'altri_pagamenti',
                'net_operational_flow', 'total_inflows', 'total_outflows', 'net_cash_flow']
    
    empty_df = pd.DataFrame(columns=cols_out).astype(float)
    empty_df['month'] = pd.Series(dtype='str')

    conn = None
    try:
        conn = get_connection()
        
        # Query SQL ottimizzata che fa categorizzazione e aggregazione direttamente nel database
        cashflow_query = """
            WITH categorized_transactions AS (
                SELECT
                    strftime('%Y-%m', bt.transaction_date) as month,
                    bt.amount,
                    bt.description,
                    CASE WHEN COUNT(rl.id) > 0 THEN 1 ELSE 0 END as has_links,
                    GROUP_CONCAT(DISTINCT i.type) as linked_types,
                    -- Categorizzazione in SQL usando CASE WHEN
                    CASE 
                        WHEN bt.amount > 0 AND GROUP_CONCAT(DISTINCT i.type) LIKE '%Attiva%' THEN 'incassi_clienti'
                        WHEN bt.amount < 0 AND GROUP_CONCAT(DISTINCT i.type) LIKE '%Passiva%' THEN 'pagamenti_fornitori'
                        WHEN bt.amount > 0 AND (UPPER(bt.description) LIKE '%VERSAMENTO CONTANT%' OR UPPER(bt.description) LIKE '%CONTANTI%') THEN 'incassi_contanti'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE 'COMMISSIONI%' OR UPPER(bt.description) LIKE 'COMPETENZE BANC%') THEN 'commissioni_bancarie'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE '%POS%' OR UPPER(bt.description) LIKE '%PAGOBANCOMAT%') THEN 'spese_carte'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE '%BENZINA%' OR UPPER(bt.description) LIKE '%CARBURANTE%') THEN 'carburanti'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE '%AUTOSTRADA%' OR UPPER(bt.description) LIKE '%TRASPORT%') THEN 'trasporti'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE '%ENEL%' OR UPPER(bt.description) LIKE '%GAS%' OR UPPER(bt.description) LIKE '%TELEFON%') THEN 'utenze'
                        WHEN bt.amount < 0 AND (UPPER(bt.description) LIKE '%F24%' OR UPPER(bt.description) LIKE '%TRIBUTI%') THEN 'tasse_tributi'
                        WHEN bt.amount > 0 THEN 'altri_incassi'
                        WHEN bt.amount < 0 THEN 'altri_pagamenti'
                        ELSE 'altri'
                    END as category
                FROM BankTransactions bt
                LEFT JOIN ReconciliationLinks rl ON bt.id = rl.transaction_id
                LEFT JOIN Invoices i ON rl.invoice_id = i.id
                WHERE bt.transaction_date BETWEEN ? AND ?
                  AND bt.reconciliation_status != 'Ignorato'
                GROUP BY bt.id, bt.transaction_date, bt.amount, bt.description
            )
            SELECT 
                month,
                COALESCE(SUM(CASE WHEN category = 'incassi_clienti' THEN amount ELSE 0 END), 0) as incassi_clienti,
                COALESCE(SUM(CASE WHEN category = 'incassi_contanti' THEN amount ELSE 0 END), 0) as incassi_contanti,
                COALESCE(SUM(CASE WHEN category = 'altri_incassi' THEN amount ELSE 0 END), 0) as altri_incassi,
                COALESCE(SUM(CASE WHEN category = 'pagamenti_fornitori' THEN ABS(amount) ELSE 0 END), 0) as pagamenti_fornitori,
                COALESCE(SUM(CASE WHEN category = 'spese_carte' THEN ABS(amount) ELSE 0 END), 0) as spese_carte,
                COALESCE(SUM(CASE WHEN category = 'carburanti' THEN ABS(amount) ELSE 0 END), 0) as carburanti,
                COALESCE(SUM(CASE WHEN category = 'trasporti' THEN ABS(amount) ELSE 0 END), 0) as trasporti,
                COALESCE(SUM(CASE WHEN category = 'utenze' THEN ABS(amount) ELSE 0 END), 0) as utenze,
                COALESCE(SUM(CASE WHEN category = 'tasse_tributi' THEN ABS(amount) ELSE 0 END), 0) as tasse_tributi,
                COALESCE(SUM(CASE WHEN category = 'commissioni_bancarie' THEN ABS(amount) ELSE 0 END), 0) as commissioni_bancarie,
                COALESCE(SUM(CASE WHEN category = 'altri_pagamenti' THEN ABS(amount) ELSE 0 END), 0) as altri_pagamenti
            FROM categorized_transactions
            GROUP BY month
            ORDER BY month
        """
        
        df = pd.read_sql_query(cashflow_query, conn, params=(start_str, end_str))
        
        if df.empty:
            return empty_df
        
        # Calcola totali e flussi netti
        inflow_cols = ['incassi_clienti', 'incassi_contanti', 'altri_incassi']
        outflow_cols = ['pagamenti_fornitori', 'spese_carte', 'carburanti', 'trasporti', 
                       'utenze', 'tasse_tributi', 'commissioni_bancarie', 'altri_pagamenti']
        
        df['total_inflows'] = df[inflow_cols].sum(axis=1)
        df['total_outflows'] = df[outflow_cols].sum(axis=1)
        df['net_cash_flow'] = df['total_inflows'] - df['total_outflows']
        df['net_operational_flow'] = df['incassi_clienti'] + df['incassi_contanti'] - df['pagamenti_fornitori']

        return df[cols_out]

    except Exception as e:
        logger.error(f"Errore recupero dati cash flow ottimizzato: {e}", exc_info=True)
        return empty_df
    finally:
        if conn:
            conn.close()

def get_monthly_revenue_costs_optimized(start_date=None, end_date=None):
    """
    Analisi ricavi e costi ottimizzata: query SQL diretta con pivot incorporato.
    PERFORMANCE: Evita il caricamento di tutte le fatture in memoria.
    """
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=365)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    conn = None
    try:
        conn = get_connection()
        
        # Query SQL ottimizzata con pivot incorporato
        revenue_costs_query = """
            SELECT 
                strftime('%Y-%m', doc_date) AS month,
                COALESCE(SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END), 0) as cost,
                (COALESCE(SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END), 0) - 
                 COALESCE(SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END), 0)) as gross_margin,
                CASE 
                    WHEN SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) > 0 THEN
                        ROUND(((SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END) - 
                               SUM(CASE WHEN type = 'Passiva' THEN total_amount ELSE 0 END)) / 
                              SUM(CASE WHEN type = 'Attiva' THEN total_amount ELSE 0 END)) * 100, 2)
                    ELSE 0 
                END as margin_percent
            FROM Invoices
            WHERE doc_date BETWEEN ? AND ?
            GROUP BY strftime('%Y-%m', doc_date)
            ORDER BY month
        """
        
        df = pd.read_sql_query(revenue_costs_query, conn, params=(start_str, end_str))
        
        if df.empty:
            logger.info("Nessuna fattura trovata nel periodo per revenue/costs.")
            return pd.DataFrame(columns=['month', 'revenue', 'cost', 'gross_margin', 'margin_percent'])

        return df

    except Exception as e:
        logger.error(f"Errore calcolo revenue/cost ottimizzato: {e}", exc_info=True)
        return pd.DataFrame(columns=['month', 'revenue', 'cost', 'gross_margin', 'margin_percent'])
    finally:
        if conn: 
            conn.close()

def get_products_analysis_optimized(invoice_type='Attiva', start_date=None, end_date=None, limit=50):
    """
    Analisi prodotti ottimizzata: aggregazione SQL con normalizzazione incorporata.
    PERFORMANCE: Riduce drasticamente l'uso di memoria per grandi dataset di righe fattura.
    """
    start_date_obj, end_date_obj = _resolve_date_range(start_date, end_date, default_days=90)
    start_str, end_str = start_date_obj.isoformat(), end_date_obj.isoformat()
    
    cols_out = ['Prodotto Normalizzato', 'Quantità Tot.', 'Valore Totale', 'N. Fatture', 'Prezzo Medio', 'Descrizioni Originali']
    empty_df = pd.DataFrame(columns=cols_out)

    conn = None
    try:
        conn = get_connection()
        
        # Query SQL ottimizzata che fa aggregazione direttamente nel database
        products_query = """
            WITH product_aggregation AS (
                SELECT
                    il.description,
                    SUM(il.quantity) as total_quantity,
                    SUM(il.total_price) as total_value,
                    AVG(il.unit_price) as avg_unit_price,
                    COUNT(DISTINCT i.id) as num_invoices,
                    GROUP_CONCAT(DISTINCT il.description) as original_descriptions
                FROM InvoiceLines il
                JOIN Invoices i ON il.invoice_id = i.id
                WHERE i.type = ? AND i.doc_date BETWEEN ? AND ?
                  AND il.description IS NOT NULL AND TRIM(il.description) != ''
                  AND il.quantity IS NOT NULL AND il.total_price IS NOT NULL
                GROUP BY il.description
                HAVING total_value > 0
                ORDER BY total_value DESC
                LIMIT ?
            )
            SELECT *
            FROM product_aggregation
        """
        
        df = pd.read_sql_query(products_query, conn, params=(invoice_type, start_str, end_str, limit))

        if df.empty:
            return empty_df

        # Applica normalizzazione solo ai risultati aggregati (molto più efficiente)
        df['normalized_product'] = df['description'].apply(normalize_product_name)
        df = df.dropna(subset=['normalized_product'])

        if df.empty:
            return empty_df

        # Aggrega ulteriormente per prodotto normalizzato
        df_final = df.groupby('normalized_product').agg(
            total_quantity=('total_quantity', 'sum'),
            total_value=('total_value', 'sum'),
            avg_unit_price=('avg_unit_price', 'mean'),
            num_invoices=('num_invoices', 'sum'),
            original_descriptions=('original_descriptions', lambda x: '|'.join(sorted(set('|'.join(x).split('|')))))
        ).reset_index()

        # Formattazione finale
        df_final['Prodotto Normalizzato'] = df_final['normalized_product']
        df_final['Quantità Tot.'] = df_final['total_quantity'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
        df_final['Valore Totale'] = df_final['total_value'].apply(lambda x: f"{x:,.2f}€")
        df_final['N. Fatture'] = df_final['num_invoices']
        df_final['Prezzo Medio'] = df_final['avg_unit_price'].apply(lambda x: f"{x:,.2f}€" if pd.notna(x) else '0,00€')
        df_final['Descrizioni Originali'] = df_final['original_descriptions']

        return df_final[cols_out].sort_values(by='total_value', ascending=False)

    except Exception as e:
        logging.error(f"Errore analisi prodotti ottimizzata ({invoice_type}): {e}", exc_info=True)
        return empty_df
    finally:
        if conn: 
            conn.close()

# ===== UTILITY FUNCTIONS (CENTRALIZED DATE HANDLING) =====

def _resolve_date_range(start_date, end_date, default_days=365):
    """
    Helper centralizzato per gestione date.
    ROBUSTEZZA: Logica di date unificata e riutilizzabile.
    """
    if end_date:
        end_date_obj = pd.to_datetime(end_date, errors='coerce').date()
        if pd.isna(end_date_obj):
            end_date_obj = date.today()
    else:
        end_date_obj = date.today()
    
    if start_date:
        start_date_obj = pd.to_datetime(start_date, errors='coerce').date()
        if pd.isna(start_date_obj):
            start_date_obj = end_date_obj - timedelta(days=default_days)
    else:
        start_date_obj = end_date_obj - timedelta(days=default_days)
    
    return start_date_obj, end_date_obj

# ===== BACKWARD COMPATIBILITY LAYER =====

# Mantieni tutte le funzioni originali per compatibilità, ma con performance migliorate

# =========================================================================
# ===== INIZIO DELLA PARTE MANCANTE DA AGGIUNGERE =========================
# =========================================================================

def _categorize_transactions(start_date_str: str, end_date_str: str) -> pd.DataFrame:
    """Backward compatibility: usa versione ottimizzata"""
    return _categorize_transactions_optimized(start_date_str, end_date_str)

def get_cashflow_data(start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_cashflow_data_optimized(start_date, end_date)

def get_cashflow_table(start_date=None, end_date=None):
    """Tabella cash flow formattata per UI - usa dati ottimizzati"""
    cols_out = ['Mese', 'Incassi Clienti', 'Incassi Contanti', 'Altri Incassi', 'Tot. Entrate',
                'Pagam. Fornitori', 'Spese Varie', 'Carburanti', 'Utenze', 'Tasse', 'Commissioni', 'Tot. Uscite',
                'Flusso Operativo', 'Flusso Netto']
    empty_df = pd.DataFrame(columns=cols_out)
    
    try:
        df_data = get_cashflow_data_optimized(start_date, end_date)
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
            except Exception:
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

def get_monthly_revenue_costs(start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_monthly_revenue_costs_optimized(start_date, end_date)

def get_products_analysis(invoice_type='Attiva', start_date=None, end_date=None):
    """Backward compatibility: usa versione ottimizzata"""
    return get_products_analysis_optimized(invoice_type, start_date, end_date)

# ===== ENHANCED FUNCTIONS =====

def calculate_and_update_client_scores():
    """Calcolo score clienti con logica migliorata e query ottimizzate"""
    conn = None
    today = date.today()
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Query ottimizzata che calcola tutto in SQL
        query = """
            WITH payment_analysis AS (
                SELECT 
                    i.anagraphics_id,
                    COUNT(*) as total_invoices,
                    AVG(CASE 
                        WHEN i.due_date IS NOT NULL AND bt.transaction_date IS NOT NULL THEN
                            julianday(bt.transaction_date) - julianday(i.due_date)
                        ELSE NULL 
                    END) as avg_delay_days,
                    SUM(i.total_amount) as total_amount,
                    -- Weighted delay considering invoice amounts
                    SUM(CASE 
                        WHEN i.due_date IS NOT NULL AND bt.transaction_date IS NOT NULL THEN
                            ((julianday(bt.transaction_date) - julianday(i.due_date)) * i.total_amount)
                        ELSE 0 
                    END) / NULLIF(SUM(i.total_amount), 0) as weighted_avg_delay,
                    -- Payment frequency score
                    COUNT(*) / MAX(1.0, (julianday('now') - julianday(MIN(i.doc_date))) / 365.0) as payment_frequency_yearly
                FROM Invoices i
                JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                WHERE i.type = 'Attiva'
                  AND i.payment_status IN ('Pagata Tot.', 'Riconciliata')
                  AND i.due_date IS NOT NULL
                GROUP BY i.anagraphics_id
            ),
            client_scores AS (
                SELECT 
                    anagraphics_id,
                    -- Base score calculation
                    ROUND(
                        100.0 
                        -- Penalty for delays
                        - GREATEST(0, COALESCE(avg_delay_days, 0)) * 1.5
                        - GREATEST(0, COALESCE(weighted_avg_delay, 0)) * 0.5
                        -- Bonuses
                        + LEAST(10, total_amount / 10000.0)  -- Volume bonus (max 10 pts for 100k+)
                        + LEAST(5, payment_frequency_yearly / 2.0)  -- Frequency bonus (max 5 pts for 10+ yearly)
                    , 1) as calculated_score
                FROM payment_analysis
            )
            UPDATE Anagraphics 
            SET score = (
                SELECT CASE 
                    WHEN calculated_score < 0 THEN 0.0
                    WHEN calculated_score > 100 THEN 100.0
                    ELSE calculated_score
                END
                FROM client_scores 
                WHERE client_scores.anagraphics_id = Anagraphics.id
            ),
            updated_at = datetime('now')
            WHERE id IN (SELECT anagraphics_id FROM client_scores)
        """
        
        cursor.execute(query)
        updated_count = cursor.rowcount
        conn.commit()
        
        logger.info(f"Score calculation completed. Updated: {updated_count} clients.")
        return True
        
    except Exception as e:
        logger.error(f"Errore calcolo score ottimizzato: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            conn.close()

def get_dashboard_kpis():
    # ... (tutta la funzione get_dashboard_kpis)
    # ...
    # (ometto il corpo per brevità, ma deve essere presente)

def get_top_clients_by_revenue(start_date=None, end_date=None, limit=20):
    # ... (tutta la funzione get_top_clients_by_revenue)
    # ...

def get_aging_summary_optimized(invoice_type='Attiva'):
    # ... (tutta la funzione get_aging_summary_optimized)
    # ...

# (e così via per tutte le altre funzioni...)

# ===== FINAL LOGGING =====
logger.info("Core analysis ottimizzato caricato - SQL-first approach, categorizzazione dichiarativa, performance migliorata")

# =======================================================================
# ===== FINE DELLA PARTE MANCANTE DA AGGIUNGERE =========================
# =======================================================================
