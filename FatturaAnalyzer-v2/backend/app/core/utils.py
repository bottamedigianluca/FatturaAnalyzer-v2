import hashlib
import re
import logging
logger = logging.getLogger(__name__)
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import datetime, date
import pandas as pd # Necessario per pd.isna e pd.to_datetime in alcune funzioni
import os
import configparser
import base64 # Per serializzare lo stato della UI se non si usa QByteArray direttamente qui
from functools import lru_cache # Per funzioni che beneficiano di caching
from typing import Optional, Dict, Any, List, Union, Tuple # Per type hinting
QT_AVAILABLE = False

# Prova a importare Qt se disponibile
try:
    from PyQt5.QtCore import QByteArray
    QT_AVAILABLE = True
except ImportError:
    try:
        from PyQt6.QtCore import QByteArray
        QT_AVAILABLE = True
    except ImportError:
        QT_AVAILABLE = False

# --- Costanti ---
AMOUNT_TOLERANCE = Decimal('0.01')
DECIMAL_PRECISION = Decimal('0.01') # Usato da quantize se non specificato diversamente

# Cache per pattern regex compilati
_COMPILED_PATTERNS = {
    'date_pattern_strict': re.compile(r'^\d{4}-\d{2}-\d{2}$'), # Formato ISO per hash
    'date_pattern_flexible': re.compile(r'^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{8})$'),
    'decimal_clean_basic': re.compile(r'[^\d.,-]'), # Per _clean_numeric_format
    'currency_symbols': re.compile(r'[€$£¥₹]'),
    'percentage_symbol': re.compile(r'[%]'),
    'multiple_whitespace': re.compile(r'\s+'),
    'non_alphanumeric_except_common_separators': re.compile(r'[^\w.\-_]+'), # Per hash transazione
    'normalize_product_remove_details': [], # Sarà popolato in normalize_product_name
    'normalize_product_variety': [],      # Sarà popolato in normalize_product_name
    'invoice_number_extract': [ # Pattern per extract_invoice_number
        re.compile(r'\b(?:fatt|ft|fattura|doc|documento|nr|num|n)\.?\s+([\w/\-]{3,20})', re.IGNORECASE),
        re.compile(r'\b(\d{2,4}[/_-]\d{2,8})\b'), # Numeri con separatori
        re.compile(r'\b([A-Z]{1,4}\s?\d{3,10}[A-Z\d]*)\b', re.IGNORECASE), # Codici alfanumerici
        re.compile(r'\b(\d{4,12})\b') # Numeri puri più lunghi
    ],
    'invoice_number_false_positives': [ # Pattern per _is_false_positive
        re.compile(r'^(?:NR|FT|RIF|DOC|FATT|NUM)$', re.IGNORECASE),
        re.compile(r'^\d{1,3}$'),
        re.compile(r'^(?:19|20)\d{2}$'),
        re.compile(r'^\d{5}$'), # Es. CAP
        re.compile(r'^\d+[.,]\d{2}$'),
        re.compile(r'^0+\d*$'),
        re.compile(r'^\d{16,}$'), # Es. carte di credito
        re.compile(r'^(?:123456|111111|000000)$'),
    ]
}

# --- Percorso Configurazione ---
_CONFIG_FILE_PATH = None

def get_project_root() -> str:
    """Trova la root del progetto cercando main.py o config.ini."""
    current = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Va su di due livelli da core/utils.py
    for _ in range(3): # Cerca fino a 3 livelli sopra
        if os.path.exists(os.path.join(current, 'config.ini')) or \
           os.path.exists(os.path.join(current, 'main.py')):
            return current
        parent = os.path.dirname(current)
        if parent == current: break # Raggiunta la radice del filesystem
        current = parent
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Fallback se non trovato

def get_config_path() -> str:
    """Ottiene il percorso del file di configurazione."""
    global _CONFIG_FILE_PATH
    if _CONFIG_FILE_PATH is None:
        project_root = get_project_root()
        _CONFIG_FILE_PATH = os.path.join(project_root, 'config.ini')
    return _CONFIG_FILE_PATH

CONFIG_FILE_PATH = get_config_path() # Inizializza la costante globale

# --- Conversioni Numeriche e Quantizzazione ---
def _clean_numeric_format(text: str) -> str:
    """Pulizia ottimizzata formato numerico, usata internamente da to_decimal."""
    if not text: 
        return "0.0"
    
    cleaned = _COMPILED_PATTERNS['decimal_clean_basic'].sub('', text.strip())
    if not cleaned: 
        return "0.0"

    is_negative = cleaned.startswith('-')
    if cleaned.startswith(('+', '-')): 
        cleaned = cleaned[1:]

    if ',' in cleaned and '.' in cleaned:
        comma_pos = cleaned.rfind(',')
        dot_pos = cleaned.rfind('.')
        cleaned = cleaned.replace('.', '').replace(',', '.') if comma_pos > dot_pos else cleaned.replace(',', '')
    elif ',' in cleaned:
        parts = cleaned.split(',')
        if len(parts) == 2 and len(parts[1]) <= 2 and parts[1].isdigit():
            cleaned = cleaned.replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    
    if cleaned.count('.') > 1: # Gestisce "1.234.567" o "1.2.3"
        parts = cleaned.split('.')
        cleaned = "".join(parts[:-1]) + "." + parts[-1]

    return ('-' + cleaned) if is_negative and cleaned and cleaned != "0.0" else (cleaned if cleaned else "0.0")

def to_decimal(value: Any, default: Union[str, Decimal] = '0.0') -> Decimal:
    """Conversione ottimizzata a Decimal con gestione robusta di vari tipi."""
    default_dec = Decimal(default) if isinstance(default, str) else default
    
    if value is None or pd.isna(value): 
        return default_dec
    
    if isinstance(value, Decimal): 
        return value if value.is_finite() else default_dec
    
    if isinstance(value, (int, float)):
        try: 
            return Decimal(str(value)) # str(value) per float per precisione
        except (InvalidOperation, ValueError): 
            return default_dec
    
    if isinstance(value, str):
        cleaned_val = value.strip()
        if not cleaned_val or cleaned_val.lower() in ['nan', 'nat', 'none', 'null', '']: 
            return default_dec
        
        if _COMPILED_PATTERNS['date_pattern_flexible'].match(cleaned_val):
            if re.search(r'[-/]', cleaned_val) or ('.' in cleaned_val and not cleaned_val.replace('.','',1).isdigit()):
                logger.debug(f"Valore '{cleaned_val}' sembra una data, non convertito a Decimal.")
                return default_dec
        
        try:
            cleaned_num_str = _COMPILED_PATTERNS['currency_symbols'].sub('', cleaned_val)
            cleaned_num_str = _COMPILED_PATTERNS['percentage_symbol'].sub('', cleaned_num_str)
            cleaned_num_format = _clean_numeric_format(cleaned_num_str)
            if not cleaned_num_format or cleaned_num_format in ['-', '+', '.', ',']: 
                return default_dec
            return Decimal(cleaned_num_format)
        except (InvalidOperation, ValueError, OverflowError) as e:
            logger.debug(f"Conversione Decimal fallita per '{cleaned_val}': {e}. Uso default.")
            return default_dec
    
    try: # Fallback per altri tipi
        str_value = str(value)
        if str_value.lower() in ['nan', 'nat', 'none', 'null', '']: 
            return default_dec
        return to_decimal(str_value, default) # Ricorsione con la stringa
    except Exception: 
        return default_dec

def quantize(decimal_value: Any, precision: Optional[Decimal] = None) -> Decimal:
    """Quantizzazione ottimizzata. Restituisce Decimal('0.00') per NaN o errori."""
    effective_precision = precision if precision is not None else DECIMAL_PRECISION
    
    if not isinstance(decimal_value, Decimal):
        decimal_value = to_decimal(decimal_value, default='NaN') # Usa 'NaN' per indicare fallimento

    if not decimal_value.is_finite(): # Gestisce NaN, Inf, -Inf
        return Decimal('0.00') # O un altro default sensato
    
    try:
        return decimal_value.quantize(effective_precision, rounding=ROUND_HALF_UP)
    except (InvalidOperation, OverflowError):
        return Decimal('0.00')

# --- Normalizzazione Date e Stringhe per Hashing ---
@lru_cache(maxsize=1024)
def _normalize_date_string_for_hash(date_input: Any) -> str:
    """Normalizza date in formato YYYY-MM-DD per hashing consistente."""
    if isinstance(date_input, (datetime, date)):
        return date_input.strftime('%Y-%m-%d')
    
    if isinstance(date_input, str):
        s_date = date_input.strip()
        if not s_date: 
            return ""
        
        if _COMPILED_PATTERNS['date_pattern_strict'].match(s_date): 
            return s_date # Già nel formato corretto
        
        try: # Prova a parsare con pandas, è abbastanza flessibile
            return pd.to_datetime(s_date, errors='raise').strftime('%Y-%m-%d')
        except Exception:
            logger.debug(f"Formato data non standard per hash: '{s_date}'. Uso stringa originale.")
            return s_date # Fallback alla stringa originale se il parsing fallisce
    
    if pd.isna(date_input) or date_input is None: 
        return ""
    
    return str(date_input).strip()

# --- Funzioni di Hashing ---
@lru_cache(maxsize=2048) # Aumentato per più fatture
def calculate_invoice_hash(cedente_id: str, cessionario_id: str,
                          doc_type: str, doc_number: str, doc_date: Any) -> str:
    """Calcola hash univoco per una fattura."""
    try:
        cedente_clean = str(cedente_id or '').strip().upper()
        cessionario_clean = str(cessionario_id or '').strip().upper()
        doc_type_clean = str(doc_type or '').strip().upper()
        doc_number_clean = _COMPILED_PATTERNS['multiple_whitespace'].sub('', str(doc_number or '')).upper()
        date_normalized = _normalize_date_string_for_hash(doc_date)

        if not all([cedente_clean, cessionario_clean, doc_type_clean, doc_number_clean, date_normalized]):
            logger.warning(f"Dati hash fattura incompleti: C:{cedente_clean},CS:{cessionario_clean},T:{doc_type_clean},N:{doc_number_clean},D:{date_normalized}")

        hash_string = f"INV|{cedente_clean}|{cessionario_clean}|{doc_type_clean}|{doc_number_clean}|{date_normalized}"
        return hashlib.sha256(hash_string.encode('utf-8')).hexdigest()
    except Exception as e:
        logger.error(f"Errore calcolo hash fattura: {e}, Dati: C:{cedente_id},CS:{cessionario_id},T:{doc_type},N:{doc_number},D:{doc_date}", exc_info=True)
        return hashlib.sha256(f"ERROR_INV_{datetime.now().isoformat()}".encode('utf-8')).hexdigest()

@lru_cache(maxsize=2048) # Aumentato per più transazioni
def calculate_transaction_hash(transaction_date: Any, amount: Any, description: str) -> str:
    """Calcola hash univoco per una transazione bancaria."""
    try:
        date_normalized = _normalize_date_string_for_hash(transaction_date)
        
        amount_decimal = to_decimal(amount, default='NaN')
        amount_normalized = f"{quantize(amount_decimal):.2f}" if amount_decimal.is_finite() else "INVALID_AMOUNT"

        desc_clean = str(description or '').strip().upper()
        desc_clean = _COMPILED_PATTERNS['non_alphanumeric_except_common_separators'].sub(' ', desc_clean)
        desc_clean = _COMPILED_PATTERNS['multiple_whitespace'].sub(' ', desc_clean).strip()
        desc_part = desc_clean[:200] # Limita lunghezza per consistenza e performance

        if not all([date_normalized, amount_normalized != "INVALID_AMOUNT"]):
             logger.warning(f"Dati hash transazione incompleti: D:{date_normalized}, Imp:{amount_normalized}, Desc:'{desc_part[:30]}...'")

        hash_string = f"TRX|{date_normalized}|{amount_normalized}|{desc_part}"
        return hashlib.sha256(hash_string.encode('utf-8')).hexdigest()
    except Exception as e:
        logger.error(f"Errore calcolo hash transazione: {e}, Dati: D:{transaction_date}, Imp:{amount}, Desc:'{str(description)[:30]}...'", exc_info=True)
        return hashlib.sha256(f"ERROR_TRX_{datetime.now().isoformat()}".encode('utf-8')).hexdigest()

# --- Utility per Anagrafiche e Prodotti ---
def _dict_to_cache_key(d: Dict[str, Any]) -> Tuple[Tuple[str, str], ...]:
    """Converte un dizionario in una tupla ordinata per renderlo cache-abile."""
    if not d:
        return ()
    # Ordina le chiavi per garantire consistenza e converte i valori in stringhe
    return tuple(sorted((k, str(v)) for k, v in d.items() if v is not None))

@lru_cache(maxsize=256)
def _is_own_company_cached(anag_key: Tuple[Tuple[str, str], ...], 
                           my_company_key: Tuple[Tuple[str, str], ...]) -> bool:
    """Versione cache-abile della logica _is_own_company."""
    # Riconverte le tuple in dizionari per la logica esistente
    anag_data = dict(anag_key) if anag_key else {}
    my_company_data = dict(my_company_key) if my_company_key else {}
    
    if not my_company_data or (not my_company_data.get('piva') and not my_company_data.get('cf')):
        if anag_data: 
            logger.error("_is_own_company: Dati azienda (my_company_data) non validi o mancanti in config.")
        return False
    
    if not anag_data: 
        return False

    anag_piva = str(anag_data.get('piva', '')).strip().upper().replace('IT', '')
    anag_cf = str(anag_data.get('cf', '')).strip().upper()
    my_piva = str(my_company_data.get('piva', '')).strip().upper().replace('IT', '')
    my_cf = str(my_company_data.get('cf', '')).strip().upper()

    if my_piva and anag_piva and my_piva == anag_piva: 
        return True
    if my_cf and anag_cf and my_cf == anag_cf: 
        return True
    if my_piva and anag_cf and my_piva == anag_cf: 
        return True # P.IVA numerica può essere usata come CF per aziende
    if my_cf and anag_piva and my_cf == anag_piva: 
        return True # CF numerico può essere P.IVA

    return False

def _is_own_company(anag_data: Dict[str, Any], my_company_data: Dict[str, Any]) -> bool:
    """Wrapper pubblico per _is_own_company_cached che gestisce la conversione a tuple."""
    anag_key = _dict_to_cache_key(anag_data)
    my_company_key = _dict_to_cache_key(my_company_data)
    return _is_own_company_cached(anag_key, my_company_key)

@lru_cache(maxsize=1024)
def normalize_product_name(name: str) -> Optional[str]:
    """Normalizza i nomi dei prodotti per un'analisi più consistente."""
    if not isinstance(name, str) or not name.strip():
        return None

    norm_name = name.lower().strip()
    norm_name = _COMPILED_PATTERNS['multiple_whitespace'].sub(' ', norm_name)

    # Inizializza i pattern compilati solo una volta
    if not _COMPILED_PATTERNS['normalize_product_remove_details']:
        patterns_to_remove = [
            r'\b\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?\b', # Date
            r'\b(?:lotto?|lot|lt|art|cod)\.?\s*[:\-]?\s*[\w\d/\-\.]+', # Lotti, articoli, codici
            r'\b\d{4,}\b', # Numeri lunghi (possibili codici o anni isolati)
            r'\b(?:cal|calibro|gr|kg|lt|pz|nr|collo|conf|iva|sc)\.?\s*[\d\w\.\-/+]+', # Unità di misura, calibri, ecc.
            r'\bx\s*\d+', # Moltiplicatori tipo "x12"
            r'\b(?:italia|italy|sicilia|spagna|grecia|estero|nazionale|nostrano|origine|provenienza|tipo|variet[aà]|qualit[aà]|uso|cat)\s*[\w\.\-/+]+', # Origine, tipo, categoria
            r'\b(?:extra|prima|seconda|scelta|select)\b', # Qualità
            r'\b(?:confezionat[aoe]?|sfuso|gabbia|plateaux|plt|cassetta|cestino|vaschetta|sacchetto|retina|legaccio|mazzo|grappolo|pianta)\b', # Confezionamento
            r'\b(?:bianc[hoaie]|ner[oaei]|ross[oaei]|giall[oaei]|verd[ei]|viol[ae]|arancio|striat[oaei]|tond[oaei]|lung[oaei]|oval[ei])\b', # Colori, forme
            r'\b(?:dolce|piccante|amaro|matur[oaei]|primofiore|primizie|bio|biologico|fresco|fresche|grande|piccolo|medio)\b', # Attributi
            r'\b(?:da\s+industria|da\s+succo|per\s+conserve)\b', # Uso specifico
            # Rimuovi singole lettere o numeri se non parte di un nome composto riconosciuto
            r'\b[a-z]\b', r'\b\d\b',
            r'\s*-\s*', r'\s*/\s*' # Separatori isolati
        ]
        _COMPILED_PATTERNS['normalize_product_remove_details'] = [re.compile(p, re.IGNORECASE) for p in patterns_to_remove]
        
        # Pattern per varietà specifiche da preservare o gestire in modo speciale
        variety_patterns_to_clean = [
            r'\b(?:red\s+globe|seedless|victoria|black\s+magic|pizzutella|regina|michele\s+palieri)\b',
            r'\b(?:golden(?:\s+delicious)?|gala|fuji|granny\s+smith|red\s+delicious|stark)\b',
            r'\b(?:williams|decana|conference|abate\s+fetel|coscia|kaiser)\b',
            r'\b(?:navel|tarocco|moro|sanguinello|valencia|clementine)\b',
        ]
        _COMPILED_PATTERNS['normalize_product_variety'] = [re.compile(p, re.IGNORECASE) for p in variety_patterns_to_clean]

    for pattern in _COMPILED_PATTERNS['normalize_product_remove_details']:
        norm_name = pattern.sub(' ', norm_name)
    
    # Per le varietà, se rimangono come unica parola o con poche altre, potrebbero essere il nome normalizzato.
    for pattern in _COMPILED_PATTERNS['normalize_product_variety']:
        norm_name = pattern.sub(' ', norm_name)

    # Pulizia finale
    norm_name = re.sub(r'[^\w\s]', ' ', norm_name) # Rimuovi punteggiatura residua
    norm_name = _COMPILED_PATTERNS['multiple_whitespace'].sub(' ', norm_name).strip()
    
    # Se dopo la pulizia rimangono parole comuni come "uva", "mela", le manteniamo.
    # Se il nome diventa troppo corto o irriconoscibile, potrebbe essere meglio scartarlo.
    if len(norm_name.split()) == 1 and len(norm_name) < 3 and not norm_name.isdigit(): # es. "u"
        return None
    if not norm_name or len(norm_name) < 3 : # Nomi troppo corti non sono utili
        logger.debug(f"Normalizzazione prodotto per '{name}' ha prodotto un risultato troppo corto/vuoto: '{norm_name}'")
        return None
        
    return norm_name

@lru_cache(maxsize=1024)
def extract_invoice_number(text: str) -> List[str]:
    """Estrae potenziali numeri di fattura da una stringa, ottimizzato."""
    if not text or not isinstance(text, str): 
        return []
    
    # Pre-processamento leggero: spazi uniformi, no punteggiatura fine a se stessa
    processed_text = _COMPILED_PATTERNS['multiple_whitespace'].sub(' ', text)
    processed_text = f' {processed_text} ' # Aggiungi spazi per matchare \b

    found_numbers = set()
    for pattern in _COMPILED_PATTERNS['invoice_number_extract']:
        try:
            matches = pattern.findall(processed_text)
            for match_item in matches:
                # findall restituisce tuple se ci sono gruppi nel pattern, altrimenti stringhe
                num_str = match_item if isinstance(match_item, str) else match_item[0] 
                cleaned_num = re.sub(r'\s+', '', num_str).upper().strip('.-/_')
                if cleaned_num and len(cleaned_num) >= 3 and len(cleaned_num) <= 20 and \
                   re.search(r'\d', cleaned_num) and \
                   not any(fp.match(cleaned_num) for fp in _COMPILED_PATTERNS['invoice_number_false_positives']):
                    found_numbers.add(cleaned_num)
        except re.error as e:
            logger.warning(f"Errore Regex in extract_invoice_number pattern '{pattern.pattern}': {e}")
        except Exception as e_gen:
            logger.error(f"Errore generico in extract_invoice_number: {e_gen}")

    # Ordina per rilevanza (lunghezza, contenuto numerico)
    sorted_numbers = sorted(list(found_numbers), key=lambda x: (len(x), -sum(c.isdigit() for c in x)), reverse=True)
    return sorted_numbers[:5] # Limita a top 5 risultati

# --- Gestione Stato UI (Persistente su config.ini) ---
UI_STATE_SECTION = 'UI_Table_States' # Nome della sezione in config.ini

def save_table_state_persistent(table_name_key: str, serialized_state: str) -> bool:
    """Salva uno stato serializzato (stringa base64) nel file config.ini."""
    if not QT_AVAILABLE: 
        logger.debug(f"Qt non disponibile, salvataggio stato tabella '{table_name_key}' saltato.")
        return False
    
    try:
        config = configparser.ConfigParser()
        if os.path.exists(CONFIG_FILE_PATH):
            config.read(CONFIG_FILE_PATH, encoding='utf-8')
        
        if not config.has_section(UI_STATE_SECTION):
            config.add_section(UI_STATE_SECTION)
        
        config.set(UI_STATE_SECTION, table_name_key, serialized_state)
        
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as configfile:
            config.write(configfile)
        logger.debug(f"Stato tabella '{table_name_key}' salvato persistentemente.")
        return True
    except Exception as e:
        logger.error(f"Errore salvataggio persistente stato tabella '{table_name_key}': {e}")
        return False

def restore_table_state_persistent(table_name_key: str) -> Optional[str]:
    """Ripristina uno stato serializzato (stringa base64) da config.ini."""
    if not QT_AVAILABLE: 
        logger.debug(f"Qt non disponibile, ripristino stato tabella '{table_name_key}' saltato.")
        return None
    
    try:
        config = configparser.ConfigParser()
        if not os.path.exists(CONFIG_FILE_PATH):
            logger.debug(f"File config non trovato per restore stato tabella '{table_name_key}'.")
            return None
        
        config.read(CONFIG_FILE_PATH, encoding='utf-8')
        
        if config.has_option(UI_STATE_SECTION, table_name_key):
            serialized_state = config.get(UI_STATE_SECTION, table_name_key)
            logger.debug(f"Stato tabella '{table_name_key}' ripristinato persistentemente.")
            return serialized_state
        else:
            logger.debug(f"Nessuno stato persistente trovato per tabella '{table_name_key}'.")
            return None
    except Exception as e:
        logger.error(f"Errore ripristino persistente stato tabella '{table_name_key}': {e}")
        return None

def save_table_state(table_name: str, header_view_or_state_string: Union[Any, str]) -> bool:
    """
    Wrapper. Se header_view_or_state_string è una stringa (base64), la salva.
    Altrimenti, logga un avviso perché la logica Qt dovrebbe essere nella UI.
    """
    if isinstance(header_view_or_state_string, str):
        return save_table_state_persistent(table_name, header_view_or_state_string)
    else:
        logger.warning(f"save_table_state chiamata con oggetto Qt ({type(header_view_or_state_string)})."
                       "La serializzazione Qt dovrebbe avvenire nel modulo UI.")
        # Qui si potrebbe provare a chiamare header_view_or_state_string.saveState()
        # e base64 encode, ma si introduce dipendenza Qt
        if QT_AVAILABLE and hasattr(header_view_or_state_string, 'saveState'):
             try:
                 state_bytes = header_view_or_state_string.saveState()
                 state_base64 = base64.urlsafe_b64encode(state_bytes.data()).decode('utf-8')
                 return save_table_state_persistent(table_name, state_base64)
             except Exception as e_qt_save:
                 logger.error(f"Errore durante serializzazione Qt in save_table_state: {e_qt_save}")
        return False

def restore_table_state(table_name: str, header_view_to_restore: Any) -> bool:
    """
    Wrapper. Ottiene lo stato stringa e aspetta che la UI lo applichi.
    Restituisce True se lo stato è stato trovato, False altrimenti.
    """
    serialized_state = restore_table_state_persistent(table_name)
    if serialized_state:
        if QT_AVAILABLE and hasattr(header_view_to_restore, 'restoreState'):
            try:
                state_bytes_data = base64.urlsafe_b64decode(serialized_state.encode('utf-8'))
                state_qbytearray = QByteArray(state_bytes_data)
                if header_view_to_restore.restoreState(state_qbytearray):
                    logger.debug(f"Stato tabella '{table_name}' applicato con successo all'header_view.")
                    return True
                else:
                    logger.warning(f"Fallito restoreState Qt per tabella '{table_name}'.")
                    return False # Stato trovato ma non applicabile
            except Exception as e_qt_restore:
                logger.error(f"Errore durante deserializzazione/applicazione stato Qt in restore_table_state: {e_qt_restore}")
                return False
        else: # Stato trovato, ma non possiamo applicarlo da qui senza Qt
            logger.warning(f"Stato per '{table_name}' trovato, ma l'applicazione Qt è responsabilità della UI.")
            return True # Indica che uno stato è stato trovato
    return False

# --- Funzioni di Formattazione ---
def format_currency(value: Any, default_str: str = "€ 0,00") -> str:
    """Formatta un valore come valuta in formato italiano."""
    if value is None: 
        return default_str
    
    try:
        decimal_value = to_decimal(value) # Usa la to_decimal robusta
        if not decimal_value.is_finite(): 
            return default_str
        
        quantized_value = quantize(decimal_value) # Usa la quantize robusta
        
        # Formattazione italiana
        # Esempio: Decimal('-1234.56') -> "-1.234,56 €"
        # Esempio: Decimal('1234.56') -> "1.234,56 €"
        # Esempio: Decimal('0.00') -> "0,00 €"
        
        sign = "-" if quantized_value.is_signed() and quantized_value.copy_abs() != Decimal('0') else ""
        abs_value_str = f"{quantized_value.copy_abs():,.2f}" # es. 1,234.56 o 0.00
        
        # Sostituisci per formato italiano
        # "1,234.56" -> "1X234Y56" -> "1.234,56"
        # "0.00" -> "0Y00" -> "0,00"
        formatted_abs = abs_value_str.replace(",", "X").replace(".", ",").replace("X", ".")
        
        return f"{sign}{formatted_abs} €"

    except Exception as e:
        logger.warning(f"Errore formattazione valuta per '{value}': {e}")
        return default_str

def format_percentage(value: Any, default_str: str = "--") -> str:
    """Formatta un valore come percentuale."""
    if value is None or pd.isna(value): 
        return default_str
    
    try:
        if isinstance(value, Decimal): 
            float_value = float(value)
        elif isinstance(value, (int, float)): 
            float_value = float(value)
        else:
            # Prova a convertire a Decimal e poi a float
            dec_val = to_decimal(value, default='NaN')
            if not dec_val.is_finite(): 
                return default_str
            float_value = float(dec_val)
        
        sign = "+" if float_value >= 0 else ""
        return f"{sign}{float_value:.1f}%"
    except (ValueError, TypeError, InvalidOperation) as e:
        logger.warning(f"Errore formattazione percentuale per '{value}': {e}")
        return default_str

def format_date(value: Any, default_str: str = "--") -> str:
    """Formatta una data in formato italiano."""
    if value is None or pd.isna(value):
        return default_str
    
    try:
        if isinstance(value, (datetime, date)):
            return value.strftime('%d/%m/%Y')
        elif isinstance(value, str):
            # Prova a parsare la stringa come data
            parsed_date = pd.to_datetime(value, errors='coerce')
            if pd.isna(parsed_date):
                return default_str
            return parsed_date.strftime('%d/%m/%Y')
        else:
            return default_str
    except Exception as e:
        logger.warning(f"Errore formattazione data per '{value}': {e}")
        return default_str

def format_number(value: Any, decimals: int = 2, default_str: str = "--") -> str:
    """Formatta un numero in formato italiano con numero specificato di decimali."""
    if value is None or pd.isna(value):
        return default_str
    
    try:
        decimal_value = to_decimal(value)
        if not decimal_value.is_finite():
            return default_str
        
        # Crea precision dynamically basata sui decimali richiesti
        precision = Decimal('0.1') ** decimals if decimals > 0 else Decimal('1')
        quantized_value = decimal_value.quantize(precision, rounding=ROUND_HALF_UP)
        
        # Formato italiano
        if decimals == 0:
            formatted = f"{quantized_value:,.0f}".replace(",", ".")
        else:
            formatted = f"{quantized_value:,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
        
        return formatted
    except Exception as e:
        logger.warning(f"Errore formattazione numero per '{value}': {e}")
        return default_str

# --- Funzioni di Validazione ---
def validate_vat_number(vat_number: str, country_code: str = "IT") -> bool:
    """Valida una partita IVA italiana (basic validation)."""
    if not vat_number or not isinstance(vat_number, str):
        return False
    
    # Rimuovi spazi e converti in maiuscolo
    vat_clean = vat_number.strip().upper().replace(country_code, "")
    
    # Verifica formato base per Italia (11 cifre)
    if country_code == "IT":
        if not vat_clean.isdigit() or len(vat_clean) != 11:
            return False
        
        # Verifica check digit per P.IVA italiana
        try:
            digits = [int(d) for d in vat_clean[:10]]
            check_digit = int(vat_clean[10])
            
            # Algoritmo di controllo P.IVA italiana
            odd_sum = sum(digits[i] for i in range(0, 10, 2))
            even_sum = sum(digits[i] for i in range(1, 10, 2))
            
            doubled_even = even_sum * 2
            if doubled_even > 9:
                doubled_even = (doubled_even // 10) + (doubled_even % 10)
            
            total = odd_sum + doubled_even
            calculated_check = (10 - (total % 10)) % 10
            
            return check_digit == calculated_check
        except (ValueError, IndexError):
            return False
    
    # Per altri paesi, validazione base
    return len(vat_clean) >= 8 and vat_clean.isalnum()

def validate_tax_code(tax_code: str) -> bool:
    """Valida un codice fiscale italiano (basic validation)."""
    if not tax_code or not isinstance(tax_code, str):
        return False
    
    tax_clean = tax_code.strip().upper()
    
    # Verifica lunghezza
    if len(tax_clean) == 16:
        # Codice fiscale persona fisica
        return re.match(r'^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$', tax_clean) is not None
    elif len(tax_clean) == 11:
        # Codice fiscale persona giuridica (uguale a P.IVA)
        return validate_vat_number(tax_clean, "IT")
    
    return False

def validate_email(email: str) -> bool:
    """Valida un indirizzo email (basic validation)."""
    if not email or not isinstance(email, str):
        return False
    
    email_clean = email.strip()
    # Pattern base per email
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    return email_pattern.match(email_clean) is not None

def validate_phone(phone: str) -> bool:
    """Valida un numero di telefono italiano (basic validation)."""
    if not phone or not isinstance(phone, str):
        return False
    
    # Rimuovi spazi, trattini, parentesi
    phone_clean = re.sub(r'[\s\-\(\)]', '', phone.strip())
    
    # Rimuovi prefisso internazionale se presente
    if phone_clean.startswith('+39'):
        phone_clean = phone_clean[3:]
    elif phone_clean.startswith('0039'):
        phone_clean = phone_clean[4:]
    
    # Verifica che sia solo numeri e lunghezza appropriata
    if not phone_clean.isdigit():
        return False
    
    # Lunghezza tipica numeri italiani (6-11 cifre)
    return 6 <= len(phone_clean) <= 11

# --- Utility per Analisi Dati ---
def calculate_stats(values: List[Union[int, float, Decimal]]) -> Dict[str, Any]:
    """Calcola statistiche base per una lista di valori numerici."""
    if not values:
        return {
            'count': 0,
            'sum': Decimal('0'),
            'mean': Decimal('0'),
            'min': None,
            'max': None,
            'median': None
        }
    
    # Converte tutti i valori a Decimal per precisione
    decimal_values = []
    for v in values:
        dec_val = to_decimal(v)
        if dec_val.is_finite():
            decimal_values.append(dec_val)
    
    if not decimal_values:
        return {
            'count': 0,
            'sum': Decimal('0'),
            'mean': Decimal('0'),
            'min': None,
            'max': None,
            'median': None
        }
    
    count = len(decimal_values)
    total = sum(decimal_values)
    mean_val = quantize(total / count)
    
    sorted_values = sorted(decimal_values)
    if count % 2 == 0:
        median_val = quantize((sorted_values[count // 2 - 1] + sorted_values[count // 2]) / 2)
    else:
        median_val = sorted_values[count // 2]
    
    return {
        'count': count,
        'sum': quantize(total),
        'mean': mean_val,
        'min': min(decimal_values),
        'max': max(decimal_values),
        'median': median_val
    }

def group_by_period(data: List[Dict[str, Any]], date_field: str, period: str = 'month') -> Dict[str, List[Dict[str, Any]]]:
    """Raggruppa dati per periodo (month, quarter, year)."""
    grouped = {}
    
    for item in data:
        date_value = item.get(date_field)
        if not date_value:
            continue
        
        try:
            if isinstance(date_value, str):
                date_obj = pd.to_datetime(date_value, errors='coerce')
            elif isinstance(date_value, (datetime, date)):
                date_obj = date_value
            else:
                continue
            
            if pd.isna(date_obj):
                continue
            
            # Determina la chiave del periodo
            if period == 'month':
                key = date_obj.strftime('%Y-%m')
            elif period == 'quarter':
                quarter = (date_obj.month - 1) // 3 + 1
                key = f"{date_obj.year}-Q{quarter}"
            elif period == 'year':
                key = str(date_obj.year)
            else:
                key = date_obj.strftime('%Y-%m')  # Default a month
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(item)
            
        except Exception as e:
            logger.warning(f"Errore raggruppamento per periodo '{period}' con data '{date_value}': {e}")
            continue
    
    return grouped

# --- Utility per File e Percorsi ---
def ensure_directory_exists(directory_path: str) -> bool:
    """Assicura che una directory esista, creandola se necessario."""
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Errore creazione directory '{directory_path}': {e}")
        return False

def get_safe_filename(filename: str, max_length: int = 255) -> str:
    """Restituisce un nome file sicuro rimuovendo caratteri non validi."""
    if not filename:
        return "untitled"
    
    # Rimuovi caratteri non validi per i nomi file
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Rimuovi spazi multipli e trim
    safe_name = _COMPILED_PATTERNS['multiple_whitespace'].sub(' ', safe_name).strip()
    
    # Limita lunghezza
    if len(safe_name) > max_length:
        name_part, ext_part = os.path.splitext(safe_name)
        available_length = max_length - len(ext_part)
        safe_name = name_part[:available_length] + ext_part
    
    return safe_name if safe_name else "untitled"

def get_file_size_human(file_path: str) -> str:
    """Restituisce la dimensione di un file in formato leggibile."""
    try:
        size_bytes = os.path.getsize(file_path)
        
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    except Exception as e:
        logger.warning(f"Errore calcolo dimensione file '{file_path}': {e}")
        return "-- B"

# --- Utility per Logging ---
def setup_logger(name: str, level: int = logging.INFO, 
                log_file: Optional[str] = None, 
                format_string: Optional[str] = None) -> logging.Logger:
    """Configura un logger con formato consistente."""
    logger_instance = logging.getLogger(name)
    
    # Evita duplicazione handler
    if logger_instance.handlers:
        return logger_instance
    
    logger_instance.setLevel(level)
    
    # Formato default
    if format_string is None:
        format_string = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    formatter = logging.Formatter(format_string)
    
    # Handler console
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger_instance.addHandler(console_handler)
    
    # Handler file se specificato
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setFormatter(formatter)
            logger_instance.addHandler(file_handler)
        except Exception as e:
            logger_instance.warning(f"Impossibile creare file handler per '{log_file}': {e}")
    
    return logger_instance

# --- Cache Management ---
def clear_all_caches():
    """Pulisce tutte le cache LRU per liberare memoria."""
    functions_with_cache = [
        _normalize_date_string_for_hash,
        calculate_invoice_hash,
        calculate_transaction_hash,
        _is_own_company_cached,
        normalize_product_name,
        extract_invoice_number
    ]
    
    cleared_count = 0
    for func in functions_with_cache:
        if hasattr(func, 'cache_clear'):
            try:
                func.cache_clear()
                cleared_count += 1
            except Exception as e:
                logger.warning(f"Errore pulizia cache per {func.__name__}: {e}")
    
    logger.info(f"Pulite {cleared_count} cache LRU.")

def get_cache_info() -> Dict[str, Dict[str, Any]]:
    """Restituisce informazioni sullo stato delle cache."""
    functions_with_cache = [
        _normalize_date_string_for_hash,
        calculate_invoice_hash,
        calculate_transaction_hash,
        _is_own_company_cached,
        normalize_product_name,
        extract_invoice_number
    ]
    
    cache_info = {}
    for func in functions_with_cache:
        if hasattr(func, 'cache_info'):
            try:
                info = func.cache_info()
                cache_info[func.__name__] = {
                    'hits': info.hits,
                    'misses': info.misses,
                    'maxsize': info.maxsize,
                    'currsize': info.currsize
                }
            except Exception as e:
                cache_info[func.__name__] = {'error': str(e)}
    
    return cache_info

# --- Funzioni di Debug e Testing ---
def debug_print_dict(data: Dict[str, Any], title: str = "Debug Dict", max_depth: int = 3, current_depth: int = 0) -> None:
    """Stampa un dizionario in modo formattato per debug."""
    if current_depth == 0:
        print(f"\n=== {title} ===")
    
    if current_depth >= max_depth:
        print("  " * current_depth + "... (max depth reached)")
        return
    
    for key, value in data.items():
        indent = "  " * current_depth
        if isinstance(value, dict):
            print(f"{indent}{key}:")
            debug_print_dict(value, current_depth=current_depth + 1, max_depth=max_depth)
        elif isinstance(value, list):
            print(f"{indent}{key}: [{len(value)} items]")
            if value and current_depth < max_depth - 1:
                for i, item in enumerate(value[:3]):  # Mostra solo primi 3 elementi
                    print(f"{indent}  [{i}]: {type(item).__name__} = {str(item)[:100]}")
                if len(value) > 3:
                    print(f"{indent}  ... e altri {len(value) - 3} elementi")
        else:
            value_str = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
            print(f"{indent}{key}: {type(value).__name__} = {value_str}")
    
    if current_depth == 0:
        print("=" * (len(title) + 8))

# --- Esportazione pubblica delle funzioni principali ---
__all__ = [
    # Conversioni numeriche
    'to_decimal', 'quantize', 'DECIMAL_PRECISION', 'AMOUNT_TOLERANCE',
    
    # Hashing
    'calculate_invoice_hash', 'calculate_transaction_hash',
    
    # Anagrafiche e prodotti
    '_is_own_company', 'normalize_product_name', 'extract_invoice_number',
    
    # Formattazione
    'format_currency', 'format_percentage', 'format_date', 'format_number',
    
    # Validazione
    'validate_vat_number', 'validate_tax_code', 'validate_email', 'validate_phone',
    
    # Analisi dati
    'calculate_stats', 'group_by_period',
    
    # File e percorsi
    'get_project_root', 'get_config_path', 'CONFIG_FILE_PATH',
    'ensure_directory_exists', 'get_safe_filename', 'get_file_size_human',
    
    # Stato UI
    'save_table_state', 'restore_table_state', 
    'save_table_state_persistent', 'restore_table_state_persistent',
    
    # Cache management
    'clear_all_caches', 'get_cache_info',
    
    # Logging e debug
    'setup_logger', 'debug_print_dict'
]
