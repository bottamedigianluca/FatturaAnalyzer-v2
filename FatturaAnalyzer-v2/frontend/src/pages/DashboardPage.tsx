import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Plus,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react';

// Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Upload } from '@/components/ui';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate, formatPaymentStatus } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface KPIData {
  total_receivables: number;
  total_payables: number;
  overdue_receivables_count: number;
  overdue_receivables_amount: number;
  overdue_payables_count: number;
  overdue_payables_amount: number;
  revenue_ytd: number;
  revenue_prev_year_ytd: number;
  revenue_yoy_change_ytd?: number;
  gross_margin_ytd: number;
  margin_percent_ytd?: number;
  active_customers_month: number;
  new_customers_month: number;
}

interface DashboardData {
  kpis: KPIData;
  recent_invoices: Array<{
    id: number;
    type: string;
    doc_number: string;
    doc_date: string;
    total_amount: number;
    payment_status: string;
    counterparty_name: string;
    open_amount: number;
  }>;
  recent_transactions: Array<{
    id: number;
    transaction_date: string;
    amount: number;
    description: string;
    reconciliation_status: string;
    remaining_amount: number;
  }>;
  cash_flow_summary: Array<{
    month: string;
    total_inflows: number;
    total_outflows: number;
    net_cash_flow: number;
  }>;
  top_clients: Array<{
    id: number;
    denomination: string;
    total_revenue: number;
    num_invoices: number;
    last_order_date: string;
  }>;
  overdue_invoices: Array<{
    id: number;
    doc_number: string;
    doc_date: string;
    due_date: string;
    total_amount: number;
    open_amount: number;
    days_overdue: number;
    counterparty_name: string;
  }>;
}

export function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/dashboard');
      if (response.success && response.data) {
        return response.data as DashboardData;
      }
      throw new Error(response.message || 'Errore nel caricamento dashboard');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Panoramica generale dell'attività
            </p>
          </div>
        </div>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Errore caricamento dati
            </CardTitle>
            <CardDescription>
              Si è verificato un errore durante il caricamento della dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Riprova
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Panoramica generale dell'attività aziendale
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", (isLoading || refreshing) && "animate-spin")} />
            {refreshing ? 'Aggiornamento...' : 'Aggiorna'}
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Esporta Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : dashboardData ? (
          <>
            {/* Total Receivables */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Crediti Totali</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.kpis.total_receivables)}
                </div>
                <p className="text-xs text-muted-foreground">
                  da incassare
                </p>
              </CardContent>
            </Card>

            {/* Revenue YTD */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ricavi Anno</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.kpis.revenue_ytd)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {dashboardData.kpis.revenue_yoy_change_ytd !== null && (
                    <span className={cn(
                      "flex items-center",
                      dashboardData.kpis.revenue_yoy_change_ytd >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {dashboardData.kpis.revenue_yoy_change_ytd >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(dashboardData.kpis.revenue_yoy_change_ytd).toFixed(1)}% vs anno scorso
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Customers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.kpis.active_customers_month}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.kpis.new_customers_month} nuovi questo mese
                </p>
              </CardContent>
            </Card>

            {/* Overdue Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fatture Scadute</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.kpis.overdue_receivables_count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(dashboardData.kpis.overdue_receivables_amount)} da incassare
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cash Flow Trend
            </CardTitle>
            <CardDescription>
              Flussi di cassa ultimi 6 mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dashboardData?.cash_flow_summary && dashboardData.cash_flow_summary.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.cash_flow_summary.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.month}</span>
                      <span className={cn(
                        "font-medium",
                        item.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(item.net_cash_flow)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Entrate: {formatCurrency(item.total_inflows)}</span>
                        <span>Uscite: {formatCurrency(item.total_outflows)}</span>
                      </div>
                      <Progress 
                        value={item.total_inflows > 0 ? (item.net_cash_flow / item.total_inflows) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessun dato cash flow disponibile</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Margin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Finanziaria
            </CardTitle>
            <CardDescription>
              Ricavi e marginalità anno corrente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dashboardData ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatCurrency(dashboardData.kpis.revenue_ytd)}
                  </div>
                  <p className="text-sm text-muted-foreground">Ricavi Anno Corrente</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Ricavi</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(dashboardData.kpis.revenue_ytd)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Margine Lordo</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(dashboardData.kpis.gross_margin_ytd)}
                    </span>
                  </div>
                  {dashboardData.kpis.margin_percent_ytd !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm">% Marginalità</span>
                      <span className="text-sm font-medium">
                        {dashboardData.kpis.margin_percent_ytd.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                
                {dashboardData.kpis.margin_percent_ytd !== null && (
                  <Progress 
                    value={Math.max(0, Math.min(100, dashboardData.kpis.margin_percent_ytd))} 
                    className="h-2" 
                  />
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Clienti
            </CardTitle>
            <CardDescription>
              Clienti per fatturato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : dashboardData?.top_clients && dashboardData.top_clients.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.top_clients.map((client, index) => (
                  <div key={client.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.denomination}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.num_invoices} fatture
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(client.total_revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(client.last_order_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessun dato clienti disponibile</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Fatture Scadute
            </CardTitle>
            <CardDescription>
              Fatture con pagamenti in ritardo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.overdue_invoices && dashboardData.overdue_invoices.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.overdue_invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{invoice.doc_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invoice.counterparty_name}
                      </p>
                      <p className="text-xs text-orange-600">
                        Scaduta da {invoice.days_overdue} giorni
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600">
                        {formatCurrency(invoice.open_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.due_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>Nessuna fattura scaduta!</p>
                  <p className="text-xs">Ottimo lavoro 🎉</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attività Recente
          </CardTitle>
          <CardDescription>
            Ultime operazioni e movimenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : dashboardData ? (
            <div className="space-y-4">
              {/* Recent Invoices */}
              {dashboardData.recent_invoices?.map((invoice) => (
                <div key={`invoice-${invoice.id}`} className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Fattura {invoice.doc_number} - {invoice.counterparty_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(invoice.total_amount)} • {formatDate(invoice.doc_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={formatPaymentStatus(invoice.payment_status).variant}>
                      {formatPaymentStatus(invoice.payment_status).label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(invoice.doc_date)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Recent Transactions */}
              {dashboardData.recent_transactions?.map((transaction) => (
                <div key={`transaction-${transaction.id}`} className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    transaction.amount > 0 ? "bg-green-100" : "bg-red-100"
                  )}>
                    <CreditCard className={cn(
                      "h-4 w-4",
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {transaction.amount > 0 ? 'Entrata' : 'Uscita'} Bancaria
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {transaction.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-medium",
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                </div>
              ))}
              
              {(!dashboardData.recent_invoices?.length && !dashboardData.recent_transactions?.length) && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nessuna attività recente</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nessuna attività recente
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Operazioni frequenti per velocizzare il lavoro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button className="h-16 flex-col space-y-1" variant="outline" asChild>
              <a href="/invoices/new">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Nuova Fattura</span>
              </a>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline" asChild>
              <a href="/import-export">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Import Movimenti</span>
              </a>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline" asChild>
              <a href="/reconciliation">
                <Activity className="h-5 w-5" />
                <span className="text-xs">Riconciliazione</span>
              </a>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline" asChild>
              <a href="/anagraphics/new">
                <Users className="h-5 w-5" />
                <span className="text-xs">Nuovo Cliente</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
