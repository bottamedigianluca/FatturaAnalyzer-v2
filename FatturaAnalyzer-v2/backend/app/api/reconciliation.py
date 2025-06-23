"""
Reconciliation API V4.0 - VERSIONE CORRETTA E FUNZIONANTE
Combina la struttura pulita della versione corta con i metodi corretti dell'adapter V4.0
"""
import logging
import asyncio
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body, Request
from app.adapters.reconciliation_adapter import (
    get_reconciliation_adapter_v4,
    initialize_reconciliation_system_v4,
    get_system_status_v4,
    get_version_info
)
from app.models import APIResponse
from app.models.reconciliation import (
    UltraReconciliationRequest, 
    ManualMatchRequestV4, 
    BatchReconciliationRequestV4
)

logger = logging.getLogger(__name__)
router = APIRouter()
_adapter_v4 = None
_system_initialized = False

async def get_adapter_v4():
    """Get the V4.0 adapter (singleton con lazy initialization)"""
    global _adapter_v4, _system_initialized
    if not _system_initialized:
        logger.info("Initializing ReconciliationSystem V4.0...")
        init_result = await initialize_reconciliation_system_v4()
        if init_result.get('status') == 'success':
            _adapter_v4 = get_reconciliation_adapter_v4()
            _system_initialized = True
            logger.info("ReconciliationSystem V4.0 initialized successfully")
        else:
            logger.error("Failed to initialize ReconciliationSystem V4.0", errors=init_result.get('errors', []))
            raise RuntimeError("ReconciliationSystem V4.0 initialization failed")
    return _adapter_v4

# ================== ULTRA SMART SUGGESTIONS V4.0 ==================

@router.post("/ultra/smart-suggestions", response_model=APIResponse)
async def get_ultra_smart_suggestions_v4(recon_request: UltraReconciliationRequest):
    """🚀 ULTRA Smart Suggestions V4.0 - Sfrutta tutte le funzionalità del nuovo adapter"""
    try:
        adapter = await get_adapter_v4()
        
        logger.info("Processing ultra smart suggestions V4.0", 
                   operation_type=recon_request.operation_type,
                   ai_enabled=recon_request.enable_ai_enhancement,
                   smart_enabled=recon_request.enable_smart_patterns)
        
        start_time = time.time()
        suggestions = []
        features_used = []
        
        # Route per tipo di operazione usando i metodi REALI dell'adapter V4.0
        if recon_request.operation_type == "1_to_1":
            suggestions = await adapter.suggest_1_to_1_matches_async(
                invoice_id=recon_request.invoice_id,
                transaction_id=recon_request.transaction_id,
                anagraphics_id_filter=recon_request.anagraphics_id_filter,
                enable_ai=recon_request.enable_ai_enhancement,
                enable_caching=recon_request.enable_caching
            )
            features_used.append("1_to_1_matching_v4")
            
        elif recon_request.operation_type == "n_to_m":
            suggestions = await adapter.suggest_n_to_m_matches_async(
                transaction_id=recon_request.transaction_id,
                anagraphics_id_filter=recon_request.anagraphics_id_filter,
                max_combination_size=recon_request.max_combination_size,
                max_search_time_ms=recon_request.max_search_time_ms,
                exclude_invoice_ids=recon_request.exclude_invoice_ids,
                start_date=recon_request.start_date,
                end_date=recon_request.end_date,
                enable_ai=recon_request.enable_ai_enhancement,
                enable_parallel=recon_request.enable_parallel_processing
            )
            features_used.append("n_to_m_matching_v4")
            
        elif recon_request.operation_type == "smart_client":
            if not recon_request.transaction_id or not recon_request.anagraphics_id_filter:
                raise HTTPException(
                    status_code=400,
                    detail="smart_client requires both transaction_id and anagraphics_id_filter"
                )
            
            suggestions = await adapter.suggest_smart_client_reconciliation_async(
                transaction_id=recon_request.transaction_id,
                anagraphics_id=recon_request.anagraphics_id_filter,
                enhance_with_ml=recon_request.enable_ai_enhancement,
                enable_predictive=recon_request.enable_predictive_scoring
            )
            features_used.append("smart_client_v4")
            
        elif recon_request.operation_type == "auto":
            suggestions = await adapter.find_automatic_matches_async(
                confidence_level='High' if recon_request.confidence_threshold >= 0.8 else 'Medium',
                max_suggestions=recon_request.max_suggestions,
                enable_batch_processing=recon_request.enable_parallel_processing,
                enable_ai_filtering=recon_request.enable_ai_enhancement
            )
            features_used.append("automatic_matching_v4")
            
        elif recon_request.operation_type == "ultra_smart":
            # Combina multiple strategie per risultati ottimali
            tasks = []
            
            if recon_request.transaction_id:
                # 1:1 matching
                tasks.append(adapter.suggest_1_to_1_matches_async(
                    transaction_id=recon_request.transaction_id,
                    anagraphics_id_filter=recon_request.anagraphics_id_filter,
                    enable_ai=True,
                    enable_caching=recon_request.enable_caching
                ))
                
                # N:M matching se è disponibile anagraphics_id
                if recon_request.anagraphics_id_filter:
                    tasks.append(adapter.suggest_n_to_m_matches_async(
                        transaction_id=recon_request.transaction_id,
                        anagraphics_id_filter=recon_request.anagraphics_id_filter,
                        enable_ai=True,
                        enable_parallel=True
                    ))
                    
                    # Smart client reconciliation
                    tasks.append(adapter.suggest_smart_client_reconciliation_async(
                        transaction_id=recon_request.transaction_id,
                        anagraphics_id=recon_request.anagraphics_id_filter,
                        enhance_with_ml=True,
                        enable_predictive=True
                    ))
            
            # Esegui tutte le strategie in parallelo
            strategy_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combina e deduplica risultati
            all_suggestions = []
            for result in strategy_results:
                if isinstance(result, Exception):
                    logger.warning(f"Strategy failed: {result}")
                    continue
                
                if isinstance(result, list):
                    all_suggestions.extend(result)
            
            # Deduplica e ordina per confidenza
            suggestions = _deduplicate_and_rank_suggestions(all_suggestions)
            features_used.extend(["ultra_smart_v4", "multi_strategy_combination"])
        
        # Applica filtri di confidenza
        if suggestions:
            suggestions = [
                s for s in suggestions 
                if s.get('confidence_score', 0) >= recon_request.confidence_threshold
            ][:recon_request.max_suggestions]
        
        # Calcola metriche
        processing_time = (time.time() - start_time) * 1000
        
        response_data = {
            'suggestions': suggestions,
            'processing_time_ms': processing_time,
            'features_used': features_used,
            'suggestions_count': len(suggestions),
            'adapter_version': '4.0',
            'ai_enhanced': recon_request.enable_ai_enhancement,
            'smart_enhanced': recon_request.enable_smart_patterns
        }
        
        return APIResponse(
            success=True,
            message=f"Ultra smart suggestions V4.0: {len(suggestions)} matches found",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ultra smart suggestions V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error generating ultra smart suggestions V4.0"
        )

# ================== MANUAL MATCHING V4.0 ==================

@router.post("/manual-match", response_model=APIResponse)
async def apply_manual_match_v4(match_request: ManualMatchRequestV4):
    """🎯 Manual Match V4.0 - Con AI validation e pattern learning"""
    try:
        adapter = await get_adapter_v4()
        
        logger.info("Processing manual match V4.0",
                   invoice_id=match_request.invoice_id,
                   transaction_id=match_request.transaction_id,
                   amount=match_request.amount_to_match,
                   ai_validation=match_request.enable_ai_validation)
        
        # Usa il metodo REALE dell'adapter V4.0
        result = await adapter.apply_manual_match_async(
            invoice_id=match_request.invoice_id,
            transaction_id=match_request.transaction_id,
            amount_to_match=match_request.amount_to_match,
            validate_ai=match_request.enable_ai_validation,
            enable_learning=match_request.enable_learning
        )
        
        # Arricchisci con informazioni V4.0
        if result['success']:
            if match_request.enable_learning:
                result['pattern_learning_applied'] = True
                result['learning_insights'] = "Manual match pattern saved for future AI enhancement"
            
            if match_request.user_confidence is not None:
                result['user_confidence'] = match_request.user_confidence
                result['confidence_delta'] = abs(match_request.user_confidence - 0.95)
            
            if match_request.notes:
                result['user_notes'] = match_request.notes
        
        return APIResponse(
            success=result['success'],
            message=result['message'],
            data=result
        )
        
    except Exception as e:
        logger.error(f"Manual match V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error applying manual match V4.0"
        )

# ================== BATCH PROCESSING V4.0 ==================

@router.post("/batch/process", response_model=APIResponse)
async def process_batch_reconciliation_v4(batch_request: BatchReconciliationRequestV4):
    """⚡️ Batch Reconciliation V4.0 - Processa riconciliazioni in modo massivo"""
    try:
        adapter = await get_adapter_v4()
        
        logger.info("Processing ultra batch V4.0",
                   batch_size=len(batch_request.requests),
                   parallel_execution=batch_request.parallel_execution)
        
        # Usa il batch processor REALE dell'adapter V4.0
        processor_requests = []
        for req in batch_request.requests:
            processor_req = {
                'type': req.operation_type,
                'id': f"req_{len(processor_requests)}",
                'invoice_id': req.invoice_id,
                'transaction_id': req.transaction_id,
                'anagraphics_id_filter': req.anagraphics_id_filter,
                'max_combination_size': req.max_combination_size,
                'max_search_time_ms': req.max_search_time_ms,
                'enable_ai': req.enable_ai_enhancement,
                'enable_smart': req.enable_smart_patterns
            }
            processor_requests.append(processor_req)
        
        # Usa il metodo REALE del batch processor
        batch_results = await adapter.batch_processor.process_suggestions_batch(processor_requests)
        
        # Trasforma results nel formato API
        api_results = []
        for req_id, suggestions in batch_results.items():
            api_results.append({
                'request_id': req_id,
                'success': True,
                'suggestions': suggestions,
                'count': len(suggestions)
            })
        
        return APIResponse(
            success=True,
            message=f"Batch processing V4.0 completed: {len(api_results)} requests processed",
            data={
                'results': api_results,
                'batch_performance': {
                    'total_requests': len(batch_request.requests),
                    'successful': len(api_results),
                    'parallel_processing': batch_request.parallel_execution
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Batch processing V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error processing batch reconciliation V4.0"
        )

# ================== AUTO RECONCILIATION ==================

@router.post("/auto/trigger", response_model=APIResponse)
async def trigger_auto_reconciliation_v4(
    confidence_threshold: float = Query(0.9, ge=0.0, le=1.0),
    max_matches: int = Query(100, ge=1, le=1000)
):
    """🤖 Auto-Reconciliation V4.0 - Avvia il processo automatico"""
    try:
        adapter = await get_adapter_v4()
        
        # Trova automatic matches usando il metodo REALE
        confidence_level = 'High' if confidence_threshold >= 0.8 else 'Medium'
        
        automatic_matches = await adapter.find_automatic_matches_async(
            confidence_level=confidence_level,
            max_suggestions=max_matches,
            enable_batch_processing=True,
            enable_ai_filtering=True
        )
        
        # Applica i matches trovati se ce ne sono
        applied_matches = 0
        errors = []
        
        for match in automatic_matches[:max_matches]:
            try:
                # Estrai i dati necessari per il match
                invoice_ids = match.get('invoice_ids', [])
                transaction_ids = match.get('transaction_ids', [])
                total_amount = match.get('total_amount', 0)
                
                if len(invoice_ids) == 1 and len(transaction_ids) == 1:
                    # Match 1:1 - usa manual match
                    result = await adapter.apply_manual_match_async(
                        invoice_id=invoice_ids[0],
                        transaction_id=transaction_ids[0],
                        amount_to_match=total_amount,
                        validate_ai=False,  # Auto mode - skip validation
                        enable_learning=True
                    )
                    
                    if result['success']:
                        applied_matches += 1
                    else:
                        errors.append(f"Failed to apply match: {result['message']}")
                
                elif len(invoice_ids) > 1 or len(transaction_ids) > 1:
                    # Match complesso - usa batch processing
                    batch_result = await adapter.perform_batch_auto_reconciliation_async(
                        transaction_ids=transaction_ids,
                        invoice_ids=invoice_ids,
                        enable_ai_validation=False
                    )
                    
                    if batch_result['success']:
                        applied_matches += 1
                    else:
                        errors.append(f"Failed to apply batch match: {batch_result['message']}")
                        
            except Exception as e:
                errors.append(f"Error processing match: {str(e)}")
        
        return APIResponse(
            success=True,
            message=f"Auto-reconciliation completed: {applied_matches}/{len(automatic_matches)} matches applied",
            data={
                'matches_found': len(automatic_matches),
                'matches_applied': applied_matches,
                'errors': errors,
                'confidence_threshold': confidence_threshold,
                'confidence_level': confidence_level
            }
        )
        
    except Exception as e:
        logger.error(f"Auto-reconciliation V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error triggering auto-reconciliation V4.0"
        )

# ================== CLIENT RELIABILITY ==================

@router.get("/client/reliability/{anagraphics_id}", response_model=APIResponse)
async def get_client_payment_reliability_v4(
    anagraphics_id: int = Path(..., gt=0, description="Anagraphics ID"),
    include_predictions: bool = Query(True, description="Include ML predictions"),
    enhanced_insights: bool = Query(True, description="Include enhanced AI insights")
):
    """🎯 Client Reliability Analysis V4.0 - Enhanced with ML predictions"""
    try:
        adapter = await get_adapter_v4()
        
        logger.info("Analyzing client reliability V4.0", 
                   anagraphics_id=anagraphics_id,
                   predictions=include_predictions)
        
        # Usa il metodo REALE dell'adapter V4.0
        reliability_analysis = await adapter.analyze_client_payment_reliability_async(anagraphics_id)
        
        return APIResponse(
            success=True,
            message=f"Client reliability analysis V4.0 for anagraphics {anagraphics_id}",
            data=reliability_analysis
        )
        
    except Exception as e:
        logger.error(f"Client reliability V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error analyzing client reliability V4.0"
        )

# ================== AUTOMATIC OPPORTUNITIES ==================

@router.get("/automatic/opportunities", response_model=APIResponse)
async def get_automatic_matching_opportunities_v4(
    confidence_level: str = Query("High", regex="^(Exact|High|Medium|Low)$"),
    max_opportunities: int = Query(50, ge=1, le=200),
    enable_ai_filtering: bool = Query(True, description="Enable AI-powered filtering")
):
    """🤖 Automatic Matching Opportunities V4.0 - AI-Enhanced Discovery"""
    try:
        adapter = await get_adapter_v4()
        
        logger.info("Finding automatic opportunities V4.0",
                   confidence_level=confidence_level,
                   max_opportunities=max_opportunities,
                   ai_filtering=enable_ai_filtering)
        
        # Usa il metodo REALE dell'adapter V4.0
        opportunities = await adapter.find_automatic_matches_async(
            confidence_level=confidence_level,
            max_suggestions=max_opportunities,
            enable_batch_processing=True,
            enable_ai_filtering=enable_ai_filtering
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(opportunities)} automatic matching opportunities V4.0",
            data={
                'opportunities': opportunities,
                'configuration': {
                    'confidence_level': confidence_level,
                    'ai_filtering_enabled': enable_ai_filtering,
                    'max_opportunities': max_opportunities
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Automatic opportunities V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error finding automatic matching opportunities V4.0"
        )

# ================== SYSTEM STATUS E MONITORING ==================

@router.get("/performance/metrics", response_model=APIResponse)
async def get_reconciliation_performance_metrics():
    """📊 Performance Metrics V4.0 - Advanced analytics"""
    try:
        adapter = await get_adapter_v4()
        
        # Usa il metodo REALE dell'adapter V4.0
        performance_data = await adapter.get_comprehensive_performance_async()
        
        return APIResponse(
            success=True,
            message="ReconciliationSystem V4.0 performance metrics",
            data=performance_data
        )
        
    except Exception as e:
        logger.error(f"Performance metrics V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error retrieving performance metrics V4.0"
        )

@router.get("/system/status", response_model=APIResponse)
async def get_reconciliation_system_status():
    """🏥 System Status V4.0 - Comprehensive health check"""
    try:
        # Usa la funzione REALE di sistema V4.0
        system_status = await get_system_status_v4()
        
        return APIResponse(
            success=True,
            message="ReconciliationSystem V4.0 status retrieved",
            data=system_status
        )
        
    except Exception as e:
        logger.error(f"System status V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error retrieving system status V4.0"
        )

@router.get("/version", response_model=APIResponse)
async def get_reconciliation_version():
    """ℹ️ Version Info V4.0 - Complete system information"""
    try:
        # Usa la funzione REALE
        version_info = get_version_info()
        
        return APIResponse(
            success=True,
            message="ReconciliationSystem V4.0 version information",
            data=version_info
        )
        
    except Exception as e:
        logger.error(f"Version info V4.0 failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error retrieving version information"
        )

@router.get("/health", response_model=APIResponse)
async def get_reconciliation_health():
    """🔍 Health Check V4.0 - System health verification"""
    try:
        adapter = await get_adapter_v4()
        
        # Health check semplice - verifica che l'adapter sia funzionante
        try:
            # Test con una chiamata che dovrebbe funzionare sempre
            test_suggestions = await adapter.suggest_1_to_1_matches_async(
                transaction_id=999999,  # ID che non esiste, dovrebbe ritornare lista vuota
                enable_caching=False
            )
            
            health_status = {
                'healthy': True,
                'adapter_responsive': True,
                'test_query_successful': isinstance(test_suggestions, list),
                'system_initialized': _system_initialized,
                'timestamp': time.time()
            }
            
        except Exception as test_error:
            health_status = {
                'healthy': False,
                'adapter_responsive': False,
                'test_query_successful': False,
                'system_initialized': _system_initialized,
                'error': str(test_error),
                'timestamp': time.time()
            }
        
        return APIResponse(
            success=health_status.get("healthy", False), 
            message="Reconciliation health check completed",
            data=health_status
        )
        
    except Exception as e:
        logger.error(f"Reconciliation health check failed: {e}")
        raise HTTPException(status_code=500, detail="Reconciliation health check failed.")

# ================== UTILITY FUNCTIONS ==================

def _deduplicate_and_rank_suggestions(suggestions: List[Dict]) -> List[Dict]:
    """Deduplica e ordina suggestions per confidence"""
    seen_keys = set()
    deduplicated = []
    
    for suggestion in suggestions:
        # Crea chiave unica
        invoice_ids = tuple(sorted(suggestion.get('invoice_ids', [])))
        transaction_ids = tuple(sorted(suggestion.get('transaction_ids', [])))
        key = (invoice_ids, transaction_ids)
        
        if key not in seen_keys:
            seen_keys.add(key)
            deduplicated.append(suggestion)
    
    # Ordina per AI confidence score se disponibile, altrimenti per confidence normale
    return sorted(
        deduplicated,
        key=lambda x: x.get('ai_confidence_score', x.get('confidence_score', 0)),
        reverse=True
    )

# ================== ROOT ENDPOINT ==================

@router.get("/")
async def reconciliation_api_v4_root():
    """🚀 Reconciliation API V4.0 - Overview"""
    try:
        # Verifica se il sistema è inizializzato
        system_status = None
        try:
            system_status = await get_system_status_v4()
        except:
            pass
        
        version_info = get_version_info()
        
        api_overview = {
            "welcome_message": "Benvenuto in Reconciliation API V4.0!",
            "system_status": "🚀 ReconciliationAdapter V4.0 Active" if _system_initialized else "⚠️ System Not Initialized",
            
            "key_endpoints_v4": {
                "ultra_suggestions": "POST /ultra/smart-suggestions - AI/ML suggestions",
                "manual_matching": "POST /manual-match - Enhanced con AI validation",
                "batch_processing": "POST /batch/process - Parallel batch operations",
                "client_reliability": "GET /client/reliability/{id} - ML predictions",
                "automatic_opportunities": "GET /automatic/opportunities - AI discovery",
                "system_status": "GET /system/status - Comprehensive health check",
                "auto_reconciliation": "POST /auto/trigger - Automatic reconciliation"
            },
            
            "system_info_v4": {
                "adapter_version": version_info.get('adapter_version'),
                "system_initialized": _system_initialized,
                "features_enabled": version_info.get('features', {}),
                "health_status": system_status.get('health_check', {}).get('overall_status', 'unknown') if system_status else 'unknown'
            },
            
            "quick_start_v4": {
                "smart_suggestions": "POST /ultra/smart-suggestions con operation_type='ultra_smart'",
                "client_analysis": "GET /client/reliability/{anagraphics_id}",
                "batch_operations": "POST /batch/process per multiple requests",
                "system_monitoring": "GET /system/status per health check completo"
            }
        }
        
        return APIResponse(
            success=True,
            message="🚀 Reconciliation API V4.0 - Ready",
            data=api_overview
        )
        
    except Exception as e:
        logger.error(f"Root endpoint V4.0 failed: {e}", exc_info=True)
        return APIResponse(
            success=False,
            message="Error retrieving API overview V4.0",
            data={"error": str(e)}
        )
