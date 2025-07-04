# core/database.py

import sqlite3
import os
from datetime import datetime, date
import configparser
import logging
import pandas as pd
from decimal import Decimal, InvalidOperation
import re # Importa re per usare regex nel filtro POS avanzato
from pathlib import Path

# Importa solo le funzioni necessarie da utils per evitare cicli
try:
    from .utils import to_decimal, quantize, AMOUNT_TOLERANCE
except ImportError:
    logging.warning("Import relativo .utils fallito in database.py, tento import assoluto.")
    try:
        from utils import to_decimal, quantize, AMOUNT_TOLERANCE
    except ImportError as e_abs:
        logging.critical(f"FATAL: Impossibile importare funzioni necessarie da utils ({e_abs}).")
        # Definisci fallback minimali per permettere avvio, ma con funzionalità ridotte
        AMOUNT_TOLERANCE = Decimal('0.01')
        def to_decimal(value, default='0.0'): return Decimal(value) if value else Decimal(default)
        def quantize(d): return d.quantize(Decimal('0.01')) if isinstance(d, Decimal) else Decimal('NaN')


DATABASE_NAME = 'database.db'
logger = logging.getLogger(__name__)


def get_db_path():
    """
    Calcola il percorso del database in modo robusto, relativo alla root del backend.
    """
    # La root del progetto backend è la directory che contiene 'app', 'scripts', 'data', etc.
    backend_root = Path(__file__).resolve().parent.parent.parent
    config_path = backend_root / 'config.ini'

    if not config_path.exists():
        logging.warning(f"Config file non trovato in {config_path}. Uso percorso di default.")
        db_path = backend_root / 'data' / 'fattura_analyzer.db'
    else:
        config = configparser.ConfigParser()
        config.read(config_path)
        db_rel_path_str = config.get('Paths', 'DatabaseFile', fallback='data/fattura_analyzer.db')
        db_path = backend_root / db_rel_path_str

    # Assicura che la directory genitore esista
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    logging.info(f"Percorso database determinato: {db_path}")
    return str(db_path)

DB_PATH = get_db_path()

def get_connection():
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode=WAL;")
        logging.debug(f"Connessione DB {DB_PATH} OK (WAL mode).")
        return conn
    except sqlite3.Error as e:
        logging.error(f"Errore connessione DB {DB_PATH}: {e}")
        raise

def ensure_settings_table_compatibility():
    """Assicura che la tabella Settings sia compatibile con entrambi i sistemi (core e first_run)"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Verifica se la tabella Settings esiste
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='Settings'
        """)
        
        if cursor.fetchone():
            # Tabella esiste, verifica schema
            cursor.execute("PRAGMA table_info(Settings)")
            columns_info = cursor.fetchall()
            existing_columns = {row[1]: row for row in columns_info}  # row[1] è il nome colonna
            
            # Verifica se mancano le colonne timestamp
            needs_created_at = 'created_at' not in existing_columns
            needs_updated_at = 'updated_at' not in existing_columns
            
            if needs_created_at or needs_updated_at:
                logging.info("Aggiornamento schema Settings per compatibilità con first_run...")
                
                # Backup dati esistenti
                cursor.execute("SELECT key, value FROM Settings")
                existing_data = cursor.fetchall()
                
                # Drop e ricrea con schema completo
                cursor.execute("DROP TABLE Settings")
                
                # Crea con schema completo
                cursor.execute("""
                    CREATE TABLE Settings (
                        key TEXT PRIMARY KEY,
                        value TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Ripristina dati
                for row in existing_data:
                    cursor.execute("""
                        INSERT INTO Settings (key, value, created_at, updated_at)
                        VALUES (?, ?, datetime('now'), datetime('now'))
                    """, (row[0], row[1]))
                
                logging.info(f"Schema Settings aggiornato. Ripristinati {len(existing_data)} record.")
        else:
            # Tabella non esiste, crea con schema completo
            cursor.execute("""
                CREATE TABLE Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logging.info("Tabella Settings creata con schema completo.")
        
        conn.commit()
        
    except sqlite3.Error as e:
        logging.error(f"Errore aggiornamento schema Settings: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def create_tables():
    logging.info(f"Verifica/Creazione tabelle in: {DB_PATH}")
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Prima assicura compatibilità Settings
        ensure_settings_table_compatibility()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Anagraphics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN ('Cliente', 'Fornitore')),
                piva TEXT,
                cf TEXT,
                denomination TEXT NOT NULL COLLATE NOCASE,
                address TEXT,
                cap TEXT,
                city TEXT,
                province TEXT,
                country TEXT DEFAULT 'IT',
                iban TEXT,
                email TEXT,
                phone TEXT,
                pec TEXT,
                codice_destinatario TEXT,
                score REAL DEFAULT 100.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );""")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anagraphics_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('Attiva', 'Passiva')),
                doc_type TEXT,
                doc_number TEXT NOT NULL COLLATE NOCASE,
                doc_date DATE NOT NULL,
                total_amount REAL NOT NULL,
                due_date DATE,
                payment_status TEXT DEFAULT 'Aperta' CHECK(payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.', 'Pagata Tot.', 'Insoluta', 'Riconciliata')),
                paid_amount REAL DEFAULT 0.0,
                payment_method TEXT,
                notes TEXT,
                xml_filename TEXT,
                p7m_source_file TEXT,
                unique_hash TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (anagraphics_id) REFERENCES Anagraphics(id) ON DELETE RESTRICT
            );""")
        try:
             cursor.execute("ALTER TABLE Invoices ADD COLUMN paid_amount REAL DEFAULT 0.0;")
             logging.info("Colonna 'paid_amount' aggiunta a Invoices.")
        except sqlite3.OperationalError: pass
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS InvoiceLines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                line_number INTEGER NOT NULL,
                description TEXT COLLATE NOCASE,
                quantity REAL,
                unit_measure TEXT,
                unit_price REAL,
                total_price REAL NOT NULL,
                vat_rate REAL NOT NULL,
                item_code TEXT COLLATE NOCASE,
                item_type TEXT,
                FOREIGN KEY (invoice_id) REFERENCES Invoices(id) ON DELETE CASCADE
            );""")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS InvoiceVATSummary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                vat_rate REAL NOT NULL,
                taxable_amount REAL NOT NULL,
                vat_amount REAL NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES Invoices(id) ON DELETE CASCADE
            );""")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS BankTransactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_date DATE NOT NULL,
                value_date DATE,
                amount REAL NOT NULL,
                description TEXT COLLATE NOCASE,
                causale_abi INTEGER,
                unique_hash TEXT UNIQUE NOT NULL,
                reconciliation_status TEXT DEFAULT 'Da Riconciliare' CHECK(reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.', 'Riconciliato Tot.', 'Riconciliato Eccesso', 'Ignorato')),
                reconciled_amount REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );""")
        try:
            cursor.execute("ALTER TABLE BankTransactions ADD COLUMN reconciled_amount REAL DEFAULT 0.0;")
            logging.info("Colonna 'reconciled_amount' aggiunta a BankTransactions.")
        except sqlite3.OperationalError: pass
        try:
            cursor.execute("ALTER TABLE BankTransactions ADD COLUMN reconciliation_status TEXT DEFAULT 'Da Riconciliare';")
            logging.info("Colonna 'reconciliation_status' aggiunta a BankTransactions.")
        except sqlite3.OperationalError: pass
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ReconciliationLinks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                invoice_id INTEGER NOT NULL,
                reconciled_amount REAL NOT NULL,
                reconciliation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(transaction_id, invoice_id),
                FOREIGN KEY (transaction_id) REFERENCES BankTransactions(id) ON DELETE CASCADE,
                FOREIGN KEY (invoice_id) REFERENCES Invoices(id) ON DELETE CASCADE
            );""")
        try:
            cursor.execute("ALTER TABLE ReconciliationLinks ADD COLUMN reconciliation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
            logging.info("Colonna 'reconciliation_date' aggiunta a ReconciliationLinks.")
        except sqlite3.OperationalError: pass
        
        # Settings table con schema completo - già gestita da ensure_settings_table_compatibility()
        # Ma assicuriamoci che esista in caso di fresh install
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        logging.info("Creazione/Verifica indici...")
        indices = [
            "CREATE INDEX IF NOT EXISTS idx_anagraphics_piva ON Anagraphics(piva) WHERE piva IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_anagraphics_cf ON Anagraphics(cf) WHERE cf IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_anagraphics_denomination ON Anagraphics(denomination COLLATE NOCASE);",
            "CREATE INDEX IF NOT EXISTS idx_anagraphics_type ON Anagraphics(type);",
            "CREATE INDEX IF NOT EXISTS idx_anagraphics_score ON Anagraphics(score);",
            "CREATE INDEX IF NOT EXISTS idx_invoices_anagraphics_id ON Invoices(anagraphics_id);",
            "CREATE INDEX IF NOT EXISTS idx_invoices_type_status ON Invoices(type, payment_status);",
            "CREATE INDEX IF NOT EXISTS idx_invoices_doc_date ON Invoices(doc_date);",
            "CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON Invoices(due_date) WHERE due_date IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_invoices_doc_number ON Invoices(doc_number COLLATE NOCASE);",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_hash ON Invoices(unique_hash);",
            "CREATE INDEX IF NOT EXISTS idx_invoicelines_invoice ON InvoiceLines(invoice_id);",
            "CREATE INDEX IF NOT EXISTS idx_invoicelines_item_code ON InvoiceLines(item_code COLLATE NOCASE) WHERE item_code IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_invoicelines_description ON InvoiceLines(description COLLATE NOCASE) WHERE description IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_transactions_date ON BankTransactions(transaction_date);",
            "CREATE INDEX IF NOT EXISTS idx_transactions_status ON BankTransactions(reconciliation_status);",
            "CREATE INDEX IF NOT EXISTS idx_transactions_amount ON BankTransactions(amount);",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_hash ON BankTransactions(unique_hash);",
            "CREATE INDEX IF NOT EXISTS idx_reconlinks_invoice ON ReconciliationLinks(invoice_id);",
            "CREATE INDEX IF NOT EXISTS idx_reconlinks_transaction ON ReconciliationLinks(transaction_id);",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_reconlinks_trans_inv ON ReconciliationLinks(transaction_id, invoice_id);",
            "CREATE INDEX IF NOT EXISTS idx_settings_key ON Settings(key);"
        ]
        for index_sql in indices:
            try:
                cursor.execute(index_sql)
            except sqlite3.OperationalError as e:
                if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                    logging.warning(f"Errore creazione indice (ignoro se esiste già): {e} SQL: {index_sql}")

        conn.commit()
        logging.info("Tabelle e indici DB pronti.")
        
        # Verifica finale compatibilità Settings
        cursor.execute("PRAGMA table_info(Settings)")
        settings_columns = [row[1] for row in cursor.fetchall()]
        required_columns = ['key', 'value', 'created_at', 'updated_at']
        
        if all(col in settings_columns for col in required_columns):
            logging.info("✅ Tabella Settings completamente compatibile con first_run.py")
        else:
            missing = [col for col in required_columns if col not in settings_columns]
            logging.warning(f"⚠️ Tabella Settings manca colonne: {missing}")
            
    except sqlite3.Error as e:
        logging.error(f"Errore creazione tabelle/indici: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception as rb_err:
                logging.error(f"Errore durante rollback in create_tables: {rb_err}")
        raise
    finally:
        if conn:
            try:
                conn.close()
            except Exception as close_err:
                logging.error(f"Errore chiusura connessione in create_tables: {close_err}")

def check_entity_duplicate(cursor, table, column, value):
    try:
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = ? LIMIT 1", (value,))
        return cursor.fetchone() is not None
    except sqlite3.Error as e:
        logger.error(f"Errore check duplicato {table}.{column} = '{value}': {e}")
        return False

# === FUNZIONI DI PULIZIA E VALIDAZIONE ===

def clean_fiscal_code(code):
    """
    Pulisce un codice fiscale/P.IVA rimuovendo caratteri non validi.
    
    Args:
        code: Stringa da pulire
    
    Returns:
        str: Codice pulito o stringa vuota
    """
    if not code:
        return ''
    
    # Rimuovi spazi, trattini e altri caratteri comuni
    cleaned = re.sub(r'[^A-Z0-9]', '', str(code).upper().strip())
    
    # Validazioni base
    if len(cleaned) < 8:  # Troppo corto per essere valido
        return ''
    
    # P.IVA italiana: 11 cifre
    if len(cleaned) == 11 and cleaned.isdigit():
        return cleaned
    
    # CF italiano: 16 caratteri alfanumerici
    if len(cleaned) == 16 and re.match(r'^[A-Z0-9]{16}$', cleaned):
        return cleaned
    
    # P.IVA estera o altri formati validi (8-15 caratteri)
    if 8 <= len(cleaned) <= 15:
        return cleaned
    
    return ''

def extract_significant_words(text):
    """
    Estrae parole significative da una denominazione per ricerca fuzzy.
    
    Args:
        text: Testo da analizzare
    
    Returns:
        list: Lista di parole significative
    """
    if not text:
        return []
    
    # Parole da ignorare nella ricerca
    stop_words = {
        'srl', 'spa', 'snc', 'sas', 'sc', 'ss', 'scs', 'scrl', 'scarl',
        'di', 'del', 'della', 'delle', 'dei', 'degli', 'da', 'in', 'con',
        'per', 'su', 'tra', 'fra', 'a', 'e', 'o', 'il', 'la', 'lo', 'gli',
        'le', 'un', 'una', 'uno', 'sr', 'ltd', 'llc', 'inc', 'corp', 'co'
    }
    
    # Estrai parole alfanumeriche
    words = re.findall(r'\b[a-zA-Z0-9]{2,}\b', text.lower())
    
    # Filtra parole significative
    significant = [w for w in words if w not in stop_words and len(w) >= 3]
    
    return significant[:5]  # Massimo 5 parole

def validate_anagraphics_data(anag_data, anag_type):
    """
    Valida e normalizza i dati di un'anagrafica prima dell'inserimento.
    
    Args:
        anag_data: Dizionario con dati anagrafica
        anag_type: 'Cliente' o 'Fornitore'
    
    Returns:
        tuple: (is_valid, cleaned_data, warnings)
    """
    warnings = []
    cleaned_data = anag_data.copy()
    
    # Valida tipo
    if anag_type not in ['Cliente', 'Fornitore']:
        return False, {}, [f"Tipo anagrafica non valido: {anag_type}"]
    
    # Valida denominazione
    denomination = str(anag_data.get('denomination', '')).strip()
    if not denomination or len(denomination) < 2:
        return False, {}, ["Denominazione mancante o troppo corta"]
    cleaned_data['denomination'] = denomination
    
    # Pulisci e valida codici fiscali
    piva_raw = anag_data.get('piva', '')
    cf_raw = anag_data.get('cf', '')
    
    piva_clean = clean_fiscal_code(piva_raw)
    cf_clean = clean_fiscal_code(cf_raw)
    
    if piva_raw and not piva_clean:
        warnings.append(f"P.IVA non valida ignorata: '{piva_raw}'")
    if cf_raw and not cf_clean:
        warnings.append(f"CF non valido ignorato: '{cf_raw}'")
    
    cleaned_data['piva'] = piva_clean
    cleaned_data['cf'] = cf_clean
    
    # Valida email se presente
    email = str(anag_data.get('email', '')).strip()
    if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        warnings.append(f"Email non valida ignorata: '{email}'")
        email = ''
    cleaned_data['email'] = email
    
    # Normalizza altri campi
    string_fields = ['address', 'cap', 'city', 'province', 'phone', 'pec', 'codice_destinatario']
    for field in string_fields:
        value = str(anag_data.get(field, '')).strip()
        cleaned_data[field] = value if value else None
    
    # Normalizza country
    country = str(anag_data.get('country', 'IT')).strip().upper()
    if not country or len(country) != 2:
        country = 'IT'
        warnings.append("Country mancante o non valido, usato default 'IT'")
    cleaned_data['country'] = country
    
    # Controlla se abbiamo almeno un identificativo valido
    has_identifiers = bool(piva_clean or cf_clean)
    if not has_identifiers:
        warnings.append("Nessun identificativo fiscale valido (P.IVA/CF)")
    
    return True, cleaned_data, warnings

# === RICERCA ANAGRAFICHE ESISTENTI ===

def find_existing_anagraphics(cursor, anag_type, piva_clean, cf_clean, denomination):
    """
    Cerca un'anagrafica esistente con logica migliorata di matching.
    
    Returns:
        int: ID dell'anagrafica trovata o None
    """
    
    # 1. Ricerca per P.IVA (se valida)
    if piva_clean and len(piva_clean) >= 8:
        cursor.execute("SELECT id FROM Anagraphics WHERE type = ? AND piva = ?", (anag_type, piva_clean))
        row = cursor.fetchone()
        if row:
            logger.debug(f"Anagrafica trovata per P.IVA '{piva_clean}': ID {row['id']}")
            return row['id']
    
    # 2. Ricerca per CF (se valido)
    if cf_clean and len(cf_clean) >= 11:
        cursor.execute("SELECT id FROM Anagraphics WHERE type = ? AND cf = ?", (anag_type, cf_clean))
        row = cursor.fetchone()
        if row:
            logger.debug(f"Anagrafica trovata per CF '{cf_clean}': ID {row['id']}")
            return row['id']
    
    # 3. Ricerca cross-field: CF nel campo P.IVA (caso comune in fatture elettroniche)
    if cf_clean and len(cf_clean) >= 11:
        cursor.execute("SELECT id FROM Anagraphics WHERE type = ? AND piva = ?", (anag_type, cf_clean))
        row = cursor.fetchone()
        if row:
            logger.info(f"Anagrafica trovata cercando CF '{cf_clean}' come P.IVA: ID {row['id']}")
            return row['id']
    
    # 4. Ricerca per denominazione simile (solo se non abbiamo identificativi fiscali)
    if not piva_clean and not cf_clean and denomination:
        # Ricerca esatta per denominazione
        cursor.execute("SELECT id FROM Anagraphics WHERE type = ? AND LOWER(denomination) = LOWER(?)", 
                      (anag_type, denomination))
        row = cursor.fetchone()
        if row:
            logger.debug(f"Anagrafica trovata per denominazione esatta '{denomination}': ID {row['id']}")
            return row['id']
        
        # Ricerca fuzzy per denominazione (solo se denominazione è sufficientemente lunga)
        if len(denomination) > 10:
            # Cerca denominazioni che contengono le prime parole significative
            search_terms = extract_significant_words(denomination)
            if search_terms:
                search_pattern = f"%{' '.join(search_terms[:2])}%"  # Prime 2 parole
                cursor.execute("""
                    SELECT id, denomination FROM Anagraphics 
                    WHERE type = ? AND LOWER(denomination) LIKE LOWER(?)
                    LIMIT 1
                """, (anag_type, search_pattern))
                row = cursor.fetchone()
                if row:
                    logger.info(f"Anagrafica trovata per denominazione simile '{denomination}' -> '{row['denomination']}': ID {row['id']}")
                    return row['id']
    
    return None

def update_anagraphics_if_better_data(cursor, anag_id, new_data, piva_clean, cf_clean):
    """
    Aggiorna un'anagrafica esistente se i nuovi dati sono più completi.
    
    Args:
        cursor: Cursore database
        anag_id: ID dell'anagrafica da aggiornare
        new_data: Nuovi dati
        piva_clean: P.IVA pulita
        cf_clean: CF pulito
    """
    try:
        # Ottieni dati correnti
        cursor.execute("SELECT piva, cf, address, city, province, email, phone FROM Anagraphics WHERE id = ?", (anag_id,))
        current = cursor.fetchone()
        if not current:
            return
        
        updates = []
        params = []
        
        # Aggiorna P.IVA se mancante o migliorabile
        if piva_clean and (not current['piva'] or len(piva_clean) > len(current['piva'] or '')):
            updates.append("piva = ?")
            params.append(piva_clean)
        
        # Aggiorna CF se mancante o migliorabile
        if cf_clean and (not current['cf'] or len(cf_clean) > len(current['cf'] or '')):
            updates.append("cf = ?")
            params.append(cf_clean)
        
        # Aggiorna altri campi se mancanti
        fields_to_check = ['address', 'city', 'province', 'email', 'phone']
        for field in fields_to_check:
               new_value = new_data.get(field)
        if new_value:
           new_value = str(new_value).strip()
        if new_value and not current[field]:
            updates.append(f"{field} = ?")
            params.append(new_value)
        
        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now())
            params.append(anag_id)
            
            sql = f"UPDATE Anagraphics SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)
            
            logger.info(f"Aggiornata anagrafica ID:{anag_id} con dati migliorati: {', '.join(updates[:-1])}")
    
    except Exception as e:
        logger.warning(f"Errore aggiornamento anagrafica ID:{anag_id}: {e}")

# === FUNZIONE PRINCIPALE MIGLIORATA ===

def add_anagraphics_if_not_exists(cursor, anag_data, anag_type):
    """
    Aggiunge un'anagrafica se non esiste già, con logica migliorata per gestire
    casi edge comuni nelle fatture elettroniche.
    
    MIGLIORAMENTI CHIAVE:
    - Validazione più permissiva: accetta anagrafiche con solo denominazione
    - Pulizia automatica di P.IVA e CF
    - Ricerca fuzzy per denominazioni simili
    - Aggiornamento automatico di anagrafiche esistenti con dati migliori
    - Gestione robust dei casi edge (CF nel campo P.IVA, etc.)
    - Verifica automatica esistenza tabelle
    
    Args:
        cursor: Cursore database SQLite
        anag_data: Dizionario con dati anagrafica
        anag_type: 'Cliente' o 'Fornitore'
    
    Returns:
        int: ID dell'anagrafica (esistente o nuova) o None se errore critico
    """
    
    # === VERIFICA E CREA TABELLE SE NECESSARIO ===
    try:
        # Test rapido esistenza tabella
        cursor.execute("SELECT 1 FROM Anagraphics LIMIT 1")
    except sqlite3.OperationalError as e:
        if "no such table" in str(e).lower():
            logger.warning("Tabella Anagraphics non trovata durante add_anagraphics, creo le tabelle...")
            try:
                # Crea tutte le tabelle
                create_tables()
                logger.info("Tabelle create con successo")
                # Test di nuovo
                cursor.execute("SELECT 1 FROM Anagraphics LIMIT 1")
            except Exception as create_err:
                logger.error(f"Errore critico creazione tabelle: {create_err}")
                return None
        else:
            logger.error(f"Errore DB non gestito in add_anagraphics: {e}")
            return None
    except Exception as unexpected_err:
        logger.error(f"Errore imprevisto verifica tabelle: {unexpected_err}")
        return None
    
    # Validazione e pulizia dati in ingresso
    is_valid, cleaned_data, warnings = validate_anagraphics_data(anag_data, anag_type)
    
    if not is_valid:
        logger.error(f"Dati anagrafica {anag_type} non validi: {cleaned_data}")
        return None
    
    # Log warnings se presenti
    for warning in warnings:
        logger.warning(f"Anagrafica {anag_type}: {warning}")
    
    piva_clean = cleaned_data.get('piva', '')
    cf_clean = cleaned_data.get('cf', '')
    denomination = cleaned_data.get('denomination', '')
    
    logger.debug(f"Tentativo inserimento/ricerca anagrafica {anag_type}: '{denomination}' (P.IVA='{piva_clean}', CF='{cf_clean}')")

    # Logica di fallback P.IVA/CF migliorata
    if not piva_clean and cf_clean: 
        piva_clean = cf_clean
        cleaned_data['piva'] = cf_clean
        logger.debug(f"P.IVA mancante, uso CF come P.IVA: {cf_clean}")
    elif piva_clean and not cf_clean and len(piva_clean) == 16: 
        cf_clean = piva_clean
        cleaned_data['cf'] = piva_clean
        logger.debug(f"CF mancante, P.IVA sembra CF: {piva_clean}")

    # Ricerca anagrafica esistente con logica migliorata
    anag_id = find_existing_anagraphics(cursor, anag_type, piva_clean, cf_clean, denomination)
    
    if anag_id:
        logger.debug(f"Anagrafica {anag_type} '{denomination}' già esistente (ID:{anag_id}).")
        # Aggiorna con dati migliori se disponibili
        update_anagraphics_if_better_data(cursor, anag_id, cleaned_data, piva_clean, cf_clean)
        return anag_id
    
    # Inserimento nuova anagrafica con logica robusta
    try:
        sql = """INSERT INTO Anagraphics (
            type, piva, cf, denomination, address, cap, city, province, country, 
            email, phone, pec, codice_destinatario, score, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        
        # Usa None per campi vuoti invece di stringhe vuote per mantenere consistenza DB
        params = (
            anag_type,
            piva_clean if piva_clean else None,
            cf_clean if cf_clean else None,
            denomination,
            cleaned_data.get('address') or None,
            cleaned_data.get('cap') or None,
            cleaned_data.get('city') or None,
            cleaned_data.get('province') or None,
            cleaned_data.get('country', 'IT'),
            cleaned_data.get('email') or None,
            cleaned_data.get('phone') or None,
            cleaned_data.get('pec') or None,
            cleaned_data.get('codice_destinatario') or None,
            100.0,  # Score default
            datetime.now()
        )
        
        cursor.execute(sql, params)
        new_id = cursor.lastrowid
        
        # Log dettagliato del successo
        identifiers = []
        if piva_clean: identifiers.append(f"P.IVA={piva_clean}")
        if cf_clean and cf_clean != piva_clean: identifiers.append(f"CF={cf_clean}")
        id_info = f" ({', '.join(identifiers)})" if identifiers else " (solo denominazione)"
        
        logger.info(f"✅ Nuova Anagrafica {anag_type} '{denomination}' inserita con ID:{new_id}{id_info}")
        return new_id
        
    except sqlite3.IntegrityError as ie:
        logger.warning(f"Constraint violato durante inserimento anagrafica '{denomination}': {ie}. Ritento ricerca...")
        
        # Possibile race condition o violazione UNIQUE, ritenta la ricerca
        retry_anag_id = find_existing_anagraphics(cursor, anag_type, piva_clean, cf_clean, denomination)
        if retry_anag_id:
            logger.info(f"Anagrafica {anag_type} '{denomination}' trovata al secondo tentativo (ID:{retry_anag_id}).")
            # Aggiorna anche in questo caso
            update_anagraphics_if_better_data(cursor, retry_anag_id, cleaned_data, piva_clean, cf_clean)
            return retry_anag_id
        else:
            logger.error(f"❌ Inserimento fallito per IntegrityError ma non trovata al secondo tentativo: {denomination}")
            return None
            
    except sqlite3.Error as dbe:
        logger.error(f"❌ Errore DB inserimento anagrafica '{denomination}': {dbe}")
        return None
    except Exception as e:
        logger.error(f"❌ Errore critico inserimento anagrafica '{denomination}': {e}", exc_info=True)
        return None

# === FUNZIONI TRANSAZIONI ===

def get_reconciliation_links_for_item(item_type, item_id):
    conn = None
    links = []
    try:
        conn = get_connection()
        if item_type == 'transaction':
            query = """
                SELECT rl.id, rl.invoice_id, rl.reconciled_amount, rl.reconciliation_date,
                       i.doc_number as invoice_doc_number, i.type as invoice_type
                FROM ReconciliationLinks rl
                JOIN Invoices i ON rl.invoice_id = i.id
                WHERE rl.transaction_id = ?
                ORDER BY i.doc_date DESC, i.doc_number;
            """
        elif item_type == 'invoice':
            query = """
                SELECT rl.id, rl.transaction_id, rl.reconciled_amount, rl.reconciliation_date,
                       bt.transaction_date as transaction_date, bt.amount as transaction_amount
                FROM ReconciliationLinks rl
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                WHERE rl.invoice_id = ?
                ORDER BY bt.transaction_date DESC;
            """
        else:
            logger.error(f"Tipo item non valido per get_reconciliation_links: {item_type}")
            return pd.DataFrame()

        df = pd.read_sql_query(query, conn, params=(item_id,), parse_dates=['reconciliation_date', 'transaction_date' if item_type == 'invoice' else None])
        return df if df is not None else pd.DataFrame()

    except Exception as e:
        logger.error(f"Errore recupero link per {item_type} ID {item_id}: {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def add_transactions(cursor, transactions_df):
    """
    Aggiunge transazioni bancarie al database con gestione avanzata dei duplicati.
    
    Returns:
        tuple: (inserted_count, db_duplicate_count, batch_duplicate_count, error_count)
    """
    inserted_count, db_duplicate_count, batch_duplicate_count, error_count = 0, 0, 0, 0
    if transactions_df is None or transactions_df.empty:
        logging.info("Nessuna transazione da aggiungere (DataFrame vuoto).")
        return 0, 0, 0, 0

    # Ottimizzazione: carica hash esistenti solo per il range di date necessario
    hashes_in_db = set()
    try:
        min_date = transactions_df['DataContabile'].min()
        max_date = transactions_df['DataContabile'].max()
        MAX_DAYS_RANGE_FOR_HASH_LOAD = 180
        load_all_hashes = True

        if pd.notna(min_date) and pd.notna(max_date) and isinstance(min_date, pd.Timestamp) and isinstance(max_date, pd.Timestamp):
            date_range_days = (max_date - min_date).days
            if date_range_days <= MAX_DAYS_RANGE_FOR_HASH_LOAD:
                load_all_hashes = False
                min_date_str = min_date.strftime('%Y-%m-%d')
                max_date_str = max_date.strftime('%Y-%m-%d')
                cursor.execute("SELECT unique_hash FROM BankTransactions WHERE transaction_date BETWEEN ? AND ?", (min_date_str, max_date_str))
                hashes_in_db = {row['unique_hash'] for row in cursor.fetchall()}
                logging.debug(f"Caricati {len(hashes_in_db)} hash DB per range {min_date_str} - {max_date_str}.")
            else:
                logging.debug(f"Range date ({date_range_days} gg) troppo ampio, carico tutti gli hash.")
        else:
            logging.warning("Date min/max non valide o non Timestamp nel DataFrame, carico tutti gli hash.")

        if load_all_hashes:
            logging.debug("Caricamento di tutti gli hash delle transazioni dal DB...")
            cursor.execute("SELECT unique_hash FROM BankTransactions")
            hashes_in_db = {row['unique_hash'] for row in cursor.fetchall()}
            logging.debug(f"Caricati {len(hashes_in_db)} hash totali dal DB.")

    except sqlite3.Error as e:
        logging.error(f"Errore DB caricamento hash esistenti: {e}. Check duplicati DB non eseguito.")
        hashes_in_db = set()
    except Exception as e_gen:
        logging.error(f"Errore imprevisto caricamento hash: {e_gen}")
        hashes_in_db = set()

    # Preparazione dati per inserimento batch
    data_to_insert = []
    batch_hashes = set()
    preparation_errors = 0
    skipped_db_duplicates = 0
    skipped_batch_duplicates = 0

    for index, row in transactions_df.iterrows():
        trans_hash = row.get('unique_hash')
        if trans_hash is None or not isinstance(trans_hash, str) or not trans_hash.strip():
            logging.error(f"Hash mancante o non valido per transazione riga DF {index}. Salto.")
            preparation_errors += 1
            continue

        # Check duplicati DB
        if trans_hash in hashes_in_db:
            skipped_db_duplicates += 1
            continue
            
        # Check duplicati nel batch corrente
        if trans_hash in batch_hashes:
            skipped_batch_duplicates += 1
            logger.warning(f"Duplicato trovato nello stesso file CSV (Riga DF {index}, Hash: {trans_hash[:10]}...). Salto.")
            continue

        try:
            # Validazione e preparazione dati
            t_date_ts = row.get('DataContabile')
            if not isinstance(t_date_ts, pd.Timestamp): 
                raise ValueError("DataContabile non valida.")
            t_date = t_date_ts.strftime('%Y-%m-%d')

            v_date_val = row.get('DataValuta')
            v_date = v_date_val.strftime('%Y-%m-%d') if pd.notna(v_date_val) and isinstance(v_date_val, pd.Timestamp) else None

            amount_val = row.get('Importo')
            if amount_val is None or pd.isna(amount_val): 
                raise ValueError("Importo mancante o NaN")
            amount_float = float(amount_val)

            desc_val = row.get('Descrizione')
            description = str(desc_val).strip() if pd.notna(desc_val) else None

            causale_val = row.get('CausaleABI')
            causale = int(causale_val) if pd.notna(causale_val) else None

            data_to_insert.append((t_date, v_date, amount_float, description, causale, trans_hash))
            batch_hashes.add(trans_hash)
            
        except Exception as e_prep:
            preparation_errors += 1
            logging.error(f"Errore preparazione dati transazione (Riga DF {index}, Hash: {trans_hash[:10]}...): {e_prep}")

    # Aggiornamento contatori
    db_duplicate_count = skipped_db_duplicates
    batch_duplicate_count = skipped_batch_duplicates
    error_count = preparation_errors

    # Inserimento batch se ci sono dati
    if data_to_insert:
        insert_sql = """INSERT INTO BankTransactions (transaction_date, value_date, amount, description, causale_abi, unique_hash, reconciled_amount, reconciliation_status)
                        VALUES (?, ?, ?, ?, ?, ?, 0.0, 'Da Riconciliare')"""
        try:
            cursor.executemany(insert_sql, data_to_insert)
            inserted_count = len(data_to_insert)
            logging.info(f"Inserimento batch di {inserted_count} nuove transazioni completato.")
        except sqlite3.IntegrityError as e_int:
            logger.error(f"Errore UNIQUE constraint durante inserimento batch: {e_int}. Nessuna riga inserita.")
            error_count += len(data_to_insert)
            inserted_count = 0
        except sqlite3.Error as e_db:
            logger.error(f"Errore DB generico durante inserimento batch transazioni: {e_db}")
            error_count += len(data_to_insert)
            inserted_count = 0
        except Exception as e_generic_insert:
             logger.error(f"Errore imprevisto durante inserimento batch transazioni: {e_generic_insert}", exc_info=True)
             error_count += len(data_to_insert)
             inserted_count = 0

    logging.info(f"Risultato aggiunta transazioni: Nuove:{inserted_count}, Duplicati DB:{db_duplicate_count}, Duplicati File:{batch_duplicate_count}, Errori Prep./Insert:{error_count}.")
    return inserted_count, db_duplicate_count, batch_duplicate_count, error_count

# === FUNZIONI RECUPERO DATI ===

def get_anagraphics(type_filter=None):
    """
    Recupera anagrafiche con filtro opzionale per tipo.
    """
    conn = None
    try:
        conn = get_connection()
        query = """SELECT id, type, denomination, piva, cf, city, province, score,
                          email, phone, pec, iban, address, cap, codice_destinatario,
                          created_at, updated_at
                   FROM Anagraphics"""
        params = []
        if type_filter and type_filter in ['Cliente', 'Fornitore']:
            query += " WHERE type = ?"
            params.append(type_filter)
        query += " ORDER BY denomination COLLATE NOCASE"
        df = pd.read_sql_query(query, conn, params=params if params else None, parse_dates=['created_at', 'updated_at'])
        return df if df is not None else pd.DataFrame()
    except Exception as e:
        logger.error(f"Errore recupero anagrafiche (filtro: {type_filter}): {e}", exc_info=True)
        return pd.DataFrame()
    finally:
        if conn: conn.close()

def get_invoices(type_filter=None, status_filter=None, anagraphics_id_filter=None, limit=None):
    """
    Recupera fatture con filtri e formattazione avanzata.
    """
    conn = None
    cols_out_expected = [
        'id', 'type', 'doc_number', 'doc_date', 'total_amount', 'due_date',
        'payment_status', 'paid_amount', 'payment_method', 'counterparty_name',
        'anagraphics_id', 'xml_filename', 'p7m_source_file',
        'doc_date_fmt', 'due_date_fmt', 'total_amount_dec', 'paid_amount_dec',
        'open_amount_dec', 'total_amount_fmt', 'open_amount_fmt'
    ]
    empty_df_out = pd.DataFrame(columns=cols_out_expected)
    try:
        conn = get_connection()
        query = """SELECT i.id, i.type, i.doc_number, i.doc_date, i.total_amount, i.due_date,
                          i.payment_status, i.paid_amount, i.payment_method,
                          a.denomination AS counterparty_name, i.anagraphics_id,
                          i.xml_filename, i.p7m_source_file
                   FROM Invoices i JOIN Anagraphics a ON i.anagraphics_id = a.id"""
        filters, params = [], []

        if type_filter and type_filter in ['Attiva', 'Passiva']:
            filters.append("i.type = ?"); params.append(type_filter)
        if status_filter:
             valid_statuses = ['Aperta', 'Scaduta', 'Pagata Parz.', 'Pagata Tot.', 'Insoluta', 'Riconciliata']
             if isinstance(status_filter, list):
                 valid_list = [s for s in status_filter if s in valid_statuses]
                 if valid_list:
                     placeholders = ','.join('?' * len(valid_list))
                     filters.append(f"i.payment_status IN ({placeholders})")
                     params.extend(valid_list)
             elif status_filter == 'Aperta/Scaduta':
                 filters.append("i.payment_status IN (?, ?, ?)")
                 params.extend(['Aperta', 'Scaduta', 'Pagata Parz.'])
             elif status_filter == 'Aperta':
                 filters.append("i.payment_status IN (?, ?)")
                 params.extend(['Aperta', 'Pagata Parz.'])
             elif status_filter == 'Scaduta':
                 filters.append("i.payment_status IN (?, ?)")
                 params.extend(['Scaduta', 'Pagata Parz.'])
             elif status_filter in valid_statuses:
                 filters.append("i.payment_status = ?")
                 params.append(status_filter)
             else:
                 logger.warning(f"Filtro stato fattura non valido: '{status_filter}'. Mostro tutte.")

        if anagraphics_id_filter is not None:
            try:
                anag_id = int(anagraphics_id_filter)
                filters.append("i.anagraphics_id = ?"); params.append(anag_id)
            except (ValueError, TypeError):
                 logger.warning(f"Filtro anagraphics_id non valido ignorato: {anagraphics_id_filter}")

        if filters: query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY i.doc_date DESC, i.id DESC"
        if limit:
            try: query += " LIMIT ?"; params.append(int(limit))
            except (ValueError, TypeError): pass

        df = pd.read_sql_query(query, conn, params=params if params else None, parse_dates=['doc_date', 'due_date'])
        if df is None: return empty_df_out.copy()

        if df.empty:
             logger.debug("get_invoices: Nessuna fattura trovata con i criteri specificati.")
             return empty_df_out.copy()

        # Conversioni Decimal robuste
        df['total_amount_dec'] = df['total_amount'].apply(lambda x: to_decimal(x, default='NaN'))
        df['paid_amount_dec'] = df['paid_amount'].apply(lambda x: to_decimal(x, default='NaN'))

        # Calcola open_amount_dec solo se total e paid sono validi
        mask_valid = df['total_amount_dec'].apply(lambda d: isinstance(d, Decimal) and d.is_finite()) & \
                     df['paid_amount_dec'].apply(lambda d: isinstance(d, Decimal) and d.is_finite())
        df['open_amount_dec'] = pd.NA # Inizializza a NA (pandas)
        df.loc[mask_valid, 'open_amount_dec'] = (df.loc[mask_valid, 'total_amount_dec'] - df.loc[mask_valid, 'paid_amount_dec']).apply(quantize)
        # Assicura che la colonna sia di tipo Decimal o object contenente Decimal/NaN
        df['open_amount_dec'] = df['open_amount_dec'].apply(lambda x: x if isinstance(x, Decimal) else Decimal('NaN'))

        # Formattazione date e importi
        df['doc_date_fmt'] = df['doc_date'].dt.strftime('%d/%m/%Y').fillna('N/D')
        df['due_date_fmt'] = df['due_date'].dt.strftime('%d/%m/%Y').fillna('N/D')
        df['total_amount_fmt'] = df['total_amount_dec'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if isinstance(x, Decimal) and x.is_finite() else 'Errore')
        df['open_amount_fmt'] = df['open_amount_dec'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if isinstance(x, Decimal) and x.is_finite() else 'Errore')

        # Assicura che tutte le colonne attese siano presenti
        for col in cols_out_expected:
            if col not in df.columns:
                logger.warning(f"Colonna attesa '{col}' mancante in get_invoices, aggiunta vuota.")
                df[col] = pd.NA if '_dec' in col else '' # Usa '' per stringhe, NA per decimali

        return df[cols_out_expected]

    except Exception as e:
        logger.error(f"Errore recupero fatture: {e}", exc_info=True)
        return empty_df_out.copy()
    finally:
        if conn: conn.close()

def get_transactions(start_date=None, end_date=None, status_filter=None, limit=None,
                     anagraphics_id_heuristic_filter=None,
                     hide_pos=False, hide_worldline=False, hide_cash=False, hide_commissions=False):
    """
    Recupera transazioni bancarie con filtri avanzati e supporto per filtri euristica.
    """
    conn = None
    try:
        # Import qui per evitare ciclo se chiamato da altri moduli prima di reconciliation
        try: from .reconciliation import find_anagraphics_id_from_description
        except ImportError: from reconciliation import find_anagraphics_id_from_description

        conn = get_connection()
        # Registra funzione REGEXP se non esiste (necessario per alcuni backend SQLite)
        try:
            conn.create_function("REGEXP", 2, lambda pattern, item: bool(re.search(pattern, item, re.IGNORECASE)) if item else False)
        except Exception as e_regexp:
            logger.warning(f"Impossibile registrare funzione REGEXP, alcuni filtri potrebbero non funzionare correttamente: {e_regexp}")

        query = """SELECT id, transaction_date, value_date, amount, description,
                          causale_abi, reconciliation_status, reconciled_amount, unique_hash
                   FROM BankTransactions"""
        filters, params = [], []

        if start_date:
             try:
                 start_dt = pd.to_datetime(start_date).strftime('%Y-%m-%d')
                 filters.append("transaction_date >= date(?)"); params.append(start_dt)
             except Exception: logging.warning(f"Data inizio non valida ignorata: {start_date}")
        if end_date:
             try:
                 end_dt = pd.to_datetime(end_date).strftime('%Y-%m-%d')
                 filters.append("transaction_date <= date(?)"); params.append(end_dt)
             except Exception: logging.warning(f"Data fine non valida ignorata: {end_date}")

        valid_statuses = ['Da Riconciliare', 'Riconciliato Parz.', 'Riconciliato Tot.', 'Riconciliato Eccesso', 'Ignorato']
        if status_filter:
            if isinstance(status_filter, list):
                 valid_list = [s for s in status_filter if s in valid_statuses]
                 if valid_list:
                     placeholders = ','.join('?' * len(valid_list))
                     filters.append(f"reconciliation_status IN ({placeholders})")
                     params.extend(valid_list)
            elif status_filter in valid_statuses:
                 filters.append("reconciliation_status = ?")
                 params.append(status_filter)
            else:
                 logging.warning(f"Filtro stato transazione non valido: {status_filter}. Ignorato.")
        elif anagraphics_id_heuristic_filter is None: # Default: non mostrare Ignorati se non richiesto specificamente
             filters.append("reconciliation_status != ?")
             params.append('Ignorato')

        # Applica filtri descrizione avanzati
        desc_conditions = []
        if hide_pos:
            pos_pattern = r'\b(POS|PAGOBANCOMAT|CIRRUS|MAESTRO|VISA|MASTERCARD|AMEX|AMERICAN EXPRESS|CARTA DI CREDITO|CREDIT CARD|ESE COMM)\b'
            desc_conditions.append(f"description NOT REGEXP '{pos_pattern}'")
        if hide_worldline:
            desc_conditions.append("description NOT LIKE '%WORLDLINE%'")
        if hide_cash:
            desc_conditions.append("description NOT LIKE '%VERSAMENTO CONTANTE%'")
        if hide_commissions:
            desc_conditions.append("description NOT LIKE 'COMMISSIONI%'")
            desc_conditions.append("description NOT LIKE 'COMPETENZE BANC%'")
            desc_conditions.append("description NOT LIKE 'SPESE TENUTA CONTO%'")
            desc_conditions.append("description NOT LIKE 'IMPOSTA DI BOLLO%'")

        if desc_conditions:
            filters.append(f"(description IS NULL OR ({' AND '.join(desc_conditions)}))")

        if filters: query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY transaction_date DESC, id DESC"
        apply_limit_later = (anagraphics_id_heuristic_filter is not None and limit is not None)
        if limit and not apply_limit_later:
             try: query += " LIMIT ?"; params.append(int(limit))
             except (ValueError, TypeError): pass

        df = pd.read_sql_query(query, conn, params=params if params else None, parse_dates=['transaction_date', 'value_date'])
        if df is None: return pd.DataFrame()

        # Filtro euristico per anagrafica specifica
        if anagraphics_id_heuristic_filter is not None and not df.empty:
            try:
                target_anag_id = int(anagraphics_id_heuristic_filter)
                logger.info(f"Applicazione filtro euristico transazioni per AnagID: {target_anag_id} su {len(df)} righe...")
                
                # Ottimizzazione: usa apply invece di iterrows
                def check_description_match(desc):
                    if pd.isna(desc): return False
                    found_id = find_anagraphics_id_from_description(desc)
                    return found_id == target_anag_id

                # Maschera booleana per filtro descrizione
                desc_mask = df['description'].apply(check_description_match)

                # Maschera booleana per link parziali (più complesso, richiede query aggiuntiva)
                partial_link_mask = pd.Series(False, index=df.index)
                partial_trans_ids = df.loc[df['reconciliation_status'] == 'Riconciliato Parz.', 'id'].tolist()
                if partial_trans_ids:
                    placeholders = ','.join('?' * len(partial_trans_ids))
                    query_links = f"""SELECT DISTINCT rl.transaction_id
                                      FROM ReconciliationLinks rl JOIN Invoices i ON rl.invoice_id = i.id
                                      WHERE rl.transaction_id IN ({placeholders}) AND i.anagraphics_id = ?"""
                    params_links = partial_trans_ids + [target_anag_id]
                    df_links = pd.read_sql_query(query_links, conn, params=params_links)
                    linked_ids_for_anag = set(df_links['transaction_id'])
                    partial_link_mask = df['id'].isin(linked_ids_for_anag)

                # Combina le maschere
                final_mask = desc_mask | partial_link_mask
                df = df[final_mask].copy()
                logger.info(f"Risultato filtro euristico: {len(df)} transazioni mantenute.")
            except (ValueError, TypeError):
                logger.error(f"ID anagrafica non valido per filtro euristico: {anagraphics_id_heuristic_filter}")
                df = pd.DataFrame()
            except Exception as e_filter:
                logger.error(f"Errore durante filtro euristico transazioni: {e_filter}", exc_info=True)
                df = pd.DataFrame()

        if apply_limit_later and not df.empty:
            try: df = df.head(int(limit))
            except (ValueError, TypeError): pass

        # Colonne calcolate/formattate
        if not df.empty:
            df['transaction_date_fmt'] = df['transaction_date'].dt.strftime('%d/%m/%Y')
            df['value_date_fmt'] = df['value_date'].dt.strftime('%d/%m/%Y').fillna('N/D')
            df['amount_dec'] = df['amount'].apply(lambda x: to_decimal(x, default='NaN'))
            df['reconciled_amount_dec'] = df['reconciled_amount'].apply(lambda x: to_decimal(x, default='NaN'))
            mask_valid = df['amount_dec'].apply(lambda d: isinstance(d, Decimal) and d.is_finite()) & \
                         df['reconciled_amount_dec'].apply(lambda d: isinstance(d, Decimal) and d.is_finite())
            df['remaining_amount_dec'] = pd.NA
            df.loc[mask_valid, 'remaining_amount_dec'] = (df.loc[mask_valid, 'amount_dec'] - df.loc[mask_valid, 'reconciled_amount_dec']).apply(quantize)
            df['remaining_amount_dec'] = df['remaining_amount_dec'].apply(lambda x: x if isinstance(x, Decimal) else Decimal('NaN'))

            df['amount_fmt'] = df['amount_dec'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if isinstance(x, Decimal) and x.is_finite() else 'Errore')
            df['remaining_amount_fmt'] = df['remaining_amount_dec'].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if isinstance(x, Decimal) and x.is_finite() else 'Errore')
            df['causale_abi'] = df['causale_abi'].apply(lambda x: str(int(x)) if pd.notna(x) else '')
        else:
             # Se df è vuoto, crea colonne vuote per coerenza
            cols_to_add_fmt = ['transaction_date_fmt', 'value_date_fmt', 'amount_fmt', 'remaining_amount_fmt', 'causale_abi']
            cols_to_add_dec = ['amount_dec', 'reconciled_amount_dec', 'remaining_amount_dec']
            for col in cols_to_add_fmt: df[col] = pd.Series(dtype='object')
            for col in cols_to_add_dec: df[col] = pd.Series(dtype='object') # object può contenere Decimal o NaN

        cols_to_return = [
            'id', 'transaction_date_fmt', 'value_date_fmt', 'amount_fmt',
            'remaining_amount_fmt', 'description', 'causale_abi', 'reconciliation_status',
            'amount_dec', 'reconciled_amount_dec', 'remaining_amount_dec', 'unique_hash', 'amount'
        ]
        # Assicura che tutte le colonne esistano prima di selezionarle
        for col in cols_to_return:
             if col not in df.columns:
                 df[col] = pd.NA if '_dec' in col else ''

        return df[cols_to_return]
    except Exception as e:
        logger.error(f"Errore recupero transazioni: {e}", exc_info=True)
        cols_out = [
            'id', 'transaction_date_fmt', 'value_date_fmt', 'amount_fmt',
            'remaining_amount_fmt', 'description', 'causale_abi', 'reconciliation_status',
            'amount_dec', 'reconciled_amount_dec', 'remaining_amount_dec', 'unique_hash', 'amount'
        ]
        return pd.DataFrame(columns=cols_out)
    finally:
        if conn: conn.close()

# === FUNZIONI RICONCILIAZIONE ===

def get_item_details(conn, item_type, item_id):
    """
    Recupera dettagli di una fattura o transazione specifica.
    """
    table = None
    if item_type == 'invoice':
        table = "Invoices"
    elif item_type == 'transaction':
        table = "BankTransactions"
    else:
        logger.error(f"Tipo elemento non valido per get_item_details: '{item_type}'")
        return None
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        if not row:
            logging.warning(f"Nessun dettaglio trovato per {item_type} ID {item_id}.")
        return row
    except sqlite3.Error as e:
        logger.error(f"Errore DB recupero dettagli {item_type} {item_id}: {e}")
        return None

def update_invoice_reconciliation_state(conn, invoice_id, payment_status, paid_amount):
    """
    Aggiorna stato di riconciliazione di una fattura.
    """
    try:
        cursor = conn.cursor()
        # Assicura che paid_amount sia Decimal prima di quantize e conversione
        paid_amount_dec = quantize(to_decimal(paid_amount, default='0.0'))
        paid_amount_float = float(paid_amount_dec)
        now_ts = datetime.now()
        cursor.execute("UPDATE Invoices SET payment_status = ?, paid_amount = ?, updated_at = ? WHERE id = ?",
                       (payment_status, paid_amount_float, now_ts, invoice_id))
        if cursor.rowcount > 0:
            logger.debug(f"Aggiornato stato/importo fattura {invoice_id}: Status='{payment_status}', Paid={paid_amount_float:.2f}")
            return True
        else:
            logging.warning(f"Nessuna fattura trovata con ID {invoice_id} per aggiornamento stato/importo.")
            return False
    except (sqlite3.Error, ValueError, InvalidOperation) as e:
        logger.error(f"Errore DB/Dati update stato fattura {invoice_id}: {e}")
        return False
    except Exception as e_gen:
        logger.error(f"Errore generico update stato fattura {invoice_id}: {e_gen}", exc_info=True)
        return False

def update_transaction_reconciliation_state(conn, transaction_id, reconciliation_status, reconciled_amount):
    """
    Aggiorna stato di riconciliazione di una transazione.
    """
    try:
        cursor = conn.cursor()
        # Assicura che reconciled_amount sia Decimal prima di quantize e conversione
        reconciled_amount_dec = quantize(to_decimal(reconciled_amount, default='0.0'))
        reconciled_amount_float = float(reconciled_amount_dec)
        cursor.execute("UPDATE BankTransactions SET reconciliation_status = ?, reconciled_amount = ? WHERE id = ?",
                       (reconciliation_status, reconciled_amount_float, transaction_id))
        if cursor.rowcount > 0:
            logger.debug(f"Aggiornato stato/importo transazione {transaction_id}: Status='{reconciliation_status}', Reconciled={reconciled_amount_float:.2f}")
            return True
        else:
            logging.warning(f"Nessuna transazione trovata con ID {transaction_id} per aggiornamento stato/importo.")
            return False
    except (sqlite3.Error, ValueError, InvalidOperation) as e:
        logger.error(f"Errore DB/Dati update stato transazione {transaction_id}: {e}")
        return False
    except Exception as e_gen:
        logger.error(f"Errore generico update stato transazione {transaction_id}: {e_gen}", exc_info=True)
        return False

def add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount_to_add):
    """
    Aggiunge o aggiorna un link di riconciliazione tra fattura e transazione.
    """
    cursor = conn.cursor()
    try:
        # Assicura che amount_to_add sia Decimal
        amount_dec = quantize(to_decimal(amount_to_add))
        if amount_dec.copy_abs() < AMOUNT_TOLERANCE / 2:
            logging.warning(f"Tentativo link importo trascurabile ({amount_dec:.4f}) tra I:{invoice_id} e T:{transaction_id}. Ignorato.")
            return True # Consideralo successo (nessuna azione necessaria)

        cursor.execute("SELECT id, reconciled_amount FROM ReconciliationLinks WHERE invoice_id = ? AND transaction_id = ?", (invoice_id, transaction_id))
        existing_link = cursor.fetchone()
        now_ts = datetime.now()

        if existing_link:
            link_id = existing_link['id']
            current_amount = to_decimal(existing_link['reconciled_amount'])
            new_amount = quantize(current_amount + amount_dec)
            cursor.execute("UPDATE ReconciliationLinks SET reconciled_amount = ?, reconciliation_date = ? WHERE id = ?",
                           (float(new_amount), now_ts, link_id))
            logging.debug(f"Aggiornato link {link_id} (I:{invoice_id}, T:{transaction_id}): Add={amount_dec:.2f}, NewTotalLink={new_amount:.2f}")
        else:
            cursor.execute("INSERT INTO ReconciliationLinks (invoice_id, transaction_id, reconciled_amount, reconciliation_date) VALUES (?, ?, ?, ?)",
                           (invoice_id, transaction_id, float(amount_dec), now_ts))
            new_link_id = cursor.lastrowid
            logging.debug(f"Inserito nuovo link ID:{new_link_id} (I:{invoice_id}, T:{transaction_id}): Importo={amount_dec:.2f}")
        return True
    except (sqlite3.Error, ValueError, InvalidOperation) as e:
        logger.error(f"Errore DB/Dati add/update link (I:{invoice_id}, T:{transaction_id}): {e}")
        return False
    except Exception as e_gen:
        logger.error(f"Errore generico add/update link (I:{invoice_id}, T:{transaction_id}): {e_gen}", exc_info=True)
        return False

def remove_reconciliation_links(conn, transaction_id=None, invoice_id=None):
    """
    Rimuove i link di riconciliazione per una transazione o fattura specifica.
    
    Returns:
        tuple: (success, (affected_invoices, affected_transactions))
    """
    if transaction_id is None and invoice_id is None:
        logging.warning("Chiamata a remove_reconciliation_links senza specificare transaction_id né invoice_id.")
        return False, ([], [])

    cursor = conn.cursor()
    affected_invoices = set()
    affected_transactions = set()
    id_type = ""
    primary_id = None

    try:
        if transaction_id is not None:
            where_clause = "transaction_id = ?"
            primary_id = transaction_id
            id_type = "T"
            affected_transactions.add(transaction_id)
            cursor.execute("SELECT DISTINCT invoice_id FROM ReconciliationLinks WHERE transaction_id = ?", (transaction_id,))
            affected_invoices.update(row['invoice_id'] for row in cursor.fetchall())
        elif invoice_id is not None:
            where_clause = "invoice_id = ?"
            primary_id = invoice_id
            id_type = "I"
            affected_invoices.add(invoice_id)
            cursor.execute("SELECT DISTINCT transaction_id FROM ReconciliationLinks WHERE invoice_id = ?", (invoice_id,))
            affected_transactions.update(row['transaction_id'] for row in cursor.fetchall())

        if primary_id is None:
            logging.error("ID primario non valido per remove_reconciliation_links.")
            return False, ([], [])

        # Non serve controllare se ci sono link, DELETE non darà errore se non trova nulla
        delete_query = f"DELETE FROM ReconciliationLinks WHERE {where_clause}"
        cursor.execute(delete_query, (primary_id,))
        deleted_count = cursor.rowcount
        if deleted_count > 0:
            logging.info(f"Rimossi {deleted_count} link associati a {id_type}:{primary_id}.")
        else:
            # Aggiungi comunque l'ID primario alla lista degli affetti per forzare aggiornamento stato
            if id_type == "T": affected_transactions.add(primary_id)
            else: affected_invoices.add(primary_id)
            logging.debug(f"Nessun link trovato da rimuovere per {id_type}:{primary_id}, ma lo includo per aggiornamento stato.")
        return True, (list(affected_invoices), list(affected_transactions))

    except sqlite3.Error as e:
        primary_info = f"{id_type}:{primary_id}" if primary_id else "ID non specificato"
        logger.error(f"Errore DB durante rimozione link ({primary_info}): {e}")
        return False, ([], [])
    except Exception as e_gen:
        primary_info = f"{id_type}:{primary_id}" if primary_id else "ID non specificato"
        logger.error(f"Errore generico durante rimozione link ({primary_info}): {e_gen}", exc_info=True)
        return False, ([], [])

# === FUNZIONI SETTINGS ===

def get_settings_value(key, default_value=None):
    """Ottiene un valore dalla tabella Settings con compatibilità completa"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Prima verifica che la tabella Settings esista con lo schema corretto
        cursor.execute("PRAGMA table_info(Settings)")
        columns_info = cursor.fetchall()
        if not columns_info:
            # Tabella non esiste, creala
            ensure_settings_table_compatibility()
            return default_value
        
        # Cerca il valore
        cursor.execute("SELECT value FROM Settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        
        if row:
            return row['value']
        else:
            return default_value
            
    except sqlite3.Error as e:
        logger.error(f"Errore lettura setting '{key}': {e}")
        return default_value
    finally:
        if conn:
            conn.close()

def set_settings_value(key, value):
    """Imposta un valore nella tabella Settings con compatibilità completa"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Assicura che la tabella Settings esista con lo schema corretto
        ensure_settings_table_compatibility()
        
        # Usa INSERT OR REPLACE con updated_at (ora funziona grazie al fix dello schema)
        cursor.execute("""
            INSERT OR REPLACE INTO Settings (key, value, updated_at) 
            VALUES (?, ?, datetime('now'))
        """, (key, value))
        
        conn.commit()
        logger.debug(f"Impostazione salvata: {key} = {value}")
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Errore salvataggio setting '{key}': {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

# === FUNZIONI UTILITÀ E DIAGNOSTICA ===

def get_database_stats():
    """Ottiene statistiche complete del database"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        stats = {}
        
        # Conta record per tabella
        tables = ['Anagraphics', 'Invoices', 'BankTransactions', 'ReconciliationLinks', 'Settings']
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                result = cursor.fetchone()
                stats[f"{table.lower()}_count"] = result['count'] if result else 0
            except sqlite3.Error:
                stats[f"{table.lower()}_count"] = 0
        
        # Statistiche database
        cursor.execute("PRAGMA page_count")
        page_count_result = cursor.fetchone()
        page_count = page_count_result[0] if page_count_result else 0
        
        cursor.execute("PRAGMA page_size")
        page_size_result = cursor.fetchone()
        page_size = page_size_result[0] if page_size_result else 0
        
        stats['database_size_kb'] = (page_count * page_size) / 1024 if page_count and page_size else 0
        stats['total_records'] = sum(v for k, v in stats.items() if k.endswith('_count'))
        
        # Statistiche avanzate
        try:
            # Distribuzione tipi fatture
            cursor.execute("SELECT type, COUNT(*) as count FROM Invoices GROUP BY type")
            invoice_types = dict(cursor.fetchall())
            stats['invoice_types'] = invoice_types
            
            # Statistiche stati pagamento
            cursor.execute("SELECT payment_status, COUNT(*) as count FROM Invoices GROUP BY payment_status")
            payment_statuses = dict(cursor.fetchall())
            stats['payment_statuses'] = payment_statuses
            
            # Statistiche riconciliazione
            cursor.execute("SELECT reconciliation_status, COUNT(*) as count FROM BankTransactions GROUP BY reconciliation_status")
            reconciliation_statuses = dict(cursor.fetchall())
            stats['reconciliation_statuses'] = reconciliation_statuses
            
        except Exception as advanced_err:
            logger.warning(f"Errore statistiche avanzate: {advanced_err}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Errore calcolo statistiche database: {e}")
        return {}
    finally:
        if conn:
            conn.close()

def verify_database_integrity():
    """Verifica l'integrità completa del database"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # PRAGMA integrity_check
        cursor.execute("PRAGMA integrity_check")
        integrity_result = cursor.fetchone()
        
        integrity_ok = integrity_result and integrity_result[0] == 'ok'
        
        # Verifica foreign keys
        cursor.execute("PRAGMA foreign_key_check")
        fk_violations = cursor.fetchall()
        
        # Verifica schema Settings
        cursor.execute("PRAGMA table_info(Settings)")
        settings_columns = [row[1] for row in cursor.fetchall()]
        settings_schema_ok = all(col in settings_columns for col in ['key', 'value', 'created_at', 'updated_at'])
        
        # Verifica indici
        cursor.execute("PRAGMA index_list(Anagraphics)")
        anag_indices = len(cursor.fetchall())
        
        cursor.execute("PRAGMA index_list(Invoices)")
        invoice_indices = len(cursor.fetchall())
        
        return {
            'integrity_ok': integrity_ok,
            'foreign_key_violations': len(fk_violations),
            'fk_violation_details': fk_violations[:5] if fk_violations else [],  # Prime 5 per debug
            'settings_schema_ok': settings_schema_ok,
            'settings_columns': settings_columns,
            'indices_count': {
                'anagraphics': anag_indices,
                'invoices': invoice_indices
            },
            'database_path': DB_PATH,
            'database_exists': os.path.exists(DB_PATH)
        }
        
    except Exception as e:
        logger.error(f"Errore verifica integrità database: {e}")
        return {
            'integrity_ok': False,
            'error': str(e)
        }
    finally:
        if conn:
            conn.close()

# === FUNZIONI COMPATIBILITÀ E MIGRAZIONE ===

def ensure_database_ready():
    """Assicura che il database sia pronto e compatibile con tutti i moduli"""
    try:
        # Crea/verifica tutte le tabelle
        create_tables()
        
        # Verifica integrità
        integrity = verify_database_integrity()
        if not integrity.get('integrity_ok', False):
            logger.warning("Database integrity check failed")
            return False
        
        # Test operazioni Settings critiche
        if not test_settings_operations():
            logger.error("Settings operations test failed")
            return False
        
        logger.info("Database is ready and fully compatible")
        return True
        
    except Exception as e:
        logger.error(f"Error ensuring database readiness: {e}")
        return False

def test_settings_operations():
    """Testa le operazioni critiche su Settings per verificare compatibilità"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        test_key = "compatibility_test"
        test_value = "test_value"
        
        # Test INSERT OR REPLACE con updated_at (operazione che causava l'errore originale)
        cursor.execute("""
            INSERT OR REPLACE INTO Settings (key, value, updated_at) 
            VALUES (?, ?, datetime('now'))
        """, (test_key, test_value))
        
        # Test SELECT
        cursor.execute("SELECT key, value, created_at, updated_at FROM Settings WHERE key = ?", (test_key,))
        result = cursor.fetchone()
        
        if not result or result['value'] != test_value:
            return False
        
        # Test UPDATE
        cursor.execute("""
            UPDATE Settings SET value = ?, updated_at = datetime('now') 
            WHERE key = ?
        """, ("updated_test_value", test_key))
        
        # Cleanup
        cursor.execute("DELETE FROM Settings WHERE key = ?", (test_key,))
        
        conn.commit()
        logger.debug("Settings operations test passed")
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Settings operations test failed: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def migrate_old_settings_table():
    """Migra una vecchia tabella Settings al nuovo schema se necessario"""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Controlla se esiste una tabella Settings con vecchio schema
        cursor.execute("PRAGMA table_info(Settings)")
        columns_info = cursor.fetchall()
        
        if not columns_info:
            # Nessuna tabella Settings esistente
            return True
        
        existing_columns = {row[1]: row for row in columns_info}
        
        # Se mancano le colonne timestamp, è una vecchia tabella
        if 'created_at' not in existing_columns or 'updated_at' not in existing_columns:
            logger.info("Migrating old Settings table to new schema...")
            
            # Backup dati esistenti
            cursor.execute("SELECT key, value FROM Settings")
            old_data = cursor.fetchall()
            
            # Rinomina vecchia tabella
            cursor.execute("ALTER TABLE Settings RENAME TO Settings_old")
            
            # Crea nuova tabella con schema completo
            cursor.execute("""
                CREATE TABLE Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Migra dati
            for row in old_data:
                cursor.execute("""
                    INSERT INTO Settings (key, value, created_at, updated_at)
                    VALUES (?, ?, datetime('now'), datetime('now'))
                """, (row[0], row[1]))
            
            # Rimuovi vecchia tabella
            cursor.execute("DROP TABLE Settings_old")
            
            conn.commit()
            logger.info(f"Successfully migrated {len(old_data)} settings to new schema")
        
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Error migrating Settings table: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def get_schema_version():
    """Ottiene la versione dello schema del database"""
    try:
        version = get_settings_value('schema_version', '1.0')
        return version
    except:
        return '1.0'

def set_schema_version(version):
    """Imposta la versione dello schema del database"""
    try:
        return set_settings_value('schema_version', version)
    except:
        return False

def update_schema_if_needed():
    """Aggiorna lo schema del database se necessario"""
    current_version = get_schema_version()
    target_version = '2.0'  # Versione con Settings completo e anagrafiche robuste
    
    if current_version == target_version:
        return True
    
    logger.info(f"Updating database schema from {current_version} to {target_version}")
    
    try:
        # Assicura compatibilità Settings
        ensure_settings_table_compatibility()
        
        # Aggiorna versione
        set_schema_version(target_version)
        
        logger.info("Database schema updated successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        return False

# === WRAPPER COMPATIBILITÀ ===

class DatabaseCompatibilityWrapper:
    """Wrapper per garantire compatibilità tra core sincrono e adapter asincrono"""
    
    @staticmethod
    def ensure_compatibility():
        """Assicura compatibilità tra tutti i sistemi"""
        try:
            # Aggiorna schema se necessario
            update_schema_if_needed()
            
            # Assicura che il database sia pronto
            ensure_database_ready()
            
            return True
        except Exception as e:
            logger.error(f"Compatibility check failed: {e}")
            return False
    
    @staticmethod
    def get_connection_safe():
        """Ottiene connessione sicura con verifica compatibilità"""
        try:
            conn = get_connection()
            
            # Verifica rapida schema Settings
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(Settings)")
            columns = [row[1] for row in cursor.fetchall()]
            
            required = ['key', 'value', 'created_at', 'updated_at']
            if not all(col in columns for col in required):
                conn.close()
                # Ripara automaticamente
                ensure_settings_table_compatibility()
                conn = get_connection()
            
            return conn
        except Exception as e:
            logger.error(f"Error getting safe connection: {e}")
            raise

# === FUNZIONI DIAGNOSTICA AVANZATA ===

def analyze_anagraphics_quality():
    """
    Analizza la qualità dei dati anagrafici per identificare potenziali problemi.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        analysis = {
            'total_anagraphics': 0,
            'missing_piva_cf': 0,
            'missing_denomination': 0,
            'potential_duplicates': [],
            'invalid_emails': 0,
            'missing_address': 0
        }
        
        # Conteggio totale
        cursor.execute("SELECT COUNT(*) FROM Anagraphics")
        analysis['total_anagraphics'] = cursor.fetchone()[0]
        
        # Anagrafiche senza P.IVA/CF
        cursor.execute("SELECT COUNT(*) FROM Anagraphics WHERE (piva IS NULL OR piva = '') AND (cf IS NULL OR cf = '')")
        analysis['missing_piva_cf'] = cursor.fetchone()[0]
        
        # Anagrafiche senza denominazione valida
        cursor.execute("SELECT COUNT(*) FROM Anagraphics WHERE denomination IS NULL OR LENGTH(TRIM(denomination)) < 2")
        analysis['missing_denomination'] = cursor.fetchone()[0]
        
        # Anagrafiche senza indirizzo
        cursor.execute("SELECT COUNT(*) FROM Anagraphics WHERE address IS NULL OR address = ''")
        analysis['missing_address'] = cursor.fetchone()[0]
        
        # Email non valide (controllo basico)
        cursor.execute("SELECT COUNT(*) FROM Anagraphics WHERE email IS NOT NULL AND email != '' AND email NOT LIKE '%@%'")
        analysis['invalid_emails'] = cursor.fetchone()[0]
        
        # Potenziali duplicati (stessa denominazione)
        cursor.execute("""
            SELECT denomination, COUNT(*) as count, GROUP_CONCAT(id) as ids
            FROM Anagraphics 
            WHERE denomination IS NOT NULL AND denomination != ''
            GROUP BY LOWER(TRIM(denomination))
            HAVING count > 1
            ORDER BY count DESC
            LIMIT 10
        """)
        
        duplicates = cursor.fetchall()
        for dup in duplicates:
            analysis['potential_duplicates'].append({
                'denomination': dup[0],
                'count': dup[1],
                'ids': dup[2].split(',')
            })
        
        return analysis
        
    except Exception as e:
        logger.error(f"Errore analisi qualità anagrafiche: {e}")
        return {}
    finally:
        if conn:
            conn.close()

def cleanup_orphaned_records():
    """
    Pulisce record orfani che potrebbero essersi creati durante import falliti.
    """
    conn = None
    cleanup_stats = {
        'orphaned_invoice_lines': 0,
        'orphaned_vat_summaries': 0,
        'orphaned_reconciliation_links': 0
    }
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Righe fatture orfane
        cursor.execute("""
            DELETE FROM InvoiceLines 
            WHERE invoice_id NOT IN (SELECT id FROM Invoices)
        """)
        cleanup_stats['orphaned_invoice_lines'] = cursor.rowcount
        
        # Riepiloghi IVA orfani
        cursor.execute("""
            DELETE FROM InvoiceVATSummary 
            WHERE invoice_id NOT IN (SELECT id FROM Invoices)
        """)
        cleanup_stats['orphaned_vat_summaries'] = cursor.rowcount
        
        # Link riconciliazione orfani
        cursor.execute("""
            DELETE FROM ReconciliationLinks 
            WHERE invoice_id NOT IN (SELECT id FROM Invoices)
               OR transaction_id NOT IN (SELECT id FROM BankTransactions)
        """)
        cleanup_stats['orphaned_reconciliation_links'] = cursor.rowcount
        
        conn.commit()
        
        total_cleaned = sum(cleanup_stats.values())
        if total_cleaned > 0:
            logger.info(f"Pulizia completata: {cleanup_stats}")
        else:
            logger.debug("Nessun record orfano trovato durante pulizia")
            
        return cleanup_stats
        
    except Exception as e:
        logger.error(f"Errore durante pulizia record orfani: {e}")
        if conn:
            conn.rollback()
        return cleanup_stats
    finally:
        if conn:
            conn.close()

# === INIZIALIZZAZIONE AUTOMATICA ===

def _auto_initialize():
    """Inizializzazione automatica del sistema database"""
    try:
        # Solo se il database esiste già, fai verifica compatibilità
        if os.path.exists(DB_PATH):
            db_wrapper = DatabaseCompatibilityWrapper()
            if not db_wrapper.ensure_compatibility():
                logger.warning("Database compatibility check failed during auto-initialization")
    except Exception as e:
        logger.warning(f"Auto-initialization failed: {e}")

# Esegui inizializzazione automatica
_auto_initialize()

# === EXPORT FUNZIONI PRINCIPALI ===

__all__ = [
    # Core functions
    'get_connection', 'create_tables', 'get_db_path',
    
    # CRUD operations  
    'add_anagraphics_if_not_exists', 'get_anagraphics', 'get_invoices', 
    'get_transactions', 'add_transactions',
    
    # Reconciliation
    'get_reconciliation_links_for_item', 'add_or_update_reconciliation_link',
    'remove_reconciliation_links', 'update_invoice_reconciliation_state',
    'update_transaction_reconciliation_state',
    
    # Settings (compatibili con first_run.py)
    'get_settings_value', 'set_settings_value',
    
    # Utility and compatibility
    'get_database_stats', 'verify_database_integrity', 'ensure_database_ready',
    'ensure_settings_table_compatibility', 'migrate_old_settings_table',
    'DatabaseCompatibilityWrapper',
    
    # Schema management
    'get_schema_version', 'set_schema_version', 'update_schema_if_needed',
    
    # Advanced functions
    'analyze_anagraphics_quality', 'cleanup_orphaned_records',
    'validate_anagraphics_data', 'find_existing_anagraphics',
    'clean_fiscal_code', 'extract_significant_words',
    
    # Core validation and helper functions
    'check_entity_duplicate', 'get_item_details'
]
