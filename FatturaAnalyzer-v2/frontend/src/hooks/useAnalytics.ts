/**
 * Analytics & Dashboard Hooks V4.0
 * Hook per dashboard, analytics V3.0 e AI insights
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { AnalyticsRequest } from '@/types';
import { 
  useDataStore,
  useUIStore 
} from '@/store';
import { useSmartCache, useSmartErrorHandling } from './useUtils';
import { useState } from 'react';

// ✅ FIX: Hook per AI features (semplificato)
const useAIFeaturesEnabled = () => {
  // Restituisce sempre true per ora, può essere configurato tramite store in futuro
  return true;
};

// ===== QUERY KEYS =====
const ANALYTICS_QUERY_KEYS = {
  ANALYTICS: ['analytics'] as const,
  EXECUTIVE_DASHBOARD: ['analytics', 'executive'] as const,
  OPERATIONS_DASHBOARD: ['analytics', 'operations'] as const,
  AI_INSIGHTS: ['analytics', 'ai-insights'] as const,
  ULTRA_PREDICTIONS: ['analytics', 'predictions'] as const,
  REAL_TIME_METRICS: ['analytics', 'realtime'] as const,
} as const;

/**
 * Hook per Executive Dashboard Ultra con AI insights
 */
const useExecutiveDashboard = () => {
  const setDashboardData = useDataStore(state => state.setDashboardData);
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3 || (() => {}));
  const aiEnabled = useAIFeaturesEnabled();
  const { getCacheTTL } = useSmartCache();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.EXECUTIVE_DASHBOARD, { ai: aiEnabled }],
    queryFn: async () => {
      const dashboard = await apiClient.getExecutiveDashboardUltra(
        true, // includePredictions
        aiEnabled, // includeAIInsights
        true, // cacheEnabled
        false // realTime
      );
      
      setDashboardData(dashboard);
      updateAnalyticsV3({ executive_dashboard: dashboard });
      
      return dashboard;
    },
    staleTime: getCacheTTL('dashboard'),
    refetchInterval: aiEnabled ? 300000 : 600000, // 5 o 10 min
    onError: (error) => handleError(error, 'executive-dashboard'),
  });
};

/**
 * Hook per Operations Dashboard Live con metriche real-time
 */
const useOperationsDashboard = () => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3 || (() => {}));
  const realTimeEnabled = useUIStore(state => state.settings?.real_time_updates || false);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.OPERATIONS_DASHBOARD, { realTime: realTimeEnabled }],
    queryFn: async () => {
      const dashboard = await apiClient.getOperationsDashboardLive(
        realTimeEnabled ? 30 : 300, // autoRefreshSeconds
        true, // includeAlerts
        'medium' // alertPriority
      );
      
      updateAnalyticsV3({ operations_dashboard: dashboard });
      return dashboard;
    },
    staleTime: realTimeEnabled ? 30000 : 300000,
    refetchInterval: realTimeEnabled ? 30000 : undefined,
    onError: (error) => handleError(error, 'operations-dashboard'),
  });
};

/**
 * Hook per AI Business Insights con analisi predittiva
 */
const useAIBusinessInsights = (options = {}) => {
  const updateAIInsights = useDataStore(state => state.updateAIInsights || (() => {}));
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    depth = 'standard',
    includeRecommendations = true,
    language = 'it'
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.AI_INSIGHTS, { depth, language }],
    queryFn: async () => {
      if (!aiEnabled) {
        throw new Error('AI features not enabled');
      }
      
      const insights = await apiClient.getAIBusinessInsights(
        depth as any,
        undefined, // focusAreas
        includeRecommendations,
        language as any
      );
      
      updateAIInsights({
        business_insights: insights,
        confidence_score: insights.confidence_score,
        recommendations: insights.recommendations,
      });
      
      return insights;
    },
    enabled: aiEnabled,
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'ai-insights'),
  });
};

/**
 * Hook per Custom Analytics con configurazione flessibile
 */
const useCustomAnalytics = (request: AnalyticsRequest) => {
  const queryClient = useQueryClient();
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: () => apiClient.runCustomAIAnalysis(request),
    onSuccess: (data) => {
      // Invalida cache analytics correlate
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.ANALYTICS });
      
      toast.success('Analisi personalizzata completata');
    },
    onError: (error) => {
      handleError(error, 'custom-analytics');
      toast.error('Errore nell\'analisi personalizzata');
    },
  });
};

/**
 * Hook per real-time metrics con WebSocket simulation
 */
const useRealTimeMetrics = (enabled = false) => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3 || (() => {}));
  const realTimeEnabled = useUIStore(state => state.settings?.real_time_updates || false);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.REAL_TIME_METRICS],
    queryFn: async () => {
      const metrics = await apiClient.getRealtimeLiveMetrics(
        'all', // metrics
        10, // refreshRate
        true // includeAlerts
      );
      
      updateAnalyticsV3({ real_time_metrics: metrics });
      return metrics;
    },
    enabled: enabled && realTimeEnabled,
    staleTime: 10000, // 10 seconds
    refetchInterval: realTimeEnabled ? 10000 : false,
    onError: (error) => handleError(error, 'realtime-metrics'),
  });
};

/**
 * Hook per Ultra Predictions
 */
const useUltraPredictions = (options = {}) => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3 || (() => {}));
  const aiEnabled = useAIFeaturesEnabled();
  const { handleError } = useSmartErrorHandling();
  
  const {
    predictionHorizon = 12,
    confidenceIntervals = true,
    scenarioAnalysis = true,
    externalFactors = false,
    modelEnsemble = true
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ULTRA_PREDICTIONS, options],
    queryFn: async () => {
      const predictions = await apiClient.getUltraPredictions(
        predictionHorizon,
        confidenceIntervals,
        scenarioAnalysis,
        externalFactors,
        modelEnsemble
      );
      
      updateAnalyticsV3({ predictions });
      return predictions;
    },
    enabled: aiEnabled,
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'ultra-predictions'),
  });
};

/**
 * Hook per Seasonality Analysis
 */
const useSeasonalityAnalysis = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    yearsBack = 3,
    includeWeatherCorrelation = false,
    predictMonthsAhead = 6,
    confidenceLevel = 0.95,
    categoryFocus
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'seasonality', options],
    queryFn: () => apiClient.getUltraSeasonalityAnalysis(
      yearsBack,
      includeWeatherCorrelation,
      predictMonthsAhead,
      confidenceLevel,
      categoryFocus
    ),
    staleTime: 3600000, // 1 hour
    onError: (error) => handleError(error, 'seasonality-analysis'),
  });
};

/**
 * Hook per Customer Intelligence Ultra
 */
const useCustomerIntelligence = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    analysisDepth = 'comprehensive',
    includePredictiveLTV = true,
    includeChurnPrediction = true,
    includeNextBestAction = true,
    segmentGranularity = 'detailed'
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'customers', options],
    queryFn: () => apiClient.getUltraCustomerIntelligence(
      analysisDepth as any,
      includePredictiveLTV,
      includeChurnPrediction,
      includeNextBestAction,
      segmentGranularity as any
    ),
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'customer-intelligence'),
  });
};

/**
 * Hook per Competitive Market Position
 */
const useCompetitiveAnalysis = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    benchmarkAgainst = 'industry',
    includePriceAnalysis = true,
    includeMarginOptimization = true,
    marketScope = 'regional'
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'competitive', options],
    queryFn: () => apiClient.getCompetitiveMarketPosition(
      benchmarkAgainst as any,
      includePriceAnalysis,
      includeMarginOptimization,
      marketScope as any
    ),
    staleTime: 3600000, // 1 hour
    onError: (error) => handleError(error, 'competitive-analysis'),
  });
};

/**
 * Hook per Batch Analytics Processing
 */
const useBatchAnalytics = () => {
  const queryClient = useQueryClient();
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (requests: any[]) => apiClient.processBatchUltraAnalytics({
      requests,
      parallel_execution: true,
      timeout_seconds: 300
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.ANALYTICS });
      toast.success('Batch analytics completato');
    },
    onError: (error) => {
      handleError(error, 'batch-analytics');
      toast.error('Errore nel batch analytics');
    },
  });
};

/**
 * Hook per Export Analytics Report
 */
const useAnalyticsExport = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: async (options: {
      reportType?: 'executive' | 'operational' | 'comprehensive' | 'custom';
      format?: 'excel' | 'pdf' | 'json' | 'csv';
      includeAIInsights?: boolean;
      includePredictions?: boolean;
      includeRecommendations?: boolean;
      customSections?: string;
      language?: 'it' | 'en';
    }) => {
      const {
        reportType = 'comprehensive',
        format = 'excel',
        includeAIInsights = true,
        includePredictions = true,
        includeRecommendations = true,
        customSections,
        language = 'it'
      } = options;
      
      const result = await apiClient.exportUltraAnalyticsReport(
        reportType,
        format,
        includeAIInsights,
        includePredictions,
        includeRecommendations,
        customSections,
        language
      );
      
      if (format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Report analytics esportato');
    },
    onError: (error) => {
      handleError(error, 'analytics-export');
      toast.error('Errore nell\'export del report');
    },
  });
};

/**
 * Hook per Performance Monitoring Analytics
 */
const useAnalyticsPerformance = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'performance'],
    queryFn: () => apiClient.getUltraSystemHealth(),
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'analytics-performance'),
  });
};

/**
 * Hook per Custom Report Builder
 */
const useCustomReportBuilder = () => {
  const queryClient = useQueryClient();
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (reportConfig: {
      title: string;
      sections: string[];
      dateRange: { start: string; end: string };
      includeCharts: boolean;
      includeTables: boolean;
      format: 'pdf' | 'excel' | 'html';
    }) => apiClient.runCustomAIAnalysis({
      analysis_type: 'custom_report',
      parameters: reportConfig,
      output_format: reportConfig.format,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.ANALYTICS });
      toast.success('Report personalizzato generato');
    },
    onError: (error) => {
      handleError(error, 'custom-report-builder');
      toast.error('Errore nella generazione del report');
    },
  });
};

/**
 * Hook per Real-time Dashboard Updates
 */
const useRealTimeDashboard = () => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3 || (() => {}));
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.REAL_TIME_METRICS, 'dashboard'],
    queryFn: async () => {
      const metrics = await apiClient.getRealtimeLiveMetrics('dashboard', 5, true);
      updateAnalyticsV3({ real_time_dashboard: metrics });
      return metrics;
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 30000, // 30 seconds
    onError: (error) => handleError(error, 'realtime-dashboard'),
  });
};

/**
 * Hook per Advanced Filtering & Segmentation
 */
const useAdvancedAnalyticsFilters = () => {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const { handleError } = useSmartErrorHandling();
  
  const applyFilters = useMutation({
    mutationFn: (filters: Record<string, any>) => apiClient.runCustomAIAnalysis({
      analysis_type: 'filtered_analytics',
      parameters: { filters },
    }),
    onSuccess: (data) => {
      setActiveFilters(data.applied_filters || {});
      toast.success('Filtri applicati');
    },
    onError: (error) => {
      handleError(error, 'advanced-filters');
      toast.error('Errore nell\'applicazione dei filtri');
    },
  });
  
  const clearFilters = () => {
    setActiveFilters({});
  };
  
  return {
    activeFilters,
    applyFilters,
    clearFilters,
    hasActiveFilters: Object.keys(activeFilters).length > 0,
  };
};

/**
 * Hook per Trend Analysis & Forecasting
 */
const useTrendAnalysis = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    timeframe = '12m',
    includeSeasonality = true,
    includeForecasting = true,
    confidenceLevel = 0.95
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'trends', options],
    queryFn: () => apiClient.getUltraSeasonalityAnalysis(
      timeframe === '12m' ? 1 : timeframe === '24m' ? 2 : 3,
      includeSeasonality,
      includeForecasting ? 6 : 0,
      confidenceLevel
    ),
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'trend-analysis'),
  });
};

/**
 * Hook per Benchmark Analysis
 */
const useBenchmarkAnalysis = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    benchmarkType = 'industry',
    includePerformanceMetrics = true,
    includeSuggestions = true
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'benchmark', options],
    queryFn: () => apiClient.getCompetitiveMarketPosition(
      benchmarkType as any,
      true, // includePriceAnalysis
      includePerformanceMetrics,
      'regional'
    ),
    staleTime: 3600000, // 1 hour
    onError: (error) => handleError(error, 'benchmark-analysis'),
  });
};

/**
 * Hook per Cohort Analysis
 */
const useCohortAnalysis = (options = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  const {
    cohortType = 'monthly',
    retentionPeriods = 12,
    includeValueAnalysis = true
  } = options;
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'cohorts', options],
    queryFn: () => apiClient.getUltraCustomerIntelligence(
      'comprehensive',
      includeValueAnalysis, // includePredictiveLTV
      true, // includeChurnPrediction
      true, // includeNextBestAction
      'detailed'
    ),
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'cohort-analysis'),
  });
};

/**
 * Hook per Alert Management
 */
const useAnalyticsAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const { handleError } = useSmartErrorHandling();
  
  const alertsQuery = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'alerts'],
    queryFn: async () => {
      const result = await apiClient.getRealtimeLiveMetrics('alerts', 60, true);
      setAlerts(result.alerts || []);
      return result;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    onError: (error) => handleError(error, 'analytics-alerts'),
  });
  
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };
  
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
  };
  
  return {
    alerts,
    dismissAlert,
    acknowledgeAlert,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
  };
};

/**
 * Hook per Anomaly Detection
 */
const useAnomalyDetection = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.AI_INSIGHTS, 'anomalies'],
    queryFn: () => apiClient.getAIBusinessInsights(
      'deep',
      'anomaly_detection',
      false,
      'it'
    ),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'anomaly-detection'),
  });
};

/**
 * Hook per Data Quality Assessment
 */
const useDataQualityAssessment = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'data-quality'],
    queryFn: () => apiClient.getUltraSystemHealth(),
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'data-quality-assessment'),
  });
};

/**
 * Hook per Scheduled Reports
 */
const useScheduledReports = () => {
  const queryClient = useQueryClient();
  const { handleError } = useSmartErrorHandling();
  
  const [scheduledReports, setScheduledReports] = useState([]);
  
  const createSchedule = useMutation({
    mutationFn: (schedule: {
      name: string;
      reportType: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      format: 'pdf' | 'excel';
    }) => apiClient.runCustomAIAnalysis({
      analysis_type: 'scheduled_report',
      parameters: schedule,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'scheduled'] });
      toast.success('Report programmato creato');
    },
    onError: (error) => {
      handleError(error, 'create-scheduled-report');
      toast.error('Errore nella creazione del report programmato');
    },
  });
  
  return {
    scheduledReports,
    createSchedule,
    isCreating: createSchedule.isPending,
  };
};

/**
 * Hook per API Performance Monitoring
 */
const useAPIPerformanceMonitoring = () => {
  const updatePerformanceMetrics = useDataStore(state => state.updatePerformanceMetrics || (() => {}));
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'api-performance'],
    queryFn: async () => {
      const metrics = await apiClient.getUltraSystemHealth();
      updatePerformanceMetrics({
        api_response_times: metrics.api_response_times,
        cache_hit_rates: metrics.cache_hit_rates,
      });
      return metrics;
    },
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    onError: (error) => handleError(error, 'api-performance-monitoring'),
  });
};

// ===== LEGACY COMPATIBILITY HOOKS =====

/**
 * Hook legacy per KPIs (compatibilità)
 */
const useKPIs = () => {
  return useExecutiveDashboard();
};

/**
 * Hook legacy per Dashboard Data (compatibilità)
 */
const useDashboardData = () => {
  return useExecutiveDashboard();
};

/**
 * Hook legacy per Detailed KPIs (compatibilità)
 */
const useDetailedKPIs = () => {
  return useExecutiveDashboard();
};

/**
 * Hook per Analytics Health (compatibilità)
 */
const useAnalyticsHealth = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'health'],
    queryFn: () => apiClient.getUltraSystemHealth(),
    staleTime: 300000,
    onError: (error) => handleError(error, 'analytics-health'),
  });
};

/**
 * Hook per Analytics Features (compatibilità)
 */
const useAnalyticsFeatures = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEYS.ANALYTICS, 'features'],
    queryFn: () => apiClient.getUltraAnalyticsFeatures(),
    staleTime: Infinity, // Dati stabili
    onError: (error) => handleError(error, 'analytics-features'),
  });
};

// ===== COMBINED ANALYTICS HOOKS =====

/**
 * Hook composito per Dashboard completo
 */
const useCompleteDashboard = () => {
  const executiveDashboard = useExecutiveDashboard();
  const operationsDashboard = useOperationsDashboard();
  const aiInsights = useAIBusinessInsights();
  const realTimeMetrics = useRealTimeMetrics(true);
  
  return {
    executive: executiveDashboard,
    operations: operationsDashboard,
    aiInsights,
    realTime: realTimeMetrics,
    isLoading: executiveDashboard.isLoading || operationsDashboard.isLoading,
    hasError: executiveDashboard.error || operationsDashboard.error,
    refetchAll: () => {
      executiveDashboard.refetch();
      operationsDashboard.refetch();
      aiInsights.refetch();
      realTimeMetrics.refetch();
    },
  };
};

/**
 * Hook per Analytics completo con tutte le features
 */
const useFullAnalytics = (options = {}) => {
  const dashboard = useCompleteDashboard();
  const predictions = useUltraPredictions(options);
  const seasonality = useSeasonalityAnalysis(options);
  const competitive = useCompetitiveAnalysis(options);
  const customer = useCustomerIntelligence(options);
  
  return {
    dashboard: dashboard.executive.data,
    operations: dashboard.operations.data,
    predictions: predictions.data,
    seasonality: seasonality.data,
    competitive: competitive.data,
    customer: customer.data,
    aiInsights: dashboard.aiInsights.data,
    isLoading: dashboard.isLoading || predictions.isLoading || seasonality.isLoading,
    hasError: dashboard.hasError || predictions.error || seasonality.error,
    refetchAll: () => {
      dashboard.refetchAll();
      predictions.refetch();
      seasonality.refetch();
      competitive.refetch();
      customer.refetch();
    },
  };
};

// ===== EXPORT ALL HOOKS (UNICO EXPORT ALLA FINE) =====
export {
  // Main hooks
  useExecutiveDashboard,
  useOperationsDashboard,
  useAIBusinessInsights,
  useCustomAnalytics,
  useRealTimeMetrics,
  useUltraPredictions,
  
  // Analysis hooks
  useSeasonalityAnalysis,
  useCustomerIntelligence,
  useCompetitiveAnalysis,
  useTrendAnalysis,
  useCohortAnalysis,
  useBenchmarkAnalysis,
  
  // Utility hooks
  useBatchAnalytics,
  useAnalyticsExport,
  useAnalyticsPerformance,
  useCustomReportBuilder,
  useRealTimeDashboard,
  useAdvancedAnalyticsFilters,
  
  // Monitoring hooks
  useAnalyticsAlerts,
  useAnomalyDetection,
  useDataQualityAssessment,
  useScheduledReports,
  useAPIPerformanceMonitoring,
  
  // Legacy compatibility
  useKPIs,
  useDashboardData,
  useDetailedKPIs,
  useAnalyticsHealth,
  useAnalyticsFeatures,
  
  // Combined hooks
  useCompleteDashboard,
  useFullAnalytics,
  
  // AI Features hook
  useAIFeaturesEnabled,
};
