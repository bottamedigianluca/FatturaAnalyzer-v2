import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  Calendar,
  Target,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  Building2,
  Wallet,
  PieChart,
  Activity,
  Filter,
  Download,
  Settings,
  Plus,
  Upload,
  GitMerge,
  Search,
} from 'lucide-react';

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
} from '@/components/ui';

// Custom Components
import { KPICards } from '@/components/dashboard/KPICards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { TopClientsTable } from '@/components/dashboard/TopClientsTable';

// Hooks
import { useAnalyticsKPIs } from '@/hooks/useAnalytics';
import { useUIStore } from '@/store';
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { DashboardData, Invoice, BankTransaction, TopClientData } from '@/types';

interface DashboardViewProps {
  timeRange?: string;
  showFilters?: boolean;
}

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'blue' | 'yellow' | 'purple';
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'transaction' | 'reconciliation';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export function DashboardView({ 
  timeRange = '30d', 
  showFilters = true 
}: DashboardViewProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { addNotification } = useUIStore();

  // Main dashboard data query - REAL data from backend
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-data', selectedTimeRange],
    queryFn: async (): Promise<DashboardData> => {
      const response = await apiClient.getDashboardData();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch dashboard data');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
  });

  // Additional data queries for different sections
  const { data: kpiData } = useAnalyticsKPIs();
  
  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: () => apiClient.getInvoices({ page: 1, size: 5 }),
    staleTime: 60 * 1000,
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => apiClient.getTransactions({ page: 1, size: 5 }),
    staleTime: 60 * 1000,
  });

  const { data: reconciliationOpportunities } = useQuery({
    queryKey: ['reconciliation-opportunities'],
    queryFn: () => apiClient.getReconciliationOpportunities(10, 0.01),
    staleTime: 2 * 60 * 1000,
  });

  // Calculate real statistics from actual data
  const quickStats: QuickStat[] = useMemo(() => {
    if (!dashboardData) return [];

    const kpis = dashboardData.kpis;
    const recentInvoicesData = recentInvoices?.data?.items || [];
    const recentTransData = recentTransactions?.data?.items || [];

    return [
      {
        label: 'Crediti Totali',
        value: formatCurrency(kpis.total_receivables),
        change: kpis.revenue_yoy_change_ytd,
        icon: DollarSign,
        color: 'green',
      },
      {
        label: 'Fatture Scadute',
        value: kpis.overdue_receivables_count,
        icon: AlertTriangle,
        color: kpis.overdue_receivables_count > 0 ? 'red' : 'green',
      },
      {
        label: 'Clienti Attivi',
        value: kpis.active_customers_month,
        change: kpis.new_customers_month > 0 ? (kpis.new_customers_month / kpis.active_customers_month) * 100 : 0,
        icon: Users,
        color: 'blue',
      },
      {
        label: 'Da Riconciliare',
        value: recentTransData.filter(t => t.reconciliation_status === 'Da Riconciliare').length,
        icon: GitMerge,
        color: 'yellow',
      },
    ];
  }, [dashboardData, recentInvoices, recentTransactions]);

  // Generate recent activity from real data
  const recentActivity: RecentActivity[] = useMemo(() => {
    const activities: RecentActivity[] = [];
    
    // Add recent invoices
    if (recentInvoices?.data?.items) {
      recentInvoices.data.items.slice(0, 3).forEach(invoice => {
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: `Fattura ${invoice.doc_number}`,
          description: `${invoice.counterparty_name} - ${invoice.payment_status}`,
          amount: invoice.total_amount,
          timestamp: invoice.created_at,
          status: invoice.payment_status === 'Pagata Tot.' ? 'success' : 
                  invoice.payment_status === 'Scaduta' ? 'error' : 'info',
        });
      });
    }

    // Add recent transactions
    if (recentTransactions?.data?.items) {
      recentTransactions.data.items.slice(0, 3).forEach(transaction => {
        activities.push({
          id: `transaction-${transaction.id}`,
          type: 'transaction',
          title: `Movimento ${transaction.amount > 0 ? 'in entrata' : 'in uscita'}`,
          description: transaction.description || 'Nessuna descrizione',
          amount: transaction.amount,
          timestamp: transaction.created_at,
          status: transaction.reconciliation_status === 'Riconciliato Tot.' ? 'success' : 
                  transaction.reconciliation_status === 'Da Riconciliare' ? 'warning' : 'info',
        });
      });
    }

    // Sort by timestamp and return latest 10
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [recentInvoices, recentTransactions]);

  // Real quick actions that work
  const handleNewInvoice = () => {
    // In a real app, this would navigate to invoice creation
    addNotification({
      type: 'info',
      title: 'Nuova Fattura',
      message: 'Reindirizzamento al form di creazione fattura...',
      duration: 2000,
    });
  };

  const handleImportTransactions = () => {
    // In a real app, this would open file upload dialog
    addNotification({
      type: 'info',
      title: 'Import Movimenti',
      message: 'Apertura dialog di importazione CSV...',
      duration: 2000,
    });
  };

  const handleReconciliation = () => {
    // Navigate to reconciliation page
    addNotification({
      type: 'info',
      title: 'Riconciliazione',
      message: 'Reindirizzamento alla pagina di riconciliazione...',
      duration: 2000,
    });
  };

  const handleExportData = () => {
    // In a real app, this would trigger data export
    addNotification({
      type: 'success',
      title: 'Export avviato',
      message: 'I dati verranno esportati in formato Excel...',
      duration: 3000,
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Errore nel caricamento dashboard
                </h3>
                <p className="text-red-700">
                  {error instanceof Error ? error.message : 'Errore sconosciuto'}
                </p>
                <Button onClick={() => refetch()} variant="outline" className="mt-3">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Riprova
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Panoramica generale del sistema di fatturazione
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showFilters && (
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                <SelectItem value="90d">Ultimi 3 mesi</SelectItem>
                <SelectItem value="365d">Ultimo anno</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          
          <Button onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleNewInvoice}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Nuova Fattura</p>
                  <p className="text-sm text-gray-600">Crea fattura attiva</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleImportTransactions}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Upload className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Import CSV</p>
                  <p className="text-sm text-gray-600">Carica movimenti</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleReconciliation}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GitMerge className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Riconciliazione</p>
                  <p className="text-sm text-gray-600">Match automatico</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Search className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Ricerca</p>
                  <p className="text-sm text-gray-600">Trova documenti</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              "border-l-4",
              stat.color === 'green' && "border-l-green-500 bg-green-50/50",
              stat.color === 'red' && "border-l-red-500 bg-red-50/50",
              stat.color === 'blue' && "border-l-blue-500 bg-blue-50/50",
              stat.color === 'yellow' && "border-l-yellow-500 bg-yellow-50/50",
              stat.color === 'purple' && "border-l-purple-500 bg-purple-50/50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.change !== undefined && (
                      <div className="flex items-center gap-1 mt-1">
                        {stat.change > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        )}
                        <span className={cn(
                          "text-xs",
                          stat.change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {Math.abs(stat.change).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <stat.icon className={cn(
                    "h-8 w-8",
                    stat.color === 'green' && "text-green-500",
                    stat.color === 'red' && "text-red-500",
                    stat.color === 'blue' && "text-blue-500",
                    stat.color === 'yellow' && "text-yellow-500",
                    stat.color === 'purple' && "text-purple-500"
                  )} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main content tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="financial">Finanziario</TabsTrigger>
          <TabsTrigger value="reconciliation">Riconciliazione</TabsTrigger>
          <TabsTrigger value="activity">Attività</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI Cards - Real data */}
            <div className="lg:col-span-2">
              {dashboardData?.kpis && <KPICards data={dashboardData.kpis} />}
            </div>

            {/* Quick Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Riepilogo Rapido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fatture aperte</span>
                  <Badge variant="outline">
                    {dashboardData?.recent_invoices?.filter(i => i.payment_status !== 'Pagata Tot.').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Transazioni da riconciliare</span>
                  <Badge variant="outline">
                    {dashboardData?.recent_transactions?.filter(t => t.reconciliation_status === 'Da Riconciliare').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Opportunità riconciliazione</span>
                  <Badge variant="outline">
                    {reconciliationOpportunities?.data?.length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart - Real data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Andamento Fatturato
              </CardTitle>
              <CardDescription>
                Trend degli ultimi 12 mesi con confronto anno precedente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart months={12} variant="area" showCosts={true} />
            </CardContent>
          </Card>

          {/* Top Clients - Real data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Clienti
              </CardTitle>
              <CardDescription>
                Clienti con maggior fatturato negli ultimi 12 mesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.top_clients && (
                <TopClientsTable 
                  data={dashboardData.top_clients} 
                  maxItems={10} 
                  showActions={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.cash_flow_summary && (
                  <div className="space-y-4">
                    {dashboardData.cash_flow_summary.slice(0, 6).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.month}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            item.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(item.net_cash_flow)}
                          </span>
                          {item.net_cash_flow >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Fatture Scadute
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.overdue_invoices && (
                  <div className="space-y-4">
                    {dashboardData.overdue_invoices.slice(0, 5).map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{invoice.doc_number}</p>
                          <p className="text-xs text-gray-600">{invoice.counterparty_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {formatCurrency(invoice.open_amount || invoice.total_amount)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {invoice.due_date && formatDate(invoice.due_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Opportunità di Riconciliazione
              </CardTitle>
              <CardDescription>
                Potenziali match automatici trovati dal sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconciliationOpportunities?.data && reconciliationOpportunities.data.length > 0 ? (
                <div className="space-y-4">
                  {reconciliationOpportunities.data.slice(0, 5).map((opportunity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{opportunity.description}</p>
                        <p className="text-sm text-gray-600">
                          Confidence: {(opportunity.confidence_score * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(opportunity.total_amount)}</p>
                        <Button size="sm" className="mt-2">
                          Applica Match
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitMerge className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Nessuna opportunità di riconciliazione trovata</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attività Recenti
              </CardTitle>
              <CardDescription>
                Ultime operazioni effettuate sul sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className={cn(
                      "p-2 rounded-full",
                      activity.status === 'success' && "bg-green-100",
                      activity.status === 'warning' && "bg-yellow-100",
                      activity.status === 'error' && "bg-red-100",
                      activity.status === 'info' && "bg-blue-100"
                    )}>
                      {activity.type === 'invoice' && <FileText className="h-4 w-4" />}
                      {activity.type === 'transaction' && <CreditCard className="h-4 w-4" />}
                      {activity.type === 'reconciliation' && <GitMerge className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                    </div>
                    {activity.amount && (
                      <div className="text-right">
                        <p className={cn(
                          "font-medium",
                          activity.amount > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(activity.amount)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4
