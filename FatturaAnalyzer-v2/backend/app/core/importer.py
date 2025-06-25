# core/importer.py

import os
import zipfile
import logging
import tempfile
import shutil
import sqlite3
import configparser
# ### MODIFICA: Aggiunti import mancanti ###
from decimal import Decimal, InvalidOperation
import pandas as pd
from datetime import datetime
import re # Importa re per _is_own_company se serve
# ### FINE MODIFICA ###

# Import funzioni dagli altri moduli core
# ### MODIFICA: Assicurato import robusto ###
try:
    from .parser_xml import parse_fattura_xml
    from .parser_p7m import extract_xml_from_p7m, _cleanup_temp_file
    from .parser_csv import parse_bank_csv
    from .database import (get_connection, add_anagraphics_if_not_exists,
                     check_entity_duplicate, add_transactions, create_tables)
    from .utils import to_decimal, quantize
except ImportError:
    logging.warning("Import relativo fallito in importer.py, tento import assoluto.")
    try:
        from parser_xml import parse_fattura_xml
        from parser_p7m import extract_xml_from_p7m, _cleanup_temp_file
        from parser_csv import parse_bank_csv
        from database import (get_connection, add_anagraphics_if_not_exists,
                              check_entity_duplicate, add_transactions)
        from utils import to_decimal, quantize
    except ImportError as e:
        logging.critical(f"Impossibile importare dipendenze in importer.py: {e}")
        raise ImportError(f"Impossibile importare dipendenze in importer.py: {e}") from e
# ### FINE MODIFICA ###


logger = logging.getLogger(__name__)

def _is_metadata_file(filename):
    """Verifica se un filename è un file di metadati comune (es. macOS)."""
    base = os.path.basename(filename)
    return base.startswith('._') or base == '.DS_Store'


# --- Funzione add_invoice_data (MODIFICATA per quantize e robustezza) ---
def add_invoice_data(cursor, invoice_data, counterparty_anagraphics_id, p7m_source=None):
    """Aggiunge dati fattura, righe e IVA al DB. Applica quantize prima di salvare."""
    general_data = invoice_data.get('body', {}).get('general_data', {})
    invoice_type = invoice_data.get('type')
    invoice_hash = invoice_data.get('unique_hash')
    doc_number = general_data.get('doc_number', 'N/A') # Usato per logging

    if not invoice_hash:
        logger.error(f"Hash mancante per fattura {doc_number}. Impossibile inserire."); return None, False
    if check_entity_duplicate(cursor, 'Invoices', 'unique_hash', invoice_hash):
        logger.warning(f"Fattura duplicata (hash): {doc_number}"); return None, True # Ritorna True per duplicato

    doc_date_str = general_data.get('doc_date');
    total_amount_dec = general_data.get('total_amount') # Dovrebbe essere Decimal

    try:
        # Validazione dati essenziali
        if not doc_number or doc_number == 'N/A' or not doc_date_str or total_amount_dec is None or not isinstance(total_amount_dec, Decimal) or not total_amount_dec.is_finite():
            raise ValueError(f"Dati generali fattura invalidi/mancanti: Num='{doc_number}', Data='{doc_date_str}', Tot={total_amount_dec}")

        doc_date = pd.to_datetime(doc_date_str, errors='coerce').strftime('%Y-%m-%d') if doc_date_str else None
        due_date_str = general_data.get('due_date')
        due_date = pd.to_datetime(due_date_str, errors='coerce').strftime('%Y-%m-%d') if due_date_str else None
        if not doc_date: raise ValueError(f"Formato Data Doc non valido: {doc_date_str}")

        # Quantizza total_amount prima di convertire a float
        total_amount_float = float(quantize(total_amount_dec))

        inv_sql = """INSERT INTO Invoices (anagraphics_id, type, doc_type, doc_number, doc_date, total_amount, due_date, payment_method, xml_filename, p7m_source_file, unique_hash, updated_at, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0)"""
        inv_params = (counterparty_anagraphics_id, invoice_type, general_data.get('doc_type'), doc_number, doc_date, total_amount_float, due_date, general_data.get('payment_method'), os.path.basename(invoice_data.get('source_file', '')), os.path.basename(p7m_source) if p7m_source else None, invoice_hash, datetime.now())
        cursor.execute(inv_sql, inv_params); invoice_id = cursor.lastrowid
        logging.debug(f"Invoice ID {invoice_id} ('{doc_number}') inserito.")

        # Righe: Prendi i Decimal da invoice_data, applica quantize, converti a float
        lines_data = []
        for i, line in enumerate(invoice_data.get('body', {}).get('lines', [])):
            try:
                qty_dec = line.get('quantity')
                unit_p_dec = line.get('unit_price')
                tot_p_dec = line.get('total_price', Decimal('0.0')) # Usa default se manca
                vat_r_dec = line.get('vat_rate', Decimal('0.0'))   # Usa default se manca

                # Conversione sicura a float, gestendo None e applicando quantize
                qty_float = float(quantize(qty_dec)) if qty_dec is not None and isinstance(qty_dec, Decimal) and qty_dec.is_finite() else None
                unit_p_float = float(quantize(unit_p_dec)) if unit_p_dec is not None and isinstance(unit_p_dec, Decimal) and unit_p_dec.is_finite() else None
                tot_p_float = float(quantize(tot_p_dec))
                vat_r_float = float(quantize(vat_r_dec))

                lines_data.append((
                    invoice_id, line.get('line_number', i + 1), line.get('description'),
                    qty_float, line.get('unit_measure'), unit_p_float, tot_p_float, vat_r_float,
                    line.get('item_code'), line.get('item_type')
                ))
            except (TypeError, ValueError, InvalidOperation, AttributeError) as line_prep_err:
                logger.error(f"Errore preparazione dati riga {i+1} fattura ID:{invoice_id} ('{doc_number}'): {line_prep_err} - Dati riga: {line}")
            except Exception as line_generic_err:
                logger.error(f"Errore generico prep riga {i+1} fattura ID:{invoice_id} ('{doc_number}'): {line_generic_err}", exc_info=True)

        if lines_data:
            line_sql = "INSERT INTO InvoiceLines (invoice_id, line_number, description, quantity, unit_measure, unit_price, total_price, vat_rate, item_code, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            try:
                cursor.executemany(line_sql, lines_data); logging.debug(f"Inserite {len(lines_data)} righe per fattura ID:{invoice_id}.")
            except sqlite3.Error as line_err:
                logger.error(f"Errore DB insert righe ID:{invoice_id} ('{doc_number}'): {line_err}")

        # Riepilogo IVA
        vat_summary_data = []
        for summary in invoice_data.get('body', {}).get('vat_summary', []):
             try:
                 # Applica quantize PRIMA di convertire a float
                 vat_r_sum = float(quantize(to_decimal(summary.get('vat_rate', '0.0'))))
                 tax_a = float(quantize(to_decimal(summary.get('taxable_amount', '0.0'))))
                 vat_a = float(quantize(to_decimal(summary.get('vat_amount', '0.0'))))
                 vat_summary_data.append((invoice_id, vat_r_sum, tax_a, vat_a))
             except Exception as vat_prep_err:
                 logger.error(f"Errore prep riepilogo IVA {summary.get('vat_rate')}% ID:{invoice_id} ('{doc_number}'): {vat_prep_err}")

        if vat_summary_data:
            vat_sql = "INSERT INTO InvoiceVATSummary (invoice_id, vat_rate, taxable_amount, vat_amount) VALUES (?, ?, ?, ?)"
            try:
                cursor.executemany(vat_sql, vat_summary_data); logging.debug(f"Inseriti {len(vat_summary_data)} riepiloghi IVA per fattura ID:{invoice_id}.")
            except sqlite3.Error as vat_err:
                logger.error(f"Errore DB insert IVA ID:{invoice_id} ('{doc_number}'): {vat_err}")

        return invoice_id, False # Successo, non duplicato

    # ### MODIFICA: Rimossa seconda parte duplicata del blocco try...except ###
    # La logica era duplicata, il primo blocco try...except è sufficiente.

    except ValueError as ve:
        logging.error(f"Errore dati fattura '{doc_number}': {ve}")
        return None, False
    except sqlite3.Error as dbe:
        logging.error(f"Errore DB insert fattura '{doc_number}': {dbe}")
        return None, False
    except Exception as e:
        logging.error(f"Errore generico insert fattura '{doc_number}': {e}", exc_info=True)
        return None, False
# ### FINE MODIFICA ###


# --- Funzione process_file MODIFICATA (passa my_company_data a parser)---
def process_file(filepath, conn, my_company_data):
    """Processa un singolo file (XML, P7M, CSV) e lo importa nel DB."""
    cursor = conn.cursor()
    _, ext = os.path.splitext(filepath); ext = ext.lower()
    status = 'Error - Initializing'; temp_xml_path = None; xml_data = None
    base_name = os.path.basename(filepath)
    file_type_processed = None

    try:
        if ext == '.p7m':
            file_type_processed = 'P7M'
            logger.debug(f"Processing P7M: {base_name}")
            temp_xml_path = extract_xml_from_p7m(filepath)
            if temp_xml_path:
                logger.debug(f"P7M estratto in: {temp_xml_path}")
                # Passa my_company_data al parser XML
                xml_data = parse_fattura_xml(temp_xml_path, my_company_data) # Passa qui
                if not xml_data: status = 'Error - XML Parse Failed (None from parse_fattura_xml)'; logger.error(f"{status} for {base_name}. XML temp: {temp_xml_path}")
                elif xml_data.get('error'): status = f"Error - XML Parse: {xml_data['error']}"; logger.error(f"{status} for {base_name}. XML temp: {temp_xml_path}")
            else: status = 'Error - P7M Extraction Failed'; logger.error(f"{status} for {base_name}")

        elif ext == '.xml':
            file_type_processed = 'XML'
            logger.debug(f"Processing XML: {base_name}")
            # Passa my_company_data al parser XML
            xml_data = parse_fattura_xml(filepath, my_company_data) # Passa qui
            if not xml_data: status = 'Error - XML Parse Failed (None from parse_fattura_xml)'; logger.error(f"{status} for {base_name}")
            elif xml_data.get('error'): status = f"Error - XML Parse: {xml_data['error']}"; logger.error(f"{status} for {base_name}")

        elif ext == '.csv':
            file_type_processed = 'CSV'
            logger.debug(f"Processing CSV: {base_name}")
            transactions_df = parse_bank_csv(filepath)
            if transactions_df is not None:
                if not transactions_df.empty:
                    inserted, db_duplicates, batch_duplicates, errors = add_transactions(cursor, transactions_df)
                    duplicates = db_duplicates + batch_duplicates
                    if errors > 0: status = f'Error - {errors} DB errors/prep errors during CSV insert'; logger.error(f"{status} for {base_name}")
                    elif inserted > 0: status = f'Success ({inserted} new)'; logger.info(f"CSV {base_name}: {status}, Duplicates (DB/File): {db_duplicates}/{batch_duplicates}")
                    elif duplicates > 0: status = f'Duplicate ({duplicates} existing/in file)'; logger.warning(f"CSV {base_name}: {status} (DB: {db_duplicates}, File: {batch_duplicates})")
                    else: status = 'Success - No new data'; logger.info(f"CSV {base_name}: {status}")
                else: status = 'Success - Empty/Filtered CSV'; logger.info(f"CSV {base_name}: {status}")
            else: status = 'Error - CSV Parse Failed'; logger.error(f"{status} for {base_name}")
            return status
        else:
            status = 'Unsupported File Type'; logger.warning(f"File non supportato: {base_name} ({ext})"); return status

        # --- Inserimento DB per XML/P7M (Usa tipo da parser) ---
        if xml_data and not xml_data.get('error'):
             logger.debug(f"Parsing {file_type_processed} OK for {base_name}. Inserting into DB...")
             invoice_type = xml_data.get('type') # TIPO DETERMINATO DA PARSER

             if not invoice_type or invoice_type == 'Unknown':
                 # Errore se il parser non ha potuto determinare il tipo
                 # (probabilmente a causa di dati config.ini mancanti/errati)
                 status = 'Error - Invoice type not determined by parser'
                 logger.error(f"{status} for {base_name}. Verifica P.IVA/CF in config.ini e nel file XML.")
             elif invoice_type == 'Autofattura':
                 status = 'Skipped - Autofattura (Not Implemented)'
                 logger.warning(f"File {base_name} è un'autofattura. Import non gestito.")
             else:
                 # Identifica controparte basandosi sul tipo determinato
                 ced_data = xml_data.get('anagraphics', {}).get('cedente', {})
                 ces_data = xml_data.get('anagraphics', {}).get('cessionario', {})
                 counterparty_id = None
                 counterparty_data = None
                 anag_type_for_counterparty = None

                 if invoice_type == 'Attiva':
                     counterparty_data = ces_data; anag_type_for_counterparty = 'Cliente'
                 elif invoice_type == 'Passiva':
                     counterparty_data = ced_data; anag_type_for_counterparty = 'Fornitore'

                 if counterparty_data and anag_type_for_counterparty:
                     # Inserisci/Trova ID controparte
                     counterparty_id = add_anagraphics_if_not_exists(cursor, counterparty_data, anag_type_for_counterparty)
                     if not counterparty_id:
                         status = f'Error - Counterparty ({anag_type_for_counterparty}) Insert/Find Failed'
                         logger.error(f"{status} for {base_name}")
                 else:
                     # Non dovrebbe accadere se type è Attiva/Passiva
                     status = 'Error - Could not determine Counterparty Data/Type (XML structure issue?)'
                     logger.error(f"{status} for {base_name}")

                 # Procedi con inserimento fattura solo se abbiamo ID controparte e nessun errore
                 if counterparty_id and status == 'Error - Initializing':
                     logger.debug(f"Controparte ID: {counterparty_id}. Inserisco fattura {base_name}...")
                     p7m_original_source = filepath if file_type_processed == 'P7M' else None
                     invoice_id, is_duplicate = add_invoice_data(cursor, xml_data, counterparty_id, p7m_source=p7m_original_source)
                     if is_duplicate: status = 'Duplicate'
                     elif invoice_id is not None: status = 'Success'
                     else: status = 'Error - Invoice Insert Failed'
                 elif status == 'Error - Initializing':
                      status = 'Error - Counterparty ID Missing/Error'
                      logger.error(f"{status} for {base_name}. Impossibile inserire fattura.")

        # Gestione errori parsing/estrazione iniziali
        elif status == 'Error - Initializing':
             if xml_data and xml_data.get('error'): status = f"Error - XML Parse: {xml_data.get('error', 'Unknown XML Parse Error')}"
             elif file_type_processed == 'P7M' and not temp_xml_path: status = 'Error - P7M Extraction Failed'
             elif file_type_processed in ['XML', 'P7M'] and not xml_data: status = 'Error - XML Parse Failed (None returned)'
             else: status = 'Error - Unknown Processing Failure'; logger.error(f"{status} for {base_name}")

    except sqlite3.Error as db_err: status = f'Critical DB Error: {db_err}'; logger.error(f"Errore DB non catturato per {base_name}: {db_err}", exc_info=True)
    except ValueError as ve: status = f"Error - Validation: {ve}"; logger.error(f"Errore validazione dati per {base_name}: {ve}", exc_info=True)
    except Exception as e: status = f'Critical Error: {e}'; logger.error(f"Errore critico process_file per {base_name}: {e}", exc_info=True)
    finally:
         if temp_xml_path: _cleanup_temp_file(temp_xml_path)
    return status


# --- Funzione import_from_source (MODIFICATA per leggere config e passare my_company_data) ---
def import_from_source(source_path, progress_callback=None):
    """
    Importa dati da un file singolo (XML, P7M, CSV) o da un file ZIP/directory.
    Ritorna un dizionario con i risultati dell'importazione.
    """
    results = {'processed': 0, 'success': 0, 'duplicates': 0, 'errors': 0, 'unsupported': 0, 'files': []}
    conn = None; temp_dir = None; files_to_process = []; processed_paths = set(); skipped_meta_files_count = 0; files_passed_to_process_file = 0

    # Lettura dati azienda dal config
    my_company_data = {'piva': None, 'cf': None}
    missing_config = False
    try:
        config = configparser.ConfigParser()
        # Percorso relativo alla directory del progetto (assumendo che importer.py sia in core/)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(project_root, 'config.ini')
        if os.path.exists(config_path):
            config.read(config_path)
            my_company_data['piva'] = config.get('Azienda', 'PartitaIVA', fallback=None)
            my_company_data['cf'] = config.get('Azienda', 'CodiceFiscale', fallback=None)
            logger.info(f"Dati azienda letti da config: PIVA={my_company_data['piva']}, CF={my_company_data['cf']}")
            # Verifica essenziale per fatture
            if not my_company_data['piva'] and not my_company_data['cf']:
                logger.error("ERRORE CRITICO: Né PartitaIVA né CodiceFiscale specificati in config.ini [Azienda]. Impossibile determinare tipo fattura (Attiva/Passiva). L'importazione di XML/P7M fallirà.")
                missing_config = True # Segnala come se mancasse il config per bloccare
        else:
            logger.error(f"ERRORE CRITICO: Config file '{config_path}' non trovato. Impossibile validare anagrafica aziendale e determinare tipo fattura.")
            missing_config = True # Segnala config mancante

    except Exception as e:
        logger.error(f"Errore lettura config per dati azienda: {e}")
        missing_config = True # Segnala errore lettura config

    # Blocca import se manca config o dati essenziali
    if missing_config:
         results['errors'] = 1; results['files'].append({'name': source_path, 'status': 'Error - Config.ini mancante, illeggibile o senza P.IVA/CF azienda'}); return results

    try:
        # Identifica e raccogli file da processare
        if os.path.isfile(source_path):
            if zipfile.is_zipfile(source_path):
                logger.info(f"Input ZIP: {source_path}. Estraggo..."); temp_dir = tempfile.mkdtemp(prefix="fattura_import_")
                try:
                    with zipfile.ZipFile(source_path, 'r') as zip_ref: zip_ref.extractall(temp_dir)
                    logger.info(f"ZIP estratto in: {temp_dir}. Raccolgo file...");
                    for root, _, files in os.walk(temp_dir):
                        for filename in files:
                            full_path = os.path.join(root, filename)
                            if not _is_metadata_file(filename) and full_path not in processed_paths: files_to_process.append(full_path); processed_paths.add(full_path)
                            elif _is_metadata_file(filename): skipped_meta_files_count += 1
                except zipfile.BadZipFile: raise ValueError("File ZIP non valido o corrotto.")
                except Exception as zip_err: raise IOError(f"Errore estrazione ZIP: {zip_err}") from zip_err
            else:
                if not _is_metadata_file(source_path): files_to_process = [source_path]
                else: skipped_meta_files_count += 1
        elif os.path.isdir(source_path):
            logger.info(f"Input directory: {source_path}. Raccolgo file...");
            for root, _, files in os.walk(source_path):
                 for filename in files:
                     full_path = os.path.join(root, filename)
                     if not _is_metadata_file(filename) and full_path not in processed_paths: files_to_process.append(full_path); processed_paths.add(full_path)
                     elif _is_metadata_file(filename): skipped_meta_files_count += 1
        else: raise FileNotFoundError(f"Percorso non valido: {source_path}")

        files_to_process.sort(); total_files_to_process = len(files_to_process)
        results['unsupported'] = skipped_meta_files_count
        if total_files_to_process == 0:
            logger.warning(f"Nessun file valido trovato in '{source_path}' (esclusi {skipped_meta_files_count} file metadati).")
            results['processed'] = skipped_meta_files_count
            return results

        # Processamento file
        # Processamento file
        logger.info(f"Inizio processamento di {total_files_to_process} file...")
        
        # === VERIFICA DATABASE PRIMA DI INIZIARE ===
        try:
            logger.info("Verifica inizializzazione database...")
            create_tables()
            logger.info("Database e tabelle verificate/create con successo")
        except Exception as db_init_err:
            logger.error(f"ERRORE CRITICO: Impossibile inizializzare database: {db_init_err}")
            results['errors'] = 1
            results['files'].append({'name': source_path, 'status': f'Error - Database init failed: {db_init_err}'})
            return results
        # === FINE VERIFICA DATABASE ===
        
        conn = get_connection(); conn.execute('BEGIN TRANSACTION')

        for i, fpath in enumerate(files_to_process):
             files_passed_to_process_file += 1; base_name = os.path.basename(fpath)
             rel_path_for_log = os.path.relpath(fpath, start=temp_dir if temp_dir else source_path)
             logger.info(f"Processo file {files_passed_to_process_file}/{total_files_to_process}: '{rel_path_for_log}'")
             if progress_callback:
                 try: progress_callback(files_passed_to_process_file, total_files_to_process)
                 except InterruptedError: raise # Propaga interruzione
                 except Exception as cb_err: logger.warning(f"Errore callback progresso: {cb_err}")

             # Passa dati azienda a process_file
             file_status = process_file(fpath, conn, my_company_data)
             results['files'].append({'name': base_name, 'status': file_status})

             # Aggiorna contatori
             if file_status.startswith('Success'): results['success'] += 1
             elif file_status == 'Duplicate': results['duplicates'] += 1 # Solo duplicati fattura
             elif file_status.startswith('Error'): results['errors'] += 1
             elif file_status == 'Unsupported File Type' or file_status.startswith('Skipped'): results['unsupported'] += 1
             else: logger.warning(f"Stato file '{file_status}' non riconosciuto per {base_name}. Contato come errore."); results['errors'] += 1

        conn.commit(); logger.info(f"Transazione DB completata con successo.")

    except (ValueError, IOError, FileNotFoundError, InterruptedError) as user_err:
        logger.error(f"Errore input/file o annullamento durante importazione: {user_err}")
        if conn:
            try:
                conn.rollback()
            # ### CORREZIONE: Indentazione except ### START
            except Exception as rb_err:
                logger.error(f"Errore durante il rollback (user_err): {rb_err}")
            # ### CORREZIONE: Indentazione except ### END
        # Calcola errori residui
        # Assicurati che results['errors'] non diventi negativo
        processed_count = results['success'] + results['duplicates'] + results['unsupported']
        results['errors'] = max(0, files_passed_to_process_file - processed_count) + 1 # Aggiungi 1 per l'errore corrente
        if isinstance(user_err, InterruptedError): results['files'].append({'name':source_path, 'status': 'Error - Import Annullato'})
        else: results['files'].append({'name':source_path, 'status': f'Error: {user_err}'})
        # Nota: non è necessario aggiornare results['processed'] qui, lo facciamo alla fine

    except sqlite3.Error as db_err:
        logger.error(f"Errore DB CRITICO durante importazione, rollback in corso: {db_err}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            # ### CORREZIONE: Indentazione except ### START
            except Exception as rb_err:
                logger.error(f"Errore durante il rollback (db_err): {rb_err}")
            # ### CORREZIONE: Indentazione except ### END
        processed_count = results['success'] + results['duplicates'] + results['unsupported']
        results['errors'] = max(0, files_passed_to_process_file - processed_count) + 1
        results['files'].append({'name':'DATABASE ERROR', 'status': f'Critical DB Error: {db_err}'})

    except Exception as e:
        logger.error(f"Errore CRITICO imprevisto durante importazione: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            # ### CORREZIONE: Indentazione except ### START
            except Exception as rb_err:
                logger.error(f"Errore durante il rollback (generic_err): {rb_err}")
            # ### CORREZIONE: Indentazione except ### END
        processed_count = results['success'] + results['duplicates'] + results['unsupported']
        results['errors'] = max(0, files_passed_to_process_file - processed_count) + 1
        results['files'].append({'name':'CRITICAL PYTHON ERROR', 'status': f'Critical Error: {e}'})
    finally:
        if conn:
            try:
                conn.close()
                logger.debug("Connessione DB chiusa.")
            except Exception as close_err:
                logger.error(f"Errore chiusura connessione DB: {close_err}")
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Directory temporanea {temp_dir} rimossa.")
            except Exception as e_clean:
                logger.warning(f"Impossibile rimuovere directory temporanea {temp_dir}: {e_clean}")

    # Ricalcola 'processed' alla fine
    # 'duplicates' include solo duplicati fattura hash
    results['processed'] = results['success'] + results['duplicates'] + results['errors'] + results['unsupported']
    logger.debug(f"Conteggio finale ricalcolato: Processed={results['processed']}")
    logger.info(f"Importazione completata. Risultati: Success={results['success']}, Dup.Fatt={results['duplicates']}, Errors={results['errors']}, Unsupp/Skip={results['unsupported']} / Total Processed={results['processed']}")
    return results
