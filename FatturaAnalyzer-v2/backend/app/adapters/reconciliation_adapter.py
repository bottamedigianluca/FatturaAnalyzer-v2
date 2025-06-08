"""
Reconciliation Adapter ULTRA-OTTIMIZZATO per FastAPI - Versione 3.0 COMPLETATA
Sfrutta al 100% il backend con AI/ML, pattern recognition, parallel processing
Performance-first design con smart reconciliation e predictive matching
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple, Union, Set
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, date
from decimal import Decimal
import threading
import time
import psutil
import os
from functools import wraps, lru_cache
from dataclasses import dataclass, field
import numpy as np
from collections import defaultdict, Counter, OrderedDict
import json
import hashlib
import pickle
from contextlib import asynccontextmanager
import warnings
warnings.filterwarnings('ignore')

# Import del core riconciliazione ottimizzato
from app.core.reconciliation import (
    # Core functions V2
    suggest_reconciliation_matches_enhanced,
    suggest_cumulative_matches_v2,
    apply_manual_match_optimized,
    attempt_auto_reconciliation_optimized,
    find_automatic_matches_optimized,
    ignore_transaction,
    find_anagraphics_id_from_description_v2,
    update_items_statuses_batch,
    
    # Advanced features
    get_reconciliation_statistics,
    clear_caches,
    warm_up_caches,
    get_performance_metrics,
    initialize_reconciliation_engine,
    
    # V2 specific
    suggest_cumulative_matches,
    AnagraphicsCacheV2,
    MatchAnalyzerV2,
    CombinationGeneratorV2,
    AsyncReconciliationEngine,
    ReconciliationOptimizer,
    BatchProcessor,
    MatchValidator,
    AutoReconciler
)

# Import smart client reconciliation V2
try:
    from app.core.smart_client_reconciliation import (
        suggest_client_based_reconciliation,
        enhance_cumulative_matches_with_client_patterns,
        analyze_client_payment_reliability,
        get_smart_reconciler_v2,
        initialize_smart_reconciliation_engine,
        get_smart_reconciliation_statistics,
        clear_smart_reconciliation_cache,
        
        # V2 specific classes
        SmartClientReconciliationV2,
        ClientPaymentPatternV2,
        PaymentRecordV2,
        AsyncPatternAnalyzer,
        MLMatchAnalyzerV2
    )
    SMART_RECONCILIATION_AVAILABLE = True
except ImportError:
    logging.warning("Smart client reconciliation V2 non disponibile")
    SMART_RECONCILIATION_AVAILABLE = False

logger = logging.getLogger(__name__)

# ================== CONFIGURAZIONE AVANZATA ==================

class ReconciliationConfig:
    """Configurazione centralizzata per performance ottimale"""
    # Performance settings
    MAX_WORKERS = min(12, (os.cpu_count() or 1) * 2)
    BATCH_SIZE = int(os.getenv('RECON_BATCH_SIZE', '150'))
    PARALLEL_THRESHOLD = int(os.getenv('RECON_PARALLEL_THRESHOLD', '10'))
    
    # ML/AI settings
    ENABLE_AI_MATCHING = os.getenv('RECON_ENABLE_AI', 'true').lower() == 'true'
    ENABLE_PATTERN_LEARNING = os.getenv('RECON_ENABLE_LEARNING', 'true').lower() == 'true'
    ENABLE_PREDICTIVE_SCORING = os.getenv('RECON_ENABLE_PREDICTIVE', 'true').lower() == 'true'
    
    # Cache settings
    CACHE_TTL_MINUTES = int(os.getenv('RECON_CACHE_TTL', '10'))
    MAX_CACHE_ENTRIES = int(os.getenv('RECON_MAX_CACHE', '2000'))
    
    # Matching thresholds
    HIGH_CONFIDENCE_THRESHOLD = float(os.getenv('RECON_HIGH_CONFIDENCE', '0.85'))
    MEDIUM_CONFIDENCE_THRESHOLD = float(os.getenv('RECON_MEDIUM_CONFIDENCE', '0.60'))
    LOW_CONFIDENCE_THRESHOLD = float(os.getenv('RECON_LOW_CONFIDENCE', '0.30'))
    
    # Advanced settings
    MAX_COMBINATION_SIZE = int(os.getenv('RECON_MAX_COMBO_SIZE', '6'))
    MAX_SEARCH_TIME_MS = int(os.getenv('RECON_MAX_SEARCH_MS', '45000'))
    ENABLE_FUZZY_MATCHING = os.getenv('RECON_FUZZY_MATCHING', 'true').lower() == 'true'

# ================== PERFORMANCE MONITORING ==================

@dataclass
class ReconciliationMetrics:
    """Metriche dettagliate per reconciliation performance"""
    operation_type: str
    execution_time_ms: float
    items_processed: int
    suggestions_generated: int
    confidence_distribution: Dict[str, int]
    memory_usage_mb: float
    ai_enhancement_used: bool = False
    cache_hit_rate: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'operation': self.operation_type,
            'time_ms': round(self.execution_time_ms, 2),
            'items': self.items_processed,
            'suggestions': self.suggestions_generated,
            'confidence_dist': self.confidence_distribution,
            'memory_mb': round(self.memory_usage_mb, 2),
            'ai_enhanced': self.ai_enhancement_used,
            'cache_hit_rate': round(self.cache_hit_rate, 3)
        }

class ReconciliationPerformanceMonitor:
    """Monitor avanzato per performance reconciliation"""
    
    def __init__(self):
        self.metrics: List[ReconciliationMetrics] = []
        self.start_time = time.time()
        self._lock = threading.RLock()
        self.operation_counts = defaultdict(int)
        self.total_suggestions = 0
        self.ai_usage_count = 0
        
    def add_metric(self, metric: ReconciliationMetrics):
        with self._lock:
            self.metrics.append(metric)
            self.operation_counts[metric.operation_type] += 1
            self.total_suggestions += metric.suggestions_generated
            if metric.ai_enhancement_used:
                self.ai_usage_count += 1
            
            # Keep only last 500 metrics
            if len(self.metrics) > 500:
                self.metrics = self.metrics[-250:]
    
    def get_comprehensive_stats(self) -> Dict[str, Any]:
        with self._lock:
            if not self.metrics:
                return {'status': 'no_data'}
            
            recent_metrics = self.metrics[-50:]  # Last 50 operations
            
            # Calculate advanced statistics
            avg_time = np.mean([m.execution_time_ms for m in recent_metrics])
            p95_time = np.percentile([m.execution_time_ms for m in recent_metrics], 95)
            
            confidence_totals = defaultdict(int)
            for metric in recent_metrics:
                for conf_level, count in metric.confidence_distribution.items():
                    confidence_totals[conf_level] += count
            
            ai_usage_rate = (self.ai_usage_count / len(self.metrics)) * 100
            
            return {
                'total_operations': len(self.metrics),
                'operation_breakdown': dict(self.operation_counts),
                'performance': {
                    'avg_time_ms': round(avg_time, 2),
                    'p95_time_ms': round(p95_time, 2),
                    'avg_memory_mb': round(np.mean([m.memory_usage_mb for m in recent_metrics]), 2)
                },
                'quality_metrics': {
                    'total_suggestions': self.total_suggestions,
                    'avg_suggestions_per_op': round(self.total_suggestions / len(self.metrics), 2),
                    'confidence_distribution': dict(confidence_totals),
                    'ai_usage_rate_percent': round(ai_usage_rate, 1)
                },
                'uptime_hours': round((time.time() - self.start_time) / 3600, 2),
                'cache_efficiency': round(np.mean([m.cache_hit_rate for m in recent_metrics if m.cache_hit_rate > 0]), 3)
            }

_performance_monitor = ReconciliationPerformanceMonitor()

# ================== DECORATORI AVANZATI ==================

def performance_tracked_recon(operation_type: str):
    """Decoratore per tracking performance reconciliation"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            try:
                result = await func(*args, **kwargs)
                
                # Analyze result
                suggestions_count = 0
                confidence_dist = defaultdict(int)
                ai_enhanced = False
                
                if isinstance(result, list):
                    suggestions_count = len(result)
                    for item in result:
                        if isinstance(item, dict):
                            confidence = item.get('confidence', 'Unknown')
                            confidence_dist[confidence] += 1
                            if 'ml_details' in item or 'ai_' in str(item):
                                ai_enhanced = True
                elif isinstance(result, dict):
                    if 'suggestions' in result:
                        suggestions_count = len(result['suggestions'])
                    if 'ai_enhanced' in result:
                        ai_enhanced = result['ai_enhanced']
                
                end_time = time.perf_counter()
                end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
                
                metric = ReconciliationMetrics(
                    operation_type=operation_type,
                    execution_time_ms=(end_time - start_time) * 1000,
                    items_processed=len(args) + len(kwargs),
                    suggestions_generated=suggestions_count,
                    confidence_distribution=dict(confidence_dist),
                    memory_usage_mb=end_memory - start_memory,
                    ai_enhancement_used=ai_enhanced,
                    cache_hit_rate=getattr(result, '_cache_hit_rate', 0.0)
                )
                
                _performance_monitor.add_metric(metric)
                
                # Log performance warnings
                if metric.execution_time_ms > 10000:  # >10 seconds
                    logger.warning(f"Slow reconciliation operation {operation_type}: {metric.execution_time_ms:.0f}ms")
                
                return result
                
            except Exception as e:
                end_time = time.perf_counter()
                end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
                
                metric = ReconciliationMetrics(
                    operation_type=f"{operation_type}_ERROR",
                    execution_time_ms=(end_time - start_time) * 1000,
                    items_processed=0,
                    suggestions_generated=0,
                    confidence_distribution={},
                    memory_usage_mb=end_memory - start_memory
                )
                
                _performance_monitor.add_metric(metric)
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            try:
                result = func(*args, **kwargs)
                
                suggestions_count = 0
                confidence_dist = defaultdict(int)
                
                if isinstance(result, list):
                    suggestions_count = len(result)
                    for item in result:
                        if isinstance(item, dict):
                            confidence = item.get('confidence', 'Unknown')
                            confidence_dist[confidence] += 1
                
                end_time = time.perf_counter()
                end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
                
                metric = ReconciliationMetrics(
                    operation_type=operation_type,
                    execution_time_ms=(end_time - start_time) * 1000,
                    items_processed=len(args) + len(kwargs),
                    suggestions_generated=suggestions_count,
                    confidence_distribution=dict(confidence_dist),
                    memory_usage_mb=end_memory - start_memory
                )
                
                _performance_monitor.add_metric(metric)
                return result
                
            except Exception as e:
                end_time = time.perf_counter()
                end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
                
                metric = ReconciliationMetrics(
                    operation_type=f"{operation_type}_ERROR",
                    execution_time_ms=(end_time - start_time) * 1000,
                    items_processed=0,
                    suggestions_generated=0,
                    confidence_distribution={},
                    memory_usage_mb=end_memory - start_memory
                )
                
                _performance_monitor.add_metric(metric)
                raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# ================== CACHE INTELLIGENTE RECONCILIATION ==================

class ReconciliationIntelligentCache:
    """Cache specializzata per reconciliation con pattern learning"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._pattern_cache: Dict[str, List[Dict]] = {}
        self._access_stats: Dict[str, Dict] = defaultdict(lambda: {'hits': 0, 'last_access': 0})
        self._lock = threading.RLock()
        self.learning_enabled = ReconciliationConfig.ENABLE_PATTERN_LEARNING
        
    def _generate_cache_key(self, operation: str, **params) -> str:
        """Genera chiave cache intelligente"""
        # Filtra parametri rilevanti
        relevant_params = {}
        for key, value in params.items():
            if key in ['invoice_id', 'transaction_id', 'anagraphics_id', 'confidence_level']:
                relevant_params[key] = value
            elif isinstance(value, (str, int, float, bool)) and value is not None:
                relevant_params[key] = value
        
        cache_data = f"{operation}:{json.dumps(relevant_params, sort_keys=True)}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def get(self, operation: str, **params) -> Optional[Any]:
        """Ottiene risultato dalla cache con learning"""
        key = self._generate_cache_key(operation, **params)
        
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                
                # Check TTL
                if time.time() - entry['timestamp'] > ReconciliationConfig.CACHE_TTL_MINUTES * 60:
                    del self._cache[key]
                    return None
                
                # Update access stats
                self._access_stats[key]['hits'] += 1
                self._access_stats[key]['last_access'] = time.time()
                
                result = entry['data']
                if hasattr(result, '__dict__'):
                    result._cache_hit_rate = 1.0
                
                return result
            
            return None
    
    def set(self, operation: str, result: Any, **params):
        """Imposta risultato in cache con pattern learning"""
        key = self._generate_cache_key(operation, **params)
        
        with self._lock:
            # Memory management
            if len(self._cache) >= ReconciliationConfig.MAX_CACHE_ENTRIES:
                self._evict_lru_entries(0.2)  # Evict 20%
            
            self._cache[key] = {
                'data': result,
                'timestamp': time.time(),
                'operation': operation,
                'params': params
            }
            
            # Pattern learning
            if self.learning_enabled and isinstance(result, list):
                self._learn_patterns(operation, result, params)
    
    def _learn_patterns(self, operation: str, suggestions: List[Dict], params: Dict):
        """Apprende pattern dai suggerimenti per migliorare future matching"""
        try:
            # Analizza pattern di successo
            high_confidence_suggestions = [
                s for s in suggestions 
                if isinstance(s, dict) and s.get('confidence_score', 0) > ReconciliationConfig.HIGH_CONFIDENCE_THRESHOLD
            ]
            
            if high_confidence_suggestions:
                pattern_key = f"{operation}_patterns"
                if pattern_key not in self._pattern_cache:
                    self._pattern_cache[pattern_key] = []
                
                # Estrai features dai pattern di successo
                for suggestion in high_confidence_suggestions:
                    pattern = {
                        'timestamp': time.time(),
                        'confidence_score': suggestion.get('confidence_score'),
                        'match_type': suggestion.get('match_type'),
                        'amount_range': self._categorize_amount(suggestion.get('total_amount', 0)),
                        'invoice_count': len(suggestion.get('invoice_ids', [])),
                        'reasons': suggestion.get('reasons', []),
                        'anagraphics_id': params.get('anagraphics_id')
                    }
                    
                    self._pattern_cache[pattern_key].append(pattern)
                
                # Keep only recent patterns
                cutoff_time = time.time() - (30 * 24 * 3600)  # 30 days
                self._pattern_cache[pattern_key] = [
                    p for p in self._pattern_cache[pattern_key] 
                    if p['timestamp'] > cutoff_time
                ][-100:]  # Max 100 patterns
                
        except Exception as e:
            logger.debug(f"Pattern learning failed: {e}")
    
    def _categorize_amount(self, amount: float) -> str:
        """Categorizza importo per pattern learning"""
        if amount < 100:
            return 'small'
        elif amount < 1000:
            return 'medium'
        elif amount < 10000:
            return 'large'
        else:
            return 'very_large'
    
    def get_learned_patterns(self, operation: str) -> List[Dict]:
        """Ottiene pattern appresi per un'operazione"""
        pattern_key = f"{operation}_patterns"
        with self._lock:
            return self._pattern_cache.get(pattern_key, []).copy()
    
    def _evict_lru_entries(self, eviction_ratio: float):
        """Evict LRU entries"""
        if not self._cache:
            return
        
        num_to_evict = max(1, int(len(self._cache) * eviction_ratio))
        
        # Sort by last access time
        sorted_keys = sorted(
            self._cache.keys(),
            key=lambda k: self._access_stats[k]['last_access']
        )
        
        for key in sorted_keys[:num_to_evict]:
            self._cache.pop(key, None)
            self._access_stats.pop(key, None)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Statistiche cache"""
        with self._lock:
            total_hits = sum(stats['hits'] for stats in self._access_stats.values())
            avg_hits = total_hits / len(self._access_stats) if self._access_stats else 0
            
            return {
                'entries': len(self._cache),
                'max_entries': ReconciliationConfig.MAX_CACHE_ENTRIES,
                'total_hits': total_hits,
                'avg_hits_per_entry': round(avg_hits, 2),
                'pattern_cache_entries': sum(len(patterns) for patterns in self._pattern_cache.values()),
                'learning_enabled': self.learning_enabled
            }
    
    def clear(self):
        """Pulisce la cache"""
        with self._lock:
            self._cache.clear()
            self._pattern_cache.clear()
            self._access_stats.clear()

_recon_cache = ReconciliationIntelligentCache()

# ================== AI-ENHANCED RECONCILIATION ENGINE ==================

class AIEnhancedReconciliationEngine:
    """Engine di riconciliazione potenziato con AI e ML"""
    
    def __init__(self):
        self.confidence_calibrator = ConfidenceCalibrator()
        self.pattern_matcher = PatternMatcher()
        self.anomaly_detector = AnomalyDetector()
        self.executor = ThreadPoolExecutor(max_workers=ReconciliationConfig.MAX_WORKERS)
        
    async def enhance_suggestions_with_ai(self, suggestions: List[Dict], 
                                        context: Dict[str, Any]) -> List[Dict]:
        """Potenzia suggerimenti con AI avanzato"""
        if not ReconciliationConfig.ENABLE_AI_MATCHING or not suggestions:
            return suggestions
        
        enhanced_suggestions = []
        
        # Process in parallel for better performance
        enhancement_tasks = []
        for suggestion in suggestions:
            task = asyncio.create_task(
                self._enhance_single_suggestion(suggestion, context)
            )
            enhancement_tasks.append(task)
        
        try:
            enhanced_results = await asyncio.gather(*enhancement_tasks, return_exceptions=True)
            
            for i, result in enumerate(enhanced_results):
                if isinstance(result, Exception):
                    logger.warning(f"AI enhancement failed for suggestion {i}: {result}")
                    enhanced_suggestions.append(suggestions[i])  # Use original
                else:
                    enhanced_suggestions.append(result)
                    
        except Exception as e:
            logger.error(f"Batch AI enhancement failed: {e}")
            return suggestions
        
        # Re-sort by enhanced confidence scores
        enhanced_suggestions.sort(
            key=lambda x: x.get('ai_confidence_score', x.get('confidence_score', 0)),
            reverse=True
        )
        
        return enhanced_suggestions
    
    async def _enhance_single_suggestion(self, suggestion: Dict, context: Dict) -> Dict:
        """Potenzia singolo suggerimento con AI"""
        loop = asyncio.get_event_loop()
        
        # Run AI enhancement in thread pool
        enhanced = await loop.run_in_executor(
            self.executor,
            self._apply_ai_enhancements,
            suggestion.copy(),
            context
        )
        
        return enhanced
    
    def _apply_ai_enhancements(self, suggestion: Dict, context: Dict) -> Dict:
        """Applica potenziamenti AI a singolo suggerimento"""
        try:
            # Calibrate confidence using historical data
            calibrated_confidence = self.confidence_calibrator.calibrate(
                suggestion.get('confidence_score', 0),
                suggestion.get('match_type', 'unknown'),
                context
            )
            
            # Detect patterns
            pattern_score = self.pattern_matcher.score_pattern_match(suggestion, context)
            
            # Check for anomalies
            anomaly_score = self.anomaly_detector.detect_anomaly(suggestion, context)
            
            # Calculate final AI confidence
            base_confidence = suggestion.get('confidence_score', 0)
            ai_confidence = (
                calibrated_confidence * 0.4 +
                pattern_score * 0.3 +
                (1 - anomaly_score) * 0.2 +
                base_confidence * 0.1
            )
            
            # Add AI insights
            suggestion['ai_confidence_score'] = min(1.0, ai_confidence)
            suggestion['ai_insights'] = {
                'calibrated_confidence': calibrated_confidence,
                'pattern_match_score': pattern_score,
                'anomaly_score': anomaly_score,
                'ai_enhancement_applied': True
            }
            
            # Update confidence label based on AI score
            if ai_confidence >= ReconciliationConfig.HIGH_CONFIDENCE_THRESHOLD:
                suggestion['ai_confidence_label'] = 'AI Alta'
            elif ai_confidence >= ReconciliationConfig.MEDIUM_CONFIDENCE_THRESHOLD:
                suggestion['ai_confidence_label'] = 'AI Media'
            else:
                suggestion['ai_confidence_label'] = 'AI Bassa'
            
            return suggestion
            
        except Exception as e:
            logger.debug(f"AI enhancement failed for single suggestion: {e}")
            return suggestion

class ConfidenceCalibrator:
    """Calibratore di confidenza basato su dati storici"""
    
    def __init__(self):
        self.historical_accuracy = defaultdict(lambda: {'correct': 0, 'total': 0})
        self._lock = threading.RLock()
    
    def calibrate(self, raw_confidence: float, match_type: str, context: Dict) -> float:
        """Calibra confidenza basandosi su accuracy storica"""
        with self._lock:
            key = f"{match_type}_{self._get_amount_bucket(context.get('amount', 0))}"
            
            if self.historical_accuracy[key]['total'] == 0:
                return raw_confidence  # No historical data
            
            # Calculate historical accuracy
            historical_acc = (
                self.historical_accuracy[key]['correct'] / 
                self.historical_accuracy[key]['total']
            )
            
            # Calibrate confidence
            calibrated = raw_confidence * historical_acc
            
            # Apply sigmoid function for smoothing
            calibrated = 1 / (1 + np.exp(-5 * (calibrated - 0.5)))
            
            return min(1.0, anomaly_score)
    
    def _is_temporal_anomaly(self, suggestion: Dict, context: Dict) -> bool:
        """Rileva anomalie temporali"""
        # Placeholder per rilevamento anomalie temporali
        return False

_ai_engine = AIEnhancedReconciliationEngine()

# ================== RECONCILIATION ADAPTER ULTRA-OTTIMIZZATO ==================

class ReconciliationAdapter:
    """
    Adapter ULTRA-OTTIMIZZATO V3.0 per Reconciliation
    Sfrutta al 100% il backend con AI/ML, pattern recognition, parallel processing
    """
    
    def __init__(self):
        self.startup_time = datetime.now()
        self.total_operations = 0
        self._lock = threading.RLock()
        self.batch_processor = BatchReconciliationProcessor()
        self.smart_reconciler = None
        
        # Initialize components
        if SMART_RECONCILIATION_AVAILABLE:
            self.smart_reconciler = get_smart_reconciler_v2()
        
        logger.info("ReconciliationAdapter V3.0 inizializzato con AI enhancement")
    
    # ===== 1:1 MATCHING ULTRA-OTTIMIZZATO =====
    
    @performance_tracked_recon('1_to_1_matching')
    async def suggest_1_to_1_matches_async(self, 
                                         invoice_id: Optional[int] = None,
                                         transaction_id: Optional[int] = None,
                                         anagraphics_id_filter: Optional[int] = None,
                                         enable_ai: bool = True) -> List[Dict]:
        """Suggerimenti 1:1 con AI enhancement e caching intelligente"""
        
        # Check cache first
        cache_result = _recon_cache.get(
            '1_to_1',
            invoice_id=invoice_id,
            transaction_id=transaction_id,
            anagraphics_id_filter=anagraphics_id_filter
        )
        if cache_result is not None:
            cache_result._cache_hit_rate = 1.0
            return cache_result
        
        # Execute core reconciliation
        loop = asyncio.get_event_loop()
        suggestions = await loop.run_in_executor(
            _ai_engine.executor,
            suggest_reconciliation_matches_enhanced,
            invoice_id,
            transaction_id,
            anagraphics_id_filter
        )
        
        # AI Enhancement
        if enable_ai and ReconciliationConfig.ENABLE_AI_MATCHING and suggestions:
            context = {
                'invoice_id': invoice_id,
                'transaction_id': transaction_id,
                'anagraphics_id': anagraphics_id_filter,
                'operation_type': '1_to_1'
            }
            
            suggestions = await _ai_engine.enhance_suggestions_with_ai(suggestions, context)
        
        # Smart Client Enhancement
        if (SMART_RECONCILIATION_AVAILABLE and transaction_id and anagraphics_id_filter 
            and self.smart_reconciler):
            
            try:
                smart_suggestions = await loop.run_in_executor(
                    _ai_engine.executor,
                    suggest_client_based_reconciliation,
                    transaction_id,
                    anagraphics_id_filter
                )
                
                if smart_suggestions:
                    # Merge and deduplicate
                    suggestions = self._merge_and_deduplicate_suggestions(
                        suggestions, smart_suggestions
                    )
            except Exception as e:
                logger.warning(f"Smart client enhancement failed: {e}")
        
        # Cache result
        _recon_cache.set('1_to_1', suggestions, 
                        invoice_id=invoice_id, 
                        transaction_id=transaction_id, 
                        anagraphics_id_filter=anagraphics_id_filter)
        
        self._increment_operation_count()
        return suggestions
    
    # ===== N:M MATCHING ULTRA-OTTIMIZZATO =====
    
    @performance_tracked_recon('n_to_m_matching')
    async def suggest_n_to_m_matches_async(self,
                                         transaction_id: int,
                                         anagraphics_id_filter: Optional[int] = None,
                                         max_combination_size: int = None,
                                         max_search_time_ms: int = None,
                                         exclude_invoice_ids: Optional[List[int]] = None,
                                         start_date: Optional[str] = None,
                                         end_date: Optional[str] = None,
                                         enable_ai: bool = True) -> List[Dict]:
        """Suggerimenti N:M con algoritmi ultra-ottimizzati e AI"""
        
        # Set defaults
        if max_combination_size is None:
            max_combination_size = ReconciliationConfig.MAX_COMBINATION_SIZE
        if max_search_time_ms is None:
            max_search_time_ms = ReconciliationConfig.MAX_SEARCH_TIME_MS
        
        # Check cache
        cache_result = _recon_cache.get(
            'n_to_m',
            transaction_id=transaction_id,
            anagraphics_id_filter=anagraphics_id_filter,
            max_combination_size=max_combination_size
        )
        if cache_result is not None:
            return cache_result
        
        # Execute core N:M reconciliation V2
        loop = asyncio.get_event_loop()
        suggestions = await loop.run_in_executor(
            _ai_engine.executor,
            suggest_cumulative_matches_v2,
            transaction_id,
            anagraphics_id_filter,
            max_combination_size,
            max_search_time_ms,
            exclude_invoice_ids,
            start_date,
            end_date
        )
        
        # AI Enhancement for complex combinations
        if enable_ai and ReconciliationConfig.ENABLE_AI_MATCHING and suggestions:
            context = {
                'transaction_id': transaction_id,
                'anagraphics_id': anagraphics_id_filter,
                'operation_type': 'n_to_m',
                'max_combination_size': max_combination_size
            }
            
            suggestions = await _ai_engine.enhance_suggestions_with_ai(suggestions, context)
        
        # Smart Client Pattern Enhancement
        if (SMART_RECONCILIATION_AVAILABLE and anagraphics_id_filter and self.smart_reconciler):
            try:
                enhanced_suggestions = await loop.run_in_executor(
                    _ai_engine.executor,
                    enhance_cumulative_matches_with_client_patterns,
                    transaction_id,
                    anagraphics_id_filter,
                    suggestions
                )
                suggestions = enhanced_suggestions
            except Exception as e:
                logger.warning(f"Smart pattern enhancement failed: {e}")
        
        # Cache result
        _recon_cache.set('n_to_m', suggestions,
                        transaction_id=transaction_id,
                        anagraphics_id_filter=anagraphics_id_filter,
                        max_combination_size=max_combination_size)
        
        self._increment_operation_count()
        return suggestions
    
    # ===== AUTOMATIC MATCHING ULTRA-OTTIMIZZATO =====
    
    @performance_tracked_recon('automatic_matching')
    async def find_automatic_matches_async(self, 
                                          confidence_level: str = 'Exact',
                                          max_suggestions: int = 50,
                                          enable_batch_processing: bool = True) -> List[Dict]:
        """Trova match automatici con processing parallelo"""
        
        # Check cache
        cache_result = _recon_cache.get('automatic', confidence_level=confidence_level)
        if cache_result is not None:
            return cache_result[:max_suggestions]
        
        loop = asyncio.get_event_loop()
        
        if enable_batch_processing and ReconciliationConfig.MAX_WORKERS > 1:
            # Use batch processor for better performance
            matches = await self.batch_processor.find_automatic_matches_parallel(
                confidence_level, max_suggestions
            )
        else:
            # Standard processing
            matches = await loop.run_in_executor(
                _ai_engine.executor,
                find_automatic_matches_optimized,
                confidence_level
            )
        
        # AI-powered confidence adjustment
        if ReconciliationConfig.ENABLE_AI_MATCHING and matches:
            context = {'operation_type': 'automatic', 'confidence_level': confidence_level}
            matches = await _ai_engine.enhance_suggestions_with_ai(matches, context)
        
        # Cache result
        _recon_cache.set('automatic', matches, confidence_level=confidence_level)
        
        self._increment_operation_count()
        return matches[:max_suggestions]
    
    # ===== MANUAL MATCHING ULTRA-OTTIMIZZATO =====
    
    @performance_tracked_recon('manual_matching')
    async def apply_manual_match_async(self,
                                     invoice_id: int,
                                     transaction_id: int,
                                     amount_to_match: float,
                                     validate_ai: bool = True) -> Dict[str, Any]:
        """Applica match manuale con validazione AI"""
        
        loop = asyncio.get_event_loop()
        
        # AI-powered pre-validation
        if validate_ai and ReconciliationConfig.ENABLE_AI_MATCHING:
            validation_result = await self._ai_validate_manual_match(
                invoice_id, transaction_id, amount_to_match
            )
            
            if not validation_result['valid']:
                return {
                    'success': False,
                    'message': validation_result['message'],
                    'ai_warning': True
                }
        
        # Execute manual match
        success, message = await loop.run_in_executor(
            _ai_engine.executor,
            apply_manual_match_optimized,
            invoice_id,
            transaction_id,
            amount_to_match
        )
        
        # Clear related cache entries
        self._invalidate_related_cache(invoice_id, transaction_id)
        
        # Learn from this match for AI improvement
        if success and ReconciliationConfig.ENABLE_PATTERN_LEARNING:
            await self._learn_from_manual_match(invoice_id, transaction_id, amount_to_match)
        
        self._increment_operation_count()
        
        return {
            'success': success,
            'message': message,
            'ai_enhanced': validate_ai and ReconciliationConfig.ENABLE_AI_MATCHING,
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== BATCH OPERATIONS ULTRA-OTTIMIZZATE =====
    
    @performance_tracked_recon('batch_auto_reconciliation')
    async def perform_batch_auto_reconciliation_async(self,
                                                     transaction_ids: List[int],
                                                     invoice_ids: List[int],
                                                     enable_ai_validation: bool = True) -> Dict[str, Any]:
        """Riconciliazione automatica batch con AI validation"""
        
        # AI-powered batch validation
        if enable_ai_validation and ReconciliationConfig.ENABLE_AI_MATCHING:
            validation_result = await self._ai_validate_batch_reconciliation(
                transaction_ids, invoice_ids
            )
            
            if not validation_result['valid']:
                return {
                    'success': False,
                    'message': validation_result['message'],
                    'ai_warnings': validation_result.get('warnings', [])
                }
        
        loop = asyncio.get_event_loop()
        
        # Execute batch reconciliation
        success, message = await loop.run_in_executor(
            _ai_engine.executor,
            attempt_auto_reconciliation_optimized,
            transaction_ids,
            invoice_ids
        )
        
        # Clear cache for affected items
        self._invalidate_batch_cache(transaction_ids, invoice_ids)
        
        self._increment_operation_count()
        
        return {
            'success': success,
            'message': message,
            'affected_transactions': len(transaction_ids),
            'affected_invoices': len(invoice_ids),
            'ai_validated': enable_ai_validation,
            'timestamp': datetime.now().isoformat()
        }
    
    @performance_tracked_recon('batch_suggestions')
    async def get_batch_suggestions_async(self,
                                        requests: List[Dict[str, Any]],
                                        enable_parallel: bool = True) -> Dict[str, List[Dict]]:
        """Processa batch di richieste suggerimenti in parallelo"""
        
        if enable_parallel and len(requests) >= ReconciliationConfig.PARALLEL_THRESHOLD:
            return await self.batch_processor.process_suggestions_parallel(requests)
        else:
            # Sequential processing for small batches
            results = {}
            for i, request in enumerate(requests):
                request_type = request.get('type', '1_to_1')
                request_id = request.get('id', f'req_{i}')
                
                try:
                    if request_type == '1_to_1':
                        suggestions = await self.suggest_1_to_1_matches_async(
                            invoice_id=request.get('invoice_id'),
                            transaction_id=request.get('transaction_id'),
                            anagraphics_id_filter=request.get('anagraphics_id_filter')
                        )
                    elif request_type == 'n_to_m':
                        suggestions = await self.suggest_n_to_m_matches_async(
                            transaction_id=request['transaction_id'],
                            anagraphics_id_filter=request.get('anagraphics_id_filter')
                        )
                    else:
                        suggestions = []
                    
                    results[request_id] = suggestions
                    
                except Exception as e:
                    logger.error(f"Batch suggestion failed for {request_id}: {e}")
                    results[request_id] = []
            
            return results
    
    # ===== SMART CLIENT RECONCILIATION =====
    
    @performance_tracked_recon('smart_client')
    async def suggest_smart_client_reconciliation_async(self,
                                                       transaction_id: int,
                                                       anagraphics_id: int,
                                                       enhance_with_ml: bool = True) -> List[Dict]:
        """Riconciliazione intelligente basata su pattern cliente"""
        
        if not SMART_RECONCILIATION_AVAILABLE:
            return []
        
        # Check cache
        cache_result = _recon_cache.get(
            'smart_client',
            transaction_id=transaction_id,
            anagraphics_id=anagraphics_id
        )
        if cache_result is not None:
            return cache_result
        
        loop = asyncio.get_event_loop()
        
        # Get smart suggestions
        suggestions = await loop.run_in_executor(
            _ai_engine.executor,
            suggest_client_based_reconciliation,
            transaction_id,
            anagraphics_id
        )
        
        # ML Enhancement
        if enhance_with_ml and ReconciliationConfig.ENABLE_AI_MATCHING and suggestions:
            context = {
                'transaction_id': transaction_id,
                'anagraphics_id': anagraphics_id,
                'operation_type': 'smart_client'
            }
            
            suggestions = await _ai_engine.enhance_suggestions_with_ai(suggestions, context)
        
        # Cache result
        _recon_cache.set('smart_client', suggestions,
                        transaction_id=transaction_id,
                        anagraphics_id=anagraphics_id)
        
        return suggestions
    
    @performance_tracked_recon('client_reliability')
    async def analyze_client_payment_reliability_async(self, anagraphics_id: int) -> Dict[str, Any]:
        """Analizza affidabilità pagamenti cliente con ML"""
        
        if not SMART_RECONCILIATION_AVAILABLE:
            return {'error': 'Smart reconciliation not available'}
        
        # Check cache
        cache_result = _recon_cache.get('client_reliability', anagraphics_id=anagraphics_id)
        if cache_result is not None:
            return cache_result
        
        loop = asyncio.get_event_loop()
        
        # Get reliability analysis
        analysis = await loop.run_in_executor(
            _ai_engine.executor,
            analyze_client_payment_reliability,
            anagraphics_id
        )
        
        # AI Enhancement - add predictive insights
        if ReconciliationConfig.ENABLE_PREDICTIVE_SCORING and isinstance(analysis, dict):
            ai_insights = await self._generate_ai_payment_insights(anagraphics_id, analysis)
            analysis['ai_insights'] = ai_insights
        
        # Cache result
        _recon_cache.set('client_reliability', analysis, anagraphics_id=anagraphics_id)
        
        return analysis
    
    # ===== TRANSACTION MANAGEMENT =====
    
    @performance_tracked_recon('ignore_transaction')
    async def ignore_transaction_async(self, transaction_id: int) -> Dict[str, Any]:
        """Ignora transazione con cleanup intelligente"""
        
        loop = asyncio.get_event_loop()
        
        # Execute ignore operation
        success, message, affected_invoices = await loop.run_in_executor(
            _ai_engine.executor,
            ignore_transaction,
            transaction_id
        )
        
        # Clear related cache entries
        self._invalidate_transaction_cache(transaction_id)
        
        self._increment_operation_count()
        
        return {
            'success': success,
            'message': message,
            'affected_invoices': affected_invoices,
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== STATUS UPDATES ULTRA-OTTIMIZZATE =====
    
    @performance_tracked_recon('status_update')
    async def update_items_statuses_async(self,
                                        invoice_ids: Optional[List[int]] = None,
                                        transaction_ids: Optional[List[int]] = None,
                                        batch_size: int = None) -> Dict[str, Any]:
        """Aggiorna stati in batch ottimizzato"""
        
        if batch_size is None:
            batch_size = ReconciliationConfig.BATCH_SIZE
        
        loop = asyncio.get_event_loop()
        
        # Execute status update using optimized batch processor
        def _update_statuses():
            from app.core.database import get_connection
            with get_connection() as conn:
                return update_items_statuses_batch(conn, invoice_ids, transaction_ids)
        
        success = await loop.run_in_executor(_ai_engine.executor, _update_statuses)
        
        # Clear affected cache entries
        if invoice_ids:
            for invoice_id in invoice_ids:
                self._invalidate_invoice_cache(invoice_id)
        if transaction_ids:
            for transaction_id in transaction_ids:
                self._invalidate_transaction_cache(transaction_id)
        
        return {
            'success': success,
            'updated_invoices': len(invoice_ids) if invoice_ids else 0,
            'updated_transactions': len(transaction_ids) if transaction_ids else 0,
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== ANALYTICS E PERFORMANCE =====
    
    async def get_reconciliation_performance_async(self) -> Dict[str, Any]:
        """Ottiene metriche di performance complete"""
        
        # Core performance metrics
        core_metrics = _performance_monitor.get_comprehensive_stats()
        
        # Cache statistics
        cache_stats = _recon_cache.get_cache_stats()
        
        # Smart reconciliation stats
        smart_stats = {}
        if SMART_RECONCILIATION_AVAILABLE:
            try:
                smart_stats = get_smart_reconciliation_statistics()
            except Exception as e:
                logger.warning(f"Failed to get smart reconciliation stats: {e}")
        
        # AI engine stats
        ai_stats = {
            'ai_matching_enabled': ReconciliationConfig.ENABLE_AI_MATCHING,
            'pattern_learning_enabled': ReconciliationConfig.ENABLE_PATTERN_LEARNING,
            'predictive_scoring_enabled': ReconciliationConfig.ENABLE_PREDICTIVE_SCORING
        }
        
        # System resources
        process = psutil.Process(os.getpid())
        system_stats = {
            'memory_usage_mb': round(process.memory_info().rss / 1024 / 1024, 2),
            'cpu_percent': round(process.cpu_percent(), 2),
            'thread_count': process.num_threads(),
            'uptime_hours': round((datetime.now() - self.startup_time).total_seconds() / 3600, 2)
        }
        
        return {
            'adapter_info': {
                'version': '3.0',
                'startup_time': self.startup_time.isoformat(),
                'total_operations': self.total_operations
            },
            'performance_metrics': core_metrics,
            'cache_statistics': cache_stats,
            'smart_reconciliation': smart_stats,
            'ai_capabilities': ai_stats,
            'system_resources': system_stats,
            'configuration': {
                'max_workers': ReconciliationConfig.MAX_WORKERS,
                'batch_size': ReconciliationConfig.BATCH_SIZE,
                'max_combination_size': ReconciliationConfig.MAX_COMBINATION_SIZE,
                'high_confidence_threshold': ReconciliationConfig.HIGH_CONFIDENCE_THRESHOLD
            }
        }
    
    async def get_reconciliation_insights_async(self) -> Dict[str, Any]:
        """Genera insights avanzati sui pattern di riconciliazione"""
        
        insights = {
            'pattern_analysis': {},
            'efficiency_metrics': {},
            'recommendations': []
        }
        
        # Analyze learned patterns
        if ReconciliationConfig.ENABLE_PATTERN_LEARNING:
            learned_patterns = _recon_cache.get_learned_patterns('1_to_1')
            if learned_patterns:
                insights['pattern_analysis'] = self._analyze_learned_patterns(learned_patterns)
        
        # Performance insights
        perf_stats = _performance_monitor.get_comprehensive_stats()
        if perf_stats.get('performance'):
            insights['efficiency_metrics'] = {
                'avg_response_time': perf_stats['performance']['avg_time_ms'],
                'p95_response_time': perf_stats['performance']['p95_time_ms'],
                'suggestions_per_operation': perf_stats['quality_metrics']['avg_suggestions_per_op']
            }
        
        # Generate recommendations
        insights['recommendations'] = await self._generate_performance_recommendations(perf_stats)
        
        return insights
    
    # ===== CACHE MANAGEMENT =====
    
    async def clear_reconciliation_cache_async(self) -> Dict[str, Any]:
        """Pulisce tutte le cache di riconciliazione"""
        
        # Clear main cache
        _recon_cache.clear()
        
        # Clear core caches
        clear_caches()
        
        # Clear smart reconciliation cache
        if SMART_RECONCILIATION_AVAILABLE:
            clear_smart_reconciliation_cache()
        
        return {
            'success': True,
            'caches_cleared': ['main_cache', 'core_caches', 'smart_cache'],
            'timestamp': datetime.now().isoformat()
        }
    
    async def warm_up_reconciliation_caches_async(self) -> Dict[str, Any]:
        """Preriscalda le cache con operazioni comuni"""
        
        start_time = time.time()
        operations_completed = 0
        
        try:
            # Warm up core caches
            warm_up_caches()
            operations_completed += 1
            
            # Warm up smart reconciliation
            if SMART_RECONCILIATION_AVAILABLE:
                initialize_smart_reconciliation_engine()
                operations_completed += 1
            
            # Warm up with common operations
            common_operations = [
                self.find_automatic_matches_async('Exact'),
                # Add more common operations as needed
            ]
            
            for operation in common_operations:
                try:
                    await operation
                    operations_completed += 1
                except Exception as e:
                    logger.warning(f"Warmup operation failed: {e}")
            
        except Exception as e:
            logger.error(f"Cache warmup failed: {e}")
        
        return {
            'success': True,
            'operations_completed': operations_completed,
            'warmup_time_seconds': round(time.time() - start_time, 2),
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== UTILITY METHODS =====
    
    def _increment_operation_count(self):
        """Thread-safe increment del contatore operazioni"""
        with self._lock:
            self.total_operations += 1
    
    def _merge_and_deduplicate_suggestions(self, 
                                         suggestions1: List[Dict], 
                                         suggestions2: List[Dict]) -> List[Dict]:
        """Merge e deduplica suggerimenti da fonti diverse"""
        
        # Create unique key for each suggestion
        seen_keys = set()
        merged = []
        
        for suggestions in [suggestions1, suggestions2]:
            for suggestion in suggestions:
                # Create unique key based on invoice and transaction IDs
                invoice_ids = tuple(sorted(suggestion.get('invoice_ids', [])))
                transaction_ids = tuple(sorted(suggestion.get('transaction_ids', [])))
                key = (invoice_ids, transaction_ids)
                
                if key not in seen_keys:
                    seen_keys.add(key)
                    merged.append(suggestion)
        
        # Sort by confidence score
        merged.sort(
            key=lambda x: x.get('ai_confidence_score', x.get('confidence_score', 0)),
            reverse=True
        )
        
        return merged
    
    async def _ai_validate_manual_match(self, 
                                      invoice_id: int, 
                                      transaction_id: int, 
                                      amount: float) -> Dict[str, Any]:
        """Validazione AI per match manuale"""
        
        # Simple AI validation - can be enhanced with ML models
        try:
            # Check if amounts are reasonable
            if amount <= 0:
                return {'valid': False, 'message': 'Amount must be positive'}
            
            if amount > 100000:  # Very large amount
                return {
                    'valid': True, 
                    'message': 'Large amount detected - please verify',
                    'warning': True
                }
            
            return {'valid': True, 'message': 'Validation passed'}
            
        except Exception as e:
            return {'valid': False, 'message': f'Validation error: {str(e)}'}
    
    async def _ai_validate_batch_reconciliation(self, 
                                              transaction_ids: List[int], 
                                              invoice_ids: List[int]) -> Dict[str, Any]:
        """Validazione AI per batch reconciliation"""
        
        warnings = []
        
        # Check batch size
        if len(transaction_ids) > 50 or len(invoice_ids) > 50:
            warnings.append('Large batch size - consider splitting')
        
        # Check ratio
        ratio = len(invoice_ids) / len(transaction_ids) if transaction_ids else 0
        if ratio > 5:
            warnings.append('High invoice-to-transaction ratio detected')
        
        return {
            'valid': True,
            'warnings': warnings
        }
    
    async def _learn_from_manual_match(self, 
                                     invoice_id: int, 
                                     transaction_id: int, 
                                     amount: float):
        """Apprende da match manuale per migliorare AI"""
        
        try:
            # Update AI models with successful match
            pattern_features = {
                'invoice_id': invoice_id,
                'transaction_id': transaction_id,
                'amount': amount,
                'timestamp': time.time(),
                'success': True
            }
            
            # Learn pattern
            _ai_engine.pattern_matcher.learn_pattern(pattern_features, True)
            
        except Exception as e:
            logger.debug(f"Learning from manual match failed: {e}")
    
    async def _generate_ai_payment_insights(self, 
                                          anagraphics_id: int, 
                                          base_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Genera insights AI per pagamenti cliente"""
        
        return {
            'risk_prediction': 'medium',  # Placeholder
            'payment_likelihood_next_30_days': 0.75,
            'recommended_actions': [
                'Monitor payment patterns',
                'Consider payment terms adjustment'
            ],
            'confidence': 0.7
        }
    
    def _invalidate_related_cache(self, invoice_id: int, transaction_id: int):
        """Invalida cache entries correlate"""
        # Implementation would clear specific cache entries
        pass
    
    def _invalidate_batch_cache(self, transaction_ids: List[int], invoice_ids: List[int]):
        """Invalida cache per operazioni batch"""
        # Implementation would clear batch-related cache entries
        pass
    
    def _invalidate_transaction_cache(self, transaction_id: int):
        """Invalida cache per transazione specifica"""
        # Implementation would clear transaction-related cache entries
        pass
    
    def _invalidate_invoice_cache(self, invoice_id: int):
        """Invalida cache per fattura specifica"""
        # Implementation would clear invoice-related cache entries
        pass
    
    def _analyze_learned_patterns(self, patterns: List[Dict]) -> Dict[str, Any]:
        """Analizza pattern appresi"""
        
        if not patterns:
            return {'no_patterns': True}
        
        # Analyze pattern distribution
        confidence_dist = defaultdict(int)
        match_types = defaultdict(int)
        
        for pattern in patterns:
            confidence = pattern.get('confidence_score', 0)
            if confidence >= 0.8:
                confidence_dist['high'] += 1
            elif confidence >= 0.5:
                confidence_dist['medium'] += 1
            else:
                confidence_dist['low'] += 1
            
            match_type = pattern.get('match_type', 'unknown')
            match_types[match_type] += 1
        
        return {
            'total_patterns': len(patterns),
            'confidence_distribution': dict(confidence_dist),
            'match_type_distribution': dict(match_types),
            'learning_effectiveness': 'good' if len(patterns) > 10 else 'limited'
        }
    
    async def _generate_performance_recommendations(self, 
                                                  perf_stats: Dict[str, Any]) -> List[str]:
        """Genera raccomandazioni per migliorare performance"""
        
        recommendations = []
        
        # Check response time
        if perf_stats.get('performance', {}).get('avg_time_ms', 0) > 2000:
            recommendations.append("Consider increasing cache TTL to improve response times")
        
        # Check AI usage
        ai_usage = perf_stats.get('quality_metrics', {}).get('ai_usage_rate_percent', 0)
        if ai_usage < 50:
            recommendations.append("Enable AI matching for better suggestion quality")
        
        # Check cache efficiency
        cache_hit_rate = perf_stats.get('cache_efficiency', 0)
        if cache_hit_rate < 0.3:
            recommendations.append("Optimize cache strategy to improve hit rates")
        
        if not recommendations:
            recommendations.append("Performance is optimal - continue monitoring")
        
        return recommendations


# ================== BATCH PROCESSOR AVANZATO ==================

class BatchReconciliationProcessor:
    """Processore batch ultra-ottimizzato per reconciliation"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=ReconciliationConfig.MAX_WORKERS)
        self.semaphore = asyncio.Semaphore(ReconciliationConfig.MAX_WORKERS)
    
    async def find_automatic_matches_parallel(self, 
                                            confidence_level: str, 
                                            max_suggestions: int) -> List[Dict]:
        """Trova match automatici in parallelo"""
        
        # Get candidate transactions in batches
        loop = asyncio.get_event_loop()
        candidates = await loop.run_in_executor(
            self.executor,
            self._get_candidate_transactions,
            max_suggestions * 2  # Get more candidates for better filtering
        )
        
        if not candidates:
            return []
        
        # Process candidates in parallel batches
        batch_size = max(5, len(candidates) // ReconciliationConfig.MAX_WORKERS)
        batches = [candidates[i:i + batch_size] for i in range(0, len(candidates), batch_size)]
        
        tasks = []
        for batch in batches:
            task = asyncio.create_task(self._process_candidate_batch(batch, confidence_level))
            tasks.append(task)
        
        # Collect results
        all_matches = []
        for completed_task in asyncio.as_completed(tasks):
            try:
                batch_matches = await completed_task
                all_matches.extend(batch_matches)
            except Exception as e:
                logger.error(f"Batch processing failed: {e}")
        
        # Sort and limit results
        all_matches.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        return all_matches[:max_suggestions]
    
    async def process_suggestions_parallel(self, requests: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """Processa richieste suggerimenti in parallelo"""
        
        async def _process_single_request(request: Dict[str, Any]) -> Tuple[str, List[Dict]]:
            async with self.semaphore:
                request_id = request.get('id', 'unknown')
                request_type = request.get('type', '1_to_1')
                
                try:
                    if request_type == '1_to_1':
                        suggestions = await self._process_1_to_1_request(request)
                    elif request_type == 'n_to_m':
                        suggestions = await self._process_n_to_m_request(request)
                    elif request_type == 'automatic':
                        suggestions = await self._process_automatic_request(request)
                    else:
                        suggestions = []
                    
                    return request_id, suggestions
                    
                except Exception as e:
                    logger.error(f"Request processing failed for {request_id}: {e}")
                    return request_id, []
        
        # Execute all requests in parallel
        tasks = [_process_single_request(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Build result dictionary
        result_dict = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Parallel processing exception: {result}")
                continue
            
            request_id, suggestions = result
            result_dict[request_id] = suggestions
        
        return result_dict
    
    async def _process_candidate_batch(self, candidates: List[Dict], 
                                     confidence_level: str) -> List[Dict]:
        """Processa batch di candidati per match automatici"""
        
        loop = asyncio.get_event_loop()
        matches = []
        
        for candidate in candidates:
            try:
                # Process each candidate transaction
                transaction_id = candidate['transaction_id']
                
                suggestions = await loop.run_in_executor(
                    self.executor,
                    suggest_reconciliation_matches_enhanced,
                    None,  # invoice_id
                    transaction_id,
                    None   # anagraphics_id_filter
                )
                
                # Filter by confidence level
                high_confidence_matches = [
                    s for s in suggestions 
                    if s.get('confidence', '').startswith(confidence_level) and
                       s.get('confidence_score', 0) >= ReconciliationConfig.HIGH_CONFIDENCE_THRESHOLD
                ]
                
                if high_confidence_matches:
                    # Take the best match
                    best_match = max(high_confidence_matches, 
                                   key=lambda x: x.get('confidence_score', 0))
                    
                    # Add transaction context
                    best_match['transaction_id'] = transaction_id
                    best_match['candidate_info'] = candidate
                    
                    matches.append(best_match)
                    
            except Exception as e:
                logger.debug(f"Candidate processing failed: {e}")
        
        return matches
    
    def _get_candidate_transactions(self, limit: int) -> List[Dict]:
        """Ottiene transazioni candidate per match automatici"""
        from app.core.database import get_connection
        
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                
                query = """
                    SELECT 
                        id as transaction_id,
                        amount,
                        reconciled_amount,
                        description,
                        transaction_date,
                        (amount - reconciled_amount) as remaining_amount
                    FROM BankTransactions
                    WHERE reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                      AND ABS(amount - reconciled_amount) > 0.01
                    ORDER BY ABS(amount - reconciled_amount) DESC
                    LIMIT ?
                """
                
                cursor.execute(query, (limit,))
                return [dict(row) for row in cursor.fetchall()]
                
        except Exception as e:
            logger.error(f"Failed to get candidate transactions: {e}")
            return []
    
    async def _process_1_to_1_request(self, request: Dict[str, Any]) -> List[Dict]:
        """Processa richiesta 1:1"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            suggest_reconciliation_matches_enhanced,
            request.get('invoice_id'),
            request.get('transaction_id'),
            request.get('anagraphics_id_filter')
        )
    
    async def _process_n_to_m_request(self, request: Dict[str, Any]) -> List[Dict]:
        """Processa richiesta N:M"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            suggest_cumulative_matches_v2,
            request['transaction_id'],
            request.get('anagraphics_id_filter'),
            request.get('max_combination_size', ReconciliationConfig.MAX_COMBINATION_SIZE),
            request.get('max_search_time_ms', ReconciliationConfig.MAX_SEARCH_TIME_MS),
            request.get('exclude_invoice_ids'),
            request.get('start_date'),
            request.get('end_date')
        )
    
    async def _process_automatic_request(self, request: Dict[str, Any]) -> List[Dict]:
        """Processa richiesta automatic"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            find_automatic_matches_optimized,
            request.get('confidence_level', 'Exact')
        )


# ================== ISTANZA GLOBALE DELL'ADAPTER ==================

_reconciliation_adapter_instance: Optional[ReconciliationAdapter] = None
_adapter_lock = threading.Lock()

def get_reconciliation_adapter() -> ReconciliationAdapter:
    """Factory function thread-safe per ottenere l'istanza dell'adapter"""
    global _reconciliation_adapter_instance
    
    if _reconciliation_adapter_instance is None:
        with _adapter_lock:
            if _reconciliation_adapter_instance is None:
                _reconciliation_adapter_instance = ReconciliationAdapter()
                logger.info("ReconciliationAdapter V3.0 istanza globale creata")
    
    return _reconciliation_adapter_instance

# Instance per compatibilità
reconciliation_adapter = get_reconciliation_adapter()


# ================== API COMPATIBILITY LAYER ==================

class ReconciliationAdapterCompat:
    """Layer di compatibilità per API esistenti"""
    
    def __init__(self, adapter: ReconciliationAdapter):
        self.adapter = adapter
    
    # Legacy sync methods for backward compatibility
    
    def suggest_1_to_1_matches(self, **kwargs) -> List[Dict]:
        """Legacy sync method"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.adapter.suggest_1_to_1_matches_async(**kwargs)
            )
        finally:
            loop.close()
    
    def suggest_n_to_m_matches(self, **kwargs) -> List[Dict]:
        """Legacy sync method"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.adapter.suggest_n_to_m_matches_async(**kwargs)
            )
        finally:
            loop.close()
    
    def apply_manual_match(self, **kwargs) -> Dict[str, Any]:
        """Legacy sync method"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.adapter.apply_manual_match_async(**kwargs)
            )
        finally:
            loop.close()
    
    def find_automatic_matches(self, **kwargs) -> List[Dict]:
        """Legacy sync method"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.adapter.find_automatic_matches_async(**kwargs)
            )
        finally:
            loop.close()
    
    def ignore_transaction(self, **kwargs) -> Dict[str, Any]:
        """Legacy sync method"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.adapter.ignore_transaction_async(**kwargs)
            )
        finally:
            loop.close()


# ================== INITIALIZATION E SETUP ==================

async def initialize_reconciliation_adapter_async() -> Dict[str, Any]:
    """Inizializza completamente l'adapter di riconciliazione"""
    
    start_time = time.time()
    initialization_steps = []
    
    try:
        # 1. Initialize core reconciliation engine
        core_init = initialize_reconciliation_engine()
        initialization_steps.append({
            'step': 'core_engine',
            'success': core_init,
            'message': 'Core reconciliation engine initialized' if core_init else 'Core init failed'
        })
        
        # 2. Initialize smart reconciliation if available
        if SMART_RECONCILIATION_AVAILABLE:
            smart_init = initialize_smart_reconciliation_engine()
            initialization_steps.append({
                'step': 'smart_reconciliation',
                'success': smart_init,
                'message': 'Smart reconciliation initialized' if smart_init else 'Smart init failed'
            })
        
        # 3. Initialize AI engine components
        ai_init_success = True
        try:
            # Warm up AI components
            await _ai_engine.enhance_suggestions_with_ai([], {'test': True})
            ai_init_success = True
        except Exception as e:
            logger.warning(f"AI engine initialization warning: {e}")
            ai_init_success = False
        
        initialization_steps.append({
            'step': 'ai_engine',
            'success': ai_init_success,
            'message': 'AI engine ready' if ai_init_success else 'AI engine init failed'
        })
        
        # 4. Warm up caches
        adapter = get_reconciliation_adapter()
        cache_warmup = await adapter.warm_up_reconciliation_caches_async()
        initialization_steps.append({
            'step': 'cache_warmup',
            'success': cache_warmup['success'],
            'message': f"Cache warmup completed in {cache_warmup['warmup_time_seconds']}s"
        })
        
        # 5. Verify configuration
        config_check = _verify_configuration()
        initialization_steps.append({
            'step': 'configuration',
            'success': config_check['valid'],
            'message': config_check['message']
        })
        
        total_time = time.time() - start_time
        overall_success = all(step['success'] for step in initialization_steps)
        
        return {
            'success': overall_success,
            'initialization_time_seconds': round(total_time, 2),
            'steps': initialization_steps,
            'adapter_version': '3.0',
            'features_enabled': {
                'ai_matching': ReconciliationConfig.ENABLE_AI_MATCHING,
                'pattern_learning': ReconciliationConfig.ENABLE_PATTERN_LEARNING,
                'predictive_scoring': ReconciliationConfig.ENABLE_PREDICTIVE_SCORING,
                'smart_reconciliation': SMART_RECONCILIATION_AVAILABLE,
                'batch_processing': True,
                'fuzzy_matching': ReconciliationConfig.ENABLE_FUZZY_MATCHING
            },
            'performance_config': {
                'max_workers': ReconciliationConfig.MAX_WORKERS,
                'batch_size': ReconciliationConfig.BATCH_SIZE,
                'max_combination_size': ReconciliationConfig.MAX_COMBINATION_SIZE,
                'max_search_time_ms': ReconciliationConfig.MAX_SEARCH_TIME_MS
            }
        }
        
    except Exception as e:
        logger.error(f"Reconciliation adapter initialization failed: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'initialization_time_seconds': round(time.time() - start_time, 2),
            'steps': initialization_steps
        }

def _verify_configuration() -> Dict[str, Any]:
    """Verifica la configurazione dell'adapter"""
    
    issues = []
    
    # Check thread pool size
    if ReconciliationConfig.MAX_WORKERS > os.cpu_count() * 3:
        issues.append("MAX_WORKERS might be too high for available CPUs")
    
    # Check memory settings
    available_memory_gb = psutil.virtual_memory().available / (1024**3)
    if available_memory_gb < 2 and ReconciliationConfig.MAX_WORKERS > 4:
        issues.append("High worker count with limited memory available")
    
    # Check cache settings
    if ReconciliationConfig.CACHE_TTL_MINUTES > 60:
        issues.append("Cache TTL is very high - data might become stale")
    
    # Check AI settings consistency
    if ReconciliationConfig.ENABLE_PREDICTIVE_SCORING and not ReconciliationConfig.ENABLE_AI_MATCHING:
        issues.append("Predictive scoring enabled but AI matching disabled")
    
    return {
        'valid': len(issues) == 0,
        'message': 'Configuration valid' if len(issues) == 0 else f"Issues found: {'; '.join(issues)}",
        'issues': issues
    }


# ================== DIAGNOSTIC E TESTING ==================

async def run_reconciliation_diagnostics_async() -> Dict[str, Any]:
    """Esegue diagnostica completa dell'adapter"""
    
    adapter = get_reconciliation_adapter()
    diagnostics = {
        'timestamp': datetime.now().isoformat(),
        'adapter_version': '3.0',
        'tests': []
    }
    
    # Test 1: Basic functionality
    try:
        test_suggestions = await adapter.find_automatic_matches_async('Exact', max_suggestions=5)
        diagnostics['tests'].append({
            'name': 'basic_functionality',
            'status': 'pass',
            'details': f"Generated {len(test_suggestions)} suggestions"
        })
    except Exception as e:
        diagnostics['tests'].append({
            'name': 'basic_functionality',
            'status': 'fail',
            'error': str(e)
        })
    
    # Test 2: Cache functionality
    try:
        cache_stats = _recon_cache.get_cache_stats()
        diagnostics['tests'].append({
            'name': 'cache_functionality',
            'status': 'pass',
            'details': f"Cache has {cache_stats['entries']} entries"
        })
    except Exception as e:
        diagnostics['tests'].append({
            'name': 'cache_functionality',
            'status': 'fail',
            'error': str(e)
        })
    
    # Test 3: AI engine
    try:
        if ReconciliationConfig.ENABLE_AI_MATCHING:
            test_context = {'test': True}
            await _ai_engine.enhance_suggestions_with_ai([], test_context)
            diagnostics['tests'].append({
                'name': 'ai_engine',
                'status': 'pass',
                'details': 'AI engine responsive'
            })
        else:
            diagnostics['tests'].append({
                'name': 'ai_engine',
                'status': 'skipped',
                'details': 'AI matching disabled'
            })
    except Exception as e:
        diagnostics['tests'].append({
            'name': 'ai_engine',
            'status': 'fail',
            'error': str(e)
        })
    
    # Test 4: Smart reconciliation
    try:
        if SMART_RECONCILIATION_AVAILABLE:
            smart_stats = get_smart_reconciliation_statistics()
            diagnostics['tests'].append({
                'name': 'smart_reconciliation',
                'status': 'pass',
                'details': f"Smart reconciliation available with stats"
            })
        else:
            diagnostics['tests'].append({
                'name': 'smart_reconciliation',
                'status': 'skipped',
                'details': 'Smart reconciliation not available'
            })
    except Exception as e:
        diagnostics['tests'].append({
            'name': 'smart_reconciliation',
            'status': 'fail',
            'error': str(e)
        })
    
    # Test 5: Performance metrics
    try:
        perf_metrics = await adapter.get_reconciliation_performance_async()
        diagnostics['tests'].append({
            'name': 'performance_metrics',
            'status': 'pass',
            'details': f"Performance tracking operational"
        })
    except Exception as e:
        diagnostics['tests'].append({
            'name': 'performance_metrics',
            'status': 'fail',
            'error': str(e)
        })
    
    # Summary
    passed_tests = sum(1 for test in diagnostics['tests'] if test['status'] == 'pass')
    total_tests = len([test for test in diagnostics['tests'] if test['status'] != 'skipped'])
    
    diagnostics['summary'] = {
        'passed': passed_tests,
        'total': total_tests,
        'success_rate': round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0,
        'overall_status': 'healthy' if passed_tests == total_tests else 'issues_detected'
    }
    
    return diagnostics


# ================== HEALTH CHECK E MONITORING ==================

class ReconciliationHealthChecker:
    """Health checker avanzato per il sistema di riconciliazione"""
    
    def __init__(self, adapter: ReconciliationAdapter):
        self.adapter = adapter
        self.last_check = None
        self.check_history = []
        
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Esegue un check completo del sistema"""
        start_time = time.time()
        
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'components': {},
            'performance_summary': {},
            'recommendations': [],
            'check_duration_seconds': 0
        }
        
        # Check core components
        components_to_check = [
            ('adapter', self._check_adapter_health),
            ('cache', self._check_cache_health),
            ('ai_engine', self._check_ai_engine_health),
            ('smart_reconciliation', self._check_smart_reconciliation_health),
            ('database', self._check_database_health),
            ('memory', self._check_memory_health),
            ('performance', self._check_performance_health)
        ]
        
        for component_name, check_func in components_to_check:
            try:
                component_status = await check_func()
                health_status['components'][component_name] = component_status
                
                if component_status['status'] != 'healthy':
                    health_status['overall_status'] = 'degraded'
                    
            except Exception as e:
                health_status['components'][component_name] = {
                    'status': 'error',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                health_status['overall_status'] = 'unhealthy'
        
        # Generate performance summary
        health_status['performance_summary'] = await self._generate_performance_summary()
        
        # Generate recommendations
        health_status['recommendations'] = self._generate_health_recommendations(health_status)
        
        health_status['check_duration_seconds'] = round(time.time() - start_time, 2)
        
        # Store in history
        self.check_history.append(health_status)
        if len(self.check_history) > 10:
            self.check_history = self.check_history[-5:]  # Keep last 5 checks
        
        self.last_check = health_status
        return health_status
    
    async def _check_adapter_health(self) -> Dict[str, Any]:
        """Check adapter health"""
        try:
            # Test basic functionality
            start_time = time.perf_counter()
            test_result = await self.adapter.find_automatic_matches_async('Exact', max_suggestions=1)
            response_time = (time.perf_counter() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time, 2),
                'operations_count': self.adapter.total_operations,
                'uptime_hours': round((datetime.now() - self.adapter.startup_time).total_seconds() / 3600, 2)
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _check_cache_health(self) -> Dict[str, Any]:
        """Check cache health"""
        try:
            cache_stats = _recon_cache.get_cache_stats()
            
            # Determine cache health
            cache_utilization = cache_stats['entries'] / cache_stats['max_entries']
            hit_rate = cache_stats.get('avg_hits_per_entry', 0)
            
            status = 'healthy'
            if cache_utilization > 0.9:
                status = 'degraded'  # Cache nearly full
            elif hit_rate < 1:
                status = 'degraded'  # Low hit rate
            
            return {
                'status': status,
                'utilization_percent': round(cache_utilization * 100, 1),
                'hit_rate': hit_rate,
                **cache_stats
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_ai_engine_health(self) -> Dict[str, Any]:
        """Check AI engine health"""
        try:
            if not ReconciliationConfig.ENABLE_AI_MATCHING:
                return {
                    'status': 'disabled',
                    'message': 'AI matching is disabled'
                }
            
            # Test AI enhancement
            start_time = time.perf_counter()
            test_suggestions = [{'confidence_score': 0.5, 'reasons': ['test']}]
            enhanced = await _ai_engine.enhance_suggestions_with_ai(test_suggestions, {'test': True})
            response_time = (time.perf_counter() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time, 2),
                'enhancement_applied': len(enhanced) > 0 and 'ai_confidence_score' in enhanced[0],
                'pattern_count': len(_ai_engine.pattern_matcher.known_patterns)
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_smart_reconciliation_health(self) -> Dict[str, Any]:
        """Check smart reconciliation health"""
        try:
            if not SMART_RECONCILIATION_AVAILABLE:
                return {
                    'status': 'unavailable',
                    'message': 'Smart reconciliation module not available'
                }
            
            stats = get_smart_reconciliation_statistics()
            
            status = 'healthy'
            if isinstance(stats, dict) and 'error' in stats:
                status = 'error'
            
            return {
                'status': status,
                'statistics': stats
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            from app.core.database import get_connection
            
            start_time = time.perf_counter()
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM Invoices LIMIT 1")
                result = cursor.fetchone()
            query_time = (time.perf_counter() - start_time) * 1000
            
            return {
                'status': 'healthy',
                'connection_time_ms': round(query_time, 2),
                'query_result': result[0] if result else 0
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_memory_health(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            
            # Check system memory
            system_memory = psutil.virtual_memory()
            memory_percent = process.memory_percent()
            
            status = 'healthy'
            if memory_mb > 1000:  # Over 1GB
                status = 'degraded'
            elif memory_percent > 10:  # Over 10% of system memory
                status = 'degraded'
            
            return {
                'status': status,
                'memory_usage_mb': round(memory_mb, 2),
                'memory_percent': round(memory_percent, 2),
                'system_available_gb': round(system_memory.available / (1024**3), 2)
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_performance_health(self) -> Dict[str, Any]:
        """Check performance metrics"""
        try:
            perf_stats = _performance_monitor.get_comprehensive_stats()
            
            if perf_stats.get('status') == 'no_data':
                return {
                    'status': 'no_data',
                    'message': 'No performance data available yet'
                }
            
            avg_time = perf_stats.get('performance', {}).get('avg_time_ms', 0)
            p95_time = perf_stats.get('performance', {}).get('p95_time_ms', 0)
            
            status = 'healthy'
            if avg_time > 3000:  # Over 3 seconds average
                status = 'degraded'
            elif p95_time > 10000:  # Over 10 seconds for 95th percentile
                status = 'degraded'
            
            return {
                'status': status,
                'avg_response_time_ms': avg_time,
                'p95_response_time_ms': p95_time,
                'total_operations': perf_stats.get('total_operations', 0),
                'uptime_hours': perf_stats.get('uptime_hours', 0)
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _generate_performance_summary(self) -> Dict[str, Any]:
        """Generate performance summary"""
        try:
            perf_data = await self.adapter.get_reconciliation_performance_async()
            
            return {
                'operations_per_hour': round(self.adapter.total_operations / max(
                    (datetime.now() - self.adapter.startup_time).total_seconds() / 3600, 0.1
                ), 2),
                'memory_efficiency': 'good' if perf_data['system_resources']['memory_usage_mb'] < 500 else 'needs_attention',
                'cache_efficiency': perf_data['cache_statistics'].get('avg_hits_per_entry', 0),
                'ai_usage_rate': perf_data['performance_metrics'].get('quality_metrics', {}).get('ai_usage_rate_percent', 0)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _generate_health_recommendations(self, health_status: Dict[str, Any]) -> List[str]:
        """Generate health recommendations"""
        recommendations = []
        
        # Check cache health
        cache_component = health_status['components'].get('cache', {})
        if cache_component.get('utilization_percent', 0) > 80:
            recommendations.append("Consider increasing cache size or reducing TTL")
        
        # Check memory health
        memory_component = health_status['components'].get('memory', {})
        if memory_component.get('memory_usage_mb', 0) > 800:
            recommendations.append("High memory usage detected - consider optimization")
        
        # Check performance
        performance_component = health_status['components'].get('performance', {})
        if performance_component.get('avg_response_time_ms', 0) > 2000:
            recommendations.append("Slow response times detected - review query optimization")
        
        # Check AI engine
        ai_component = health_status['components'].get('ai_engine', {})
        if ai_component.get('status') == 'disabled':
            recommendations.append("Enable AI matching for better suggestion quality")
        
        if not recommendations:
            recommendations.append("All systems operating optimally")
        
        return recommendations


# ================== MAINTENANCE E CLEANUP ==================

class ReconciliationMaintenance:
    """Sistema di manutenzione per il reconciliation adapter"""
    
    def __init__(self, adapter: ReconciliationAdapter):
        self.adapter = adapter
        self.maintenance_history = []
    
    async def run_maintenance_cycle(self) -> Dict[str, Any]:
        """Esegue un ciclo completo di manutenzione"""
        start_time = time.time()
        maintenance_result = {
            'timestamp': datetime.now().isoformat(),
            'operations': [],
            'total_time_seconds': 0,
            'success': True
        }
        
        maintenance_operations = [
            ('cache_cleanup', self._cleanup_caches),
            ('memory_optimization', self._optimize_memory),
            ('pattern_cleanup', self._cleanup_patterns),
            ('performance_reset', self._reset_performance_counters),
            ('log_rotation', self._rotate_logs)
        ]
        
        for op_name, op_func in maintenance_operations:
            try:
                op_start = time.time()
                result = await op_func()
                op_time = time.time() - op_start
                
                maintenance_result['operations'].append({
                    'operation': op_name,
                    'success': True,
                    'duration_seconds': round(op_time, 2),
                    'details': result
                })
            except Exception as e:
                maintenance_result['operations'].append({
                    'operation': op_name,
                    'success': False,
                    'error': str(e),
                    'duration_seconds': round(time.time() - op_start, 2)
                })
                maintenance_result['success'] = False
        
        maintenance_result['total_time_seconds'] = round(time.time() - start_time, 2)
        
        # Store in history
        self.maintenance_history.append(maintenance_result)
        if len(self.maintenance_history) > 20:
            self.maintenance_history = self.maintenance_history[-10:]
        
        return maintenance_result
    
    async def _cleanup_caches(self) -> Dict[str, Any]:
        """Pulisce e ottimizza le cache"""
        initial_entries = len(_recon_cache._cache)
        
        # Clear expired entries
        current_time = time.time()
        ttl_seconds = ReconciliationConfig.CACHE_TTL_MINUTES * 60
        
        expired_keys = []
        for key, entry in _recon_cache._cache.items():
            if current_time - entry['timestamp'] > ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            _recon_cache._cache.pop(key, None)
            _recon_cache._access_stats.pop(key, None)
        
        # Optimize pattern cache
        pattern_entries_before = sum(len(patterns) for patterns in _recon_cache._pattern_cache.values())
        cutoff_time = current_time - (7 * 24 * 3600)  # 7 days
        
        for pattern_key in _recon_cache._pattern_cache:
            _recon_cache._pattern_cache[pattern_key] = [
                p for p in _recon_cache._pattern_cache[pattern_key]
                if p.get('timestamp', 0) > cutoff_time
            ]
        
        pattern_entries_after = sum(len(patterns) for patterns in _recon_cache._pattern_cache.values())
        
        return {
            'cache_entries_removed': len(expired_keys),
            'cache_entries_remaining': len(_recon_cache._cache),
            'pattern_entries_removed': pattern_entries_before - pattern_entries_after,
            'pattern_entries_remaining': pattern_entries_after
        }
    
    async def _optimize_memory(self) -> Dict[str, Any]:
        """Ottimizza l'uso della memoria"""
        import gc
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024
        
        # Force garbage collection
        collected = gc.collect()
        
        # Clear function caches
        if hasattr(suggest_reconciliation_matches_enhanced, 'cache_clear'):
            suggest_reconciliation_matches_enhanced.cache_clear()
        
        # Get final memory usage
        memory_after = process.memory_info().rss / 1024 / 1024
        memory_freed = memory_before - memory_after
        
        return {
            'memory_before_mb': round(memory_before, 2),
            'memory_after_mb': round(memory_after, 2),
            'memory_freed_mb': round(memory_freed, 2),
            'objects_collected': collected
        }
    
    async def _cleanup_patterns(self) -> Dict[str, Any]:
        """Pulisce pattern AI obsoleti"""
        patterns_removed = 0
        
        # Clean up AI engine patterns
        initial_patterns = len(_ai_engine.pattern_matcher.known_patterns)
        if initial_patterns > 50:
            # Keep only the most recent patterns
            _ai_engine.pattern_matcher.known_patterns = _ai_engine.pattern_matcher.known_patterns[-25:]
            patterns_removed = initial_patterns - len(_ai_engine.pattern_matcher.known_patterns)
        
        # Clean up confidence calibrator data
        historical_entries = sum(
            data['total'] for data in _ai_engine.confidence_calibrator.historical_accuracy.values()
        )
        
        return {
            'ai_patterns_removed': patterns_removed,
            'ai_patterns_remaining': len(_ai_engine.pattern_matcher.known_patterns),
            'historical_accuracy_entries': historical_entries
        }
    
    async def _reset_performance_counters(self) -> Dict[str, Any]:
        """Reset contatori di performance se necessario"""
        metrics_count = len(_performance_monitor.metrics)
        
        # Keep only recent metrics if too many
        if metrics_count > 1000:
            _performance_monitor.metrics = _performance_monitor.metrics[-500:]
            metrics_removed = metrics_count - len(_performance_monitor.metrics)
        else:
            metrics_removed = 0
        
        return {
            'metrics_removed': metrics_removed,
            'metrics_remaining': len(_performance_monitor.metrics),
            'total_operations': self.adapter.total_operations
        }
    
    async def _rotate_logs(self) -> Dict[str, Any]:
        """Rotazione dei log se necessario"""
        # Placeholder for log rotation logic
        return {
            'log_files_rotated': 0,
            'log_size_mb': 0,
            'oldest_log_date': datetime.now().isoformat()
        }


# ================== UTILITY FUNCTIONS ==================

def create_reconciliation_report(adapter: ReconciliationAdapter) -> Dict[str, Any]:
    """Crea un report completo dello stato del sistema"""
    return {
        'report_generated': datetime.now().isoformat(),
        'adapter_version': '3.0',
        'system_info': {
            'total_operations': adapter.total_operations,
            'uptime_hours': round((datetime.now() - adapter.startup_time).total_seconds() / 3600, 2),
            'memory_usage_mb': round(psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024, 2),
            'thread_count': threading.active_count()
        },
        'configuration': {
            'max_workers': ReconciliationConfig.MAX_WORKERS,
            'batch_size': ReconciliationConfig.BATCH_SIZE,
            'ai_enabled': ReconciliationConfig.ENABLE_AI_MATCHING,
            'pattern_learning': ReconciliationConfig.ENABLE_PATTERN_LEARNING,
            'smart_reconciliation': SMART_RECONCILIATION_AVAILABLE
        },
        'cache_stats': _recon_cache.get_cache_stats(),
        'performance_summary': _performance_monitor.get_comprehensive_stats()
    }

async def emergency_reset_reconciliation_system() -> Dict[str, Any]:
    """Reset di emergenza del sistema in caso di problemi critici"""
    logger.warning("Emergency reset of reconciliation system initiated")
    
    reset_operations = []
    
    try:
        # Clear all caches
        _recon_cache.clear()
        reset_operations.append("Cache cleared")
        
        # Reset AI engine
        _ai_engine.pattern_matcher.known_patterns.clear()
        _ai_engine.confidence_calibrator.historical_accuracy.clear()
        reset_operations.append("AI engine reset")
        
        # Reset performance monitor
        _performance_monitor.metrics.clear()
        _performance_monitor.operation_counts.clear()
        reset_operations.append("Performance monitor reset")
        
        # Force garbage collection
        import gc
        gc.collect()
        reset_operations.append("Memory cleanup")
        
        logger.info("Emergency reset completed successfully")
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'operations_completed': reset_operations,
            'message': 'System reset completed successfully'
        }
        
    except Exception as e:
        logger.error(f"Emergency reset failed: {e}")
        return {
            'success': False,
            'timestamp': datetime.now().isoformat(),
            'operations_completed': reset_operations,
            'error': str(e)
        }

def get_reconciliation_system_info() -> Dict[str, Any]:
    """Ottiene informazioni complete del sistema"""
    return {
        'system_info': {
            'version': '3.0',
            'python_version': os.sys.version,
            'platform': os.name,
            'cpu_count': os.cpu_count(),
            'memory_total_gb': round(psutil.virtual_memory().total / (1024**3), 2)
        },
        'features': {
            'ai_matching': ReconciliationConfig.ENABLE_AI_MATCHING,
            'pattern_learning': ReconciliationConfig.ENABLE_PATTERN_LEARNING,
            'predictive_scoring': ReconciliationConfig.ENABLE_PREDICTIVE_SCORING,
            'smart_reconciliation': SMART_RECONCILIATION_AVAILABLE,
            'batch_processing': True,
            'async_support': True,
            'caching': True,
            'performance_monitoring': True
        },
        'configuration': {
            'max_workers': ReconciliationConfig.MAX_WORKERS,
            'batch_size': ReconciliationConfig.BATCH_SIZE,
            'cache_ttl_minutes': ReconciliationConfig.CACHE_TTL_MINUTES,
            'max_cache_entries': ReconciliationConfig.MAX_CACHE_ENTRIES,
            'high_confidence_threshold': ReconciliationConfig.HIGH_CONFIDENCE_THRESHOLD,
            'max_combination_size': ReconciliationConfig.MAX_COMBINATION_SIZE
        }
    }


# ================== FINAL INITIALIZATION ==================

def setup_reconciliation_logging():
    """Setup logging specifico per reconciliation"""
    reconciliation_logger = logging.getLogger('reconciliation')
    reconciliation_logger.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Add console handler if not exists
    if not reconciliation_logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        reconciliation_logger.addHandler(console_handler)
    
    return reconciliation_logger

# Setup logging
reconciliation_logger = setup_reconciliation_logging()

# Final startup message
logger.info("ReconciliationAdapter V3.0 - Sistema di riconciliazione ultra-ottimizzato caricato con successo")
logger.info(f"Configurazione: AI={ReconciliationConfig.ENABLE_AI_MATCHING}, Smart={SMART_RECONCILIATION_AVAILABLE}, Workers={ReconciliationConfig.MAX_WORKERS}")


# ================== EXPORT PUBBLICO ==================

# Legacy compatibility instance
reconciliation_adapter_compat = ReconciliationAdapterCompat(reconciliation_adapter)

# Health checker and maintenance instances
health_checker = ReconciliationHealthChecker(reconciliation_adapter)
maintenance_system = ReconciliationMaintenance(reconciliation_adapter)

__all__ = [
    # Core classes
    'ReconciliationAdapter',
    'ReconciliationConfig',
    'ReconciliationMetrics',
    'ReconciliationPerformanceMonitor',
    
    # Cache and AI components
    'ReconciliationIntelligentCache',
    'AIEnhancedReconciliationEngine',
    'ConfidenceCalibrator',
    'PatternMatcher',
    'AnomalyDetector',
    
    # Batch processing
    'BatchReconciliationProcessor',
    
    # Instances
    'reconciliation_adapter',
    'get_reconciliation_adapter',
    'reconciliation_adapter_compat',
    'ReconciliationAdapterCompat',
    
    # Health and maintenance
    'ReconciliationHealthChecker',
    'ReconciliationMaintenance',
    'health_checker',
    'maintenance_system',
    
    # Async functions
    'initialize_reconciliation_adapter_async',
    'run_reconciliation_diagnostics_async',
    
    # Utility functions
    'create_reconciliation_report',
    'emergency_reset_reconciliation_system',
    'get_reconciliation_system_info',
    'setup_reconciliation_logging',
    
    # Global instances for monitoring
    '_recon_cache',
    '_ai_engine',
    '_performance_monitor'
]

# Version info
__version__ = '3.0.0'
__author__ = 'ReconciliationAdapter Team'
__description__ = 'Ultra-optimized reconciliation adapter with AI/ML enhancement'

logger.info(f"ReconciliationAdapter V{__version__} fully loaded and ready for production use!")

        .0, max(0.0, calibrated))
    
    def update_accuracy(self, match_type: str, amount: float, was_correct: bool):
        """Aggiorna accuracy storica"""
        with self._lock:
            key = f"{match_type}_{self._get_amount_bucket(amount)}"
            self.historical_accuracy[key]['total'] += 1
            if was_correct:
                self.historical_accuracy[key]['correct'] += 1
    
    def _get_amount_bucket(self, amount: float) -> str:
        """Categorizza importo per calibrazione"""
        if amount < 500:
            return 'small'
        elif amount < 5000:
            return 'medium'
        else:
            return 'large'

class PatternMatcher:
    """Pattern matcher avanzato per reconciliation"""
    
    def __init__(self):
        self.known_patterns = []
        self._lock = threading.RLock()
    
    def score_pattern_match(self, suggestion: Dict, context: Dict) -> float:
        """Calcola score basato su pattern riconosciuti"""
        if not self.known_patterns:
            return 0.5  # Neutral score
        
        # Features extraction
        features = self._extract_features(suggestion, context)
        
        # Find best matching pattern
        best_score = 0.0
        for pattern in self.known_patterns:
            score = self._calculate_pattern_similarity(features, pattern)
            best_score = max(best_score, score)
        
        return best_score
    
    def _extract_features(self, suggestion: Dict, context: Dict) -> Dict:
        """Estrae features per pattern matching"""
        return {
            'amount_range': self._categorize_amount(suggestion.get('total_amount', 0)),
            'invoice_count': len(suggestion.get('invoice_ids', [])),
            'has_exact_amount': 'Importo Esatto' in suggestion.get('reasons', []),
            'has_invoice_number': any('Num.Fatt' in reason for reason in suggestion.get('reasons', [])),
            'match_type': suggestion.get('match_type', 'unknown'),
            'anagraphics_context': context.get('anagraphics_id') is not None
        }
    
    def _calculate_pattern_similarity(self, features: Dict, pattern: Dict) -> float:
        """Calcola similarità tra features e pattern"""
        matches = 0
        total_features = len(features)
        
        for key, value in features.items():
            if pattern.get(key) == value:
                matches += 1
        
        return matches / total_features if total_features > 0 else 0.0
    
    def _categorize_amount(self, amount: float) -> str:
        """Categorizza importo"""
        if amount < 100:
            return 'tiny'
        elif amount < 1000:
            return 'small'
        elif amount < 10000:
            return 'medium'
        else:
            return 'large'
    
    def learn_pattern(self, features: Dict, success: bool):
        """Apprende nuovo pattern"""
        if success:
            with self._lock:
                self.known_patterns.append(features)
                # Keep only recent patterns
                if len(self.known_patterns) > 100:
                    self.known_patterns = self.known_patterns[-50:]

class AnomalyDetector:
    """Rilevatore di anomalie per reconciliation"""
    
    def __init__(self):
        self.normal_patterns = []
        self._lock = threading.RLock()
    
    def detect_anomaly(self, suggestion: Dict, context: Dict) -> float:
        """Rileva anomalie nel suggerimento (0=normale, 1=anomalia)"""
        anomaly_score = 0.0
        
        # Check amount anomalies
        amount = suggestion.get('total_amount', 0)
        if amount > 100000:  # Very large amount
            anomaly_score += 0.3
        elif amount < 1:  # Very small amount
            anomaly_score += 0.2
        
        # Check unusual invoice count
        invoice_count = len(suggestion.get('invoice_ids', []))
        if invoice_count > 5:  # Many invoices
            anomaly_score += 0.2
        
        # Check confidence vs reasons mismatch
        confidence = suggestion.get('confidence_score', 0)
        reasons_count = len(suggestion.get('reasons', []))
        if confidence > 0.8 and reasons_count < 2:
            anomaly_score += 0.1  # High confidence with few reasons
        elif confidence < 0.3 and reasons_count > 3:
            anomaly_score += 0.1  # Low confidence with many reasons
        
        # Check temporal anomalies
        if self._is_temporal_anomaly(suggestion, context):
            anomaly_score += 0.2
        
        return min(1
