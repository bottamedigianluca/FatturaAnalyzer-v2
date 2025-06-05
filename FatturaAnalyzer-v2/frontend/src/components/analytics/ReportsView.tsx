import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Brain,
  Sparkles,
  Eye,
  Settings,
  RefreshCw,
  Share,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

// Chart components
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
} from 'recharts';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DatePicker,
  Checkbox,
  Progress,
  Separator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

// Utils
import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ReportData {
  financial_overview: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
    cash_flow: number;
    outstanding_receivables: number;
    outstanding_payables: number;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    cash_flow: number;
  }>;
  top_clients: Array<{
    name: string;
    revenue: number;
    invoices: number;
    growth: number;
  }>;
  expense_categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    trend: number;
  }>;
  reconciliation_stats: {
    total_processed: number;
    success_rate: number;
    avg_processing_time: number;
    ai_assisted: number;
  };
  predictions: {
    next_month_revenue: number;
    cash_flow_forecast: number;
    risk_assessment: 'low' | 'medium' | 'high';
    confidence: number;
  };
}

interface ReportFilters {
  dateRange: string;
  reportType: string;
  clientFilter: string;
  includeForecasts: boolean;
  includeComparisons: boolean;
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function ReportsView() {
  const [selectedReport, setSelectedReport] = useState('financial-overview');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'last-12-months',
    reportType: 'comprehensive',
    clientFilter: 'all',
    includeForecasts: true,
    includeComparisons: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'charts' | 'tables' | 'mixed'>('mixed');

  // Mock data (in real app, this would come from API)
  const reportData: ReportData = useMemo(() => ({
    financial_overview: {
      total_revenue: 2850000,
      total_expenses: 1940000,
      net_profit: 910000,
      profit_margin: 0.319,
      cash_flow: 850000,
      outstanding_receivables: 450000,
      outstanding_payables: 320000,
    },
    monthly_trends: [
      { month: 'Gen', revenue: 245000, expenses: 180000, profit: 65000, cash_flow: 70000 },
      { month: 'Feb', revenue: 220000, expenses: 175000, profit: 45000, cash_flow: 50000 },
      { month: 'Mar', revenue: 280000, expenses: 190000, profit: 90000, cash_flow: 95000 },
      { month: 'Apr', revenue: 265000, expenses: 185000, profit: 80000, cash_flow: 85000 },
      { month: 'Mag', revenue: 295000, expenses: 200000, profit: 95000, cash_flow: 100000 },
      { month: 'Giu', revenue: 310000, expenses: 205000, profit: 105000, cash_flow: 110000 },
      { month: 'Lug', revenue: 285000, expenses: 195000, profit: 90000, cash_flow: 95000 },
      { month: 'Ago', revenue: 275000, expenses: 190000, profit: 85000, cash_flow: 90000 },
      { month: 'Set', revenue: 320000, expenses: 210000, profit: 110000, cash_flow: 115000 },
      { month: 'Ott', revenue: 298000, expenses: 200000, profit: 98000, cash_flow: 103000 },
      { month: 'Nov', revenue: 285000, expenses: 195000, profit: 90000, cash_flow: 95000 },
      { month: 'Dic', revenue: 340000, expenses: 220000, profit: 120000, cash_flow: 125000 },
    ],
    top_clients: [
      { name: 'TechCorp Solutions', revenue: 450000, invoices: 24, growth: 0.15 },
      { name: 'Global Industries', revenue: 380000, invoices: 18, growth: 0.22 },
      { name: 'Innovation Labs', revenue: 320000, invoices: 16, growth: -0.05 },
      { name: 'Future Systems', revenue: 280000, invoices: 12, growth: 0.33 },
      { name: 'Digital Dynamics', revenue: 250000, invoices: 15, growth: 0.18 },
    ],
    expense_categories: [
      { category: 'Fornitori', amount: 850000, percentage: 0.44, trend: 0.08 },
      { category: 'Personale', amount: 620000, percentage: 0.32, trend: 0.05 },
      { category: 'Marketing', amount: 180000, percentage: 0.09, trend: 0.15 },
      { category: 'Operazioni', amount: 150000, percentage: 0.08, trend: -0.03 },
      { category: 'Tecnologia', amount: 140000, percentage: 0.07, trend: 0.12 },
    ],
    reconciliation_stats: {
      total_processed: 2847,
      success_rate: 0.94,
      avg_processing_time: 2.3,
      ai_assisted: 0.76,
    },
    predictions: {
      next_month_revenue: 355000,
      cash_flow_forecast: 320000,
      risk_assessment: 'low',
      confidence: 0.87,
    },
  }), []);

  const reportTypes = [
    { id: 'financial-overview', name: 'Panoramica Finanziaria', icon: BarChart3 },
    { id: 'revenue-analysis', name: 'Analisi Ricavi', icon: TrendingUp },
    { id: 'expense-breakdown', name: 'Dettaglio Spese', icon: PieChart },
    { id: 'client-performance', name: 'Performance Clienti', icon: Users },
    { id: 'reconciliation-report', name: 'Report Riconciliazione', icon: Brain },
    { id: 'cash-flow', name: 'Flusso di Cassa', icon: LineChart },
    { id: 'predictions', name: 'Previsioni AI', icon: Sparkles },
  ];

  const generateReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.dataKey}:</span>
              </div>
              <span className="font-medium">
                {typeof entry.value === 'number' && entry.value > 1000 
                  ? formatCurrency(entry.value)
                  : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const FinancialOverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        {
          title: 'Ricavi Totali',
          value: formatCurrency(reportData.financial_overview.total_revenue),
          trend: 0.12,
          icon: TrendingUp,
          color: 'green',
        },
        {
          title: 'Spese Totali',
          value: formatCurrency(reportData.financial_overview.total_expenses),
          trend: 0.08,
          icon: TrendingDown,
          color: 'red',
        },
        {
          title: 'Profitto Netto',
          value: formatCurrency(reportData.financial_overview.net_profit),
          trend: 0.18,
          icon: Target,
          color: 'blue',
        },
        {
          title: 'Margine Profitto',
          value: formatPercentage(reportData.financial_overview.profit_margin),
          trend: 0.05,
          icon: BarChart3,
          color: 'purple',
        },
      ].map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "border-2 transition-all duration-300 hover:shadow-lg",
              metric.color === 'green' && "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50",
              metric.color === 'red' && "border-red-200 bg-gradient-to-br from-red-50 to-rose-50",
              metric.color === 'blue' && "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50",
              metric.color === 'purple' && "border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      metric.color === 'green' && "text-green-600",
                      metric.color === 'red' && "text-red-600",
                      metric.color === 'blue' && "text-blue-600",
                      metric.color === 'purple' && "text-purple-600"
                    )}>
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {metric.value}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {metric.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        metric.trend > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {metric.trend > 0 ? '+' : ''}{formatPercentage(metric.trend)}
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg",
                    metric.color === 'green' && "bg-green-100 text-green-600",
                    metric.color === 'red' && "bg-red-100 text-red-600",
                    metric.color === 'blue' && "bg-blue-100 text-blue-600",
                    metric.color === 'purple' && "bg-purple-100 text-purple-600"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const MonthlyTrendsChart = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-blue-600" />
          Trend Mensili
        </CardTitle>
        <CardDescription>
          Andamento di ricavi, spese e profitti negli ultimi 12 mesi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={reportData.monthly_trends}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value, 'EUR', 'it-IT').replace(',00', 'K').replace('€ ', '€')} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" fill={CHART_COLORS[0]} name="Ricavi" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill={CHART_COLORS[3]} name="Spese" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="profit" stroke={CHART_COLORS[1]} strokeWidth={3} name="Profitto" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const TopClientsChart = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Top 5 Clienti per Ricavi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.top_clients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.invoices} fatture</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(client.revenue)}</p>
                  <div className="flex items-center gap-1">
                    {client.growth > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      client.growth > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {client.growth > 0 ? '+' : ''}{formatPercentage(client.growth)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            Distribuzione Spese per Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={reportData.expense_categories}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  nameKey="category"
                  label={({ category, percentage }) => `${category}: ${formatPercentage(percentage)}`}
                >
                  {reportData.expense_categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Importo']}
                  labelFormatter={(label) => `Categoria: ${label}`}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ReconciliationStatsCard = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-600" />
          Statistiche Riconciliazione AI
        </CardTitle>
        <CardDescription>
          Performance del sistema di riconciliazione intelligente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {reportData.reconciliation_stats.total_processed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Processate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {formatPercentage(reportData.reconciliation_stats.success_rate)}
            </div>
            <div className="text-sm text-gray-600">Successo</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {reportData.reconciliation_stats.avg_processing_time}s
            </div>
            <div className="text-sm text-gray-600">Tempo Medio</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {formatPercentage(reportData.reconciliation_stats.ai_assisted)}
            </div>
            <div className="text-sm text-gray-600">AI Assistite</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PredictionsCard = () => (
    <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600" />
          Previsioni AI
        </CardTitle>
        <CardDescription>
          Proiezioni basate su machine learning e pattern analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-white/60 rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatCurrency(reportData.predictions.next_month_revenue)}
            </div>
            <div className="text-sm text-gray-600">Ricavi Prossimo Mese</div>
          </div>
          
          <div className="text-center p-4 bg-white/60 rounded-lg">
            <DollarSign className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatCurrency(reportData.predictions.cash_flow_forecast)}
            </div>
            <div className="text-sm text-gray-600">Cash Flow Previsto</div>
          </div>
          
          <div className="text-center p-4 bg-white/60 rounded-lg">
            <Badge 
              className={cn(
                "text-lg px-4 py-2 mb-2",
                reportData.predictions.risk_assessment === 'low' && "bg-green-100 text-green-700",
                reportData.predictions.risk_assessment === 'medium' && "bg-yellow-100 text-yellow-700",
                reportData.predictions.risk_assessment === 'high' && "bg-red-100 text-red-700"
              )}
            >
              {reportData.predictions.risk_assessment === 'low' && 'Basso Rischio'}
              {reportData.predictions.risk_assessment === 'medium' && 'Medio Rischio'}
              {reportData.predictions.risk_assessment === 'high' && 'Alto Rischio'}
            </Badge>
            <div className="text-sm text-gray-600">
              Confidenza: {formatPercentage(reportData.predictions.confidence)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report e Analytics</h1>
          <p className="text-gray-600 mt-1">
            Dashboard avanzato con intelligenza artificiale e previsioni
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({...prev, dateRange: value}))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-month">Ultimo Mese</SelectItem>
              <SelectItem value="last-3-months">Ultimi 3 Mesi</SelectItem>
              <SelectItem value="last-6-months">Ultimi 6 Mesi</SelectItem>
              <SelectItem value="last-12-months">Ultimi 12 Mesi</SelectItem>
              <SelectItem value="current-year">Anno Corrente</SelectItem>
              <SelectItem value="custom">Personalizzato</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Opzioni
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Visualizzazione</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewMode('charts')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Solo Grafici
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('tables')}>
                <FileText className="h-4 w-4 mr-2" />
                Solo Tabelle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('mixed')}>
                <Eye className="h-4 w-4 mr-2" />
                Misto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Esportazione</DropdownMenuLabel>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Esporta PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Esporta Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generazione...' : 'Genera Report AI'}
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card className="border-2 border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 overflow-x-auto">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              const isActive = selectedReport === type.id;
              
              return (
                <motion.button
                  key={type.id}
                  onClick={() => setSelectedReport(type.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{type.name}</span>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedReport}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedReport === 'financial-overview' && (
            <div>
              <FinancialOverviewCards />
              <MonthlyTrendsChart />
              <ReconciliationStatsCard />
            </div>
          )}
          
          {selectedReport === 'revenue-analysis' && (
            <div>
              <FinancialOverviewCards />
              <MonthlyTrendsChart />
              <TopClientsChart />
            </div>
          )}
          
          {selectedReport === 'expense-breakdown' && (
            <div>
              <TopClientsChart />
              <ReconciliationStatsCard />
            </div>
          )}
          
          {selectedReport === 'client-performance' && (
            <div>
              <TopClientsChart />
              <FinancialOverviewCards />
            </div>
          )}
          
          {selectedReport === 'reconciliation-report' && (
            <div>
              <ReconciliationStatsCard />
              <MonthlyTrendsChart />
            </div>
          )}
          
          {selectedReport === 'cash-flow' && (
            <div>
              <MonthlyTrendsChart />
              <FinancialOverviewCards />
            </div>
          )}
          
          {selectedReport === 'predictions' && (
            <div>
              <PredictionsCard />
              <MonthlyTrendsChart />
              <ReconciliationStatsCard />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Generation Loading Overlay */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <Card className="w-96 border-2 border-blue-300">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-6"
              />
              
              <h3 className="text-xl font-bold text-blue-700 mb-2">
                Generazione Report AI in Corso
              </h3>
              
              <p className="text-blue-600 mb-4">
                L'intelligenza artificiale sta analizzando i dati...
              </p>
              
              <div className="space-y-2">
                <Progress value={65} className="w-full" />
                <p className="text-xs text-blue-500">
                  Elaborazione pattern e previsioni
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
