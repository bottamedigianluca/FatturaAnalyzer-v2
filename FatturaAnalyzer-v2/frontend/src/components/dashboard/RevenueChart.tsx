import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';

// API & Utils
import { apiClient } from '@/services/api';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

// Types
interface RevenueData {
  month: string;
  revenue: number;
  cost: number;
  gross_margin: number;
  margin_percent: number;
}

interface RevenueChartProps {
  months?: number;
  variant?: 'line' | 'area';
  showCosts?: boolean;
}

export function RevenueChart({ 
  months = 12, 
  variant = 'area',
  showCosts = true 
}: RevenueChartProps) {
  const { data: revenueData, isLoading, error } = useQuery({
    queryKey: ['revenue-trends', months],
    queryFn: async () => {
      const response = await apiClient.getMonthlyRevenue(months, 'Attiva');
      if (response.success && response.data) {
        return response.data as RevenueData[];
      }
      throw new Error(response.message || 'Errore nel caricamento dati fatturato');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.dataKey === 'revenue' ? 'Fatturato' : entry.dataKey === 'cost' ? 'Costi' : 'Margine'}:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
              {entry.dataKey === 'gross_margin' && entry.payload.margin_percent && (
                <span className="text-muted-foreground text-xs">
                  ({entry.payload.margin_percent.toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error || !revenueData) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Errore nel caricamento dei dati</p>
          <p className="text-xs mt-1">
            {error instanceof Error ? error.message : 'Errore sconosciuto'}
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!revenueData || revenueData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Nessun dato disponibile</p>
          <p className="text-xs mt-1">Non ci sono dati di fatturato per il periodo selezionato</p>
        </div>
      </div>
    );
  }

  // Process data for chart
  const chartData = revenueData.map(item => ({
    ...item,
    month: new Date(item.month + '-01').toLocaleDateString('it-IT', { 
      month: 'short', 
      year: '2-digit' 
    }),
  }));

  // Calculate totals for summary
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCosts = revenueData.reduce((sum, item) => sum + item.cost, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPercent = revenueData.reduce((sum, item) => sum + item.margin_percent, 0) / revenueData.length;

  const Chart = variant === 'area' ? AreaChart : LineChart;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Fatturato Totale</p>
          <p className="text-lg font-bold text-green-600">{formatCurrencyCompact(totalRevenue)}</p>
        </div>
        {showCosts && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Costi Totali</p>
            <p className="text-lg font-bold text-red-600">{formatCurrencyCompact(totalCosts)}</p>
          </div>
        )}
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Margine Lordo</p>
          <p className="text-lg font-bold text-primary">{formatCurrencyCompact(totalMargin)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">% Margine Medio</p>
          <p className="text-lg font-bold text-blue-600">{avgMarginPercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCurrencyCompact(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {variant === 'area' ? (
              <>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  {showCosts && (
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  )}
                  <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  name="Fatturato"
                />
                {showCosts && (
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#costGradient)"
                    name="Costi"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="gross_margin"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#marginGradient)"
                  name="Margine"
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Fatturato"
                />
                {showCosts && (
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Costi"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="gross_margin"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Margine"
                />
              </>
            )}
          </Chart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Fatturato</span>
        </div>
        {showCosts && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Costi</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Margine Lordo</span>
        </div>
      </div>
    </div>
  );
}