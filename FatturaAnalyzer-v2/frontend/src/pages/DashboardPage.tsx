import React from 'react';
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
} from 'lucide-react';

// Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICards } from '@/components/dashboard/KPICards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { TopClientsTable } from '@/components/dashboard/TopClientsTable';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OverdueInvoices } from '@/components/dashboard/OverdueInvoices';

// API & Store
import { apiClient } from '@/services/api';
import { useDataStore } from '@/store';

// Types
import type { DashboardData } from '@/types';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';

export function DashboardPage() {
  const { setDashboardData } = useDataStore();

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.getDashboardData();
      if (response.success && response.data) {
        setDashboardData(response.data);
        return response.data as DashboardData;
      }
      throw new Error(response.message || 'Errore nel caricamento dashboard');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

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
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? 'Aggiornamento...' : 'Aggiorna'}
          </Button>
          <Button size="sm">
            Esporta Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          ))}
        </div>
      ) : dashboardData ? (
        <KPICards data={dashboardData.kpis} />
      ) : null}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend Fatturato
            </CardTitle>
            <CardDescription>
              Andamento mensile ultimi 12 mesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <RevenueChart />
            )}
          </CardContent>
        </Card>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cash Flow
            </CardTitle>
            <CardDescription>
              Flussi di cassa mensili
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dashboardData?.cash_flow_summary ? (
              <CashFlowChart data={dashboardData.cash_flow_summary} />
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
              Clienti per fatturato ultimi 12 mesi
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
            ) : dashboardData?.top_clients ? (
              <TopClientsTable data={dashboardData.top_clients} />
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Nessun dato clienti disponibile
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
            ) : dashboardData?.overdue_invoices ? (
              <OverdueInvoices data={dashboardData.overdue_invoices} />
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-green-500" />
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
            <RecentActivity 
              invoices={dashboardData.recent_invoices || []}
              transactions={dashboardData.recent_transactions || []}
            />
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
            <Button className="h-16 flex-col space-y-1" variant="outline">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Nuova Fattura</span>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline">
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Import Movimenti</span>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Riconciliazione</span>
            </Button>
            <Button className="h-16 flex-col space-y-1" variant="outline">
              <Users className="h-5 w-5" />
              <span className="text-xs">Nuovo Cliente</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}