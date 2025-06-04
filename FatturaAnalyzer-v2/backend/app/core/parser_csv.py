import pandas as pd
import io
import logging
import chardet
import re
from .utils import calculate_transaction_hash, to_decimal, quantize # Assicurati che utils sia importato

logger = logging.getLogger(__name__)

EXPECTED_COLUMNS = {
    'DataContabile': ['DATA', 'Data operazione', 'Date', 'Transaction Date'],
    'DataValuta': ['VALUTA', 'Data valuta', 'Value Date'],
    'ImportoDare': ['DARE', 'Addebiti', 'Debit', 'Uscite'],
    'ImportoAvere': ['AVERE', 'Accrediti', 'Credit', 'Entrate'],
    'Descrizione': ['DESCRIZIONE OPERAZIONE', 'Descrizione', 'Description', 'Dettagli'],
    'CausaleABI': ['CAUSALE ABI', 'Causale', 'Codice Causale', 'ABI Code']
}

# --- detect_encoding e find_column_names (INVARIATI rispetto all'ultima versione) ---
def detect_encoding(file_path_or_obj):
    # ... (codice invariato) ...
    if isinstance(file_path_or_obj, str):
        try:
            with open(file_path_or_obj, 'rb') as f:
                raw_data = f.read(10000)
        except IOError as e:
            logger.error(f"Impossibile leggere il file per rilevare l'encoding: {e}")
            return None
    elif hasattr(file_path_or_obj, 'read') and hasattr(file_path_or_obj, 'seek'):
        original_pos = file_path_or_obj.tell()
        file_path_or_obj.seek(0)
        raw_data = file_path_or_obj.read(10000)
        file_path_or_obj.seek(original_pos)
    else:
        logger.error("Input non valido per detect_encoding (né path né stream leggibile).")
        return None
    if not raw_data:
        logger.warning("Dati vuoti per rilevamento encoding.")
        return 'utf-8'
    try:
        result = chardet.detect(raw_data)
        encoding = result['encoding']
        confidence = result['confidence']
        logger.info(f"Rilevato encoding: {encoding} con confidenza: {confidence:.2f}")
        if confidence < 0.7:
             logger.warning(f"Confidenza encoding bassa ({confidence:.2f}). Potrebbe essere impreciso.")
        return encoding if encoding else 'utf-8'
    except Exception as e:
        logger.error(f"Errore durante rilevamento encoding con chardet: {e}")
        return 'utf-8'

def find_column_names(df_columns):
    # ... (codice invariato) ...
    column_mapping = {}
    found_columns = {}
    df_cols_lower = {col.lower().strip(): col for col in df_columns}
    for standard_name, possible_aliases in EXPECTED_COLUMNS.items():
        found = False
        for alias in possible_aliases:
            alias_lower = alias.lower().strip()
            if alias_lower in df_cols_lower:
                original_col_name = df_cols_lower[alias_lower]
                if original_col_name not in found_columns.values():
                    column_mapping[standard_name] = original_col_name
                    found_columns[standard_name] = original_col_name
                    logger.debug(f"Mappato '{standard_name}' -> '{original_col_name}'")
                    found = True
                    break
        if not found and standard_name not in ['CausaleABI', 'DataValuta']:
            logger.warning(f"Colonna standard '{standard_name}' non trovata nel CSV (alias provati: {possible_aliases}).")
    required = ['DataContabile', 'ImportoDare', 'ImportoAvere', 'Descrizione']
    missing = [req for req in required if req not in column_mapping]
    if missing:
         logger.error(f"Colonne CSV essenziali mancanti dopo mappatura: {missing}")
         return None
    return column_mapping

# ### FUNZIONE parse_bank_csv (INVARIATO rispetto all'ultima versione - low_memory era già stato rimosso) ###
def parse_bank_csv(csv_filepath_or_stringio):
    # ... (Tutto il codice di questa funzione rimane come nella risposta precedente,
    #      assicurandosi che 'low_memory=False' sia stato rimosso dalla chiamata a pd.read_csv)
    df = None
    used_encoding = None
    file_obj = None
    source_name = csv_filepath_or_stringio if isinstance(csv_filepath_or_stringio, str) else "StringIO"

    try:
        detected_encoding = detect_encoding(csv_filepath_or_stringio)
        encodings_to_try = [detected_encoding] if detected_encoding else []
        encodings_to_try.extend(['utf-8', 'latin-1', 'cp1252'])
        encodings_to_try = [enc.lower() for enc in list(dict.fromkeys(encodings_to_try)) if enc]

        logger.info(f"Tentativo lettura CSV '{source_name}' con encodings: {encodings_to_try}")
        common_delimiters = [';', ',', '\t']

        for enc in encodings_to_try:
            for delim in common_delimiters:
                try:
                    logger.debug(f"Provo a leggere CSV con encoding='{enc}', delimiter='{delim}'")
                    if isinstance(csv_filepath_or_stringio, str):
                        file_obj = open(csv_filepath_or_stringio, 'r', encoding=enc, errors='replace')
                    elif hasattr(csv_filepath_or_stringio, 'seek'):
                        csv_filepath_or_stringio.seek(0)
                        file_obj = csv_filepath_or_stringio
                    else:
                        raise TypeError("Input deve essere un percorso file (str) o uno stream leggibile.")

                    df = pd.read_csv(
                        file_obj,
                        delimiter=delim,
                        decimal=',',
                        thousands='.',
                        parse_dates=False,
                        skipinitialspace=True,
                        on_bad_lines='warn',
                        encoding=enc,
                        # low_memory=False,  # Assicurati sia Rimosso/Commentato
                        engine='python',
                        skip_blank_lines=True
                    )
                    used_encoding = enc
                    logger.info(f"CSV '{source_name}' letto con successo usando encoding='{enc}' e delimiter='{delim}'.")

                    if df.shape[1] < 3:
                         logger.warning(f"CSV letto con {enc}/{delim} ha solo {df.shape[1]} colonne. Provo prossima combinazione.")
                         df = None; continue
                    break
                except (UnicodeDecodeError, pd.errors.ParserError) as e:
                    logger.warning(f"Errore lettura/parsing ({enc}/{delim}): {e}")
                    df = None
                except Exception as read_e:
                    logger.error(f"Errore imprevisto lettura CSV '{source_name}' ({enc}/{delim}): {read_e}", exc_info=True)
                    df = None
                    if isinstance(read_e, FileNotFoundError): raise read_e
                finally:
                    if isinstance(csv_filepath_or_stringio, str) and 'file_obj' in locals() and file_obj and not file_obj.closed:
                        try: file_obj.close()
                        except Exception: pass
            if df is not None: break

        if df is None:
            logger.error(f"Impossibile leggere o parsare CSV '{source_name}'."); return None

        initial_rows = len(df)
        logger.info(f"CSV letto ({initial_rows} righe). Mappatura e pulizia...")

        column_mapping = find_column_names(df.columns)
        if column_mapping is None: logger.error(f"Mappatura fallita per '{source_name}'."); return None

        df.rename(columns={v: k for k, v in column_mapping.items()}, inplace=True)
        standard_cols_present = list(column_mapping.keys())
        df = df[standard_cols_present].copy()

        if 'DataContabile' in df.columns:
             df['DataContabileParsed'] = pd.to_datetime(df['DataContabile'], dayfirst=True, errors='coerce')
             original_rows_date = len(df)
             df = df[df['DataContabileParsed'].notna()].copy()
             rows_after_date_filter = len(df)
             if original_rows_date > rows_after_date_filter: logger.warning(f"Rimosse {original_rows_date - rows_after_date_filter} righe con DataContabile non valida.")
             df = df[~df['DataContabile'].astype(str).str.lower().str.fullmatch(r'(?:data|date)')] # Usa fullmatch per evitare match parziali
             df['DataContabile'] = df['DataContabileParsed']
             df.drop(columns=['DataContabileParsed'], inplace=True)
        else: logger.error("Colonna 'DataContabile' mancante."); return None

        filter_keywords = ['Saldo iniziale', 'Saldo contabile', 'Saldo liquido', 'Disponibilità al',
                           'Giroconto', 'Canone mensile', 'Imposta di bollo', 'Competenze']
        if 'Descrizione' in df.columns:
            desc_col = 'Descrizione'
            df[desc_col] = df[desc_col].astype(str).str.strip()
            # Filtra per keyword O righe con solo 'EUR' O vuote
            extended_filter_pattern = f"({'|'.join(filter_keywords)})|^\\s*EUR\\s*$|^\\s*$"
            original_rows = len(df)
            df = df[~df[desc_col].str.contains(extended_filter_pattern, na=False, case=False, regex=True)].copy()
            rows_after_filter = len(df)
            if original_rows > rows_after_filter: logger.info(f"Filtrate {original_rows - rows_after_filter} righe non operative.")
        else: logger.warning("Colonna 'Descrizione' non trovata. Impossibile filtrare.")

        if 'ImportoDare' not in df.columns: df['ImportoDare'] = 0.0
        if 'ImportoAvere' not in df.columns: df['ImportoAvere'] = 0.0
        df['ImportoDareDec'] = df['ImportoDare'].apply(lambda x: to_decimal(x, default='0.0'))
        df['ImportoAvereDec'] = df['ImportoAvere'].apply(lambda x: to_decimal(x, default='0.0'))
        df['amount_dec'] = (df['ImportoAvereDec'] - df['ImportoDareDec']).apply(quantize)
        df['Importo'] = df['amount_dec'].astype(float) # Converti in float per DB (o TEXT?)

        if 'DataValuta' in df.columns: df['DataValuta'] = pd.to_datetime(df['DataValuta'], dayfirst=True, errors='coerce')
        else: df['DataValuta'] = pd.NaT
        if 'CausaleABI' in df.columns: df['CausaleABI'] = pd.to_numeric(df['CausaleABI'].astype(str).str.strip(), errors='coerce').astype('Int64')
        else: df['CausaleABI'] = pd.NA
        if 'Descrizione' not in df.columns: df['Descrizione'] = ''

        # Rimuovi eventuali righe dove l'importo non è valido (risulta NaN dopo to_decimal)
        rows_before_nan_drop = len(df)
        df.dropna(subset=['amount_dec'], inplace=True)
        if len(df) < rows_before_nan_drop:
             logger.warning(f"Rimosse {rows_before_nan_drop - len(df)} righe con importo non valido (NaN).")


        df['unique_hash'] = df.apply(lambda row: calculate_transaction_hash(
            row['DataContabile'], row['amount_dec'], row['Descrizione']
        ), axis=1)

        final_columns = ['DataContabile', 'DataValuta', 'Importo', 'Descrizione', 'CausaleABI', 'unique_hash']
        cols_to_select = [col for col in final_columns if col in df.columns]
        df_final = df[cols_to_select].copy()

        final_rows = len(df_final)
        logger.info(f"Parsing CSV '{source_name}' completato: {initial_rows} righe -> {final_rows} movimenti.")
        if initial_rows > 0 and final_rows == 0: logger.warning(f"Nessuna riga valida trovata dopo pulizia CSV '{source_name}'.")
        elif initial_rows > 0 and final_rows < initial_rows * 0.7: logger.warning(f"Oltre 30% righe scartate ({initial_rows - final_rows}) pulizia CSV '{source_name}'.")

        return df_final

    except FileNotFoundError: logger.error(f"File CSV non trovato: {csv_filepath_or_stringio}"); return None
    except pd.errors.EmptyDataError: logger.warning(f"CSV '{source_name}' vuoto."); return pd.DataFrame()
    except KeyError as ke: logger.error(f"Colonna essenziale '{ke}' mancante in CSV '{source_name}'.", exc_info=True); return None
    except Exception as e: logger.error(f"Errore generico parsing CSV '{source_name}': {e}", exc_info=True); return None
    finally:
        if isinstance(csv_filepath_or_stringio, str) and 'file_obj' in locals() and file_obj and hasattr(file_obj, 'closed') and not file_obj.closed:
            try: file_obj.close()
            except Exception: pass