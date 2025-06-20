/**
 * Reconciliation Hooks V4.0 - CORRETTI per usare API reali al 100%
 * Hook per gestione riconciliazione con API backend reali
 * NESSUNA SIMULAZIONE - SOLO API BACKEND REALI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';

// ===== QUERY KEYS =====
export const RECONCILIATION_QUERY_KEYS = {
  RECONCILIATION: ['reconciliation'] as const,
  SUGGESTIONS: ['reconciliation', 'suggestions'] as const,
  SYSTEM_STATUS: ['reconciliation', 'system', 'status'] as const,
  PERFORMANCE: ['reconciliation', 'performance'] as const,
  VERSION: ['reconciliation', 'version'] as const,
  HEALTH: ['reconciliation', 'health'] as const,
  OPPORTUNITIES: ['reconciliation', 'opportunities'] as const,
  CLIENT_RELIABILITY: ['reconciliation', 'client-reliability'] as const,
} as const;

// ===== TYPES =====
interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
  enable_ai_validation?: boolean;
  enable_learning?: boolean;
  user_confidence?: number;
  notes?: string;
  force_match?: boolean;
}

interface BatchReconciliationRequest {
  reconciliation_pairs: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>;
  enable_ai_validation?: boolean;
  enable_parallel_processing?: boolean;
}

interface UltraReconciliationRequest {
  operation_type: 'auto' | '1_to_1' | 'n_to_m' | 'smart_client' | 'ultra_smart';
  max_suggestions?: number;
  confidence_threshold?: number;
  enable_ai_enhancement?: boolean;
  enable_smart_patterns?: boolean;
  enable_predictive_scoring?: boolean;
  invoice_id?: number;
  transaction_id?: number;
  anagraphics_id_filter?: number;
}

// ===== CORE HOOKS =====

/**
 * Hook per reconciliation suggestions con API reali
 */
export const useReconciliationSuggestions = (
  maxSuggestions = 50,
  confidenceThreshold = 0.5
) => {
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.SUGGESTIONS, { maxSuggestions, confidenceThreshold }],
    queryFn: async () => {
      try {
        return await apiClient.getUltraSmartSuggestions({
          operation_type: 'auto',
          max_suggestions: maxSuggestions,
          confidence_threshold: confidenceThreshold,
          enable_ai_enhancement: true,
          enable_smart_patterns: true,
          enable_predictive_scoring: true,
        });
      } catch (error) {
        console.error('Error fetching reconciliation suggestions:', error);
        throw new Error('Errore nel caricamento dei suggerimenti di riconciliazione');
      }
    },
    staleTime: 180000, // 3 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook per manual reconciliation con API reali
 */
export const useManualReconciliation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  
  return useMutation({
    mutationFn: async (request: ManualMatchRequest) => {
      try {
        return await apiClient.applyManualMatchV4(request);
      } catch (error) {
        console.error('Manual reconciliation error:', error);
        throw new Error('Errore durante la riconciliazione manuale');
      }
    },
    onSuccess: (data, variables) => {
      // Invalida cache correlate
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      addNotification({
        type: 'success',
        title: 'Riconciliazione Completata',
        message: data?.ai_validation_passed 
          ? 'Validazione AI superata' 
          : 'Riconciliazione manuale applicata',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Riconciliazione',
        message: error.message || 'Errore durante la riconciliazione',
      });
      toast.error('Errore nella riconciliazione');
    },
  });
};

/**
 * Hook per batch reconciliation con API reali
 */
export const useBatchReconciliationProcessing = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  
  return useMutation({
    mutationFn: async (request: BatchReconciliationRequest) => {
      try {
        return await apiClient.processBatchReconciliationV4(request);
      } catch (error) {
        console.error('Batch reconciliation error:', error);
        throw new Error('Errore durante il batch reconciliation');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      addNotification({
        type: 'success',
        title: 'Batch Reconciliation Completato',
        message: `${data?.processed_count || 0} riconciliazioni elaborate`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Batch Reconciliation',
        message: error.message || 'Errore nel batch reconciliation',
      });
      toast.error('Errore nel batch reconciliation');
    },
  });
};

/**
 * Hook per auto reconciliation con API reali
 */
export const useAutoReconciliation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  
  return useMutation({
    mutationFn: async (options: {
      confidence_threshold?: number;
      max_auto_reconcile?: number;
    }) => {
      try {
        // Prima ottengo le opportunità dal backend
        const opportunities = await apiClient.getAutomaticMatchingOpportunitiesV4(
          'High',
          options.max_auto_reconcile || 50,
          true,
          true,
          true
        );
        
        if (!opportunities?.opportunities || opportunities.opportunities.length === 0) {
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
        
        // Eseguo il batch reconciliation
        return await apiClient.processBatchReconciliationV4({
          reconciliation_pairs: reconciliations,
          enable_ai_validation: true,
          enable_parallel_processing: true,
        });
      } catch (error) {
        console.error('Auto reconciliation error:', error);
        throw new Error('Errore nell\'auto-reconciliation');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_QUERY_KEYS.RECONCILIATION });
      
      addNotification({
        type: 'success',
        title: 'Auto-Reconciliation Completata',
        message: `${data?.processed_count || 0} riconciliazioni automatiche elaborate`,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Auto-Reconciliation',
        message: error.message || 'Errore nell\'auto-reconciliation',
      });
      toast.error('Errore nell\'auto-reconciliation');
    },
  });
};

/**
 * Hook per reconciliation system status con API reali
 */
export const useReconciliationSystemStatus = () => {
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.SYSTEM_STATUS,
    queryFn: async () => {
      try {
        return await apiClient.getReconciliationSystemStatus();
      } catch (error) {
        console.error('System status error:', error);
        // Ritorna un fallback sicuro se il backend non risponde
        return {
          system_healthy: false,
          overall_health: 0,
          api_health: 0,
          ai_health: 0,
          error: error.message,
        };
      }
    },
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    retry: 1, // Retry limitato per status system
  });
};

/**
 * Hook per reconciliation performance metrics con API reali
 */
export const useReconciliationPerformance = () => {
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.PERFORMANCE,
    queryFn: async () => {
      try {
        return await apiClient.getReconciliationPerformanceMetrics();
      } catch (error) {
        console.error('Performance metrics error:', error);
        // Ritorna metriche di fallback
        return {
          success_rate: 0,
          average_confidence: 0,
          ai_accuracy: 0,
          total_reconciliations: 0,
          time_saved_hours: 0,
          error: error.message,
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook per reconciliation health check con API reali
 */
export const useReconciliationHealth = () => {
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.HEALTH,
    queryFn: async () => {
      try {
        return await apiClient.getReconciliationHealth();
      } catch (error) {
        console.error('Reconciliation health error:', error);
        return {
          status: 'unhealthy',
          error: error.message,
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook per automatic matching opportunities con API reali
 */
export const useAutomaticMatchingOpportunities = (options = {}) => {
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
      try {
        return await apiClient.getAutomaticMatchingOpportunitiesV4(
          confidenceLevel as any,
          maxOpportunities,
          enableAI,
          true, // enableRiskAssessment
          true  // prioritizeHighValue
        );
      } catch (error) {
        console.error('Matching opportunities error:', error);
        return {
          opportunities: [],
          total_opportunities: 0,
          error: error.message,
        };
      }
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes auto-refresh
    retry: 2,
  });
};

/**
 * Hook per client reliability analysis con API reali
 */
export const useClientReliability = (anagraphicsId: number) => {
  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.CLIENT_RELIABILITY, anagraphicsId],
    queryFn: async () => {
      try {
        return await apiClient.getClientPaymentReliabilityV4(
          anagraphicsId,
          true, // includePredictions
          true, // includePatternAnalysis
          true  // enhancedInsights
        );
      } catch (error) {
        console.error('Client reliability error:', error);
        return {
          reliability_score: 0,
          payment_history: [],
          predictions: null,
          error: error.message,
        };
      }
    },
    enabled: !!anagraphicsId,
    staleTime: 1800000, // 30 minutes
    retry: 2,
  });
};

/**
 * Hook per reconciliation version info con API reali
 */
export const useReconciliationVersion = () => {
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.VERSION,
    queryFn: async () => {
      try {
        return await apiClient.getReconciliationVersionInfo();
      } catch (error) {
        console.error('Reconciliation version error:', error);
        return {
          version: 'unknown',
          features: [],
          error: error.message,
        };
      }
    },
    staleTime: Infinity, // Dati stabili
    retry: 1,
  });
};

/**
 * Hook per analytics di reconciliation con API reali
 */
export const useReconciliationAnalytics = () => {
  return useQuery({
    queryKey: ['reconciliation', 'analytics'],
    queryFn: async () => {
      try {
        const [performance, systemStatus] = await Promise.all([
          apiClient.getReconciliationPerformanceMetrics(),
          apiClient.getReconciliationSystemStatus(),
        ]);
        
        return {
          ...performance,
          system_status: systemStatus,
          success_rate: performance?.success_rate || 0,
          ml_accuracy: performance?.ai_accuracy || 0,
          total_processed: performance?.total_reconciliations || 0,
          time_saved_hours: performance?.time_saved_hours || 0,
        };
      } catch (error) {
        console.error('Reconciliation analytics error:', error);
        return {
          success_rate: 0,
          ml_accuracy: 0,
          total_processed: 0,
          time_saved_hours: 0,
          system_status: { system_healthy: false },
          error: error.message,
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook per ML model training - placeholder per backend futuro
 */
export const useMLModelTraining = () => {
  const { addNotification } = useUIStore();
  
  return useMutation({
    mutationFn: async (options: {
      training_data_size?: number;
      quantum_optimization?: boolean;
      neural_enhancement?: boolean;
    }) => {
      // Al momento il backend non ha questo endpoint
      // Ritorna una notifica informativa
      addNotification({
        type: 'info',
        title: 'Training ML',
        message: 'Funzionalità di training del modello ML non ancora implementata nel backend',
      });
      
      return {
        training_completed: false,
        message: 'Training ML non ancora disponibile'
      };
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Training ML',
        message: error.message || 'Errore nel training del modello ML',
      });
      toast.error('Errore nel training del modello ML');
    },
  });
};

/**
 * Hook per gestione completa della riconciliazione drag & drop
 */
export const useDragDropReconciliation = () => {
  const manualReconciliation = useManualReconciliation();
  
  // Store state semplificato senza dipendenze esterne
  const [draggedItem, setDraggedItem] = React.useState<any>(null);
  const [dropTarget, setDropTarget] = React.useState<any>(null);
  
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
        enable_ai_validation: true,
        enable_learning: true,
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
 * Hook composito per workflow completo reconciliation
 */
export const useReconciliationWorkflow = () => {
  // State semplificato per selezioni
  const [selectedInvoices, setSelectedInvoices] = React.useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = React.useState<any[]>([]);
  
  const manualReconciliation = useManualReconciliation();
  const batchProcessing = useBatchReconciliationProcessing();
  const dragDropReconciliation = useDragDropReconciliation();
  
  const clearSelection = () => {
    setSelectedInvoices([]);
    setSelectedTransactions([]);
  };
  
  const applyBestMatches = async (confidenceThreshold = 0.8) => {
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
    setSelectedInvoices,
    setSelectedTransactions,
    manualReconciliation,
    batchProcessing,
    dragDropReconciliation,
    applyBestMatches,
    clearSelection,
    isProcessing: manualReconciliation.isPending || batchProcessing.isPending,
    hasSelections: selectedInvoices.length > 0 || selectedTransactions.length > 0,
  };
};

// Import React per useState
import React from 'react';

// Export degli hook principali per compatibilità
export {
  useReconciliationSuggestions as useSuggestions,
  useManualReconciliation as useManualMatch,
  useReconciliationAnalytics as useAnalytics,
  useReconciliationSystemStatus as useStatus,
  useBatchReconciliationProcessing as useBatchReconciliation,
};

// Export default per facilità di utilizzo
export default {
  useReconciliationSuggestions,
  useManualReconciliation,
  useBatchReconciliationProcessing,
  useAutoReconciliation,
  useReconciliationSystemStatus,
  useReconciliationPerformance,
  useReconciliationHealth,
  useReconciliationAnalytics,
  useMLModelTraining,
  useDragDropReconciliation,
  useReconciliationWorkflow,
  useAutomaticMatchingOpportunities,
  useClientReliability,
  useReconciliationVersion,
};
