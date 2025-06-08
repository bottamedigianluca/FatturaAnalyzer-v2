# core/smart_client_reconciliation_v2.py

"""
Modulo V2.0 ultra-ottimizzato per riconciliazione intelligente basata sui pattern dei clienti.
Implementa algoritmi avanzati ML-enhanced con thread safety, memory management e performance monitoring.
"""

import logging
import sqlite3
from collections import defaultdict, Counter, OrderedDict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Set, Tuple, Optional, Any, Callable
import re
import pandas as pd
from dataclasses import dataclass, field
from functools import lru_cache, wraps
from contextlib import contextmanager
import numpy as np
from enum import Enum
import threading
import pickle
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import psutil
import os
import json
from abc import ABC, abstractmethod
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import joblib
from queue import Queue, Empty
import asyncio
import aiofiles
import aiocache
from scipy import stats as sp_stats
from scipy.optimize import minimize
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

try:
    from .database import get_connection
    from .utils import to_decimal, quantize, AMOUNT_TOLERANCE
except ImportError:
    logging.warning("Import relativo fallito in smart_client_reconciliation_v2.py, tento import assoluto.")
    try:
        from database import get_connection
        from utils import to_decimal, quantize, AMOUNT_TOLERANCE
    except ImportError as e:
        logging.critical(f"Impossibile importare dipendenze in smart_client_reconciliation_v2.py: {e}")
        raise ImportError(f"Impossibile importare dipendenze in smart_client_reconciliation_v2.py: {e}") from e

logger = logging.getLogger(__name__)

# ================== CONFIGURAZIONE AVANZATA ==================

class Config:
    """Configurazione centralizzata con tuning parameters"""
    # Cache settings
    CACHE_TTL_HOURS = int(os.getenv('SMART_RECON_CACHE_TTL', '2'))
    MAX_CACHE_SIZE = int(os.getenv('SMART_RECON_MAX_CACHE', '1000'))
    CACHE_MEMORY_LIMIT_MB = int(os.getenv('SMART_RECON_CACHE_MEMORY_MB', '200'))

    # ML settings
    MIN_RECORDS_FOR_ML = int(os.getenv('SMART_RECON_MIN_RECORDS', '5'))
    CONFIDENCE_THRESHOLD = float(os.getenv('SMART_RECON_CONFIDENCE_THRESHOLD', '0.3'))
    CLUSTERING_EPS = float(os.getenv('SMART_RECON_CLUSTERING_EPS', '0.3'))

    # Performance settings
    MAX_WORKERS = int(os.getenv('SMART_RECON_MAX_WORKERS', '4'))
    BATCH_SIZE = int(os.getenv('SMART_RECON_BATCH_SIZE', '100'))
    QUERY_TIMEOUT_SEC = int(os.getenv('SMART_RECON_QUERY_TIMEOUT', '30'))

    # Analysis settings
    MAX_COMBINATION_SIZE = int(os.getenv('SMART_RECON_MAX_COMBO', '4'))
    MAX_CANDIDATES = int(os.getenv('SMART_RECON_MAX_CANDIDATES', '30'))

    # Feature flags
    ENABLE_ASYNC = os.getenv('SMART_RECON_ASYNC', 'true').lower() == 'true'
    ENABLE_ML_CLUSTERING = os.getenv('SMART_RECON_ML_CLUSTERING', 'true').lower() == 'true'
    ENABLE_PREDICTIVE = os.getenv('SMART_RECON_PREDICTIVE', 'true').lower() == 'true'

# ================== ENHANCED DATA CLASSES ==================

@dataclass
class PaymentRecordV2:
    """Enhanced payment record with ML features"""
    invoice_date: Optional[datetime]
    payment_date: Optional[datetime]
    amount: Decimal
    description: str
    doc_numbers: List[str]
    transaction_id: Optional[int] = None
    invoice_id: Optional[int] = None

    # Computed features
    days_interval: Optional[int] = field(init=False)
    normalized_amount: Optional[float] = field(init=False)
    description_embedding: Optional[np.ndarray] = field(init=False)
    temporal_features: Dict[str, float] = field(default_factory=dict, init=False)

    def __post_init__(self):
        self.days_interval = self._calculate_interval()
        self.normalized_amount = float(self.amount) if self.amount else None
        self.description_embedding = self._generate_description_embedding()
        self.temporal_features = self._extract_temporal_features()

    def _calculate_interval(self) -> Optional[int]:
        """Calculate payment interval with validation"""
        if self.invoice_date and self.payment_date:
            try:
                inv_dt = pd.to_datetime(self.invoice_date).date()
                pay_dt = pd.to_datetime(self.payment_date).date()
                interval = (pay_dt - inv_dt).days
                return max(0, min(interval, 365))  # Cap at 1 year
            except:
                pass
        return None

    @lru_cache(maxsize=1024)
    def _generate_description_embedding(self) -> Optional[np.ndarray]:
        """Generate text embedding for description using enhanced features"""
        if not self.description:
            return None
        
        # Simple bag-of-words approach with TF-IDF-like weighting
        desc_clean = self.description.upper()
        
        # Extract features
        features = {
            'has_invoice': 1.0 if re.search(r'\b(FATT|FATTURA|FT|INVOICE)\b', desc_clean) else 0.0,
            'has_payment': 1.0 if re.search(r'\b(PAG|PAYMENT|SALDO)\b', desc_clean) else 0.0,
            'has_reference': 1.0 if re.search(r'\b(RIF|REF|RIFERIMENTO)\b', desc_clean) else 0.0,
            'num_count': len(re.findall(r'\d+', desc_clean)),
            'word_count': len(desc_clean.split()),
            'length': len(desc_clean),
            'has_date': 1.0 if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', desc_clean) else 0.0,
            'has_amount': 1.0 if re.search(r'[€$]\s*\d+[,.]?\d*', desc_clean) else 0.0,
        }
        
        # Create normalized feature vector
        embedding = np.array(list(features.values()), dtype=np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding /= norm
        
        return embedding

    def _extract_temporal_features(self) -> Dict[str, float]:
        """Extract advanced temporal features"""
        features = {}
        
        if self.payment_date:
            try:
                pay_dt = pd.to_datetime(self.payment_date)
                features['day_of_week'] = pay_dt.dayofweek / 6.0  # Normalize to 0-1
                features['day_of_month'] = pay_dt.day / 31.0
                features['month'] = pay_dt.month / 12.0
                features['quarter'] = ((pay_dt.month - 1) // 3 + 1) / 4.0
                features['is_month_end'] = 1.0 if pay_dt.day >= 28 else 0.0
                features['is_weekend'] = 1.0 if pay_dt.dayofweek >= 5 else 0.0
            except:
                pass
        
        return features

@dataclass
class ClientPaymentPatternV2:
    """Enhanced ML-powered payment pattern analysis"""
    anagraphics_id: int
    payment_records: List[PaymentRecordV2] = field(default_factory=list)

    # Core statistics
    payment_intervals: List[int] = field(default_factory=list)
    typical_amounts: List[float] = field(default_factory=list)
    payment_methods: Counter = field(default_factory=Counter)
    description_patterns: Set[str] = field(default_factory=set)

    # ML features
    amount_clusters: Optional[Dict[str, Any]] = None
    temporal_model: Optional[Dict[str, Any]] = None
    sequence_model: Optional[Dict[str, Any]] = None
    reliability_score: float = 0.0

    # Metadata
    confidence_score: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)
    version: int = 2

    # Performance cache
    _stats_cache: Dict[str, Any] = field(default_factory=dict, init=False)
    _ml_cache: Dict[str, Any] = field(default_factory=dict, init=False)
    _cache_lock: threading.RLock = field(default_factory=threading.RLock, init=False)

    def add_payment_record(self, record: PaymentRecordV2):
        """Add payment record with feature extraction"""
        with self._cache_lock:
            self.payment_records.append(record)
            
            if record.days_interval is not None:
                self.payment_intervals.append(record.days_interval)
            
            if record.normalized_amount:
                self.typical_amounts.append(record.normalized_amount)
            
            if record.description:
                self._extract_advanced_patterns(record.description)
            
            # Invalidate caches
            self._stats_cache.clear()
            self._ml_cache.clear()
            self.last_updated = datetime.now()

    def _extract_advanced_patterns(self, description: str):
        """Extract patterns using NLP-enhanced approach"""
        if not description:
            return
        
        desc_clean = description.upper().strip()
        
        # Advanced pattern extraction with named groups
        patterns = {
            'invoice': re.compile(r'\b(?P<type>FATT|FATTURA|FT|INVOICE)\s*\.?\s*(?P<number>\w+)', re.IGNORECASE),
            'payment': re.compile(r'\b(?P<type>PAG|PAYMENT|SALDO)\s+(?P<ref>\w+)', re.IGNORECASE),
            'reference': re.compile(r'\b(?P<type>RIF|REF|RIFERIMENTO)\s*\.?\s*(?P<code>\w+)', re.IGNORECASE),
            'company': re.compile(r'\b(?P<company>[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b'),
            'amount': re.compile(r'(?P<currency>[€$])\s*(?P<amount>\d+[,.]?\d*)'),
            'date': re.compile(r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'),
        }
        
        extracted_patterns = defaultdict(set)
        
        for pattern_name, pattern_regex in patterns.items():
            for match in pattern_regex.finditer(desc_clean):
                match_dict = match.groupdict()
                for key, value in match_dict.items():
                    if value and len(value) >= 2:
                        extracted_patterns[f"{pattern_name}_{key}"].add(value)
                        self.description_patterns.add(value)
        
        if hasattr(self, '_structured_patterns'):
            self._structured_patterns.append(extracted_patterns)
        else:
            self._structured_patterns = [extracted_patterns]

    def train_ml_models(self):
        """Train ML models on payment patterns"""
        with self._cache_lock:
            if len(self.payment_records) < Config.MIN_RECORDS_FOR_ML:
                return
            
            try:
                # Train amount clustering model
                if Config.ENABLE_ML_CLUSTERING:
                    self.amount_clusters = self._train_amount_clustering()
                
                # Train temporal prediction model
                if Config.ENABLE_PREDICTIVE:
                    self.temporal_model = self._train_temporal_model()
                
                # Train sequence model
                self.sequence_model = self._train_sequence_model()
                
                # Update ML cache
                self._ml_cache['trained'] = True
                self._ml_cache['train_date'] = datetime.now()
                
            except Exception as e:
                logger.error(f"Error training ML models for client {self.anagraphics_id}: {e}")

    def _train_amount_clustering(self) -> Optional[Dict[str, Any]]:
        """Train DBSCAN clustering on payment amounts"""
        if len(self.typical_amounts) < 3:
            return None
        
        try:
            # Prepare data
            amounts = np.array(self.typical_amounts).reshape(-1, 1)
            
            # Standardize
            scaler = StandardScaler()
            amounts_scaled = scaler.fit_transform(amounts)
            
            # DBSCAN clustering
            dbscan = DBSCAN(eps=Config.CLUSTERING_EPS, min_samples=2)
            clusters = dbscan.fit_predict(amounts_scaled)
            
            # Extract cluster statistics
            cluster_stats = []
            for cluster_id in set(clusters):
                if cluster_id == -1:  # Noise
                    continue
                
                cluster_amounts = amounts[clusters == cluster_id].flatten()
                cluster_stats.append({
                    'id': int(cluster_id),
                    'mean': float(np.mean(cluster_amounts)),
                    'std': float(np.std(cluster_amounts)),
                    'min': float(np.min(cluster_amounts)),
                    'max': float(np.max(cluster_amounts)),
                    'size': len(cluster_amounts),
                    'percentage': len(cluster_amounts) / len(amounts)
                })
            
            return {
                'scaler': scaler,
                'model': dbscan,
                'clusters': cluster_stats,
                'n_clusters': len(cluster_stats),
                'noise_ratio': sum(1 for c in clusters if c == -1) / len(clusters)
            }
            
        except Exception as e:
            logger.error(f"Amount clustering failed: {e}")
            return None

    def _train_temporal_model(self) -> Optional[Dict[str, Any]]:
        """Train temporal prediction model"""
        if len(self.payment_records) < 5:
            return None
        
        try:
            # Extract temporal features
            temporal_data = []
            for record in self.payment_records:
                if record.temporal_features and record.days_interval is not None:
                    temporal_data.append({
                        'features': record.temporal_features,
                        'interval': record.days_interval,
                        'amount': record.normalized_amount or 0
                    })
            
            if len(temporal_data) < 3:
                return None
            
            # Simple statistical model for now
            intervals = [d['interval'] for d in temporal_data]
            
            # Fit distribution
            try:
                # Try gamma distribution for payment intervals
                gamma_params = sp_stats.gamma.fit(intervals)
                distribution = {
                    'type': 'gamma',
                    'params': gamma_params,
                    'mean': np.mean(intervals),
                    'std': np.std(intervals),
                    'median': np.median(intervals)
                }
            except:
                # Fallback to normal
                distribution = {
                    'type': 'normal',
                    'mean': np.mean(intervals),
                    'std': np.std(intervals),
                    'median': np.median(intervals)
                }
            
            return {
                'distribution': distribution,
                'seasonal_factors': self._calculate_seasonal_factors(temporal_data),
                'trend': self._calculate_payment_trend(intervals)
            }
            
        except Exception as e:
            logger.error(f"Temporal model training failed: {e}")
            return None

    def _calculate_seasonal_factors(self, temporal_data: List[Dict]) -> Dict[int, float]:
        """Calculate seasonal adjustment factors"""
        monthly_intervals = defaultdict(list)
        
        for data in temporal_data:
            month = int(data['features'].get('month', 0) * 12)
            if month > 0:
                monthly_intervals[month].append(data['interval'])
        
        # Calculate monthly factors
        overall_mean = np.mean([d['interval'] for d in temporal_data])
        seasonal_factors = {}
        
        for month in range(1, 13):
            if month in monthly_intervals and len(monthly_intervals[month]) >= 2:
                month_mean = np.mean(monthly_intervals[month])
                seasonal_factors[month] = month_mean / overall_mean if overall_mean > 0 else 1.0
            else:
                seasonal_factors[month] = 1.0
        
        return seasonal_factors

    def _calculate_payment_trend(self, intervals: List[int]) -> Dict[str, Any]:
        """Calculate payment interval trend"""
        if len(intervals) < 4:
            return {'slope': 0, 'r_squared': 0, 'trend': 'stable'}
        
        # Simple linear regression
        x = np.arange(len(intervals))
        y = np.array(intervals)
        
        try:
            slope, intercept = np.polyfit(x, y, 1)
            y_pred = slope * x + intercept
            r_squared = 1 - np.sum((y - y_pred) ** 2) / np.sum((y - np.mean(y)) ** 2)
            
            # Determine trend
            trend = 'stable'
            if abs(slope) > 1:
                trend = 'improving' if slope < -1 else 'deteriorating'
            
            return {
                'slope': float(slope),
                'intercept': float(intercept),
                'r_squared': float(r_squared),
                'trend': trend
            }
        except:
            return {'slope': 0, 'r_squared': 0, 'trend': 'stable'}

    def _train_sequence_model(self) -> Optional[Dict[str, Any]]:
        """Train sequence pattern model"""
        if not hasattr(self, '_structured_patterns') or len(self._structured_patterns) < 3:
            return None
        
        try:
            # Analyze sequence patterns
            sequence_lengths = []
            for record in self.payment_records:
                if record.doc_numbers:
                    sequence_lengths.append(len(record.doc_numbers))
            
            if not sequence_lengths:
                return None
            
            return {
                'avg_length': np.mean(sequence_lengths),
                'std_length': np.std(sequence_lengths),
                'common_lengths': Counter(sequence_lengths).most_common(3),
                'consistency': 1 - (np.std(sequence_lengths) / max(np.mean(sequence_lengths), 1))
            }
            
        except Exception as e:
            logger.error(f"Sequence model training failed: {e}")
            return None

    def get_ml_predictions(self, target_amount: Decimal, 
                          target_date: datetime) -> Dict[str, Any]:
        """Get ML-based predictions for payment likelihood"""
        with self._cache_lock:
            # Check cache
            cache_key = f"pred_{float(target_amount)}_{target_date.timestamp()}"
            if cache_key in self._ml_cache:
                return self._ml_cache[cache_key]
            
            predictions = {
                'amount_cluster_match': 0.0,
                'temporal_likelihood': 0.5,
                'sequence_match': 0.0,
                'overall_confidence': 0.0,
                'recommendations': []
            }
            
            # Amount clustering prediction
            if self.amount_clusters:
                predictions['amount_cluster_match'] = self._predict_amount_cluster(float(target_amount))
            
            # Temporal prediction
            if self.temporal_model:
                predictions['temporal_likelihood'] = self._predict_temporal_likelihood(target_date)
            
            # Overall confidence
            predictions['overall_confidence'] = (
                predictions['amount_cluster_match'] * 0.4 +
                predictions['temporal_likelihood'] * 0.4 +
                self.confidence_score * 0.2
            )
            
            # Generate recommendations
            predictions['recommendations'] = self._generate_ml_recommendations(predictions)
            
            # Cache result
            self._ml_cache[cache_key] = predictions
            
            return predictions

    def _predict_amount_cluster(self, amount: float) -> float:
        """Predict cluster membership for amount"""
        if not self.amount_clusters or not self.amount_clusters['clusters']:
            return 0.5
        
        try:
            # Transform amount
            amount_scaled = self.amount_clusters['scaler'].transform([[amount]])
            
            # Calculate distance to each cluster
            min_distance = float('inf')
            best_cluster_size = 0
            
            for cluster in self.amount_clusters['clusters']:
                cluster_center = self.amount_clusters['scaler'].transform([[cluster['mean']]])
                distance = np.linalg.norm(amount_scaled - cluster_center)
                
                if distance < min_distance:
                    min_distance = distance
                    best_cluster_size = cluster['percentage']
            
            # Convert distance to probability
            # Use exponential decay with distance
            probability = np.exp(-min_distance) * best_cluster_size
            
            return min(1.0, probability)
            
        except Exception as e:
            logger.error(f"Amount cluster prediction failed: {e}")
            return 0.5

    def _predict_temporal_likelihood(self, target_date: datetime) -> float:
        """Predict payment likelihood based on temporal patterns"""
        if not self.temporal_model:
            return 0.5
        
        try:
            # Get distribution parameters
            dist = self.temporal_model['distribution']
            
            # Apply seasonal adjustment
            month = target_date.month
            seasonal_factor = self.temporal_model['seasonal_factors'].get(month, 1.0)
            
            # Adjust for trend
            trend = self.temporal_model['trend']
            likelihood = 0.7  # Base likelihood
            if trend['trend'] == 'improving':
                likelihood += 0.1
            elif trend['trend'] == 'deteriorating':
                likelihood -= 0.1
            
            return max(0.1, min(1.0, likelihood * seasonal_factor))
            
        except Exception as e:
            logger.error(f"Temporal prediction failed: {e}")
            return 0.5

    def _generate_ml_recommendations(self, predictions: Dict[str, Any]) -> List[str]:
        """Generate ML-based recommendations"""
        recommendations = []
        
        if predictions['amount_cluster_match'] < 0.3:
            recommendations.append("Importo atipico per questo cliente")
        elif predictions['amount_cluster_match'] > 0.7:
            recommendations.append("Importo molto tipico per questo cliente")
        
        if predictions['temporal_likelihood'] > 0.7:
            recommendations.append("Timing di pagamento coerente con pattern storico")
        elif predictions['temporal_likelihood'] < 0.3:
            recommendations.append("Timing inusuale rispetto al pattern storico")
        
        if predictions['overall_confidence'] > 0.7:
            recommendations.append("Alta probabilità di match corretto")
        elif predictions['overall_confidence'] < 0.3:
            recommendations.append("Bassa confidenza - verificare manualmente")
        
        return recommendations

# ================== ASYNC PATTERN ANALYZER ==================

class AsyncPatternAnalyzer:
    """Async pattern analysis for high-performance processing"""

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=Config.MAX_WORKERS)
        self.cache = aiocache.Cache() if Config.ENABLE_ASYNC else None

    async def analyze_patterns_batch(self, 
                                   patterns: List[ClientPaymentPatternV2]) -> List[Dict[str, Any]]:
        """Analyze multiple patterns in parallel"""
        if not Config.ENABLE_ASYNC:
            return [self._analyze_pattern_sync(p) for p in patterns]
        
        tasks = []
        for pattern in patterns:
            task = asyncio.create_task(self._analyze_pattern_async(pattern))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Pattern analysis failed for client {patterns[i].anagraphics_id}: {result}")
            else:
                valid_results.append(result)
        
        return valid_results

    async def _analyze_pattern_async(self, pattern: ClientPaymentPatternV2) -> Dict[str, Any]:
        """Analyze single pattern asynchronously"""
        # Check cache
        cache_key = f"pattern_analysis_{pattern.anagraphics_id}_{pattern.last_updated.timestamp()}"
        
        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached
        
        # Run CPU-intensive analysis in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor,
            self._analyze_pattern_sync,
            pattern
        )
        
        # Cache result
        if self.cache:
            await self.cache.set(cache_key, result, ttl=3600)
        
        return result

    def _analyze_pattern_sync(self, pattern: ClientPaymentPatternV2) -> Dict[str, Any]:
        """Synchronous pattern analysis"""
        # Train ML models if needed
        if not pattern._ml_cache.get('trained'):
            pattern.train_ml_models()
        
        # Calculate comprehensive metrics
        analysis = {
            'anagraphics_id': pattern.anagraphics_id,
            'pattern_strength': pattern.confidence_score,
            'payment_count': len(pattern.payment_records),
            'ml_features': {},
            'risk_assessment': {},
            'recommendations': []
        }
        
        # ML features
        if pattern.amount_clusters:
            analysis['ml_features']['n_amount_clusters'] = pattern.amount_clusters['n_clusters']
            analysis['ml_features']['amount_noise_ratio'] = pattern.amount_clusters['noise_ratio']
        
        if pattern.temporal_model:
            analysis['ml_features']['payment_trend'] = pattern.temporal_model['trend']['trend']
            analysis['ml_features']['trend_confidence'] = pattern.temporal_model['trend']['r_squared']
        
        # Risk assessment
        risk_score = self._calculate_risk_score(pattern)
        analysis['risk_assessment'] = {
            'score': risk_score,
            'category': self._categorize_risk(risk_score),
            'factors': self._identify_risk_factors(pattern)
        }
        
        # Generate recommendations
        analysis['recommendations'] = self._generate_pattern_recommendations(pattern, analysis)
        
        return analysis

    def _calculate_risk_score(self, pattern: ClientPaymentPatternV2) -> float:
        """Calculate comprehensive risk score"""
        risk_score = 0.0
        
        # Base risk from payment history
        if len(pattern.payment_records) < 3:
            risk_score += 0.3
        
        # Variability in payment intervals
        if pattern.payment_intervals:
            cv = np.std(pattern.payment_intervals) / max(np.mean(pattern.payment_intervals), 1)
            risk_score += min(0.3, cv * 0.3)
        
        # Amount clustering
        if pattern.amount_clusters and pattern.amount_clusters['noise_ratio'] > 0.3:
            risk_score += 0.2
        
        # Deteriorating trend
        if pattern.temporal_model and pattern.temporal_model['trend']['trend'] == 'deteriorating':
            risk_score += 0.2 * pattern.temporal_model['trend']['r_squared']
            
        return min(1.0, risk_score)

    def _categorize_risk(self, risk_score: float) -> str:
        """Categorize risk based on score"""
        if risk_score >= 0.7:
            return 'Molto Alto'
        elif risk_score >= 0.5:
            return 'Alto'
        elif risk_score >= 0.3:
            return 'Medio'
        else:
            return 'Basso'

    def _identify_risk_factors(self, pattern: ClientPaymentPatternV2) -> List[str]:
        """Identify key risk factors"""
        factors = []
        if len(pattern.payment_records) < 5:
            factors.append("Storico pagamenti limitato")
        
        if pattern.payment_intervals and (np.std(pattern.payment_intervals) / max(np.mean(pattern.payment_intervals), 1)) > 0.5:
            factors.append("Alta variabilità nei tempi di pagamento")
            
        if pattern.amount_clusters and pattern.amount_clusters['noise_ratio'] > 0.3:
            factors.append("Pagamenti con importi spesso atipici (outlier)")
            
        if pattern.temporal_model and pattern.temporal_model['trend']['trend'] == 'deteriorating':
            factors.append("Trend di pagamento in peggioramento")
            
        return factors

    def _generate_pattern_recommendations(self, pattern: ClientPaymentPatternV2, analysis: Dict) -> List[str]:
        """Generate actionable recommendations based on pattern analysis"""
        recs = []
        risk_category = analysis['risk_assessment']['category']
        
        if risk_category in ['Alto', 'Molto Alto']:
            recs.append("Monitorare attentamente i pagamenti futuri")
            recs.append("Considerare termini di pagamento più restrittivi")
        elif risk_category == 'Basso':
            recs.append("Cliente affidabile, possibile estendere termini di pagamento")
        
        if analysis['ml_features'].get('payment_trend') == 'improving':
            recs.append("Il comportamento di pagamento sta migliorando")
            
        return recs

# ================== MAIN RECONCILIATION MANAGER ==================

class SmartClientReconciliationV2:
    """Thread-safe, high-performance manager for smart reconciliation"""
    
    def __init__(self):
        self.client_patterns = OrderedDict()
        self.patterns_cache_time: Optional[datetime] = None
        self._lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=Config.MAX_WORKERS)
        self.async_analyzer = AsyncPatternAnalyzer()
        self.performance_metrics = defaultdict(float)

    @contextmanager
    def _get_connection(self):
        """Context manager per connessioni DB con auto-cleanup"""
        conn = get_connection()
        try:
            yield conn
        finally:
            conn.close()

    def _is_cache_valid(self) -> bool:
        """Verifica validità cache"""
        if not self.patterns_cache_time:
            return False
        return (datetime.now() - self.patterns_cache_time).total_seconds() / 3600 < Config.CACHE_TTL_HOURS

    def _refresh_patterns_cache(self, anagraphics_id: Optional[int] = None, force_refresh: bool = False):
        """Aggiorna la cache dei pattern con query ottimizzate e thread-safety"""
        with self._lock:
            if not force_refresh and self._is_cache_valid() and (anagraphics_id is None or anagraphics_id in self.client_patterns):
                return
        
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                base_query = """
                    SELECT 
                        i.anagraphics_id, i.doc_date, i.doc_number, rl.reconciliation_date,
                        rl.reconciled_amount, bt.description, bt.transaction_date,
                        GROUP_CONCAT(i2.doc_number) as related_invoices
                    FROM ReconciliationLinks rl
                    JOIN Invoices i ON rl.invoice_id = i.id
                    JOIN BankTransactions bt ON rl.transaction_id = bt.id
                    LEFT JOIN ReconciliationLinks rl2 ON rl.transaction_id = rl2.transaction_id AND rl2.invoice_id != i.id
                    LEFT JOIN Invoices i2 ON rl2.invoice_id = i2.id
                    WHERE i.payment_status IN ('Pagata Tot.', 'Pagata Parz.')
                      AND rl.reconciliation_date >= date('now', '-3 years')
                """
                params = []
                if anagraphics_id:
                    base_query += " AND i.anagraphics_id = ?"
                    params.append(anagraphics_id)
                
                base_query += " GROUP BY rl.id ORDER BY i.anagraphics_id, rl.reconciliation_date DESC LIMIT 5000"
                
                cursor.execute(base_query, params)
                rows = cursor.fetchall()
                
                with self._lock:
                    self._process_payment_records_batch(rows, anagraphics_id)
                    if not anagraphics_id:
                        self.patterns_cache_time = datetime.now()
                    self._manage_cache_size()
        except Exception as e:
            logger.error(f"Errore aggiornamento pattern: {e}", exc_info=True)

    def _process_payment_records_batch(self, rows: List[Dict], target_anag_id: Optional[int]):
        """Processa i record di pagamento in batch, protetto da lock esterno."""
        client_records = defaultdict(list)
        for row in rows:
            client_records[row['anagraphics_id']].append(row)
            
        for anag_id, records in client_records.items():
            if anag_id not in self.client_patterns:
                self.client_patterns[anag_id] = ClientPaymentPatternV2(anag_id)
            
            pattern = self.client_patterns[anag_id]
            if target_anag_id is None:
                pattern.payment_records.clear()
            
            for record in records:
                docs = [d.strip() for d in (record.get('related_invoices') or record['doc_number'] or '').split(',') if d.strip()]
                pattern.add_payment_record(PaymentRecordV2(
                    invoice_date=record['doc_date'],
                    payment_date=record['reconciliation_date'] or record['transaction_date'],
                    amount=quantize(to_decimal(record['reconciled_amount'])),
                    description=record['description'] or '',
                    doc_numbers=docs
                ))
            
            # Schedula l'addestramento in un thread separato per non bloccare
            self.executor.submit(pattern.train_ml_models)

    def _manage_cache_size(self):
        """Evicts least recently used patterns if cache size or memory exceeds limits."""
        process = psutil.Process(os.getpid())
        memory_mb = process.memory_info().rss / 1024 / 1024
        
        while len(self.client_patterns) > Config.MAX_CACHE_SIZE or memory_mb > Config.CACHE_MEMORY_LIMIT_MB:
            if not self.client_patterns:
                break
            # Evict LRU (OrderedDict popitem)
            self.client_patterns.popitem(last=False)
            memory_mb = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024

    def get_client_pattern(self, anagraphics_id: int) -> Optional[ClientPaymentPatternV2]:
        """Ottiene il pattern di un cliente, gestendo il caching e l'aggiornamento."""
        with self._lock:
            if anagraphics_id in self.client_patterns:
                self.client_patterns.move_to_end(anagraphics_id) # Mark as recently used
                return self.client_patterns[anagraphics_id]
        
        # Se non in cache, aggiorna fuori dal lock per non bloccare altre richieste
        self._refresh_patterns_cache(anagraphics_id)
        
        with self._lock:
            return self.client_patterns.get(anagraphics_id)

    def suggest_smart_combinations(self, transaction_id: int, anagraphics_id: int) -> List[Dict]:
        """Genera suggerimenti di riconciliazione usando il motore ML V2."""
        pattern = self.get_client_pattern(anagraphics_id)
        if not pattern or len(pattern.payment_records) < Config.MIN_RECORDS_FOR_ML:
            return []
        
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT amount, reconciled_amount, description, transaction_date FROM BankTransactions WHERE id = ?", (transaction_id,))
                trans_row = cursor.fetchone()
                if not trans_row:
                    return []
                
                trans_details = {
                    'id': transaction_id,
                    'target_amount': quantize(to_decimal(trans_row['amount']) - to_decimal(trans_row['reconciled_amount'])),
                    'description': trans_row['description'] or '',
                    'transaction_date': trans_row['transaction_date']
                }
                
                if trans_details['target_amount'].copy_abs() <= AMOUNT_TOLERANCE:
                    return []
                
                candidate_invoices = self._get_candidate_invoices(cursor, anagraphics_id, trans_details)
                if not candidate_invoices:
                    return []
                
                # Usa l'analizzatore ML per trovare le migliori combinazioni
                analyzer = MLMatchAnalyzerV2(pattern, trans_details)
                suggestions = analyzer.analyze_combinations(candidate_invoices)
                
                suggestions.sort(key=lambda x: x['confidence_score'], reverse=True)
                return suggestions[:10]

        except Exception as e:
            logger.error(f"Errore suggerimenti V2: {e}", exc_info=True)
            return []

    def _get_candidate_invoices(self, cursor, anagraphics_id: int, trans_details: Dict) -> List[Dict]:
        """Recupera fatture candidate con filtri intelligenti."""
        target_amount_abs = trans_details['target_amount'].copy_abs()
        query = """
            SELECT id, doc_number, doc_date, total_amount, paid_amount,
                   (total_amount - paid_amount) as open_amount
            FROM Invoices
            WHERE anagraphics_id = ?
              AND payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
              AND (total_amount - paid_amount) > ? AND (total_amount - paid_amount) <= ?
            ORDER BY ABS((total_amount - paid_amount) - ?) ASC
            LIMIT ?
        """
        params = (
            anagraphics_id,
            float(AMOUNT_TOLERANCE / 2),
            float(target_amount_abs * 1.5),
            float(target_amount_abs),
            Config.MAX_CANDIDATES
        )
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

# ================== ML-ENHANCED SUGGESTION ENGINE ==================

class MLMatchAnalyzerV2:
    """Uses ML models to analyze and score reconciliation suggestions."""
    def __init__(self, pattern: ClientPaymentPatternV2, trans_details: Dict):
        self.pattern = pattern
        self.trans_details = trans_details
        self.target_amount = trans_details['target_amount'].copy_abs()
        self.ml_preds = pattern.get_ml_predictions(self.target_amount, pd.to_datetime(trans_details['transaction_date']))

    def analyze_combinations(self, candidates: List[Dict]) -> List[Dict]:
        """Analizza le combinazioni di fatture per trovare il miglior match."""
        suggestions = []
        for size in range(1, min(Config.MAX_COMBINATION_SIZE + 1, len(candidates) + 1)):
            for combo in combinations(candidates, size):
                total_amount = sum(quantize(to_decimal(inv['open_amount'])) for inv in combo)
                if abs(total_amount - self.target_amount) <= AMOUNT_TOLERANCE:
                    score = self._calculate_ml_confidence(combo, total_amount)
                    if score >= Config.CONFIDENCE_THRESHOLD:
                        suggestions.append(self._format_suggestion(combo, total_amount, score))
        return suggestions

    def _calculate_ml_confidence(self, combo: Tuple[Dict], total_amount: Decimal) -> float:
        """Calcola lo score di confidenza usando i modelli ML."""
        score = 0.4  # Base score for exact amount match
        
        score += self.ml_preds.get('amount_cluster_match', 0.5) * 0.2
        score += self.ml_preds.get('temporal_likelihood', 0.5) * 0.15
        
        if self.pattern.sequence_model:
            avg_len = self.pattern.sequence_model.get('avg_length', 1)
            if abs(len(combo) - avg_len) <= 1:
                score += 0.1
        
        desc_score = self._calculate_description_match(combo)
        score += desc_score * 0.15
        
        return min(1.0, score)

    def _calculate_description_match(self, combo: Tuple[Dict]) -> float:
        """Calcola il match sulla descrizione."""
        trans_desc_words = set(re.findall(r'\b\w{3,}\b', self.trans_details['description'].lower()))
        if not trans_desc_words: return 0.0
        
        invoice_numbers = {re.sub(r'[\W_]+', '', inv['doc_number'].lower()) for inv in combo}
        
        match_count = sum(1 for num in invoice_numbers if num in self.trans_details['description'].lower())
        return match_count / len(invoice_numbers) if invoice_numbers else 0.0

    def _format_suggestion(self, combo: Tuple[Dict], total_amount: Decimal, score: float) -> Dict:
        """Formatta il suggerimento per l'output API."""
        return {
            'invoice_ids': [inv['id'] for inv in combo],
            'total_amount': total_amount,
            'confidence': self._get_confidence_label(score),
            'confidence_score': score,
            'explanation': f"Match ML-enhanced ({len(combo)} fatture)",
            'match_type': 'ML Pattern',
            'ml_details': self.ml_preds
        }

    def _get_confidence_label(self, score: float) -> str:
        """Restituisce un'etichetta di confidenza basata sullo score."""
        if score >= 0.8: return 'Pattern Cliente Molto Alta'
        elif score >= 0.7: return 'Pattern Cliente Alta'
        elif score >= 0.5: return 'Pattern Cliente Media'
        else: return 'Pattern Cliente'

# ================== PUBLIC API & COMPATIBILITY LAYER ==================

_smart_reconciler_v2: Optional[SmartClientReconciliationV2] = None
_reconciler_lock_v2 = threading.Lock()

def get_smart_reconciler_v2() -> SmartClientReconciliationV2:
    """Singleton factory for the V2 reconciler, thread-safe."""
    global _smart_reconciler_v2
    if _smart_reconciler_v2 is None:
        with _reconciler_lock_v2:
            if _smart_reconciler_v2 is None:
                _smart_reconciler_v2 = SmartClientReconciliationV2()
    return _smart_reconciler_v2

def suggest_client_based_reconciliation(transaction_id: int, anagraphics_id: int) -> List[Dict]:
    """Public API function for client-based suggestions."""
    if not transaction_id or not anagraphics_id:
        return []
    try:
        reconciler = get_smart_reconciler_v2()
        return reconciler.suggest_smart_combinations(transaction_id, anagraphics_id)
    except Exception as e:
        logger.error(f"Errore in suggest_client_based_reconciliation (V2): {e}", exc_info=True)
        return []

def enhance_cumulative_matches_with_client_patterns(transaction_id: int, anagraphics_id: int, 
                                                   standard_suggestions: List[Dict]) -> List[Dict]:
    """Enhances standard suggestions with V2 client patterns."""
    if not anagraphics_id:
        return standard_suggestions
    try:
        reconciler = get_smart_reconciler_v2()
        pattern = reconciler.get_client_pattern(anagraphics_id)
        if not pattern:
            return standard_suggestions
        
        for sugg in standard_suggestions:
            total_amount = sugg.get('total_amount', 0)
            if total_amount > 0:
                preds = pattern.get_ml_predictions(total_amount, datetime.now())
                sugg['confidence_score'] = min(1.0, sugg.get('confidence_score', 0.5) + preds['overall_confidence'] * 0.1)
        
        smart_suggestions = suggest_client_based_reconciliation(transaction_id, anagraphics_id)
        
        all_suggestions = standard_suggestions + smart_suggestions
        unique_suggestions = {tuple(sorted(s['invoice_ids'])): s for s in all_suggestions}.values()
        
        return sorted(list(unique_suggestions), key=lambda x: x['confidence_score'], reverse=True)
    except Exception as e:
        logger.error(f"Errore in enhance_cumulative_matches (V2): {e}", exc_info=True)
        return standard_suggestions

def analyze_client_payment_reliability(anagraphics_id: int) -> Dict[str, Any]:
    """Analyzes client payment reliability using V2 engine."""
    try:
        reconciler = get_smart_reconciler_v2()
        pattern = reconciler.get_client_pattern(anagraphics_id)
        if not pattern:
            return {'error': 'Nessun pattern trovato per il cliente.'}
        
        analyzer = reconciler.async_analyzer
        # In un'app reale, si userebbe `await analyzer.analyze_pattern_async(pattern)`
        # Qui simuliamo la chiamata sincrona per compatibilità
        analysis_result = analyzer._analyze_pattern_sync(pattern)
        return analysis_result
        
    except Exception as e:
        logger.error(f"Errore in analyze_client_payment_reliability (V2): {e}", exc_info=True)
        return {'error': str(e)}

def initialize_smart_reconciliation_engine():
    """Initializes the V2 smart reconciliation engine."""
    logger.info("Inizializzazione motore di riconciliazione intelligente V2...")
    try:
        reconciler = get_smart_reconciler_v2()
        # Pre-load patterns for all clients in a background thread
        reconciler.executor.submit(reconciler._refresh_patterns_cache, force_refresh=True)
        logger.info("Avviato pre-caricamento pattern in background.")
        return True
    except Exception as e:
        logger.error(f"Errore inizializzazione motore V2: {e}", exc_info=True)
        return False

def get_smart_reconciliation_statistics() -> Dict[str, Any]:
    """Ottiene statistiche dettagliate del sistema di riconciliazione intelligente V2."""
    try:
        reconciler = get_smart_reconciler_v2()
        with reconciler._lock:
            total_patterns = len(reconciler.client_patterns)
            
            confidence_scores = [p.confidence_score for p in reconciler.client_patterns.values() if p.confidence_score > 0]
            
            return {
                'total_client_patterns': total_patterns,
                'average_confidence': round(np.mean(confidence_scores), 3) if confidence_scores else 0,
                'cache_size_mb': psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024),
                'patterns_cache_valid': reconciler._is_cache_valid()
            }
    except Exception as e:
        logger.error(f"Errore recupero statistiche smart reconciliation V2: {e}")
        return {'error': str(e)}

def clear_smart_reconciliation_cache():
    """Pulisce la cache del sistema di riconciliazione intelligente V2."""
    try:
        reconciler = get_smart_reconciler_v2()
        with reconciler._lock:
            reconciler.client_patterns.clear()
            reconciler.patterns_cache_time = None
        logger.info("Cache smart reconciliation V2 pulita con successo")
        return True
    except Exception as e:
        logger.error(f"Errore pulizia cache V2: {e}")
        return False