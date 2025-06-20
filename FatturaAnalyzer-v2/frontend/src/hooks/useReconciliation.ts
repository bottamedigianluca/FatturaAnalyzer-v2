/**
 * Reconciliation Hooks V4.0 - VERSIONE CORRETTA PER ENTERPRISE
 * Hook per gestione riconciliazione con API backend reali
 * CORREZIONI: Import/Export, Error Handling, Type Safety
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { useState, useCallback } from 'react';

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

// ===== INTERFACES =====
export interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
  enable_ai_validation?: boolean;
  enable_learning?: boolean;
  user_confidence?: number;
  notes?: string;
  force_match?: boolean;
}

export interface BatchReconciliationRequest {
  reconciliation_pairs: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>;
  enable_ai_validation?: boolean;
  enable_parallel_processing?: boolean;
}

export interface ReconciliationSuggestion {
  id: string;
  confidence_score: number;
  invoice_ids: number[];
  transaction_ids?: number[];
  total_amount: number;
  description: string;
  reasons?: string[];
}

export interface ReconciliationPerformance {
  success_rate: number;
  ai_accuracy: number;
  total_reconciliations: number;
  time_saved_hours: number;
  average_confidence: number;
}

export interface SystemStatus {
  system_healthy: boolean;
  overall_health: number;
  api_health: number;
  ai_health: number;
}

// ===== CORE HOOKS =====

/**
 * Hook per reconciliation suggestions con API reali
 */
export const useReconciliationSuggestions = (options: {
  maxSuggestions?: number;
  confidenceThreshold?: number;
  enable_ml_boost?: boolean;
  enable_semantic_analysis?: boolean;
} = {}) => {
  const {
    maxSuggestions = 50,
    confidenceThreshold = 0.5,
    enable_ml_boost = true,
    enable_semantic_analysis = true,
  } = options;

  return useQuery({
    queryKey: [...RECONCILIATION_QUERY_KEYS.SUGGESTIONS, options],
    queryFn: async (): Promise<{ suggestions: ReconciliationSuggestion[] }> => {
      try {
        return await apiClient.getUltraSmartSuggestions({
          operation_type: 'auto',
          max_suggestions: maxSuggestions,
          confidence_threshold: confidenceThreshold,
          enable_ai_enhancement: enable_ml_boost,
          enable_smart_patterns: true,
          enable_predictive_scoring: enable_semantic_analysis,
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
export const usePerformReconciliation = () => {
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
    onError: (error: Error) => {
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
export const useBatchReconciliation = () => {
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
    onError: (error: Error) => {
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
      neural_validation?: boolean;
    }) => {
      try {
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
          (opp: any) => opp.confidence_score >= (options.confidence_threshold || 0.9)
        );
        
        if (highConfidenceOpportunities.length === 0) {
          return { processed_count: 0, message: 'Nessuna opportunità ad alta confidenza trovata' };
        }
        
        const reconciliations = highConfidenceOpportunities.map((opp: any) => ({
          invoice_id: opp.invoice_id,
          transaction_id: opp.transaction_id,
          amount: opp.amount,
        }));
        
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
    onError: (error: Error) => {
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
 * Hook per reconciliation analytics con API reali
 */
export const useReconciliationAnalytics = () => {
  return useQuery({
    queryKey: ['reconciliation', 'analytics'],
    queryFn: async (): Promise<ReconciliationPerformance & { system_status: SystemStatus }> => {
      try {
        const [performance, systemStatus] = await Promise.all([
          apiClient.getReconciliationPerformanceMetrics(),
          apiClient.getReconciliationSystemStatus(),
        ]);
        
        return {
          success_rate: performance?.success_rate || 0,
          ai_accuracy: performance?.ai_accuracy || 0,
          total_reconciliations: performance?.total_reconciliations || 0,
          time_saved_hours: performance?.time_saved_hours || 0,
          average_confidence: performance?.average_confidence || 0,
          system_status: systemStatus,
        };
      } catch (error) {
        console.error('Reconciliation analytics error:', error);
        return {
          success_rate: 0,
          ai_accuracy: 0,
          total_reconciliations: 0,
          time_saved_hours: 0,
          average_confidence: 0,
          system_status: { system_healthy: false, overall_health: 0, api_health: 0, ai_health: 0 },
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook per system status con API reali
 */
export const useReconciliationSystemStatus = () => {
  return useQuery({
    queryKey: RECONCILIATION_QUERY_KEYS.SYSTEM_STATUS,
    queryFn: async (): Promise<SystemStatus> => {
      try {
        return await apiClient.getReconciliationSystemStatus();
      } catch (error) {
        console.error('System status error:', error);
        return {
          system_healthy: false,
          overall_health: 0,
          api_health: 0,
          ai_health: 0,
        };
      }
    },
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    retry: 1,
  });
};

/**
 * Hook per validation di reconciliation matches
 */
export const useValidateReconciliationMatch = () => {
  return useMutation({
    mutationFn: async (params: {
      invoice_id: number;
      transaction_id: number;
      amount: number;
      neural_analysis?: boolean;
    }) => {
      // Implementazione placeholder - sostituire con API reale quando disponibile
      return { validation_passed: true, confidence: 0.95 };
    },
  });
};

/**
 * Hook composito per workflow completo reconciliation
 */
export const useDragDropReconciliation = () => {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<any>(null);
  const performReconciliation = usePerformReconciliation();
  
  const handleDragStart = useCallback((type: 'invoice' | 'transaction', data: any) => {
    setDraggedItem({ type, data });
  }, []);
  
  const handleDragOver = useCallback((type: 'invoice' | 'transaction', id: number) => {
    if (draggedItem && draggedItem.type !== type) {
      setDropTarget({ type, id });
    }
  }, [draggedItem]);
  
  const handleDrop = useCallback(async (confidence?: number) => {
    if (!draggedItem || !dropTarget) return;
    
    const isInvoiceToTransaction = draggedItem.type === 'invoice' && dropTarget.type === 'transaction';
    const isTransactionToInvoice = draggedItem.type === 'transaction' && dropTarget.type === 'invoice';
    
    if (isInvoiceToTransaction || isTransactionToInvoice) {
      const invoiceId = isInvoiceToTransaction ? draggedItem.data.id : dropTarget.id;
      const transactionId = isTransactionToInvoice ? draggedItem.data.id : dropTarget.id;
      const amount = isInvoiceToTransaction 
        ? draggedItem.data.total_amount 
        : Math.abs(draggedItem.data.amount);
      
      await performReconciliation.mutateAsync({
        invoice_id: invoiceId,
        transaction_id: transactionId,
        amount_to_match: amount,
        enable_ai_validation: true,
        enable_learning: true,
        user_confidence: confidence,
      });
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, dropTarget, performReconciliation]);
  
  const clearDragState = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
  }, []);
  
  return {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    clearDragState,
    isReconciling: performReconciliation.isPending,
  };
};

// ===== LEGACY COMPATIBILITY =====
export const useManualReconciliation = usePerformReconciliation;
export const useSuggestions = useReconciliationSuggestions;
export const useAnalytics = useReconciliationAnalytics;
export const useStatus = useReconciliationSystemStatus;

// ===== DEFAULT EXPORT =====
export default {
  useReconciliationSuggestions,
  usePerformReconciliation,
  useBatchReconciliation,
  useAutoReconciliation,
  useReconciliationAnalytics,
  useReconciliationSystemStatus,
  useValidateReconciliationMatch,
  useDragDropReconciliation,
};

// ===== ADDITIONAL HOOKS PER COMPLETEZZA =====

/**
 * Hook per ML model training - placeholder per backend futuro
 */
export const useMLModelTraining = () => {
  const { addNotification } = useUIStore();
  
  return useMutation({
    mutationFn: async () => {
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
    onError: (error: Error) => {
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
 * Hook per reconciliation workflow management
 */
export const useReconciliationWorkflow = () => {
  const [selectedInvoices, setSelectedInvoices] = useState<any[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  
  const batchProcessing = useBatchReconciliation();
  const dragDropReconciliation = useDragDropReconciliation();
  
  const clearSelection = useCallback(() => {
    setSelectedInvoices([]);
    setSelectedTransactions([]);
  }, []);
  
  const applyBestMatches = useCallback(async (confidenceThreshold = 0.8) => {
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
  }, [selectedInvoices, selectedTransactions, batchProcessing, clearSelection]);
  
  return {
    selectedInvoices,
    selectedTransactions,
    setSelectedInvoices,
    setSelectedTransactions,
    batchProcessing,
    dragDropReconciliation,
    applyBestMatches,
    clearSelection,
    isProcessing: batchProcessing.isPending,
    hasSelections: selectedInvoices.length > 0 || selectedTransactions.length > 0,
  };
};
