import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Users,
  Calendar,
  Target,
} from 'lucide-react';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Types
import type { DashboardKPIs } from '@/types';

// Utils
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  data: DashboardKPIs;
}

interface KPICardData {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export function KPICards({ data }: KPICardsProps) {
  const kpiCards: KPICardData[] = [
    {
      title: 'Crediti Totali',
      value: formatCurrency(data.total_receivables),
      description: `${data.overdue_receivables_count} fatture scadute`,
      icon: DollarSign,
      variant: data.overdue_receivables_amount > 0 ? 'warning' : 'default',
    },
    {
      title: 'Fatturato YTD',
      value: formatCurrency(data.revenue_ytd),
      description: 'Anno corrente',
      icon: TrendingUp,
      trend: data.revenue_yoy_change_ytd !== undefined ? {
        value: data.revenue_yoy_change_ytd,
        isPositive: data.revenue_yoy_change_ytd > 0,
        label: 'vs anno precedente',
      } : undefined,
      variant: data.revenue_yoy_change_ytd && data.revenue_yoy_change_ytd > 0 ? 'success' : 'default',
    },
    {
      title: 'Margine Lordo',
      value: formatCurrency(data.gross_margin_ytd),
      description: data.margin_percent_ytd ? `${formatPercentage(data.margin_percent_ytd)} del fatturato` : undefined,
      icon: Target,
      variant: data.margin_percent_ytd && data.margin_percent_ytd > 20 ? 'success' : 'default',
    },
    {
      title: 'Clienti Attivi',
      value: data.active_customers_month.toString(),
      description: `+${data.new_customers_month} nuovi questo mese`,
      icon: Users,
      variant: data.new_customers_month > 0 ? 'success' : 'default',
    },
  ];

  // Se ci sono importi scaduti significativi, aggiungi una card specifica
  if (data.overdue_receivables_amount > 1000) {
    kpiCards.push({
      title: 'Crediti Scaduti',
      value: formatCurrency(data.overdue_receivables_amount),
      description: `${data.overdue_receivables_count} fatture da sollecitare`,
      icon: AlertTriangle,
      variant: 'destructive',
    });
  }

  // Se abbiamo dati sui tempi di pagamento, aggiungi una card
  if (data.avg_days_to_payment !== undefined) {
    kpiCards.push({
      title: 'Giorni Medi Incasso',
      value: `${Math.round(data.avg_days_to_payment)}gg`,
      description: 'Tempo medio di pagamento',
      icon: Calendar,
      variant: data.avg_days_to_payment > 60 ? 'warning' : 'success',
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.slice(0, 4).map((card, index) => (
        <KPICard key={index} {...card} />
      ))}
    </div>
  );
}

function KPICard({ title, value, description, icon: Icon, trend, variant = 'default' }: KPICardData) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      variant === 'success' && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
      variant === 'warning' && "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
      variant === 'destructive' && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          variant === 'success' && "text-green-600",
          variant === 'warning' && "text-yellow-600",
          variant === 'destructive' && "text-red-600",
          variant === 'default' && "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-muted-foreground">
            {description}
          </div>
          
          {trend && (
            <Badge 
              variant={trend.isPositive ? "default" : "secondary"}
              className={cn(
                "text-xs",
                trend.isPositive 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {formatPercentage(Math.abs(trend.value))}
            </Badge>
          )}
        </div>
        
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}