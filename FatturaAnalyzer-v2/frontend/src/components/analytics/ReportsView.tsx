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
                        metric.trend > 0 ? "
