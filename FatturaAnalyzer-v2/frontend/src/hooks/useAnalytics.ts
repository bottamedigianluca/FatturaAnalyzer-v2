/**
 * Analytics & Dashboard Hooks V4.0
 * Hook per dashboard, analytics V3.0 e AI insights
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { AnalyticsRequest } from '@/types';
import { 
  useDataStore,
  useUIStore,
  useAIFeaturesEnabled 
} from '@/store';
import { useSmartCache, useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const ANALYTICS_QUERY_KEYS = {
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
export const useExecutiveDashboard = () => {
  const setDashboardData = useDataStore(state => state.setDashboardData);
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3);
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
export const useOperationsDashboard = () => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3);
  const realTimeEnabled = useUIStore(state => state.settings.real_time_updates);
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
export const useAIBusinessInsights = (options = {}) => {
  const updateAIInsights = useDataStore(state => state.updateAIInsights);
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
export const useCustomAnalytics = (request: AnalyticsRequest) => {
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
export const useRealTimeMetrics = (enabled = false) => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3);
  const realTimeEnabled = useUIStore(state => state.settings.real_time_updates);
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
export const useUltraPredictions = (options = {}) => {
  const updateAnalyticsV3 = useDataStore(state => state.updateAnalyticsV3);
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
export const useSeasonalityAnalysis = (options = {}) => {
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
export const useCustomerIntelligence = (options = {}) => {
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
export const useCompetitiveAnalysis = (options = {}) => {
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
export const useBatchAnalytics = () => {
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
export const useAnalyticsExport = () => {
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
