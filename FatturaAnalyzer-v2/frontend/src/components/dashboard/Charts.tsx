import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Scatter,
  ScatterChart,
} from 'recharts';

// Utils
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ChartProps {
  data: any[];
  className?: string;
  height?: number;
  colors?: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatValue?: (value: any) => string;
  formatLabel?: (label: string) => string;
}

// Color palettes
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

const GRADIENT_COLORS = [
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
];

// Custom Tooltip Component
function CustomTooltip({ 
  active, 
  payload, 
  label, 
  formatValue = (v) => v?.toString() || '',
  formatLabel = (l) => l 
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-48">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          {formatLabel(label || '')}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-300">
                {entry.name}:
              </span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100 ml-2">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// Revenue Line Chart
interface RevenueLineChartProps extends ChartProps {
  showTrend?: boolean;
  showArea?: boolean;
}

export function RevenueLineChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  showTrend = false,
  showArea = false 
}: RevenueLineChartProps) {
  const Chart = showArea ? AreaChart : LineChart;
  
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="period" 
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
          <Tooltip 
            content={<CustomTooltip formatValue={formatCurrency} />}
          />
          <Legend />
          
          {showArea ? (
            <>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={colors[0]}
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Fatturato"
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={colors[0]}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Fatturato"
            />
          )}
          
          {showTrend && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke={colors[1]}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Trend"
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

// Cash Flow Bar Chart
interface CashFlowBarChartProps extends ChartProps {
  showNetFlow?: boolean;
}

export function CashFlowBarChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  showNetFlow = true 
}: CashFlowBarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          <Tooltip 
            content={<CustomTooltip formatValue={formatCurrency} />}
          />
          <Legend />
          
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          
          <Bar
            dataKey="inflows"
            fill={colors[0]}
            name="Entrate"
            radius={[2, 2, 0, 0]}
          />
          
          <Bar
            dataKey="outflows"
            fill={colors[1]}
            name="Uscite"
            radius={[2, 2, 0, 0]}
          />
          
          {showNetFlow && (
            <Line
              type="monotone"
              dataKey="netFlow"
              stroke={colors[2]}
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Flusso Netto"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Client Distribution Pie Chart
interface ClientPieChartProps extends ChartProps {
  showLabels?: boolean;
  innerRadius?: number;
}

export function ClientPieChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  showLabels = true,
  innerRadius = 0 
}: ClientPieChartProps) {
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderLabel : false}
            outerRadius={100}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            content={<CustomTooltip formatValue={(v) => `${v} (${((v / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`} />}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Multi-Metric Area Chart
interface MultiMetricAreaChartProps extends ChartProps {
  metrics: string[];
  stackedMode?: boolean;
}

export function MultiMetricAreaChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  metrics,
  stackedMode = false 
}: MultiMetricAreaChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {metrics.map((metric, index) => (
              <linearGradient key={metric} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors[index]} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="period" 
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
          <Tooltip 
            content={<CustomTooltip formatValue={formatCurrency} />}
          />
          <Legend />
          
          {metrics.map((metric, index) => (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stackId={stackedMode ? "1" : undefined}
              stroke={colors[index]}
              strokeWidth={2}
              fill={`url(#gradient${index})`}
              name={metric.charAt(0).toUpperCase() + metric.slice(1)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Scatter Plot for correlation analysis
interface ScatterPlotProps extends ChartProps {
  xDataKey: string;
  yDataKey: string;
  xLabel?: string;
  yLabel?: string;
}

export function ScatterPlot({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  xDataKey,
  yDataKey,
  xLabel,
  yLabel 
}: ScatterPlotProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis 
            type="number" 
            dataKey={xDataKey} 
            name={xLabel || xDataKey}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            type="number" 
            dataKey={yDataKey} 
            name={yLabel || yDataKey}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={<CustomTooltip />}
          />
          <Scatter dataKey={yDataKey} fill={colors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// Horizontal Bar Chart for rankings
interface HorizontalBarChartProps extends ChartProps {
  dataKey: string;
  nameKey: string;
}

export function HorizontalBarChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  dataKey,
  nameKey 
}: HorizontalBarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCurrencyCompact(value)}
          />
          <YAxis 
            type="category" 
            dataKey={nameKey}
            width={100}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            content={<CustomTooltip formatValue={formatCurrency} />}
          />
          <Bar dataKey={dataKey} fill={colors[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Stacked Bar Chart for comparisons
interface StackedBarChartProps extends ChartProps {
  stackKeys: string[];
}

export function StackedBarChart({ 
  data, 
  className, 
  height = 300, 
  colors = DEFAULT_COLORS,
  stackKeys 
}: StackedBarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="period"
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
          <Tooltip 
            content={<CustomTooltip formatValue={formatCurrency} />}
          />
          <Legend />
          
          {stackKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={colors[index % colors.length]}
              name={key.charAt(0).toUpperCase() + key.slice(1)}
              radius={index === stackKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Progress Circle Chart
interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function ProgressCircle({ 
  value, 
  max, 
  size = 120, 
  strokeWidth = 8, 
  color = '#3b82f6',
  label,
  className 
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = (value / max) * 100;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color }}>
              {percentage.toFixed(0)}%
            </div>
            {label && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {label}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini Sparkline Chart
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 30, 
  color = '#3b82f6',
  className 
}: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={cn("", className)}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        className="transition-all duration-300"
      />
    </svg>
  );
}

// Export all chart components
export {
  CustomTooltip,
  RevenueLineChart,
  CashFlowBarChart,
  ClientPieChart,
  MultiMetricAreaChart,
  ScatterPlot,
  HorizontalBarChart,
  StackedBarChart,
  ProgressCircle,
  Sparkline,
  DEFAULT_COLORS,
  GRADIENT_COLORS,
};
