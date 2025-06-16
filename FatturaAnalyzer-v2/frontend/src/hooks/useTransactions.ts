/**
 * Transactions Hooks V4.0 - CORRETTI EXPORTS
 * Hook per gestione transazioni con features enhanced e AI
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { BankTransaction, TransactionFilters } from '@/types';
import { 
  useDataStore,
  useUIStore,
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled 
} from '@/store';
import { useSmartCache, useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const TRANSACTIONS_QUERY_KEYS = {
  TRANSACTIONS: ['transactions'] as const,
  TRANSACTION: ['transaction'] as const,
  INSIGHTS: ['transactions', 'insights'] as const,
  SEARCH: ['search', 'transactions'] as const,
  STATS: ['stats', 'transactions'] as const,
  CASH_FLOW: ['transactions', 'cash-flow'] as const,
  BATCH_STATUS: ['transactions', 'batch', 'status'] as const,
  SMART_SUGGESTIONS: ['transactions', 'smart-suggestions'] as const,
} as const;

/**
 * Hook per transazioni con features V4.0 enhanced
 */
export const useTransactions = (filters: TransactionFilters = {}) => {
  const setTransactions = useDataStore(state => state.setTransactions);
  const transactionsCache = useDataStore(state => state.transactions);
  const aiEnabled = useAIFeaturesEnabled();
  const { shouldRefetch } = useSmartCache();
  const { handleError } = useSmartErrorHandling();
  
  // Abilita features V4.0 basate su impostazioni
  const enhancedFilters = {
    ...filters,
    enhanced: true,
    enable_ai_insights: aiEnabled,
    cache_enabled: true,
  };
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.TRANSACTIONS, enhancedFilters],
    queryFn: async () => {
      const result = await apiClient.getTransactions(enhancedFilters);
      setTransactions(result.items || [], result.total || 0, result.enhanced_data);
      return result;
    },
    staleTime: 180000, // 3 minutes (più frequente per transazioni)
    enabled: shouldRefetch(transactionsCache.lastFetch, 'transactions'),
    onError: (error) => handleError(error, 'transactions'),
  });
};

/**
 * Hook per singola transazione con enhanced details
 */
export const useTransaction = (
  id: number, 
  options: {
    enhanced?: boolean;
    includeSuggestions?: boolean;
    includeSimilar?: boolean;
  } = {}
) => {
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    enhanced = true,
    includeSuggestions = aiEnabled,
    includeSimilar = false
  } = options;
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.TRANSACTION, id, { enhanced, includeSuggestions, includeSimilar }],
    queryFn: () => apiClient.getTransactionById(id, enhanced, includeSuggestions, includeSimilar),
    enabled: !!id,
    staleTime: 300000,
    onError: (error) => handleError(error, 'transaction-detail'),
  });
};

/**
 * Hook per smart suggestions V4.0 con AI
 */
export const useSmartReconciliationSuggestions = (
  transactionId: number,
  options: {
    anagraphicsHint?: number;
    enableAI?: boolean;
    maxSuggestions?: number;
  } = {}
) => {
  const setSmartSuggestionsCache = useDataStore(state => state.setSmartSuggestionsCache);
  const smartEnabled = useSmartReconciliationEnabled();
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    anagraphicsHint,
    enableAI = aiEnabled,
    maxSuggestions = 10,
  } = options;
  
  return useQuery({
    queryKey: [
      ...TRANSACTIONS_QUERY_KEYS.SMART_SUGGESTIONS, 
      transactionId, 
      { anagraphicsHint, enableAI, maxSuggestions }
    ],
    queryFn: async () => {
      const suggestions = await apiClient.getSmartReconciliationSuggestions(
        transactionId,
        anagraphicsHint,
        enableAI,
        true, // enableSmartPatterns
        true, // enablePredictive
        maxSuggestions,
        0.6 // confidenceThreshold
      );
      
      // Cache suggestions localmente
      setSmartSuggestionsCache(transactionId, suggestions.suggestions || []);
      
      return suggestions;
    },
    enabled: !!transactionId && smartEnabled,
    staleTime: 120000, // 2 minutes
    onError: (error) => handleError(error, 'smart-suggestions'),
  });
};

/**
 * Hook per transaction insights V4.0 con AI analysis
 */
export const useTransactionInsights = (transactionId: number) => {
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.INSIGHTS, transactionId],
    queryFn: () => apiClient.getTransactionInsights(
      transactionId,
      aiEnabled, // includeAIAnalysis
      true, // includePatternMatching
      true, // includeClientAnalysis
      false // includeSmartSuggestions (caricato separatamente)
    ),
    enabled: !!transactionId && aiEnabled,
    staleTime: 300000,
    onError: (error) => handleError(error, 'transaction-insights'),
  });
};

/**
 * Hook per cash flow analysis
 */
export const useCashFlowAnalysis = (months = 12) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.CASH_FLOW, months],
    queryFn: () => apiClient.getCashFlowAnalysis(months),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'cash-flow-analysis'),
  });
};

/**
 * Hook per transaction health e metrics V4.0
 */
export const useTransactionHealth = () => {
  const { handleError } = useSmartErrorHandling();
  
  const healthQuery = useQuery({
    queryKey: ['transactions', 'health'],
    queryFn: () => apiClient.getTransactionHealthV4(),
    staleTime: 300000,
    onError: (error) => handleError(error, 'transaction-health'),
  });
  
  const metricsQuery = useQuery({
    queryKey: ['transactions', 'metrics'],
    queryFn: () => apiClient.getTransactionMetricsV4(),
    staleTime: 300000,
    onError: (error) => handleError(error, 'transaction-metrics'),
  });
  
  return {
    health: healthQuery,
    metrics: metricsQuery,
    isLoading: healthQuery.isLoading || metricsQuery.isLoading,
  };
};

/**
 * Hook per infinite query transazioni
 */
export const useInfiniteTransactions = (filters: TransactionFilters = {}) => {
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  return useInfiniteQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.TRANSACTIONS, 'infinite', filters, { ai: aiEnabled }],
    queryFn: ({ pageParam = 1 }) => apiClient.getTransactions({ 
      ...filters, 
      page: pageParam, 
      size: 20,
      enhanced: true,
      enable_ai_insights: aiEnabled,
    }),
    getNextPageParam: (lastPage, allPages) => {
      const hasNextPage = (lastPage.total || 0) > allPages.length * 20;
      return hasNextPage ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 180000,
    onError: (error) => handleError(error, 'infinite-transactions'),
  });
};

/**
 * Hook per CRUD transazioni
 */
export const useTransactionMutation = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const createMutation = useMutation({
    mutationFn: (data: Partial<BankTransaction>) => apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      toast.success('Transazione creata');
    },
    onError: (error) => {
      handleError(error, 'create-transaction');
      toast.error('Errore nella creazione');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BankTransaction> }) => 
      apiClient.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      toast.success('Transazione aggiornata');
    },
    onError: (error) => {
      handleError(error, 'update-transaction');
      toast.error('Errore nell\'aggiornamento');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteTransaction(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      toast.success('Transazione eliminata');
    },
    onError: (error) => {
      handleError(error, 'delete-transaction');
      toast.error('Errore nell\'eliminazione');
    },
  });
  
  const reconcileWithInvoiceMutation = useMutation({
    mutationFn: ({
      transactionId,
      invoiceId,
      amountToMatch,
      enableAIValidation = true,
      enableLearning = true,
      userConfidence,
      userNotes,
      forceMatch = false
    }: {
      transactionId: number;
      invoiceId: number;
      amountToMatch: number;
      enableAIValidation?: boolean;
      enableLearning?: boolean;
      userConfidence?: number;
      userNotes?: string;
      forceMatch?: boolean;
    }) => apiClient.reconcileTransactionWithInvoice(
      transactionId,
      invoiceId,
      amountToMatch,
      enableAIValidation,
      enableLearning,
      userConfidence,
      userNotes,
      forceMatch
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      
      addNotification({
        type: 'success',
        title: 'Riconciliazione Completata',
        message: 'Transazione riconciliata con successo',
      });
    },
    onError: (error) => {
      handleError(error, 'reconcile-transaction');
      toast.error('Errore nella riconciliazione');
    },
  });
  
  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    reconcileWithInvoice: reconcileWithInvoiceMutation,
  };
};

/**
 * Hook per operazioni batch su transazioni
 */
export const useTransactionBatchOperations = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const batchReconcile = useMutation({
    mutationFn: (reconciliations: Array<{
      invoice_id: number;
      transaction_id: number;
      amount: number;
    }>) => apiClient.batchReconcileTransactions({
      reconciliation_pairs: reconciliations,
      enable_ai_validation: true,
      enable_parallel_processing: true,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      
      addNotification({
        type: 'success',
        title: 'Riconciliazione Batch Completata',
        message: `${data.processed_count || 0} riconciliazioni elaborate`,
      });
    },
    onError: (error) => {
      handleError(error, 'batch-reconcile');
      toast.error('Errore nella riconciliazione batch');
    },
  });
  
  const batchUpdateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      apiClient.batchUpdateTransactionStatus(ids, status, true, false, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      toast.success('Status aggiornato per transazioni selezionate');
    },
    onError: (error) => {
      handleError(error, 'batch-update-status');
      toast.error('Errore nell\'aggiornamento batch');
    },
  });
  
  const getBatchTaskStatus = (taskId: string) => {
    return useQuery({
      queryKey: [...TRANSACTIONS_QUERY_KEYS.BATCH_STATUS, taskId],
      queryFn: () => apiClient.getBatchTaskStatus(taskId),
      enabled: !!taskId,
      refetchInterval: 2000, // Ogni 2 secondi
      onError: (error) => handleError(error, 'batch-task-status'),
    });
  };
  
  return {
    batchReconcile,
    batchUpdateStatus,
    getBatchTaskStatus,
  };
};

/**
 * 🔥 HOOK MANCANTE: Operazioni bulk per transazioni
 */
export const useBulkTransactionOperations = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      apiClient.batchUpdateTransactionStatus(ids, status, true, false, true),
    onSuccess: (data, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      addNotification({
        type: 'success',
        title: 'Aggiornamento Completato',
        message: `${ids.length} transazioni aggiornate a "${status}"`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-update-status');
      toast.error('Errore nell\'aggiornamento bulk');
    },
  });
  
  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => {
      return Promise.all(
        ids.map(id => apiClient.deleteTransaction(id, true))
      );
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      addNotification({
        type: 'success',
        title: 'Eliminazione Completata',
        message: `${ids.length} transazioni eliminate`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-delete');
      toast.error('Errore nell\'eliminazione bulk');
    },
  });
  
  const bulkReconcile = useMutation({
    mutationFn: (reconciliations: Array<{
      invoice_id: number;
      transaction_id: number;
      amount: number;
    }>) => apiClient.batchReconcileTransactions({
      reconciliation_pairs: reconciliations,
      enable_ai_validation: true,
      enable_parallel_processing: true,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      
      addNotification({
        type: 'success',
        title: 'Riconciliazione Bulk Completata',
        message: `${data.processed_count || 0} riconciliazioni elaborate`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-reconcile');
      toast.error('Errore nella riconciliazione bulk');
    },
  });
  
  return {
    bulkUpdateStatus,
    bulkDelete,
    bulkReconcile,
    isProcessing: bulkUpdateStatus.isPending || bulkDelete.isPending || bulkReconcile.isPending,
  };
};

/**
 * 🔥 HOOK MANCANTE: Delete singolo per transazioni (alias per backward compatibility)
 */
export const useDeleteTransaction = () => {
  const { delete: deleteMutation } = useTransactionMutation();
  return deleteMutation;
};

/**
 * Hook per ricerca transazioni enhanced
 */
export const useTransactionsSearch = (
  query: string,
  options: {
    limit?: number;
    includeReconciled?: boolean;
    searchMode?: 'smart' | 'exact' | 'fuzzy' | 'ai_enhanced';
    enhancedResults?: boolean;
    enableClientMatching?: boolean;
  } = {}
) => {
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    limit = 20,
    includeReconciled = false,
    searchMode = 'smart',
    enhancedResults = aiEnabled,
    enableClientMatching = aiEnabled
  } = options;
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.SEARCH, query, options],
    queryFn: () => apiClient.searchTransactions(
      query,
      limit,
      includeReconciled,
      searchMode,
      enhancedResults,
      enableClientMatching
    ),
    enabled: query.length >= 2,
    staleTime: 300000,
    onError: (error) => handleError(error, 'search-transactions'),
  });
};

/**
 * Hook per statistiche transazioni V4.0
 */
export const useTransactionStats = (options: {
  useCache?: boolean;
  includeTrends?: boolean;
  includeAIInsights?: boolean;
  periodMonths?: number;
} = {}) => {
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    useCache = true,
    includeTrends = false,
    includeAIInsights = aiEnabled,
    periodMonths = 12
  } = options;
  
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEYS.STATS, options],
    queryFn: () => apiClient.getTransactionStatsV4(
      useCache,
      includeTrends,
      includeAIInsights,
      periodMonths
    ),
    staleTime: 300000,
    onError: (error) => handleError(error, 'transaction-stats'),
  });
};

/**
 * Hook per export transazioni avanzato
 */
export const useTransactionsExport = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: async (options: {
      format: 'excel' | 'csv' | 'json';
      filters?: TransactionFilters;
      include_reconciliation?: boolean;
    }) => {
      const result = await apiClient.exportTransactions(
        options.format,
        options.filters?.status_filter,
        options.filters?.start_date,
        options.filters?.end_date,
        options.include_reconciliation || false
      );
      
      if (options.format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `transazioni_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transazioni_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Export transazioni completato');
    },
    onError: (error) => {
      handleError(error, 'export-transactions');
      toast.error('Errore nell\'export transazioni');
    },
  });
};

// ===== ADDITIONAL EXPORTS & ALIASES =====

/**
 * Export per backward compatibility
 */
export { useTransactionBatchOperations as useBatchTransactionOperations };

/**
 * Hook alias per legacy code
 */
export const useTransactionsList = useTransactions;
export const useTransactionDetails = useTransaction;
export const useTransactionOperations = useTransactionMutation;

/**
 * Utility exports
 */
export { TRANSACTIONS_QUERY_KEYS };

/**
 * Default hook exports per facilità di utilizzo
 */
export default useTransactions;
