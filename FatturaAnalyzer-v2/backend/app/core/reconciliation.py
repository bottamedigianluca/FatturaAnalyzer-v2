# core/reconciliation.py - Versione completa ottimizzata per uso professionale

import logging
import sqlite3
from itertools import combinations
import time
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta
import re
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Set, Tuple, Optional, Any
import concurrent.futures
from dataclasses import dataclass
from collections import defaultdict
import numpy as np

try:
    from .database import (get_connection, get_item_details,
                          update_invoice_reconciliation_state,
                          update_transaction_reconciliation_state,
                          add_or_update_reconciliation_link,
                          remove_reconciliation_links)
    from .utils import to_decimal, quantize, extract_invoice_number, AMOUNT_TOLERANCE
    from .smart_client_reconciliation import (suggest_client_based_reconciliation,
                                            enhance_cumulative_matches_with_client_patterns)
except ImportError:
    logging.warning("Import relativo '.database'/'.utils' fallito in reconciliation.py, tento import assoluto.")
    try:
        from database import (get_connection, get_item_details,
                              update_invoice_reconciliation_state,
                              update_transaction_reconciliation_state,
                              add_or_update_reconciliation_link,
                              remove_reconciliation_links)
        from utils import to_decimal, quantize, extract_invoice_number, AMOUNT_TOLERANCE
        try:
            from smart_client_reconciliation import (suggest_client_based_reconciliation,
                                                   enhance_cumulative_matches_with_client_patterns)
        except ImportError:
            logging.warning("Smart client reconciliation non disponibile")
            suggest_client_based_reconciliation = None
            enhance_cumulative_matches_with_client_patterns = None
    except ImportError as e:
        logging.critical(f"Impossibile importare dipendenze (database/utils) in reconciliation.py: {e}")
        raise ImportError(f"Impossibile importare dipendenze (database/utils) in reconciliation.py: {e}") from e

logger = logging.getLogger(__name__)

# Cache per anagrafiche per evitare query ripetute
_anagraphics_cache = {}
_cache_timestamp = None
CACHE_EXPIRY_MINUTES = 15

@dataclass
class InvoiceSequence:
    """Rappresenta una sequenza di fatture consecutive"""
    invoice_ids: List[int]
    start_number: int
    end_number: int
    total_amount: Decimal
    date_range_days: int
    avg_amount: Decimal
    sequence_score: float
    
    def __post_init__(self):
        if len(self.invoice_ids) > 1:
            self.avg_amount = self.total_amount / len(self.invoice_ids)
        else:
            self.avg_amount = self.total_amount

@dataclass
class ReconciliationCandidate:
    """Candidato per riconciliazione N:M migliorato"""
    invoice_ids: List[int]
    total_amount: Decimal
    confidence_score: float
    sequence_score: float
    date_coherence_score: float
    amount_coherence_score: float
    doc_numbers: List[str]
    date_range_days: int
    explanation: str

def _refresh_anagraphics_cache():
    """Aggiorna la cache delle anagrafiche"""
    global _anagraphics_cache, _cache_timestamp
    
    current_time = datetime.now()
    if (_cache_timestamp is None or 
        (current_time - _cache_timestamp).total_seconds() > CACHE_EXPIRY_MINUTES * 60):
        
        logger.debug("Aggiornamento cache anagrafiche...")
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, denomination, piva, cf 
                FROM Anagraphics 
                WHERE LENGTH(TRIM(COALESCE(denomination, ''))) >= 3
            """)
            
            new_cache = {}
            for row in cursor.fetchall():
                anag_id = row['id']
                denomination = (row['denomination'] or '').strip()
                piva = (row['piva'] or '').strip().upper()
                cf = (row['cf'] or '').strip().upper()
                
                # Preprocessa i termini per il matching
                denom_words = set(re.findall(r'\b\w{3,}\b', denomination.lower()))
                # Rimuovi stop words comuni
                stop_words = {'spa', 'srl', 'snc', 'sas', 'coop', 'societa', 'group', 'holding', 'soc'}
                denom_words = denom_words - stop_words
                
                new_cache[anag_id] = {
                    'denomination': denomination,
                    'piva': piva,
                    'cf': cf,
                    'search_words': denom_words,
                    'full_text': denomination.lower()
                }
            
            _anagraphics_cache = new_cache
            _cache_timestamp = current_time
            logger.debug(f"Cache anagrafiche aggiornata: {len(_anagraphics_cache)} record")
            
        except Exception as e:
            logger.error(f"Errore aggiornamento cache anagrafiche: {e}")
        finally:
            if conn:
                conn.close()

def find_anagraphics_id_from_description(description: str) -> Optional[int]:
    """Versione ottimizzata della ricerca anagrafica con cache"""
    if not description:
        return None
    
    _refresh_anagraphics_cache()
    
    log_prefix = "find_anag_id (cached)"
    logger.debug(f"{log_prefix}: Descrizione='{description[:100]}...'")
    
    # Estrai codici PIVA/CF dalla descrizione
    piva_cf_pattern = r'\b(\d{11})\b|\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b'
    potential_codes = re.findall(piva_cf_pattern, description, re.IGNORECASE)
    
    # Cerca match esatti per PIVA/CF
    if potential_codes:
        codes_found = set(code.upper() for piva, cf in potential_codes if (code := piva or cf))
        for anag_id, anag_data in _anagraphics_cache.items():
            if anag_data['piva'] in codes_found or anag_data['cf'] in codes_found:
                logger.info(f"{log_prefix}: Match PIVA/CF -> ID:{anag_id}")
                return anag_id
    
    # Fallback al matching per nome
    desc_lower = description.lower()
    desc_words = set(re.findall(r'\b\w{3,}\b', desc_lower))
    
    best_score = 0.0
    best_match_id = None
    
    for anag_id, anag_data in _anagraphics_cache.items():
        # Match nome completo
        if anag_data['full_text'] in desc_lower:
            score = 0.8 + (len(anag_data['full_text']) / len(desc_lower)) * 0.2
            if score > best_score:
                best_score = score
                best_match_id = anag_id
                continue
        
        # Match per parole
        common_words = desc_words.intersection(anag_data['search_words'])
        if common_words:
            jaccard = len(common_words) / len(desc_words.union(anag_data['search_words']))
            word_coverage = len(common_words) / len(anag_data['search_words']) if anag_data['search_words'] else 0
            score = (jaccard * 0.4) + (word_coverage * 0.6)
            
            if score > best_score:
                best_score = score
                best_match_id = anag_id
    
    if best_match_id and best_score >= 0.3:
        logger.info(f"{log_prefix}: Match nome -> ID:{best_match_id}, Score: {best_score:.3f}")
        return best_match_id
    
    return None

def suggest_cumulative_matches(transaction_id, anagraphics_id_filter=None,
                               max_combination_size=5, max_search_time_ms=30000,
                               exclude_invoice_ids=None, start_date=None, end_date=None):
    """
    Versione ottimizzata N:M con supporto per algoritmi intelligenti basati su cliente
    """
    if exclude_invoice_ids is None:
        exclude_invoice_ids = set()
    
    # Se non c'è filtro anagrafica, non possiamo fare riconciliazione intelligente
    if anagraphics_id_filter is None:
        logger.info(f"Sugg.N:M T:{transaction_id}: Saltato (nessun filtro anagrafica)")
        return []
    
    conn = None
    start_time = time.monotonic()
    log_prefix = f"Sugg.N:M Enhanced T:{transaction_id}"
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Prima prova con l'algoritmo intelligente basato su cliente (se disponibile)
        if suggest_client_based_reconciliation is not None:
            logger.info(f"{log_prefix}: Tentativo riconciliazione intelligente basata su pattern cliente")
            client_suggestions = suggest_client_based_reconciliation(transaction_id, anagraphics_id_filter)
            
            if client_suggestions:
                logger.info(f"{log_prefix}: Trovati {len(client_suggestions)} suggerimenti client-based")
                # Se troviamo buoni match client-based, limitiamo la ricerca standard
                max_combination_size = min(max_combination_size, 3)
                max_search_time_ms = min(max_search_time_ms, 10000)
        else:
            client_suggestions = []
        
        # Recupera dettagli transazione
        cursor.execute("""
            SELECT amount, reconciled_amount, description
            FROM BankTransactions 
            WHERE id = ?
        """, (transaction_id,))
        
        trans_row = cursor.fetchone()
        if not trans_row:
            return client_suggestions
        
        target_amount_signed = quantize(
            to_decimal(trans_row['amount']) - to_decimal(trans_row['reconciled_amount'])
        )
        
        if target_amount_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
            return client_suggestions
        
        target_amount_abs = target_amount_signed.copy_abs()
        target_invoice_type = 'Attiva' if target_amount_signed > 0 else 'Passiva'
        
        # Query ottimizzata per candidati
        query_params = [
            target_invoice_type,
            anagraphics_id_filter,
            float(AMOUNT_TOLERANCE / 2),
            float(target_amount_abs * 1.2)  # Margine del 20%
        ]
        
        date_filter = ""
        if start_date and end_date:
            date_filter = "AND i.doc_date BETWEEN ? AND ?"
            query_params.extend([start_date, end_date])
        
        query = f"""
            SELECT 
                i.id, i.doc_number, i.doc_date, i.total_amount, i.paid_amount,
                CAST(i.total_amount - i.paid_amount AS REAL) as open_amount
            FROM Invoices i
            WHERE i.type = ?
              AND i.anagraphics_id = ?
              AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND (i.total_amount - i.paid_amount) > ?
              AND (i.total_amount - i.paid_amount) <= ?
              {date_filter}
            ORDER BY i.doc_date DESC, i.doc_number
            LIMIT 50
        """
        
        cursor.execute(query, query_params)
        rows = cursor.fetchall()
        
        if not rows:
            return client_suggestions
        
        # Prepara dati per analisi
        candidate_invoices = []
        for row in rows:
            if row['id'] in exclude_invoice_ids:
                continue
            
            open_amount = quantize(to_decimal(row['open_amount']))
            if open_amount <= AMOUNT_TOLERANCE / 2:
                continue
            
            candidate_invoices.append({
                'id': row['id'],
                'doc_number': row['doc_number'],
                'doc_date': row['doc_date'],
                'amount': float(open_amount),
                'amount_decimal': open_amount
            })
        
        if len(candidate_invoices) < 2:
            return client_suggestions
        
        logger.info(f"{log_prefix}: Analisi {len(candidate_invoices)} fatture candidate (standard)")
        
        # Trova combinazioni standard
        standard_suggestions = _find_standard_combinations(
            candidate_invoices, target_amount_abs, max_combination_size, 
            start_time, max_search_time_ms, exclude_ids=exclude_invoice_ids
        )
        
        # Combina suggerimenti client-based e standard
        if enhance_cumulative_matches_with_client_patterns is not None and client_suggestions:
            all_suggestions = enhance_cumulative_matches_with_client_patterns(
                transaction_id, anagraphics_id_filter, standard_suggestions
            )
        else:
            all_suggestions = client_suggestions + standard_suggestions
        
        # Rimuovi duplicati e ordina
        unique_suggestions = _deduplicate_suggestions(all_suggestions)
        
        logger.info(f"{log_prefix}: Ricerca completata. {len(unique_suggestions)} suggerimenti totali")
        return unique_suggestions[:15]  # Top 15
        
    except Exception as e:
        logger.error(f"{log_prefix}: Errore: {e}", exc_info=True)
        return []
    finally:
        if conn:
            conn.close()

def _find_standard_combinations(candidate_invoices, target_amount, max_combination_size, 
                               start_time, max_search_time_ms, exclude_ids):
    """Trova combinazioni standard con algoritmi ottimizzati"""
    suggestions = []
    timeout_ms = max_search_time_ms * 0.6  # Riserva tempo
    
    # Ordina per importo (facilita pruning)
    candidates = sorted(candidate_invoices, key=lambda x: x['amount'])
    
    for size in range(2, min(len(candidates) + 1, max_combination_size + 1)):
        elapsed_ms = (time.monotonic() - start_time) * 1000
        if elapsed_ms > timeout_ms:
            break
        
        # Algoritmo con pruning intelligente
        for combination in _generate_smart_combinations(candidates, size, target_amount):
            elapsed_ms = (time.monotonic() - start_time) * 1000
            if elapsed_ms > timeout_ms:
                break
            
            total_amount = sum(inv['amount_decimal'] for inv in combination)
            
            if abs(total_amount - target_amount) <= AMOUNT_TOLERANCE:
                confidence = _calculate_standard_confidence(combination, target_amount)
                
                suggestions.append({
                    'invoice_ids': [inv['id'] for inv in combination],
                    'total_amount': total_amount,
                    'num_invoices': len(combination),
                    'counterparty': 'N/A',  # Sarà riempito dopo
                    'anagraphics_id': None,
                    'doc_numbers': [inv['doc_number'] for inv in combination],
                    'confidence': 'Standard',
                    'sequence_score': _calculate_sequence_score(combination),
                    'date_range_days': _calculate_date_range(combination),
                    'explanation': f"Combinazione standard {len(combination)} fatture"
                })
        
        if len(suggestions) >= 10:
            break
    
    return suggestions

def _generate_smart_combinations(candidates, size, target_amount):
    """Generatore di combinazioni con pruning intelligente"""
    
    def _can_reach_target(remaining_items, current_sum, needed):
        if needed == 0:
            return abs(current_sum - target_amount) <= AMOUNT_TOLERANCE
        
        if len(remaining_items) < needed:
            return False
        
        # Quick bounds check
        min_possible = current_sum + sum(item['amount_decimal'] for item in remaining_items[:needed])
        max_possible = current_sum + sum(item['amount_decimal'] for item in remaining_items[-needed:])
        
        return min_possible <= target_amount + AMOUNT_TOLERANCE and max_possible >= target_amount - AMOUNT_TOLERANCE
    
    def _recursive_combinations(start_idx, current_combination, current_sum, needed):
        if needed == 0:
            if abs(current_sum - target_amount) <= AMOUNT_TOLERANCE:
                yield current_combination.copy()
            return
        
        for i in range(start_idx, len(candidates) - needed + 1):
            item = candidates[i]
            new_sum = current_sum + item['amount_decimal']
            
            # Pruning: se già sopra il target di troppo, salta
            if new_sum > target_amount + AMOUNT_TOLERANCE * needed:
                continue
            
            # Pruning: verifica se può raggiungere il target
            remaining = candidates[i + 1:]
            if not _can_reach_target(remaining, new_sum, needed - 1):
                continue
            
            current_combination.append(item)
            yield from _recursive_combinations(i + 1, current_combination, new_sum, needed - 1)
            current_combination.pop()
    
    yield from _recursive_combinations(0, [], Decimal('0'), size)

def _calculate_standard_confidence(combination, target_amount):
    """Calcola confidenza per combinazioni standard"""
    base_confidence = 0.6
    
    # Bonus per corrispondenza esatta
    total = sum(inv['amount_decimal'] for inv in combination)
    amount_precision = 1.0 - (abs(total - target_amount) / target_amount)
    
    # Bonus per coerenza temporale
    dates = [inv['doc_date'] for inv in combination if inv['doc_date']]
    date_bonus = 0.0
    if len(dates) >= 2:
        try:
            date_objects = [pd.to_datetime(d).date() for d in dates]
            date_range = (max(date_objects) - min(date_objects)).days
            date_bonus = max(0.0, 1.0 - date_range / 45)
        except:
            date_bonus = 0.0
    
    return min(1.0, base_confidence + amount_precision * 0.3 + date_bonus * 0.1)

def _calculate_sequence_score(combination):
    """Calcola score di sequenza"""
    if len(combination) < 2:
        return 0.5
    
    # Analizza numeri documento per consecutività
    numbers = []
    for inv in combination:
        doc_num = inv.get('doc_number', '')
        # Estrai numeri dal documento
        nums = re.findall(r'\d+', doc_num)
        if nums:
            try:
                numbers.append(int(nums[-1]))  # Prendi l'ultimo numero
            except ValueError:
                continue
    
    if len(numbers) < 2:
        return 0.5
    
    numbers.sort()
    total_range = numbers[-1] - numbers[0] + 1
    actual_count = len(numbers)
    
    return actual_count / total_range

def _calculate_date_range(combination):
    """Calcola range di date in giorni"""
    dates = [inv['doc_date'] for inv in combination if inv['doc_date']]
    
    if len(dates) < 2:
        return 0
    
    try:
        date_objects = [pd.to_datetime(d).date() for d in dates]
        return (max(date_objects) - min(date_objects)).days
    except:
        return 999

def _deduplicate_suggestions(suggestions):
    """Rimuove suggerimenti duplicati"""
    seen_combinations = set()
    unique_suggestions = []
    
    for sugg in suggestions:
        invoice_set = tuple(sorted(sugg['invoice_ids']))
        if invoice_set not in seen_combinations:
            seen_combinations.add(invoice_set)
            unique_suggestions.append(sugg)
    
    # Ordina per qualità
    def sort_key(s):
        is_client_pattern = 'Pattern Cliente' in s.get('confidence', '')
        sequence_score = s.get('sequence_score', 0)
        confidence_score = s.get('confidence_score', 0)
        return (is_client_pattern, confidence_score, sequence_score)
    
    unique_suggestions.sort(key=sort_key, reverse=True)
    return unique_suggestions

def calculate_and_update_item_status(conn, item_type, item_id):
    """Versione ottimizzata del calcolo stato con transazioni batch"""
    item = get_item_details(conn, item_type, item_id)
    if not item:
        logger.warning(f"Impossibile ricalcolare stato: {item_type} ID {item_id} non trovato.")
        return False

    cursor = conn.cursor()
    linked_amount_sum = Decimal('0.0')
    new_status = ''
    original_status = ''
    
    try:
        current_reconciled_db_raw = item['paid_amount'] if item_type == 'invoice' else item['reconciled_amount']
        current_reconciled_db = to_decimal(current_reconciled_db_raw, default='0.0')
    except KeyError as ke:
        logger.error(f"Colonna {ke} mancante nei dettagli {item_type} ID {item_id}. Assumo 0.0.")
        current_reconciled_db = Decimal('0.0')
    except Exception as e_get:
        logger.error(f"Errore accesso importo riconciliato per {item_type} ID {item_id}: {e_get}. Assumo 0.0.")
        current_reconciled_db = Decimal('0.0')

    try:
        if item_type == 'invoice':
            original_status = item['payment_status']
            item_total_db = item['total_amount']
            due_date_str = item['due_date']

            cursor.execute("SELECT SUM(reconciled_amount) FROM ReconciliationLinks WHERE invoice_id = ?", (item_id,))
            result = cursor.fetchone()
            if result and result[0] is not None:
                linked_amount_sum = quantize(to_decimal(result[0]))

            item_total_dec = quantize(to_decimal(item_total_db))
            item_total_to_match = item_total_dec.copy_abs()
            open_tolerance = AMOUNT_TOLERANCE * 10

            base_unpaid_status = 'Aperta'
            due_date_obj = None
            if due_date_str:
                try:
                    if isinstance(due_date_str, str):
                        due_date_obj = date.fromisoformat(due_date_str)
                    elif isinstance(due_date_str, (date, datetime)):
                        due_date_obj = due_date_str if isinstance(due_date_str, date) else due_date_str.date()
                    else:
                        pd_date = pd.to_datetime(due_date_str, errors='coerce')
                        if pd.notna(pd_date):
                            due_date_obj = pd_date.date()
                        else:
                            raise ValueError("Formato data non riconosciuto")

                    if due_date_obj < date.today():
                        base_unpaid_status = 'Scaduta'
                except (TypeError, ValueError) as date_err:
                    logger.warning(f"Formato/tipo data scadenza non valido per I:{item_id}: '{due_date_str}' ({type(due_date_str)}) - {date_err}")
                except Exception as date_generic_err:
                    logger.error(f"Errore generico conversione data scadenza I:{item_id}: '{due_date_str}' - {date_generic_err}", exc_info=True)

            if linked_amount_sum <= open_tolerance / 2:
                new_status = base_unpaid_status
            elif abs(linked_amount_sum - item_total_to_match) <= AMOUNT_TOLERANCE:
                new_status = 'Pagata Tot.'
            elif linked_amount_sum < item_total_to_match:
                new_status = 'Pagata Parz.'
            else:
                logger.warning(f"Fattura {item_id} pagata in eccesso (Link: {linked_amount_sum:.2f} vs Tot: {item_total_to_match:.2f}). Stato: Pagata Tot.")
                new_status = 'Pagata Tot.'

        elif item_type == 'transaction':
            original_status = item['reconciliation_status']
            item_total_db = item['amount']
            ignored_status = 'Ignorato'

            if original_status == ignored_status:
                cursor.execute("SELECT COUNT(id) FROM ReconciliationLinks WHERE transaction_id = ?", (item_id,))
                link_count = cursor.fetchone()[0]
                if link_count > 0:
                    logger.error(f"INCOERENZA: T:{item_id} '{ignored_status}' con {link_count} link attivi. Rimuovo link...")
                    success_remove, _ = remove_reconciliation_links(conn, transaction_id=item_id)
                    if not success_remove:
                        logger.error(f"Fallita rimozione link per T:{item_id} ignorata!")
                    current_reconciled_db = Decimal('0.0')
                    linked_amount_sum = Decimal('0.0')
                else:
                    linked_amount_sum = Decimal('0.0')

                if quantize(current_reconciled_db) != Decimal('0.0'):
                    logger.warning(f"Forzo reconciled_amount a 0 per T:{item_id} '{ignored_status}' (era {current_reconciled_db:.2f}).")
                    if not update_transaction_reconciliation_state(conn, item_id, ignored_status, Decimal('0.0')):
                        logger.error(f"Fallito azzeramento reconciled_amount per T:{item_id} ignorata!")
                        return False
                    else:
                        current_reconciled_db = Decimal('0.0')

                logger.debug(f"T:{item_id} '{ignored_status}' confermata. Nessun cambiamento di stato.")
                return True

            cursor.execute("SELECT SUM(reconciled_amount) FROM ReconciliationLinks WHERE transaction_id = ?", (item_id,))
            result = cursor.fetchone()
            if result and result[0] is not None:
                linked_amount_sum = quantize(to_decimal(result[0]))

            item_total_dec = quantize(to_decimal(item_total_db))
            item_total_abs = item_total_dec.copy_abs()
            open_tolerance = AMOUNT_TOLERANCE * 10

            if linked_amount_sum.copy_abs() <= open_tolerance / 2:
                new_status = 'Da Riconciliare'
            elif abs(linked_amount_sum - item_total_abs) <= AMOUNT_TOLERANCE:
                new_status = 'Riconciliato Tot.'
            elif linked_amount_sum < item_total_abs:
                new_status = 'Riconciliato Parz.'
            else:
                logger.warning(f"T:{item_id} eccedente (Link: {linked_amount_sum:.2f} vs Tot: {item_total_abs:.2f}). Stato: Riconciliato Eccesso.")
                new_status = 'Riconciliato Eccesso'
        else:
            logger.error(f"Tipo elemento non valido: {item_type}")
            return False

        current_reconciled_dec = quantize(current_reconciled_db)
        status_changed = new_status != original_status
        amount_to_update = linked_amount_sum
        amount_changed = amount_to_update != current_reconciled_dec

        if status_changed or amount_changed:
            log_msg = f"Aggiornamento {item_type} ID {item_id}: Stato '{original_status}'->'{new_status}' (C:{status_changed}), Importo {current_reconciled_dec:.2f}->{amount_to_update:.2f} (C:{amount_changed})"
            logger.info(log_msg)
            if item_type == 'invoice':
                if not update_invoice_reconciliation_state(conn, item_id, new_status, amount_to_update):
                    logger.error(f"Fallito aggiornamento DB per Invoice ID {item_id}")
                    return False
            elif item_type == 'transaction':
                if not update_transaction_reconciliation_state(conn, item_id, new_status, amount_to_update):
                    logger.error(f"Fallito aggiornamento DB per Transaction ID {item_id}")
                    return False
        else:
            logger.debug(f"Stato/importo {item_type} {item_id} non cambiati.")

        return True
    except sqlite3.Error as e:
        logger.error(f"Errore DB ricalcolo stato {item_type} ID {item_id}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Errore generico ricalcolo stato {item_type} ID {item_id}: {e}", exc_info=True)
        return False

def suggest_reconciliation_matches_enhanced(invoice_id=None, transaction_id=None, anagraphics_id_ui_filter=None):
    """Versione ottimizzata dei suggerimenti 1:1 con cache e algoritmi migliorati"""
    
    _refresh_anagraphics_cache()
    
    conn = None
    suggestions = []
    processed_suggestions = set()
    search_direction = None
    
    if transaction_id is not None:
        search_direction = 'transaction_to_invoice'
    elif invoice_id is not None:
        search_direction = 'invoice_to_transaction'
    else:
        return suggestions

    log_prefix = f"Sugg.1:1 Enhanced {'T:'+str(transaction_id) if search_direction == 'transaction_to_invoice' else 'I:'+str(invoice_id)}"
    logger.info(f"{log_prefix}: Avvio ricerca suggerimenti 1:1 ottimizzata...")

    try:
        conn = get_connection()
        cursor = conn.cursor()

        if search_direction == 'transaction_to_invoice':
            # Ricerca ottimizzata da transazione a fattura
            cursor.execute("""
                SELECT t.id, t.amount, t.description, t.reconciliation_status, t.reconciled_amount, t.transaction_date
                FROM BankTransactions t WHERE t.id = ?
            """, (transaction_id,))
            
            trans = cursor.fetchone()
            if not trans:
                logger.warning(f"{log_prefix}: Transazione T:{transaction_id} non trovata.")
                return suggestions
                
            if trans['reconciliation_status'] not in ('Da Riconciliare', 'Riconciliato Parz.'):
                logger.debug(f"{log_prefix}: Transazione T:{transaction_id} non idonea.")
                return suggestions

            trans_remaining_signed = quantize(to_decimal(trans['amount']) - to_decimal(trans['reconciled_amount']))
            if trans_remaining_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
                logger.debug(f"{log_prefix}: Residuo transazione T:{transaction_id} trascurabile.")
                return suggestions

            target_amount_abs = trans_remaining_signed.copy_abs()
            description = trans['description'] or ""
            target_invoice_type = 'Attiva' if trans_remaining_signed > 0 else 'Passiva'
            
            # Estrazione numeri fattura ottimizzata
            invoice_numbers_in_desc = extract_invoice_number(description)
            
            # Identificazione anagrafica ottimizzata
            effective_anag_id_filter = anagraphics_id_ui_filter
            if effective_anag_id_filter is None:
                logger.debug(f"{log_prefix}: Identificazione anagrafica da descrizione...")
                effective_anag_id_filter = find_anagraphics_id_from_description(description)
                logger.info(f"{log_prefix}: ID Anagrafica auto-rilevato: {effective_anag_id_filter}")
            else:
                logger.info(f"{log_prefix}: Utilizzo filtro Anagrafica da UI: {effective_anag_id_filter}")

            # Query ottimizzata con indici
            base_query = """
                SELECT i.id, i.doc_number, i.total_amount, i.paid_amount,
                       ABS(i.total_amount - i.paid_amount) as open_amount_abs_calc,
                       a.denomination, i.anagraphics_id, i.doc_date
                FROM Invoices i 
                JOIN Anagraphics a ON i.anagraphics_id = a.id
                WHERE i.type = ?
                  AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND ABS(i.total_amount - i.paid_amount) > ?
            """
            
            params = [target_invoice_type, float(AMOUNT_TOLERANCE / 2)]
            
            # Applica filtro anagrafica se disponibile
            if effective_anag_id_filter is not None:
                base_query += " AND i.anagraphics_id = ?"
                params.append(effective_anag_id_filter)
            
            # Ordina per rilevanza (importo simile prima)
            base_query += " ORDER BY ABS(ABS(i.total_amount - i.paid_amount) - ?) ASC LIMIT 50"
            params.append(float(target_amount_abs))
            
            cursor.execute(base_query, params)
            open_invoices = cursor.fetchall()
            
            logger.info(f"{log_prefix}: Trovate {len(open_invoices)} fatture candidate per analisi 1:1")
            
            # Analisi ottimizzata dei match
            for inv in open_invoices:
                inv_id = inv['id']
                inv_number = inv['doc_number'] or ""
                inv_denomination = inv['denomination'] or ""
                
                invoice_remaining = quantize(to_decimal(inv['total_amount']) - to_decimal(inv['paid_amount']))
                invoice_remaining_abs = invoice_remaining.copy_abs()

                if invoice_remaining_abs <= AMOUNT_TOLERANCE / 2:
                    continue
                    
                sugg_key = f"T{transaction_id}-I{inv_id}"
                if sugg_key in processed_suggestions:
                    continue

                # Sistema di scoring migliorato
                confidence_score = 0.0
                reasons = []
                match_details = {
                    'amount': False,
                    'number': False,
                    'name': False,
                    'date': False
                }

                # Match importo (peso maggiore)
                amount_diff = abs(invoice_remaining_abs - target_amount_abs)
                if amount_diff <= AMOUNT_TOLERANCE:
                    confidence_score += 0.6
                    reasons.append("Importo Esatto")
                    match_details['amount'] = True
                elif amount_diff <= target_amount_abs * 0.02:  # Entro 2%
                    confidence_score += 0.4
                    reasons.append("Importo Simile")
                
                # Match numero fattura (peso alto)
                if inv_number and invoice_numbers_in_desc:
                    cleaned_inv_number = re.sub(r'\s+', '', inv_number).upper()
                    for desc_number in invoice_numbers_in_desc:
                        cleaned_desc_number = re.sub(r'\s+', '', desc_number).upper()
                        if cleaned_inv_number == cleaned_desc_number:
                            confidence_score += 0.3
                            reasons.append(f"Num.Fatt:'{inv_number}'")
                            match_details['number'] = True
                            break
                
                # Match denominazione (peso medio)
                if description and inv_denomination and len(inv_denomination) >= 4:
                    desc_lower = description.lower()
                    denom_lower = inv_denomination.lower()
                    
                    # Match esatto denominazione
                    if denom_lower in desc_lower:
                        name_weight = 0.15 + (len(inv_denomination) / len(description)) * 0.1
                        confidence_score += name_weight
                        reasons.append(f"Nome:'{inv_denomination}'")
                        match_details['name'] = True
                    else:
                        # Match parziale parole
                        denom_words = set(re.findall(r'\b\w{4,}\b', denom_lower))
                        desc_words = set(re.findall(r'\b\w{4,}\b', desc_lower))
                        common_words = denom_words.intersection(desc_words)
                        
                        if common_words and len(common_words) >= min(2, len(denom_words)):
                            word_score = len(common_words) / len(denom_words) * 0.1
                            confidence_score += word_score
                            reasons.append(f"Parole:'{','.join(list(common_words)[:2])}'")

                # Bonus coerenza temporale
                try:
                    inv_date = pd.to_datetime(inv['doc_date']).date()
                    trans_date = pd.to_datetime(trans['transaction_date']).date()
                    if inv_date and trans_date:
                        days_diff = abs((trans_date - inv_date).days)
                        if days_diff <= 60:  # Entro 2 mesi
                            temporal_bonus = max(0, 0.05 * (1 - days_diff / 60))
                            confidence_score += temporal_bonus
                            if days_diff <= 30:
                                match_details['date'] = True
                except:
                    pass
                
                # Determina confidenza finale
                if confidence_score >= 0.6:
                    confidence = 'Alta'
                elif confidence_score >= 0.3:
                    confidence = 'Media'
                elif confidence_score >= 0.15:
                    confidence = 'Bassa'
                else:
                    continue  # Scarta se troppo bassa

                if reasons:
                    logger.info(f"{log_prefix}: +++ Sugg. T:{transaction_id}-I:{inv_id} ({confidence}, Score: {confidence_score:.3f}), Motivi: {reasons}")
                    suggestions.append({
                        'type': confidence,
                        'confidence': confidence,
                        'confidence_score': confidence_score,
                        'invoice_ids': [inv_id],
                        'transaction_ids': [transaction_id],
                        'description': f"Fatt {inv_number}: {invoice_remaining_abs:,.2f} ({', '.join(reasons)})",
                        'match_details': match_details,
                        'reasons': reasons
                    })
                    processed_suggestions.add(sugg_key)

        elif search_direction == 'invoice_to_transaction':
            # Implementazione per invoice_to_transaction
            cursor.execute("""
                SELECT i.id, i.type, i.doc_number, i.total_amount, i.paid_amount,
                       i.payment_status, a.denomination, i.anagraphics_id, i.doc_date
                FROM Invoices i JOIN Anagraphics a ON i.anagraphics_id = a.id
                WHERE i.id = ?
            """, (invoice_id,))
            
            inv = cursor.fetchone()
            if not inv:
                logger.warning(f"{log_prefix}: Fattura I:{invoice_id} non trovata.")
                return suggestions
                
            if inv['payment_status'] not in ('Aperta', 'Scaduta', 'Pagata Parz.'):
                logger.debug(f"{log_prefix}: Fattura I:{invoice_id} non idonea.")
                return suggestions

            invoice_remaining = quantize(to_decimal(inv['total_amount']) - to_decimal(inv['paid_amount']))
            if invoice_remaining.copy_abs() <= AMOUNT_TOLERANCE / 2:
                logger.debug(f"{log_prefix}: Residuo fattura I:{invoice_id} trascurabile.")
                return suggestions

            invoice_remaining_abs = invoice_remaining.copy_abs()
            invoice_type = inv['type']
            invoice_number = inv['doc_number'] or ""
            inv_denomination = inv['denomination'] or ""
            inv_anag_id = inv['anagraphics_id']
            
            target_trans_sign = Decimal('1.0') if invoice_type == 'Attiva' else Decimal('-1.0')
            target_trans_amount_signed = invoice_remaining_abs * target_trans_sign
            
            # Query ottimizzata per transazioni
            query_trans = """
                SELECT t.id, t.amount, t.description, t.reconciled_amount, t.transaction_date,
                       (t.amount - t.reconciled_amount) as trans_remaining_signed_calc
                FROM BankTransactions t
                WHERE t.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                  AND SIGN(t.amount - t.reconciled_amount) = ?
                  AND ABS(t.amount - t.reconciled_amount) > ?
                ORDER BY ABS((t.amount - t.reconciled_amount) - ?) ASC
                LIMIT 50
            """
            
            params = [
                int(target_trans_sign), 
                float(AMOUNT_TOLERANCE / 2),
                float(target_trans_amount_signed)
            ]
            
            cursor.execute(query_trans, params)
            open_transactions = cursor.fetchall()
            
            logger.info(f"{log_prefix}: Trovate {len(open_transactions)} transazioni candidate")
            
            # Analisi simile alla direzione opposta
            for trans in open_transactions:
                trans_id = trans['id']
                description = trans['description'] or ""
                
                trans_remaining_signed = quantize(to_decimal(trans['amount']) - to_decimal(trans['reconciled_amount']))
                if trans_remaining_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
                    continue
                    
                sugg_key = f"T{trans_id}-I{invoice_id}"
                if sugg_key in processed_suggestions:
                    continue

                confidence_score = 0.0
                reasons = []
                
                # Match importo
                amount_diff = abs(trans_remaining_signed - target_trans_amount_signed)
                if amount_diff <= AMOUNT_TOLERANCE:
                    confidence_score += 0.6
                    reasons.append("Importo Esatto")
                
                # Match numero fattura
                invoice_numbers_in_desc = extract_invoice_number(description)
                if invoice_number and invoice_numbers_in_desc:
                    cleaned_inv_number = re.sub(r'\s+', '', invoice_number).upper()
                    for desc_number in invoice_numbers_in_desc:
                        if re.sub(r'\s+', '', desc_number).upper() == cleaned_inv_number:
                            confidence_score += 0.3
                            reasons.append(f"Num.Fatt:'{invoice_number}'")
                            break
                
                # Match denominazione
                if description and inv_denomination and len(inv_denomination) >= 4:
                    if inv_denomination.lower() in description.lower():
                        # Verifica coerenza anagrafica
                        trans_anag_id_check = find_anagraphics_id_from_description(description)
                        name_weight = 0.2 if trans_anag_id_check == inv_anag_id else 0.1
                        confidence_score += name_weight
                        reasons.append(f"Nome:'{inv_denomination}'")

                # Determina confidenza
                if confidence_score >= 0.6:
                    confidence = 'Alta'
                elif confidence_score >= 0.3:
                    confidence = 'Media'
                elif confidence_score >= 0.15:
                    confidence = 'Bassa'
                else:
                    continue

                if reasons:
                    logger.info(f"{log_prefix}: +++ Sugg. T:{trans_id}-I:{invoice_id} ({confidence}, Score: {confidence_score:.3f}), Motivi: {reasons}")
                    suggestions.append({
                        'type': confidence,
                        'confidence': confidence,
                        'confidence_score': confidence_score,
                        'invoice_ids': [invoice_id],
                        'transaction_ids': [trans_id],
                        'description': f"Mov {trans_id}: {trans_remaining_signed:,.2f} ({', '.join(reasons)})",
                        'reasons': reasons
                    })
                    processed_suggestions.add(sugg_key)

        # Ordina per score di confidenza
        suggestions.sort(key=lambda x: (
            {'Alta': 3, 'Media': 2, 'Bassa': 1}.get(x.get('confidence', 'Bassa'), 0),
            x.get('confidence_score', 0)
        ), reverse=True)

    except sqlite3.Error as db_e:
        logger.error(f"{log_prefix}: Errore DB: {db_e}", exc_info=True)
    except Exception as e:
        logger.error(f"{log_prefix}: Errore generico: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

    logger.info(f"{log_prefix}: Ricerca 1:1 completata. Generati {len(suggestions)} suggerimenti.")
    return suggestions

def update_items_statuses_batch(conn, invoice_ids=None, transaction_ids=None):
    """Versione ottimizzata per aggiornamenti batch di stati"""
    updated_items_count = 0
    processed_invoices = set()
    processed_transactions = set()
    
    # Prepara statement per batch updates
    cursor = conn.cursor()
    
    try:
        # Batch update per fatture
        if invoice_ids:
            invoice_updates = []
            for inv_id in invoice_ids:
                if inv_id not in processed_invoices:
                    # Calcola nuovo stato senza aggiornare subito
                    cursor.execute("""
                        SELECT SUM(reconciled_amount) as total_linked,
                               i.total_amount, i.paid_amount, i.due_date, i.payment_status
                        FROM Invoices i
                        LEFT JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
                        WHERE i.id = ?
                        GROUP BY i.id, i.total_amount, i.paid_amount, i.due_date, i.payment_status
                    """, (inv_id,))
                    
                    result = cursor.fetchone()
                    if result:
                        linked_sum = quantize(to_decimal(result['total_linked'] or 0))
                        total_amount = quantize(to_decimal(result['total_amount']))
                        
                        # Determina nuovo stato
                        if linked_sum <= AMOUNT_TOLERANCE / 2:
                            # Verifica se scaduta
                            new_status = 'Aperta'
                            if result['due_date']:
                                try:
                                    due_date = pd.to_datetime(result['due_date']).date()
                                    if due_date < date.today():
                                        new_status = 'Scaduta'
                                except:
                                    pass
                        elif abs(linked_sum - total_amount) <= AMOUNT_TOLERANCE:
                            new_status = 'Pagata Tot.'
                        else:
                            new_status = 'Pagata Parz.'
                        
                        if new_status != result['payment_status']:
                            invoice_updates.append((new_status, float(linked_sum), inv_id))
                    
                    processed_invoices.add(inv_id)
            
            # Esegui batch update
            if invoice_updates:
                cursor.executemany("""
                    UPDATE Invoices 
                    SET payment_status = ?, paid_amount = ?, updated_at = ?
                    WHERE id = ?
                """, [(status, amount, datetime.now(), inv_id) for status, amount, inv_id in invoice_updates])
                updated_items_count += len(invoice_updates)
        
        # Batch update per transazioni
        if transaction_ids:
            transaction_updates = []
            for trans_id in transaction_ids:
                if trans_id not in processed_transactions:
                    cursor.execute("""
                        SELECT SUM(reconciled_amount) as total_linked,
                               t.amount, t.reconciliation_status
                        FROM BankTransactions t
                        LEFT JOIN ReconciliationLinks rl ON t.id = rl.transaction_id
                        WHERE t.id = ?
                        GROUP BY t.id, t.amount, t.reconciliation_status
                    """, (trans_id,))
                    
                    result = cursor.fetchone()
                    if result:
                        linked_sum = quantize(to_decimal(result['total_linked'] or 0))
                        total_amount = quantize(to_decimal(result['amount']))
                        
                        if result['reconciliation_status'] == 'Ignorato':
                            continue  # Non modificare transazioni ignorate
                        
                        # Determina nuovo stato
                        if linked_sum.copy_abs() <= AMOUNT_TOLERANCE / 2:
                            new_status = 'Da Riconciliare'
                        elif abs(linked_sum - total_amount.copy_abs()) <= AMOUNT_TOLERANCE:
                            new_status = 'Riconciliato Tot.'
                        elif linked_sum < total_amount.copy_abs():
                            new_status = 'Riconciliato Parz.'
                        else:
                            new_status = 'Riconciliato Eccesso'
                        
                        if new_status != result['reconciliation_status']:
                            transaction_updates.append((new_status, float(linked_sum), trans_id))
                    
                    processed_transactions.add(trans_id)
            
            # Esegui batch update
            if transaction_updates:
                cursor.executemany("""
                    UPDATE BankTransactions 
                    SET reconciliation_status = ?, reconciled_amount = ?, updated_at = ?
                    WHERE id = ?
                """, [(status, amount, datetime.now(), trans_id) for status, amount, trans_id in transaction_updates])
                updated_items_count += len(transaction_updates)
        
        logger.debug(f"Aggiornamento batch completato per {updated_items_count} elementi.")
        return True
        
    except Exception as e:
        logger.error(f"Errore aggiornamento batch stati: {e}", exc_info=True)
        return False

def apply_manual_match_optimized(invoice_id, transaction_id, amount_to_match_input):
    """Versione ottimizzata dell'abbinamento manuale"""
    conn = None
    try:
        amount_to_match = quantize(to_decimal(amount_to_match_input))
        if amount_to_match <= Decimal('0.0'):
            return False, "Importo deve essere positivo."

        conn = get_connection()
        conn.execute('BEGIN IMMEDIATE')
        
        # Query ottimizzata con join
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                i.id as inv_id, i.total_amount, i.paid_amount, i.payment_status, i.doc_number,
                t.id as trans_id, t.amount, t.reconciled_amount, t.reconciliation_status, t.transaction_date
            FROM Invoices i, BankTransactions t
            WHERE i.id = ? AND t.id = ?
        """, (invoice_id, transaction_id))
        
        result = cursor.fetchone()
        if not result:
            raise ValueError("Fattura o transazione non trovata.")
        
        # Validazioni
        inv_status = result['payment_status']
        tr_status = result['reconciliation_status']
        
        if inv_status in ('Pagata Tot.', 'Riconciliata', 'Insoluta'):
            raise ValueError(f"Fattura {result['doc_number']} già '{inv_status}'.")
        if tr_status in ('Riconciliato Tot.', 'Riconciliato Eccesso', 'Ignorato'):
            raise ValueError(f"Transazione già '{tr_status}'.")

        invoice_remaining = quantize(to_decimal(result['total_amount']) - to_decimal(result['paid_amount']))
        transaction_remaining = quantize(to_decimal(result['amount']) - to_decimal(result['reconciled_amount']))

        if amount_to_match > invoice_remaining.copy_abs() + AMOUNT_TOLERANCE:
            raise ValueError(f"Importo ({amount_to_match:.2f}€) supera residuo fattura ({invoice_remaining.copy_abs():.2f}€).")
        if amount_to_match > transaction_remaining.copy_abs() + AMOUNT_TOLERANCE:
            raise ValueError(f"Importo ({amount_to_match:.2f}€) supera residuo transazione ({transaction_remaining.copy_abs():.2f}€).")

        # Applica link
        if not add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount_to_match):
            raise sqlite3.Error("Errore creazione/aggiornamento link.")

        # Aggiorna stati in batch
        success = update_items_statuses_batch(conn, invoice_ids=[invoice_id], transaction_ids=[transaction_id])
        if not success:
            raise sqlite3.Error("Errore aggiornamento stati.")

        conn.commit()
        logger.info(f"Abb. manuale ottimizzato I:{invoice_id} <-> T:{transaction_id} per {amount_to_match:.2f}€ OK.")
        return True, "Abbinamento manuale applicato."

    except (sqlite3.Error, ValueError, Exception) as e:
        logger.error(f"Errore abb. manuale ottimizzato (I:{invoice_id}, T:{transaction_id}): {e}", exc_info=True)
        if conn:
            conn.rollback()
        return False, f"Errore: {e}"
    finally:
        if conn:
            conn.close()

def attempt_auto_reconciliation_optimized(transaction_ids, invoice_ids):
    """Versione ottimizzata della riconciliazione automatica N:M"""
    conn = None
    if not transaction_ids or not invoice_ids:
        return False, "Selezionare almeno una transazione e una fattura."

    try:
        conn = get_connection()
        conn.execute('BEGIN IMMEDIATE')
        cursor = conn.cursor()

        # Query batch per validazione
        trans_placeholders = ','.join('?' * len(transaction_ids))
        inv_placeholders = ','.join('?' * len(invoice_ids))
        
        # Recupera tutti i dati necessari in una query
        cursor.execute(f"""
            SELECT 
                'transaction' as type, id, amount, reconciled_amount, reconciliation_status
            FROM BankTransactions 
            WHERE id IN ({trans_placeholders})
            UNION ALL
            SELECT 
                'invoice' as type, id, total_amount as amount, paid_amount as reconciled_amount, payment_status as reconciliation_status
            FROM Invoices 
            WHERE id IN ({inv_placeholders})
        """, transaction_ids + invoice_ids)
        
        results = cursor.fetchall()
        
        # Organizza i risultati
        transactions_data = {}
        invoices_data = {}
        
        for row in results:
            item_id = row['id']
            remaining = quantize(to_decimal(row['amount']) - to_decimal(row['reconciled_amount']))
            
            if row['type'] == 'transaction':
                if row['reconciliation_status'] not in ('Da Riconciliare', 'Riconciliato Parz.'):
                    raise ValueError(f"T:{item_id} (Stato: {row['reconciliation_status']}) non utilizzabile.")
                if remaining.copy_abs() > AMOUNT_TOLERANCE / 2:
                    transactions_data[item_id] = {'remaining': remaining}
            else:  # invoice
                if row['reconciliation_status'] not in ('Aperta', 'Scaduta', 'Pagata Parz.'):
                    raise ValueError(f"I:{item_id} (Stato: {row['reconciliation_status']}) non utilizzabile.")
                if remaining.copy_abs() > AMOUNT_TOLERANCE / 2:
                    invoices_data[item_id] = {'remaining': remaining.copy_abs()}

        actual_transaction_ids = list(transactions_data.keys())
        actual_invoice_ids = list(invoices_data.keys())
        
        if not actual_transaction_ids or not actual_invoice_ids:
            raise ValueError("Nessun elemento valido rimasto dopo filtro residui.")

        # Verifica bilanciamento
        total_trans_remaining = sum(abs(data['remaining']) for data in transactions_data.values())
        total_inv_remaining = sum(data['remaining'] for data in invoices_data.values())

        if abs(total_trans_remaining - total_inv_remaining) > AMOUNT_TOLERANCE:
            mismatch_msg = (f"Somme non bilanciate.\n"
                           f"Mov. (Residuo Assoluto): {total_trans_remaining:,.2f} € | "
                           f"Fatt. (Residuo Assoluto): {total_inv_remaining:,.2f} €\n"
                           f"Differenza Assoluta: {abs(total_trans_remaining - total_inv_remaining):,.2f} €")
            raise ValueError(mismatch_msg)

        # Distribuzione ottimizzata
        links_to_create = []
        
        # Ordina per importo per distribuzione efficiente
        sorted_trans = sorted(actual_transaction_ids, key=lambda tid: abs(transactions_data[tid]['remaining']))
        sorted_inv = sorted(actual_invoice_ids, key=lambda iid: invoices_data[iid]['remaining'])
        
        current_trans_rem = {tid: data['remaining'] for tid, data in transactions_data.items()}
        current_inv_rem = {iid: data['remaining'] for iid, data in invoices_data.items()}
        
        logger.info(f"Inizio distribuzione N:M ottimizzata T:{actual_transaction_ids} <-> I:{actual_invoice_ids}")
        
        for t_id in sorted_trans:
            trans_avail_signed = current_trans_rem[t_id]
            trans_avail_abs = abs(trans_avail_signed)
            
            if trans_avail_abs <= AMOUNT_TOLERANCE / 2:
                continue
            
            for i_id in sorted_inv:
                inv_needed = current_inv_rem[i_id]
                if inv_needed <= AMOUNT_TOLERANCE / 2:
                    continue

                amount_this_link = min(trans_avail_abs, inv_needed)

                if amount_this_link > AMOUNT_TOLERANCE / 2:
                    links_to_create.append((i_id, t_id, amount_this_link))
                    
                    # Aggiorna residui
                    sign_factor = 1 if trans_avail_signed > 0 else -1
                    current_trans_rem[t_id] -= amount_this_link * sign_factor
                    current_inv_rem[i_id] -= amount_this_link
                    
                    current_trans_rem[t_id] = quantize(current_trans_rem[t_id])
                    current_inv_rem[i_id] = quantize(current_inv_rem[i_id])

                    trans_avail_abs = abs(current_trans_rem[t_id])
                    if trans_avail_abs <= AMOUNT_TOLERANCE / 2:
                        break

        # Applica tutti i link in batch
        if links_to_create:
            for invoice_id, transaction_id, amount in links_to_create:
                if not add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount):
                    raise sqlite3.Error(f"Errore DB link T:{transaction_id}<->I:{invoice_id}")

        # Aggiorna stati in batch
        logger.info(f"Distribuzione completata ({len(links_to_create)} link). Aggiorno stati...")
        success = update_items_statuses_batch(conn, 
                                            invoice_ids=actual_invoice_ids, 
                                            transaction_ids=actual_transaction_ids)
        if not success:
            raise sqlite3.Error("Errore aggiornamento stati batch")

        conn.commit()
        logger.info("Riconciliazione automatica N:M ottimizzata completata con successo.")
        return True, "Riconciliazione automatica completata."

    except ValueError as ve:
        logger.warning(f"Validazione fallita auto-rec ottimizzata: {ve}")
        if conn:
            conn.rollback()
        return False, str(ve)
    except sqlite3.Error as e_db:
        logger.error(f"Errore DB auto-rec ottimizzata: {e_db}", exc_info=True)
        if conn:
            conn.rollback()
        return False, f"Errore database: {e_db}"
    except Exception as e_generic:
        logger.error(f"Errore critico auto-rec ottimizzata: {e_generic}", exc_info=True)
        if conn:
            conn.rollback()
        return False, f"Errore imprevisto: {e_generic}"
    finally:
        if conn:
            conn.close()

def find_automatic_matches_optimized(confidence_level='Exact'):
    """Versione ottimizzata per trovare match automatici"""
    conn = None
    candidate_matches = []
    log_prefix = "[AutoMatchFinder Optimized]"
    logger.info(f"{log_prefix} Avvio ricerca match automatici ottimizzata...")

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Query ottimizzata con join per ridurre il numero di query
        query_candidates = """
            SELECT 
                t.id as transaction_id,
                t.amount,
                t.reconciled_amount,
                t.description,
                t.transaction_date,
                (t.amount - t.reconciled_amount) as trans_remaining
            FROM BankTransactions t
            WHERE t.reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
              AND ABS(t.amount - t.reconciled_amount) > ?
            ORDER BY ABS(t.amount - t.reconciled_amount) DESC
            LIMIT 200
        """
        
        cursor.execute(query_candidates, (float(AMOUNT_TOLERANCE / 2),))
        eligible_transactions = cursor.fetchall()
        
        logger.info(f"{log_prefix} Analisi {len(eligible_transactions)} transazioni candidate")

        if not eligible_transactions:
            return []

        # Processa in batch per efficienza
        batch_size = 50
        processed_count = 0
        
        for i in range(0, len(eligible_transactions), batch_size):
            batch = eligible_transactions[i:i + batch_size]
            
            for trans_row in batch:
                trans_id = trans_row['transaction_id']
                trans_remaining = quantize(to_decimal(trans_row['trans_remaining']))
                
                if trans_remaining.copy_abs() <= AMOUNT_TOLERANCE / 2:
                    continue
                
                # Usa la versione ottimizzata per i suggerimenti
                trans_suggestions = suggest_reconciliation_matches_enhanced(
                    transaction_id=trans_id, 
                    anagraphics_id_ui_filter=None
                )

                # Filtra solo match ad alta confidenza con importo esatto
                exact_matches = []
                for sugg in trans_suggestions:
                    if (sugg.get('confidence') == 'Alta' and 
                        'Importo Esatto' in sugg.get('description', '') and
                        sugg.get('confidence_score', 0) >= 0.6):
                        exact_matches.append(sugg)

                # Solo se c'è esattamente un match ottimo
                if len(exact_matches) == 1:
                    match = exact_matches[0]
                    inv_id = match['invoice_ids'][0]
                    match_amount = trans_remaining.copy_abs()

                    # Recupera dettagli fattura
                    cursor.execute("""
                        SELECT doc_number, doc_date 
                        FROM Invoices 
                        WHERE id = ?
                    """, (inv_id,))
                    
                    inv_details_row = cursor.fetchone()
                    inv_details = dict(inv_details_row) if inv_details_row else {}

                    # Formatta date
                    trans_date = 'N/D'
                    if trans_row.get('transaction_date'):
                        try:
                            trans_date = pd.to_datetime(trans_row['transaction_date']).strftime('%d/%m/%Y')
                        except:
                            pass
                    
                    inv_date = 'N/D'
                    if inv_details.get('doc_date'):
                        try:
                            inv_date = pd.to_datetime(inv_details['doc_date']).strftime('%d/%m/%Y')
                        except:
                            pass

                    candidate_matches.append({
                        'transaction_id': trans_id,
                        'invoice_id': inv_id,
                        'amount': match_amount,
                        'trans_date': trans_date,
                        'trans_amount_orig': quantize(to_decimal(trans_row['amount'])),
                        'inv_number': inv_details.get('doc_number', 'N/D'),
                        'inv_date': inv_date,
                        'confidence_score': match.get('confidence_score', 0),
                        'match_reasons': match.get('reasons', [])
                    })
                    
                    logger.info(f"{log_prefix} -> Candidato ottimo: T:{trans_id} <-> I:{inv_id} per {match_amount:.2f} (Score: {match.get('confidence_score', 0):.3f})")
                
                processed_count += 1
                
                # Log progresso ogni 25 elementi
                if processed_count % 25 == 0:
                    logger.debug(f"{log_prefix} Processate {processed_count}/{len(eligible_transactions)} transazioni")

        # Ordina per qualità del match
        candidate_matches.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        
        logger.info(f"{log_prefix} Ricerca completata. Trovati {len(candidate_matches)} candidati ottimi per auto-riconciliazione.")
        return candidate_matches[:50]  # Limita a 50 migliori

    except sqlite3.Error as db_e:
        logger.error(f"{log_prefix} Errore DB: {db_e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"{log_prefix} Errore generico: {e}", exc_info=True)
        return []
    finally:
        if conn:
            conn.close()

def ignore_transaction(transaction_id):
    """Mantieni la versione originale per ignore_transaction"""
    conn = None
    affected_invoices = []
    log_prefix = f"[Ignore T:{transaction_id}]"
    logger.info(f"{log_prefix} Avvio operazione.")
    try:
        conn = get_connection()
        conn.execute("BEGIN TRANSACTION")

        logger.debug(f"{log_prefix} Rimozione link esistenti...")
        success_remove, (affected_invoices, _) = remove_reconciliation_links(conn, transaction_id=transaction_id)
        if not success_remove:
            logger.error(f"{log_prefix} Fallita rimozione link dal DB.")
            raise sqlite3.Error(f"Errore database rimozione link T:{transaction_id}.")
        logger.info(f"{log_prefix} Rimossi link associati. Fatture affette: {affected_invoices}")

        logger.debug(f"{log_prefix} Aggiornamento stato transazione a 'Ignorato'...")
        success_update = update_transaction_reconciliation_state(conn, transaction_id, 'Ignorato', Decimal('0.0'))
        if not success_update:
            logger.error(f"{log_prefix} Fallito aggiornamento stato transazione nel DB.")
            raise sqlite3.Error(f"Impossibile aggiornare stato T:{transaction_id}.")
        logger.info(f"{log_prefix} Stato transazione aggiornato.")

        if affected_invoices:
            logger.debug(f"{log_prefix} Aggiornamento stato per {len(affected_invoices)} fatture affette...")
            update_items_statuses_batch(conn, invoice_ids=affected_invoices)
            logger.info(f"{log_prefix} Stato fatture affette aggiornato.")

        conn.commit()
        logger.info(f"{log_prefix} Operazione completata con successo.")
        return True, "Movimento bancario marcato ignorato.", affected_invoices

    except (sqlite3.Error, Exception) as e:
        if conn:
            logger.error(f"{log_prefix} Errore durante operazione, rollback...")
            try:
                conn.rollback()
            except Exception as rb_err:
                logger.error(f"{log_prefix} Errore durante rollback: {rb_err}")
        logger.error(f"{log_prefix} Errore: {e}", exc_info=True)
        return False, f"Errore interno ignore_transaction: {e}", []
    finally:
        if conn:
            conn.close()
        logger.debug(f"{log_prefix} Connessione DB chiusa.")

# Mantieni le funzioni originali per compatibilità, ma direzionale verso le versioni ottimizzate
def update_items_statuses(conn, invoice_ids=None, transaction_ids=None):
    """Wrapper per compatibilità che usa la versione batch ottimizzata"""
    return update_items_statuses_batch(conn, invoice_ids, transaction_ids)

def apply_manual_match(invoice_id, transaction_id, amount_to_match_input):
    """Wrapper per compatibilità che usa la versione ottimizzata"""
    return apply_manual_match_optimized(invoice_id, transaction_id, amount_to_match_input)

def attempt_auto_reconciliation(transaction_ids, invoice_ids):
    """Wrapper per compatibilità che usa la versione ottimizzata"""
    return attempt_auto_reconciliation_optimized(transaction_ids, invoice_ids)

def find_automatic_matches(confidence_level='Exact'):
    """Wrapper per compatibilità che usa la versione ottimizzata"""
    return find_automatic_matches_optimized(confidence_level)

# Compatibilità con vecchie funzioni
def suggest_matches_1_1(invoice_id=None, transaction_id=None, anagraphics_id_filter=None):
    """Wrapper per compatibilità"""
    return suggest_reconciliation_matches_enhanced(invoice_id, transaction_id, anagraphics_id_filter)

def suggest_matches_n_m(transaction_id, anagraphics_id_filter=None, 
                       max_combination_size=5, max_search_time_ms=30000,
                       exclude_invoice_ids=None, start_date=None, end_date=None):
    """Wrapper per compatibilità"""
    return suggest_cumulative_matches(transaction_id, anagraphics_id_filter,
                                    max_combination_size, max_search_time_ms,
                                    exclude_invoice_ids, start_date, end_date)