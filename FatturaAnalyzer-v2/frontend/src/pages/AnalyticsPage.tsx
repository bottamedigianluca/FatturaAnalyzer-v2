import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  Zap,
  Eye,
  Filter,
  Download,
  Share,
  Settings,
  RefreshCw,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Gauge,
  Lightbulb,
  Sparkles,
  Database,
  Cpu,
  Network,
  Radar,
  LineChart,
  PieChart,
  BarChart,
} from 'lucide-react';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Switch,
  Slider,
  Checkbox,
  Progress,
} from '@/components/ui';

import { ReportsView } from '@/components/analytics/ReportsView';
import {
  AnimatedLineChart,
  StackedAreaChart,
  InteractiveBarChart,
  EnhancedPieChart,
  ComposedAnalyticsChart,
  AdvancedChartContainer,
} from '@/components/analytics/ChartsLibrary';

// Hooks
import { useQuery } from '@tanstack/react-query';
import { 
  useExecutiveDashboard,
  useAIBusinessInsights,
  useAnalyticsExport,
} from '@/hooks/useAnalytics';
import { useUIStore, useUserSettings } from '@/store';

// Utils
import { formatCurrency, formatPercentage, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface AnalyticsData {
  kpis: {
    total_revenue: number;
    revenue_growth: number;
    profit_margin: number;
    customer_acquisition: number;
    churn_rate: number;
    avg_order_value: number;
    cash_flow_health: number;
    operational_efficiency: number;
  };
  trends: {
    revenue_trend: Array<{ month: string; value: number; prediction?: number }>;
    profit_trend: Array<{ month: string; value: number; prediction?: number }>;
    customer_trend: Array<{ month: string; active: number; new: number; churned: number }>;
    cash_flow_trend: Array<{ month: string; inflow: number; outflow: number; net: number }>;
  };
  segments: {
    customer_segments: Array<{ name: string; value: number; growth: number }>;
    revenue_segments: Array<{ name: string; value: number; percentage: number }>;
    geographic_segments: Array<{ region: string; revenue: number; customers: number }>;
  };
  predictions: {
    revenue_forecast: Array<{ month: string; predicted: number; confidence: number }>;
    risk_assessment: {
      overall_risk: 'low' | 'medium' | 'high';
      factors: Array<{ factor: string; impact: number; trend: 'improving' | 'stable' | 'declining' }>;
    };
    opportunities: Array<{ opportunity: string; potential_value: number; probability: number }>;
  };
  ai_insights: {
    anomalies: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>;
    patterns: Array<{ pattern: string; confidence: number; impact: string }>;
    recommendations: Array<{ title: string; description: string; priority: 'low' | 'medium' | 'high' }>;
  };
}

interface DashboardConfig {
  refresh_interval: number;
  auto_refresh: boolean;
  show_predictions: boolean;
  show_ai_insights: boolean;
  chart_animations: boolean;
  data_density: 'compact' | 'normal' | 'detailed';
  time_range: '7d' | '30d' | '90d' | '1y' | 'all';
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    refresh_interval: 300, // 5 minutes
    auto_refresh: true,
    show_predictions: true,
    show_ai_insights: true,
    chart_animations: true,
    data_density: 'normal',
    time_range: '90d',
  });
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(false);

  const { addNotification } = useUIStore();
  const { settings } = useUserSettings();

  // ✅ FIX: Usa hooks corretti invece di fetch mock
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useExecutiveDashboard();

  const { 
    data: aiInsights, 
    isLoading: aiLoading 
  } = useAIBusinessInsights({
    depth: 'standard',
    includeRecommendations: true,
    language: settings.language || 'it'
  });

  const analyticsExport = useAnalyticsExport();

  // Mock data per demo (da sostituire con dati reali dal backend)
  const mockAnalyticsData: AnalyticsData = {
    kpis: {
      total_revenue: 2850000,
      revenue_growth: 0.23,
      profit_margin: 0.31,
      customer_acquisition: 145,
      churn_rate: 0.05,
      avg_order_value: 4250,
      cash_flow_health: 0.87,
      operational_efficiency: 0.92,
    },
    trends: {
      revenue_trend: [
        { month: 'Gen', value: 245000, prediction: 250000 },
        { month: 'Feb', value: 220000, prediction: 235000 },
        { month: 'Mar', value: 280000, prediction: 275000 },
        { month: 'Apr', value: 265000, prediction: 270000 },
        { month: 'Mag', value: 295000, prediction: 290000 },
        { month: 'Giu', value: 310000, prediction: 305000 },
      ],
      profit_trend: [
        { month: 'Gen', value: 78000, prediction: 82000 },
        { month: 'Feb', value: 66000, prediction: 71000 },
        { month: 'Mar', value: 94000, prediction: 91000 },
        { month: 'Apr', value: 87000, prediction: 89000 },
        { month: 'Mag', value: 98000, prediction: 95000 },
        { month: 'Giu', value: 102000, prediction: 100000 },
      ],
      customer_trend: [
        { month: 'Gen', active: 1250, new: 45, churned: 12 },
        { month: 'Feb', active: 1283, new: 42, churned: 9 },
        { month: 'Mar', active: 1321, new: 51, churned: 13 },
        { month: 'Apr', active: 1359, new: 48, churned: 10 },
        { month: 'Mag', active: 1402, new: 55, churned: 12 },
        { month: 'Giu', active: 1445, new: 52, churned: 9 },
      ],
      cash_flow_trend: [
        { month: 'Gen', inflow: 280000, outflow: 195000, net: 85000 },
        { month: 'Feb', inflow: 255000, outflow: 180000, net: 75000 },
        { month: 'Mar', inflow: 315000, outflow: 210000, net: 105000 },
        { month: 'Apr', inflow: 290000, outflow: 200000, net: 90000 },
        { month: 'Mag', inflow: 335000, outflow: 220000, net: 115000 },
        { month: 'Giu', inflow: 350000, outflow: 225000, net: 125000 },
      ],
    },
    segments: {
      customer_segments: [
        { name: 'Enterprise', value: 450000, growth: 0.18 },
        { name: 'SMB', value: 320000, growth: 0.25 },
        { name: 'Startup', value: 180000, growth: 0.35 },
        { name: 'Individual', value: 95000, growth: 0.12 },
      ],
      revenue_segments: [
        { name: 'Prodotti', value: 1800000, percentage: 0.63 },
        { name: 'Servizi', value: 750000, percentage: 0.26 },
        { name: 'Consulenza', value: 200000, percentage: 0.07 },
        { name: 'Licenze', value: 100000, percentage: 0.04 },
      ],
      geographic_segments: [
        { region: 'Nord Italia', revenue: 1200000, customers: 450 },
        { region: 'Centro Italia', revenue: 850000, customers: 320 },
        { region: 'Sud Italia', revenue: 500000, customers: 280 },
        { region: 'Estero', revenue: 300000, customers: 95 },
      ],
    },
    predictions: {
      revenue_forecast: [
        { month: 'Lug', predicted: 325000, confidence: 0.89 },
        { month: 'Ago', predicted: 340000, confidence: 0.85 },
        { month: 'Set', predicted: 355000, confidence: 0.82 },
        { month: 'Ott', predicted: 345000, confidence: 0.78 },
      ],
      risk_assessment: {
        overall_risk: 'low',
        factors: [
          { factor: 'Liquidità', impact: 0.15, trend: 'stable' },
          { factor: 'Mercato', impact: 0.25, trend: 'improving' },
          { factor: 'Competizione', impact: 0.35, trend: 'declining' },
          { factor: 'Operazioni', impact: 0.10, trend: 'improving' },
        ],
      },
      opportunities: [
        { opportunity: 'Espansione mercato B2B', potential_value: 450000, probability: 0.75 },
        { opportunity: 'Nuovi servizi digitali', potential_value: 280000, probability: 0.65 },
        { opportunity: 'Partnership strategiche', potential_value: 180000, probability: 0.55 },
      ],
    },
    ai_insights: {
      anomalies: [
        { type: 'Revenue Spike', description: 'Incremento ricavi inatteso del 15% a Marzo', severity: 'low' },
        { type: 'Customer Behavior', description: 'Pattern di acquisto anomalo nel segmento Enterprise', severity: 'medium' },
        { type: 'Seasonal Variation', description: 'Deviazione dal trend stagionale previsto', severity: 'low' },
      ],
      patterns: [
        { pattern: 'Correlazione ricavi-marketing', confidence: 0.87, impact: 'Campagne Q1 hanno generato ROI del 340%' },
        { pattern: 'Ciclo di vita cliente', confidence: 0.92, impact: 'Clienti acquisiti tramite referral hanno LTV 2.3x superiore' },
        { pattern: 'Stagionalità vendite', confidence: 0.78, impact: 'Peak di vendite ricorrente ogni 3° settimana del mese' },
      ],
      recommendations: [
        { title: 'Ottimizza pricing strategy', description: 'Analisi mostra potenziale per aumento prezzi del 8% senza impatto significativo sulla domanda', priority: 'high' },
        { title: 'Espandi team vendite', description: 'ROI positivo previsto con aggiunta di 2 sales manager entro Q3', priority: 'medium' },
        { title: 'Automatizza processi contabili', description: 'Riduzione costi operativi del 15% con automazione reconciliazione', priority: 'high' },
      ],
    },
  };

  // Usa dati mock per ora, in futuro sostituire con dati reali
  const analyticsData = mockAnalyticsData;
  const isLoading = dashboardLoading;
  const error = dashboardError;

  // Auto-refresh effect
  useEffect(() => {
    if (dashboardConfig.auto_refresh) {
      const interval = setInterval(() => {
        refetchDashboard();
      }, dashboardConfig.refresh_interval * 1000);
      return () => clearInterval(interval);
    }
  }, [dashboardConfig.auto_refresh, dashboardConfig.refresh_interval, refetchDashboard]);

  const handleExportDashboard = async () => {
    try {
      await analyticsExport.mutateAsync({
        reportType: 'executive',
        format: 'pdf',
        includeAIInsights: dashboardConfig.show_ai_insights,
        includePredictions: dashboardConfig.show_predictions,
        language: settings.language || 'it',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Errore Export',
        message: 'Errore durante l\'export del dashboard',
        duration: 5000,
      });
    }
  };

  const handleShareDashboard = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Analytics Dashboard',
        text: 'Guarda il mio dashboard analytics',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addNotification({
        type: 'success',
        title: 'Link Copiato',
        message: 'Link del dashboard copiato negli appunti',
        duration: 3000,
      });
    }
  };

  const KPICard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    color,
    format = 'currency' 
  }: {
    title: string;
    value: number;
    trend: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    format?: 'currency' | 'percentage' | 'number';
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group"
    >
      <Card className={cn(
        "border-2 transition-all duration-300 hover:shadow-xl relative overflow-hidden",
        color === 'blue' && "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50",
        color === 'green' && "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50",
        color === 'purple' && "border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50",
        color === 'orange' && "border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8">
            <Icon className="w-full h-full" />
          </div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-3 rounded-xl",
              color === 'blue' && "bg-blue-100 text-blue-600",
              color === 'green' && "bg-green-100 text-green-600",
              color === 'purple' && "bg-purple-100 text-purple-600",
              color === 'orange' && "bg-orange-100 text-orange-600"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            
            <Badge className={cn(
              "text-xs font-bold",
              trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {trend > 0 ? '↗' : '↘'} {formatPercentage(Math.abs(trend))}
            </Badge>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {format === 'currency' && formatCurrency(value)}
              {format === 'percentage' && formatPercentage(value)}
              {format === 'number' && value.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const AIInsightCard = ({ insight }: { insight: any }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 rounded-lg border-l-4 bg-white",
        insight.priority === 'high' && "border-l-red-500 bg-red-50/50",
        insight.priority === 'medium' && "border-l-yellow-500 bg-yellow-50/50",
        insight.priority === 'low' && "border-l-blue-500 bg-blue-50/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-600">{insight.description}</p>
        </div>
        <Badge 
          variant={
            insight.priority === 'high' ? 'destructive' :
            insight.priority === 'medium' ? 'warning' : 'secondary'
          }
          className="ml-3"
        >
          {insight.priority}
        </Badge>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-semibold text-gray-700">Caricamento Analytics...</p>
          <p className="text-sm text-gray-500">Elaborazione dati con AI</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <BarChart3 className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Errore nel caricamento</h3>
        <p className="text-gray-600 mb-4">Impossibile caricare i dati analytics</p>
        <Button onClick={() => refetchDashboard()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Business Intelligence Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Analytics avanzato con AI insights e previsioni intelligenti
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={dashboardConfig.time_range} 
            onValueChange={(value: any) => setDashboardConfig(prev => ({...prev, time_range: value}))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 giorni</SelectItem>
              <SelectItem value="30d">30 giorni</SelectItem>
              <SelectItem value="90d">90 giorni</SelectItem>
              <SelectItem value="1y">1 anno</SelectItem>
              <SelectItem value="all">Tutto</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleShareDashboard}>
            <Share className="h-4 w-4 mr-2" />
            Condividi
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleExportDashboard}
            disabled={analyticsExport.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {analyticsExport.isPending ? 'Esportando...' : 'Esporta'}
          </Button>
          
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurazione
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurazione Dashboard</DialogTitle>
                <DialogDescription>
                  Personalizza le impostazioni del dashboard analytics
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Auto-refresh</label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={dashboardConfig.auto_refresh}
                      onCheckedChange={(checked) => 
                        setDashboardConfig(prev => ({...prev, auto_refresh: checked}))
                      }
                    />
                    <span className="text-sm text-gray-600">
                      Aggiornamento automatico ogni {dashboardConfig.refresh_interval/60} minuti
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Intervallo Refresh (secondi)</label>
                  <Slider
                    value={[dashboardConfig.refresh_interval]}
                    onValueChange={([value]) => 
                      setDashboardConfig(prev => ({...prev, refresh_interval: value}))
                    }
                    max={1800}
                    min={60}
                    step={60}
                  />
                  <div className="text-xs text-gray-500">
                    {dashboardConfig.refresh_interval} secondi
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Mostra Previsioni AI</label>
                    <Switch
                      checked={dashboardConfig.show_predictions}
                      onCheckedChange={(checked) => 
                        setDashboardConfig(prev => ({...prev, show_predictions: checked}))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">AI Insights</label>
                    <Switch
                      checked={dashboardConfig.show_ai_insights}
                      onCheckedChange={(checked) => 
                        setDashboardConfig(prev => ({...prev, show_ai_insights: checked}))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Animazioni Grafici</label>
                    <Switch
                      checked={dashboardConfig.chart_animations}
                      onCheckedChange={(checked) => 
                        setDashboardConfig(prev => ({...prev, chart_animations: checked}))
                      }
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* KPI Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Ricavi Totali"
            value={analyticsData.kpis.total_revenue}
            trend={analyticsData.kpis.revenue_growth}
            icon={DollarSign}
            color="blue"
            format="currency"
          />
          <KPICard
            title="Margine Profitto"
            value={analyticsData.kpis.profit_margin}
            trend={0.08}
            icon={Target}
            color="green"
            format="percentage"
          />
          <KPICard
            title="Nuovi Clienti"
            value={analyticsData.kpis.customer_acquisition}
            trend={0.15}
            icon={Users}
            color="purple"
            format="number"
          />
          <KPICard
            title="Efficienza Operativa"
            value={analyticsData.kpis.operational_efficiency}
            trend={0.12}
            icon={Gauge}
            color="orange"
            format="percentage"
          />
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-14 bg-gradient-to-r from-slate-100 to-gray-100 p-1 rounded-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <PieChart className="h-4 w-4" />
            Segmenti
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            Previsioni AI
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            <BarChart className="h-4 w-4" />
            Report
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value="overview" className="space-y-6">
              {analyticsData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AdvancedChartContainer title="Trend Ricavi vs Profitti">
                    <ComposedAnalyticsChart
                      data={analyticsData.trends.revenue_trend.map((item, index) => ({
                        ...item,
                        profit: analyticsData.trends.profit_trend[index]?.value || 0,
                      }))}
                      title=""
                      xKey="month"
                      yKeys={['value', 'profit']}
                      lineKeys={['value']}
                      barKeys={['profit']}
                      height={300}
                      formatters={{
                        value: (v) => formatCurrency(v),
                        profit: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>

                  <AdvancedChartContainer title="Cash Flow Analysis">
                    <StackedAreaChart
                      data={analyticsData.trends.cash_flow_trend}
                      title=""
                      xKey="month"
                      yKeys={['inflow', 'outflow']}
                      height={300}
                      formatters={{
                        inflow: (v) => formatCurrency(v),
                        outflow: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              {analyticsData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AdvancedChartContainer title="Customer Growth Trends">
                    <AnimatedLineChart
                      data={analyticsData.trends.customer_trend}
                      title=""
                      xKey="month"
                      yKeys={['active', 'new', 'churned']}
                      height={300}
                      showBrush={true}
                    />
                  </AdvancedChartContainer>

                  <AdvancedChartContainer title="Revenue Prediction vs Actual">
                    <AnimatedLineChart
                      data={analyticsData.trends.revenue_trend}
                      title=""
                      xKey="month"
                      yKeys={['value', 'prediction']}
                      height={300}
                      formatters={{
                        value: (v) => formatCurrency(v),
                        prediction: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="segments" className="space-y-6">
              {analyticsData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AdvancedChartContainer title="Customer Segments">
                    <EnhancedPieChart
                      data={analyticsData.segments.customer_segments.map(s => ({
                        name: s.name,
                        value: s.value,
                      }))}
                      title=""
                      yKeys={['value']}
                      height={300}
                      showPercentages={true}
                      formatters={{
                        value: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>

                  <AdvancedChartContainer title="Revenue by Segment">
                    <InteractiveBarChart
                      data={analyticsData.segments.revenue_segments}
                      title=""
                      xKey="name"
                      yKeys={['value']}
                      height={300}
                      layout="vertical"
                      formatters={{
                        value: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="predictions" className="space-y-6">
              {analyticsData && dashboardConfig.show_predictions && (
                <div className="space-y-6">
                  {/* Revenue Forecast */}
                  <AdvancedChartContainer title="Previsioni Ricavi AI">
                    <AnimatedLineChart
                      data={analyticsData.predictions.revenue_forecast}
                      title=""
                      xKey="month"
                      yKeys={['predicted']}
                      height={300}
                      formatters={{
                        predicted: (v) => formatCurrency(v),
                      }}
                    />
                  </AdvancedChartContainer>

                  {/* Risk Assessment */}
                  <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-yellow-600" />
                        Risk Assessment AI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-center mb-4">
                            <Badge className={cn(
                              "text-lg px-4 py-2",
                              analyticsData.predictions.risk_assessment.overall_risk === 'low' && "bg-green-100 text-green-700",
                              analyticsData.predictions.risk_assessment.overall_risk === 'medium' && "bg-yellow-100 text-yellow-700",
                              analyticsData.predictions.risk_assessment.overall_risk === 'high' && "bg-red-100 text-red-700"
                            )}>
                              {analyticsData.predictions.risk_assessment.overall_risk === 'low' && 'Rischio Basso'}
                              {analyticsData.predictions.risk_assessment.overall_risk === 'medium' && 'Rischio Medio'}
                              {analyticsData.predictions.risk_assessment.overall_risk === 'high' && 'Rischio Alto'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {analyticsData.predictions.risk_assessment.factors.map((factor, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <span className="font-medium">{factor.factor}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={factor.impact * 100} className="w-20 h-2" />
                                  <Badge variant={
                                    factor.trend === 'improving' ? 'default' :
                                    factor.trend === 'stable' ? 'secondary' : 'destructive'
                                  }>
                                    {factor.trend === 'improving' && '↗'}
                                    {factor.trend === 'stable' && '→'}
                                    {factor.trend === 'declining' && '↘'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3">Opportunità di Crescita</h4>
                          <div className="space-y-3">
                            {analyticsData.predictions.opportunities.map((opp, index) => (
                              <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-medium text-sm">{opp.opportunity}</h5>
                                  <Badge className="bg-blue-100 text-blue-700">
                                    {formatPercentage(opp.probability)}
                                  </Badge>
                                </div>
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(opp.potential_value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reports">
              <ReportsView />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* AI Insights Panel */}
      {analyticsData && dashboardConfig.show_ai_insights && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Insights & Recommendations
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}
              >
                {aiInsightsExpanded ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Comprimi
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Espandi
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Anomalies */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Anomalie Rilevate
                </h4>
                <div className="space-y-2">
                  {analyticsData.ai_insights.anomalies.slice(0, aiInsightsExpanded ? 10 : 2).map((anomaly, index) => (
                    <div key={index} className={cn(
                      "p-3 rounded-lg border-l-4",
                      anomaly.severity === 'high' && "border-l-red-500 bg-red-50",
                      anomaly.severity === 'medium' && "border-l-yellow-500 bg-yellow-50",
                      anomaly.severity === 'low' && "border-l-blue-500 bg-blue-50"
                    )}>
                      <h5 className="font-medium text-sm">{anomaly.type}</h5>
                      <p className="text-xs text-gray-600">{anomaly.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patterns */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4 text-green-500" />
                  Pattern Identificati
                </h4>
                <div className="space-y-2">
                  {analyticsData.ai_insights.patterns.slice(0, aiInsightsExpanded ? 10 : 2).map((pattern, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-medium text-sm">{pattern.pattern}</h5>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {formatPercentage(pattern.confidence)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{pattern.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-500" />
                  Raccomandazioni
                </h4>
                <div className="space-y-2">
                  {analyticsData.ai_insights.recommendations.slice(0, aiInsightsExpanded ? 10 : 2).map((rec, index) => (
                    <AIInsightCard key={index} insight={rec} />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
