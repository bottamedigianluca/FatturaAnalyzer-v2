/**
 * Reconciliation Hooks V4.0 - CORRETTI per usare API reali
 * Hook per gestione riconciliazione con API backend reali
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { 
  UltraReconciliationRequest, 
  ManualMatchRequest,
  BatchReconciliationRequest 
} from '@/types';
import { 
  useReconciliationStore,
  useUIStore,
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled 
} from '@/store';
import { useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const RECONCILIATION_QUERY_KEYS = {
  RECONCILIATION: ['reconciliation'] as const,
  SUGGESTIONS: ['reconciliation', 'suggestions'] as const,
  AI_MATCHES: ['reconciliation', 'ai-matches'] as const,
  CLIENT_RELIABILITY: ['reconciliation', 'client-reliability'] as const,
  OPPORTUNITIES: ['reconciliation', 'opportunities'] as const,
  SYSTEM_STATUS: ['reconciliation', 'system', 'status'] as const,
  PERFORMANCE: ['reconciliation', 'performance'] as const,
  VERSION: ['reconciliation', 'version'] as const,
} as const;

/**
 * Hook per Ultra Smart Reconciliation con API reali
 */
export const useUltraSmartReconciliation = (request: UltraReconciliationRequest) => {
  const setUltraSmartSuggestions = useReconciliationStore(state => state.setUltraSmartSuggestions);
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.SUGGESTIONS, 'ultra', request],
    queryFn: async () => {
      if (!smartEnabled) {
        throw new Error('Smart reconciliation not enabled');
      }
      
      const result = await apiClient.getUltraSmartSuggestions(request);
      setUltraSmartSuggestions(result.suggestions || []);
      return result;
    },
    enabled: smartEnabled && !!request,
    staleTime: 60000, // 1 minute
    onError: (error) => handleError(error, 'ultra-smart-reconciliation'),
  });
};

/**
 * Hook per reconciliation suggestions standard con API reali
 */
export const useReconciliationSuggestions = (
  maxSuggestions = 50,
  confidenceThreshold = 0.5
) => {
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.SUGGESTIONS, { maxSuggestions, confidenceThreshold }],
    queryFn: () => apiClient.getUltraSmartSuggestions({
      operation_type: 'auto',
      max_suggestions: maxSuggestions,
      confidence_threshold: confidenceThreshold,
      enable_ai_enhancement: smartEnabled,
      enable_smart_patterns: smartEnabled,
      enable_predictive_scoring: smartEnabled,
    }),
    enabled: smartEnabled,
    staleTime: 180000, // 3 minutes
    onError: (error) => handleError(error, 'reconciliation-suggestions'),
  });
};

/**
 * Hook per manual match con API reali
 */
export const useManualReconciliation = () => {
  const queryClient = useQueryClient();
  const addRecentReconciliation = useReconciliationStore(state => state.addRecentReconciliation);
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (request: ManualMatchRequest) => apiClient.applyManualMatchV4(request),
    onSuccess: (data, variables) => {
      // Invalida cache correlate
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      // Aggiungi a cronologia
      addRecentReconciliation({
        invoice_id: variables.invoice_id,
        transaction_id: variables.transaction_id,
        amount: variables.amount_to_match,
        ai_validated: variables.enable_ai_validation,
        success: true,
        reconciliation_date: new Date().toISOString(),
      });
      
      addNotification({
        type: 'success',
        title: 'Riconciliazione Completata',
        message: data.ai_validation_passed 
          ? 'Validazione AI superata' 
          : 'Riconciliazione manuale applicata',
      });
    },
    onError: (error) => {
      handleError(error, 'manual-reconciliation');
      toast.error('Errore nella riconciliazione');
    },
  });
};

/**
 * Hook per client reliability analysis con API reali
 */
export const useClientReliability = (anagraphicsId: number) => {
  const updateClientReliabilityAnalysis = useReconciliationStore(
    state => state.updateClientReliabilityAnalysis
  );
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.CLIENT_RELIABILITY, anagraphicsId],
    queryFn: async () => {
      if (!aiEnabled) {
        throw new Error('AI features not enabled');
      }
      
      const analysis = await apiClient.getClientPaymentReliabilityV4(
        anagraphicsId,
        true, // includePredictions
        true, // includePatternAnalysis
        true  // enhancedInsights
      );
      
      updateClientReliabilityAnalysis(anagraphicsId, analysis);
      return analysis;
    },
    enabled: !!anagraphicsId && aiEnabled,
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'client-reliability'),
  });
};

/**
 * Hook per automatic matching opportunities con API reali
 */
export const useAutomaticMatchingOpportunities = (options = {}) => {
  const setOpportunities = useReconciliationStore(state => state.setOpportunities);
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    confidenceLevel = 'High',
    maxOpportunities = 50,
    enableAI = true,
  } = options;
  
  return useQuery({
    queryKey: [
      ...RECONCILIATION_QUERY_KEYS.OPPORTUNITIES, 
      { confidenceLevel, maxOpportunities, enableAI }
    ],
    queryFn: async () => {
      if (!smartEnabled) {
        throw new Error('Smart reconciliation not enabled');
      }
      
      const opportunities = await apiClient.getAutomaticMatchingOpportunitiesV4(
        confidenceLevel as any,
        maxOpportunities,
        enableAI,
        true, // enableRiskAssessment
        true  // prioritizeHighValue
      );
      
      setOpportunities(opportunities.opportunities || []);
      return opportunities;
    },
    enabled: smartEnabled,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes auto-refresh
    onError: (error) => handleError(error, 'matching-opportunities'),
  });
};

/**
 * Hook per batch reconciliation processing con API reali
 */
export const useBatchReconciliationProcessing = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (request: BatchReconciliationRequest) => 
      apiClient.processBatchReconciliationV4(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      addNotification({
        type: 'success',
        title: 'Batch Reconciliation Completato',
        message: `${data.processed_count || 0} riconciliazioni elaborate`,
      });
    },
    onError: (error) => {
      handleError(error, 'batch-reconciliation');
      toast.error('Errore nel batch reconciliation');
    },
  });
};

/**
 * Hook per reconciliation system status con API reali
 */
export const useReconciliationSystemStatus = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.SYSTEM_STATUS,
    queryFn: () => apiClient.getReconciliationSystemStatus(),
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    onError: (error) => handleError(error, 'reconciliation-system-status'),
  });
};

/**
 * Hook per reconciliation performance metrics con API reali
 */
export const useReconciliationPerformance = () => {
  const updatePerformanceMetrics = useReconciliationStore(state => state.updatePerformanceMetrics);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.PERFORMANCE,
    queryFn: async () => {
      const metrics = await apiClient.getReconciliationPerformanceMetrics();
      
      updatePerformanceMetrics({
        success_rate: metrics.success_rate,
        average_confidence: metrics.average_confidence,
        ai_accuracy: metrics.ai_accuracy,
      });
      
      return metrics;
    },
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'reconciliation-performance'),
  });
};

/**
 * Hook per reconciliation version info con API reali
 */
export const useReconciliationVersion = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.VERSION,
    queryFn: () => apiClient.getReconciliationVersionInfo(),
    staleTime: Infinity, // Dati stabili
    onError: (error) => handleError(error, 'reconciliation-version'),
  });
};

/**
 * Hook per reconciliation health check con API reali
 */
export const useReconciliationHealth = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ['reconciliation', 'health'],
    queryFn: () => apiClient.getReconciliationHealth(),
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'reconciliation-health'),
  });
};

/**
 * Hook per gestione completa della riconciliazione drag & drop con API reali
 */
export const useDragDropReconciliation = () => {
  const setDraggedItem = useReconciliationStore(state => state.setDraggedItem);
  const setDropTarget = useReconciliationStore(state => state.setDropTarget);
  const draggedItem = useReconciliationStore(state => state.draggedItem);
  const dropTarget = useReconciliationStore(state => state.dropTarget);
  const manualReconciliation = useManualReconciliation();
  const smartSuggestions = useSmartReconciliationEnabled();
  
  const handleDragStart = (type: 'invoice' | 'transaction', data: any) => {
    setDraggedItem({ type, data });
  };
  
  const handleDragOver = (type: 'invoice' | 'transaction', id: number) => {
    if (draggedItem && draggedItem.type !== type) {
      setDropTarget({ type, id });
    }
  };
  
  const handleDrop = async (confidence?: number) => {
    if (!draggedItem || !dropTarget) return;
    
    const isInvoiceToTransaction = draggedItem.type === 'invoice' && dropTarget.type === 'transaction';
    const isTransactionToInvoice = draggedItem.type === 'transaction' && dropTarget.type === 'invoice';
    
    if (isInvoiceToTransaction || isTransactionToInvoice) {
      const invoiceId = isInvoiceToTransaction ? draggedItem.data.id : dropTarget.id;
      const transactionId = isTransactionToInvoice ? draggedItem.data.id : dropTarget.id;
      const amount = isInvoiceToTransaction 
        ? draggedItem.data.total_amount 
        : Math.abs(draggedItem.data.amount);
      
      await manualReconciliation.mutateAsync({
        invoice_id: invoiceId,
        transaction_id: transactionId,
        amount_to_match: amount,
        enable_ai_validation: smartSuggestions,
        enable_learning: smartSuggestions,
        user_confidence: confidence,
      });
    }
    
    // Reset drag state
    setDraggedItem(null);
    setDropTarget(null);
  };
  
  const clearDragState = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };
  
  return {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    clearDragState,
    isReconciling: manualReconciliation.isPending,
  };
};

/**
 * Hook composito per workflow completo reconciliation con API reali
 */
export const useReconciliationWorkflow = () => {
  const selectedInvoices = useReconciliationStore(state => state.selectedInvoices);
  const selectedTransactions = useReconciliationStore(state => state.selectedTransactions);
  const clearSelection = useReconciliationStore(state => state.clearSelection);
  
  const manualReconciliation = useManualReconciliation();
  const batchProcessing = useBatchReconciliationProcessing();
  const dragDropReconciliation = useDragDropReconciliation();
  
  const applyBestMatches = async (confidenceThreshold = 0.8) => {
    // Logica per applicare i match migliori
    if (selectedInvoices.length > 0 && selectedTransactions.length > 0) {
      const reconciliations = selectedInvoices.slice(0, selectedTransactions.length).map((invoice, index) => ({
        invoice_id: invoice.id,
        transaction_id: selectedTransactions[index].id,
        amount: invoice.total_amount,
      }));
      
      await batchProcessing.mutateAsync({
        reconciliation_pairs: reconciliations,
        enable_ai_validation: true,
        enable_parallel_processing: true,
      });
      clearSelection();
    }
  };
  
  return {
    selectedInvoices,
    selectedTransactions,
    manualReconciliation,
    batchProcessing,
    dragDropReconciliation,
    applyBestMatches,
    clearSelection,
    isProcessing: manualReconciliation.isPending || batchProcessing.isPending,
    hasSelections: selectedInvoices.length > 0 || selectedTransactions.length > 0,
  };
};

/**
 * Hook per analytics di reconciliation con API reali
 */
export const useReconciliationAnalytics = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ['reconciliation', 'analytics'],
    queryFn: async () => {
      const [performance, systemStatus] = await Promise.all([
        apiClient.getReconciliationPerformanceMetrics(),
        apiClient.getReconciliationSystemStatus(),
      ]);
      
      return {
        ...performance,
        system_status: systemStatus,
        success_rate: performance.success_rate || 0,
        ml_accuracy: performance.ai_accuracy || 0,
        total_processed: performance.total_reconciliations || 0,
        time_saved_hours: performance.time_saved_hours || 0,
      };
    },
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'reconciliation-analytics'),
  });
};

/**
 * Hook per auto reconciliation con API reali
 */
export const useAutoReconciliation = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: async (options: {
      confidence_threshold?: number;
      max_auto_reconcile?: number;
    }) => {
      const opportunities = await apiClient.getAutomaticMatchingOpportunitiesV4(
        'High',
        options.max_auto_reconcile || 50,
        true,
        true,
        true
      );
      
      if (!opportunities.opportunities || opportunities.opportunities.length === 0) {
        return { processed_count: 0, message: 'Nessuna opportunità di auto-reconciliation trovata' };
      }
      
      const highConfidenceOpportunities = opportunities.opportunities.filter(
        opp => opp.confidence_score >= (options.confidence_threshold || 0.9)
      );
      
      if (highConfidenceOpportunities.length === 0) {
        return { processed_count: 0, message: 'Nessuna opportunità ad alta confidenza trovata' };
      }
      
      const reconciliations = highConfidenceOpportunities.map(opp => ({
        invoice_id: opp.invoice_id,
        transaction_id: opp.transaction_id,
        amount: opp.amount,
      }));
      
      return await apiClient.processBatchReconciliationV4({
        reconciliation_pairs: reconciliations,
        enable_ai_validation: true,
        enable_parallel_processing: true,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      addNotification({
        type: 'success',
        title: 'Auto-Reconciliation Completata',
        message: `${data.processed_count || 0} riconciliazioni automatiche elaborate`,
      });
    },
    onError: (error) => {
      handleError(error, 'auto-reconciliation');
      toast.error('Errore nell\'auto-reconciliation');
    },
  });
};

// Export dei principali hook
export {
  useReconciliationSuggestions as useSuggestions,
  useManualReconciliation as useManualMatch,
  useReconciliationAnalytics as useAnalytics,
  useReconciliationSystemStatus as useStatus
};
