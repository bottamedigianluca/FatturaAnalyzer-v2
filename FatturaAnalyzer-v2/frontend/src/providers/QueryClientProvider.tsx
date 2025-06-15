// Contenuto per frontend/src/components/analytics/ChartsLibrary.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Brush,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  TrendingUp,
  Download,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'composed' | 'radial' | 'treemap' | 'funnel';
  data: ChartDataPoint[];
  title: string;
  description?: string;
  xKey: string;
  yKeys: string[];
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showBrush?: boolean;
  height?: number;
  formatters?: { [key: string]: (value: any) => string };
}

interface AdvancedChartProps extends ChartConfig {
  className?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const GRADIENT_DEFINITIONS = (
  <defs>
    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
    </linearGradient>
    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
    </linearGradient>
  </defs>
);

const CustomTooltip = ({ active, payload, label, formatters = {} }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-4 min-w-[200px]"
      >
        <p className="font-semibold text-foreground mb-3 border-b border-border pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-sm text-muted-foreground capitalize">{entry.name || entry.dataKey}:</span>
              </div>
              <span className="font-semibold text-foreground ml-2">
                {formatters[entry.dataKey] ? formatters[entry.dataKey](entry.value) : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
};

export function AnimatedLineChart({ data, title, description, xKey, yKeys, colors = DEFAULT_COLORS, showGrid = true, showLegend = true, showBrush = false, height = 300, formatters = {}, className }: AdvancedChartProps) {
  return (
      <div className={cn("w-full", className)}>
        <div className="mb-4"><h3 className="text-lg font-semibold text-foreground">{title}</h3>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatters.y ? formatters.y(value) : formatCurrencyCompact(value)} />
              <Tooltip content={<CustomTooltip formatters={formatters} />} />
              {showLegend && <Legend />}
              {yKeys.map((key, index) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1500} />
              ))}
              {showBrush && <Brush dataKey={xKey} height={30} stroke={colors[0]} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
  );
}

export function StackedAreaChart({ data, title, description, xKey, yKeys, colors = DEFAULT_COLORS, showGrid = true, height = 300, formatters = {}, className }: AdvancedChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4"><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {GRADIENT_DEFINITIONS}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatters.y ? formatters.y(value) : formatCurrencyCompact(value)} />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            {yKeys.map((key, index) => (
              <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={colors[index % colors.length]} fill={`url(#${['blue', 'green', 'red', 'purple'][index % 4]}Gradient)`} strokeWidth={2} animationDuration={2000} animationEasing="ease-out" />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function InteractiveBarChart({ data, title, description, xKey, yKeys, colors = DEFAULT_COLORS, showGrid = true, height = 300, formatters = {}, className, layout = "vertical" }: AdvancedChartProps & { layout?: "horizontal" | "vertical" }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4"><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={layout} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis type={layout === "vertical" ? "category" : "number"} dataKey={layout === "vertical" ? xKey : undefined} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type={layout === "vertical" ? "number" : "category"} dataKey={layout === "horizontal" ? xKey : undefined} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatters.y ? formatters.y(value) : formatCurrencyCompact(value)} />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            {yKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EnhancedPieChart({ data, title, description, colors = DEFAULT_COLORS, height = 300, formatters = {}, className, innerRadius = 0, showLabels = true, showPercentages = true }: AdvancedChartProps & { innerRadius?: number; showLabels?: boolean; showPercentages?: boolean; }) {
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!showLabels) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">{showPercentages ? `${(percent * 100).toFixed(0)}%` : name}</text>);
  };
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4"><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={Math.min(height * 0.35, 120)} innerRadius={innerRadius} dataKey="value" animationBegin={0} animationDuration={1500}>
              {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />))}
            </Pie>
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
