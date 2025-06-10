/**
 * System & Health Hooks V4.0
 * Hook per monitoraggio sistema, first run e health checks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { 
  useUIStore, 
  useDataStore,
  useAIFeaturesEnabled 
} from '@/store';
import { useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const SYSTEM_QUERY_KEYS = {
  HEALTH: ['health'] as const,
  SYSTEM_STATUS: ['system', 'status'] as const,
  FIRST_RUN: ['first-run'] as const,
  PERFORMANCE: ['performance'] as const,
} as const;

/**
 * Hook per monitoraggio salute sistema con metriche avanzate
 */
export const useSystemHealth = () => {
  const updateSystemStatus = useUIStore(state => state.updateSystemStatus);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: SYSTEM_QUERY_KEYS.HEALTH,
    queryFn: async () => {
      const health = await apiClient.healthCheck();
      updateSystemStatus({
        backend_version: health.version,
        last_health_check: new Date().toISOString(),
      });
      return health;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    onError: (error) => handleError(error, 'system-health'),
  });
};

/**
 * Hook per First Run Wizard con stato persistente
 */
export const useFirstRun = () => {
  const firstRunState = useUIStore(state => state.firstRunState);
  const updateFirstRunState = useUIStore(state => state.updateFirstRunState);
  const { handleError } = useSmartErrorHandling();
  
  const checkFirstRun = useQuery({
    queryKey: SYSTEM_QUERY_KEYS.FIRST_RUN,
    queryFn: async () => {
      const result = await apiClient.checkFirstRun();
      updateFirstRunState({
        is_first_run: result.is_first_run,
        setup_completed: result.setup_completed,
      });
      return result;
    },
    staleTime: Infinity, // Cache until manually invalidated
    onError: (error) => handleError(error, 'first-run'),
  });
  
  const setupWizard = useMutation({
    mutationFn: async (step: string) => {
      switch (step) {
        case 'start':
          return apiClient.startSetupWizard();
        case 'database':
          return apiClient.setupDatabase();
        case 'complete':
          return apiClient.completeSetupWizard();
        case 'skip':
          return apiClient.skipWizard();
        default:
          throw new Error('Invalid wizard step');
      }
    },
    onSuccess: (data, step) => {
      if (step === 'complete') {
        updateFirstRunState({ setup_completed: true, is_first_run: false });
      }
      checkFirstRun.refetch();
    },
    onError: (error) => handleError(error, 'setup-wizard'),
  });
  
  return {
    ...checkFirstRun,
    firstRunState,
    setupWizard,
    isFirstRun: firstRunState.is_first_run,
    isSetupCompleted: firstRunState.setup_completed,
  };
};

/**
 * Hook per monitoraggio performance sistema in tempo reale
 */
export const usePerformanceMonitoring = () => {
  const updatePerformanceMetrics = useDataStore(state => state.updatePerformanceMetrics);
  const updateReconciliationPerformance = useReconciliationStore(state => state.updatePerformanceMetrics);
  const { handleError } = useSmartErrorHandling();
  
  // Metriche generali sistema
  const systemMetrics = useQuery({
    queryKey: [...SYSTEM_QUERY_KEYS.PERFORMANCE, 'metrics'],
    queryFn: async () => {
      const [transactionMetrics, reconciliationMetrics] = await Promise.all([
        apiClient.getTransactionMetricsV4(),
        apiClient.getReconciliationPerformanceMetrics(),
      ]);
      
      updatePerformanceMetrics({
        api_response_times: transactionMetrics.api_response_times,
        cache_hit_rates: transactionMetrics.cache_hit_rates,
      });
      
      updateReconciliationPerformance({
        success_rate: reconciliationMetrics.success_rate,
        average_confidence: reconciliationMetrics.average_confidence,
        ai_accuracy: reconciliationMetrics.ai_accuracy,
      });
      
      return {
        transactions: transactionMetrics,
        reconciliation: reconciliationMetrics,
      };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
    onError: (error) => handleError(error, 'performance-monitoring'),
  });
  
  // Health checks di tutti i sistemi
  const systemHealth = useQuery({
    queryKey: [...SYSTEM_QUERY_KEYS.HEALTH, 'comprehensive'],
    queryFn: async () => {
      const [
        analyticsHealth,
        reconciliationHealth,
        transactionHealth,
        importExportHealth,
        syncHealth
      ] = await Promise.all([
        apiClient.getUltraSystemHealth(),
        apiClient.getReconciliationHealth(),
        apiClient.getTransactionHealthV4(),
        apiClient.getImportExportHealth(),
        apiClient.getSyncHealth(),
      ]);
      
      return {
        analytics: analyticsHealth,
        reconciliation: reconciliationHealth,
        transactions: transactionHealth,
        importExport: importExportHealth,
        sync: syncHealth,
        overall_status: 'healthy', // Calcola basato sui risultati
      };
    },
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    onError: (error) => handleError(error, 'system-health'),
  });
  
  return {
    systemMetrics,
    systemHealth,
    isMonitoring: systemMetrics.isLoading || systemHealth.isLoading,
  };
};

/**
 * Hook per statistiche avanzate sistema
 */
export const useSystemStatistics = () => {
  const updatePerformanceMetrics = useDataStore(state => state.updatePerformanceMetrics);
  const updateReconciliationPerformance = useReconciliationStore(state => state.updatePerformanceMetrics);
  const { handleError } = useSmartErrorHandling();
  
  const invoicesStats = useQuery({
    queryKey: ['stats', 'invoices'],
    queryFn: () => apiClient.getInvoicesStats(),
    staleTime: 300000,
    onError: (error) => handleError(error, 'invoices-stats'),
  });
  
  const transactionsStats = useQuery({
    queryKey: ['stats', 'transactions'],
    queryFn: async () => {
      const stats = await apiClient.getTransactionStatsV4(true, true, true, 12);
      updatePerformanceMetrics({
        api_response_times: stats.performance_metrics?.api_response_times,
      });
      return stats;
    },
    staleTime: 300000,
    onError: (error) => handleError(error, 'transactions-stats'),
  });
  
  const anagraphicsStats = useQuery({
    queryKey: ['stats', 'anagraphics'],
    queryFn: () => apiClient.getAnagraphicsStats(),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'anagraphics-stats'),
  });
  
  const reconciliationPerformance = useQuery({
    queryKey: ['stats', 'reconciliation'],
    queryFn: () => apiClient.getReconciliationPerformanceMetrics(),
    staleTime: 300000,
    onError: (error) => handleError(error, 'reconciliation-performance'),
  });
  
  return {
    invoicesStats,
    transactionsStats,
    anagraphicsStats,
    reconciliationPerformance,
    isLoading: invoicesStats.isLoading || transactionsStats.isLoading || 
               anagraphicsStats.isLoading || reconciliationPerformance.isLoading,
  };
};
