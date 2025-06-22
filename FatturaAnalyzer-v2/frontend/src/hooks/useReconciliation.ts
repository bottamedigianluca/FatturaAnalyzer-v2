import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { useState, useCallback } from 'react';

export const RECONCILIATION_QUERY_KEYS = {
  RECONCILIATION: ['reconciliation'] as const,
  SUGGESTIONS: ['reconciliation', 'suggestions'] as const,
  SYSTEM_STATUS: ['reconciliation', 'system', 'status'] as const,
  PERFORMANCE: ['reconciliation', 'performance'] as const,
  VERSION: ['reconciliation', 'version'] as const,
  HEALTH: ['reconciliation', 'health'] as const,
  OPPORTUNITIES: ['reconciliation', 'opportunities'] as const,
  CLIENT_RELIABILITY: ['reconciliation', 'client-reliability'] as const,
};

export interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
  enable_ai_validation?: boolean;
  enable_learning?: boolean;
  force_match?: boolean;
  user_confidence?: number;
  notes?: string;
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
    staleTime: 180000, 
    retry: 2,
    retryDelay: 1000,
  });
};

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
        if (!opportunities?.data?.opportunities || opportunities.data.opportunities.length === 0) {
          return { processed_count: 0, message: 'Nessuna opportunità di auto-reconciliation trovata' };
        }
        const highConfidenceOpportunities = opportunities.data.opportunities.filter(
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

export const useReconciliationAnalytics = () => {
    return useQuery({
      queryKey: ['reconciliation', 'analytics'],
      queryFn: async (): Promise<ReconciliationPerformance & { system_status: SystemStatus }> => {
        try {
          // CORREZIONE: Chiamo i due endpoint reali e combino i risultati
          const [performanceRes, systemStatus] = await Promise.all([
            apiClient.getReconciliationPerformanceMetrics(),
            apiClient.getReconciliationSystemStatus(),
          ]);
          
          const performance = performanceRes?.data || {};

          return {
            success_rate: performance.success_rate || 0,
            ai_accuracy: performance.ai_accuracy || 0,
            total_reconciliations: performance.total_reconciliations || 0,
            time_saved_hours: performance.time_saved_hours || 0,
            average_confidence: performance.average_confidence || 0,
            system_status: systemStatus || { system_healthy: false, overall_health: 0, api_health: 0, ai_health: 0 },
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
      staleTime: 300000, 
      retry: 2,
    });
};

export const useReconciliationSystemStatus = () => {
    return useQuery({
      queryKey: RECONCILIATION_QUERY_KEYS.SYSTEM_STATUS,
      queryFn: async (): Promise<SystemStatus> => {
        try {
          const response = await apiClient.getReconciliationSystemStatus();
          return response;
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
      staleTime: 120000, 
      refetchInterval: 300000, 
      retry: 1,
    });
};


export const useValidateReconciliationMatch = () => {
  return useMutation({
    mutationFn: async (params: {
      invoice_id: number;
      transaction_id: number;
      amount: number;
      neural_analysis?: boolean;
    }) => {
      // Questa è una chiamata simulata dato che l'endpoint non sembra esistere, ma è presente negli hook
      console.warn("Hook 'useValidateReconciliationMatch' sta usando una chiamata simulata.");
      return Promise.resolve({ data: { validation_passed: true, confidence: 0.95 } });
    },
  });
};

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
      const amount = Math.min(
        Math.abs(draggedItem.data.total_amount || draggedItem.data.amount),
        Math.abs(dropTarget.data.total_amount || dropTarget.data.amount)
      );

      await performReconciliation.mutateAsync({
        invoice_id: invoiceId,
        transaction_id: transactionId,
        amount_to_match: amount,
        user_confidence: confidence || 0.95, // Se l'utente fa drag&drop, la confidenza è alta
        enable_learning: true,
      });
    }
    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, dropTarget, performReconciliation]);

  return {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
};

export const useUndoReconciliation = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useUIStore();
    return useMutation({
        mutationFn: async (request: { link_id: number, learn_from_undo?: boolean }) => {
            const response = await apiClient.undoReconciliation(request.link_id, request.learn_from_undo);
            if (!response.success) {
                throw new Error(response.message || 'Errore durante l\'annullamento');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
            addNotification({
                type: 'info',
                title: 'Riconciliazione Annullata',
                message: 'Il collegamento è stato rimosso',
            });
        },
        onError: (error: Error) => {
            addNotification({
                type: 'error',
                title: 'Errore Annullamento',
                message: error.message,
            });
        },
    });
};

export const useMLModelTraining = () => {
    const { addNotification } = useUIStore();
    return useMutation({
      mutationFn: async (params: { training_data_size: number, quantum_optimization: boolean, neural_enhancement: boolean }) => {
        const response = await apiClient.triggerMLModelTraining(params.training_data_size, params.quantum_optimization, params.neural_enhancement);
        if (!response.success) {
          throw new Error(response.message || 'Errore training modello');
        }
        return response.data;
      },
      onSuccess: (data) => {
        addNotification({
          type: 'success',
          title: 'Training Modello AI Completato',
          message: data.message || `Accuratezza migliorata a ${data.new_accuracy_score.toFixed(2)}%`,
        });
      },
      onError: (error: Error) => {
        addNotification({
          type: 'error',
          title: 'Errore Training AI',
          message: error.message,
        });
      },
    });
};
