# core/reconciliation.py - Versione ottimizzata con miglioramenti prestazionali

import logging
import sqlite3
from itertools import combinations
import time
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta
import re
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Set, Tuple, Optional, Any, Union
import concurrent.futures
from dataclasses import dataclass, field
from collections import defaultdict
import numpy as np
from functools import lru_cache
from contextlib import contextmanager

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

# Cache ottimizzata per anagrafiche con TTL e lazy loading
@dataclass
class AnagraphicsCache:
    """Cache ottimizzata per le anagrafiche con TTL e indicizzazione"""
    _data: Dict[int, Dict] = field(default_factory=dict)
    _timestamp: Optional[datetime] = None
    _ttl_minutes: int = 15
    _search_index: Dict[str, Set[int]] = field(default_factory=dict)
    _piva_cf_index: Dict[str, int] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        """Verifica se la cache è scaduta"""
        if not self._timestamp:
            return True
        return (datetime.now() - self._timestamp).total_seconds() > self._ttl_minutes * 60
    
    def clear(self):
        """Pulisce la cache"""
        self._data.clear()
        self._search_index.clear()
        self._piva_cf_index.clear()
        self._timestamp = None
    
    def refresh(self):
        """Aggiorna la cache delle anagrafiche con indicizzazione ottimizzata"""
        logger.debug("Aggiornamento cache anagrafiche ottimizzata...")
        self.clear()
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, denomination, piva, cf 
                FROM Anagraphics 
                WHERE LENGTH(TRIM(COALESCE(denomination, ''))) >= 3
            """)
            
            stop_words = {'spa', 'srl', 'snc', 'sas', 'coop', 'societa', 'group', 'holding', 'soc'}
            
            for row in cursor.fetchall():
                anag_id = row['id']
                denomination = (row['denomination'] or '').strip()
                piva = (row['piva'] or '').strip().upper()
                cf = (row['cf'] or '').strip().upper()
                
                # Preprocessa i termini per il matching
                denom_words = set(re.findall(r'\b\w{3,}\b', denomination.lower())) - stop_words
                
                anag_data = {
                    'denomination': denomination,
                    'piva': piva,
                    'cf': cf,
                    'search_words': denom_words,
                    'full_text': denomination.lower()
                }
                
                self._data[anag_id] = anag_data
                
                # Indicizza per PIVA/CF
                if piva:
                    self._piva_cf_index[piva] = anag_id
                if cf:
                    self._piva_cf_index[cf] = anag_id
                
                # Indicizza per parole chiave
                for word in denom_words:
                    if word not in self._search_index:
                        self._search_index[word] = set()
                    self._search_index[word].add(anag_id)
            
            self._timestamp = datetime.now()
            logger.debug(f"Cache anagrafiche aggiornata: {len(self._data)} record, {len(self._search_index)} parole indicizzate")
    
    def get_data(self) -> Dict[int, Dict]:
        """Ottiene i dati aggiornati della cache"""
        if self.is_expired():
            self.refresh()
        return self._data
    
    def find_by_piva_cf(self, code: str) -> Optional[int]:
        """Ricerca veloce per PIVA/CF"""
        if self.is_expired():
            self.refresh()
        return self._piva_cf_index.get(code.upper())
    
    def search_by_words(self, words: Set[str]) -> Set[int]:
        """Ricerca veloce per parole chiave"""
        if self.is_expired():
            self.refresh()
        
        if not words:
            return set()
        
        # Interseca gli ID per tutte le parole
        result_sets = [self._search_index.get(word, set()) for word in words]
        result_sets = [s for s in result_sets if s]  # Rimuovi set vuoti
        
        if not result_sets:
            return set()
        
        # Interseca tutti i set
        return set.intersection(*result_sets) if len(result_sets) > 1 else result_sets[0]

# Istanza globale della cache
_anagraphics_cache = AnagraphicsCache()

@contextmanager
def get_db_connection():
    """Context manager per connessioni DB con auto-cleanup"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

@dataclass
class InvoiceSequence:
    """Rappresenta una sequenza di fatture consecutive ottimizzata"""
    invoice_ids: List[int]
    start_number: int
    end_number: int
    total_amount: Decimal
    date_range_days: int
    avg_amount: Decimal = field(init=False)
    sequence_score: float = field(init=False)
    
    def __post_init__(self):
        self.avg_amount = self.total_amount / len(self.invoice_ids) if self.invoice_ids else Decimal('0')
        self.sequence_score = self._calculate_sequence_score()
    
    def _calculate_sequence_score(self) -> float:
        """Calcola il punteggio della sequenza"""
        if len(self.invoice_ids) < 2:
            return 0.5
        
        # Score basato su consecutività e compattezza temporale
        range_expected = self.end_number - self.start_number + 1
        actual_count = len(self.invoice_ids)
        consecutiveness = actual_count / range_expected
        
        # Bonus per compattezza temporale (meno giorni = migliore)
        temporal_score = max(0, 1 - self.date_range_days / 90)
        
        return min(1.0, consecutiveness * 0.7 + temporal_score * 0.3)

@dataclass
class ReconciliationCandidate:
    """Candidato per riconciliazione N:M ottimizzato"""
    invoice_ids: List[int]
    total_amount: Decimal
    confidence_score: float
    sequence_score: float = 0.0
    date_coherence_score: float = 0.0
    amount_coherence_score: float = 0.0
    doc_numbers: List[str] = field(default_factory=list)
    date_range_days: int = 0
    explanation: str = ""
    match_type: str = "Standard"  # "Standard", "Client Pattern", "Sequence"

@lru_cache(maxsize=128)
def _extract_piva_cf_from_description(description: str) -> Tuple[str, ...]:
    """Estrae codici PIVA/CF dalla descrizione con cache"""
    if not description:
        return tuple()
    
    piva_cf_pattern = r'\b(\d{11})\b|\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b'
    matches = re.findall(piva_cf_pattern, description, re.IGNORECASE)
    return tuple(code.upper() for piva, cf in matches if (code := piva or cf))

def find_anagraphics_id_from_description(description: str) -> Optional[int]:
    """Versione ottimizzata della ricerca anagrafica con cache e indicizzazione"""
    if not description:
        return None
    
    log_prefix = "find_anag_id (optimized)"
    logger.debug(f"{log_prefix}: Descrizione='{description[:100]}...'")
    
    # Ricerca veloce per PIVA/CF
    codes = _extract_piva_cf_from_description(description)
    for code in codes:
        anag_id = _anagraphics_cache.find_by_piva_cf(code)
        if anag_id:
            logger.info(f"{log_prefix}: Match PIVA/CF veloce -> ID:{anag_id}")
            return anag_id
    
    # Fallback al matching per nome con ricerca indicizzata
    desc_lower = description.lower()
    desc_words = set(re.findall(r'\b\w{3,}\b', desc_lower))
    
    if not desc_words:
        return None
    
    # Ricerca veloce tramite indice
    candidate_ids = _anagraphics_cache.search_by_words(desc_words)
    if not candidate_ids:
        return None
    
    anagraphics_data = _anagraphics_cache.get_data()
    best_score = 0.0
    best_match_id = None
    
    for anag_id in candidate_ids:
        anag_data = anagraphics_data[anag_id]
        
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
        logger.info(f"{log_prefix}: Match nome indicizzato -> ID:{best_match_id}, Score: {best_score:.3f}")
        return best_match_id
    
    return None

class CombinationGenerator:
    """Generatore ottimizzato di combinazioni con pruning intelligente"""
    
    def __init__(self, candidates: List[Dict], target_amount: Decimal):
        self.candidates = sorted(candidates, key=lambda x: x['amount_decimal'])
        self.target_amount = target_amount
        self._precomputed_bounds = self._precompute_bounds()
    
    def _precompute_bounds(self) -> Dict[int, Tuple[Decimal, Decimal]]:
        """Precomputa bounds per pruning veloce"""
        bounds = {}
        for i in range(len(self.candidates)):
            min_sum = sum(item['amount_decimal'] for item in self.candidates[i:i+1])
            max_sum = sum(item['amount_decimal'] for item in self.candidates[i:])
            bounds[i] = (min_sum, max_sum)
        return bounds
    
    def generate_combinations(self, size: int, max_iterations: int = 10000):
        """Genera combinazioni con pruning ottimizzato"""
        iterations = 0
        
        def _recursive_generate(start_idx: int, current: List[Dict], 
                              current_sum: Decimal, remaining_size: int):
            nonlocal iterations
            iterations += 1
            
            if iterations > max_iterations:
                return
            
            if remaining_size == 0:
                if abs(current_sum - self.target_amount) <= AMOUNT_TOLERANCE:
                    yield current.copy()
                return
            
            for i in range(start_idx, len(self.candidates) - remaining_size + 1):
                item = self.candidates[i]
                new_sum = current_sum + item['amount_decimal']
                
                # Pruning: se già troppo alto
                if new_sum > self.target_amount + AMOUNT_TOLERANCE * remaining_size:
                    break
                
                # Pruning: se non può raggiungere il target
                min_possible = new_sum + self._precomputed_bounds.get(i + 1, (Decimal('0'), Decimal('0')))[0] * (remaining_size - 1)
                max_possible = new_sum + self._precomputed_bounds.get(i + 1, (Decimal('0'), Decimal('999999')))[1]
                
                if (min_possible > self.target_amount + AMOUNT_TOLERANCE or 
                    max_possible < self.target_amount - AMOUNT_TOLERANCE):
                    continue
                
                current.append(item)
                yield from _recursive_generate(i + 1, current, new_sum, remaining_size - 1)
                current.pop()
        
        yield from _recursive_generate(0, [], Decimal('0'), size)

def suggest_cumulative_matches(transaction_id, anagraphics_id_filter=None,
                               max_combination_size=5, max_search_time_ms=30000,
                               exclude_invoice_ids=None, start_date=None, end_date=None):
    """Versione ottimizzata N:M con algoritmi intelligenti e caching"""
    if exclude_invoice_ids is None:
        exclude_invoice_ids = set()
    
    if anagraphics_id_filter is None:
        logger.info(f"Sugg.N:M T:{transaction_id}: Saltato (nessun filtro anagrafica)")
        return []
    
    start_time = time.monotonic()
    log_prefix = f"Sugg.N:M Enhanced T:{transaction_id}"
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Prima prova con l'algoritmo intelligente basato su cliente
        client_suggestions = []
        if suggest_client_based_reconciliation is not None:
            logger.info(f"{log_prefix}: Tentativo riconciliazione intelligente basata su pattern cliente")
            client_suggestions = suggest_client_based_reconciliation(transaction_id, anagraphics_id_filter)
            
            if client_suggestions:
                logger.info(f"{log_prefix}: Trovati {len(client_suggestions)} suggerimenti client-based")
                # Limita la ricerca standard se abbiamo buoni match client-based
                max_combination_size = min(max_combination_size, 3)
                max_search_time_ms = min(max_search_time_ms, 10000)
        
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
        
        # Query ottimizzata con indici
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
        
        # Prepara dati per analisi ottimizzata
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
        
        logger.info(f"{log_prefix}: Analisi {len(candidate_invoices)} fatture candidate (standard ottimizzato)")
        
        # Trova combinazioni con generatore ottimizzato
        standard_suggestions = _find_optimized_combinations(
            candidate_invoices, target_amount_abs, max_combination_size, 
            start_time, max_search_time_ms, exclude_ids=exclude_invoice_ids
        )
        
        # Combina suggerimenti
        if enhance_cumulative_matches_with_client_patterns is not None and client_suggestions:
            all_suggestions = enhance_cumulative_matches_with_client_patterns(
                transaction_id, anagraphics_id_filter, standard_suggestions
            )
        else:
            all_suggestions = client_suggestions + standard_suggestions
        
        # Rimuovi duplicati e ordina
        unique_suggestions = _deduplicate_and_rank_suggestions(all_suggestions)
        
        logger.info(f"{log_prefix}: Ricerca completata. {len(unique_suggestions)} suggerimenti totali")
        return unique_suggestions[:15]

def _find_optimized_combinations(candidate_invoices, target_amount, max_combination_size, 
                                start_time, max_search_time_ms, exclude_ids):
    """Trova combinazioni con algoritmi ottimizzati"""
    suggestions = []
    timeout_ms = max_search_time_ms * 0.6
    
    generator = CombinationGenerator(candidate_invoices, target_amount)
    
    for size in range(2, min(len(candidate_invoices) + 1, max_combination_size + 1)):
        elapsed_ms = (time.monotonic() - start_time) * 1000
        if elapsed_ms > timeout_ms:
            break
        
        max_iterations = max(1000, int((timeout_ms - elapsed_ms) / size))
        
        for combination in generator.generate_combinations(size, max_iterations):
            elapsed_ms = (time.monotonic() - start_time) * 1000
            if elapsed_ms > timeout_ms:
                break
            
            total_amount = sum(inv['amount_decimal'] for inv in combination)
            
            if abs(total_amount - target_amount) <= AMOUNT_TOLERANCE:
                confidence_score = _calculate_enhanced_confidence(combination, target_amount)
                
                suggestions.append({
                    'invoice_ids': [inv['id'] for inv in combination],
                    'total_amount': total_amount,
                    'num_invoices': len(combination),
                    'counterparty': 'N/A',
                    'anagraphics_id': None,
                    'doc_numbers': [inv['doc_number'] for inv in combination],
                    'confidence': 'Standard',
                    'confidence_score': confidence_score,
                    'sequence_score': _calculate_sequence_score(combination),
                    'date_range_days': _calculate_date_range(combination),
                    'explanation': f"Combinazione ottimizzata {len(combination)} fatture",
                    'match_type': 'Standard'
                })
        
        if len(suggestions) >= 10:
            break
    
    return suggestions

def _calculate_enhanced_confidence(combination, target_amount):
    """Calcola confidenza migliorata per combinazioni"""
    base_confidence = 0.6
    
    # Precisione importo
    total = sum(inv['amount_decimal'] for inv in combination)
    amount_precision = 1.0 - min(1.0, abs(total - target_amount) / target_amount)
    
    # Coerenza temporale
    date_bonus = _calculate_temporal_coherence(combination)
    
    # Bonus per sequenze numeriche
    sequence_bonus = _calculate_numeric_sequence_bonus(combination)
    
    # Penalità per troppi elementi
    size_penalty = max(0, (len(combination) - 3) * 0.05)
    
    final_confidence = (base_confidence + 
                       amount_precision * 0.25 + 
                       date_bonus * 0.1 + 
                       sequence_bonus * 0.1 - 
                       size_penalty)
    
    return max(0.0, min(1.0, final_confidence))

def _calculate_temporal_coherence(combination):
    """Calcola coerenza temporale della combinazione"""
    dates = [inv['doc_date'] for inv in combination if inv['doc_date']]
    if len(dates) < 2:
        return 0.0
    
    try:
        date_objects = [pd.to_datetime(d).date() for d in dates]
        date_range = (max(date_objects) - min(date_objects)).days
        return max(0.0, 1.0 - date_range / 60)  # Entro 2 mesi = buono
    except:
        return 0.0

def _calculate_numeric_sequence_bonus(combination):
    """Calcola bonus per sequenze numeriche consecutive"""
    numbers = []
    for inv in combination:
        doc_num = inv.get('doc_number', '')
        nums = re.findall(r'\d+', doc_num)
        if nums:
            try:
                numbers.append(int(nums[-1]))
            except ValueError:
                continue
    
    if len(numbers) < 2:
        return 0.0
    
    numbers.sort()
    consecutive_count = 0
    for i in range(1, len(numbers)):
        if numbers[i] == numbers[i-1] + 1:
            consecutive_count += 1
    
    return consecutive_count / (len(numbers) - 1) if len(numbers) > 1 else 0.0

def _calculate_sequence_score(combination):
    """Calcola score di sequenza ottimizzato"""
    if len(combination) < 2:
        return 0.5
    
    return _calculate_numeric_sequence_bonus(combination)

def _calculate_date_range(combination):
    """Calcola range di date in giorni ottimizzato"""
    dates = [inv['doc_date'] for inv in combination if inv['doc_date']]
    
    if len(dates) < 2:
        return 0
    
    try:
        date_objects = [pd.to_datetime(d).date() for d in dates]
        return (max(date_objects) - min(date_objects)).days
    except:
        return 999

def _deduplicate_and_rank_suggestions(suggestions):
    """Rimuove duplicati e ordina i suggerimenti"""
    seen_combinations = set()
    unique_suggestions = []
    
    for sugg in suggestions:
        invoice_set = tuple(sorted(sugg['invoice_ids']))
        if invoice_set not in seen_combinations:
            seen_combinations.add(invoice_set)
            unique_suggestions.append(sugg)
    
    # Ordina per qualità con ranking migliorato
    def enhanced_sort_key(s):
        match_type_priority = {
            'Client Pattern': 3,
            'Sequence': 2,
            'Standard': 1
        }.get(s.get('match_type', 'Standard'), 1)
        
        is_client_pattern = 'Pattern Cliente' in s.get('confidence', '')
        confidence_score = s.get('confidence_score', 0)
        sequence_score = s.get('sequence_score', 0)
        
        return (match_type_priority, is_client_pattern, confidence_score, sequence_score)
    
    unique_suggestions.sort(key=enhanced_sort_key, reverse=True)
    return unique_suggestions

# Batch processing ottimizzato
class BatchProcessor:
    """Processore batch ottimizzato per aggiornamenti di stato"""
    
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
        
    def update_invoice_statuses_batch(self, invoice_ids: List[int]) -> int:
        """Aggiornamento batch ottimizzato per fatture"""
        if not invoice_ids:
            return 0
        
        # Query batch per recuperare dati
        placeholders = ','.join('?' * len(invoice_ids))
        self.cursor.execute(f"""
            SELECT 
                i.id,
                i.total_amount,
                i.paid_amount,
                i.due_date,
                i.payment_status,
                COALESCE(SUM(rl.reconciled_amount), 0) as total_linked
            FROM Invoices i
            LEFT JOIN ReconciliationLinks rl ON i.id = rl.invoice_id
            WHERE i.id IN ({placeholders})
            GROUP BY i.id, i.total_amount, i.paid_amount, i.due_date, i.payment_status
        """, invoice_ids)
        
        updates = []
        today = date.today()
        
        for row in self.cursor.fetchall():
            linked_sum = quantize(to_decimal(row['total_linked']))
            total_amount = quantize(to_decimal(row['total_amount']))
            
            # Determina nuovo stato
            if linked_sum <= AMOUNT_TOLERANCE / 2:
                new_status = 'Aperta'
                if row['due_date']:
                    try:
                        due_date = pd.to_datetime(row['due_date']).date()
                        if due_date < today:
                            new_status = 'Scaduta'
                    except:
                        pass
            elif abs(linked_sum - total_amount) <= AMOUNT_TOLERANCE:
                new_status = 'Pagata Tot.'
            else:
                new_status = 'Pagata Parz.'
            
            if new_status != row['payment_status']:
                updates.append((new_status, float(linked_sum), datetime.now(), row['id']))
        
        # Esegui batch update
        if updates:
            self.cursor.executemany("""
                UPDATE Invoices 
                SET payment_status = ?, paid_amount = ?, updated_at = ?
                WHERE id = ?
            """, updates)
        
        return len(updates)
    
    def update_transaction_statuses_batch(self, transaction_ids: List[int]) -> int:
        """Aggiornamento batch ottimizzato per transazioni"""
        if not transaction_ids:
            return 0
        
        placeholders = ','.join('?' * len(transaction_ids))
        self.cursor.execute(f"""
            SELECT 
                t.id,
                t.amount,
                t.reconciliation_status,
                COALESCE(SUM(rl.reconciled_amount), 0) as total_linked
            FROM BankTransactions t
            LEFT JOIN ReconciliationLinks rl ON t.id = rl.transaction_id
            WHERE t.id IN ({placeholders})
            GROUP BY t.id, t.amount, t.reconciliation_status
        """, transaction_ids)
        
        updates = []
        
        for row in self.cursor.fetchall():
            if row['reconciliation_status'] == 'Ignorato':
                continue
            
            linked_sum = quantize(to_decimal(row['total_linked']))
            total_amount = quantize(to_decimal(row['amount']))
            
            # Determina nuovo stato
            if linked_sum.copy_abs() <= AMOUNT_TOLERANCE / 2:
                new_status = 'Da Riconciliare'
            elif abs(linked_sum - total_amount.copy_abs()) <= AMOUNT_TOLERANCE:
                new_status = 'Riconciliato Tot.'
            elif linked_sum < total_amount.copy_abs():
                new_status = 'Riconciliato Parz.'
            else:
                new_status = 'Riconciliato Eccesso'
            
            if new_status != row['reconciliation_status']:
                updates.append((new_status, float(linked_sum), datetime.now(), row['id']))
        
        # Esegui batch update
        if updates:
            self.cursor.executemany("""
                UPDATE BankTransactions 
                SET reconciliation_status = ?, reconciled_amount = ?, updated_at = ?
                WHERE id = ?
            """, updates)
        
        return len(updates)

def calculate_and_update_item_status(conn, item_type, item_id):
    """Versione ottimizzata del calcolo stato con batch processor"""
    processor = BatchProcessor(conn)
    
    if item_type == 'invoice':
        return processor.update_invoice_statuses_batch([item_id]) > 0
    elif item_type == 'transaction':
        return processor.update_transaction_statuses_batch([item_id]) > 0
    else:
        logger.error(f"Tipo elemento non valido: {item_type}")
        return False

def suggest_reconciliation_matches_enhanced(invoice_id=None, transaction_id=None, anagraphics_id_ui_filter=None):
    """Versione ottimizzata dei suggerimenti 1:1 con caching e algoritmi migliorati"""
    
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

    with get_db_connection() as conn:
        cursor = conn.cursor()

        if search_direction == 'transaction_to_invoice':
            # Ricerca ottimizzata da transazione a fattura
            cursor.execute("""
                SELECT t.id, t.amount, t.description, t.reconciliation_status, 
                       t.reconciled_amount, t.transaction_date
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
            
            # Estrazione numeri fattura ottimizzata con cache
            invoice_numbers_in_desc = extract_invoice_number(description)
            
            # Identificazione anagrafica ottimizzata
            effective_anag_id_filter = anagraphics_id_ui_filter
            if effective_anag_id_filter is None:
                logger.debug(f"{log_prefix}: Identificazione anagrafica da descrizione...")
                effective_anag_id_filter = find_anagraphics_id_from_description(description)
                logger.info(f"{log_prefix}: ID Anagrafica auto-rilevato: {effective_anag_id_filter}")
            else:
                logger.info(f"{log_prefix}: Utilizzo filtro Anagrafica da UI: {effective_anag_id_filter}")

            # Query ottimizzata con hint per indici
            base_query = """
                SELECT i.id, i.doc_number, i.total_amount, i.paid_amount,
                       ABS(i.total_amount - i.paid_amount) as open_amount_abs_calc,
                       a.denomination, i.anagraphics_id, i.doc_date
                FROM Invoices i /*+ INDEX(invoices_type_status_idx) */
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
            
            # Analisi ottimizzata dei match con scoring avanzato
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

                # Sistema di scoring avanzato
                match_analyzer = MatchAnalyzer(
                    target_amount_abs, description, invoice_numbers_in_desc,
                    trans['transaction_date']
                )
                
                match_result = match_analyzer.analyze_invoice_match(
                    invoice_remaining_abs, inv_number, inv_denomination, inv['doc_date']
                )
                
                if match_result['confidence_score'] >= 0.15:  # Soglia minima
                    confidence = match_result['confidence_level']
                    
                    logger.info(f"{log_prefix}: +++ Sugg. T:{transaction_id}-I:{inv_id} ({confidence}, Score: {match_result['confidence_score']:.3f}), Motivi: {match_result['reasons']}")
                    suggestions.append({
                        'type': confidence,
                        'confidence': confidence,
                        'confidence_score': match_result['confidence_score'],
                        'invoice_ids': [inv_id],
                        'transaction_ids': [transaction_id],
                        'description': f"Fatt {inv_number}: {invoice_remaining_abs:,.2f} ({', '.join(match_result['reasons'])})",
                        'match_details': match_result['match_details'],
                        'reasons': match_result['reasons']
                    })
                    processed_suggestions.add(sugg_key)

        elif search_direction == 'invoice_to_transaction':
            # Implementazione ottimizzata per invoice_to_transaction
            cursor.execute("""
                SELECT i.id, i.type, i.doc_number, i.total_amount, i.paid_amount,
                       i.payment_status, a.denomination, i.anagraphics_id, i.doc_date
                FROM Invoices i 
                JOIN Anagraphics a ON i.anagraphics_id = a.id
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
            
            # Query ottimizzata per transazioni con indici
            query_trans = """
                SELECT t.id, t.amount, t.description, t.reconciled_amount, t.transaction_date,
                       (t.amount - t.reconciled_amount) as trans_remaining_signed_calc
                FROM BankTransactions t /*+ INDEX(banktransactions_status_amount_idx) */
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
            
            # Analisi ottimizzata con match analyzer
            for trans in open_transactions:
                trans_id = trans['id']
                description = trans['description'] or ""
                
                trans_remaining_signed = quantize(to_decimal(trans['amount']) - to_decimal(trans['reconciled_amount']))
                if trans_remaining_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
                    continue
                    
                sugg_key = f"T{trans_id}-I{invoice_id}"
                if sugg_key in processed_suggestions:
                    continue

                # Usa match analyzer per analisi coerente
                match_analyzer = MatchAnalyzer(
                    invoice_remaining_abs, description, [invoice_number],
                    trans['transaction_date']
                )
                
                match_result = match_analyzer.analyze_transaction_match(
                    trans_remaining_signed, target_trans_amount_signed,
                    inv_denomination, inv_anag_id
                )
                
                if match_result['confidence_score'] >= 0.15:
                    confidence = match_result['confidence_level']
                    
                    logger.info(f"{log_prefix}: +++ Sugg. T:{trans_id}-I:{invoice_id} ({confidence}, Score: {match_result['confidence_score']:.3f}), Motivi: {match_result['reasons']}")
                    suggestions.append({
                        'type': confidence,
                        'confidence': confidence,
                        'confidence_score': match_result['confidence_score'],
                        'invoice_ids': [invoice_id],
                        'transaction_ids': [trans_id],
                        'description': f"Mov {trans_id}: {trans_remaining_signed:,.2f} ({', '.join(match_result['reasons'])})",
                        'reasons': match_result['reasons']
                    })
                    processed_suggestions.add(sugg_key)

        # Ordina per score di confidenza ottimizzato
        suggestions.sort(key=lambda x: (
            {'Alta': 3, 'Media': 2, 'Bassa': 1}.get(x.get('confidence', 'Bassa'), 0),
            x.get('confidence_score', 0)
        ), reverse=True)

    logger.info(f"{log_prefix}: Ricerca 1:1 completata. Generati {len(suggestions)} suggerimenti.")
    return suggestions

class MatchAnalyzer:
    """Analizzatore avanzato per match 1:1 con scoring consistente"""
    
    def __init__(self, target_amount: Decimal, description: str, 
                 invoice_numbers: List[str], transaction_date: str):
        self.target_amount = target_amount
        self.description = description.lower() if description else ""
        self.invoice_numbers = invoice_numbers or []
        self.transaction_date = transaction_date
        
    def analyze_invoice_match(self, invoice_amount: Decimal, invoice_number: str, 
                            denomination: str, invoice_date: str) -> Dict:
        """Analizza match per fattura"""
        confidence_score = 0.0
        reasons = []
        match_details = {
            'amount': False,
            'number': False,
            'name': False,
            'date': False
        }

        # Match importo (peso maggiore)
        amount_diff = abs(invoice_amount - self.target_amount)
        if amount_diff <= AMOUNT_TOLERANCE:
            confidence_score += 0.6
            reasons.append("Importo Esatto")
            match_details['amount'] = True
        elif amount_diff <= self.target_amount * 0.02:  # Entro 2%
            confidence_score += 0.4
            reasons.append("Importo Simile")
        
        # Match numero fattura (peso alto)
        if invoice_number and self.invoice_numbers:
            cleaned_inv_number = re.sub(r'\s+', '', invoice_number).upper()
            for desc_number in self.invoice_numbers:
                cleaned_desc_number = re.sub(r'\s+', '', desc_number).upper()
                if cleaned_inv_number == cleaned_desc_number:
                    confidence_score += 0.3
                    reasons.append(f"Num.Fatt:'{invoice_number}'")
                    match_details['number'] = True
                    break
        
        # Match denominazione (peso medio)
        if self.description and denomination and len(denomination) >= 4:
            denom_lower = denomination.lower()
            
            # Match esatto denominazione
            if denom_lower in self.description:
                name_weight = 0.15 + (len(denomination) / len(self.description)) * 0.1
                confidence_score += name_weight
                reasons.append(f"Nome:'{denomination}'")
                match_details['name'] = True
            else:
                # Match parziale parole
                denom_words = set(re.findall(r'\b\w{4,}\b', denom_lower))
                desc_words = set(re.findall(r'\b\w{4,}\b', self.description))
                common_words = denom_words.intersection(desc_words)
                
                if common_words and len(common_words) >= min(2, len(denom_words)):
                    word_score = len(common_words) / len(denom_words) * 0.1
                    confidence_score += word_score
                    reasons.append(f"Parole:'{','.join(list(common_words)[:2])}'")

        # Bonus coerenza temporale
        temporal_bonus = self._calculate_temporal_bonus(invoice_date)
        confidence_score += temporal_bonus
        if temporal_bonus > 0.03:
            match_details['date'] = True
        
        # Determina livello confidenza
        confidence_level = self._determine_confidence_level(confidence_score)
        
        return {
            'confidence_score': confidence_score,
            'confidence_level': confidence_level,
            'reasons': reasons,
            'match_details': match_details
        }
    
    def analyze_transaction_match(self, trans_amount_signed: Decimal, 
                                target_amount_signed: Decimal, denomination: str,
                                anag_id: int) -> Dict:
        """Analizza match per transazione"""
        confidence_score = 0.0
        reasons = []
        
        # Match importo
        amount_diff = abs(trans_amount_signed - target_amount_signed)
        if amount_diff <= AMOUNT_TOLERANCE:
            confidence_score += 0.6
            reasons.append("Importo Esatto")
        
        # Match numero fattura nella descrizione
        if self.invoice_numbers:
            invoice_numbers_in_desc = extract_invoice_number(self.description)
            for inv_num in self.invoice_numbers:
                if any(re.sub(r'\s+', '', desc_num).upper() == re.sub(r'\s+', '', inv_num).upper() 
                      for desc_num in invoice_numbers_in_desc):
                    confidence_score += 0.3
                    reasons.append(f"Num.Fatt:'{inv_num}'")
                    break
        
        # Match denominazione
        if self.description and denomination and len(denomination) >= 4:
            if denomination.lower() in self.description:
                # Verifica coerenza anagrafica
                trans_anag_id_check = find_anagraphics_id_from_description(self.description)
                name_weight = 0.2 if trans_anag_id_check == anag_id else 0.1
                confidence_score += name_weight
                reasons.append(f"Nome:'{denomination}'")

        # Determina livello confidenza
        confidence_level = self._determine_confidence_level(confidence_score)
        
        return {
            'confidence_score': confidence_score,
            'confidence_level': confidence_level,
            'reasons': reasons
        }
    
    def _calculate_temporal_bonus(self, date_str: str) -> float:
        """Calcola bonus per coerenza temporale"""
        try:
            inv_date = pd.to_datetime(date_str).date()
            trans_date = pd.to_datetime(self.transaction_date).date()
            if inv_date and trans_date:
                days_diff = abs((trans_date - inv_date).days)
                if days_diff <= 60:  # Entro 2 mesi
                    return max(0, 0.05 * (1 - days_diff / 60))
        except:
            pass
        return 0.0
    
    def _determine_confidence_level(self, score: float) -> str:
        """Determina livello di confidenza basato su score"""
        if score >= 0.6:
            return 'Alta'
        elif score >= 0.3:
            return 'Media'
        elif score >= 0.15:
            return 'Bassa'
        else:
            return 'Molto Bassa'

def update_items_statuses_batch(conn, invoice_ids=None, transaction_ids=None):
    """Versione ottimizzata per aggiornamenti batch di stati"""
    processor = BatchProcessor(conn)
    updated_count = 0
    
    if invoice_ids:
        updated_count += processor.update_invoice_statuses_batch(invoice_ids)
    
    if transaction_ids:
        updated_count += processor.update_transaction_statuses_batch(transaction_ids)
    
    logger.debug(f"Aggiornamento batch completato per {updated_count} elementi.")
    return updated_count > 0

def apply_manual_match_optimized(invoice_id, transaction_id, amount_to_match_input):
    """Versione ottimizzata dell'abbinamento manuale con validazioni migliorate"""
    try:
        amount_to_match = quantize(to_decimal(amount_to_match_input))
        if amount_to_match <= Decimal('0.0'):
            return False, "Importo deve essere positivo."

        with get_db_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            
            # Query ottimizzata con join per ridurre round-trip
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    i.id as inv_id, i.total_amount, i.paid_amount, 
                    i.payment_status, i.doc_number,
                    t.id as trans_id, t.amount, t.reconciled_amount, 
                    t.reconciliation_status, t.transaction_date
                FROM Invoices i, BankTransactions t
                WHERE i.id = ? AND t.id = ?
            """, (invoice_id, transaction_id))
            
            result = cursor.fetchone()
            if not result:
                raise ValueError("Fattura o transazione non trovata.")
            
            # Validazioni ottimizzate
            validator = MatchValidator(result, amount_to_match)
            validation_result = validator.validate()
            
            if not validation_result['valid']:
                raise ValueError(validation_result['error'])

            # Applica link
            if not add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount_to_match):
                raise sqlite3.Error("Errore creazione/aggiornamento link.")

            # Aggiorna stati in batch
            processor = BatchProcessor(conn)
            processor.update_invoice_statuses_batch([invoice_id])
            processor.update_transaction_statuses_batch([transaction_id])

            conn.commit()
            logger.info(f"Abb. manuale ottimizzato I:{invoice_id} <-> T:{transaction_id} per {amount_to_match:.2f}€ OK.")
            return True, "Abbinamento manuale applicato."

    except (sqlite3.Error, ValueError, Exception) as e:
        logger.error(f"Errore abb. manuale ottimizzato (I:{invoice_id}, T:{transaction_id}): {e}", exc_info=True)
        return False, f"Errore: {e}"

class MatchValidator:
    """Validatore ottimizzato per abbinamenti"""
    
    def __init__(self, db_result: Dict, amount_to_match: Decimal):
        self.result = db_result
        self.amount = amount_to_match
        
    def validate(self) -> Dict[str, Union[bool, str]]:
        """Esegue tutte le validazioni"""
        # Controlla stato fattura
        inv_status = self.result['payment_status']
        if inv_status in ('Pagata Tot.', 'Riconciliata', 'Insoluta'):
            return {
                'valid': False,
                'error': f"Fattura {self.result['doc_number']} già '{inv_status}'."
            }
        
        # Controlla stato transazione
        tr_status = self.result['reconciliation_status']
        if tr_status in ('Riconciliato Tot.', 'Riconciliato Eccesso', 'Ignorato'):
            return {
                'valid': False,
                'error': f"Transazione già '{tr_status}'."
            }

        # Controlla residui
        invoice_remaining = quantize(
            to_decimal(self.result['total_amount']) - to_decimal(self.result['paid_amount'])
        )
        transaction_remaining = quantize(
            to_decimal(self.result['amount']) - to_decimal(self.result['reconciled_amount'])
        )

        if self.amount > invoice_remaining.copy_abs() + AMOUNT_TOLERANCE:
            return {
                'valid': False,
                'error': f"Importo ({self.amount:.2f}€) supera residuo fattura ({invoice_remaining.copy_abs():.2f}€)."
            }
        
        if self.amount > transaction_remaining.copy_abs() + AMOUNT_TOLERANCE:
            return {
                'valid': False,
                'error': f"Importo ({self.amount:.2f}€) supera residuo transazione ({transaction_remaining.copy_abs():.2f}€)."
            }

        return {'valid': True, 'error': None}

def attempt_auto_reconciliation_optimized(transaction_ids, invoice_ids):
    """Versione ottimizzata della riconciliazione automatica N:M"""
    if not transaction_ids or not invoice_ids:
        return False, "Selezionare almeno una transazione e una fattura."

    try:
        with get_db_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            processor = BatchProcessor(conn)
            
            # Validazione e recupero dati ottimizzata
            reconciler = AutoReconciler(processor)
            validation_result = reconciler.validate_items(transaction_ids, invoice_ids)
            
            if not validation_result['valid']:
                raise ValueError(validation_result['error'])

            # Verifica bilanciamento
            balance_result = reconciler.check_balance(
                validation_result['transactions_data'], 
                validation_result['invoices_data']
            )
            
            if not balance_result['balanced']:
                raise ValueError(balance_result['error'])

            # Distribuzione ottimizzata
            distribution_result = reconciler.distribute_amounts(
                validation_result['transactions_data'],
                validation_result['invoices_data']
            )

            # Applica tutti i link
            for link in distribution_result['links']:
                if not add_or_update_reconciliation_link(
                    conn, link['invoice_id'], link['transaction_id'], link['amount']
                ):
                    raise sqlite3.Error(f"Errore DB link T:{link['transaction_id']}<->I:{link['invoice_id']}")

            # Aggiorna stati in batch
            processor.update_invoice_statuses_batch(list(validation_result['invoices_data'].keys()))
            processor.update_transaction_statuses_batch(list(validation_result['transactions_data'].keys()))

            conn.commit()
            logger.info("Riconciliazione automatica N:M ottimizzata completata con successo.")
            return True, "Riconciliazione automatica completata."

    except ValueError as ve:
        logger.warning(f"Validazione fallita auto-rec ottimizzata: {ve}")
        return False, str(ve)
    except sqlite3.Error as e_db:
        logger.error(f"Errore DB auto-rec ottimizzata: {e_db}", exc_info=True)
        return False, f"Errore database: {e_db}"
    except Exception as e_generic:
        logger.error(f"Errore critico auto-rec ottimizzata: {e_generic}", exc_info=True)
        return False, f"Errore imprevisto: {e_generic}"

class AutoReconciler:
    """Riconciliatore automatico ottimizzato"""
    
    def __init__(self, processor: BatchProcessor):
        self.processor = processor
        
    def validate_items(self, transaction_ids: List[int], invoice_ids: List[int]) -> Dict:
        """Validazione ottimizzata degli elementi"""
        # Query batch per tutti gli elementi
        trans_placeholders = ','.join('?' * len(transaction_ids))
        inv_placeholders = ','.join('?' * len(invoice_ids))
        
        self.processor.cursor.execute(f"""
            SELECT 
                'transaction' as type, id, amount, reconciled_amount, 
                reconciliation_status as status
            FROM BankTransactions 
            WHERE id IN ({trans_placeholders})
            UNION ALL
            SELECT 
                'invoice' as type, id, total_amount as amount, 
                paid_amount as reconciled_amount, payment_status as status
            FROM Invoices 
            WHERE id IN ({inv_placeholders})
        """, transaction_ids + invoice_ids)
        
        results = self.processor.cursor.fetchall()
        
        transactions_data = {}
        invoices_data = {}
        
        for row in results:
            item_id = row['id']
            remaining = quantize(to_decimal(row['amount']) - to_decimal(row['reconciled_amount']))
            
            if row['type'] == 'transaction':
                if row['status'] not in ('Da Riconciliare', 'Riconciliato Parz.'):
                    return {
                        'valid': False,
                        'error': f"T:{item_id} (Stato: {row['status']}) non utilizzabile."
                    }
                if remaining.copy_abs() > AMOUNT_TOLERANCE / 2:
                    transactions_data[item_id] = {'remaining': remaining}
            else:  # invoice
                if row['status'] not in ('Aperta', 'Scaduta', 'Pagata Parz.'):
                    return {
                        'valid': False,
                        'error': f"I:{item_id} (Stato: {row['status']}) non utilizzabile."
                    }
                if remaining.copy_abs() > AMOUNT_TOLERANCE / 2:
                    invoices_data[item_id] = {'remaining': remaining.copy_abs()}

        if not transactions_data or not invoices_data:
            return {
                'valid': False,
                'error': "Nessun elemento valido rimasto dopo filtro residui."
            }
        
        return {
            'valid': True,
            'transactions_data': transactions_data,
            'invoices_data': invoices_data
        }
    
    def check_balance(self, transactions_data: Dict, invoices_data: Dict) -> Dict:
        """Verifica bilanciamento importi"""
        total_trans_remaining = sum(abs(data['remaining']) for data in transactions_data.values())
        total_inv_remaining = sum(data['remaining'] for data in invoices_data.values())

        if abs(total_trans_remaining - total_inv_remaining) > AMOUNT_TOLERANCE:
            error_msg = (f"Somme non bilanciate.\n"
                        f"Mov. (Residuo Assoluto): {total_trans_remaining:,.2f} € | "
                        f"Fatt. (Residuo Assoluto): {total_inv_remaining:,.2f} €\n"
                        f"Differenza Assoluta: {abs(total_trans_remaining - total_inv_remaining):,.2f} €")
            return {'balanced': False, 'error': error_msg}
        
        return {'balanced': True}
    
    def distribute_amounts(self, transactions_data: Dict, invoices_data: Dict) -> Dict:
        """Distribuzione ottimizzata degli importi"""
        links_to_create = []
        
        # Ordina per importo per distribuzione efficiente
        sorted_trans = sorted(transactions_data.keys(), 
                             key=lambda tid: abs(transactions_data[tid]['remaining']))
        sorted_inv = sorted(invoices_data.keys(), 
                           key=lambda iid: invoices_data[iid]['remaining'])
        
        current_trans_rem = {tid: data['remaining'] for tid, data in transactions_data.items()}
        current_inv_rem = {iid: data['remaining'] for iid, data in invoices_data.items()}
        
        logger.info(f"Inizio distribuzione N:M ottimizzata T:{sorted_trans} <-> I:{sorted_inv}")
        
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
                    links_to_create.append({
                        'invoice_id': i_id,
                        'transaction_id': t_id,
                        'amount': amount_this_link
                    })
                    
                    # Aggiorna residui
                    sign_factor = 1 if trans_avail_signed > 0 else -1
                    current_trans_rem[t_id] -= amount_this_link * sign_factor
                    current_inv_rem[i_id] -= amount_this_link
                    
                    current_trans_rem[t_id] = quantize(current_trans_rem[t_id])
                    current_inv_rem[i_id] = quantize(current_inv_rem[i_id])

                    trans_avail_abs = abs(current_trans_rem[t_id])
                    if trans_avail_abs <= AMOUNT_TOLERANCE / 2:
                        break
        
        return {'links': links_to_create}

def find_automatic_matches_optimized(confidence_level='Exact'):
    """Versione ottimizzata per trovare match automatici"""
    candidate_matches = []
    log_prefix = "[AutoMatchFinder Optimized]"
    logger.info(f"{log_prefix} Avvio ricerca match automatici ottimizzata...")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Query ottimizzata con limit e ordinamento per importanza
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

            # Processa in batch con batch processor ottimizzato
            batch_processor = AutoMatchBatchProcessor(cursor)
            candidate_matches = batch_processor.process_transactions(eligible_transactions)

        logger.info(f"{log_prefix} Ricerca completata. Trovati {len(candidate_matches)} candidati ottimi per auto-riconciliazione.")
        return candidate_matches[:50]  # Limita a 50 migliori

    except sqlite3.Error as db_e:
        logger.error(f"{log_prefix} Errore DB: {db_e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"{log_prefix} Errore generico: {e}", exc_info=True)
        return []

class AutoMatchBatchProcessor:
    """Processore batch ottimizzato per match automatici"""
    
    def __init__(self, cursor):
        self.cursor = cursor
        
    def process_transactions(self, transactions: List[Dict]) -> List[Dict]:
        """Processa transazioni in batch per trovare match automatici"""
        candidate_matches = []
        batch_size = 25
        
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            
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
                exact_matches = self._filter_exact_matches(trans_suggestions)

                # Solo se c'è esattamente un match ottimo
                if len(exact_matches) == 1:
                    match = exact_matches[0]
                    match_data = self._prepare_match_data(match, trans_row, trans_remaining)
                    
                    if match_data:
                        candidate_matches.append(match_data)
                        logger.info(f"AutoMatchFinder -> Candidato ottimo: T:{trans_id} <-> I:{match_data['invoice_id']} per {match_data['amount']:.2f} (Score: {match.get('confidence_score', 0):.3f})")
        
        # Ordina per qualità del match
        candidate_matches.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        return candidate_matches
    
    def _filter_exact_matches(self, suggestions: List[Dict]) -> List[Dict]:
        """Filtra solo match esatti ad alta confidenza"""
        exact_matches = []
        for sugg in suggestions:
            if (sugg.get('confidence') == 'Alta' and 
                'Importo Esatto' in sugg.get('description', '') and
                sugg.get('confidence_score', 0) >= 0.6):
                exact_matches.append(sugg)
        return exact_matches
    
    def _prepare_match_data(self, match: Dict, trans_row: Dict, trans_remaining: Decimal) -> Optional[Dict]:
        """Prepara i dati del match per il risultato finale"""
        inv_id = match['invoice_ids'][0]
        match_amount = trans_remaining.copy_abs()

        # Recupera dettagli fattura
        self.cursor.execute("""
            SELECT doc_number, doc_date 
            FROM Invoices 
            WHERE id = ?
        """, (inv_id,))
        
        inv_details_row = self.cursor.fetchone()
        if not inv_details_row:
            return None
            
        inv_details = dict(inv_details_row)

        # Formatta date
        trans_date = self._format_date(trans_row.get('transaction_date'))
        inv_date = self._format_date(inv_details.get('doc_date'))

        return {
            'transaction_id': trans_row['transaction_id'],
            'invoice_id': inv_id,
            'amount': match_amount,
            'trans_date': trans_date,
            'trans_amount_orig': quantize(to_decimal(trans_row['amount'])),
            'inv_number': inv_details.get('doc_number', 'N/D'),
            'inv_date': inv_date,
            'confidence_score': match.get('confidence_score', 0),
            'match_reasons': match.get('reasons', [])
        }
    
    def _format_date(self, date_value) -> str:
        """Formatta una data in modo sicuro"""
        if not date_value:
            return 'N/D'
        
        try:
            return pd.to_datetime(date_value).strftime('%d/%m/%Y')
        except:
            return 'N/D'

def ignore_transaction(transaction_id):
    """Versione ottimizzata per ignorare transazioni"""
    affected_invoices = []
    log_prefix = f"[Ignore T:{transaction_id}]"
    logger.info(f"{log_prefix} Avvio operazione.")
    
    try:
        with get_db_connection() as conn:
            conn.execute("BEGIN TRANSACTION")
            processor = BatchProcessor(conn)

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
                processor.update_invoice_statuses_batch(affected_invoices)
                logger.info(f"{log_prefix} Stato fatture affette aggiornato.")

            conn.commit()
            logger.info(f"{log_prefix} Operazione completata con successo.")
            return True, "Movimento bancario marcato ignorato.", affected_invoices

    except (sqlite3.Error, Exception) as e:
        logger.error(f"{log_prefix} Errore: {e}", exc_info=True)
        return False, f"Errore interno ignore_transaction: {e}", []

# === FUNZIONI DI COMPATIBILITÀ ===
# Mantieni le funzioni originali per compatibilità con le API esistenti

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

# Funzioni legacy mantenute per retrocompatibilità
def calculate_and_update_item_status_legacy(conn, item_type, item_id):
    """Versione legacy mantenuta per compatibilità"""
    return calculate_and_update_item_status(conn, item_type, item_id)

def suggest_reconciliation_matches_legacy(invoice_id=None, transaction_id=None, anagraphics_id_ui_filter=None):
    """Versione legacy mantenuta per compatibilità"""
    return suggest_reconciliation_matches_enhanced(invoice_id, transaction_id, anagraphics_id_ui_filter)

# === UTILITÀ AGGIUNTIVE ===

def get_reconciliation_statistics() -> Dict[str, Any]:
    """Ottiene statistiche ottimizzate sulla riconciliazione"""
    stats = {
        'cache_hits': 0,
        'cache_misses': 0,
        'total_anagraphics': 0,
        'indexed_words': 0,
        'cache_age_minutes': 0
    }
    
    try:
        if _anagraphics_cache._timestamp:
            age = (datetime.now() - _anagraphics_cache._timestamp).total_seconds() / 60
            stats['cache_age_minutes'] = round(age, 2)
        
        stats['total_anagraphics'] = len(_anagraphics_cache._data)
        stats['indexed_words'] = len(_anagraphics_cache._search_index)
        
        return stats
    except Exception as e:
        logger.error(f"Errore recupero statistiche: {e}")
        return stats

def clear_caches():
    """Pulisce tutte le cache"""
    global _anagraphics_cache
    _anagraphics_cache.clear()
    
    # Pulisce anche le cache LRU
    _extract_piva_cf_from_description.cache_clear()
    
    logger.info("Cache pulite con successo")

def warm_up_caches():
    """Preriscalda le cache per prestazioni ottimali"""
    logger.info("Preriscaldamento cache in corso...")
    
    # Forza il refresh della cache anagrafiche
    _anagraphics_cache.refresh()
    
    # Esegue alcune operazioni di esempio per preriscaldare le cache LRU
    test_descriptions = [
        "FATTURA 123 ROSSI MARIO SRL",
        "PAGAMENTO FT001 AZIENDA ESEMPIO SPA",
        "BONIFICO 12345678901"
    ]
    
    for desc in test_descriptions:
        find_anagraphics_id_from_description(desc)
        _extract_piva_cf_from_description(desc)
    
    logger.info("Preriscaldamento cache completato")

# Performance monitoring
def get_performance_metrics() -> Dict[str, Any]:
    """Ottiene metriche di performance"""
    return {
        'anagraphics_cache_size': len(_anagraphics_cache._data),
        'search_index_size': len(_anagraphics_cache._search_index),
        'piva_cf_index_size': len(_anagraphics_cache._piva_cf_index),
        'lru_cache_info': {
            'extract_piva_cf': _extract_piva_cf_from_description.cache_info()._asdict()
        },
        'cache_expired': _anagraphics_cache.is_expired()
    }

# Funzione di inizializzazione
def initialize_reconciliation_engine():
    """Inizializza il motore di riconciliazione ottimizzato"""
    logger.info("Inizializzazione motore di riconciliazione ottimizzato...")
    
    try:
        # Preriscalda le cache
        warm_up_caches()
        
        # Verifica connessione database
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM Invoices")
            invoice_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM BankTransactions")
            transaction_count = cursor.fetchone()[0]
            
            logger.info(f"Motore inizializzato: {invoice_count} fatture, {transaction_count} transazioni")
            
        return True
    except Exception as e:
        logger.error(f"Errore inizializzazione motore: {e}", exc_info=True)
        return False
