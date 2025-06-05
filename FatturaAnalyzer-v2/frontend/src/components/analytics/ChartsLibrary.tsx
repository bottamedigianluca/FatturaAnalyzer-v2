import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Treemap,
  Sankey,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity,
  Zap,
  Target,
  Eye,
  EyeOff,
  Download,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
  Filter,
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
  Switch,
  Checkbox,
  Slider,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

// Utils
import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
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
  animate?: boolean;
  height?: number;
  formatters?: {
    [key: string]: (value: any) => string;
  };
}

interface AdvancedChartProps extends ChartConfig {
  className?: string;
  interactive?: boolean;
  exportable?: boolean;
  fullscreenable?: boolean;
  customizable?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'
];

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
    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
    </linearGradient>
  </defs>
);

// Custom Tooltip Component
const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  formatters = {} 
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatters?: { [key: string]: (value: any) => string };
}) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-4 min-w-48"
      >
        <p className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600 capitalize">
                  {entry.dataKey.replace('_', ' ')}:
                </span>
              </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {GRADIENT_DEFINITIONS}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => 
                formatters.y ? formatters.y(value) : 
                typeof value === 'number' && value > 1000 ? 
                formatCurrency(value).replace(',00', 'K') : value
              }
            />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={`url(#${['blue', 'green', 'red', 'purple'][index % 4]}Gradient)`}
                strokeWidth={2}
                animationDuration={2000}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Interactive Bar Chart with Animations
export function InteractiveBarChart({
  data,
  title,
  description,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  showGrid = true,
  height = 300,
  formatters = {},
  className,
  layout = "vertical" as "horizontal" | "vertical",
}: AdvancedChartProps & { layout?: "horizontal" | "vertical" }) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const CustomBar = ({ payload, ...props }: any) => {
    const isHovered = hoveredBar === payload[xKey];
    return (
      <motion.g
        onMouseEnter={() => setHoveredBar(payload[xKey])}
        onMouseLeave={() => setHoveredBar(null)}
        animate={{
          opacity: hoveredBar && !isHovered ? 0.6 : 1,
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <Bar {...props} />
      </motion.g>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout={layout}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              type={layout === "vertical" ? "category" : "number"}
              dataKey={layout === "vertical" ? xKey : undefined}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type={layout === "vertical" ? "number" : "category"}
              dataKey={layout === "horizontal" ? xKey : undefined}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => 
                formatters.y ? formatters.y(value) : 
                typeof value === 'number' && value > 1000 ? 
                formatCurrency(value).replace(',00', 'K') : value
              }
            />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Advanced Pie Chart with Animations
export function EnhancedPieChart({
  data,
  title,
  description,
  colors = DEFAULT_COLORS,
  height = 300,
  formatters = {},
  className,
  innerRadius = 0,
  showLabels = true,
  showPercentages = true,
}: AdvancedChartProps & { 
  innerRadius?: number; 
  showLabels?: boolean; 
  showPercentages?: boolean; 
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!showLabels) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {showPercentages ? `${(percent * 100).toFixed(0)}%` : name}
      </text>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={Math.min(height * 0.35, 120)}
              innerRadius={innerRadius}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1500}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  stroke={activeIndex === index ? "#fff" : "none"}
                  strokeWidth={activeIndex === index ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip formatters={formatters} />}
              cursor={{ fill: 'transparent' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((entry, index) => (
          <motion.div
            key={entry.name}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-lg border cursor-pointer transition-all",
              activeIndex === index 
                ? "bg-gray-100 border-gray-300 shadow-sm" 
                : "bg-white border-gray-200"
            )}
            whileHover={{ scale: 1.05 }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm font-medium">{entry.name}</span>
            <span className="text-xs text-gray-500">
              {formatters.value ? formatters.value(entry.value) : formatCurrency(entry.value)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Radial Progress Chart
export function RadialProgressChart({
  data,
  title,
  description,
  colors = DEFAULT_COLORS,
  height = 300,
  className,
}: AdvancedChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={data}>
            <RadialBar
              minAngle={15}
              label={{ position: 'insideStart', fill: '#fff' }}
              background
              clockWise
              dataKey="value"
              cornerRadius={10}
              fill="#8884d8"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </RadialBar>
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Composed Chart with Multiple Chart Types
export function ComposedAnalyticsChart({
  data,
  title,
  description,
  xKey,
  lineKeys = [],
  barKeys = [],
  areaKeys = [],
  colors = DEFAULT_COLORS,
  showGrid = true,
  height = 300,
  formatters = {},
  className,
}: AdvancedChartProps & { 
  lineKeys?: string[]; 
  barKeys?: string[]; 
  areaKeys?: string[]; 
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            {GRADIENT_DEFINITIONS}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => 
                formatters.y ? formatters.y(value) : 
                typeof value === 'number' && value > 1000 ? 
                formatCurrency(value).replace(',00', 'K') : value
              }
            />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            <Legend />
            
            {areaKeys.map((key, index) => (
              <Area
                key={`area-${key}`}
                type="monotone"
                dataKey={key}
                fill={`url(#${['blue', 'green', 'red', 'purple'][index % 4]}Gradient)`}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
              />
            ))}
            
            {barKeys.map((key, index) => (
              <Bar
                key={`bar-${key}`}
                dataKey={key}
                fill={colors[(areaKeys.length + index) % colors.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
            
            {lineKeys.map((key, index) => (
              <Line
                key={`line-${key}`}
                type="monotone"
                dataKey={key}
                stroke={colors[(areaKeys.length + barKeys.length + index) % colors.length]}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Scatter Plot for Correlation Analysis
export function CorrelationScatterChart({
  data,
  title,
  description,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  formatters = {},
  className,
}: AdvancedChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              type="number"
              dataKey={xKey}
              name={xKey}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="number"
              dataKey={yKeys[0]}
              name={yKeys[0]}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            
            <Scatter
              dataKey={yKeys[0]}
              fill={colors[0]}
              animationDuration={1500}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Chart Container with Controls
export function AdvancedChartContainer({
  children,
  title,
  onExport,
  onFullscreen,
  onRefresh,
  exportable = true,
  fullscreenable = true,
  refreshable = true,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onExport?: () => void;
  onFullscreen?: () => void;
  onRefresh?: () => void;
  exportable?: boolean;
  fullscreenable?: boolean;
  refreshable?: boolean;
  className?: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Card className={cn("border-2 border-gray-200/50", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {refreshable && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Aggiorna dati</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
            
            {exportable && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Esporta grafico</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
            
            {fullscreenable && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsFullscreen(!isFullscreen);
                        onFullscreen?.();
                      }}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFullscreen ? 'Riduci' : 'Espandi'}</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className={cn(
          "transition-all duration-300",
          isFullscreen && "fixed inset-0 z-50 bg-white p-8"
        )}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Export all chart components
export {
  AnimatedLineChart,
  StackedAreaChart,
  InteractiveBarChart,
  EnhancedPieChart,
  RadialProgressChart,
  ComposedAnalyticsChart,
  CorrelationScatterChart,
  AdvancedChartContainer,
  CustomTooltip,
  DEFAULT_COLORS,
};
              <span className="font-semibold text-gray-900">
                {formatters[entry.dataKey] 
                  ? formatters[entry.dataKey](entry.value)
                  : typeof entry.value === 'number' && entry.value > 1000
                    ? formatCurrency(entry.value)
                    : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
};

// Advanced Line Chart with Animations
export function AnimatedLineChart({
  data,
  title,
  description,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  height = 300,
  formatters = {},
  className,
}: AdvancedChartProps) {
  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>(
    yKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
      
      {showLegend && (
        <div className="flex flex-wrap gap-3 mb-4">
          {yKeys.map((key, index) => (
            <motion.button
              key={key}
              onClick={() => setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }))}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border transition-all",
                visibleLines[key] 
                  ? "bg-white border-gray-300 shadow-sm" 
                  : "bg-gray-100 border-gray-200 opacity-50"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-medium capitalize">
                {key.replace('_', ' ')}
              </span>
              {visibleLines[key] ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </motion.button>
          ))}
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {GRADIENT_DEFINITIONS}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey={xKey} 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => 
                formatters.y ? formatters.y(value) : 
                typeof value === 'number' && value > 1000 ? 
                formatCurrency(value).replace(',00', 'K') : value
              }
            />
            <Tooltip content={<CustomTooltip formatters={formatters} />} />
            
            {yKeys.map((key, index) => (
              visibleLines[key] && (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              )
            ))}
            
            {showBrush && <Brush dataKey={xKey} height={30} stroke={colors[0]} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Enhanced Area Chart with Stacking
export function StackedAreaChart({
  data,
  title,
  description,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  showGrid = true,
  height = 300,
  formatters = {},
  className,
  stackOffset = "none" as "expand" | "none" | "wiggle" | "silhouette",
}: AdvancedChartProps & { stackOffset?: "expand" | "none" | "wiggle" | "silhouette" }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
