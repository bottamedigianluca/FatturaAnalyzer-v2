import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// Utils
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

// Types
import type { CashFlowData } from '@/types';

interface CashFlowChartProps {
  data: CashFlowData[];
  variant?: 'detailed' | 'simple';
}

export function CashFlowChart({ data, variant = 'simple' }: CashFlowChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-64">
          <p className="font-medium text-foreground mb-3">{label}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-green-600">📈 Entrate Totali:</span>
              <span className="font-medium text-green-600">{formatCurrency(data.total_inflows)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-600">📉 Uscite Totali:</span>
              <span className="font-medium text-red-600">{formatCurrency(data.total_outflows)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">💰 Flusso Netto:</span>
                <span className={`font-bold ${data.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.net_cash_flow)}
                </span>
              </div>
            </div>
            
            {variant === 'detailed' && (
              <div className="mt-3 pt-2 border-t space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incassi Clienti:</span>
                  <span>{formatCurrency(data.incassi_clienti)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagamenti Fornitori:</span>
                  <span>{formatCurrency(data.pagamenti_fornitori)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commissioni:</span>
                  <span>{formatCurrency(data.commissioni_bancarie)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Process data for chart
  const chartData = data.map(item => ({
    ...item,
    month: new Date(item.month + '-01').toLocaleDateString('it-IT', { 
      month: 'short', 
      year: '2-digit' 
    }),
    // Negative values for outflows to show them below zero line
    total_outflows_negative: -Math.abs(item.total_outflows),
  }));

  // Calculate summary stats
  const totalInflows = data.reduce((sum, item) => sum + item.total_inflows, 0);
  const totalOutflows = data.reduce((sum, item) => sum + item.total_outflows, 0);
  const netCashFlow = totalInflows - totalOutflows;
  const avgMonthlyFlow = netCashFlow / (data.length || 1);

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Nessun dato cash flow disponibile</p>
          <p className="text-xs mt-1">Importa movimenti bancari per visualizzare il cash flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 dark:text-green-400">Entrate Totali</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrencyCompact(totalInflows)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
          <p className="text-xs text-red-600 dark:text-red-400">Uscite Totali</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrencyCompact(totalOutflows)}
          </p>
        </div>
        <div className={`rounded-lg p-3 text-center ${
          netCashFlow >= 0 
            ? 'bg-blue-50 dark:bg-blue-950' 
            : 'bg-orange-50 dark:bg-orange-950'
        }`}>
          <p className={`text-xs ${
            netCashFlow >= 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            Cash Flow Netto
          </p>
          <p className={`text-lg font-bold ${
            netCashFlow >= 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {formatCurrencyCompact(netCashFlow)}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Media Mensile</p>
          <p className={`text-lg font-bold ${
            avgMonthlyFlow >= 0 ? 'text-primary' : 'text-destructive'
          }`}>
            {formatCurrencyCompact(avgMonthlyFlow)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
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
            
            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
            
            {/* Inflows (positive) */}
            <Bar
              dataKey="total_inflows"
              fill="#10b981"
              name="Entrate"
              radius={[2, 2, 0, 0]}
            />
            
            {/* Outflows (negative) */}
            <Bar
              dataKey="total_outflows_negative"
              fill="#ef4444"
              name="Uscite"
              radius={[0, 0, 2, 2]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Insights */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
        {/* Legend */}
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Entrate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Uscite</span>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="flex space-x-4 text-xs text-muted-foreground">
          {netCashFlow > 0 ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Cash flow positivo</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Cash flow negativo</span>
            </div>
          )}
          
          {/* Trend analysis */}
          {data.length >= 2 && (
            <div className="flex items-center space-x-1">
              {data[data.length - 1].net_cash_flow > data[data.length - 2].net_cash_flow ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Trend crescente</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Trend decrescente</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}