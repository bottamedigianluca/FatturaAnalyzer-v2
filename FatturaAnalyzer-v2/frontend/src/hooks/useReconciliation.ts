/**
 * Reconciliation V4.0 Hooks
 * Hook per riconciliazione smart con AI e machine learning
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { UltraReconciliationRequest, ManualMatchRequest } from '@/types';
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
  SMART_SUGGESTIONS: ['reconciliation', 'smart-suggestions'] as const,
  AI_MATCHES: ['reconciliation', 'ai-matches'] as const,
  CLIENT_RELIABILITY: ['reconciliation', 'client-reliability'] as const,
  OPPORTUNITIES: ['reconciliation', 'opportunities'] as const,
  SYSTEM_STATUS: ['reconciliation', 'system', 'status'] as const,
  PERFORMANCE: ['reconciliation', 'performance'] as const,
  VERSION: ['reconciliation', 'version'] as const,
} as const;

/**
 * Hook per Ultra Smart Reconciliation con AI avanzata
 */
export const useUltraSmartReconciliation = (request: UltraReconciliationRequest) => {
  const setUltraSmartSuggestions = useReconciliationStore(state => state.setUltraSmartSuggestions);
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.SMART_SUGGESTIONS, 'ultra', request],
    queryFn: async () => {
      const result = await apiClient.getUltraSmartSuggestions(request);
      setUltraSmartSuggestions(result.suggestions || []);
      return result;
    },
    enabled: smartEnabled,
    staleTime: 60000, // 1 minute (molto fresco per reconciliation)
    onError: (error) => handleError(error, 'ultra-smart-reconciliation'),
  });
};

/**
 * Hook per manual match con AI validation
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
 * Hook per client reliability analysis
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
      const analysis = await apiClient.getClientPaymentReliabilityV4(
        anagraphicsId,
        aiEnabled, // includePredictions
        true, // includePatternAnalysis
        aiEnabled // enhancedInsights
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
 * Hook per automatic matching opportunities
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
      const opportunities = await apiClient.getAutomaticMatchingOpportunitiesV4(
        confidenceLevel as any,
        maxOpportunities,
        enableAI,
        true, // enableRiskAssessment
        true // prioritizeHighValue
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
 * Hook per batch reconciliation processing
 */
export const useBatchReconciliationProcessing = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (request: {
      reconciliation_pairs: Array<{
        invoice_id: number;
        transaction_id: number;
        amount: number;
      }>;
      enable_ai_validation?: boolean;
      enable_parallel_processing?: boolean;
      force_background?: boolean;
    }) => apiClient.processBatchReconciliationV4(request),
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
 * Hook per reconciliation system status
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
 * Hook per reconciliation performance metrics
 */
export const useReconciliationPerformance = () => {
  const updateReconciliationPerformance = useReconciliationStore(state => state.updatePerformanceMetrics);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.PERFORMANCE,
    queryFn: async () => {
      const metrics = await apiClient.getReconciliationPerformanceMetrics();
      
      updateReconciliationPerformance({
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
 * Hook per reconciliation version info
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
 * Hook per reconciliation health check
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
 * Hook per gestione completa della riconciliazione drag & drop
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
        ? draggedItem.data.totale_documento 
        : draggedItem.data.amount;
      
      await manualReconciliation.mutateAsync({
        invoice_id: invoiceId,
        transaction_id: transactionId,
        amount_to_match: Math.abs(amount),
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
 * Hook per reconciliation suggestions standard
 */
export const useReconciliationSuggestions = (
  maxSuggestions = 50,
  confidenceThreshold = 0.5
) => {
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.RECONCILIATION, 'suggestions', { maxSuggestions, confidenceThreshold }],
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
 * Hook per reconciliation opportunities standard
 */
export const useReconciliationOpportunities = (
  limit = 20,
  amountTolerance = 0.01
) => {
  const smartEnabled = useSmartReconciliationEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.OPPORTUNITIES, 'standard', { limit, amountTolerance }],
    queryFn: () => apiClient.getAutomaticMatchingOpportunitiesV4('High', limit),
    enabled: smartEnabled,
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'reconciliation-opportunities'),
  });
};

/**
 * Hook composito per workflow completo reconciliation
 */
export const useReconciliationWorkflow = () => {
  const selectedInvoices = useReconciliationStore(state => state.selectedInvoices);
  const selectedTransactions = useReconciliationStore(state => state.selectedTransactions);
  const clearSelection = useReconciliationStore(state => state.clearSelection);
  
  const manualReconciliation = useManualReconciliation();
  const batchProcessing = useBatchReconciliationProcessing();
  const dragDropReconciliation = useDragDropReconciliation();
  
  // Auto-suggerimenti per selezioni correnti
  const autoSuggestions = useQuery({
    queryKey: [
      ...RECONCILIATION_QUERY_KEYS.SMART_SUGGESTIONS, 
      'workflow', 
      selectedInvoices.map(i => i.id), 
      selectedTransactions.map(t => t.id)
    ],
    queryFn: async () => {
      if (selectedInvoices.length === 0 && selectedTransactions.length === 0) return null;
      
      // Logica per suggerimenti basati su selezione corrente
      const suggestions = [];
      
      for (const invoice of selectedInvoices) {
        const result = await apiClient.getUltraSmartSuggestions({
          operation_type: 'smart_client',
          invoice_id: invoice.id,
          enable_ai_enhancement: true,
          max_suggestions: 5,
        });
        suggestions.push(...(result.suggestions || []));
      }
      
      for (const transaction of selectedTransactions) {
        const result = await apiClient.getSmartReconciliationSuggestions(
          transaction.id,
          undefined,
          true,
          true,
          true,
          5
        );
        suggestions.push(...(result.suggestions || []));
      }
      
      return suggestions;
    },
    enabled: selectedInvoices.length > 0 || selectedTransactions.length > 0,
    staleTime: 60000,
  });
  
  const applyBestMatches = async (confidenceThreshold = 0.8) => {
    const suggestions = autoSuggestions.data || [];
    const highConfidenceMatches = suggestions.filter(s => s.confidence_score >= confidenceThreshold);
    
    if (highConfidenceMatches.length > 0) {
      const reconciliations = highConfidenceMatches.map(match => ({
        invoice_id: match.invoice_id,
        transaction_id: match.transaction_id,
        amount: match.amount,
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
    autoSuggestions: autoSuggestions.data || [],
    manualReconciliation,
    batchProcessing,
    dragDropReconciliation,
    applyBestMatches,
    clearSelection,
    isProcessing: manualReconciliation.isPending || batchProcessing.isPending,
    hasSelections: selectedInvoices.length > 0 || selectedTransactions.length > 0,
  };
};
