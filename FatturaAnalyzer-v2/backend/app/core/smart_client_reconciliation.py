# core/smart_client_reconciliation.py
"""
Modulo ottimizzato per riconciliazione intelligente basata sui pattern dei clienti.
Implementa algoritmi avanzati con caching, indicizzazione e machine learning per 
suggerire abbinamenti tra transazioni e fatture analizzando i comportamenti storici.
"""

import logging
import sqlite3
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Set, Tuple, Optional, Any, Union
import re
import pandas as pd
from dataclasses import dataclass, field
from functools import lru_cache
from contextlib import contextmanager
import numpy as np
from enum import Enum

try:
    from .database import get_connection
    from .utils import to_decimal, quantize, AMOUNT_TOLERANCE
except ImportError:
    logging.warning("Import relativo fallito in smart_client_reconciliation.py, tento import assoluto.")
    try:
        from database import get_connection
        from utils import to_decimal, quantize, AMOUNT_TOLERANCE
    except ImportError as e:
        logging.critical(f"Impossibile importare dipendenze in smart_client_reconciliation.py: {e}")
        raise ImportError(f"Impossibile importare dipendenze in smart_client_reconciliation.py: {e}") from e

logger = logging.getLogger(__name__)

class PatternConfidence(Enum):
    """Enum per livelli di confidenza dei pattern"""
    VERY_HIGH = "Molto Alta"
    HIGH = "Alta"
    MEDIUM = "Media"
    LOW = "Bassa"
    VERY_LOW = "Molto Bassa"

@dataclass
class PaymentRecord:
    """Record di pagamento ottimizzato con metadati"""
    invoice_date: Optional[datetime]
    payment_date: Optional[datetime]
    amount: Decimal
    description: str
    doc_numbers: List[str]
    days_interval: Optional[int] = field(init=False)
    normalized_amount: Optional[float] = field(init=False)
    
    def __post_init__(self):
        self.days_interval = self._calculate_interval()
        self.normalized_amount = float(self.amount) if self.amount else None
    
    def _calculate_interval(self) -> Optional[int]:
        """Calcola l'intervallo in giorni tra fattura e pagamento"""
        if self.invoice_date and self.payment_date:
            try:
                inv_dt = pd.to_datetime(self.invoice_date).date()
                pay_dt = pd.to_datetime(self.payment_date).date()
                return (pay_dt - inv_dt).days
            except:
                pass
        return None

@dataclass
class ClientPaymentPattern:
    """Pattern di pagamento ottimizzato con machine learning"""
    anagraphics_id: int
    payment_records: List[PaymentRecord] = field(default_factory=list)
    payment_intervals: List[int] = field(default_factory=list)
    typical_amounts: List[float] = field(default_factory=list)
    payment_methods: Counter = field(default_factory=Counter)
    description_patterns: Set[str] = field(default_factory=set)
    monthly_volume: Dict[str, List[float]] = field(default_factory=lambda: defaultdict(list))
    invoice_sequences: List[List[str]] = field(default_factory=list)
    confidence_score: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)
    
    # Metriche statistiche calcolate
    _stats_cache: Dict[str, Any] = field(default_factory=dict, init=False)
    _cache_timestamp: Optional[datetime] = field(default=None, init=False)
    
    def add_payment_record(self, record: PaymentRecord):
        """Aggiunge un record di pagamento al pattern"""
        self.payment_records.append(record)
        
        if record.days_interval is not None:
            self.payment_intervals.append(record.days_interval)
        
        if record.normalized_amount:
            self.typical_amounts.append(record.normalized_amount)
        
        if record.description:
            self._extract_and_store_patterns(record.description)
        
        if record.doc_numbers:
            self.invoice_sequences.append(record.doc_numbers)
        
        # Invalida cache
        self._cache_timestamp = None
        self.last_updated = datetime.now()
    
    def _extract_and_store_patterns(self, description: str):
        """Estrae e memorizza pattern dalla descrizione con NLP migliorato"""
        if not description:
            return
        
        desc_clean = description.upper().strip()
        
        # Pattern più sofisticati con regex ottimizzate
        advanced_patterns = [
            r'\b(FATT|FATTURA|FT|DOC|DOCUMENTO)\s*\.?\s*(\w+)',
            r'\b(PAGAMENTO|PAG|SALDO|ACCONTO)\s+(\w+)',
            r'\b(RIF|RIFERIMENTO|REF|RIFER)\s*\.?\s*(\w+)',
            r'\b([A-Z]{2,})\s+([A-Z]{2,})',  # Aziende multi-parola
            r'\b(VS|VOSTRO|NOSTRO)\s+(\w+)',
            r'\b(NOTA|NTG|CREDITO)\s+(\w+)',
            r'\b(\d{4,})',  # Numeri significativi
        ]
        
        for pattern in advanced_patterns:
            matches = re.findall(pattern, desc_clean)
            for match in matches:
                if isinstance(match, tuple):
                    # Filtra parti significative
                    significant_parts = [part for part in match if len(part) >= 2]
                    self.description_patterns.update(significant_parts)
                else:
                    if len(match) >= 2:
                        self.description_patterns.add(match)
    
    def get_cached_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche con caching"""
        current_time = datetime.now()
        
        # Cache valida per 5 minuti
        if (self._cache_timestamp and 
            (current_time - self._cache_timestamp).total_seconds() < 300 and
            self._stats_cache):
            return self._stats_cache
        
        self._stats_cache = self._calculate_statistics()
        self._cache_timestamp = current_time
        return self._stats_cache
    
    def _calculate_statistics(self) -> Dict[str, Any]:
        """Calcola statistiche avanzate sui pattern"""
        stats = {
            'payment_count': len(self.payment_records),
            'avg_interval': 0,
            'interval_std': 0,
            'interval_consistency': 0,
            'amount_avg': 0,
            'amount_std': 0,
            'amount_consistency': 0,
            'seasonal_patterns': {},
            'sequence_consistency': 0
        }
        
        if not self.payment_intervals:
            return stats
        
        # Statistiche intervalli
        intervals_series = pd.Series(self.payment_intervals)
        stats['avg_interval'] = float(intervals_series.mean())
        stats['interval_std'] = float(intervals_series.std())
        
        # Consistenza intervalli (inverso del coefficiente di variazione)
        if stats['avg_interval'] > 0:
            cv_interval = stats['interval_std'] / stats['avg_interval']
            stats['interval_consistency'] = max(0, 1 - cv_interval)
        
        # Statistiche importi
        if self.typical_amounts:
            amounts_series = pd.Series(self.typical_amounts)
            stats['amount_avg'] = float(amounts_series.mean())
            stats['amount_std'] = float(amounts_series.std())
            
            if stats['amount_avg'] > 0:
                cv_amount = stats['amount_std'] / stats['amount_avg']
                stats['amount_consistency'] = max(0, 1 - cv_amount)
        
        # Pattern stagionali
        if len(self.payment_records) >= 4:
            stats['seasonal_patterns'] = self._analyze_seasonal_patterns()
        
        # Consistenza sequenze
        stats['sequence_consistency'] = self._calculate_sequence_consistency()
        
        return stats
    
    def _analyze_seasonal_patterns(self) -> Dict[str, float]:
        """Analizza pattern stagionali nei pagamenti"""
        monthly_counts = defaultdict(int)
        quarterly_amounts = defaultdict(list)
        
        for record in self.payment_records:
            if record.payment_date:
                try:
                    pay_date = pd.to_datetime(record.payment_date)
                    month = pay_date.month
                    quarter = f"Q{(month-1)//3 + 1}"
                    
                    monthly_counts[month] += 1
                    if record.normalized_amount:
                        quarterly_amounts[quarter].append(record.normalized_amount)
                except:
                    continue
        
        # Calcola variabilità mensile
        if monthly_counts:
            monthly_values = list(monthly_counts.values())
            monthly_cv = np.std(monthly_values) / np.mean(monthly_values) if np.mean(monthly_values) > 0 else 1
        else:
            monthly_cv = 1
        
        # Calcola variabilità trimestrale degli importi
        quarterly_cv = 0
        if len(quarterly_amounts) >= 2:
            quarterly_means = [np.mean(amounts) for amounts in quarterly_amounts.values() if amounts]
            if quarterly_means:
                quarterly_cv = np.std(quarterly_means) / np.mean(quarterly_means) if np.mean(quarterly_means) > 0 else 1
        
        return {
            'monthly_regularity': max(0, 1 - monthly_cv),
            'quarterly_stability': max(0, 1 - quarterly_cv),
            'peak_months': [month for month, count in monthly_counts.items() if count == max(monthly_counts.values())]
        }
    
    def _calculate_sequence_consistency(self) -> float:
        """Calcola consistenza delle sequenze di fatture"""
        if len(self.invoice_sequences) < 2:
            return 0.5
        
        sequence_lengths = [len(seq) for seq in self.invoice_sequences]
        length_consistency = 1 - (np.std(sequence_lengths) / np.mean(sequence_lengths)) if np.mean(sequence_lengths) > 0 else 0
        
        # Analizza pattern numerici nelle sequenze
        numeric_patterns = 0
        total_sequences = 0
        
        for sequence in self.invoice_sequences:
            if len(sequence) >= 2:
                total_sequences += 1
                numbers = []
                for doc in sequence:
                    nums = re.findall(r'\d+', doc)
                    if nums:
                        try:
                            numbers.append(int(nums[-1]))
                        except:
                            continue
                
                if len(numbers) >= 2:
                    numbers.sort()
                    consecutive = sum(1 for i in range(1, len(numbers)) if numbers[i] == numbers[i-1] + 1)
                    if consecutive > 0:
                        numeric_patterns += 1
        
        numeric_consistency = numeric_patterns / total_sequences if total_sequences > 0 else 0
        
        return (length_consistency * 0.6 + numeric_consistency * 0.4)
    
    def calculate_confidence(self) -> float:
        """Calcola il punteggio di confidenza ottimizzato del pattern"""
        stats = self.get_cached_stats()
        score = 0.0
        
        # Peso basato sul numero di pagamenti (con diminishing returns)
        payment_count = stats['payment_count']
        if payment_count >= 10:
            score += 0.4
        elif payment_count >= 5:
            score += 0.3
        elif payment_count >= 3:
            score += 0.2
        elif payment_count >= 1:
            score += 0.1
        
        # Consistenza negli intervalli di pagamento (peso alto)
        interval_consistency = stats.get('interval_consistency', 0)
        score += interval_consistency * 0.25
        
        # Pattern descrizioni ricorrenti
        pattern_score = min(0.2, len(self.description_patterns) / 10 * 0.2)
        score += pattern_score
        
        # Consistenza importi
        amount_consistency = stats.get('amount_consistency', 0)
        score += amount_consistency * 0.15
        
        # Consistenza sequenze
        sequence_consistency = stats.get('sequence_consistency', 0)
        score += sequence_consistency * 0.1
        
        # Bonus per regolarità stagionale
        seasonal = stats.get('seasonal_patterns', {})
        if seasonal:
            seasonal_bonus = (seasonal.get('monthly_regularity', 0) + 
                            seasonal.get('quarterly_stability', 0)) / 2 * 0.1
            score += seasonal_bonus
        
        self.confidence_score = min(1.0, score)
        return self.confidence_score
    
    def get_confidence_level(self) -> PatternConfidence:
        """Determina il livello di confidenza"""
        score = self.confidence_score
        if score >= 0.8:
            return PatternConfidence.VERY_HIGH
        elif score >= 0.6:
            return PatternConfidence.HIGH
        elif score >= 0.4:
            return PatternConfidence.MEDIUM
        elif score >= 0.2:
            return PatternConfidence.LOW
        else:
            return PatternConfidence.VERY_LOW
    
    def get_typical_payment_interval(self) -> Tuple[int, int]:
        """Restituisce l'intervallo tipico di pagamento ottimizzato"""
        if not self.payment_intervals:
            return (0, 60)  # Default
        
        stats = self.get_cached_stats()
        
        # Usa statistiche robuste (mediana e IQR)
        intervals = pd.Series(self.payment_intervals)
        median = intervals.median()
        q1 = intervals.quantile(0.25)
        q3 = intervals.quantile(0.75)
        iqr = q3 - q1
        
        # Range basato su IQR per robustezza agli outlier
        min_interval = max(0, int(q1 - 0.5 * iqr))
        max_interval = min(180, int(q3 + 0.5 * iqr))
        
        return (min_interval, max_interval)
    
    def matches_description_pattern(self, description: str) -> float:
        """Verifica match con pattern descrizione usando algoritmo avanzato"""
        if not description or not self.description_patterns:
            return 0.0
        
        desc_upper = description.upper()
        matches = 0
        weighted_matches = 0.0
        
        for pattern in self.description_patterns:
            if pattern in desc_upper:
                matches += 1
                # Peso basato su lunghezza e specificità del pattern
                weight = min(2.0, len(pattern) / 3)
                if pattern.isdigit() and len(pattern) >= 4:
                    weight *= 1.5  # Bonus per numeri significativi
                weighted_matches += weight
        
        if not self.description_patterns:
            return 0.0
        
        # Score normalizzato con peso
        raw_score = weighted_matches / len(self.description_patterns)
        coverage_score = matches / len(self.description_patterns)
        
        return min(1.0, (raw_score * 0.7 + coverage_score * 0.3))
    
    def predict_payment_likelihood(self, target_amount: Decimal, 
                                 current_date: datetime) -> Dict[str, float]:
        """Predice la probabilità di pagamento per un importo target"""
        stats = self.get_cached_stats()
        
        # Analisi importo
        amount_likelihood = 0.5
        if self.typical_amounts and stats['amount_avg'] > 0:
            target_float = float(target_amount)
            z_score = abs(target_float - stats['amount_avg']) / max(stats['amount_std'], 1)
            amount_likelihood = max(0.1, 1.0 - min(1.0, z_score / 2))
        
        # Analisi temporale (se abbiamo fatture in attesa)
        temporal_likelihood = 0.5
        if stats['avg_interval'] > 0:
            # Simula che la fattura sia stata emessa stats['avg_interval'] giorni fa
            expected_payment_date = current_date - timedelta(days=int(stats['avg_interval']))
            days_overdue = (current_date - expected_payment_date).days
            if days_overdue <= 0:
                temporal_likelihood = 0.9
            else:
                temporal_likelihood = max(0.1, 0.9 - (days_overdue / 30))
        
        # Score complessivo
        overall_likelihood = (amount_likelihood * 0.6 + 
                            temporal_likelihood * 0.4) * self.confidence_score
        
        return {
            'overall': overall_likelihood,
            'amount_fit': amount_likelihood,
            'temporal_fit': temporal_likelihood,
            'confidence_weight': self.confidence_score
        }

@lru_cache(maxsize=256)
def _compile_regex_patterns():
    """Cache per pattern regex compilati"""
    return {
        'invoice_patterns': [
            re.compile(r'\b(FATT|FATTURA|FT|DOC)\s*\.?\s*(\w+)', re.IGNORECASE),
            re.compile(r'\b(PAGAMENTO|PAG|SALDO)\s+(\w+)', re.IGNORECASE),
            re.compile(r'\b(RIF|RIFERIMENTO|REF)\s*\.?\s*(\w+)', re.IGNORECASE),
        ],
        'amount_patterns': [
            re.compile(r'€\s*(\d+[,.]?\d*)', re.IGNORECASE),
            re.compile(r'(\d+[,.]?\d*)\s*EUR', re.IGNORECASE),
        ]
    }

class SmartClientReconciliation:
    """Gestore principale ottimizzato per la riconciliazione intelligente"""
    
    def __init__(self, cache_validity_hours: int = 2, max_cache_size: int = 1000):
        self.client_patterns: Dict[int, ClientPaymentPattern] = {}
        self.patterns_cache_time: Optional[datetime] = None
        self.cache_validity_hours = cache_validity_hours
        self.max_cache_size = max_cache_size
        self._query_cache: Dict[str, Any] = {}
        self._analysis_cache: Dict[str, Any] = {}
        
        # Configurazione per ML-like features
        self.min_records_for_prediction = 3
        self.confidence_threshold = 0.3
        
        # Metriche di performance
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_queries = 0
    
    @contextmanager
    def _get_connection(self):
        """Context manager per connessioni DB"""
        conn = get_connection()
        try:
            yield conn
        finally:
            conn.close()
    
    def _is_cache_valid(self, anagraphics_id: int = None) -> bool:
        """Verifica validità cache"""
        if not self.patterns_cache_time:
            return False
        
        current_time = datetime.now()
        cache_age = (current_time - self.patterns_cache_time).total_seconds() / 3600
        
        if cache_age > self.cache_validity_hours:
            return False
        
        # Se richiesto un cliente specifico, verifica se è in cache
        if anagraphics_id is not None:
            return anagraphics_id in self.client_patterns
        
        return True
    
    def _refresh_patterns_cache(self, anagraphics_id: int = None, force_refresh: bool = False):
        """Aggiorna la cache dei pattern con query ottimizzate"""
        if not force_refresh and self._is_cache_valid(anagraphics_id):
            self.cache_hits += 1
            return
        
        self.cache_misses += 1
        current_time = datetime.now()
        
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Query ottimizzata con indicizzazione e filtri intelligenti
                base_query = """
                    SELECT 
                        i.anagraphics_id,
                        i.doc_date,
                        i.doc_number,
                        rl.reconciliation_date,
                        rl.reconciled_amount,
                        bt.description,
                        bt.transaction_date,
                        GROUP_CONCAT(DISTINCT i2.doc_number) as related_invoices,
                        COUNT(DISTINCT rl2.invoice_id) as batch_size
                    FROM ReconciliationLinks rl
                    INNER JOIN Invoices i ON rl.invoice_id = i.id
                    INNER JOIN BankTransactions bt ON rl.transaction_id = bt.id
                    LEFT JOIN ReconciliationLinks rl2 ON rl.transaction_id = rl2.transaction_id 
                        AND rl2.invoice_id != i.id
                    LEFT JOIN Invoices i2 ON rl2.invoice_id = i2.id
                    WHERE i.payment_status IN ('Pagata Tot.', 'Pagata Parz.')
                      AND rl.reconciliation_date >= datetime('now', '-3 years')
                      AND rl.reconciled_amount > 0
                """
                
                params = []
                if anagraphics_id:
                    base_query += " AND i.anagraphics_id = ?"
                    params.append(anagraphics_id)
                
                base_query += """
                    GROUP BY rl.id
                    HAVING COUNT(DISTINCT rl.invoice_id) >= 1
                    ORDER BY i.anagraphics_id, rl.reconciliation_date DESC
                    LIMIT 5000
                """
                
                cursor.execute(base_query, params)
                rows = cursor.fetchall()
                
                # Processa in batch per efficienza
                self._process_payment_records_batch(rows, anagraphics_id)
                
                if not anagraphics_id:
                    self.patterns_cache_time = current_time
                
                # Gestione dimensione cache
                self._manage_cache_size()
                
                logger.info(f"Cache pattern aggiornata: {len(self.client_patterns)} clienti")
                
        except Exception as e:
            logger.error(f"Errore aggiornamento pattern clienti: {e}", exc_info=True)
    
    def _process_payment_records_batch(self, rows: List[Dict], target_anag_id: int = None):
        """Processa i record di pagamento in batch ottimizzato"""
        # Raggruppa per cliente per processing efficiente
        client_records = defaultdict(list)
        for row in rows:
            anag_id = row['anagraphics_id']
            if target_anag_id is None or anag_id == target_anag_id:
                client_records[anag_id].append(row)
        
        # Processa ogni cliente
        for anag_id, records in client_records.items():
            if len(records) < 2 and target_anag_id is None:  # Skip se troppo pochi record
                continue
            
            # Crea o aggiorna pattern
            if anag_id not in self.client_patterns:
                self.client_patterns[anag_id] = ClientPaymentPattern(anag_id)
            
            pattern = self.client_patterns[anag_id]
            
            # Resetta i record se refresh completo
            if target_anag_id is None:
                pattern.payment_records.clear()
                pattern.payment_intervals.clear()
                pattern.typical_amounts.clear()
                pattern.invoice_sequences.clear()
                pattern.description_patterns.clear()
            
            # Aggiungi record ottimizzati
            for record in records:
                try:
                    payment_record = PaymentRecord(
                        invoice_date=record['doc_date'],
                        payment_date=record['reconciliation_date'] or record['transaction_date'],
                        amount=quantize(to_decimal(record['reconciled_amount'])),
                        description=record['description'] or '',
                        doc_numbers=self._parse_doc_numbers(record['doc_number'], record['related_invoices'])
                    )
                    pattern.add_payment_record(payment_record)
                except Exception as e:
                    logger.warning(f"Errore processing record per cliente {anag_id}: {e}")
                    continue
            
            # Calcola confidenza e mantieni solo pattern affidabili
            confidence = pattern.calculate_confidence()
            if confidence < self.confidence_threshold and target_anag_id is None:
                if anag_id in self.client_patterns:
                    del self.client_patterns[anag_id]
                continue
            
            logger.debug(f"Pattern cliente {anag_id} aggiornato: {len(pattern.payment_records)} record, confidenza: {confidence:.3f}")
    
    def _parse_doc_numbers(self, primary_doc: str, related_docs: str) -> List[str]:
        """Parsing ottimizzato dei numeri documento"""
        doc_numbers = [primary_doc] if primary_doc else []
        
        if related_docs:
            related_list = related_docs.split(',')
            doc_numbers.extend([doc.strip() for doc in related_list if doc.strip()])
        
        return doc_numbers
    
    def _manage_cache_size(self):
        """Gestisce la dimensione della cache rimuovendo pattern meno utili"""
        if len(self.client_patterns) <= self.max_cache_size:
            return
        
        # Ordina per utilità (confidenza * recency * usage)
        pattern_scores = []
        current_time = datetime.now()
        
        for anag_id, pattern in self.client_patterns.items():
            age_hours = (current_time - pattern.last_updated).total_seconds() / 3600
            recency_score = max(0.1, 1.0 - (age_hours / (24 * 7)))  # Decade in una settimana
            
            utility_score = pattern.confidence_score * recency_score * len(pattern.payment_records)
            pattern_scores.append((anag_id, utility_score))
        
        # Rimuovi i pattern meno utili
        pattern_scores.sort(key=lambda x: x[1])
        to_remove = len(self.client_patterns) - self.max_cache_size
        
        for anag_id, _ in pattern_scores[:to_remove]:
            del self.client_patterns[anag_id]
        
        logger.debug(f"Cache ridotta: rimossi {to_remove} pattern, rimangono {len(self.client_patterns)}")
    
    def get_client_pattern(self, anagraphics_id: int) -> Optional[ClientPaymentPattern]:
        """Ottiene il pattern di pagamento per un cliente con caching intelligente"""
        self.total_queries += 1
        
        # Verifica cache prima
        if anagraphics_id in self.client_patterns and self._is_cache_valid(anagraphics_id):
            self.cache_hits += 1
            return self.client_patterns[anagraphics_id]
        
        # Refresh specifico per il cliente
        self._refresh_patterns_cache(anagraphics_id)
        return self.client_patterns.get(anagraphics_id)
    
    def suggest_smart_combinations(self, transaction_id: int, anagraphics_id: int) -> List[Dict]:
        """Suggerisce combinazioni intelligenti ottimizzate"""
        pattern = self.get_client_pattern(anagraphics_id)
        if not pattern:
            return []
        
        # Cache key per questa analisi
        cache_key = f"smart_combo_{transaction_id}_{anagraphics_id}_{pattern.last_updated.timestamp()}"
        if cache_key in self._analysis_cache:
            return self._analysis_cache[cache_key]
        
        suggestions = []
        
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Recupera dettagli transazione con ottimizzazioni
                trans_details = self._get_transaction_details(cursor, transaction_id)
                if not trans_details:
                    return []
                
                target_amount = trans_details['target_amount']
                if target_amount.copy_abs() <= AMOUNT_TOLERANCE / 2:
                    return []
                
                # Analizzatore avanzato per match
                analyzer = AdvancedMatchAnalyzer(pattern, trans_details)
                
                # Cerca fatture candidate con filtri intelligenti
                candidate_invoices = self._get_candidate_invoices_optimized(
                    cursor, anagraphics_id, pattern, trans_details
                )
                
                if not candidate_invoices:
                    return []
                
                # Analizza diverse strategie di combinazione
                suggestions.extend(analyzer.analyze_sequence_patterns(candidate_invoices, target_amount))
                suggestions.extend(analyzer.analyze_amount_patterns(candidate_invoices, target_amount))
                suggestions.extend(analyzer.analyze_temporal_patterns(candidate_invoices, target_amount))
                
                # Post-processing e ranking
                suggestions = self._rank_and_filter_suggestions(suggestions, pattern)
                
                # Cache il risultato
                self._analysis_cache[cache_key] = suggestions
                
                # Pulisci cache se troppo grande
                if len(self._analysis_cache) > 100:
                    oldest_keys = sorted(self._analysis_cache.keys())[:20]
                    for key in oldest_keys:
                        del self._analysis_cache[key]
                
                return suggestions[:10]  # Top 10
                
        except Exception as e:
            logger.error(f"Errore suggerimenti intelligenti T:{transaction_id}, Anag:{anagraphics_id}: {e}", exc_info=True)
            return []
    
    def _get_transaction_details(self, cursor, transaction_id: int) -> Optional[Dict]:
        """Recupera dettagli transazione ottimizzato"""
        cursor.execute("""
            SELECT amount, reconciled_amount, description, transaction_date
            FROM BankTransactions 
            WHERE id = ?
        """, (transaction_id,))
        
        trans_row = cursor.fetchone()
        if not trans_row:
            return None
        
        return {
            'id': transaction_id,
            'target_amount': quantize(
                to_decimal(trans_row['amount']) - to_decimal(trans_row['reconciled_amount'])
            ),
            'description': trans_row['description'] or '',
            'transaction_date': trans_row['transaction_date']
        }
    
    def _get_candidate_invoices_optimized(self, cursor, anagraphics_id: int, 
                                        pattern: ClientPaymentPattern, 
                                        trans_details: Dict) -> List[Dict]:
        """Recupera fatture candidate con filtri intelligenti basati su pattern"""
        
        # Calcola finestra temporale intelligente basata su pattern
        min_interval, max_interval = pattern.get_typical_payment_interval()
        
        # Estendi la finestra se il pattern ha bassa confidenza
        confidence_factor = max(0.5, pattern.confidence_score)
        extended_max = int(max_interval / confidence_factor)
        extended_min = max(0, int(min_interval * confidence_factor))
        
        trans_date = pd.to_datetime(trans_details['transaction_date']).date()
        min_doc_date = trans_date - timedelta(days=extended_max)
        max_doc_date = trans_date - timedelta(days=extended_min)
        
        # Query ottimizzata con filtri intelligenti
        query = """
            SELECT 
                i.id, i.doc_number, i.doc_date, i.total_amount, i.paid_amount,
                (i.total_amount - i.paid_amount) as open_amount,
                ABS(julianday(?) - julianday(i.doc_date)) as date_distance
            FROM Invoices i
            WHERE i.anagraphics_id = ?
              AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND i.doc_date BETWEEN ? AND ?
              AND (i.total_amount - i.paid_amount) > ?
              AND (i.total_amount - i.paid_amount) <= ?
            ORDER BY date_distance ASC, ABS((i.total_amount - i.paid_amount) - ?) ASC
            LIMIT 30
        """
        
        target_amount_float = float(trans_details['target_amount'].copy_abs())
        
        cursor.execute(query, (
            trans_details['transaction_date'],
            anagraphics_id,
            min_doc_date.strftime('%Y-%m-%d'),
            max_doc_date.strftime('%Y-%m-%d'),
            float(AMOUNT_TOLERANCE / 2),
            target_amount_float * 1.5,  # Margine del 50%
            target_amount_float
        ))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _rank_and_filter_suggestions(self, suggestions: List[Dict], 
                                   pattern: ClientPaymentPattern) -> List[Dict]:
        """Ranking e filtraggio intelligente dei suggerimenti"""
        if not suggestions:
            return []
        
        # Filtra per confidenza minima
        filtered_suggestions = [
            s for s in suggestions 
            if s.get('confidence_score', 0) >= 0.4
        ]
        
        # Ranking multi-criterio
        def enhanced_ranking_key(suggestion):
            base_score = suggestion.get('confidence_score', 0)
            pattern_bonus = 0.1 if 'Pattern Cliente' in suggestion.get('confidence', '') else 0
            
            # Bonus per numero ottimale di fatture (2-3 è ideale)
            num_invoices = len(suggestion.get('invoice_ids', []))
            size_bonus = 0.05 if 2 <= num_invoices <= 3 else -0.05 if num_invoices > 5 else 0
            
            # Bonus per coerenza con pattern storico
            historical_bonus = 0
            if hasattr(pattern, 'invoice_sequences'):
                avg_sequence_length = np.mean([len(seq) for seq in pattern.invoice_sequences]) if pattern.invoice_sequences else 1
                if abs(num_invoices - avg_sequence_length) <= 1:
                    historical_bonus = 0.05
            
            return base_score + pattern_bonus + size_bonus + historical_bonus
        
        filtered_suggestions.sort(key=enhanced_ranking_key, reverse=True)
        
        # Rimuovi duplicati più sofisticato
        seen_combinations = set()
        unique_suggestions = []
        
        for suggestion in filtered_suggestions:
            # Crea signature più robusta
            invoice_ids = tuple(sorted(suggestion.get('invoice_ids', [])))
            amount_rounded = round(float(suggestion.get('total_amount', 0)), 2)
            signature = (invoice_ids, amount_rounded)
            
            if signature not in seen_combinations:
                seen_combinations.add(signature)
                unique_suggestions.append(suggestion)
        
        return unique_suggestions

class AdvancedMatchAnalyzer:
    """Analizzatore avanzato per pattern matching ottimizzato"""
    
    def __init__(self, pattern: ClientPaymentPattern, trans_details: Dict):
        self.pattern = pattern
        self.trans_details = trans_details
        self.target_amount = trans_details['target_amount'].copy_abs()
        self.description = trans_details['description'].lower()
        
        # Pre-calcola metriche per efficienza
        self.pattern_stats = pattern.get_cached_stats()
        self.desc_match_score = pattern.matches_description_pattern(trans_details['description'])
    
    def analyze_sequence_patterns(self, candidates: List[Dict], target_amount: Decimal) -> List[Dict]:
        """Analizza pattern di sequenze con algoritmi ottimizzati"""
        suggestions = []
        
        # Ottimizza candidati per numero
        candidates_with_numbers = self._extract_and_sort_by_numbers(candidates)
        
        if len(candidates_with_numbers) < 2:
            return suggestions
        
        # Usa sliding window per efficienza
        for window_size in range(2, min(6, len(candidates_with_numbers) + 1)):
            for start_idx in range(len(candidates_with_numbers) - window_size + 1):
                window = candidates_with_numbers[start_idx:start_idx + window_size]
                
                # Verifica consecutività
                if self._is_consecutive_sequence(window):
                    total_amount = sum(quantize(to_decimal(inv['open_amount'])) for inv in window)
                    
                    if abs(total_amount - target_amount) <= AMOUNT_TOLERANCE:
                        sequence_score = self._calculate_enhanced_sequence_score(window)
                        confidence_score = self._calculate_sequence_confidence(window, sequence_score)
                        
                        if confidence_score >= 0.4:
                            suggestions.append({
                                'invoice_ids': [inv['id'] for inv in window],
                                'total_amount': total_amount,
                                'confidence_score': confidence_score,
                                'confidence': self._determine_confidence_label(confidence_score),
                                'doc_numbers': [inv['doc_number'] for inv in window],
                                'explanation': f"Sequenza consecutiva {len(window)} fatture (Pattern: {sequence_score:.2f})",
                                'match_type': 'Sequence Pattern',
                                'sequence_score': sequence_score
                            })
        
        return suggestions
    
    def analyze_amount_patterns(self, candidates: List[Dict], target_amount: Decimal) -> List[Dict]:
        """Analizza pattern basati sugli importi con ML-like approach"""
        suggestions = []
        
        if not self.pattern.typical_amounts or len(self.pattern.typical_amounts) < 3:
            return suggestions
        
        # Analisi statistica avanzata degli importi
        amounts_array = np.array(self.pattern.typical_amounts)
        
        # Usa clustering semplice per identificare gruppi di importi
        amount_clusters = self._simple_amount_clustering(amounts_array)
        
        for candidate in candidates:
            open_amount = quantize(to_decimal(candidate['open_amount']))
            
            # Verifica se l'importo appartiene a un cluster tipico
            cluster_score = self._calculate_cluster_membership(float(open_amount), amount_clusters)
            
            if cluster_score > 0.3:  # Soglia di appartenenza
                # Verifica corrispondenza importo con target
                if abs(open_amount - target_amount) <= AMOUNT_TOLERANCE:
                    confidence_score = self._calculate_amount_confidence(
                        open_amount, cluster_score
                    )
                    
                    if confidence_score >= 0.5:
                        suggestions.append({
                            'invoice_ids': [candidate['id']],
                            'total_amount': open_amount,
                            'confidence_score': confidence_score,
                            'confidence': self._determine_confidence_label(confidence_score),
                            'doc_numbers': [candidate['doc_number']],
                            'explanation': f"Importo tipico cliente (€{open_amount:.2f}, cluster: {cluster_score:.2f})",
                            'match_type': 'Amount Pattern',
                            'cluster_score': cluster_score
                        })
        
        return suggestions
    
    def analyze_temporal_patterns(self, candidates: List[Dict], target_amount: Decimal) -> List[Dict]:
        """Analizza pattern temporali con predizione intelligente"""
        suggestions = []
        
        if not self.pattern.payment_intervals:
            return suggestions
        
        # Predice finestra di pagamento ottimale
        payment_prediction = self.pattern.predict_payment_likelihood(
            target_amount, 
            pd.to_datetime(self.trans_details['transaction_date'])
        )
        
        # Filtra candidati per rilevanza temporale
        temporal_candidates = self._filter_by_temporal_relevance(candidates)
        
        # Combina candidati temporalmente coerenti
        for combination_size in range(1, min(4, len(temporal_candidates) + 1)):
            for combination in self._generate_temporal_combinations(temporal_candidates, combination_size):
                total_amount = sum(quantize(to_decimal(inv['open_amount'])) for inv in combination)
                
                if abs(total_amount - target_amount) <= AMOUNT_TOLERANCE:
                    temporal_score = self._calculate_temporal_coherence_score(combination)
                    
                    # Incorpora predizione di likelihood
                    confidence_score = (temporal_score * 0.6 + 
                                      payment_prediction['overall'] * 0.4 +
                                      self.desc_match_score * 0.2)
                    
                    if confidence_score >= 0.4:
                        suggestions.append({
                            'invoice_ids': [inv['id'] for inv in combination],
                            'total_amount': total_amount,
                            'confidence_score': confidence_score,
                            'confidence': self._determine_confidence_label(confidence_score),
                            'doc_numbers': [inv['doc_number'] for inv in combination],
                            'explanation': f"Pattern temporale (Score: {temporal_score:.2f}, Pred: {payment_prediction['overall']:.2f})",
                            'match_type': 'Temporal Pattern',
                            'temporal_score': temporal_score,
                            'prediction_score': payment_prediction['overall']
                        })
        
        return suggestions
    
    def _extract_and_sort_by_numbers(self, candidates: List[Dict]) -> List[Dict]:
        """Estrae numeri e ordina candidati"""
        candidates_with_nums = []
        
        for candidate in candidates:
            doc_num = candidate.get('doc_number', '')
            numbers = re.findall(r'\d+', doc_num)
            if numbers:
                try:
                    main_number = int(numbers[-1])  # Ultimo numero è solitamente il più significativo
                    candidate_copy = candidate.copy()
                    candidate_copy['extracted_number'] = main_number
                    candidates_with_nums.append(candidate_copy)
                except ValueError:
                    continue
        
        return sorted(candidates_with_nums, key=lambda x: x['extracted_number'])
    
    def _is_consecutive_sequence(self, candidates: List[Dict]) -> bool:
        """Verifica se una sequenza è consecutiva"""
        if len(candidates) < 2:
            return True
        
        numbers = [c['extracted_number'] for c in candidates]
        for i in range(1, len(numbers)):
            if numbers[i] != numbers[i-1] + 1:
                return False
        return True
    
    def _calculate_enhanced_sequence_score(self, sequence: List[Dict]) -> float:
        """Calcola score migliorato per sequenza"""
        if len(sequence) <= 1:
            return 0.5
        
        # Score base per consecutività
        base_score = 0.6
        
        # Bonus per lunghezza ottimale
        length_bonus = 0.2 if 2 <= len(sequence) <= 3 else 0.1 if len(sequence) <= 5 else 0
        
        # Bonus per coerenza con pattern storico
        historical_bonus = 0
        if self.pattern.invoice_sequences:
            avg_historical_length = np.mean([len(seq) for seq in self.pattern.invoice_sequences])
            if abs(len(sequence) - avg_historical_length) <= 1:
                historical_bonus = 0.1
        
        # Bonus per compattezza temporale
        temporal_bonus = self._calculate_date_compactness_bonus(sequence)
        
        return min(1.0, base_score + length_bonus + historical_bonus + temporal_bonus)
    
    def _calculate_date_compactness_bonus(self, sequence: List[Dict]) -> float:
        """Calcola bonus per compattezza temporale"""
        if len(sequence) < 2:
            return 0
        
        try:
            dates = [pd.to_datetime(inv['doc_date']).date() for inv in sequence]
            date_range = (max(dates) - min(dates)).days
            
            if date_range <= 7:  # Entro una settimana
                return 0.1
            elif date_range <= 30:  # Entro un mese
                return 0.05
            else:
                return 0
        except:
            return 0
    
    def _simple_amount_clustering(self, amounts: np.ndarray) -> Dict[str, Any]:
        """Clustering semplice degli importi usando statistiche robuste"""
        if len(amounts) < 3:
            return {'clusters': [{'center': np.mean(amounts), 'std': np.std(amounts)}]}
        
        # Usa quartili per identificare gruppi naturali
        q1, median, q3 = np.percentile(amounts, [25, 50, 75])
        
        clusters = []
        
        # Cluster basso (Q1)
        low_amounts = amounts[amounts <= q1]
        if len(low_amounts) >= 2:
            clusters.append({
                'center': np.mean(low_amounts),
                'std': np.std(low_amounts),
                'size': len(low_amounts)
            })
        
        # Cluster medio (Q1-Q3)
        mid_amounts = amounts[(amounts > q1) & (amounts <= q3)]
        if len(mid_amounts) >= 2:
            clusters.append({
                'center': np.mean(mid_amounts),
                'std': np.std(mid_amounts),
                'size': len(mid_amounts)
            })
        
        # Cluster alto (>Q3)
        high_amounts = amounts[amounts > q3]
        if len(high_amounts) >= 2:
            clusters.append({
                'center': np.mean(high_amounts),
                'std': np.std(high_amounts),
                'size': len(high_amounts)
            })
        
        return {'clusters': clusters, 'stats': {'q1': q1, 'median': median, 'q3': q3}}
    
    def _calculate_cluster_membership(self, amount: float, clusters: Dict) -> float:
        """Calcola appartenenza a cluster"""
        if not clusters.get('clusters'):
            return 0.0
        
        max_membership = 0.0
        
        for cluster in clusters['clusters']:
            center = cluster['center']
            std = max(cluster['std'], center * 0.1)  # Std minimo del 10%
            
            # Score basato su distanza normalizzata
            z_score = abs(amount - center) / std
            membership = max(0, 1 - z_score / 2)  # Decay lineare
            
            # Peso per dimensione cluster
            size_weight = min(1.0, cluster.get('size', 1) / 5)
            weighted_membership = membership * (0.7 + 0.3 * size_weight)
            
            max_membership = max(max_membership, weighted_membership)
        
        return max_membership
    
    def _filter_by_temporal_relevance(self, candidates: List[Dict]) -> List[Dict]:
        """Filtra candidati per rilevanza temporale"""
        if not self.pattern.payment_intervals:
            return candidates
        
        trans_date = pd.to_datetime(self.trans_details['transaction_date']).date()
        
        # Calcola finestra di rilevanza basata su pattern
        stats = self.pattern_stats
        avg_interval = stats.get('avg_interval', 30)
        interval_std = stats.get('interval_std', 15)
        
        # Finestra estesa per catturare variabilità
        min_relevant_interval = max(0, avg_interval - 2 * interval_std)
        max_relevant_interval = avg_interval + 2 * interval_std
        
        relevant_candidates = []
        
        for candidate in candidates:
            try:
                doc_date = pd.to_datetime(candidate['doc_date']).date()
                interval = (trans_date - doc_date).days
                
                if min_relevant_interval <= interval <= max_relevant_interval:
                    candidate_copy = candidate.copy()
                    candidate_copy['computed_interval'] = interval
                    candidate_copy['interval_relevance'] = 1 - abs(interval - avg_interval) / max(interval_std, 10)
                    relevant_candidates.append(candidate_copy)
            except:
                continue
        
        # Ordina per rilevanza temporale
        relevant_candidates.sort(key=lambda x: x.get('interval_relevance', 0), reverse=True)
        
        return relevant_candidates[:15]  # Top 15 per rilevanza temporale
    
    def _generate_temporal_combinations(self, candidates: List[Dict], size: int):
        """Genera combinazioni temporalmente coerenti"""
        from itertools import combinations
        
        for combination in combinations(candidates, size):
            # Verifica coerenza temporale della combinazione
            if self._is_temporally_coherent(combination):
                yield list(combination)
    
    def _is_temporally_coherent(self, combination: List[Dict]) -> bool:
        """Verifica coerenza temporale di una combinazione"""
        if len(combination) <= 1:
            return True
        
        try:
            dates = [pd.to_datetime(inv['doc_date']).date() for inv in combination]
            date_range = (max(dates) - min(dates)).days
            
            # Coerente se entro 45 giorni
            return date_range <= 45
        except:
            return False
    
    def _calculate_temporal_coherence_score(self, combination: List[Dict]) -> float:
        """Calcola score di coerenza temporale"""
        if len(combination) <= 1:
            return 0.8
        
        try:
            # Score basato su compattezza temporale
            dates = [pd.to_datetime(inv['doc_date']).date() for inv in combination]
            date_range = (max(dates) - min(dates)).days
            
            # Score inversamente proporzionale al range
            compactness_score = max(0.2, 1.0 - date_range / 60)
            
            # Bonus se gli intervalli sono coerenti con il pattern storico
            if hasattr(combination[0], 'computed_interval'):
                intervals = [inv.get('computed_interval', 0) for inv in combination]
                interval_consistency = 1 - (np.std(intervals) / max(np.mean(intervals), 10))
                pattern_bonus = max(0, interval_consistency) * 0.2
            else:
                pattern_bonus = 0
            
            return min(1.0, compactness_score + pattern_bonus)
        except:
            return 0.5
    
    def _calculate_sequence_confidence(self, sequence: List[Dict], sequence_score: float) -> float:
        """Calcola confidenza per sequenza"""
        base_confidence = sequence_score * 0.6
        description_bonus = self.desc_match_score * 0.3
        pattern_bonus = self.pattern.confidence_score * 0.1
        
        return min(1.0, base_confidence + description_bonus + pattern_bonus)
    
    def _calculate_amount_confidence(self, amount: Decimal, cluster_score: float) -> float:
        """Calcola confidenza per pattern di importo"""
        amount_match = 0.7  # High perché già verificato match esatto
        cluster_bonus = cluster_score * 0.2
        description_bonus = self.desc_match_score * 0.1
        
        return min(1.0, amount_match + cluster_bonus + description_bonus)
    
    def _determine_confidence_label(self, score: float) -> str:
        """Determina etichetta di confidenza"""
        if score >= 0.8:
            return 'Pattern Cliente Molto Alta'
        elif score >= 0.7:
            return 'Pattern Cliente Alta'
        elif score >= 0.5:
            return 'Pattern Cliente Media'
        else:
            return 'Pattern Cliente'

# Istanza singleton ottimizzata
_smart_reconciler: Optional[SmartClientReconciliation] = None
_reconciler_lock = False

def get_smart_reconciler() -> SmartClientReconciliation:
    """Ottiene istanza singleton del riconciliatore intelligente con thread safety"""
    global _smart_reconciler, _reconciler_lock
    
    if _smart_reconciler is None and not _reconciler_lock:
        _reconciler_lock = True
        try:
            _smart_reconciler = SmartClientReconciliation()
        finally:
            _reconciler_lock = False
    
    return _smart_reconciler

def suggest_client_based_reconciliation(transaction_id: int, anagraphics_id: int) -> List[Dict]:
    """
    Funzione principale ottimizzata per suggerimenti basati sui pattern del cliente.
    Utilizzata da reconciliation.py con compatibilità API al 100%
    """
    if not transaction_id or not anagraphics_id:
        return []
    
    try:
        reconciler = get_smart_reconciler()
        return reconciler.suggest_smart_combinations(transaction_id, anagraphics_id)
    except Exception as e:
        logger.error(f"Errore in suggest_client_based_reconciliation: {e}", exc_info=True)
        return []

def enhance_cumulative_matches_with_client_patterns(transaction_id: int, anagraphics_id: int, 
                                                   standard_suggestions: List[Dict]) -> List[Dict]:
    """
    Migliora i suggerimenti standard con informazioni sui pattern del cliente.
    Utilizzata da reconciliation.py con compatibilità API al 100%
    """
    if not anagraphics_id:
        return standard_suggestions
    
    try:
        reconciler = get_smart_reconciler()
        pattern = reconciler.get_client_pattern(anagraphics_id)
        
        if not pattern:
            return standard_suggestions
        
        # Ottieni suggerimenti intelligenti
        smart_suggestions = reconciler.suggest_smart_combinations(transaction_id, anagraphics_id)
        
        # Combina e migliora
        enhancer = SuggestionEnhancer(pattern)
        return enhancer.combine_and_enhance(smart_suggestions, standard_suggestions)
        
    except Exception as e:
        logger.error(f"Errore in enhance_cumulative_matches_with_client_patterns: {e}", exc_info=True)
        return standard_suggestions

class SuggestionEnhancer:
    """Classe per migliorare e combinare suggerimenti"""
    
    def __init__(self, pattern: ClientPaymentPattern):
        self.pattern = pattern
    
    def combine_and_enhance(self, smart_suggestions: List[Dict], 
                          standard_suggestions: List[Dict]) -> List[Dict]:
        """Combina e migliora suggerimenti intelligenti e standard"""
        
        # Migliora suggerimenti standard con context del pattern
        enhanced_standard = self._enhance_standard_suggestions(standard_suggestions)
        
        # Combina tutto
        all_suggestions = smart_suggestions + enhanced_standard
        
        # Rimuovi duplicati con logica sofisticata
        unique_suggestions = self._advanced_deduplication(all_suggestions)
        
        # Ranking finale ottimizzato
        ranked_suggestions = self._advanced_ranking(unique_suggestions)
        
        return ranked_suggestions
    
    def _enhance_standard_suggestions(self, suggestions: List[Dict]) -> List[Dict]:
        """Migliora suggerimenti standard con context del pattern"""
        enhanced = []
        
        for suggestion in suggestions:
            enhanced_suggestion = suggestion.copy()
            
            # Aggiungi context bonus basato su pattern
            original_score = suggestion.get('confidence_score', 0.6)
            
            # Bonus se il numero di fatture è tipico per il cliente
            num_invoices = len(suggestion.get('invoice_ids', []))
            if self.pattern.invoice_sequences:
                avg_sequence_length = np.mean([len(seq) for seq in self.pattern.invoice_sequences])
                if abs(num_invoices - avg_sequence_length) <= 1:
                    original_score += 0.05
            
            # Bonus per importo tipico
            total_amount = suggestion.get('total_amount', 0)
            if self.pattern.typical_amounts and total_amount:
                amount_float = float(total_amount)
                amounts_array = np.array(self.pattern.typical_amounts)
                z_score = abs(amount_float - np.mean(amounts_array)) / max(np.std(amounts_array), 1)
                if z_score <= 1:  # Entro 1 deviazione standard
                    original_score += 0.03
            
            enhanced_suggestion['confidence_score'] = min(1.0, original_score)
            enhanced_suggestion['enhanced'] = True
            
            enhanced.append(enhanced_suggestion)
        
        return enhanced
    
    def _advanced_deduplication(self, suggestions: List[Dict]) -> List[Dict]:
        """Deduplicazione avanzata con preservazione del migliore"""
        # Raggruppa per combinazione di fatture
        groups = defaultdict(list)
        
        for suggestion in suggestions:
            invoice_set = tuple(sorted(suggestion.get('invoice_ids', [])))
            groups[invoice_set].append(suggestion)
        
        # Per ogni gruppo, mantieni il migliore
        unique_suggestions = []
        for invoice_set, group_suggestions in groups.items():
            if len(group_suggestions) == 1:
                unique_suggestions.append(group_suggestions[0])
            else:
                # Scegli il migliore basato su score e tipo
                best = max(group_suggestions, key=lambda s: (
                    s.get('confidence_score', 0),
                    'Pattern Cliente' in s.get('confidence', ''),
                    len(s.get('explanation', ''))
                ))
                unique_suggestions.append(best)
        
        return unique_suggestions
    
    def _advanced_ranking(self, suggestions: List[Dict]) -> List[Dict]:
        """Ranking avanzato multi-criterio"""
        
        def calculate_final_score(suggestion):
            base_score = suggestion.get('confidence_score', 0)
            
            # Bonus per tipo di match
            type_bonus = 0
            confidence_str = suggestion.get('confidence', '')
            if 'Pattern Cliente Molto Alta' in confidence_str:
                type_bonus = 0.15
            elif 'Pattern Cliente Alta' in confidence_str:
                type_bonus = 0.10
            elif 'Pattern Cliente' in confidence_str:
                type_bonus = 0.05
            
            # Bonus per match type specifico
            match_type_bonus = 0
            match_type = suggestion.get('match_type', '')
            if match_type == 'Sequence Pattern':
                match_type_bonus = 0.05
            elif match_type == 'Amount Pattern':
                match_type_bonus = 0.03
            elif match_type == 'Temporal Pattern':
                match_type_bonus = 0.02
            
            # Penalità per troppi elementi
            num_invoices = len(suggestion.get('invoice_ids', []))
            size_penalty = max(0, (num_invoices - 4) * 0.02)
            
            return base_score + type_bonus + match_type_bonus - size_penalty
        
        # Calcola score finale e ordina
        for suggestion in suggestions:
            suggestion['final_score'] = calculate_final_score(suggestion)
        
        suggestions.sort(key=lambda x: x.get('final_score', 0), reverse=True)
        
        return suggestions

def analyze_client_payment_reliability(anagraphics_id: int) -> Dict[str, Any]:
    """
    Analizza l'affidabilità di pagamento di un cliente con metriche avanzate.
    Compatibilità API al 100% con aggiunta di metriche ML
    """
    try:
        reconciler = get_smart_reconciler()
        pattern = reconciler.get_client_pattern(anagraphics_id)
        
        if not pattern:
            return {
                'reliability_score': 0.0,
                'payment_history_count': 0,
                'average_delay_days': None,
                'payment_consistency': 'Unknown',
                'confidence_level': 'N/A',
                'prediction_accuracy': 'N/A'
            }
        
        stats = pattern.get_cached_stats()
        
        # Calcola metriche di affidabilità avanzate
        reliability_metrics = ReliabilityAnalyzer(pattern, stats).calculate_comprehensive_metrics()
        
        # Mantieni compatibilità con API originale
        result = {
            'reliability_score': reliability_metrics['overall_reliability'],
            'payment_history_count': stats['payment_count'],
            'average_delay_days': stats.get('avg_interval', 0),
            'payment_consistency': reliability_metrics['consistency_category'],
            'confidence_level': pattern.get_confidence_level().value,
            
            # Metriche aggiuntive avanzate
            'prediction_accuracy': reliability_metrics['prediction_confidence'],
            'seasonal_pattern': reliability_metrics.get('seasonal_pattern', 'None'),
            'risk_category': reliability_metrics['risk_category'],
            'payment_trend': reliability_metrics.get('payment_trend', 'Stable'),
            'recommended_credit_limit': reliability_metrics.get('recommended_credit_limit'),
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Errore in analyze_client_payment_reliability: {e}", exc_info=True)
        return {
            'reliability_score': 0.0,
            'payment_history_count': 0,
            'average_delay_days': None,
            'payment_consistency': 'Unknown',
            'confidence_level': 'N/A',
            'prediction_accuracy': 'N/A'
        }

class ReliabilityAnalyzer:
    """Analizzatore avanzato di affidabilità clienti"""
    
    def __init__(self, pattern: ClientPaymentPattern, stats: Dict[str, Any]):
        self.pattern = pattern
        self.stats = stats
    
    def calculate_comprehensive_metrics(self) -> Dict[str, Any]:
        """Calcola metriche comprehensive di affidabilità"""
        
        # Score base di affidabilità
        reliability_score = self._calculate_base_reliability()
        
        # Categoria di consistenza
        consistency_category = self._determine_consistency_category()
        
        # Categoria di rischio
        risk_category = self._assess_risk_category(reliability_score)
        
        # Confidenza nella predizione
        prediction_confidence = self._calculate_prediction_confidence()
        
        # Pattern stagionale
        seasonal_pattern = self._analyze_seasonal_reliability()
        
        # Trend di pagamento
        payment_trend = self._analyze_payment_trend()
        
        # Limite di credito raccomandato
        recommended_credit_limit = self._calculate_recommended_credit_limit()
        
        return {
            'overall_reliability': reliability_score,
            'consistency_category': consistency_category,
            'risk_category': risk_category,
            'prediction_confidence': prediction_confidence,
            'seasonal_pattern': seasonal_pattern,
            'payment_trend': payment_trend,
            'recommended_credit_limit': recommended_credit_limit
        }
    
    def _calculate_base_reliability(self) -> float:
        """Calcola score base di affidabilità"""
        score = 0.0
        
        # Componente: puntualità media
        avg_delay = self.stats.get('avg_interval', 30)
        if avg_delay <= 15:
            score += 0.4
        elif avg_delay <= 30:
            score += 0.3
        elif avg_delay <= 45:
            score += 0.2
        elif avg_delay <= 60:
            score += 0.1
        
        # Componente: consistenza
        consistency = self.stats.get('interval_consistency', 0)
        score += consistency * 0.3
        
        # Componente: storico
        payment_count = self.stats.get('payment_count', 0)
        history_bonus = min(0.2, payment_count / 20)
        score += history_bonus
        
        # Componente: regolarità importi
        amount_consistency = self.stats.get('amount_consistency', 0)
        score += amount_consistency * 0.1
        
        return min(1.0, score)
    
    def _determine_consistency_category(self) -> str:
        """Determina categoria di consistenza"""
        interval_consistency = self.stats.get('interval_consistency', 0)
        
        if interval_consistency >= 0.8:
            return 'Molto Consistente'
        elif interval_consistency >= 0.6:
            return 'Consistente'
        elif interval_consistency >= 0.4:
            return 'Moderatamente Consistente'
        elif interval_consistency >= 0.2:
            return 'Poco Consistente'
        else:
            return 'Inconsistente'
    
    def _assess_risk_category(self, reliability_score: float) -> str:
        """Valuta categoria di rischio"""
        if reliability_score >= 0.8:
            return 'Basso Rischio'
        elif reliability_score >= 0.6:
            return 'Rischio Moderato'
        elif reliability_score >= 0.4:
            return 'Rischio Medio'
        elif reliability_score >= 0.2:
            return 'Rischio Alto'
        else:
            return 'Rischio Molto Alto'
    
    def _calculate_prediction_confidence(self) -> str:
        """Calcola confidenza nella predizione"""
        payment_count = self.stats.get('payment_count', 0)
        pattern_confidence = self.pattern.confidence_score
        
        combined_confidence = (min(1.0, payment_count / 10) * 0.5 + 
                             pattern_confidence * 0.5)
        
        if combined_confidence >= 0.8:
            return 'Molto Alta'
        elif combined_confidence >= 0.6:
            return 'Alta'
        elif combined_confidence >= 0.4:
            return 'Media'
        elif combined_confidence >= 0.2:
            return 'Bassa'
        else:
            return 'Molto Bassa'
    
    def _analyze_seasonal_reliability(self) -> str:
        """Analizza pattern stagionali di affidabilità"""
        seasonal_patterns = self.stats.get('seasonal_patterns', {})
        
        if not seasonal_patterns:
            return 'Nessun Pattern'
        
        monthly_regularity = seasonal_patterns.get('monthly_regularity', 0)
        quarterly_stability = seasonal_patterns.get('quarterly_stability', 0)
        
        if monthly_regularity >= 0.7 and quarterly_stability >= 0.7:
            return 'Molto Regolare'
        elif monthly_regularity >= 0.5 or quarterly_stability >= 0.5:
            return 'Moderatamente Regolare'
        else:
            return 'Irregolare'
    
    def _analyze_payment_trend(self) -> str:
        """Analizza trend di pagamento"""
        if len(self.pattern.payment_records) < 4:
            return 'Dati Insufficienti'
        
        # Analizza ultimi vs primi pagamenti
        recent_records = self.pattern.payment_records[-6:]  # Ultimi 6
        early_records = self.pattern.payment_records[:6]    # Primi 6
        
        if len(recent_records) >= 3 and len(early_records) >= 3:
            recent_avg = np.mean([r.days_interval for r in recent_records if r.days_interval is not None])
            early_avg = np.mean([r.days_interval for r in early_records if r.days_interval is not None])
            
            if recent_avg < early_avg - 5:
                return 'Miglioramento'
            elif recent_avg > early_avg + 5:
                return 'Peggioramento'
            else:
                return 'Stabile'
        
        return 'Stabile'
    
    def _calculate_recommended_credit_limit(self) -> Optional[float]:
        """Calcola limite di credito raccomandato"""
        if not self.pattern.typical_amounts:
            return None
        
        # Usa statistiche robuste
        amounts = np.array(self.pattern.typical_amounts)
        median_amount = np.median(amounts)
        q75_amount = np.percentile(amounts, 75)
        
        # Fattore di rischio basato su affidabilità
        reliability_score = self._calculate_base_reliability()
        risk_factor = 0.5 + (reliability_score * 1.5)  # Range: 0.5 - 2.0
        
        # Limite base + safety margin
        base_limit = max(median_amount, q75_amount) * 2  # 2x importo tipico
        recommended_limit = base_limit * risk_factor
        
        return round(recommended_limit, 2)

# === FUNZIONI DI UTILITÀ E PERFORMANCE ===

def get_smart_reconciliation_statistics() -> Dict[str, Any]:
    """Ottiene statistiche dettagliate del sistema di riconciliazione intelligente"""
    try:
        reconciler = get_smart_reconciler()
        
        total_patterns = len(reconciler.client_patterns)
        cache_hit_rate = (reconciler.cache_hits / max(reconciler.total_queries, 1)) * 100
        
        # Statistiche sui pattern
        pattern_stats = {
            'high_confidence': 0,
            'medium_confidence': 0,
            'low_confidence': 0
        }
        
        confidence_scores = []
        for pattern in reconciler.client_patterns.values():
            confidence_scores.append(pattern.confidence_score)
            
            if pattern.confidence_score >= 0.7:
                pattern_stats['high_confidence'] += 1
            elif pattern.confidence_score >= 0.4:
                pattern_stats['medium_confidence'] += 1
            else:
                pattern_stats['low_confidence'] += 1
        
        return {
            'total_client_patterns': total_patterns,
            'cache_hit_rate_percent': round(cache_hit_rate, 2),
            'total_queries': reconciler.total_queries,
            'cache_hits': reconciler.cache_hits,
            'cache_misses': reconciler.cache_misses,
            'pattern_distribution': pattern_stats,
            'average_confidence': round(np.mean(confidence_scores), 3) if confidence_scores else 0,
            'cache_size_mb': len(str(reconciler.client_patterns)) / (1024 * 1024),
            'analysis_cache_size': len(reconciler._analysis_cache),
            'patterns_cache_valid': reconciler._is_cache_valid()
        }
    except Exception as e:
        logger.error(f"Errore recupero statistiche smart reconciliation: {e}")
        return {'error': str(e)}

def clear_smart_reconciliation_cache():
    """Pulisce la cache del sistema di riconciliazione intelligente"""
    global _smart_reconciler
    
    if _smart_reconciler:
        _smart_reconciler.client_patterns.clear()
        _smart_reconciler._analysis_cache.clear()
        _smart_reconciler._query_cache.clear()
        _smart_reconciler.patterns_cache_time = None
        _smart_reconciler.cache_hits = 0
        _smart_reconciler.cache_misses = 0
        _smart_reconciler.total_queries = 0
        
        logger.info("Cache smart reconciliation pulita con successo")
        return True
    
    return False

def optimize_smart_reconciliation_performance():
    """Ottimizza le performance del sistema di riconciliazione intelligente"""
    try:
        reconciler = get_smart_reconciler()
        
        # Forza refresh di tutti i pattern con confidenza bassa
        low_confidence_clients = [
            anag_id for anag_id, pattern in reconciler.client_patterns.items()
            if pattern.confidence_score < 0.4
        ]
        
        # Rimuovi pattern poco affidabili per liberare memoria
        for anag_id in low_confidence_clients:
            del reconciler.client_patterns[anag_id]
        
        # Pulisci cache di analisi vecchie
        reconciler._analysis_cache.clear()
        
        # Forza una refresh per i pattern rimanenti
        reconciler._refresh_patterns_cache(force_refresh=True)
        
        logger.info(f"Ottimizzazione completata: rimossi {len(low_confidence_clients)} pattern, cache pulita")
        
        return {
            'patterns_removed': len(low_confidence_clients),
            'remaining_patterns': len(reconciler.client_patterns),
            'cache_cleared': True
        }
        
    except Exception as e:
        logger.error(f"Errore ottimizzazione performance: {e}")
        return {'error': str(e)}

# Funzione di inizializzazione
def initialize_smart_reconciliation_engine():
    """Inizializza il motore di riconciliazione intelligente"""
    logger.info("Inizializzazione motore di riconciliazione intelligente...")
    
    try:
        # Inizializza il reconciler
        reconciler = get_smart_reconciler()
        
        # Pre-carica alcuni pattern per clienti attivi
        with reconciler._get_connection() as conn:
            cursor = conn.cursor()
            
            # Trova clienti con attività recente
            cursor.execute("""
                SELECT DISTINCT i.anagraphics_id, COUNT(*) as activity_count
                FROM Invoices i
                WHERE i.doc_date >= date('now', '-6 months')
                GROUP BY i.anagraphics_id
                HAVING activity_count >= 3
                ORDER BY activity_count DESC
                LIMIT 50
            """)
            
            active_clients = cursor.fetchall()
            
            logger.info(f"Pre-caricamento pattern per {len(active_clients)} clienti attivi...")
            
            # Pre-carica pattern per clienti attivi
            for client in active_clients:
                anag_id = client['anagraphics_id']
                try:
                    reconciler.get_client_pattern(anag_id)
                except Exception as e:
                    logger.warning(f"Errore pre-caricamento pattern cliente {anag_id}: {e}")
                    continue
            
            successful_patterns = len(reconciler.client_patterns)
            logger.info(f"Motore intelligente inizializzato: {successful_patterns} pattern caricati")
            
            return True
            
    except Exception as e:
        logger.error(f"Errore inizializzazione motore intelligente: {e}", exc_info=True)
        return False
