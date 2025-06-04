# core/smart_client_reconciliation.py
"""
Modulo per riconciliazione intelligente basata sui pattern dei clienti.
Implementa algoritmi avanzati per suggerire abbinamenti tra transazioni e fatture
analizzando i comportamenti storici di pagamento dei clienti.
"""

import logging
import sqlite3
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Set, Tuple, Optional, Any
import re
import pandas as pd

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

class ClientPaymentPattern:
    """Rappresenta i pattern di pagamento di un cliente"""
    
    def __init__(self, anagraphics_id: int):
        self.anagraphics_id = anagraphics_id
        self.payment_intervals = []  # giorni tra fattura e pagamento
        self.typical_amounts = []    # importi tipici
        self.payment_methods = Counter()  # metodi di pagamento usati
        self.description_patterns = set()  # pattern nelle descrizioni
        self.monthly_volume = defaultdict(list)  # volume mensile
        self.invoice_sequences = []  # sequenze di fatture pagate insieme
        self.confidence_score = 0.0
        
    def add_payment_record(self, invoice_date, payment_date, amount, description, doc_numbers):
        """Aggiunge un record di pagamento al pattern"""
        if invoice_date and payment_date:
            try:
                inv_dt = pd.to_datetime(invoice_date).date()
                pay_dt = pd.to_datetime(payment_date).date()
                interval = (pay_dt - inv_dt).days
                self.payment_intervals.append(interval)
            except:
                pass
        
        if amount:
            self.typical_amounts.append(amount)
        
        if description:
            # Estrai pattern dalla descrizione
            self._extract_description_patterns(description)
        
        if doc_numbers:
            self.invoice_sequences.append(doc_numbers)
    
    def _extract_description_patterns(self, description: str):
        """Estrae pattern significativi dalla descrizione"""
        if not description:
            return
        
        desc_clean = description.upper().strip()
        
        # Pattern comuni
        patterns = [
            r'\b(FATT|FATTURA|FT|DOC|DOCUMENTO)\s*\.?\s*(\w+)',
            r'\b(PAGAMENTO|PAG|SALDO)\s+(\w+)',
            r'\b(RIF|RIFERIMENTO|REF)\s*\.?\s*(\w+)',
            r'\b([A-Z]{2,})\s+([A-Z]{2,})',  # Aziende con più parole
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, desc_clean)
            for match in matches:
                if isinstance(match, tuple):
                    self.description_patterns.update(match)
                else:
                    self.description_patterns.add(match)
    
    def calculate_confidence(self):
        """Calcola il punteggio di confidenza del pattern"""
        score = 0.0
        
        # Più pagamenti = maggiore confidenza
        payment_count = len(self.payment_intervals)
        if payment_count >= 5:
            score += 0.3
        elif payment_count >= 3:
            score += 0.2
        elif payment_count >= 1:
            score += 0.1
        
        # Consistenza negli intervalli di pagamento
        if self.payment_intervals:
            intervals_std = pd.Series(self.payment_intervals).std()
            if intervals_std < 5:  # Molto consistente
                score += 0.2
            elif intervals_std < 15:  # Abbastanza consistente
                score += 0.1
        
        # Pattern descrizioni ricorrenti
        if len(self.description_patterns) >= 2:
            score += 0.2
        
        # Importi simili
        if len(self.typical_amounts) >= 2:
            amounts_std = pd.Series(self.typical_amounts).std()
            avg_amount = pd.Series(self.typical_amounts).mean()
            if avg_amount > 0:
                cv = amounts_std / avg_amount  # Coefficiente di variazione
                if cv < 0.2:  # Importi molto simili
                    score += 0.2
                elif cv < 0.5:  # Importi abbastanza simili
                    score += 0.1
        
        self.confidence_score = min(1.0, score)
        return self.confidence_score
    
    def get_typical_payment_interval(self) -> Tuple[int, int]:
        """Restituisce l'intervallo tipico di pagamento (min, max giorni)"""
        if not self.payment_intervals:
            return (0, 60)  # Default
        
        intervals = pd.Series(self.payment_intervals)
        median = intervals.median()
        std = intervals.std()
        
        # Usa median +/- std come range tipico
        min_interval = max(0, int(median - std))
        max_interval = min(180, int(median + std))  # Max 6 mesi
        
        return (min_interval, max_interval)
    
    def matches_description_pattern(self, description: str) -> float:
        """Verifica se una descrizione corrisponde ai pattern del cliente"""
        if not description or not self.description_patterns:
            return 0.0
        
        desc_upper = description.upper()
        matches = 0
        
        for pattern in self.description_patterns:
            if pattern in desc_upper:
                matches += 1
        
        return min(1.0, matches / len(self.description_patterns))

class SmartClientReconciliation:
    """Gestore principale per la riconciliazione intelligente"""
    
    def __init__(self):
        self.client_patterns = {}  # anagraphics_id -> ClientPaymentPattern
        self.patterns_cache_time = None
        self.cache_validity_hours = 2
    
    def _refresh_patterns_cache(self, anagraphics_id: int = None):
        """Aggiorna la cache dei pattern per un cliente specifico o tutti"""
        current_time = datetime.now()
        
        # Verifica se cache è ancora valida
        if (self.patterns_cache_time and 
            (current_time - self.patterns_cache_time).total_seconds() < self.cache_validity_hours * 3600 and
            anagraphics_id in self.client_patterns):
            return
        
        conn = None
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Query per recuperare storico pagamenti
            query = """
                SELECT 
                    i.anagraphics_id,
                    i.doc_date,
                    i.doc_number,
                    rl.reconciliation_date,
                    rl.reconciled_amount,
                    bt.description,
                    bt.transaction_date,
                    GROUP_CONCAT(i2.doc_number) as related_invoices
                FROM ReconciliationLinks rl
                JOIN Invoices i ON rl.invoice_id = i.id
                JOIN BankTransactions bt ON rl.transaction_id = bt.id
                LEFT JOIN ReconciliationLinks rl2 ON rl.transaction_id = rl2.transaction_id AND rl2.invoice_id != i.id
                LEFT JOIN Invoices i2 ON rl2.invoice_id = i2.id
                WHERE i.payment_status IN ('Pagata Tot.', 'Pagata Parz.')
                  AND rl.reconciliation_date >= date('now', '-2 years')
            """
            
            params = []
            if anagraphics_id:
                query += " AND i.anagraphics_id = ?"
                params.append(anagraphics_id)
            
            query += """
                GROUP BY rl.id
                ORDER BY i.anagraphics_id, rl.reconciliation_date DESC
            """
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Raggruppa per cliente
            client_records = defaultdict(list)
            for row in rows:
                client_records[row['anagraphics_id']].append(row)
            
            # Costruisci pattern per ogni cliente
            for anag_id, records in client_records.items():
                if len(records) < 2:  # Serve almeno qualche record
                    continue
                
                pattern = ClientPaymentPattern(anag_id)
                
                for record in records:
                    doc_numbers = [record['doc_number']]
                    if record['related_invoices']:
                        doc_numbers.extend(record['related_invoices'].split(','))
                    
                    pattern.add_payment_record(
                        record['doc_date'],
                        record['reconciliation_date'] or record['transaction_date'],
                        record['reconciled_amount'],
                        record['description'],
                        doc_numbers
                    )
                
                confidence = pattern.calculate_confidence()
                if confidence >= 0.3:  # Solo pattern abbastanza affidabili
                    self.client_patterns[anag_id] = pattern
                    logger.debug(f"Pattern cliente {anag_id} aggiornato (confidenza: {confidence:.2f})")
            
            self.patterns_cache_time = current_time
            logger.info(f"Cache pattern aggiornata per {len(self.client_patterns)} clienti")
            
        except Exception as e:
            logger.error(f"Errore aggiornamento pattern clienti: {e}", exc_info=True)
        finally:
            if conn:
                conn.close()
    
    def get_client_pattern(self, anagraphics_id: int) -> Optional[ClientPaymentPattern]:
        """Ottiene il pattern di pagamento per un cliente"""
        self._refresh_patterns_cache(anagraphics_id)
        return self.client_patterns.get(anagraphics_id)
    
    def suggest_smart_combinations(self, transaction_id: int, anagraphics_id: int) -> List[Dict]:
        """Suggerisce combinazioni intelligenti basate sui pattern del cliente"""
        pattern = self.get_client_pattern(anagraphics_id)
        if not pattern:
            return []
        
        conn = None
        suggestions = []
        
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Recupera dettagli transazione
            cursor.execute("""
                SELECT amount, reconciled_amount, description, transaction_date
                FROM BankTransactions 
                WHERE id = ?
            """, (transaction_id,))
            
            trans_row = cursor.fetchone()
            if not trans_row:
                return []
            
            target_amount = quantize(
                to_decimal(trans_row['amount']) - to_decimal(trans_row['reconciled_amount'])
            )
            
            if target_amount.copy_abs() <= AMOUNT_TOLERANCE / 2:
                return []
            
            # Analizza pattern descrizione
            desc_match_score = pattern.matches_description_pattern(trans_row['description'])
            
            # Ottieni intervallo tipico pagamento
            min_interval, max_interval = pattern.get_typical_payment_interval()
            
            # Cerca fatture candidate basate sui pattern
            trans_date = pd.to_datetime(trans_row['transaction_date']).date()
            min_doc_date = trans_date - timedelta(days=max_interval)
            max_doc_date = trans_date - timedelta(days=min_interval)
            
            query = """
                SELECT 
                    i.id, i.doc_number, i.doc_date, i.total_amount, i.paid_amount,
                    (i.total_amount - i.paid_amount) as open_amount
                FROM Invoices i
                WHERE i.anagraphics_id = ?
                  AND i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND i.doc_date BETWEEN ? AND ?
                  AND (i.total_amount - i.paid_amount) > ?
                ORDER BY i.doc_date DESC
                LIMIT 20
            """
            
            cursor.execute(query, (
                anagraphics_id,
                min_doc_date.strftime('%Y-%m-%d'),
                max_doc_date.strftime('%Y-%m-%d'),
                float(AMOUNT_TOLERANCE / 2)
            ))
            
            candidate_invoices = cursor.fetchall()
            
            if not candidate_invoices:
                return []
            
            # Analizza combinazioni intelligenti
            suggestions.extend(self._analyze_sequence_patterns(
                candidate_invoices, target_amount, pattern, desc_match_score
            ))
            
            suggestions.extend(self._analyze_amount_patterns(
                candidate_invoices, target_amount, pattern, desc_match_score
            ))
            
            # Ordina per score di confidenza
            suggestions.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
            
            return suggestions[:10]  # Top 10
            
        except Exception as e:
            logger.error(f"Errore suggerimenti intelligenti T:{transaction_id}, Anag:{anagraphics_id}: {e}", exc_info=True)
            return []
        finally:
            if conn:
                conn.close()
    
    def _analyze_sequence_patterns(self, candidates, target_amount, pattern, desc_score):
        """Analizza pattern di sequenze consecutive"""
        suggestions = []
        
        # Cerca sequenze consecutive nei numeri documento
        candidates_by_number = []
        for inv in candidates:
            # Estrai numero da documento
            doc_num = inv['doc_number']
            numbers = re.findall(r'\d+', doc_num)
            if numbers:
                try:
                    num_val = int(numbers[-1])  # Ultimo numero trovato
                    candidates_by_number.append((num_val, inv))
                except:
                    pass
        
        if len(candidates_by_number) < 2:
            return suggestions
        
        # Ordina per numero
        candidates_by_number.sort(key=lambda x: x[0])
        
        # Cerca sequenze consecutive
        for i in range(len(candidates_by_number)):
            current_total = Decimal('0')
            current_invoices = []
            
            for j in range(i, min(i + 5, len(candidates_by_number))):  # Max 5 fatture
                _, invoice = candidates_by_number[j]
                open_amount = quantize(to_decimal(invoice['open_amount']))
                current_total += open_amount
                current_invoices.append(invoice)
                
                # Verifica se il totale corrisponde
                if abs(current_total - target_amount.copy_abs()) <= AMOUNT_TOLERANCE:
                    # Calcola score basato su pattern
                    sequence_score = self._calculate_sequence_score(current_invoices, pattern)
                    confidence_score = (sequence_score * 0.6) + (desc_score * 0.4)
                    
                    if confidence_score >= 0.4:
                        suggestions.append({
                            'invoice_ids': [inv['id'] for inv in current_invoices],
                            'total_amount': current_total,
                            'confidence_score': confidence_score,
                            'confidence': 'Pattern Cliente' if confidence_score >= 0.7 else 'Cliente',
                            'doc_numbers': [inv['doc_number'] for inv in current_invoices],
                            'explanation': f"Sequenza consecutiva {len(current_invoices)} fatture (Pattern: {sequence_score:.2f})"
                        })
        
        return suggestions
    
    def _analyze_amount_patterns(self, candidates, target_amount, pattern, desc_score):
        """Analizza pattern basati sugli importi tipici"""
        suggestions = []
        
        if not pattern.typical_amounts:
            return suggestions
        
        # Calcola importi tipici del cliente
        amounts_series = pd.Series(pattern.typical_amounts)
        typical_ranges = [
            (amounts_series.quantile(0.25), amounts_series.quantile(0.75)),  # IQR
            (amounts_series.min(), amounts_series.max())  # Range completo
        ]
        
        for min_amt, max_amt in typical_ranges:
            for candidate in candidates:
                open_amount = quantize(to_decimal(candidate['open_amount']))
                
                # Verifica se l'importo rientra nel range tipico
                if min_amt <= float(open_amount) <= max_amt:
                    # Verifica corrispondenza importo
                    if abs(open_amount - target_amount.copy_abs()) <= AMOUNT_TOLERANCE:
                        amount_score = 0.8  # Alta corrispondenza importo
                        confidence_score = (amount_score * 0.5) + (desc_score * 0.3) + (pattern.confidence_score * 0.2)
                        
                        if confidence_score >= 0.5:
                            suggestions.append({
                                'invoice_ids': [candidate['id']],
                                'total_amount': open_amount,
                                'confidence_score': confidence_score,
                                'confidence': 'Pattern Cliente',
                                'doc_numbers': [candidate['doc_number']],
                                'explanation': f"Importo tipico cliente (€{open_amount:.2f})"
                            })
        
        return suggestions
    
    def _calculate_sequence_score(self, invoices, pattern):
        """Calcola score per una sequenza di fatture"""
        if len(invoices) <= 1:
            return 0.5
        
        score = 0.0
        
        # Bonus per sequenze simili a quelle storiche
        current_sequence = [inv['doc_number'] for inv in invoices]
        for historical_seq in pattern.invoice_sequences:
            if len(historical_seq) == len(current_sequence):
                score += 0.3
                break
        
        # Bonus per consecutività numerica
        numbers = []
        for inv in invoices:
            nums = re.findall(r'\d+', inv['doc_number'])
            if nums:
                try:
                    numbers.append(int(nums[-1]))
                except:
                    pass
        
        if len(numbers) == len(invoices) and len(numbers) > 1:
            is_consecutive = all(
                numbers[i] == numbers[i-1] + 1 
                for i in range(1, len(numbers))
            )
            if is_consecutive:
                score += 0.4
        
        # Bonus per date vicine
        dates = []
        for inv in invoices:
            try:
                dates.append(pd.to_datetime(inv['doc_date']).date())
            except:
                pass
        
        if len(dates) == len(invoices) and len(dates) > 1:
            date_range = (max(dates) - min(dates)).days
            if date_range <= 30:  # Entro un mese
                score += 0.2
        
        return min(1.0, score)

# Istanza singleton
_smart_reconciler = None

def get_smart_reconciler() -> SmartClientReconciliation:
    """Ottiene istanza singleton del riconciliatore intelligente"""
    global _smart_reconciler
    if _smart_reconciler is None:
        _smart_reconciler = SmartClientReconciliation()
    return _smart_reconciler

def suggest_client_based_reconciliation(transaction_id: int, anagraphics_id: int) -> List[Dict]:
    """
    Funzione principale per suggerimenti basati sui pattern del cliente.
    Utilizzata da reconciliation.py
    """
    reconciler = get_smart_reconciler()
    return reconciler.suggest_smart_combinations(transaction_id, anagraphics_id)

def enhance_cumulative_matches_with_client_patterns(transaction_id: int, anagraphics_id: int, 
                                                   standard_suggestions: List[Dict]) -> List[Dict]:
    """
    Migliora i suggerimenti standard con informazioni sui pattern del cliente.
    Utilizzata da reconciliation.py
    """
    reconciler = get_smart_reconciler()
    pattern = reconciler.get_client_pattern(anagraphics_id)
    
    if not pattern:
        return standard_suggestions
    
    # Ottieni suggerimenti intelligenti
    smart_suggestions = reconciler.suggest_smart_combinations(transaction_id, anagraphics_id)
    
    # Combina e deduplica
    all_suggestions = smart_suggestions + standard_suggestions
    
    # Rimuovi duplicati basati su invoice_ids
    seen_combinations = set()
    unique_suggestions = []
    
    for sugg in all_suggestions:
        invoice_set = tuple(sorted(sugg['invoice_ids']))
        if invoice_set not in seen_combinations:
            seen_combinations.add(invoice_set)
            unique_suggestions.append(sugg)
    
    # Ordina per qualità (smart suggestions prima)
    def sort_key(s):
        is_smart = 'Pattern Cliente' in s.get('confidence', '')
        confidence_score = s.get('confidence_score', 0)
        return (is_smart, confidence_score)
    
    unique_suggestions.sort(key=sort_key, reverse=True)
    return unique_suggestions

def analyze_client_payment_reliability(anagraphics_id: int) -> Dict[str, Any]:
    """
    Analizza l'affidabilità di pagamento di un cliente.
    Può essere utilizzato per scoring o reporting.
    """
    reconciler = get_smart_reconciler()
    pattern = reconciler.get_client_pattern(anagraphics_id)
    
    if not pattern:
        return {
            'reliability_score': 0.0,
            'payment_history_count': 0,
            'average_delay_days': None,
            'payment_consistency': 'Unknown'
        }
    
    # Calcola metriche di affidabilità
    avg_delay = pd.Series(pattern.payment_intervals).mean() if pattern.payment_intervals else 0
    delay_std = pd.Series(pattern.payment_intervals).std() if pattern.payment_intervals else 0
    
    # Score basato su tempestività e consistenza
    reliability_score = 0.0
    
    if avg_delay <= 30:  # Paga entro 30 giorni
        reliability_score += 0.4
    elif avg_delay <= 60:  # Paga entro 60 giorni
        reliability_score += 0.2
    
    if delay_std <= 10:  # Molto consistente
        reliability_score += 0.3
    elif delay_std <= 20:  # Abbastanza consistente
        reliability_score += 0.1
    
    reliability_score += min(0.3, len(pattern.payment_intervals) / 20)  # Bonus per storico lungo
    
    # Determina categoria consistenza
    if delay_std <= 5:
        consistency = 'Molto Consistente'
    elif delay_std <= 15:
        consistency = 'Consistente'
    elif delay_std <= 30:
        consistency = 'Moderatamente Consistente'
    else:
        consistency = 'Inconsistente'
    
    return {
        'reliability_score': min(1.0, reliability_score),
        'payment_history_count': len(pattern.payment_intervals),
        'average_delay_days': avg_delay,
        'payment_consistency': consistency,
        'confidence_score': pattern.confidence_score
    }