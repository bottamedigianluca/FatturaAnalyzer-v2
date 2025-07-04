# core/reconciliation_v2.py - Versione 2.0 con ulteriori ottimizzazioni

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
from collections import defaultdict, OrderedDict
import numpy as np
from functools import lru_cache, wraps
from contextlib import contextmanager
import threading
from queue import Queue, Empty
import hashlib
import pickle
import gc
import asyncio
from enum import Enum
import psutil
import os

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

# ================== CONFIGURAZIONE AVANZATA ==================

class Config:
    """Configurazione centralizzata e modificabile"""
    # Cache settings
    CACHE_TTL_MINUTES = int(os.getenv('RECON_CACHE_TTL', '15'))
    CACHE_MAX_SIZE = int(os.getenv('RECON_CACHE_MAX_SIZE', '10000'))
    CACHE_EVICTION_PERCENT = float(os.getenv('RECON_CACHE_EVICTION_PCT', '0.2'))

    # Performance settings
    MAX_COMBINATION_SIZE = int(os.getenv('RECON_MAX_COMBO_SIZE', '5'))
    MAX_SEARCH_TIME_MS = int(os.getenv('RECON_MAX_SEARCH_MS', '30000'))
    BATCH_SIZE = int(os.getenv('RECON_BATCH_SIZE', '100'))

    # Matching thresholds
    MIN_CONFIDENCE_SCORE = float(os.getenv('RECON_MIN_CONFIDENCE', '0.15'))
    HIGH_CONFIDENCE_THRESHOLD = float(os.getenv('RECON_HIGH_CONFIDENCE', '0.6'))

    # Threading
    MAX_WORKERS = int(os.getenv('RECON_MAX_WORKERS', '4'))

    # Memory management
    MEMORY_LIMIT_MB = int(os.getenv('RECON_MEMORY_LIMIT_MB', '500'))

# ================== CACHE THREAD-SAFE AVANZATA ==================

@dataclass
class AnagraphicsCacheV2:
    """Cache thread-safe con eviction policy e memory management"""
    _data: OrderedDict = field(default_factory=OrderedDict)
    _timestamp: Optional[datetime] = None
    _ttl_minutes: int = Config.CACHE_TTL_MINUTES
    _max_size: int = Config.CACHE_MAX_SIZE
    _search_index: Dict[str, Set[int]] = field(default_factory=dict)
    _piva_cf_index: Dict[str, int] = field(default_factory=dict)
    _lock: threading.RLock = field(default_factory=threading.RLock)
    _access_count: Dict[int, int] = field(default_factory=dict)
    _last_access: Dict[int, datetime] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """Verifica se la cache è scaduta"""
        with self._lock:
            if not self._timestamp:
                return True
            return (datetime.now() - self._timestamp).total_seconds() > self._ttl_minutes * 60

    def _evict_lru(self):
        """Evict least recently used items quando la cache è piena"""
        if len(self._data) < self._max_size:
            return
        
        items_to_remove = int(self._max_size * Config.CACHE_EVICTION_PERCENT)
        
        sorted_items = sorted(
            self._data.items(),
            key=lambda x: self._last_access.get(x[0], datetime.min)
        )
        
        for anag_id, _ in sorted_items[:items_to_remove]:
            self._remove_item(anag_id)
            
        logger.debug(f"Cache eviction: rimossi {items_to_remove} elementi LRU")

    def _remove_item(self, anag_id: int):
        """Rimuove un elemento dalla cache e dai suoi indici"""
        if anag_id not in self._data:
            return
            
        anag_data = self._data[anag_id]
        
        if anag_data['piva']:
            self._piva_cf_index.pop(anag_data['piva'], None)
        if anag_data['cf']:
            self._piva_cf_index.pop(anag_data['cf'], None)
            
        for word in anag_data.get('search_words', set()):
            if word in self._search_index:
                self._search_index[word].discard(anag_id)
                if not self._search_index[word]:
                    del self._search_index[word]
        
        del self._data[anag_id]
        self._access_count.pop(anag_id, None)
        self._last_access.pop(anag_id, None)

    def clear(self):
        """Pulisce la cache in modo thread-safe"""
        with self._lock:
            self._data.clear()
            self._search_index.clear()
            self._piva_cf_index.clear()
            self._access_count.clear()
            self._last_access.clear()
            self._timestamp = None

    def refresh(self):
        """Aggiorna la cache con gestione memoria ottimizzata"""
        with self._lock:
            logger.debug("Aggiornamento cache anagrafiche V2...")
            self.clear()
            
            process = psutil.Process(os.getpid())
            memory_mb = process.memory_info().rss / 1024 / 1024
            
            if memory_mb > Config.MEMORY_LIMIT_MB:
                logger.warning(f"Memoria utilizzata ({memory_mb:.1f}MB) supera il limite. Skip refresh cache.")
                return
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT id, denomination, piva, cf 
                    FROM Anagraphics 
                    WHERE LENGTH(TRIM(COALESCE(denomination, ''))) >= 3
                    ORDER BY updated_at DESC
                    LIMIT ?
                """, (self._max_size,))
                
                stop_words = {'spa', 'srl', 'snc', 'sas', 'coop', 'societa', 'group', 'holding', 'soc'}
                
                for row in cursor.fetchall():
                    anag_id = row['id']
                    denomination = (row['denomination'] or '').strip()
                    piva = (row['piva'] or '').strip().upper()
                    cf = (row['cf'] or '').strip().upper()
                    
                    denom_words = set(re.findall(r'\b\w{3,}\b', denomination.lower())) - stop_words
                    
                    anag_data = {
                        'denomination': denomination,
                        'piva': piva,
                        'cf': cf,
                        'search_words': denom_words,
                        'full_text': denomination.lower()
                    }
                    
                    self._data[anag_id] = anag_data
                    self._access_count[anag_id] = 0
                    self._last_access[anag_id] = datetime.now()
                    
                    if piva:
                        self._piva_cf_index[piva] = anag_id
                    if cf:
                        self._piva_cf_index[cf] = anag_id
                    
                    for word in denom_words:
                        if word not in self._search_index:
                            self._search_index[word] = set()
                        self._search_index[word].add(anag_id)
                
                self._timestamp = datetime.now()
                logger.debug(f"Cache anagrafiche V2 aggiornata: {len(self._data)} record, {len(self._search_index)} parole indicizzate")

    def get_data(self) -> Dict[int, Dict]:
        """Ottiene i dati aggiornati della cache"""
        with self._lock:
            if self.is_expired():
                self.refresh()
            return dict(self._data)

    def find_by_piva_cf(self, code: str) -> Optional[int]:
        """Ricerca veloce per PIVA/CF con tracking accessi"""
        with self._lock:
            if self.is_expired():
                self.refresh()
            
            anag_id = self._piva_cf_index.get(code.upper())
            if anag_id:
                self._access_count[anag_id] = self._access_count.get(anag_id, 0) + 1
                self._last_access[anag_id] = datetime.now()
            
            return anag_id

    def search_by_words(self, words: Set[str]) -> Set[int]:
        """Ricerca veloce per parole chiave con tracking"""
        with self._lock:
            if self.is_expired():
                self.refresh()
            
            if not words:
                return set()
            
            result_sets = [self._search_index.get(word, set()) for word in words]
            result_sets = [s for s in result_sets if s]
            
            if not result_sets:
                return set()
            
            result_ids = set.intersection(*result_sets) if len(result_sets) > 1 else result_sets[0]
            
            now = datetime.now()
            for anag_id in result_ids:
                self._access_count[anag_id] = self._access_count.get(anag_id, 0) + 1
                self._last_access[anag_id] = now
            
            return result_ids

    def get_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche della cache"""
        with self._lock:
            return {
                'size': len(self._data),
                'max_size': self._max_size,
                'indexed_words': len(self._search_index),
                'piva_cf_indexed': len(self._piva_cf_index),
                'expired': self.is_expired(),
                'age_minutes': (datetime.now() - self._timestamp).total_seconds() / 60 if self._timestamp else 0,
                'total_accesses': sum(self._access_count.values()),
                'memory_mb': psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            }

_anagraphics_cache = AnagraphicsCacheV2()

# ================== DECORATORI E UTILITIES ==================

@contextmanager
def get_db_connection():
    """Context manager per connessioni DB con auto-cleanup"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

def with_performance_logging(func):
    """Decoratore per logging performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        memory_before = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

        try:
            result = func(*args, **kwargs)
            return result
        finally:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            memory_after = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            memory_delta = memory_after - memory_before
            
            if elapsed_ms > 1000 or abs(memory_delta) > 10:
                logger.info(f"[PERF] {func.__name__}: {elapsed_ms:.1f}ms, Δmem: {memory_delta:+.1f}MB")

    return wrapper

def memoize_with_timeout(timeout_seconds=300):
    """Decoratore per cache con timeout"""
    def decorator(func):
        cache = {}
        cache_time = {}
        lock = threading.Lock()

        @wraps(func)
        def wrapper(*args, **kwargs):
            key = hashlib.md5(
                pickle.dumps((args, tuple(sorted(kwargs.items()))))
            ).hexdigest()
            
            with lock:
                if key in cache and (time.time() - cache_time[key]) < timeout_seconds:
                    return cache[key]
                
                result = func(*args, **kwargs)
                
                cache[key] = result
                cache_time[key] = time.time()
                
                current_time = time.time()
                expired_keys = [k for k, t in cache_time.items() 
                               if current_time - t > timeout_seconds]
                for k in expired_keys:
                    del cache[k]
                    del cache_time[k]
                
                return result
        
        wrapper.clear_cache = lambda: cache.clear() or cache_time.clear()
        return wrapper

    return decorator

# ================== MATCH ANALYZER MIGLIORATO ==================

class MatchAnalyzerV2:
    """Versione migliorata con ML-like scoring e pattern recognition"""

    WEIGHTS = {
        'amount_exact': 0.6,
        'amount_similar': 0.4,
        'invoice_number': 0.3,
        'name_exact': 0.25,
        'name_partial': 0.15,
        'temporal': 0.1,
        'sequence': 0.05,
        'pattern': 0.1
    }

    def __init__(self, target_amount: Decimal, description: str, 
                 invoice_numbers: List[str], transaction_date: str):
        self.target_amount = target_amount
        self.description = description.lower() if description else ""
        self.invoice_numbers = invoice_numbers or []
        self.transaction_date = transaction_date
        
        self.desc_words = set(re.findall(r'\b\w{3,}\b', self.description))
        self.desc_numbers = set(re.findall(r'\d+', self.description))

    @lru_cache(maxsize=1024)
    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        """Calcola similarità tra stringhe con algoritmo ottimizzato"""
        if not str1 or not str2:
            return 0.0
        
        s1, s2 = str1.lower(), str2.lower()
        
        if s1 == s2:
            return 1.0
        
        if s1 in s2 or s2 in s1:
            return 0.8
        
        tokens1 = set(re.findall(r'\b\w{3,}\b', s1))
        tokens2 = set(re.findall(r'\b\w{3,}\b', s2))
        
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        
        return intersection / union if union > 0 else 0.0

    def analyze_invoice_match(self, invoice_amount: Decimal, invoice_number: str, 
                            denomination: str, invoice_date: str) -> Dict:
        """Analizza match per fattura con scoring avanzato"""
        scores = defaultdict(float)
        reasons = []
        match_details = defaultdict(bool)
        
        amount_diff = abs(invoice_amount - self.target_amount)
        amount_ratio = amount_diff / self.target_amount if self.target_amount else 0
        
        if amount_diff <= AMOUNT_TOLERANCE:
            scores['amount'] = self.WEIGHTS['amount_exact']
            reasons.append("Importo Esatto")
            match_details['amount'] = True
        elif amount_ratio <= 0.02:
            scores['amount'] = self.WEIGHTS['amount_similar'] * (1 - amount_ratio / 0.02)
            reasons.append(f"Importo ~{(1-amount_ratio)*100:.0f}%")
        
        if invoice_number and self.invoice_numbers:
            best_match_score = 0
            for desc_num in self.invoice_numbers:
                similarity = self._calculate_string_similarity(invoice_number, desc_num)
                if similarity > best_match_score:
                    best_match_score = similarity
            
            if best_match_score >= 0.9:
                scores['invoice_number'] = self.WEIGHTS['invoice_number'] * best_match_score
                reasons.append(f"Num.Fatt:'{invoice_number}'")
                match_details['number'] = True
        
        if denomination and len(denomination) >= 4:
            denom_score = self._analyze_name_match(denomination)
            if denom_score > 0:
                scores['name'] = denom_score
                if denom_score >= self.WEIGHTS['name_exact'] * 0.8:
                    reasons.append(f"Nome:'{denomination[:30]}'")
                    match_details['name'] = True
        
        temporal_score = self._calculate_temporal_score(invoice_date)
        if temporal_score > 0:
            scores['temporal'] = temporal_score
            if temporal_score > self.WEIGHTS['temporal'] * 0.5:
                match_details['date'] = True
        
        pattern_score = self._detect_patterns(invoice_number, denomination)
        if pattern_score > 0:
            scores['pattern'] = pattern_score
        
        total_score = sum(scores.values())
        normalized_score = min(1.0, total_score)
        
        if normalized_score >= Config.HIGH_CONFIDENCE_THRESHOLD:
            confidence_level = 'Alta'
        elif normalized_score >= 0.3:
            confidence_level = 'Media'
        elif normalized_score >= Config.MIN_CONFIDENCE_SCORE:
            confidence_level = 'Bassa'
        else:
            confidence_level = 'Molto Bassa'
        
        return {
            'confidence_score': normalized_score,
            'confidence_level': confidence_level,
            'reasons': reasons,
            'match_details': dict(match_details),
            'score_breakdown': dict(scores)
        }

    def _analyze_name_match(self, denomination: str) -> float:
        """Analisi avanzata del match nome"""
        denom_lower = denomination.lower()
        
        if denom_lower in self.description:
            coverage = len(denom_lower) / len(self.description)
            return self.WEIGHTS['name_exact'] * (0.7 + 0.3 * coverage)
        
        denom_words = set(re.findall(r'\b\w{3,}\b', denom_lower))
        if not denom_words:
            return 0.0
        
        common_words = denom_words & self.desc_words
        if not common_words:
            return 0.0
        
        word_coverage = len(common_words) / len(denom_words)
        desc_coverage = len(common_words) / len(self.desc_words) if self.desc_words else 0
        
        avg_word_len = sum(len(w) for w in common_words) / len(common_words)
        specificity_boost = min(1.2, avg_word_len / 6)
        
        score = self.WEIGHTS['name_partial'] * word_coverage * (0.7 + 0.3 * desc_coverage) * specificity_boost
        return min(score, self.WEIGHTS['name_partial'])

    def _calculate_temporal_score(self, invoice_date_str: str) -> float:
        """Calcola score temporale con decay esponenziale"""
        try:
            if not invoice_date_str or not self.transaction_date:
                return 0.0
            
            inv_date = pd.to_datetime(invoice_date_str).date()
            trans_date = pd.to_datetime(self.transaction_date).date()
            
            days_diff = abs((trans_date - inv_date).days)
            
            if days_diff <= 30:
                score = self.WEIGHTS['temporal'] * (1 - days_diff / 30)
            elif days_diff <= 90:
                score = self.WEIGHTS['temporal'] * 0.3 * np.exp(-(days_diff - 30) / 30)
            else:
                score = 0.0
            
            return max(0, score)
            
        except Exception:
            return 0.0

    def _detect_patterns(self, invoice_number: str, denomination: str) -> float:
        """Rileva pattern comuni per bonus score"""
        pattern_score = 0.0
        
        if invoice_number:
            inv_numbers = re.findall(r'\d+', invoice_number)
            if inv_numbers and self.desc_numbers:
                for inv_num in inv_numbers:
                    for desc_num in self.desc_numbers:
                        try:
                            if abs(int(inv_num) - int(desc_num)) <= 10:
                                pattern_score += 0.03
                        except ValueError:
                            pass
        
        common_refs = {'ord', 'rif', 'contr', 'prot', 'ddt'}
        ref_matches = sum(1 for ref in common_refs if ref in self.description and ref in invoice_number.lower())
        if ref_matches:
            pattern_score += 0.02 * ref_matches
        
        return min(pattern_score, self.WEIGHTS['pattern'])
    
    def _calculate_enhanced_confidence_v2(self, combination, target_amount):
        """Calcola confidenza migliorata per combinazioni N:M"""
        base_confidence = 0.6
        
        total = sum(inv['amount_decimal'] for inv in combination)
        amount_precision = 1.0 - min(1.0, abs(total - target_amount) / target_amount)
        
        date_bonus = _calculate_temporal_coherence(combination)
        sequence_bonus = _calculate_numeric_sequence_bonus(combination)
        size_penalty = max(0, (len(combination) - 3) * 0.05)
        
        final_confidence = (base_confidence + 
                           amount_precision * 0.25 + 
                           date_bonus * 0.1 + 
                           sequence_bonus * 0.1 - 
                           size_penalty)
        
        return max(0.0, min(1.0, final_confidence))

# ================== COMBINATION GENERATOR OTTIMIZZATO ==================

class CombinationGeneratorV2:
    """Generatore combinazioni con algoritmi avanzati e parallelizzazione"""

    def __init__(self, candidates: List[Dict], target_amount: Decimal):
        self.candidates = sorted(candidates, key=lambda x: x['amount_decimal'])
        self.target_amount = target_amount
        self.tolerance = AMOUNT_TOLERANCE
        
        self._precompute_optimization_structures()

    def _precompute_optimization_structures(self):
        """Precomputa strutture per pruning e ottimizzazione"""
        n = len(self.candidates)
        
        self.prefix_sums = [Decimal('0')] * (n + 1)
        for i in range(n):
            self.prefix_sums[i + 1] = self.prefix_sums[i] + self.candidates[i]['amount_decimal']
        
        self.suffix_sums = [Decimal('0')] * (n + 1)
        for i in range(n - 1, -1, -1):
            self.suffix_sums[i] = self.suffix_sums[i + 1] + self.candidates[i]['amount_decimal']
        
        self.min_k_sum = {}
        self.max_k_sum = {}
        for k in range(1, min(6, n + 1)):
            self.min_k_sum[k] = sum(c['amount_decimal'] for c in self.candidates[:k])
            self.max_k_sum[k] = sum(c['amount_decimal'] for c in self.candidates[-k:])

    def can_reach_target(self, current_sum: Decimal, start_idx: int, 
                        remaining_size: int) -> Tuple[bool, bool]:
        """Verifica veloce se è possibile raggiungere il target"""
        if remaining_size == 0:
            return (abs(current_sum - self.target_amount) <= self.tolerance,
                   abs(current_sum - self.target_amount) <= self.tolerance)
        
        if start_idx >= len(self.candidates):
            return False, False
        
        min_possible = current_sum + self.min_k_sum.get(
            remaining_size, 
            sum(c['amount_decimal'] for c in self.candidates[start_idx:start_idx+remaining_size])
        )
        max_possible = current_sum + self.max_k_sum.get(
            remaining_size,
            sum(c['amount_decimal'] for c in self.candidates[max(0, len(self.candidates)-remaining_size):])
        )
        
        can_be_exact = (min_possible <= self.target_amount + self.tolerance and 
                       max_possible >= self.target_amount - self.tolerance)
        can_be_close = (min_possible <= self.target_amount + self.tolerance * 3 and
                       max_possible >= self.target_amount - self.tolerance * 3)
        
        return can_be_exact, can_be_close

    def generate_combinations_parallel(self, size: int, max_iterations: int = 50000) -> List[List[Dict]]:
        """Genera combinazioni in parallelo per size grandi"""
        if size < 3 or len(self.candidates) < 10:
            return list(self.generate_combinations(size, max_iterations))
        
        num_workers = min(Config.MAX_WORKERS, len(self.candidates) // size)
        if num_workers < 2:
            return list(self.generate_combinations(size, max_iterations))
        
        results = []
        chunk_size = len(self.candidates) // num_workers
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = []
            
            for i in range(num_workers):
                start_idx = i * chunk_size
                end_idx = (i + 1) * chunk_size if i < num_workers - 1 else len(self.candidates)
                
                worker_candidates = self.candidates[start_idx:end_idx]
                if len(worker_candidates) >= size:
                    future = executor.submit(
                        self._generate_combinations_subset,
                        worker_candidates, size, max_iterations // num_workers
                    )
                    futures.append(future)
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    worker_results = future.result()
                    results.extend(worker_results)
                except Exception as e:
                    logger.error(f"Errore in worker combinazioni: {e}")
        
        return results

    def _generate_combinations_subset(self, subset: List[Dict], size: int, 
                                    max_iterations: int) -> List[List[Dict]]:
        """Genera combinazioni per un subset di candidati"""
        generator = CombinationGeneratorV2(subset, self.target_amount)
        return list(generator.generate_combinations(size, max_iterations))

    def generate_combinations(self, size: int, max_iterations: int = 10000):
        """Genera combinazioni con algoritmo ottimizzato e pruning avanzato"""
        iterations = 0
        seen_amounts = set()
        
        def _recursive_generate(start_idx: int, current: List[Dict], 
                              current_sum: Decimal, remaining_size: int):
            nonlocal iterations
            iterations += 1
            
            if iterations > max_iterations:
                return
            
            if remaining_size == 0:
                amount_key = str(current_sum.quantize(Decimal('0.01')))
                if amount_key in seen_amounts:
                    return
                
                if abs(current_sum - self.target_amount) <= self.tolerance:
                    seen_amounts.add(amount_key)
                    yield current.copy()
                return
            
            can_exact, can_close = self.can_reach_target(current_sum, start_idx, remaining_size)
            if not can_close:
                return
            
            valid_start = start_idx
            valid_end = len(self.candidates) - remaining_size + 1
            
            left, right = start_idx, valid_end
            while left < right:
                mid = (left + right) // 2
                test_sum = current_sum + self.candidates[mid]['amount_decimal']
                if test_sum > self.target_amount + self.tolerance * remaining_size:
                    right = mid
                else:
                    left = mid + 1
            valid_end = min(valid_end, left + remaining_size)
            
            for i in range(valid_start, valid_end):
                item = self.candidates[i]
                new_sum = current_sum + item['amount_decimal']
                
                if new_sum > self.target_amount + self.tolerance * remaining_size:
                    break
                
                current.append(item)
                yield from _recursive_generate(i + 1, current, new_sum, remaining_size - 1)
                current.pop()
        
        yield from _recursive_generate(0, [], Decimal('0'), size)

# ================== ASYNC RECONCILIATION ENGINE ==================

class AsyncReconciliationEngine:
    """Engine asincrono per operazioni massive"""

    def __init__(self):
        self.queue = asyncio.Queue()
        self.results = {}
        self.running = False

    async def process_suggestions_async(self, items: List[Dict]) -> List[Dict]:
        """Processa suggerimenti in modo asincrono"""
        tasks = []
        
        for item in items:
            if 'transaction_id' in item:
                task = asyncio.create_task(
                    self._process_transaction_async(item['transaction_id'])
                )
                tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        valid_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Errore async processing: {result}")
            else:
                valid_results.extend(result)
        
        return valid_results

    async def _process_transaction_async(self, transaction_id: int) -> List[Dict]:
        """Processa una singola transazione in modo asincrono"""
        await asyncio.sleep(0.001)
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            suggest_reconciliation_matches_enhanced,
            None,
            transaction_id,
            None
        )

# ================== RECONCILIATION OPTIMIZER ==================

class ReconciliationOptimizer:
    """Ottimizzatore globale per riconciliazioni complesse"""

    def __init__(self):
        self.match_cache = {}
        self.pattern_analyzer = PatternAnalyzer()

    def optimize_suggestions(self, suggestions: List[Dict]) -> List[Dict]:
        """Ottimizza e riordina suggerimenti basandosi su pattern globali"""
        if not suggestions:
            return suggestions
        
        patterns = self.pattern_analyzer.analyze_suggestions(suggestions)
        
        for sugg in suggestions:
            pattern_boost = self._calculate_pattern_boost(sugg, patterns)
            sugg['confidence_score'] = min(1.0, sugg.get('confidence_score', 0) + pattern_boost)
        
        groups = self._group_similar_suggestions(suggestions)
        
        optimized = []
        for group in groups:
            best = max(group, key=lambda x: (x.get('confidence_score', 0), -len(x.get('invoice_ids', []))))
            optimized.append(best)
        
        optimized.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        
        return optimized[:20]

    def _calculate_pattern_boost(self, suggestion: Dict, patterns: Dict) -> float:
        """Calcola boost basato su pattern riconosciuti"""
        boost = 0.0
        
        if patterns.get('has_sequences') and suggestion.get('sequence_score', 0) > 0.5:
            boost += 0.05
        
        amounts = [s.get('total_amount', 0) for s in patterns.get('all_suggestions', [])]
        if amounts:
            amount = suggestion.get('total_amount', 0)
            similar_count = sum(1 for a in amounts if abs(a - amount) < 1)
            if similar_count > 2:
                boost += 0.03
        
        if suggestion.get('date_range_days', 999) < 30:
            boost += 0.02
        
        return boost

    def _group_similar_suggestions(self, suggestions: List[Dict]) -> List[List[Dict]]:
        """Raggruppa suggerimenti simili per deduplicazione intelligente"""
        groups = []
        used = set()
        
        for i, sugg in enumerate(suggestions):
            if i in used:
                continue
            
            group = [sugg]
            used.add(i)
            
            for j, other in enumerate(suggestions[i+1:], i+1):
                if j in used:
                    continue
                
                if self._are_similar(sugg, other):
                    group.append(other)
                    used.add(j)
            
            groups.append(group)
        
        return groups

    def _are_similar(self, sugg1: Dict, sugg2: Dict) -> bool:
        """Verifica se due suggerimenti sono simili"""
        ids1 = set(sugg1.get('invoice_ids', []))
        ids2 = set(sugg2.get('invoice_ids', []))
        
        if ids1 == ids2:
            return True
        
        if ids1 and ids2:
            overlap = len(ids1 & ids2) / min(len(ids1), len(ids2))
            if overlap > 0.7:
                return True
        
        amt1 = sugg1.get('total_amount', 0)
        amt2 = sugg2.get('total_amount', 0)
        
        if amt1 and amt2 and abs(amt1 - amt2) < 0.01:
            return True
        
        return False

class PatternAnalyzer:
    """Analizza pattern nei dati per migliorare matching"""

    def analyze_suggestions(self, suggestions: List[Dict]) -> Dict:
        """Analizza pattern globali nei suggerimenti"""
        patterns = {
            'has_sequences': False,
            'common_amounts': [],
            'date_clusters': [],
            'all_suggestions': suggestions
        }
        
        if not suggestions:
            return patterns
        
        sequence_scores = [s.get('sequence_score', 0) for s in suggestions]
        patterns['has_sequences'] = any(score > 0.7 for score in sequence_scores)
        
        amounts = [s.get('total_amount', 0) for s in suggestions]
        amount_counts = defaultdict(int)
        for amt in amounts:
            if amt > 0:
                rounded = float(quantize(to_decimal(amt)))
                amount_counts[rounded] += 1
        
        patterns['common_amounts'] = [
            amt for amt, count in amount_counts.items() if count > 1
        ]
        
        return patterns

# ================== SMART RECONCILIATION ENHANCED ==================

@with_performance_logging
def suggest_cumulative_matches_v2(transaction_id, anagraphics_id_filter=None,
                                  max_combination_size=None, max_search_time_ms=None,
                                  exclude_invoice_ids=None, start_date=None, end_date=None):
    """Versione 2.0 ultra-ottimizzata per match N:M"""
    if max_combination_size is None:
        max_combination_size = Config.MAX_COMBINATION_SIZE
    if max_search_time_ms is None:
        max_search_time_ms = Config.MAX_SEARCH_TIME_MS

    if exclude_invoice_ids is None:
        exclude_invoice_ids = set()

    if anagraphics_id_filter is None:
        logger.info(f"Sugg.N:M V2 T:{transaction_id}: Saltato (nessun filtro anagrafica)")
        return []

    start_time = time.monotonic()
    log_prefix = f"Sugg.N:M V2 T:{transaction_id}"

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT amount, reconciled_amount, description, transaction_date
                FROM BankTransactions 
                WHERE id = ?
            """, (transaction_id,))
            
            trans_row = cursor.fetchone()
            if not trans_row:
                return []
            
            target_amount_signed = quantize(
                to_decimal(trans_row['amount']) - to_decimal(trans_row['reconciled_amount'])
            )
            
            if target_amount_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
                return []
            
            target_amount_abs = target_amount_signed.copy_abs()
            target_invoice_type = 'Attiva' if target_amount_signed > 0 else 'Passiva'
            
            query_params = [
                target_invoice_type,
                anagraphics_id_filter,
                float(AMOUNT_TOLERANCE / 2),
                float(target_amount_abs * 1.5),
                float(target_amount_abs)
            ]
            
            date_filter = ""
            if start_date and end_date:
                date_filter = "AND i.doc_date BETWEEN ? AND ?"
                query_params.extend([start_date, end_date])
            
            query = f"""
                WITH RankedInvoices AS (
                    SELECT 
                        i.id, i.doc_number, i.doc_date, i.total_amount, i.paid_amount,
                        CAST(i.total_amount - i.paid_amount AS REAL) as open_amount,
                        ABS(CAST(i.total_amount - i.paid_amount AS REAL) - ?) as amount_diff,
                        ROW_NUMBER() OVER (ORDER BY ABS(CAST(i.total_amount - i.paid_amount AS REAL) - ?)) as rn
                    FROM Invoices i
                    WHERE i.type = ?
                      AND i.anagraphics_id = ?
                      AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                      AND (i.total_amount - i.paid_amount) > ?
                      AND (i.total_amount - i.paid_amount) <= ?
                      {date_filter}
                )
                SELECT * FROM RankedInvoices
                WHERE rn <= 100
                ORDER BY amount_diff, doc_date DESC
            """
            
            ordered_params = [
                query_params[4],
                query_params[4],  
                query_params[0],
                query_params[1],
                query_params[2],
                query_params[3]
            ]
            if date_filter:
                ordered_params.extend(query_params[5:])
            
            cursor.execute(query, ordered_params)
            rows = cursor.fetchall()
            
            if not rows:
                return []
            
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
                return []
            
            logger.info(f"{log_prefix}: Analisi {len(candidate_invoices)} fatture candidate (V2)")
            
            generator = CombinationGeneratorV2(candidate_invoices, target_amount_abs)
            suggestions = []
            
            for size in range(2, min(4, len(candidate_invoices) + 1)):
                elapsed_ms = (time.monotonic() - start_time) * 1000
                if elapsed_ms > max_search_time_ms * 0.5:
                    break
                
                max_iter = max(5000, int((max_search_time_ms * 0.5 - elapsed_ms) / size))
                
                if size >= 3 and len(candidate_invoices) > 10:
                    combinations = generator.generate_combinations_parallel(size, max_iter)
                else:
                    combinations = generator.generate_combinations(size, max_iter)
                
                for combination in combinations:
                    if isinstance(combination, list):
                        suggestion = _create_suggestion_from_combination(
                            combination, target_amount_abs, anagraphics_id_filter
                        )
                        if suggestion:
                            suggestions.append(suggestion)
                
                if len(suggestions) >= 10:
                    break
            
            if len(suggestions) < 5 and (time.monotonic() - start_time) * 1000 < max_search_time_ms * 0.7:
                for size in range(4, min(max_combination_size + 1, len(candidate_invoices) + 1)):
                    elapsed_ms = (time.monotonic() - start_time) * 1000
                    if elapsed_ms > max_search_time_ms * 0.9:
                        break
                    
                    max_iter = max(1000, int((max_search_time_ms * 0.9 - elapsed_ms) / (size * 2)))
                    
                    for combination in generator.generate_combinations(size, max_iter):
                        suggestion = _create_suggestion_from_combination(
                            combination, target_amount_abs, anagraphics_id_filter
                        )
                        if suggestion:
                            suggestions.append(suggestion)
                            if len(suggestions) >= 15:
                                break
            
            optimizer = ReconciliationOptimizer()
            optimized_suggestions = optimizer.optimize_suggestions(suggestions)
            
            logger.info(f"{log_prefix}: Completato in {time.monotonic() - start_time:.2f}s. {len(optimized_suggestions)} suggerimenti ottimizzati")
            return optimized_suggestions
            
    except Exception as e:
        logger.error(f"{log_prefix}: Errore: {e}", exc_info=True)
        return []

def _create_suggestion_from_combination(combination: List[Dict],
                                        target_amount: Decimal,
                                        anagraphics_id: int) -> Optional[Dict]:
    """Crea un suggerimento da una combinazione"""
    total_amount = sum(inv['amount_decimal'] for inv in combination)

    if abs(total_amount - target_amount) > AMOUNT_TOLERANCE:
        return None

    analyzer = MatchAnalyzerV2(target_amount, "", [], "")
    confidence_score = analyzer._calculate_enhanced_confidence_v2(combination, target_amount)

    return {
        'invoice_ids': [inv['id'] for inv in combination],
        'total_amount': total_amount,
        'num_invoices': len(combination),
        'counterparty': 'N/A',
        'anagraphics_id': anagraphics_id,
        'doc_numbers': [inv['doc_number'] for inv in combination],
        'confidence': _determine_confidence_level(confidence_score),
        'confidence_score': confidence_score,
        'sequence_score': _calculate_sequence_score(combination),
        'date_range_days': _calculate_date_range(combination),
        'explanation': f"Combinazione {len(combination)} fatture (V2)",
        'match_type': 'Optimized'
    }

def _determine_confidence_level(score: float) -> str:
    """Determina livello di confidenza da score"""
    if score >= Config.HIGH_CONFIDENCE_THRESHOLD:
        return 'Alta'
    elif score >= 0.3:
        return 'Media'
    elif score >= Config.MIN_CONFIDENCE_SCORE:
        return 'Bassa'
    else:
        return 'Molto Bassa'

def _calculate_temporal_coherence(combination):
    """Calcola coerenza temporale della combinazione"""
    dates = [inv['doc_date'] for inv in combination if inv['doc_date']]
    if len(dates) < 2:
        return 0.0
    
    try:
        date_objects = [pd.to_datetime(d).date() for d in dates]
        date_range = (max(date_objects) - min(date_objects)).days
        return max(0.0, 1.0 - date_range / 60)
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

# ================== FUNZIONI ORIGINALI MANTENUTE ==================

def _extract_piva_cf_from_description(description: str) -> Tuple[str, ...]:
    """Estrae codici PIVA/CF dalla descrizione con cache"""
    if not description:
        return tuple()
    
    piva_cf_pattern = r'\b(\d{11})\b|\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b'
    matches = re.findall(piva_cf_pattern, description, re.IGNORECASE)
    return tuple(code.upper() for piva, cf in matches if (code := piva or cf))

_extract_piva_cf_from_description = lru_cache(maxsize=128)(_extract_piva_cf_from_description)

def find_anagraphics_id_from_description(description: str) -> Optional[int]:
    """Versione originale con cache V2"""
    return find_anagraphics_id_from_description_v2(description)

@memoize_with_timeout(300)
def find_anagraphics_id_from_description_v2(description: str) -> Optional[int]:
    """Versione V2 ottimizzata con cache temporizzata"""
    if not description:
        return None

    log_prefix = "find_anag_id_v2"
    logger.debug(f"{log_prefix}: Descrizione='{description[:100]}...'")

    codes = _extract_piva_cf_from_description(description)
    for code in codes:
        anag_id = _anagraphics_cache.find_by_piva_cf(code)
        if anag_id:
            logger.info(f"{log_prefix}: Match PIVA/CF veloce -> ID:{anag_id}")
            return anag_id

    desc_lower = description.lower()
    desc_words = set(re.findall(r'\b\w{3,}\b', desc_lower))

    if not desc_words:
        return None

    candidate_ids = _anagraphics_cache.search_by_words(desc_words)
    if not candidate_ids:
        return None

    anagraphics_data = _anagraphics_cache.get_data()
    best_score = 0.0
    best_match_id = None

    for anag_id in candidate_ids:
        if anag_id not in anagraphics_data:
            continue
            
        anag_data = anagraphics_data[anag_id]
        
        if anag_data['full_text'] in desc_lower:
            score = 0.8 + (len(anag_data['full_text']) / len(desc_lower)) * 0.2
            if score > best_score:
                best_score = score
                best_match_id = anag_id
                continue
        
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

class BatchProcessor:
    """Processore batch ottimizzato per aggiornamenti di stato"""
    
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
        
    def update_invoice_statuses_batch(self, invoice_ids: List[int]) -> int:
        """Aggiornamento batch ottimizzato per fatture"""
        if not invoice_ids:
            return 0
        
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
            
            invoice_numbers_in_desc = extract_invoice_number(description)
            
            effective_anag_id_filter = anagraphics_id_ui_filter
            if effective_anag_id_filter is None:
                logger.debug(f"{log_prefix}: Identificazione anagrafica da descrizione...")
                effective_anag_id_filter = find_anagraphics_id_from_description(description)
                logger.info(f"{log_prefix}: ID Anagrafica auto-rilevato: {effective_anag_id_filter}")
            else:
                logger.info(f"{log_prefix}: Utilizzo filtro Anagrafica da UI: {effective_anag_id_filter}")

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
            
            if effective_anag_id_filter is not None:
                base_query += " AND i.anagraphics_id = ?"
                params.append(effective_anag_id_filter)
            
            base_query += " ORDER BY ABS(ABS(i.total_amount - i.paid_amount) - ?) ASC LIMIT 50"
            params.append(float(target_amount_abs))
            
            cursor.execute(base_query, params)
            open_invoices = cursor.fetchall()
            
            logger.info(f"{log_prefix}: Trovate {len(open_invoices)} fatture candidate per analisi 1:1")
            
            match_analyzer = MatchAnalyzerV2(
                target_amount_abs, description, invoice_numbers_in_desc,
                trans['transaction_date']
            )

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
                
                match_result = match_analyzer.analyze_invoice_match(
                    invoice_remaining_abs, inv_number, inv_denomination, inv['doc_date']
                )
                
                if match_result['confidence_score'] >= Config.MIN_CONFIDENCE_SCORE:
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
            
            target_trans_sign = Decimal('1.0') if invoice_type == 'Attiva' else Decimal('-1.0')
            target_trans_amount_signed = invoice_remaining_abs * target_trans_sign
            
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
            
            for trans in open_transactions:
                trans_id = trans['id']
                description = trans['description'] or ""
                
                trans_remaining_signed = quantize(to_decimal(trans['amount']) - to_decimal(trans['reconciled_amount']))
                if trans_remaining_signed.copy_abs() <= AMOUNT_TOLERANCE / 2:
                    continue
                    
                sugg_key = f"T{trans_id}-I{invoice_id}"
                if sugg_key in processed_suggestions:
                    continue

                match_analyzer = MatchAnalyzerV2(
                    invoice_remaining_abs, description, [invoice_number],
                    trans['transaction_date']
                )
                
                match_result = match_analyzer.analyze_invoice_match(
                    trans_remaining_signed.copy_abs(), invoice_number, inv['denomination'], inv['doc_date']
                )
                
                if match_result['confidence_score'] >= Config.MIN_CONFIDENCE_SCORE:
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

        suggestions.sort(key=lambda x: (
            {'Alta': 3, 'Media': 2, 'Bassa': 1}.get(x.get('confidence', 'Bassa'), 0),
            x.get('confidence_score', 0)
        ), reverse=True)

    logger.info(f"{log_prefix}: Ricerca 1:1 completata. Generati {len(suggestions)} suggerimenti.")
    return suggestions

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

class MatchValidator:
    """Validatore ottimizzato per abbinamenti"""
    
    def __init__(self, db_result: Dict, amount_to_match: Decimal):
        self.result = db_result
        self.amount = amount_to_match
        
    def validate(self) -> Dict[str, Union[bool, str]]:
        """Esegue tutte le validazioni"""
        inv_status = self.result['payment_status']
        if inv_status in ('Pagata Tot.', 'Riconciliata', 'Insoluta'):
            return {
                'valid': False,
                'error': f"Fattura {self.result['doc_number']} già '{inv_status}'."
            }
        
        tr_status = self.result['reconciliation_status']
        if tr_status in ('Riconciliato Tot.', 'Riconciliato Eccesso', 'Ignorato'):
            return {
                'valid': False,
                'error': f"Transazione già '{tr_status}'."
            }

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

def apply_manual_match_optimized(invoice_id, transaction_id, amount_to_match_input):
    """Versione ottimizzata dell'abbinamento manuale con validazioni migliorate"""
    try:
        amount_to_match = quantize(to_decimal(amount_to_match_input))
        if amount_to_match <= Decimal('0.0'):
            return False, "Importo deve essere positivo."

        with get_db_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            
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
            
            validator = MatchValidator(result, amount_to_match)
            validation_result = validator.validate()
            
            if not validation_result['valid']:
                raise ValueError(validation_result['error'])

            if not add_or_update_reconciliation_link(conn, invoice_id, transaction_id, amount_to_match):
                raise sqlite3.Error("Errore creazione/aggiornamento link.")

            processor = BatchProcessor(conn)
            processor.update_invoice_statuses_batch([invoice_id])
            processor.update_transaction_statuses_batch([transaction_id])

            conn.commit()
            logger.info(f"Abb. manuale ottimizzato I:{invoice_id} <-> T:{transaction_id} per {amount_to_match:.2f}€ OK.")
            return True, "Abbinamento manuale applicato."

    except (sqlite3.Error, ValueError, Exception) as e:
        logger.error(f"Errore abb. manuale ottimizzato (I:{invoice_id}, T:{transaction_id}): {e}", exc_info=True)
        return False, f"Errore: {e}"

class AutoReconciler:
    """Riconciliatore automatico ottimizzato"""
    
    def __init__(self, processor: BatchProcessor):
        self.processor = processor
        
    def validate_items(self, transaction_ids: List[int], invoice_ids: List[int]) -> Dict:
        """Validazione ottimizzata degli elementi"""
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
            else:
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
                    
                    sign_factor = 1 if trans_avail_signed > 0 else -1
                    current_trans_rem[t_id] -= amount_this_link * sign_factor
                    current_inv_rem[i_id] -= amount_this_link
                    
                    current_trans_rem[t_id] = quantize(current_trans_rem[t_id])
                    current_inv_rem[i_id] = quantize(current_inv_rem[i_id])

                    trans_avail_abs = abs(current_trans_rem[t_id])
                    if trans_avail_abs <= AMOUNT_TOLERANCE / 2:
                        break
        
        return {'links': links_to_create}

def attempt_auto_reconciliation_optimized(transaction_ids, invoice_ids):
    """Versione ottimizzata della riconciliazione automatica N:M"""
    if not transaction_ids or not invoice_ids:
        return False, "Selezionare almeno una transazione e una fattura."

    try:
        with get_db_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            processor = BatchProcessor(conn)
            
            reconciler = AutoReconciler(processor)
            validation_result = reconciler.validate_items(transaction_ids, invoice_ids)
            
            if not validation_result['valid']:
                raise ValueError(validation_result['error'])

            balance_result = reconciler.check_balance(
                validation_result['transactions_data'], 
                validation_result['invoices_data']
            )
            
            if not balance_result['balanced']:
                raise ValueError(balance_result['error'])

            distribution_result = reconciler.distribute_amounts(
                validation_result['transactions_data'],
                validation_result['invoices_data']
            )

            for link in distribution_result['links']:
                if not add_or_update_reconciliation_link(
                    conn, link['invoice_id'], link['transaction_id'], link['amount']
                ):
                    raise sqlite3.Error(f"Errore DB link T:{link['transaction_id']}<->I:{link['invoice_id']}")

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
                
                trans_suggestions = suggest_reconciliation_matches_enhanced(
                    transaction_id=trans_id, 
                    anagraphics_id_ui_filter=None
                )

                exact_matches = self._filter_exact_matches(trans_suggestions)

                if len(exact_matches) == 1:
                    match = exact_matches[0]
                    match_data = self._prepare_match_data(match, trans_row, trans_remaining)
                    
                    if match_data:
                        candidate_matches.append(match_data)
                        logger.info(f"AutoMatchFinder -> Candidato ottimo: T:{trans_id} <-> I:{match_data['invoice_id']} per {match_data['amount']:.2f} (Score: {match.get('confidence_score', 0):.3f})")
        
        candidate_matches.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        return candidate_matches
    
    def _filter_exact_matches(self, suggestions: List[Dict]) -> List[Dict]:
        """Filtra solo match esatti ad alta confidenza"""
        exact_matches = []
        for sugg in suggestions:
            if (sugg.get('confidence') == 'Alta' and 
                'Importo Esatto' in sugg.get('reasons', []) and
                sugg.get('confidence_score', 0) >= Config.HIGH_CONFIDENCE_THRESHOLD):
                exact_matches.append(sugg)
        return exact_matches
    
    def _prepare_match_data(self, match: Dict, trans_row: Dict, trans_remaining: Decimal) -> Optional[Dict]:
        """Prepara i dati del match per il risultato finale"""
        inv_id = match['invoice_ids'][0]
        match_amount = trans_remaining.copy_abs()

        self.cursor.execute("""
            SELECT doc_number, doc_date 
            FROM Invoices 
            WHERE id = ?
        """, (inv_id,))
        
        inv_details_row = self.cursor.fetchone()
        if not inv_details_row:
            return None
            
        inv_details = dict(inv_details_row)

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

def find_automatic_matches_optimized(confidence_level='Exact'):
    """Versione ottimizzata per trovare match automatici"""
    candidate_matches = []
    log_prefix = "[AutoMatchFinder Optimized]"
    logger.info(f"{log_prefix} Avvio ricerca match automatici ottimizzata...")

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()

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

            batch_processor = AutoMatchBatchProcessor(cursor)
            candidate_matches = batch_processor.process_transactions(eligible_transactions)

        logger.info(f"{log_prefix} Ricerca completata. Trovati {len(candidate_matches)} candidati ottimi per auto-riconciliazione.")
        return candidate_matches[:50]

    except sqlite3.Error as db_e:
        logger.error(f"{log_prefix} Errore DB: {db_e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"{log_prefix} Errore generico: {e}", exc_info=True)
        return []

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

# ================== WRAPPER E ALIAS DI COMPATIBILITÀ ==================

CombinationGenerator = CombinationGeneratorV2
MatchAnalyzer = MatchAnalyzerV2

def suggest_cumulative_matches(transaction_id, anagraphics_id_filter=None,
                               max_combination_size=5, max_search_time_ms=30000,
                               exclude_invoice_ids=None, start_date=None, end_date=None):
    """Wrapper che usa la versione V2"""
    return suggest_cumulative_matches_v2(
        transaction_id, anagraphics_id_filter,
        max_combination_size, max_search_time_ms,
        exclude_invoice_ids, start_date, end_date
    )

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

# === UTILITÀ AGGIUNTIVE ===

def get_reconciliation_statistics() -> Dict[str, Any]:
    """Ottiene statistiche ottimizzate sulla riconciliazione"""
    try:
        stats = _anagraphics_cache.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Errore recupero statistiche: {e}")
        return {}

def clear_caches():
    """Pulisce tutte le cache"""
    _anagraphics_cache.clear()
    memoize_with_timeout.clear_cache()
    _extract_piva_cf_from_description.cache_clear()
    MatchAnalyzerV2._calculate_string_similarity.cache_clear()
    logger.info("Cache pulite con successo")

def warm_up_caches():
    """Preriscalda le cache per prestazioni ottimali"""
    logger.info("Preriscaldamento cache in corso...")
    
    _anagraphics_cache.refresh()
    
    test_descriptions = [
        "FATTURA 123 ROSSI MARIO SRL",
        "PAGAMENTO FT001 AZIENDA ESEMPIO SPA",
        "BONIFICO 12345678901"
    ]
    
    for desc in test_descriptions:
        find_anagraphics_id_from_description(desc)
        _extract_piva_cf_from_description(desc)
    
    logger.info("Preriscaldamento cache completato")

def get_performance_metrics() -> Dict[str, Any]:
    """Ottiene metriche di performance"""
    return {
        'anagraphics_cache_stats': _anagraphics_cache.get_stats(),
        'lru_cache_info': {
            'extract_piva_cf': _extract_piva_cf_from_description.cache_info()._asdict(),
            'string_similarity': MatchAnalyzerV2._calculate_string_similarity.cache_info()._asdict()
        }
    }

def initialize_reconciliation_engine():
    """Inizializza il motore di riconciliazione ottimizzato"""
    logger.info("Inizializzazione motore di riconciliazione ottimizzato...")
    
    try:
        warm_up_caches()
        
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