import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore } from '@/store';

// Types for advanced analytics
interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
  };
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
  segments: string[];
  metrics: string[];
  includeForecasts: boolean;
  includeTrends: boolean;
}

interface KPIMetric {
  name: string;
  value: number;
  previous_value: number;
  change: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  target_progress?: number;
}

interface TrendAnalysis {
  metric: string;
  data_points: Array<{
    date: string;
    value: number;
    forecast?: number;
    confidence_interval?: {
      lower: number;
      upper: number;
    };
  }>;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  seasonality: {
    detected: boolean;
    pattern?: string;
    strength?: number;
  };
  anomalies: Array<{
    date: string;
    expected: number;
    actual: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface CustomerAnalytics {
  segments: Array<{
    name: string;
    count: number;
    revenue: number;
    avg_order_value: number;
    retention_rate: number;
    churn_risk: 'low' | 'medium' | 'high';
  }>;
  cohort_analysis: Array<{
    cohort: string;
    period_0: number;
    period_1: number;
    period_2: number;
    period_3: number;
    period_6: number;
    period_12: number;
  }>;
  lifetime_value: {
    average: number;
    by_segment: Record<string, number>;
    prediction_accuracy: number;
  };
}

interface RevenueAnalytics {
  overview: {
    total_revenue: number;
    recurring_revenue: number;
    one_time_revenue: number;
    revenue_growth_rate: number;
    monthly_recurring_revenue: number;
    annual_recurring_revenue: number;
  };
  breakdown: {
    by_product: Array<{ name: string; revenue: number; percentage: number }>;
    by_geography: Array<{ region: string; revenue: number; percentage: number }>;
    by_channel: Array<{ channel: string; revenue: number; percentage: number }>;
  };
  forecasting: {
    next_month: number;
    next_quarter: number;
    next_year: number;
    confidence_scores: {
      next_month: number;
      next_quarter: number;
      next_year: number;
    };
  };
}

interface PredictiveAnalytics {
  churn_prediction: {
    high_risk_customers: Array<{
      customer_id: number;
      name: string;
      churn_probability: number;
      risk_factors: string[];
      recommended_actions: string[];
    }>;
    model_accuracy: number;
    feature_importance: Record<string, number>;
  };
  demand_forecasting: {
    products: Array<{
      product_id: number;
      name: string;
      predicted_demand: number;
      confidence: number;
      seasonality_factor: number;
    }>;
    accuracy_metrics: {
      mape: number; // Mean Absolute Percentage Error
      rmse: number; // Root Mean Square Error
      mae: number;  // Mean Absolute Error
    };
  };
  price_optimization: {
    recommendations: Array<{
      product_id: number;
      current_price: number;
      optimal_price: number;
      expected_revenue_impact: number;
      demand_elasticity: number;
    }>;
    market_analysis: {
      competitive_position: string;
      price_sensitivity: number;
      market_saturation: number;
    };
  };
}

interface CashFlowAnalysis {
  monthly_data: Array<{
    month: string;
    total_inflows: number;
    total_outflows: number;
    net_cash_flow: number;
    incassi_clienti: number;
    pagamenti_fornitori: number;
    commissioni_bancarie: number;
    other_inflows: number;
    other_outflows: number;
  }>;
  forecast: Array<{
    month: string;
    predicted_inflows: number;
    predicted_outflows: number;
    predicted_net_flow: number;
    confidence_level: number;
  }>;
  trends: {
    inflow_trend: 'increasing' | 'decreasing' | 'stable';
    outflow_trend: 'increasing' | 'decreasing' | 'stable';
    volatility_score: number;
    seasonal_patterns: string[];
  };
}

interface PerformanceMetrics {
  operational: {
    invoice_processing_time: number;
    reconciliation_accuracy: number;
    automation_rate: number;
    error_rate: number;
  };
  financial: {
    days_sales_outstanding: number;
    cash_conversion_cycle: number;
    working_capital_ratio: number;
    liquidity_ratio: number;
  };
  growth: {
    revenue_growth_rate: number;
    customer_acquisition_rate: number;
    customer_retention_rate: number;
    market_share_growth: number;
  };
}

interface AnalyticsExportConfig {
  type: 'pdf' | 'excel' | 'csv' | 'powerpoint';
  dateRange: { start: string; end: string };
  metrics: string[];
  includeCharts: boolean;
  includeForecasts: boolean;
  template?: string;
}

interface AnalyticsDashboardConfig {
  widgets: Array<{
    id: string;
    type: 'kpi' | 'chart' | 'table' | 'gauge';
    title: string;
    metric: string;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    config: any;
  }>;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  filters: AnalyticsFilters;
}

/**
 * Core Analytics KPIs Hook
 */
export function useAnalyticsKPIs(filters?: Partial<AnalyticsFilters>) {
  const { addNotification } = useUIStore();
  
  return useQuery({
    queryKey: ['analytics-kpis', filters],
    queryFn: async (): Promise<KPIMetric[]> => {
      const response = await apiClient.getKPIs();
      
      if (response.success && response.data) {
        // Transform API response to KPI metrics
        const kpiData = response.data;
        return [
          {
            name: 'Total Revenue',
            value: kpiData.total_revenue || 0,
            previous_value: kpiData.previous_revenue || 0,
            change: (kpiData.total_revenue || 0) - (kpiData.previous_revenue || 0),
            change_percentage: kpiData.revenue_growth || 0,
            trend: kpiData.revenue_growth > 0 ? 'up' : kpiData.revenue_growth < 0 ? 'down' : 'stable',
            target: kpiData.revenue_target,
            target_progress: kpiData.revenue_target ? (kpiData.total_revenue / kpiData.revenue_target) : undefined,
          },
          {
            name: 'Active Customers',
            value: kpiData.active_customers || 0,
            previous_value: kpiData.previous_customers || 0,
            change: (kpiData.active_customers || 0) - (kpiData.previous_customers || 0),
            change_percentage: kpiData.customer_growth || 0,
            trend: kpiData.customer_growth > 0 ? 'up' : kpiData.customer_growth < 0 ? 'down' : 'stable',
          },
          {
            name: 'Average Order Value',
            value: kpiData.avg_order_value || 0,
            previous_value: kpiData.previous_aov || 0,
            change: (kpiData.avg_order_value || 0) - (kpiData.previous_aov || 0),
            change_percentage: kpiData.aov_change || 0,
            trend: kpiData.aov_change > 0 ? 'up' : kpiData.aov_change < 0 ? 'down' : 'stable',
          },
          {
            name: 'Profit Margin',
            value: kpiData.profit_margin || 0,
            previous_value: kpiData.previous_margin || 0,
            change: (kpiData.profit_margin || 0) - (kpiData.previous_margin || 0),
            change_percentage: kpiData.margin_change || 0,
            trend: kpiData.margin_change > 0 ? 'up' : kpiData.margin_change < 0 ? 'down' : 'stable',
          },
        ];
      }
      
      throw new Error('Failed to fetch KPI data');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Errore KPI',
        message: 'Impossibile caricare i dati KPI',
        duration: 5000,
      });
    },
  });
}

/**
 * Advanced Trend Analysis Hook
 */
export function useTrendAnalysis(
  metric: string, 
  timeframe: string = '90d',
  includeForecasting: boolean = true
) {
  return useQuery({
    queryKey: ['trend-analysis', metric, timeframe, includeForecasting],
    queryFn: async (): Promise<TrendAnalysis> => {
      // Mock implementation - in real app, this would call the ML API
      const generateMockTrendData = (timeframe: string) => {
        const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
        const data = [];
        let baseValue = 1000 + Math.random() * 5000;
        
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - i));
          
          // Add some trend and seasonality
          const trend = i * (Math.random() * 10 - 5);
          const seasonal = Math.sin((i / 7) * Math.PI) * 100; // Weekly pattern
          const noise = (Math.random() - 0.5) * 200;
          
          const value = Math.max(0, baseValue + trend + seasonal + noise);
          
          data.push({
            date: date.toISOString().split('T')[0],
            value: Math.round(value),
            forecast: includeForecasting && i > days * 0.8 ? 
              Math.round(value * (0.95 + Math.random() * 0.1)) : undefined,
            confidence_interval: includeForecasting && i > days * 0.8 ? {
              lower: Math.round(value * 0.9),
              upper: Math.round(value * 1.1)
            } : undefined,
          });
        }
        
        return data;
      };

      const generateMockAnomalies = () => {
        return [
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected: 1500,
            actual: 2300,
            severity: 'medium' as const,
          },
          {
            date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expected: 1200,
            actual: 800,
            severity: 'high' as const,
          },
        ];
      };

      const mockData: TrendAnalysis = {
        metric,
        data_points: generateMockTrendData(timeframe),
        trend_direction: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        seasonality: {
          detected: Math.random() > 0.3,
          pattern: 'weekly',
          strength: 0.7 + Math.random() * 0.3,
        },
        anomalies: generateMockAnomalies(),
      };
      
      return mockData;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!metric,
  });
}

/**
 * Customer Analytics Hook
 */
export function useCustomerAnalytics(filters?: Partial<AnalyticsFilters>) {
  return useQuery({
    queryKey: ['customer-analytics', filters],
    queryFn: async (): Promise<CustomerAnalytics> => {
      // Mock implementation
      return {
        segments: [
          { name: 'Enterprise', count: 45, revenue: 850000, avg_order_value: 18889, retention_rate: 0.94, churn_risk: 'low' },
          { name: 'SMB', count: 180, revenue: 320000, avg_order_value: 1778, retention_rate: 0.87, churn_risk: 'medium' },
          { name: 'Startup', count: 320, revenue: 180000, avg_order_value: 563, retention_rate: 0.72, churn_risk: 'high' },
        ],
        cohort_analysis: [
          { cohort: '2024-01', period_0: 100, period_1: 85, period_2: 78, period_3: 72, period_6: 65, period_12: 58 },
          { cohort: '2024-02', period_0: 120, period_1: 98, period_2: 89, period_3: 84, period_6: 76, period_12: 0 },
          { cohort: '2024-03', period_0: 95, period_1: 82, period_2: 75, period_3: 71, period_6: 0, period_12: 0 },
        ],
        lifetime_value: {
          average: 2840,
          by_segment: {
            'Enterprise': 18900,
            'SMB': 4200,
            'Startup': 980,
          },
          prediction_accuracy: 0.87,
        },
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Revenue Analytics Hook
 */
export function useRevenueAnalytics(filters?: Partial<AnalyticsFilters>) {
  return useQuery({
    queryKey: ['revenue-analytics', filters],
    queryFn: async (): Promise<RevenueAnalytics> => {
      const response = await apiClient.getMonthlyRevenue(12);
      
      if (response.success && response.data) {
        const monthlyData = response.data;
        const totalRevenue = monthlyData.reduce((sum: number, month: any) => sum + month.revenue, 0);
        
        return {
          overview: {
            total_revenue: totalRevenue,
            recurring_revenue: totalRevenue * 0.7,
            one_time_revenue: totalRevenue * 0.3,
            revenue_growth_rate: 0.15,
            monthly_recurring_revenue: totalRevenue * 0.7 / 12,
            annual_recurring_revenue: totalRevenue * 0.7,
          },
          breakdown: {
            by_product: [
              { name: 'Software Licenses', revenue: totalRevenue * 0.6, percentage: 0.6 },
              { name: 'Professional Services', revenue: totalRevenue * 0.25, percentage: 0.25 },
              { name: 'Support & Maintenance', revenue: totalRevenue * 0.15, percentage: 0.15 },
            ],
            by_geography: [
              { region: 'North America', revenue: totalRevenue * 0.45, percentage: 0.45 },
              { region: 'Europe', revenue: totalRevenue * 0.35, percentage: 0.35 },
              { region: 'Asia Pacific', revenue: totalRevenue * 0.2, percentage: 0.2 },
            ],
            by_channel: [
              { channel: 'Direct Sales', revenue: totalRevenue * 0.5, percentage: 0.5 },
              { channel: 'Channel Partners', revenue: totalRevenue * 0.3, percentage: 0.3 },
              { channel: 'Online', revenue: totalRevenue * 0.2, percentage: 0.2 },
            ],
          },
          forecasting: {
            next_month: totalRevenue / 12 * 1.08,
            next_quarter: totalRevenue / 4 * 1.12,
            next_year: totalRevenue * 1.18,
            confidence_scores: {
              next_month: 0.92,
              next_quarter: 0.84,
              next_year: 0.71,
            },
          },
        };
      }
      
      throw new Error('Failed to fetch revenue analytics');
    },
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
}

/**
 * Predictive Analytics Hook (Advanced ML)
 */
export function usePredictiveAnalytics() {
  return useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: async (): Promise<PredictiveAnalytics> => {
      // Mock ML predictions - in real app, this would call ML/AI services
      return {
        churn_prediction: {
          high_risk_customers: [
            {
              customer_id: 1001,
              name: 'TechCorp Solutions',
              churn_probability: 0.78,
              risk_factors: ['Decreased usage', 'Support tickets', 'Payment delays'],
              recommended_actions: ['Schedule check-in call', 'Offer discount', 'Provide additional training'],
            },
            {
              customer_id: 1045,
              name: 'Global Industries',
              churn_probability: 0.65,
              risk_factors: ['Contract ending soon', 'No recent engagement'],
              recommended_actions: ['Renewal discussion', 'Product demo', 'Success story sharing'],
            },
          ],
          model_accuracy: 0.87,
          feature_importance: {
            'usage_frequency': 0.28,
            'support_tickets': 0.22,
            'payment_history': 0.18,
            'engagement_score': 0.16,
            'contract_value': 0.16,
          },
        },
        demand_forecasting: {
          products: [
            {
              product_id: 101,
              name: 'Analytics Pro',
              predicted_demand: 450,
              confidence: 0.89,
              seasonality_factor: 1.2,
            },
            {
              product_id: 102,
              name: 'Enterprise Suite',
              predicted_demand: 180,
              confidence: 0.92,
              seasonality_factor: 0.8,
            },
          ],
          accuracy_metrics: {
            mape: 12.3,
            rmse: 45.7,
            mae: 38.2,
          },
        },
        price_optimization: {
          recommendations: [
            {
              product_id: 101,
              current_price: 299,
              optimal_price: 329,
              expected_revenue_impact: 0.12,
              demand_elasticity: -0.8,
            },
            {
              product_id: 102,
              current_price: 999,
              optimal_price: 1099,
              expected_revenue_impact: 0.08,
              demand_elasticity: -0.6,
            },
          ],
          market_analysis: {
            competitive_position: 'strong',
            price_sensitivity: 0.65,
            market_saturation: 0.43,
          },
        },
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 4 * 60 * 60 * 1000, // 4 hours
  });
}

/**
 * Cash Flow Analysis Hook
 */
export function useCashFlowAnalysis(months: number = 12) {
  return useQuery({
    queryKey: ['cash-flow-analysis', months],
    queryFn: async (): Promise<CashFlowAnalysis> => {
      const response = await apiClient.getCashFlowAnalysis(months);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      // Mock data if API fails
      const mockData: CashFlowAnalysis = {
        monthly_data: Array.from({ length: months }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (months - 1 - i));
          
          const baseInflow = 50000 + Math.random() * 30000;
          const baseOutflow = 40000 + Math.random() * 25000;
          
          return {
            month: date.toISOString().slice(0, 7),
            total_inflows: baseInflow,
            total_outflows: baseOutflow,
            net_cash_flow: baseInflow - baseOutflow,
            incassi_clienti: baseInflow * 0.8,
            pagamenti_fornitori: baseOutflow * 0.6,
            commissioni_bancarie: baseOutflow * 0.05,
            other_inflows: baseInflow * 0.2,
            other_outflows: baseOutflow * 0.35,
          };
        }),
        forecast: Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() + i + 1);
          
          return {
            month: date.toISOString().slice(0, 7),
            predicted_inflows: 55000 + Math.random() * 20000,
            predicted_outflows: 42000 + Math.random() * 18000,
            predicted_net_flow: 13000 + Math.random() * 10000,
            confidence_level: 0.8 - (i * 0.1),
          };
        }),
        trends: {
          inflow_trend: 'increasing',
          outflow_trend: 'stable',
          volatility_score: 0.25,
          seasonal_patterns: ['Q4 peak', 'Summer dip'],
        },
      };
      
      return mockData;
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Performance Metrics Hook
 */
export function usePerformanceMetrics() {
  return useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async (): Promise<PerformanceMetrics> => {
      // Mock implementation
      return {
        operational: {
          invoice_processing_time: 2.3, // hours
          reconciliation_accuracy: 0.96,
          automation_rate: 0.78,
          error_rate: 0.02,
        },
        financial: {
          days_sales_outstanding: 32,
          cash_conversion_cycle: 45,
          working_capital_ratio: 1.8,
          liquidity_ratio: 2.1,
        },
        growth: {
          revenue_growth_rate: 0.18,
          customer_acquisition_rate: 0.12,
          customer_retention_rate: 0.91,
          market_share_growth: 0.05,
        },
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Real-time Analytics Stream Hook
 */
export function useRealTimeAnalytics() {
  const [realTimeData, setRealTimeData] = React.useState({
    active_users: 0,
    revenue_today: 0,
    conversion_rate: 0,
    page_views: 0,
    last_update: new Date().toISOString(),
  });

  React.useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        active_users: Math.max(0, prev.active_users + Math.floor((Math.random() - 0.5) * 10)),
        revenue_today: prev.revenue_today + Math.random() * 1000,
        conversion_rate: Math.max(0, Math.min(1, prev.conversion_rate + (Math.random() - 0.5) * 0.01)),
        page_views: prev.page_views + Math.floor(Math.random() * 5),
        last_update: new Date().toISOString(),
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return { data: realTimeData, isLoading: false };
}

/**
 * Analytics Export Hook
 */
export function useAnalyticsExport() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async (config: AnalyticsExportConfig) => {
      // Simulate export generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        downloadUrl: `/exports/analytics-${config.type}-${Date.now()}.${config.type}`,
        filename: `analytics-report-${new Date().toISOString().split('T')[0]}.${config.type}`,
        size: '2.4 MB',
      };
    },
    onSuccess: (result) => {
      addNotification({
        type: 'success',
        title: 'Export Completato',
        message: `Report ${result.filename} (${result.size}) è pronto per il download`,
        duration: 5000,
        action: {
          label: 'Scarica',
          onClick: () => window.open(result.downloadUrl, '_blank'),
        },
      });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Errore Export',
        message: 'Si è verificato un errore durante la generazione del report',
        duration: 5000,
      });
    },
  });
}

/**
 * Custom Analytics Dashboard Hook
 */
export function useCustomDashboard(dashboardId?: string) {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  const dashboardQuery = useQuery({
    queryKey: ['custom-dashboard', dashboardId],
    queryFn: async (): Promise<AnalyticsDashboardConfig> => {
      if (!dashboardId) {
        // Return default dashboard config
        return {
          widgets: [
            {
              id: 'revenue-kpi',
              type: 'kpi',
              title: 'Revenue',
              metric: 'total_revenue',
              size: 'medium',
              position: { x: 0, y: 0 },
              config: { showTrend: true },
            },
            {
              id: 'revenue-chart',
              type: 'chart',
              title: 'Revenue Trend',
              metric: 'revenue_trend',
              size: 'large',
              position: { x: 1, y: 0 },
              config: { chartType: 'line', timeframe: '6m' },
            },
          ],
          refreshInterval: 300000, // 5 minutes
          theme: 'auto',
          filters: {
            dateRange: {
              start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0],
            },
            granularity: 'day',
            segments: [],
            metrics: [],
            includeForecasts: false,
            includeTrends: true,
          },
        };
      }
      
      // Fetch custom dashboard config
      const response = await apiClient.getCustomDashboard(dashboardId);
      if (response.success) {
        return response.data;
      }
      
      throw new Error('Failed to load dashboard');
    },
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });

  const saveDashboard = useMutation({
    mutationFn: async (config: AnalyticsDashboardConfig) => {
      // Save dashboard configuration
      return apiClient.saveCustomDashboard(dashboardId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboard', dashboardId] });
      addNotification({
        type: 'success',
        title: 'Dashboard Salvata',
        message: 'La configurazione è stata salvata con successo',
        duration: 3000,
      });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Errore Salvataggio',
        message: 'Impossibile salvare la configurazione della dashboard',
        duration: 5000,
      });
    },
  });

  return {
    dashboard: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
    saveDashboard: saveDashboard.mutate,
    isSaving: saveDashboard.isPending,
  };
}

/**
 * Advanced Analytics Insights Hook
 */
export function useAnalyticsInsights() {
  return useQuery({
    queryKey: ['analytics-insights'],
    queryFn: async () => {
      // Mock AI-powered insights
      return {
        key_insights: [
          {
            type: 'trend',
            title: 'Revenue crescita accelerata',
            description: 'Il fatturato è cresciuto del 23% rispetto al mese scorso, superando le previsioni.',
            importance: 'high',
            actionable: true,
            recommendations: ['Aumentare il budget marketing', 'Espandere il team vendite'],
          },
          {
            type: 'anomaly',
            title: 'Picco insolito di transazioni',
            description: 'Rilevato un aumento del 45% delle transazioni giovedì scorso.',
            importance: 'medium',
            actionable: false,
            recommendations: ['Investigare la causa del picco'],
          },
          {
            type: 'opportunity',
            title: 'Segmento clienti ad alto valore',
            description: 'Il segmento Enterprise mostra un LTV 3x superiore alla media.',
            importance: 'high',
            actionable: true,
            recommendations: ['Focalizzare acquisizione su Enterprise', 'Sviluppare offerte premium'],
          },
        ],
        predictive_alerts: [
          {
            metric: 'cash_flow',
            prediction: 'Possibile tensione di cassa nei prossimi 30 giorni',
            confidence: 0.78,
            severity: 'medium',
            recommended_action: 'Accelerare incassi o differire pagamenti non critici',
          },
        ],
        performance_summary: {
          overall_score: 87,
          improvement_areas: ['Customer retention', 'Operational efficiency'],
          strong_areas: ['Revenue growth', 'Market penetration'],
        },
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 4 * 60 * 60 * 1000, // 4 hours
  });
}
