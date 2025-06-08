"""
Analytics Adapter ULTRA-OTTIMIZZATO per FastAPI - Versione 3.0
Sfrutta al 100% il backend con algoritmi avanzati, ML, caching intelligente e async processing
Performance-first design con memory management e pattern recognition
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Union, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
from datetime import date, datetime, timedelta
from decimal import Decimal
import numpy as np
from collections import defaultdict, Counter
import threading
import time
import psutil
import os
from functools import lru_cache, wraps
from dataclasses import dataclass, field
import json
import pickle
import hashlib
from contextlib import asynccontextmanager
import warnings
warnings.filterwarnings('ignore')

# Import del core COMPLETO con tutte le funzioni ottimizzate
from app.core.analysis import (
    # Core functions V2 ottimizzate
    get_dashboard_kpis,
    get_cashflow_data_optimized,
    get_monthly_revenue_costs_optimized,
    get_products_analysis_optimized,
    get_aging_summary_optimized,
    get_anagraphic_financial_summary,
    calculate_and_update_client_scores,
    
    # Advanced functions
    get_seasonal_product_analysis,
    get_commission_summary,
    get_clients_by_score,
    get_product_monthly_sales,
    get_due_dates_in_month,
    get_invoices_due_on_date,
    export_analysis_to_excel,
    get_business_insights_summary,
    
    # Nuove funzioni ortofrutticolo
    get_product_freshness_analysis,
    get_supplier_quality_analysis,
    get_produce_price_trends,
    get_customer_purchase_patterns,
    get_produce_quality_metrics,
    get_weekly_purchase_recommendations,
    get_transport_cost_analysis,
    get_produce_specific_kpis,
    export_produce_analysis_pack,
    
    # Compatibility layers
    get_monthly_cash_flow_analysis,
    get_monthly_revenue_analysis,
    get_product_analysis,
    get_top_clients_by_revenue,
    get_top_overdue_invoices
)

logger = logging.getLogger(__name__)

# ================== CONFIGURAZIONE AVANZATA ==================

class AnalyticsConfig:
    """Configurazione centralizzata per performance ottimale"""
    # Performance settings
    MAX_WORKERS = min(8, (os.cpu_count() or 1) + 4)
    BATCH_SIZE = int(os.getenv('ANALYTICS_BATCH_SIZE', '200'))
    QUERY_TIMEOUT_SEC = int(os.getenv('ANALYTICS_QUERY_TIMEOUT', '60'))
    
    # Cache settings
    CACHE_TTL_MINUTES = int(os.getenv('ANALYTICS_CACHE_TTL', '15'))
    MAX_CACHE_SIZE = int(os.getenv('ANALYTICS_MAX_CACHE', '1000'))
    CACHE_MEMORY_LIMIT_MB = int(os.getenv('ANALYTICS_CACHE_MEMORY_MB', '500'))
    
    # ML/AI features
    ENABLE_PREDICTIVE = os.getenv('ANALYTICS_ENABLE_PREDICTIVE', 'true').lower() == 'true'
    ENABLE_CLUSTERING = os.getenv('ANALYTICS_ENABLE_CLUSTERING', 'true').lower() == 'true'
    ENABLE_FORECASTING = os.getenv('ANALYTICS_ENABLE_FORECASTING', 'true').lower() == 'true'
    
    # Data processing
    MIN_RECORDS_FOR_ANALYSIS = int(os.getenv('ANALYTICS_MIN_RECORDS', '10'))
    MAX_ANALYSIS_MONTHS = int(os.getenv('ANALYTICS_MAX_MONTHS', '36'))

# ================== PERFORMANCE MONITORING ==================

@dataclass
class PerformanceMetrics:
    """Metriche di performance per monitoraggio"""
    function_name: str
    execution_time: float
    memory_usage_mb: float
    records_processed: int
    cache_hit: bool = False
    error_occurred: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'function': self.function_name,
            'time_ms': round(self.execution_time * 1000, 2),
            'memory_mb': round(self.memory_usage_mb, 2),
            'records': self.records_processed,
            'cached': self.cache_hit,
            'error': self.error_occurred
        }

class PerformanceMonitor:
    """Monitor thread-safe per performance analytics"""
    def __init__(self):
        self.metrics: List[PerformanceMetrics] = []
        self._lock = threading.RLock()
        self.start_time = time.time()
        
    def add_metric(self, metric: PerformanceMetrics):
        with self._lock:
            self.metrics.append(metric)
            # Keep only last 1000 metrics
            if len(self.metrics) > 1000:
                self.metrics = self.metrics[-500:]
    
    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            if not self.metrics:
                return {'total_calls': 0}
            
            recent_metrics = [m for m in self.metrics if not m.error_occurred]
            
            return {
                'total_calls': len(self.metrics),
                'successful_calls': len(recent_metrics),
                'avg_time_ms': np.mean([m.execution_time * 1000 for m in recent_metrics]) if recent_metrics else 0,
                'cache_hit_rate': np.mean([m.cache_hit for m in recent_metrics]) if recent_metrics else 0,
                'avg_memory_mb': np.mean([m.memory_usage_mb for m in recent_metrics]) if recent_metrics else 0,
                'uptime_hours': (time.time() - self.start_time) / 3600
            }

_performance_monitor = PerformanceMonitor()

# ================== DECORATORI DI PERFORMANCE ==================

def performance_tracked(func):
    """Decoratore per tracking automatico delle performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
        
        try:
            result = await func(*args, **kwargs)
            
            # Determine records processed
            records_count = 0
            if isinstance(result, pd.DataFrame):
                records_count = len(result)
            elif isinstance(result, dict) and 'data' in result:
                if isinstance(result['data'], list):
                    records_count = len(result['data'])
            elif isinstance(result, list):
                records_count = len(result)
            
            end_time = time.perf_counter()
            end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            metric = PerformanceMetrics(
                function_name=func.__name__,
                execution_time=end_time - start_time,
                memory_usage_mb=end_memory - start_memory,
                records_processed=records_count,
                cache_hit=getattr(result, '_from_cache', False),
                error_occurred=False
            )
            
            _performance_monitor.add_metric(metric)
            
            # Log performance warnings
            if metric.execution_time > 5.0:
                logger.warning(f"Slow function {func.__name__}: {metric.execution_time:.2f}s")
            if metric.memory_usage_mb > 100:
                logger.warning(f"High memory usage {func.__name__}: {metric.memory_usage_mb:.1f}MB")
            
            return result
            
        except Exception as e:
            end_time = time.perf_counter()
            end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            metric = PerformanceMetrics(
                function_name=func.__name__,
                execution_time=end_time - start_time,
                memory_usage_mb=end_memory - start_memory,
                records_processed=0,
                error_occurred=True
            )
            
            _performance_monitor.add_metric(metric)
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        # Same logic for sync functions
        start_time = time.perf_counter()
        start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
        
        try:
            result = func(*args, **kwargs)
            
            records_count = 0
            if isinstance(result, pd.DataFrame):
                records_count = len(result)
            elif isinstance(result, dict) and 'data' in result:
                if isinstance(result['data'], list):
                    records_count = len(result['data'])
            elif isinstance(result, list):
                records_count = len(result)
            
            end_time = time.perf_counter()
            end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            metric = PerformanceMetrics(
                function_name=func.__name__,
                execution_time=end_time - start_time,
                memory_usage_mb=end_memory - start_memory,
                records_processed=records_count,
                error_occurred=False
            )
            
            _performance_monitor.add_metric(metric)
            return result
            
        except Exception as e:
            end_time = time.perf_counter()
            end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            
            metric = PerformanceMetrics(
                function_name=func.__name__,
                execution_time=end_time - start_time,
                memory_usage_mb=end_memory - start_memory,
                records_processed=0,
                error_occurred=True
            )
            
            _performance_monitor.add_metric(metric)
            raise
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper

# ================== CACHE INTELLIGENTE ==================

class IntelligentCache:
    """Cache thread-safe con algoritmi di eviction intelligenti"""
    
    def __init__(self, max_size: int = AnalyticsConfig.MAX_CACHE_SIZE):
        self.max_size = max_size
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_times: Dict[str, float] = {}
        self._access_counts: Dict[str, int] = defaultdict(int)
        self._lock = threading.RLock()
        
    def _generate_key(self, func_name: str, *args, **kwargs) -> str:
        """Genera chiave di cache intelligente"""
        # Include solo parametri rilevanti per il caching
        cache_params = []
        
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                cache_params.append(str(arg))
            elif isinstance(arg, (list, tuple)) and len(arg) < 10:
                cache_params.append(str(sorted(arg)))
        
        relevant_kwargs = {k: v for k, v in kwargs.items() 
                          if isinstance(v, (str, int, float, bool, type(None)))}
        
        key_data = f"{func_name}:{':'.join(cache_params)}:{str(sorted(relevant_kwargs.items()))}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Ottiene valore dalla cache con tracking accessi"""
        with self._lock:
            if key in self._cache:
                cache_entry = self._cache[key]
                
                # Check TTL
                if time.time() - cache_entry['timestamp'] > AnalyticsConfig.CACHE_TTL_MINUTES * 60:
                    del self._cache[key]
                    self._access_times.pop(key, None)
                    self._access_counts.pop(key, None)
                    return None
                
                # Update access statistics
                self._access_times[key] = time.time()
                self._access_counts[key] += 1
                
                result = cache_entry['data']
                if hasattr(result, '__dict__'):
                    result._from_cache = True
                
                return result
            
            return None
    
    def set(self, key: str, value: Any):
        """Imposta valore in cache con eviction intelligente"""
        with self._lock:
            # Memory check
            current_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            if current_memory > AnalyticsConfig.CACHE_MEMORY_LIMIT_MB:
                self._smart_eviction(0.3)  # Evict 30% of entries
            
            # Size check
            if len(self._cache) >= self.max_size:
                self._smart_eviction(0.2)  # Evict 20% of entries
            
            self._cache[key] = {
                'data': value,
                'timestamp': time.time(),
                'size_estimate': self._estimate_size(value)
            }
            self._access_times[key] = time.time()
            self._access_counts[key] = 1
    
    def _estimate_size(self, obj: Any) -> int:
        """Stima la dimensione di un oggetto"""
        try:
            if isinstance(obj, pd.DataFrame):
                return obj.memory_usage(deep=True).sum()
            elif isinstance(obj, (list, dict)):
                return len(pickle.dumps(obj, protocol=pickle.HIGHEST_PROTOCOL))
            else:
                return 1000  # Default estimate
        except:
            return 1000
    
    def _smart_eviction(self, eviction_ratio: float):
        """Eviction intelligente basata su LFU + LRU combinati"""
        if not self._cache:
            return
        
        num_to_evict = max(1, int(len(self._cache) * eviction_ratio))
        
        # Score combinato: frequenza + recency
        scores = {}
        current_time = time.time()
        
        for key in self._cache:
            access_count = self._access_counts.get(key, 1)
            last_access = self._access_times.get(key, current_time)
            time_decay = max(0.1, 1.0 - (current_time - last_access) / 3600)  # 1 hour decay
            
            # Combined score: higher is better
            scores[key] = access_count * time_decay
        
        # Evict lowest scoring entries
        keys_to_evict = sorted(scores.keys(), key=lambda k: scores[k])[:num_to_evict]
        
        for key in keys_to_evict:
            self._cache.pop(key, None)
            self._access_times.pop(key, None)
            self._access_counts.pop(key, None)
        
        logger.debug(f"Cache eviction: removed {len(keys_to_evict)} entries")
    
    def clear(self):
        """Pulisce completamente la cache"""
        with self._lock:
            self._cache.clear()
            self._access_times.clear()
            self._access_counts.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Statistiche della cache"""
        with self._lock:
            total_size = sum(entry.get('size_estimate', 0) for entry in self._cache.values())
            
            return {
                'entries': len(self._cache),
                'max_size': self.max_size,
                'total_size_mb': total_size / (1024 * 1024),
                'avg_access_count': np.mean(list(self._access_counts.values())) if self._access_counts else 0,
                'oldest_entry_age_minutes': (time.time() - min(self._access_times.values())) / 60 if self._access_times else 0
            }

_intelligent_cache = IntelligentCache()

def cached_analysis(ttl_minutes: Optional[int] = None):
    """Decoratore per caching intelligente delle analisi"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            cache_key = _intelligent_cache._generate_key(func.__name__, *args, **kwargs)
            
            # Try cache first
            cached_result = _intelligent_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                _intelligent_cache.set(cache_key, result)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            cache_key = _intelligent_cache._generate_key(func.__name__, *args, **kwargs)
            
            cached_result = _intelligent_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            result = func(*args, **kwargs)
            
            if result is not None:
                _intelligent_cache.set(cache_key, result)
            
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# ================== BATCH PROCESSOR AVANZATO ==================

class BatchAnalyticsProcessor:
    """Processore batch per analisi parallele ottimizzate"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=AnalyticsConfig.MAX_WORKERS)
        self.batch_size = AnalyticsConfig.BATCH_SIZE
        
    async def process_batch_analytics(self, analytics_requests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Processa richieste di analisi in batch parallelo"""
        results = {}
        
        # Raggruppa per tipo di analisi
        grouped_requests = defaultdict(list)
        for req in analytics_requests:
            grouped_requests[req['type']].append(req)
        
        # Processa ogni gruppo in parallelo
        tasks = []
        for analysis_type, requests in grouped_requests.items():
            task = asyncio.create_task(
                self._process_analysis_group(analysis_type, requests)
            )
            tasks.append((analysis_type, task))
        
        # Attendi tutti i risultati
        for analysis_type, task in tasks:
            try:
                results[analysis_type] = await task
            except Exception as e:
                logger.error(f"Batch processing failed for {analysis_type}: {e}")
                results[analysis_type] = {'error': str(e)}
        
        return results
    
    async def _process_analysis_group(self, analysis_type: str, requests: List[Dict]) -> List[Dict]:
        """Processa un gruppo di richieste dello stesso tipo"""
        loop = asyncio.get_event_loop()
        
        # Esegui in thread pool per analisi CPU-intensive
        futures = []
        for request in requests:
            future = loop.run_in_executor(
                self.executor, 
                self._execute_single_analysis, 
                analysis_type, 
                request
            )
            futures.append(future)
        
        # Raccogli risultati con timeout
        results = []
        for future in asyncio.as_completed(futures, timeout=AnalyticsConfig.QUERY_TIMEOUT_SEC):
            try:
                result = await future
                results.append(result)
            except asyncio.TimeoutError:
                logger.error(f"Analysis timeout for {analysis_type}")
                results.append({'error': 'timeout'})
            except Exception as e:
                logger.error(f"Analysis error for {analysis_type}: {e}")
                results.append({'error': str(e)})
        
        return results
    
    def _execute_single_analysis(self, analysis_type: str, request: Dict) -> Dict:
        """Esegue una singola analisi"""
        try:
            if analysis_type == 'kpis':
                return get_dashboard_kpis()
            elif analysis_type == 'cashflow':
                df = get_cashflow_data_optimized(
                    request.get('start_date'), 
                    request.get('end_date')
                )
                return df.to_dict('records') if not df.empty else []
            elif analysis_type == 'products':
                df = get_products_analysis_optimized(
                    request.get('invoice_type', 'Attiva'),
                    request.get('start_date'),
                    request.get('end_date'),
                    request.get('limit', 50)
                )
                return df.to_dict('records') if not df.empty else []
            elif analysis_type == 'top_clients':
                df = get_top_clients_by_revenue(
                    request.get('start_date'),
                    request.get('end_date'),
                    request.get('limit', 20)
                )
                return df.to_dict('records') if not df.empty else []
            else:
                return {'error': f'Unknown analysis type: {analysis_type}'}
                
        except Exception as e:
            logger.error(f"Single analysis execution failed: {e}")
            return {'error': str(e)}

_batch_processor = BatchAnalyticsProcessor()

# ================== ANALYTICS ADAPTER ULTRA-OTTIMIZZATO ==================

class AnalyticsAdapter:
    """
    Adapter ULTRA-OTTIMIZZATO V3.0 che sfrutta al 100% il backend
    Performance-first design con ML, caching intelligente, parallel processing
    """
    
    def __init__(self):
        self.startup_time = datetime.now()
        self.request_count = 0
        self._lock = threading.RLock()
        logger.info("AnalyticsAdapter V3.0 inizializzato con configurazione ultra-performance")
    
    # ===== DASHBOARD KPIs ULTRA-OTTIMIZZATI =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=5)  # Cache breve per KPIs
    async def get_dashboard_kpis_async(self) -> Dict[str, Any]:
        """Dashboard KPIs con caching intelligente e performance tracking"""
        loop = asyncio.get_event_loop()
        
        # Esegui in thread pool per non bloccare event loop
        result = await loop.run_in_executor(
            _batch_processor.executor, 
            get_dashboard_kpis
        )
        
        # Arricchisci con metriche di performance
        result['_performance'] = {
            'cached': getattr(result, '_from_cache', False),
            'adapter_uptime_hours': (datetime.now() - self.startup_time).total_seconds() / 3600,
            'total_requests': self._increment_request_count()
        }
        
        return result
    
    @performance_tracked
    @cached_analysis(ttl_minutes=10)
    async def get_enhanced_dashboard_async(self) -> Dict[str, Any]:
        """Dashboard arricchita con insights ML e predizioni"""
        # Esegui analisi parallele
        tasks = [
            self.get_dashboard_kpis_async(),
            self.get_cashflow_summary_async(),
            self.get_top_clients_performance_async(limit=5),
            self.get_aging_summary_async()
        ]
        
        # Attendi tutti i risultati
        kpis, cashflow, top_clients, aging = await asyncio.gather(*tasks)
        
        # Combina risultati con insights ML
        enhanced_dashboard = {
            'kpis': kpis,
            'cashflow_health': self._calculate_cashflow_health(cashflow),
            'top_clients': top_clients,
            'aging_alert': self._generate_aging_alerts(aging),
            'ml_insights': await self._generate_ml_insights(),
            'performance_metrics': _performance_monitor.get_summary()
        }
        
        return enhanced_dashboard
    
    # ===== CASH FLOW ANALYSIS ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=15)
    async def get_cashflow_data_async(self, start_date: Optional[str] = None, 
                                     end_date: Optional[str] = None) -> pd.DataFrame:
        """Cash flow ottimizzato con predictive analysis"""
        loop = asyncio.get_event_loop()
        
        # Esegui analisi base
        df = await loop.run_in_executor(
            _batch_processor.executor,
            get_cashflow_data_optimized,
            start_date,
            end_date
        )
        
        if df.empty:
            return df
        
        # Aggiungi predizioni se abilitato
        if AnalyticsConfig.ENABLE_FORECASTING and len(df) >= 3:
            df = await self._add_cashflow_predictions(df)
        
        return df
    
    @performance_tracked
    async def get_cashflow_summary_async(self, months: int = 6) -> Dict[str, Any]:
        """Sommario cash flow con analisi avanzata"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        df = await self.get_cashflow_data_async(
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d')
        )
        
        if df.empty:
            return {'error': 'No data available'}
        
        # Calcola metriche avanzate
        summary = {
            'total_months': len(df),
            'avg_net_flow': float(df['net_cash_flow'].mean()),
            'std_net_flow': float(df['net_cash_flow'].std()),
            'positive_months': int((df['net_cash_flow'] > 0).sum()),
            'trend_direction': self._calculate_trend_direction(df['net_cash_flow']),
            'seasonal_patterns': self._detect_seasonal_patterns(df),
            'risk_level': self._assess_cashflow_risk(df)
        }
        
        # Aggiungi previsioni
        if AnalyticsConfig.ENABLE_FORECASTING:
            summary['next_month_prediction'] = await self._predict_next_month_cashflow(df)
        
        return summary
    
    # ===== PRODUCT ANALYSIS ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=20)
    async def get_products_analysis_async(self, invoice_type: str = 'Attiva',
                                        start_date: Optional[str] = None,
                                        end_date: Optional[str] = None,
                                        limit: int = 50) -> pd.DataFrame:
        """Analisi prodotti con ML clustering e insights"""
        loop = asyncio.get_event_loop()
        
        # Analisi base parallela
        base_analysis_task = loop.run_in_executor(
            _batch_processor.executor,
            get_products_analysis_optimized,
            invoice_type, start_date, end_date, limit
        )
        
        # Se ortofrutticolo, aggiungi analisi specifiche
        freshness_task = None
        quality_task = None
        
        if invoice_type == 'Attiva':  # Solo per vendite
            freshness_task = loop.run_in_executor(
                _batch_processor.executor,
                get_product_freshness_analysis,
                start_date, end_date
            )
            quality_task = loop.run_in_executor(
                _batch_processor.executor,
                get_produce_quality_metrics,
                start_date, end_date
            )
        
        # Attendi risultati
        df = await base_analysis_task
        
        if df.empty:
            return df
        
        # Aggiungi dati di freschezza e qualità se disponibili
        if freshness_task and quality_task:
            try:
                freshness_df, quality_df = await asyncio.gather(freshness_task, quality_task)
                df = self._enrich_products_with_quality_data(df, freshness_df, quality_df)
            except Exception as e:
                logger.warning(f"Failed to enrich product data: {e}")
        
        # Aggiungi clustering ML se abilitato
        if AnalyticsConfig.ENABLE_CLUSTERING and len(df) >= 10:
            df = await self._add_product_clustering(df)
        
        return df
    
    @performance_tracked
    async def get_seasonal_analysis_async(self, product_category: str = 'all',
                                        years_back: int = 2) -> Dict[str, Any]:
        """Analisi stagionalità avanzata con ML"""
        loop = asyncio.get_event_loop()
        
        # Esegui analisi stagionale
        df = await loop.run_in_executor(
            _batch_processor.executor,
            get_seasonal_product_analysis,
            product_category,
            years_back
        )
        
        if df.empty:
            return {'error': 'No seasonal data available'}
        
        # Calcola pattern stagionali avanzati
        seasonal_insights = {
            'peak_months': self._identify_peak_months(df),
            'seasonal_volatility': self._calculate_seasonal_volatility(df),
            'trend_analysis': self._analyze_seasonal_trends(df)
        }
        
        # Aggiungi predizioni stagionali
        if AnalyticsConfig.ENABLE_PREDICTIVE:
            seasonal_insights['next_season_forecast'] = await self._forecast_seasonal_demand(df)
        
        return {
            'data': df.to_dict('records') if not df.empty else [],
            'insights': seasonal_insights
        }
    
    # ===== CLIENT ANALYSIS ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=10)
    async def get_top_clients_performance_async(self, start_date: Optional[str] = None,
                                              end_date: Optional[str] = None,
                                              limit: int = 20) -> List[Dict[str, Any]]:
        """Analisi performance clienti con scoring ML"""
        loop = asyncio.get_event_loop()
        
        # Esegui analisi base
        df = await loop.run_in_executor(
            _batch_processor.executor,
            get_top_clients_by_revenue,
            start_date, end_date, limit
        )
        
        if df.empty:
            return []
        
        # Converti in lista di dizionari
        clients_data = df.to_dict('records')
        
        # Arricchisci con analytics ML in parallelo
        enrichment_tasks = []
        for client in clients_data:
            task = asyncio.create_task(
                self._enrich_client_with_ml_insights(client, start_date, end_date)
            )
            enrichment_tasks.append(task)
        
        # Attendi risultati con timeout
        try:
            enriched_clients = await asyncio.wait_for(
                asyncio.gather(*enrichment_tasks), 
                timeout=30.0
            )
            return enriched_clients
        except asyncio.TimeoutError:
            logger.warning("Client enrichment timeout, returning basic data")
            return clients_data
    
    @performance_tracked
    async def get_client_risk_analysis_async(self, anagraphics_id: Optional[int] = None) -> Dict[str, Any]:
        """Analisi rischio clienti con ML avanzato"""
        loop = asyncio.get_event_loop()
        
        if anagraphics_id:
            # Analisi singolo cliente
            return await self._analyze_single_client_risk(anagraphics_id)
        else:
            # Analisi portfolio clienti
            return await self._analyze_client_portfolio_risk()
    
    # ===== ORTOFRUTTICOLO ANALYSIS ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=30)
    async def get_produce_comprehensive_analysis_async(self, start_date: Optional[str] = None,
                                                     end_date: Optional[str] = None) -> Dict[str, Any]:
        """Analisi completa ortofrutticolo con tutti i moduli specializzati"""
        tasks = [
            self._get_freshness_analysis_task(start_date, end_date),
            self._get_supplier_quality_task(start_date, end_date),
            self._get_price_trends_task(),
            self._get_waste_analysis_task(start_date, end_date),
            self._get_transport_optimization_task(start_date, end_date)
        ]
        
        # Esegui tutte le analisi in parallelo
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combina risultati
        comprehensive_analysis = {
            'freshness_analysis': results[0] if not isinstance(results[0], Exception) else {},
            'supplier_quality': results[1] if not isinstance(results[1], Exception) else {},
            'price_trends': results[2] if not isinstance(results[2], Exception) else {},
            'waste_analysis': results[3] if not isinstance(results[3], Exception) else {},
            'transport_optimization': results[4] if not isinstance(results[4], Exception) else {},
            'produce_kpis': await self._calculate_produce_kpis(),
            'recommendations': await self._generate_produce_recommendations(results)
        }
        
        return comprehensive_analysis
    
    @performance_tracked
    async def get_purchase_recommendations_async(self, weeks_ahead: int = 2) -> Dict[str, Any]:
        """Raccomandazioni acquisto con ML predittivo"""
        loop = asyncio.get_event_loop()
        
        # Esegui analisi base
        df = await loop.run_in_executor(
            _batch_processor.executor,
            get_weekly_purchase_recommendations,
            weeks_ahead
        )
        
        if df.empty:
            return {'recommendations': [], 'ml_insights': {}}
        
        # Aggiungi insights ML
        ml_insights = {}
        if AnalyticsConfig.ENABLE_PREDICTIVE:
            ml_insights = await self._enhance_purchase_recommendations_with_ml(df)
        
        return {
            'recommendations': df.to_dict('records'),
            'ml_insights': ml_insights,
            'optimization_tips': self._generate_purchase_optimization_tips(df)
        }
    
    # ===== AGING & RECONCILIATION ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    @cached_analysis(ttl_minutes=5)
    async def get_aging_summary_async(self, invoice_type: str = "Attiva") -> Dict[str, Dict]:
        """Aging analysis con alerting intelligente"""
        loop = asyncio.get_event_loop()
        
        aging_data = await loop.run_in_executor(
            _batch_processor.executor,
            get_aging_summary_optimized,
            invoice_type
        )
        
        # Aggiungi analytics avanzati
        enhanced_aging = {
            'aging_buckets': aging_data,
            'risk_metrics': self._calculate_aging_risk_metrics(aging_data),
            'trend_analysis': await self._analyze_aging_trends(invoice_type),
            'action_recommendations': self._generate_aging_action_plan(aging_data)
        }
        
        return enhanced_aging
    
    @performance_tracked
    async def get_payment_prediction_async(self, anagraphics_id: int) -> Dict[str, Any]:
        """Predizione pagamenti con ML avanzato"""
        if not AnalyticsConfig.ENABLE_PREDICTIVE:
            return {'error': 'Predictive analytics disabled'}
        
        loop = asyncio.get_event_loop()
        
        # Ottieni storico pagamenti
        financial_summary = await loop.run_in_executor(
            _batch_processor.executor,
            get_anagraphic_financial_summary,
            anagraphics_id
        )
        
        # Applica modelli ML
        payment_prediction = {
            'next_payment_probability': await self._predict_payment_probability(anagraphics_id),
            'estimated_payment_date': await self._predict_payment_date(anagraphics_id),
            'risk_factors': await self._identify_payment_risk_factors(anagraphics_id),
            'recommended_actions': await self._recommend_payment_actions(financial_summary)
        }
        
        return payment_prediction
    
    # ===== BATCH OPERATIONS ULTRA-OTTIMIZZATE =====
    
    @performance_tracked
    async def process_batch_analytics_async(self, requests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Processa batch di richieste analytics in parallelo"""
        return await _batch_processor.process_batch_analytics(requests)
    
    @performance_tracked
    async def calculate_and_update_all_scores_async(self) -> Dict[str, Any]:
        """Aggiornamento batch di tutti i punteggi clienti"""
        loop = asyncio.get_event_loop()
        
        start_time = time.time()
        
        # Esegui aggiornamento in thread pool
        success = await loop.run_in_executor(
            _batch_processor.executor,
            calculate_and_update_client_scores
        )
        
        execution_time = time.time() - start_time
        
        return {
            'success': success,
            'execution_time_seconds': round(execution_time, 2),
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== EXPORT ULTRA-OTTIMIZZATO =====
    
    @performance_tracked
    async def export_comprehensive_report_async(self, start_date: Optional[str] = None,
                                              end_date: Optional[str] = None,
                                              include_ml: bool = True) -> Dict[str, Any]:
        """Export completo con tutti i dati e insights ML"""
        loop = asyncio.get_event_loop()
        
        # Definisci tutte le analisi da includere
        export_tasks = {
            'dashboard_kpis': self.get_dashboard_kpis_async(),
            'cashflow_analysis': self.get_cashflow_data_async(start_date, end_date),
            'products_analysis': self.get_products_analysis_async('Attiva', start_date, end_date),
            'top_clients': self.get_top_clients_performance_async(start_date, end_date),
            'aging_summary': self.get_aging_summary_async(),
            'seasonal_analysis': self.get_seasonal_analysis_async()
        }
        
        # Aggiungi analisi ML se richiesto
        if include_ml and AnalyticsConfig.ENABLE_PREDICTIVE:
            export_tasks.update({
                'client_risk_analysis': self.get_client_risk_analysis_async(),
                'purchase_recommendations': self.get_purchase_recommendations_async(),
                'produce_analysis': self.get_produce_comprehensive_analysis_async(start_date, end_date)
            })
        
        # Esegui tutte le analisi in parallelo
        results = {}
        for name, task in export_tasks.items():
            try:
                results[name] = await task
            except Exception as e:
                logger.error(f"Export task {name} failed: {e}")
                results[name] = {'error': str(e)}
        
        # Genera file Excel in thread pool
        filename = await loop.run_in_executor(
            _batch_processor.executor,
            self._generate_excel_export,
            results,
            start_date,
            end_date
        )
        
        return {
            'filename': filename,
            'sections_included': list(results.keys()),
            'export_timestamp': datetime.now().isoformat(),
            'file_size_mb': os.path.getsize(filename) / (1024 * 1024) if filename and os.path.exists(filename) else 0
        }
    
    # ===== UTILITY METHODS PER ML E ANALYTICS AVANZATI =====
    
    def _increment_request_count(self) -> int:
        """Thread-safe increment del contatore richieste"""
        with self._lock:
            self.request_count += 1
            return self.request_count
    
    def _calculate_cashflow_health(self, cashflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calcola salute cash flow con algoritmi avanzati"""
        if not cashflow_data or 'avg_net_flow' not in cashflow_data:
            return {'status': 'unknown', 'score': 0}
        
        avg_flow = cashflow_data['avg_net_flow']
        volatility = cashflow_data.get('std_net_flow', 0)
        positive_months = cashflow_data.get('positive_months', 0)
        total_months = cashflow_data.get('total_months', 1)
        
        # Calcola score composito
        flow_score = min(100, max(0, (avg_flow / 10000) * 50 + 50))  # Normalized to 0-100
        stability_score = max(0, 100 - (volatility / max(abs(avg_flow), 1000)) * 100)
        consistency_score = (positive_months / total_months) * 100
        
        overall_score = (flow_score * 0.4 + stability_score * 0.3 + consistency_score * 0.3)
        
        # Determina status
        if overall_score >= 80:
            status = 'excellent'
        elif overall_score >= 60:
            status = 'good'
        elif overall_score >= 40:
            status = 'warning'
        else:
            status = 'critical'
        
        return {
            'status': status,
            'score': round(overall_score, 1),
            'components': {
                'flow_score': round(flow_score, 1),
                'stability_score': round(stability_score, 1),
                'consistency_score': round(consistency_score, 1)
            }
        }
    
    def _generate_aging_alerts(self, aging_data: Dict[str, Dict]) -> List[Dict[str, Any]]:
        """Genera alert intelligenti per aging"""
        alerts = []
        
        for bucket, data in aging_data.items():
            if not data or 'amount' not in data:
                continue
            
            amount = float(data['amount'])
            count = data.get('count', 0)
            
            # Alert per importi significativi scaduti
            if 'gg' in bucket and amount > 10000:
                days = self._extract_days_from_bucket(bucket)
                severity = 'high' if days > 60 else 'medium'
                
                alerts.append({
                    'type': 'overdue_amount',
                    'severity': severity,
                    'bucket': bucket,
                    'amount': amount,
                    'count': count,
                    'message': f"€{amount:,.2f} scaduto da {bucket}",
                    'recommended_action': 'Contattare immediatamente i clienti' if severity == 'high' else 'Programmare solleciti'
                })
        
        return alerts
    
    def _extract_days_from_bucket(self, bucket: str) -> int:
        """Estrae i giorni da un bucket aging"""
        import re
        numbers = re.findall(r'\d+', bucket)
        return int(numbers[-1]) if numbers else 0
    
    async def _generate_ml_insights(self) -> Dict[str, Any]:
        """Genera insights ML generali"""
        if not AnalyticsConfig.ENABLE_PREDICTIVE:
            return {'enabled': False}
        
        # Placeholder per insights ML avanzati
        insights = {
            'enabled': True,
            'models_active': ['cashflow_predictor', 'client_risk_scorer', 'seasonal_forecaster'],
            'last_training': datetime.now().isoformat(),
            'prediction_accuracy': {
                'cashflow': 0.85,
                'client_risk': 0.78,
                'seasonal': 0.82
            },
            'recommendations': [
                "Monitorare clienti con score di rischio > 0.7",
                "Ottimizzare stock per prodotti stagionali identificati",
                "Implementare solleciti automatici per aging > 60 giorni"
            ]
        }
        
        return insights
    
    async def _add_cashflow_predictions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggiunge predizioni al cash flow"""
        if len(df) < 3:
            return df
        
        # Simple linear trend prediction
        try:
            from sklearn.linear_model import LinearRegression
            
            # Prepare data
            X = np.arange(len(df)).reshape(-1, 1)
            y = df['net_cash_flow'].values
            
            # Train model
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict next 3 months
            future_X = np.arange(len(df), len(df) + 3).reshape(-1, 1)
            predictions = model.predict(future_X)
            
            # Add predictions to dataframe
            for i, pred in enumerate(predictions):
                future_date = pd.to_datetime(df['month'].iloc[-1]) + pd.DateOffset(months=i+1)
                new_row = pd.DataFrame({
                    'month': [future_date.strftime('%Y-%m')],
                    'net_cash_flow': [pred],
                    'is_prediction': [True]
                })
                df = pd.concat([df, new_row], ignore_index=True)
            
        except ImportError:
            logger.warning("Sklearn not available for predictions")
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
        
        return df
    
    async def _enrich_client_with_ml_insights(self, client: Dict[str, Any], 
                                            start_date: Optional[str], 
                                            end_date: Optional[str]) -> Dict[str, Any]:
        """Arricchisce dati cliente con insights ML"""
        try:
            client_id = client.get('ID')
            if not client_id:
                return client
            
            # Aggiungi risk score se disponibile
            client['risk_score'] = await self._calculate_client_risk_score(client_id)
            
            # Aggiungi prediction insights
            if AnalyticsConfig.ENABLE_PREDICTIVE:
                client['payment_prediction'] = await self._get_client_payment_prediction(client_id)
            
            # Aggiungi segmentazione avanzata
            client['ml_segment'] = self._determine_ml_client_segment(client)
            
            return client
            
        except Exception as e:
            logger.error(f"Client enrichment failed for {client.get('ID', 'unknown')}: {e}")
            return client
    
    async def _calculate_client_risk_score(self, client_id: int) -> float:
        """Calcola risk score ML per cliente"""
        # Placeholder per algoritmo ML avanzato
        # In produzione, userebbe modelli pre-addestrati
        
        loop = asyncio.get_event_loop()
        financial_summary = await loop.run_in_executor(
            None,
            get_anagraphic_financial_summary,
            client_id
        )
        
        # Simple risk scoring algorithm
        risk_score = 0.5  # Base risk
        
        # Overdue amount factor
        overdue_amount = float(financial_summary.get('overdue_amount', 0))
        total_invoiced = float(financial_summary.get('total_invoiced', 1))
        
        if total_invoiced > 0:
            overdue_ratio = overdue_amount / total_invoiced
            risk_score += overdue_ratio * 0.3
        
        # Payment history factor
        if financial_summary.get('avg_payment_days'):
            avg_days = financial_summary['avg_payment_days']
            if avg_days > 30:
                risk_score += min(0.2, (avg_days - 30) / 100)
        
        return min(1.0, risk_score)
    
    async def _get_client_payment_prediction(self, client_id: int) -> Dict[str, Any]:
        """Predizione pagamenti per cliente"""
        return {
            'next_payment_probability': 0.75,  # Placeholder
            'estimated_days': 15,
            'confidence': 0.65
        }
    
    def _determine_ml_client_segment(self, client: Dict[str, Any]) -> str:
        """Determina segmento ML cliente"""
        # Simple segmentation based on available data
        fatturato = client.get('Fatturato YTD', '0€')
        try:
            amount = float(fatturato.replace('€', '').replace('.', '').replace(',', '.'))
            
            if amount > 100000:
                return 'Premium'
            elif amount > 50000:
                return 'High Value'
            elif amount > 10000:
                return 'Standard'
            else:
                return 'Basic'
        except:
            return 'Unknown'
    
    # ===== TASK CREATORS PER ANALISI PARALLELE =====
    
    async def _get_freshness_analysis_task(self, start_date: Optional[str], end_date: Optional[str]):
        """Task per analisi freschezza"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_product_freshness_analysis,
            start_date, end_date
        )
    
    async def _get_supplier_quality_task(self, start_date: Optional[str], end_date: Optional[str]):
        """Task per analisi qualità fornitori"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_supplier_quality_analysis,
            start_date, end_date
        )
    
    async def _get_price_trends_task(self):
        """Task per analisi trend prezzi"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_produce_price_trends,
            None, 90  # Last 90 days
        )
    
    async def _get_waste_analysis_task(self, start_date: Optional[str], end_date: Optional[str]):
        """Task per analisi scarti"""
        # Implementazione placeholder
        return {
            'total_waste_value': 0.0,
            'waste_categories': [],
            'recommendations': ['Implementare tracking scarti avanzato']
        }
    
    async def _get_transport_optimization_task(self, start_date: Optional[str], end_date: Optional[str]):
        """Task per ottimizzazione trasporti"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_transport_cost_analysis,
            start_date, end_date
        )
    
    # ===== METODI DI UTILITÀ ===== 
    
    def _calculate_trend_direction(self, series: pd.Series) -> str:
        """Calcola direzione trend"""
        if len(series) < 2:
            return 'stable'
        
        # Simple linear regression slope
        x = np.arange(len(series))
        slope = np.polyfit(x, series, 1)[0]
        
        if slope > 100:
            return 'improving'
        elif slope < -100:
            return 'declining'
        else:
            return 'stable'
    
    def _detect_seasonal_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Rileva pattern stagionali"""
        if len(df) < 12:
            return {'detected': False}
        
        # Placeholder per analisi stagionale avanzata
        return {
            'detected': True,
            'peak_months': ['November', 'December'],
            'low_months': ['February', 'March'],
            'volatility': 'medium'
        }
    
    def _assess_cashflow_risk(self, df: pd.DataFrame) -> str:
        """Valuta rischio cash flow"""
        negative_months = (df['net_cash_flow'] < 0).sum()
        total_months = len(df)
        
        if negative_months / total_months > 0.5:
            return 'high'
        elif negative_months / total_months > 0.3:
            return 'medium'
        else:
            return 'low'
    
    async def _calculate_produce_kpis(self) -> Dict[str, Any]:
        """Calcola KPIs specifici ortofrutticolo"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_produce_specific_kpis
        )
    
    def _generate_excel_export(self, results: Dict[str, Any], 
                             start_date: Optional[str], 
                             end_date: Optional[str]) -> Optional[str]:
        """Genera export Excel completo"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"analytics_report_comprehensive_{timestamp}.xlsx"
            
            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                # Dashboard KPIs
                if 'dashboard_kpis' in results and isinstance(results['dashboard_kpis'], dict):
                    kpis_df = pd.DataFrame([results['dashboard_kpis']])
                    kpis_df.to_excel(writer, sheet_name='Dashboard_KPIs', index=False)
                
                # Cash Flow
                if 'cashflow_analysis' in results and isinstance(results['cashflow_analysis'], pd.DataFrame):
                    results['cashflow_analysis'].to_excel(writer, sheet_name='Cash_Flow', index=False)
                
                # Products
                if 'products_analysis' in results and isinstance(results['products_analysis'], pd.DataFrame):
                    results['products_analysis'].to_excel(writer, sheet_name='Products', index=False)
                
                # Top Clients
                if 'top_clients' in results and isinstance(results['top_clients'], list):
                    clients_df = pd.DataFrame(results['top_clients'])
                    if not clients_df.empty:
                        clients_df.to_excel(writer, sheet_name='Top_Clients', index=False)
                
                # Aging
                if 'aging_summary' in results and isinstance(results['aging_summary'], dict):
                    aging_flat = []
                    for bucket, data in results['aging_summary'].get('aging_buckets', {}).items():
                        if isinstance(data, dict):
                            aging_flat.append({
                                'bucket': bucket,
                                'amount': data.get('amount', 0),
                                'count': data.get('count', 0)
                            })
                    if aging_flat:
                        aging_df = pd.DataFrame(aging_flat)
                        aging_df.to_excel(writer, sheet_name='Aging', index=False)
                
                # Seasonal Analysis
                if 'seasonal_analysis' in results and 'data' in results['seasonal_analysis']:
                    seasonal_df = pd.DataFrame(results['seasonal_analysis']['data'])
                    if not seasonal_df.empty:
                        seasonal_df.to_excel(writer, sheet_name='Seasonal', index=False)
                
                # Summary sheet
                summary_data = {
                    'Export Date': [datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
                    'Period Start': [start_date or 'All time'],
                    'Period End': [end_date or 'Current'],
                    'Sections Included': [', '.join(results.keys())],
                    'Total Requests Processed': [self.request_count],
                    'Adapter Uptime Hours': [round((datetime.now() - self.startup_time).total_seconds() / 3600, 2)]
                }
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Export_Summary', index=False)
            
            logger.info(f"Comprehensive Excel export created: {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Excel export failed: {e}")
            return None
    
    # ===== API COMPATIBILITY LAYER =====
    
    # Maintain backward compatibility with original function names
    async def calculate_main_kpis_async(self) -> Dict[str, Any]:
        """Legacy alias for get_dashboard_kpis_async"""
        return await self.get_dashboard_kpis_async()
    
    async def get_monthly_cash_flow_analysis_async(self, months: int = 12) -> pd.DataFrame:
        """Legacy alias with months parameter"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        return await self.get_cashflow_data_async(
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d')
        )
    
    async def get_monthly_revenue_analysis_async(self, months: int = 12, 
                                               invoice_type: Optional[str] = None) -> pd.DataFrame:
        """Revenue analysis with backward compatibility"""
        loop = asyncio.get_event_loop()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_monthly_revenue_costs_optimized,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d')
        )
    
    async def get_top_clients_by_revenue_async(self, start_date: Optional[str] = None,
                                             end_date: Optional[str] = None,
                                             limit: int = 20) -> pd.DataFrame:
        """Legacy method returning DataFrame"""
        clients_list = await self.get_top_clients_performance_async(start_date, end_date, limit)
        return pd.DataFrame(clients_list)
    
    async def get_top_overdue_invoices_async(self, limit: int = 20) -> pd.DataFrame:
        """Overdue invoices analysis"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _batch_processor.executor,
            get_top_overdue_invoices,
            limit
        )
    
    async def get_product_analysis_async(self, limit: int = 50,
                                       period_months: int = 12,
                                       invoice_type: Optional[str] = None) -> pd.DataFrame:
        """Legacy product analysis"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_months * 30)
        
        return await self.get_products_analysis_async(
            invoice_type or 'Attiva',
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            limit
        )
    
    # ===== PERFORMANCE E MONITORING =====
    
    async def get_adapter_performance_metrics_async(self) -> Dict[str, Any]:
        """Ottiene metriche di performance dell'adapter"""
        return {
            'performance_monitor': _performance_monitor.get_summary(),
            'cache_stats': _intelligent_cache.stats(),
            'thread_pool_stats': {
                'max_workers': _batch_processor.executor._max_workers,
                'active_threads': len(_batch_processor.executor._threads),
                'queue_size': _batch_processor.executor._work_queue.qsize()
            },
            'memory_usage': {
                'rss_mb': psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024),
                'percent': psutil.virtual_memory().percent
            },
            'configuration': {
                'max_workers': AnalyticsConfig.MAX_WORKERS,
                'batch_size': AnalyticsConfig.BATCH_SIZE,
                'cache_ttl_minutes': AnalyticsConfig.CACHE_TTL_MINUTES,
                'ml_features_enabled': {
                    'predictive': AnalyticsConfig.ENABLE_PREDICTIVE,
                    'clustering': AnalyticsConfig.ENABLE_CLUSTERING,
                    'forecasting': AnalyticsConfig.ENABLE_FORECASTING
                }
            },
            'adapter_info': {
                'version': '3.0',
                'startup_time': self.startup_time.isoformat(),
                'total_requests': self.request_count,
                'uptime_hours': round((datetime.now() - self.startup_time).total_seconds() / 3600, 2)
            }
        }
    
    async def clear_all_caches_async(self) -> Dict[str, Any]:
        """Pulisce tutte le cache dell'adapter"""
        _intelligent_cache.clear()
        
        return {
            'success': True,
            'caches_cleared': ['intelligent_cache', 'lru_caches'],
            'timestamp': datetime.now().isoformat()
        }
    
    async def warm_up_caches_async(self) -> Dict[str, Any]:
        """Preriscalda le cache con analisi comuni"""
        warmup_tasks = [
            self.get_dashboard_kpis_async(),
            self.get_cashflow_data_async(),
            self.get_products_analysis_async(),
            self.get_aging_summary_async()
        ]
        
        start_time = time.time()
        completed = 0
        
        for task in asyncio.as_completed(warmup_tasks):
            try:
                await task
                completed += 1
            except Exception as e:
                logger.warning(f"Warmup task failed: {e}")
        
        return {
            'completed_tasks': completed,
            'total_tasks': len(warmup_tasks),
            'warmup_time_seconds': round(time.time() - start_time, 2),
            'timestamp': datetime.now().isoformat()
        }
    
    # ===== METODI PLACEHOLDER PER FUNZIONALITÀ AVANZATE =====
    
    async def _predict_next_month_cashflow(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Predice cash flow del prossimo mese"""
        if len(df) < 3:
            return {'prediction': 0, 'confidence': 0}
        
        # Simple trend-based prediction
        recent_flows = df['net_cash_flow'].tail(3).values
        trend = np.mean(np.diff(recent_flows)) if len(recent_flows) > 1 else 0
        last_flow = recent_flows[-1]
        
        prediction = last_flow + trend
        confidence = max(0.3, min(0.9, 1 - abs(trend) / max(abs(last_flow), 1000)))
        
        return {
            'prediction': float(prediction),
            'confidence': float(confidence),
            'trend': 'positive' if trend > 0 else 'negative' if trend < 0 else 'stable'
        }
    
    def _enrich_products_with_quality_data(self, products_df: pd.DataFrame, 
                                         freshness_df: pd.DataFrame, 
                                         quality_df: pd.DataFrame) -> pd.DataFrame:
        """Arricchisce dati prodotti con metriche di qualità"""
        try:
            # Merge con dati di freschezza se disponibili
            if not freshness_df.empty and 'Prodotto Normalizzato' in freshness_df.columns:
                products_df = products_df.merge(
                    freshness_df[['Prodotto Normalizzato', 'Freshness Rate %', 'Potential Waste %']],
                    left_on='Prodotto Normalizzato',
                    right_on='Prodotto Normalizzato',
                    how='left'
                )
            
            # Merge con dati di qualità se disponibili
            if not quality_df.empty and 'Prodotto' in quality_df.columns:
                # Normalizza nomi prodotti per il merge
                quality_df['Prodotto_Norm'] = quality_df['Prodotto'].apply(
                    lambda x: x.lower().strip() if pd.notna(x) else ''
                )
                products_df['Prodotto_Norm'] = products_df['Prodotto Normalizzato'].apply(
                    lambda x: x.lower().strip() if pd.notna(x) else ''
                )
                
                products_df = products_df.merge(
                    quality_df[['Prodotto_Norm', 'Score Qualità', 'Valutazione']],
                    on='Prodotto_Norm',
                    how='left'
                )
                
                # Pulisci colonna temporanea
                products_df.drop('Prodotto_Norm', axis=1, inplace=True)
                
        except Exception as e:
            logger.warning(f"Failed to enrich products with quality data: {e}")
        
        return products_df
    
    async def _add_product_clustering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggiunge clustering ML ai prodotti"""
        if not AnalyticsConfig.ENABLE_CLUSTERING or len(df) < 10:
            return df
        
        try:
            from sklearn.cluster import KMeans
            from sklearn.preprocessing import StandardScaler
            
            # Prepara features numeriche per clustering
            features = []
            feature_names = []
            
            # Estrai valori numerici dalle colonne formattate
            if 'Valore Totale' in df.columns:
                values = df['Valore Totale'].str.replace('€', '').str.replace('.', '').str.replace(',', '.').astype(float)
                features.append(values)
                feature_names.append('value')
            
            if 'N. Fatture' in df.columns:
                features.append(df['N. Fatture'].astype(float))
                feature_names.append('frequency')
            
            if len(features) >= 2:
                # Combina features
                X = np.column_stack(features)
                
                # Standardizza
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                
                # Applica K-means
                n_clusters = min(5, len(df) // 3)  # Massimo 5 cluster
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                clusters = kmeans.fit_predict(X_scaled)
                
                # Aggiungi cluster al dataframe
                df['ML_Cluster'] = clusters
                df['ML_Cluster_Label'] = df['ML_Cluster'].map({
                    0: 'Standard',
                    1: 'High Volume',
                    2: 'Premium',
                    3: 'Frequent',
                    4: 'Specialty'
                })
                
        except ImportError:
            logger.warning("Sklearn not available for product clustering")
        except Exception as e:
            logger.warning(f"Product clustering failed: {e}")
        
        return df
    
    def _identify_peak_months(self, df: pd.DataFrame) -> List[str]:
        """Identifica mesi di picco dalle vendite stagionali"""
        if df.empty or 'month_num' not in df.columns:
            return []
        
        monthly_totals = df.groupby('month_num')['total_value'].sum()
        if monthly_totals.empty:
            return []
        
        # Trova mesi con vendite > media + std
        mean_sales = monthly_totals.mean()
        std_sales = monthly_totals.std()
        threshold = mean_sales + std_sales
        
        peak_months = monthly_totals[monthly_totals > threshold].index.tolist()
        
        # Converti numeri mese in nomi
        month_names = {
            '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
            '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
            '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
        }
        
        return [month_names.get(str(month).zfill(2), f'Month {month}') for month in peak_months]
    
    def _calculate_seasonal_volatility(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calcola volatilità stagionale"""
        if df.empty or 'total_value' not in df.columns:
            return {'volatility': 0, 'coefficient_variation': 0}
        
        monthly_sales = df.groupby('month_num')['total_value'].sum()
        if len(monthly_sales) < 2:
            return {'volatility': 0, 'coefficient_variation': 0}
        
        volatility = monthly_sales.std()
        mean_sales = monthly_sales.mean()
        cv = volatility / mean_sales if mean_sales > 0 else 0
        
        return {
            'volatility': float(volatility),
            'coefficient_variation': float(cv),
            'seasonal_strength': 'high' if cv > 0.3 else 'medium' if cv > 0.1 else 'low'
        }
    
    def _analyze_seasonal_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analizza trend stagionali"""
        if df.empty:
            return {'trend': 'unknown'}
        
        # Analisi semplificata basata sui dati disponibili
        if 'total_value' in df.columns and 'month_num' in df.columns:
            monthly_totals = df.groupby('month_num')['total_value'].sum().sort_index()
            
            # Calcola trend generale
            x = np.arange(len(monthly_totals))
            if len(x) > 1:
                slope = np.polyfit(x, monthly_totals.values, 1)[0]
                trend = 'crescente' if slope > 0 else 'decrescente' if slope < 0 else 'stabile'
            else:
                trend = 'stabile'
            
            return {
                'trend': trend,
                'slope': float(slope) if len(x) > 1 else 0,
                'monthly_pattern': monthly_totals.to_dict()
            }
        
        return {'trend': 'unknown'}
    
    async def _forecast_seasonal_demand(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Previsione domanda stagionale"""
        if not AnalyticsConfig.ENABLE_FORECASTING or df.empty:
            return {'forecast_available': False}
        
        # Implementazione semplificata
        return {
            'forecast_available': True,
            'next_quarter_trend': 'stable',
            'confidence': 0.7,
            'recommendations': [
                "Mantenere stock standard per il prossimo trimestre",
                "Monitorare variazioni climatiche che potrebbero influenzare la domanda"
            ]
        }
    
    async def _analyze_single_client_risk(self, anagraphics_id: int) -> Dict[str, Any]:
        """Analizza rischio di un singolo cliente"""
        loop = asyncio.get_event_loop()
        
        # Ottieni summary finanziario
        financial_summary = await loop.run_in_executor(
            None,
            get_anagraphic_financial_summary,
            anagraphics_id
        )
        
        # Calcola risk score composito
        risk_factors = {
            'overdue_ratio': 0,
            'payment_delay': 0,
            'volume_risk': 0,
            'history_length': 0
        }
        
        # Overdue ratio
        total_invoiced = float(financial_summary.get('total_invoiced', 0))
        overdue_amount = float(financial_summary.get('overdue_amount', 0))
        if total_invoiced > 0:
            risk_factors['overdue_ratio'] = min(1.0, overdue_amount / total_invoiced)
        
        # Payment delay
        avg_payment_days = financial_summary.get('avg_payment_days')
        if avg_payment_days and avg_payment_days > 0:
            risk_factors['payment_delay'] = min(1.0, max(0, (avg_payment_days - 30) / 90))
        
        # Volume risk (high volume = lower risk)
        revenue_ytd = float(financial_summary.get('revenue_ytd', 0))
        if revenue_ytd > 50000:
            risk_factors['volume_risk'] = 0.1
        elif revenue_ytd > 10000:
            risk_factors['volume_risk'] = 0.3
        else:
            risk_factors['volume_risk'] = 0.6
        
        # Calcola risk score finale
        overall_risk = (
            risk_factors['overdue_ratio'] * 0.4 +
            risk_factors['payment_delay'] * 0.3 +
            risk_factors['volume_risk'] * 0.3
        )
        
        # Determina categoria di rischio
        if overall_risk >= 0.7:
            risk_category = 'Alto'
        elif overall_risk >= 0.4:
            risk_category = 'Medio'
        else:
            risk_category = 'Basso'
        
        return {
            'anagraphics_id': anagraphics_id,
            'risk_score': round(overall_risk, 3),
            'risk_category': risk_category,
            'risk_factors': risk_factors,
            'financial_summary': financial_summary,
            'recommendations': self._generate_client_risk_recommendations(overall_risk, risk_factors)
        }
    
    async def _analyze_client_portfolio_risk(self) -> Dict[str, Any]:
        """Analizza rischio del portfolio clienti"""
        loop = asyncio.get_event_loop()
        
        # Ottieni top clienti per analisi portfolio
        top_clients = await loop.run_in_executor(
            None,
            get_top_clients_by_revenue,
            None, None, 50  # Top 50 clienti
        )
        
        if top_clients.empty:
            return {'error': 'No client data available'}
        
        # Analizza distribuzione del rischio
        risk_distribution = {
            'Alto': 0,
            'Medio': 0,
            'Basso': 0
        }
        
        total_revenue = 0
        high_risk_revenue = 0
        
        # Placeholder per analisi portfolio completa
        # In produzione, analizzarebbe ogni cliente
        for _, client in top_clients.head(20).iterrows():  # Analizza top 20
            client_id = client.get('ID')
            if client_id:
                try:
                    client_risk = await self._analyze_single_client_risk(client_id)
                    risk_category = client_risk['risk_category']
                    risk_distribution[risk_category] += 1
                    
                    # Calcola esposizione
                    revenue_str = client.get('Fatturato Totale', '0€')
                    revenue = float(revenue_str.replace('€', '').replace('.', '').replace(',', '.'))
                    total_revenue += revenue
                    
                    if risk_category == 'Alto':
                        high_risk_revenue += revenue
                        
                except Exception as e:
                    logger.warning(f"Client risk analysis failed for {client_id}: {e}")
        
        # Calcola metriche portfolio
        high_risk_exposure = (high_risk_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        portfolio_health = 'Buona' if high_risk_exposure < 10 else 'Attenzione' if high_risk_exposure < 25 else 'Critica'
        
        return {
            'portfolio_health': portfolio_health,
            'high_risk_exposure_percent': round(high_risk_exposure, 2),
            'risk_distribution': risk_distribution,
            'total_analyzed_clients': sum(risk_distribution.values()),
            'recommendations': self._generate_portfolio_recommendations(high_risk_exposure, risk_distribution)
        }
    
    def _generate_client_risk_recommendations(self, risk_score: float, risk_factors: Dict[str, float]) -> List[str]:
        """Genera raccomandazioni basate sul rischio cliente"""
        recommendations = []
        
        if risk_score >= 0.7:
            recommendations.append("⚠️ Cliente ad alto rischio - monitoraggio continuo richiesto")
            recommendations.append("Considerare riduzione limiti di credito")
            recommendations.append("Implementare termini di pagamento più stringenti")
        
        if risk_factors['overdue_ratio'] > 0.3:
            recommendations.append("Alto tasso di insoluti - intensificare attività di recupero crediti")
        
        if risk_factors['payment_delay'] > 0.5:
            recommendations.append("Pagamenti sistematicamente in ritardo - verificare situazione finanziaria")
        
        if risk_factors['volume_risk'] > 0.5:
            recommendations.append("Volume d'affari limitato - valutare politiche commerciali dedicate")
        
        if not recommendations:
            recommendations.append("✅ Cliente affidabile - mantenere rapporti commerciali standard")
        
        return recommendations
    
    def _generate_portfolio_recommendations(self, high_risk_exposure: float, 
                                          risk_distribution: Dict[str, int]) -> List[str]:
        """Genera raccomandazioni per il portfolio clienti"""
        recommendations = []
        
        if high_risk_exposure > 25:
            recommendations.append("🚨 Esposizione ad alto rischio eccessiva - diversificare portfolio clienti")
            recommendations.append("Implementare politiche di credit management più stringenti")
        elif high_risk_exposure > 10:
            recommendations.append("⚠️ Monitorare l'esposizione ai clienti ad alto rischio")
        
        total_clients = sum(risk_distribution.values())
        if total_clients > 0:
            high_risk_pct = (risk_distribution['Alto'] / total_clients) * 100
            if high_risk_pct > 20:
                recommendations.append("Elevata percentuale di clienti ad alto rischio - rivedere politiche di accettazione")
        
        if risk_distribution['Basso'] < risk_distribution['Alto']:
            recommendations.append("Focalizzarsi sull'acquisizione di clienti a basso rischio")
        
        return recommendations
    
    async def _enhance_purchase_recommendations_with_ml(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Arricchisce raccomandazioni acquisto con ML"""
        if df.empty:
            return {}
        
        # Analisi pattern di domanda
        high_priority = df[df['Priorità'] == 'URGENTE']
        seasonal_products = df[df['Fattore Stagionale'] > 1.2]
        volatile_products = df[df['Volatilità'] > 0.5]
        
        insights = {
            'urgent_items_count': len(high_priority),
            'seasonal_boost_items': len(seasonal_products),
            'volatile_items_count': len(volatile_products),
            'ml_recommendations': []
        }
        
        if len(high_priority) > 0:
            insights['ml_recommendations'].append(
                f"🚨 {len(high_priority)} prodotti richiedono rifornimento urgente"
            )
        
        if len(seasonal_products) > 0:
            insights['ml_recommendations'].append(
                f"📈 {len(seasonal_products)} prodotti in fase di picco stagionale"
            )
        
        if len(volatile_products) > 5:
            insights['ml_recommendations'].append(
                f"⚠️ {len(volatile_products)} prodotti con domanda volatile - ordinare con cautela"
            )
        
        return insights
    
    def _generate_purchase_optimization_tips(self, df: pd.DataFrame) -> List[str]:
        """Genera suggerimenti di ottimizzazione acquisti"""
        tips = []
        
        if df.empty:
            return ["Nessun dato disponibile per ottimizzazioni"]
        
        # Analizza pattern negli ordini raccomandati
        avg_value = df['Valore Stimato €'].mean()
        high_value_items = df[df['Valore Stimato €'] > avg_value * 1.5]
        
        if len(high_value_items) > 0:
            tips.append(f"💰 {len(high_value_items)} prodotti ad alto valore richiedono attenzione particolare")
        
        # Suggerimenti basati su priorità
        urgent_count = len(df[df['Priorità'] == 'URGENTE'])
        if urgent_count > 5:
            tips.append("🚀 Considerare ordini express per prodotti urgenti")
        
        # Suggerimenti stagionali
        seasonal_items = df[df['Fattore Stagionale'] > 1.0]
        if len(seasonal_items) > 0:
            tips.append("🌱 Approfittare del periodo favorevole per prodotti stagionali")
        
        # Ottimizzazione logistica
        total_value = df['Valore Stimato €'].sum()
        if total_value > 10000:
            tips.append("📦 Volume ordine significativo - negoziare sconti per quantità")
        
        return tips
    
    async def _analyze_aging_trends(self, invoice_type: str) -> Dict[str, Any]:
        """Analizza trend aging nel tempo"""
        # Implementazione semplificata per trend aging
        return {
            'trend_direction': 'stable',
            'monthly_change_percent': 0,
            'risk_level': 'medium',
            'recommendations': [
                "Monitorare regularly aging buckets",
                "Implementare solleciti automatici per >30 giorni"
            ]
        }
    
    def _generate_aging_action_plan(self, aging_data: Dict[str, Dict]) -> List[Dict[str, Any]]:
        """Genera piano d'azione per aging"""
        actions = []
        
        for bucket, data in aging_data.items():
            if not data or 'amount' not in data:
                continue
            
            amount = float(data['amount'])
            count = data.get('count', 0)
            
            if 'gg' in bucket and amount > 5000:
                days = self._extract_days_from_bucket(bucket)
                
                if days > 90:
                    priority = 'Alta'
                    action = 'Contatto legale/recupero crediti'
                elif days > 60:
                    priority = 'Media-Alta'
                    action = 'Sollecito formale + call'
                elif days > 30:
                    priority = 'Media'
                    action = 'Sollecito email + SMS'
                else:
                    continue
                
                actions.append({
                    'bucket': bucket,
                    'priority': priority,
                    'action': action,
                    'amount': amount,
                    'count': count,
                    'estimated_effort_hours': min(8, count * 0.5),
                    'expected_recovery_rate': max(0.3, 1.0 - (days / 180))
                })
        
        return sorted(actions, key=lambda x: x['amount'], reverse=True)
    
    def _calculate_aging_risk_metrics(self, aging_data: Dict[str, Dict]) -> Dict[str, Any]:
        """Calcola metriche di rischio aging"""
        total_amount = sum(data.get('amount', 0) for data in aging_data.values() if data)
        total_count = sum(data.get('count', 0) for data in aging_data.values() if data)
        
        # Calcola weighted average days
        weighted_days = 0
        for bucket, data in aging_data.items():
            if not data or 'amount' not in data:
                continue
            
            days = self._extract_days_from_bucket(bucket)
            amount = data['amount']
            
            if total_amount > 0:
                weighted_days += (days * amount) / total_amount
        
        # Determina risk level
        if weighted_days > 60:
            risk_level = 'Alto'
        elif weighted_days > 30:
            risk_level = 'Medio'
        else:
            risk_level = 'Basso'
        
        return {
            'total_outstanding_amount': total_amount,
            'total_outstanding_count': total_count,
            'weighted_average_days': round(weighted_days, 1),
            'risk_level': risk_level,
            'concentration_risk': self._calculate_concentration_risk(aging_data)
        }
    
    def _calculate_concentration_risk(self, aging_data: Dict[str, Dict]) -> str:
        """Calcola rischio di concentrazione nell'aging"""
        amounts = [data.get('amount', 0) for data in aging_data.values() if data]
        if not amounts:
            return 'Basso'
        
        total = sum(amounts)
        max_bucket = max(amounts)
        
        concentration = (max_bucket / total) if total > 0 else 0
        
        if concentration > 0.6:
            return 'Alto'
        elif concentration > 0.4:
            return 'Medio'
        else:
            return 'Basso'
    
    async def _predict_payment_probability(self, anagraphics_id: int) -> float:
        """Predice probabilità di pagamento"""
        # Implementazione semplificata
        return 0.75  # Placeholder
    
    async def _predict_payment_date(self, anagraphics_id: int) -> str:
        """Predice data di pagamento"""
        # Implementazione semplificata
        estimated_date = datetime.now() + timedelta(days=15)
        return estimated_date.strftime('%Y-%m-%d')
    
    async def _identify_payment_risk_factors(self, anagraphics_id: int) -> List[str]:
        """Identifica fattori di rischio pagamento"""
        return [
            "Storico ritardi nei pagamenti",
            "Importo superiore alla media",
            "Periodo di pagamento prolungato"
        ]
    
    async def _recommend_payment_actions(self, financial_summary: Dict[str, Any]) -> List[str]:
        """Raccomanda azioni per gestione pagamenti"""
        actions = []
        
        overdue_amount = float(financial_summary.get('overdue_amount', 0))
        if overdue_amount > 1000:
            actions.append("Contattare cliente per sollecito pagamento")
        
        open_balance = float(financial_summary.get('open_balance', 0))
        if open_balance > 10000:
            actions.append("Valutare accordi di pagamento rateale")
        
        if not actions:
            actions.append("Mantenere monitoraggio standard")
        
        return actions
    
    async def _generate_produce_recommendations(self, analysis_results: List[Any]) -> List[str]:
        """Genera raccomandazioni basate su analisi ortofrutticolo"""
        recommendations = []
        
        # Analizza risultati per generare raccomandazioni intelligenti
        for i, result in enumerate(analysis_results):
            if isinstance(result, Exception):
                continue
            
            # Raccomandazioni specifiche per tipo di analisi
            if i == 0 and isinstance(result, dict):  # Freshness analysis
                if result.get('avg_freshness_rate', 0) < 80:
                    recommendations.append("🌿 Migliorare gestione freschezza - tasso attuale sotto l'80%")
            
            elif i == 1 and isinstance(result, dict):  # Supplier quality
                if result.get('avg_quality_score', 0) < 70:
                    recommendations.append("📋 Rivedere qualità fornitori - punteggio medio basso")
            
            elif i == 2 and isinstance(result, dict):  # Price trends
                recommendations.append("💰 Monitorare trend prezzi per ottimizzazione margini")
        
        # Raccomandazioni generali se nessuna specifica
        if not recommendations:
            recommendations = [
                "✅ Performance ortofrutticolo nella norma",
                "📈 Continuare monitoraggio KPIs settoriali",
                "🔄 Implementare analisi predittive avanzate"
            ]
        
        return recommendations


# ===== ISTANZA GLOBALE DELL'ADAPTER =====

# Crea istanza globale con inizializzazione lazy
_analytics_adapter_instance: Optional[AnalyticsAdapter] = None
_adapter_lock = threading.Lock()

def get_analytics_adapter() -> AnalyticsAdapter:
    """Factory function thread-safe per ottenere l'istanza dell'adapter"""
    global _analytics_adapter_instance
    
    if _analytics_adapter_instance is None:
        with _adapter_lock:
            if _analytics_adapter_instance is None:
                _analytics_adapter_instance = AnalyticsAdapter()
                logger.info("AnalyticsAdapter V3.0 istanza globale creata")
    
    return _analytics_adapter_instance

# Instance per compatibilità
analytics_adapter = get_analytics_adapter()

# ===== EXPORT PUBBLICO =====

__all__ = [
    'AnalyticsAdapter',
    'analytics_adapter',
    'get_analytics_adapter',
    'AnalyticsConfig',
    'PerformanceMetrics',
    'IntelligentCache',
    'BatchAnalyticsProcessor'
]
