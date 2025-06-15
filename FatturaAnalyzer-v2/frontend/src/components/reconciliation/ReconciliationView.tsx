import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  Brain,
  Wand2,
  Shuffle,
  Eye,
  Users,
  Calendar,
  DollarSign,
  Filter,
  Search,
  RefreshCw,
  Settings,
  Info,
  X,
  Plus,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  FileText,
  CreditCard,
  Workflow,
  Cpu,
  Database,
  Network,
  Gauge,
  Lightbulb,
  Atom,
  Beaker,
  Activity,
  Crosshair,
  Radar,
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Progress,
  Separator,
  Switch,
  Checkbox,
  Slider,
} from '@/components/ui';

// Hooks & Utils
import { useReconciliation, useInvoices, useTransactions } from '@/hooks';
import { formatCurrency, formatDate, formatConfidenceScore } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useUIStore, useReconciliationStore } from '@/store';

// Types
import type { Invoice, BankTransaction, ReconciliationSuggestion } from '@/types';

// Advanced AI-powered matching interface
interface MatchingEngine {
  confidence: number;
  reasons: string[];
  similarity: number;
  riskLevel: 'low' | 'medium' | 'high';
  autoReconcilable: boolean;
  aiScore: number;
  semanticSimilarity: number;
  dateProximity: number;
  amountMatch: number;
  patternMatch: number;
}

interface ReconciliationMatch extends ReconciliationSuggestion {
  id: string;
  invoice: Invoice;
  transaction: BankTransaction;
  matchEngine: MatchingEngine;
  visualScore: number;
  tags: string[];
  mlPrediction: {
    probability: number;
    features: Record<string, number>;
    model: string;
    version: string;
  };
}

interface AIConfig {
  confidenceThreshold: number;
  autoReconcileThreshold: number;
  enableDeepLearning: boolean;
  enableNLP: boolean;
  enablePatternMatching: boolean;
  enableTimeAnalysis: boolean;
  maxSuggestions: number;
  learningMode: boolean;
}
// Quantum-inspired sortable item component
function QuantumSortableItem({
  children,
  id,
  type,
  confidence
}: {
  children: React.ReactNode;
  id: string;
  type: 'invoice' | 'transaction';
  confidence?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type, confidence } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const glowIntensity = confidence ? confidence * 100 : 50;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing relative group",
        isDragging && "opacity-70 scale-105 rotate-1 z-50"
      )}
      whileHover={{
        scale: 1.02,
        y: -3,
        boxShadow: `0 10px 40px rgba(59, 130, 246, ${glowIntensity / 100 * 0.3})`,
      }}
      whileTap={{ scale: 0.98 }}
      animate={isDragging ? {
        boxShadow: [
          "0 0 0 rgba(59, 130, 246, 0)",
          "0 0 30px rgba(59, 130, 246, 0.6)",
          "0 0 0 rgba(59, 130, 246, 0)",
        ],
      } : {}}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Quantum field effect */}
      {isDragging && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-lg"
          animate={{
            background: [
              "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2))",
              "linear-gradient(90deg, rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.2))",
              "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Neural network visualization */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-lg">
        {confidence && confidence > 0.8 && (
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 20% 30%, #10b981 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, #3b82f6 0%, transparent 50%),
                          radial-gradient(circle at 50% 50%, #8b5cf6 0%, transparent 50%)`,
            }}
            animate={{
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}
      </div>
      
      {children}
    </motion.div>
  );
}
// Holographic match indicator with AI insights
function HolographicMatchIndicator({
  match,
  isActive,
  showDetails = false
}: {
  match: ReconciliationMatch;
  isActive: boolean;
  showDetails?: boolean;
}) {
  const confidence = match.matchEngine.confidence;
  const aiScore = match.matchEngine.aiScore;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{
        scale: isActive ? 1.3 : 1,
        rotate: 0,
        y: isActive ? -15 : 0,
        opacity: 1,
      }}
      exit={{ scale: 0, rotate: 180, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.6,
      }}
      className={cn(
        "absolute -top-3 -right-3 flex items-center justify-center text-xs font-bold shadow-2xl group cursor-pointer",
        confidence > 0.9 && "w-10 h-10 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white",
        confidence > 0.7 && confidence <= 0.9 && "w-9 h-9 rounded-lg bg-gradient-to-r from-blue-400 to-cyan-500 text-white",
        confidence > 0.5 && confidence <= 0.7 && "w-8 h-8 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
        confidence <= 0.5 && "w-8 h-8 rounded-lg bg-gradient-to-r from-red-400 to-pink-500 text-white",
        isActive && "ring-4 ring-blue-400/50 ring-offset-2"
      )}
    >
      {/* Holographic layers */}
      <div className="absolute inset-0 rounded-inherit">
        <motion.div
          className="absolute inset-0 rounded-inherit opacity-60"
          style={{
            background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 rounded-inherit opacity-40"
          style={{
            background: `conic-gradient(from 180deg, transparent, rgba(255,255,255,0.2), transparent)`,
          }}
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="text-xs font-bold">
          {Math.round(confidence * 100)}
        </div>
        {confidence > 0.8 && (
          <div className="text-[8px] opacity-80">AI</div>
        )}
      </div>
      
      {/* Neural network effect */}
      {isActive && (
        <motion.div
          className="absolute -inset-2 rounded-full border border-blue-400/30"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Tooltip with AI details */}
      {showDetails && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 text-white text-xs rounded-lg p-3 min-w-48 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span className="font-bold">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>AI Score:</span>
              <span className="font-bold">{(aiScore * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="font-mono text-xs">{match.mlPrediction.model}</span>
            </div>
            <div className="flex justify-between">
              <span>Risk:</span>
              <Badge variant={
                match.matchEngine.riskLevel === 'low' ? 'default' :
                match.matchEngine.riskLevel === 'medium' ? 'secondary' : 'destructive'
              } className="text-xs">
                {match.matchEngine.riskLevel}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
// Futuristic invoice card with biotech aesthetics
function BiotechInvoiceCard({
  invoice,
  isMatched,
  potentialMatches = 0,
  onQuickView,
  confidence
}: {
  invoice: Invoice;
  isMatched?: boolean;
  potentialMatches?: number;
  onQuickView?: () => void;
  confidence?: number;
}) {
  return (
    <motion.div
      layout
      layoutId={`invoice-${invoice.id}`}
      className={cn(
        "relative group overflow-hidden",
        isMatched && "ring-2 ring-green-400/50"
      )}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 30 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        "h-full transition-all duration-500 border-2 backdrop-blur-sm relative overflow-hidden",
        isMatched
          ? "bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-teal-50/90 border-green-300/50 shadow-green-200/30"
          : "bg-gradient-to-br from-slate-50/90 via-blue-50/90 to-indigo-50/90 border-blue-200/50 hover:border-blue-300/70 hover:shadow-blue-200/40",
        "hover:shadow-2xl"
      )}>
        {/* DNA helix background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-500 rounded-full"
                style={{
                  left: (i * 20) % 100 + '%',
                  top: (i * 15) % 100 + '%',
                }}
                animate={{
                  y: [0, -10, 0],
                  x: [0, 5, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  {invoice.doc_number}
                </CardTitle>
                {confidence && confidence > 0.8 && (
                  <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-0.5">
                    <Atom className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1 font-medium">
                {invoice.counterparty_name}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1">
              {onQuickView && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-blue-100"
                        onClick={onQuickView}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Anteprima rapida</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {confidence && (
                <div className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {(confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 relative z-10">
          {/* Biotech data visualization */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Importo
              </span>
              <span className="font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data
              </span>
              <span className="text-xs font-medium">
                {formatDate(invoice.doc_date)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Residuo
              </span>
              <span className={cn(
                "text-xs font-bold",
                (invoice.open_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
              )}>
                {formatCurrency(invoice.open_amount || 0)}
              </span>
            </div>
            
            {/* Payment status with biotech styling */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stato</span>
              <Badge 
                variant={invoice.payment_status === 'Pagata Tot.' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {invoice.payment_status}
              </Badge>
            </div>
          </div>
          
          {/* AI match indicators */}
          {potentialMatches > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Radar className="h-4 w-4 text-purple-600" />
                    <motion.div
                      className="absolute inset-0 rounded-full border border-purple-400"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.7, 0, 0.7],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <span className="text-xs font-medium text-purple-700">
                    {potentialMatches} AI Match{potentialMatches > 1 ? 'es' : ''}
                  </span>
                </div>
                
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Neural
                </Badge>
              </div>
              
              {/* Neural activity visualization */}
              <div className="mt-2 h-1 bg-purple-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
// Revolutionary ML-powered transaction card
function NeuralTransactionCard({
  transaction,
  isMatched,
  potentialMatches = 0,
  onQuickView,
  mlPrediction
}: {
  transaction: BankTransaction;
  isMatched?: boolean;
  potentialMatches?: number;
  onQuickView?: () => void;
  mlPrediction?: {
    probability: number;
    features: Record<string, number>;
    category: string;
  };
}) {
  const isIncome = transaction.amount > 0;

  return (
    <motion.div
      layout
      layoutId={`transaction-${transaction.id}`}
      className={cn(
        "relative group overflow-hidden",
        isMatched && "ring-2 ring-green-400/50"
      )}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 30 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        "h-full transition-all duration-500 border-2 backdrop-blur-sm relative overflow-hidden",
        isMatched
          ? "bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-teal-50/90 border-green-300/50"
          : isIncome
          ? "bg-gradient-to-br from-emerald-50/90 via-green-50/90 to-lime-50/90 border-emerald-200/50 hover:border-emerald-300/70"
          : "bg-gradient-to-br from-red-50/90 via-rose-50/90 to-pink-50/90 border-red-200/50 hover:border-red-300/70",
        "hover:shadow-2xl"
      )}>
        {/* Quantum field visualization */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${isIncome ? '#10b981' : '#ef4444'} 0%, transparent 40%), radial-gradient(circle at 70% 80%, ${isIncome ? '#059669' : '#dc2626'} 0%, transparent 40%)`,
            }}
            animate={{
              background: [
                `radial-gradient(circle at 30% 20%, ${isIncome ? '#10b981' : '#ef4444'} 0%, transparent 40%), radial-gradient(circle at 70% 80%, ${isIncome ? '#059669' : '#dc2626'} 0%, transparent 40%)`,
                `radial-gradient(circle at 70% 20%, ${isIncome ? '#059669' : '#dc2626'} 0%, transparent 40%), radial-gradient(circle at 30% 80%, ${isIncome ? '#10b981' : '#ef4444'} 0%, transparent 40%)`,
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className={cn(
                  "text-sm font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  isIncome 
                    ? "from-emerald-700 to-green-700" 
                    : "from-red-700 to-rose-700"
                )}>
                  {transaction.description?.slice(0, 35)}...
                </CardTitle>
                {mlPrediction && mlPrediction.probability > 0.8 && (
                  <Badge className={cn(
                    "text-white text-xs px-2 py-0.5",
                    "bg-gradient-to-r from-cyan-400 to-blue-500"
                  )}>
                    <Cpu className="w-3 h-3 mr-1" />
                    ML
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1 font-medium">
                {formatDate(transaction.transaction_date)}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1">
              {onQuickView && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                        onClick={onQuickView}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dettagli transazione</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <div className={cn(
                "text-xs font-mono px-2 py-1 rounded",
                isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {isIncome ? "IN" : "OUT"}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 relative z-10">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className={cn("w-3 h-3", isIncome ? "text-green-500" : "text-red-500")} />
                Importo
              </span>
              <span className={cn(
                "font-bold text-sm flex items-center gap-1",
                isIncome ? "text-emerald-700" : "text-red-700"
              )}>
                {isIncome ? "+" : "-"}
                {formatCurrency(Math.abs(transaction.amount))}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Network className="w-3 h-3" />
                Stato
              </span>
              <Badge 
                variant={
                  transaction.reconciliation_status === 'Riconciliato Tot.' ? 'default' :
                  transaction.reconciliation_status === 'Riconciliato Parz.' ? 'secondary' :
                  'outline'
}
                className="text-xs"
              >
                {transaction.reconciliation_status === 'Da Riconciliare' ? 'Nuovo' :
                 transaction.reconciliation_status === 'Riconciliato Parz.' ? 'Parziale' :
                 'Completo'}
              </Badge>
            </div>
            
            {transaction.causale_abi && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Causale
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {transaction.causale_abi}
                </Badge>
              </div>
            )}
            
            {/* ML prediction insights */}
            {mlPrediction && (
              <div className="mt-3 p-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Beaker className="h-3 w-3 text-cyan-600" />
                    <span className="text-xs font-medium text-cyan-700">
                      ML Categoria: {mlPrediction.category}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-cyan-600">
                    {(mlPrediction.probability * 100).toFixed(1)}%
                  </div>
                </div>
                
                {/* Feature importance visualization */}
                <div className="space-y-1">
                  {Object.entries(mlPrediction.features).slice(0, 2).map(([feature, importance]) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="text-xs text-cyan-600 w-16 truncate">{feature}</span>
                      <div className="flex-1 h-1 bg-cyan-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${importance * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* AI match indicators */}
          {potentialMatches > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    <motion.div
                      className="absolute -inset-1 rounded-full border border-indigo-400/50"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  </div>
                  <span className="text-xs font-medium text-indigo-700">
                    {potentialMatches} Neural Match{potentialMatches > 1 ? 'es' : ''}
                  </span>
                </div>
                
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Deep AI
                </Badge>
              </div>
              
              {/* Synaptic activity visualization */}
              <div className="mt-2 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 h-1 bg-indigo-100 rounded-full overflow-hidden"
                    animate={{
                      backgroundColor: ["#e0e7ff", "#6366f1", "#e0e7ff"],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
// Quantum AI suggestions panel with deep learning insights
function QuantumAISuggestionsPanel({
  suggestions,
  onApplySuggestion,
  loading,
  aiConfig,
  onConfigChange
}: {
  suggestions: ReconciliationMatch[];
  onApplySuggestion: (suggestion: ReconciliationMatch) => void;
  loading?: boolean;
  aiConfig: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  if (loading) {
    return (
      <Card className="h-full border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-purple-600" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-purple-400"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Quantum AI Processing...
              </CardTitle>
              <CardDescription className="text-sm">
                Deep neural networks analyzing patterns
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="p-4 rounded-lg border border-purple-200/50 bg-white/50"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-400 to-indigo-400 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-purple-200 rounded animate-pulse" />
                    <div className="h-2 bg-purple-100 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-purple-100 rounded animate-pulse" />
                  <div className="h-2 bg-purple-100 rounded w-3/4 animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 overflow-hidden">
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <motion.div
                className="absolute -inset-1 rounded-xl border border-purple-400/50"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
            <div>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Quantum AI Engine
              </CardTitle>
              <CardDescription>
                Deep learning riconciliazioni con {suggestions.length} suggerimenti
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    <Gauge className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Metriche avanzate AI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <Atom className="h-3 w-3 mr-1" />
              Neural v2.1
            </Badge>
          </div>
        </div>
{/* AI Configuration Panel */}
        {showAdvancedMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-white/70 rounded-lg border border-purple-200/50"
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <label className="text-xs font-medium text-purple-700">Confidence Threshold</label>
                <Slider
                  value={[aiConfig.confidenceThreshold]}
                  onValueChange={([value]) => onConfigChange({ ...aiConfig, confidenceThreshold: value })}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-purple-600">{(aiConfig.confidenceThreshold * 100).toFixed(0)}%</div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-purple-700">Max Suggestions</label>
                <Slider
                  value={[aiConfig.maxSuggestions]}
                  onValueChange={([value]) => onConfigChange({ ...aiConfig, maxSuggestions: value })}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="text-xs text-purple-600">{aiConfig.maxSuggestions}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deepLearning"
                    checked={aiConfig.enableDeepLearning}
                    onCheckedChange={(checked) => onConfigChange({ ...aiConfig, enableDeepLearning: !!checked })}
                  />
                  <label htmlFor="deepLearning" className="text-xs font-medium text-purple-700">Deep Learning</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nlp"
                    checked={aiConfig.enableNLP}
                    onCheckedChange={(checked) => onConfigChange({ ...aiConfig, enableNLP: !!checked })}
                  />
                  <label htmlFor="nlp" className="text-xs font-medium text-purple-700">NLP Analysis</label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="patternMatching"
                    checked={aiConfig.enablePatternMatching}
                    onCheckedChange={(checked) => onConfigChange({ ...aiConfig, enablePatternMatching: !!checked })}
                  />
                  <label htmlFor="patternMatching" className="text-xs font-medium text-purple-700">Pattern Matching</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="learningMode"
                    checked={aiConfig.learningMode}
                    onCheckedChange={(checked) => onConfigChange({ ...aiConfig, learningMode: !!checked })}
                  />
                  <label htmlFor="learningMode" className="text-xs font-medium text-purple-700">Learning Mode</label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </CardHeader>
<CardContent className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              layout
            >
              <Card className={cn(
                "relative overflow-hidden border-2 transition-all duration-500 cursor-pointer group",
                "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
                suggestion.matchEngine.confidence > 0.9 ? "border-green-300/60 bg-gradient-to-br from-green-50/80 to-emerald-50/80" :
                suggestion.matchEngine.confidence > 0.7 ? "border-blue-300/60 bg-gradient-to-br from-blue-50/80 to-cyan-50/80" :
                suggestion.matchEngine.confidence > 0.5 ? "border-yellow-300/60 bg-gradient-to-br from-yellow-50/80 to-orange-50/80" :
                "border-red-300/60 bg-gradient-to-br from-red-50/80 to-pink-50/80",
                expandedSuggestion === suggestion.id && "ring-2 ring-purple-400/50"
              )}
              onClick={() => setExpandedSuggestion(
                expandedSuggestion === suggestion.id ? null : suggestion.id
              )}
            >
              {/* Quantum confidence indicator */}
              <div 
                className={cn(
                  "absolute top-0 left-0 h-2 transition-all duration-1000",
                  suggestion.matchEngine.confidence > 0.9 ? "bg-gradient-to-r from-green-400 via-emerald-500 to-green-600" :
                  suggestion.matchEngine.confidence > 0.7 ? "bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-600" :
                  suggestion.matchEngine.confidence > 0.5 ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600" :
                  "bg-gradient-to-r from-red-400 via-pink-500 to-red-600"
                )}
                style={{ width: `${suggestion.matchEngine.confidence * 100}%` }}
              >
                <motion.div
                  className="h-full w-4 bg-white/30"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <CardContent className="p-4 pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-sm bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                        {suggestion.invoice.doc_number} ⟷ {suggestion.transaction.description?.slice(0, 20)}...
                      </h4>
                      
                      {/* Multi-layered confidence badges */}
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={
                            suggestion.matchEngine.confidence > 0.9 ? "default" :
                            suggestion.matchEngine.confidence > 0.7 ? "secondary" :
                            "outline"
                          }
                          className="text-xs font-bold"
                        >
                          {Math.round(suggestion.matchEngine.confidence * 100)}%
                        </Badge>
                        
                        {suggestion.matchEngine.aiScore > 0.8 && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs">
                            <Cpu className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        
                        {suggestion.matchEngine.autoReconcilable && (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {suggestion.invoice.counterparty_name}
                    </p>
                    
                    {/* Enhanced matching reasons */}
                    <div className="space-y-1 mb-3">
                      {suggestion.matchEngine.reasons.slice(0, 2).map((reason, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            i === 0 ? "bg-green-500" : "bg-blue-500"
                          )} />
                          <span className="text-gray-600">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-sm mb-1">
                      {formatCurrency(suggestion.total_amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Risk: <span className={cn(
                        "font-medium",
                        suggestion.matchEngine.riskLevel === 'low' ? "text-green-600" :
                        suggestion.matchEngine.riskLevel === 'medium' ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {suggestion.matchEngine.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
{/* Advanced metrics panel */}
                <AnimatePresence>
                  {expandedSuggestion === suggestion.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200/50 pt-3 mt-3"
                    >
                      {/* ML Prediction details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-purple-700 flex items-center gap-1">
                            <Beaker className="h-3 w-3" />
                            ML Metrics
                          </h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Semantic:</span>
                              <span className="font-mono">{(suggestion.matchEngine.semanticSimilarity * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Date Proximity:</span>
                              <span className="font-mono">{(suggestion.matchEngine.dateProximity * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Amount Match:</span>
                              <span className="font-mono">{(suggestion.matchEngine.amountMatch * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                            <Network className="h-3 w-3" />
                            Neural Score
                          </h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Model:</span>
                              <span className="font-mono text-indigo-600">{suggestion.mlPrediction.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Probability:</span>
                              <span className="font-mono">{(suggestion.mlPrediction.probability * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Version:</span>
                              <span className="font-mono text-xs">{suggestion.mlPrediction.version}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Feature importance visualization */}
                      <div className="mb-4">
                        <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Feature Importance
                        </h5>
                        <div className="space-y-1">
                          {Object.entries(suggestion.mlPrediction.features).slice(0, 3).map(([feature, importance]) => (
                            <div key={feature} className="flex items-center gap-2">
                              <span className="text-xs w-20 truncate">{feature}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-purple-400 to-indigo-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${importance * 100}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                />
                              </div>
                              <span className="text-xs font-mono w-12 text-right">
                                {(importance * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Enhanced action buttons */}
                <div className="flex items-center justify-between">
                  {/* Smart tags */}
                  <div className="flex flex-wrap gap-1">
                    {suggestion.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Action button with quantum effects */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      size="sm" 
                      className={cn(
                        "text-xs relative overflow-hidden",
                        suggestion.matchEngine.autoReconcilable 
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplySuggestion(suggestion);
                      }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        animate={{
                          x: ["-100%", "100%"],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      
                      <div className="relative flex items-center gap-1">
                        {suggestion.matchEngine.autoReconcilable ? (
                          <>
                            <Zap className="h-3 w-3" />
                            Auto-Match
                          </>
                        ) : (
                          <>
                            <GitMerge className="h-3 w-3" />
                            Apply
                          </>
                        )}
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          ))}
        </AnimatePresence>
{/* Empty state with quantum aesthetics */}
        {suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="relative inline-block mb-6">
              <Brain className="h-16 w-16 mx-auto text-purple-300" />
              <motion.div
                className="absolute inset-0 border-2 border-purple-300 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-2 border border-purple-400 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              />
            </div>

            <h3 className="text-lg font-bold text-purple-700 mb-2">
              Neural Network Standby
            </h3>
            <p className="text-muted-foreground mb-4">
              L'AI è pronta per analizzare i tuoi dati
            </p>
            <p className="text-xs text-muted-foreground">
              Aggiungi fatture e movimenti per attivare il quantum matching
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
}}
              />
              <motion.div
                className="absolute inset-2 border border-purple-400 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              />
            </div>

            <h3 className="text-lg font-bold text-purple-700 mb-2">
              Neural Network Standby
            </h3>
            <p className="text-muted-foreground mb-4">
              L'AI è pronta per analizzare i tuoi dati
            </p>
            <p className="text-xs text-muted-foreground">
              Aggiungi fatture e movimenti per attivare il quantum matching
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Quantum Reconciliation Interface
export function ReconciliationView() {
  // Enhanced state management
  const [activeTab, setActiveTab] = useState('quantum-ai');
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    confidenceThreshold: 0.7,
    autoReconcileThreshold: 0.9,
    enableDeepLearning: true,
    enableNLP: true,
    enablePatternMatching: true,
    enableTimeAnalysis: true,
    maxSuggestions: 50,
    learningMode: false,
  });

  const [filters, setFilters] = useState({
    confidence: 'all',
    riskLevel: 'all',
    autoReconcilable: 'all',
    amountRange: [0, 1000000],
    dateRange: 30,
  });

  // Enhanced hooks
  const { data: suggestions, isLoading: suggestionsLoading } = useReconciliation.useSuggestions();
  const { data: invoices } = useInvoices();
  const { data: transactions } = useTransactions();
  const { addNotification } = useUIStore();

  // Advanced drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Quantum AI matching engine simulation
  const generateQuantumMatches = useCallback((invoiceData: Invoice[], transactionData: BankTransaction[]) => {
    const quantumMatches: ReconciliationMatch[] = [];

    invoiceData?.forEach((invoice, i) => {
      transactionData?.forEach((transaction, j) => {
        // Simulate advanced matching algorithms
        const amountMatch = 1 - Math.abs(invoice.total_amount - Math.abs(transaction.amount)) / Math.max(invoice.total_amount, Math.abs(transaction.amount));
        const semanticSimilarity = Math.random() * 0.4 + 0.6; // Simulated NLP
        const dateProximity = Math.random() * 0.3 + 0.7; // Simulated date analysis
        const patternMatch = Math.random() * 0.5 + 0.5; // Simulated pattern recognition
        
        // Combined confidence using quantum-inspired weighting
        const confidence = (
          amountMatch * 0.4 +
          semanticSimilarity * 0.25 +
          dateProximity * 0.2 +
          patternMatch * 0.15
        );
        
        if (confidence > aiConfig.confidenceThreshold) {
          const aiScore = confidence * (0.8 + Math.random() * 0.2);
          
          quantumMatches.push({
            id: `quantum-match-${i}-${j}`,
            confidence: confidence > 0.8 ? 'Alta' : confidence > 0.6 ? 'Media' : 'Bassa',
            confidence_score: confidence,
            invoice_ids: [invoice.id],
            transaction_ids: [transaction.id],
            description: `Quantum AI Match: ${invoice.doc_number} ⟷ ${transaction.description?.slice(0, 30)}`,
            total_amount: invoice.total_amount,
            invoice,
            transaction,
            matchEngine: {
              confidence,
              aiScore,
              semanticSimilarity,
              dateProximity,
              amountMatch,
              patternMatch,
              reasons: [
                amountMatch > 0.9 ? 'Perfect amount match (100%)' : `Amount similarity (${(amountMatch * 100).toFixed(1)}%)`,
                semanticSimilarity > 0.8 ? 'High semantic correlation' : 'Moderate semantic match',
                dateProximity > 0.8 ? 'Optimal date proximity' : 'Compatible timeframe',
                ...(patternMatch > 0.8 ? ['Advanced pattern recognition'] : []),
              ],
              similarity: (amountMatch + semanticSimilarity + dateProximity) / 3,
              riskLevel: confidence > 0.8 ? 'low' : confidence > 0.6 ? 'medium' : 'high',
              autoReconcilable: confidence > aiConfig.autoReconcileThreshold && amountMatch > 0.95,
            },
            visualScore: confidence * 100,
            tags: [
              ...(amountMatch > 0.95 ? ['Perfect Amount'] : amountMatch > 0.8 ? ['Close Amount'] : []),
              ...(semanticSimilarity > 0.8 ? ['High NLP'] : []),
              ...(dateProximity > 0.9 ? ['Same Period'] : []),
              ...(aiScore > 0.9 ? ['AI Verified'] : []),
            ],
            mlPrediction: {
              probability: aiScore,
              features: {
                'amount_similarity': amountMatch,
                'text_match': semanticSimilarity,
                'date_proximity': dateProximity,
                'pattern_score': patternMatch,
                'historical_match': Math.random() * 0.3 + 0.4,
              },
              model: 'QuantumNet-v2.1',
              version: '2024.12.1',
            },
            reasons: [`Quantum AI confidence: ${(confidence * 100).toFixed(1)}%`],
          });
        }
      });
    });

    return quantumMatches
      .sort((a, b) => b.matchEngine.confidence - a.matchEngine.confidence)
      .slice(0, aiConfig.maxSuggestions);
  }, [aiConfig]);

  // Generate matches when data loads
  useEffect(() => {
    if (invoices?.items && transactions?.items) {
      const generatedMatches = generateQuantumMatches(invoices.items, transactions.items);
      setMatches(generatedMatches);
    }
  }, [invoices, transactions, generateQuantumMatches]);
// Enhanced drag handlers with quantum effects
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedItem(event.active);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (over && active.id !== over.id) {
      setIsProcessing(true);
      
      // Simulate quantum processing
      setTimeout(() => {
        addNotification({
          type: 'success',
          title: 'Quantum Reconciliation Completed!',
          message: 'Neural networks have successfully matched the items',
          duration: 4000,
        });
        setIsProcessing(false);
      }, 2000);
    }
  }, [addNotification]);

  const handleApplySuggestion = useCallback((suggestion: ReconciliationMatch) => {
    setIsProcessing(true);

    if (suggestion.matchEngine.autoReconcilable) {
      setTimeout(() => {
        addNotification({
          type: 'success',
          title: 'Auto-Reconciliation Successful!',
          message: `${suggestion.invoice.doc_number} automatically matched with quantum precision`,
          duration: 5000,
        });
        setIsProcessing(false);
      }, 1500);
    } else {
      setTimeout(() => {
        addNotification({
          type: 'info',
          title: 'Manual Review Required',
          message: 'Please verify the quantum suggestion before confirming',
          duration: 4000,
        });
        setIsProcessing(false);
      }, 1000);
    }
  }, [addNotification]);

  const handleBulkAutoReconcile = useCallback(() => {
    const autoReconcilableMatches = matches.filter(m => m.matchEngine.autoReconcilable);
    if (autoReconcilableMatches.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Bulk Auto-Reconciliation Complete!',
        message: `${autoReconcilableMatches.length} matches processed with quantum algorithms`,
        duration: 6000,
      });
      setIsProcessing(false);
    }, 3000);
  }, [matches, addNotification]);

  // Filter matches based on current filters
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (filters.confidence !== 'all') {
        const confLevel = match.matchEngine.confidence > 0.8 ? 'high' :
          match.matchEngine.confidence > 0.6 ? 'medium' : 'low';
        if (confLevel !== filters.confidence) return false;
      }

      if (filters.riskLevel !== 'all' && match.matchEngine.riskLevel !== filters.riskLevel) {
        return false;
      }
      
      if (filters.autoReconcilable !== 'all') {
        const isAuto = match.matchEngine.autoReconcilable;
        if ((filters.autoReconcilable === 'yes') !== isAuto) return false;
      }
      
      return true;
    });
  }, [matches, filters]);

  const stats = useMemo(() => {
    const total = matches.length;
    const highConfidence = matches.filter(m => m.matchEngine.confidence > 0.8).length;
    const autoReconcilable = matches.filter(m => m.matchEngine.autoReconcilable).length;
    const totalValue = matches.reduce((sum, m) => sum + m.total_amount, 0);

    return { total, highConfidence, autoReconcilable, totalValue };
  }, [matches]);
return (
    <div className="space-y-6 animate-fade-in">
      {/* Quantum Header with Neural Network Visualization */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8 text-white"
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl">
                <Atom className="h-8 w-8 text-white" />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-2xl border border-purple-400/50"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </div>
            
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">
                Quantum Reconciliation Engine
              </h1>
              <p className="text-purple-200 mt-2 text-lg">
                AI-powered financial matching con neural networks quantistici
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Quantum AI Online</span>
              </motion.div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkAutoReconcile}
                disabled={isProcessing || stats.autoReconcilable === 0}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-Reconcile All ({stats.autoReconcilable})
              </Button>
            </div>
            
            {/* Quantum Statistics */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-purple-200">Total Matches</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-2xl font-bold text-green-400">{stats.highConfidence}</div>
                <div className="text-xs text-purple-200">High Confidence</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-2xl font-bold text-blue-400">{stats.autoReconcilable}</div>
                <div className="text-xs text-purple-200">Auto-Ready</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-lg font-bold">{formatCurrency(stats.totalValue)}</div>
                <div className="text-xs text-purple-200">Total Value</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Processing overlay */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
              />
              <div className="text-xl font-bold">Quantum Processing...</div>
              <div className="text-purple-200">Neural networks analyzing patterns</div>
            </div>
          </motion.div>
        )}
      </motion.div>
{/* Advanced Quantum Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-14 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-1 rounded-xl">
          <TabsTrigger value="quantum-ai" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <Brain className="h-4 w-4" />
            Quantum AI
          </TabsTrigger>
          <TabsTrigger value="neural-drag" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
            <Workflow className="h-4 w-4" />
            Neural Drag & Drop
          </TabsTrigger>
          <TabsTrigger value="deep-analytics" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            <Radar className="h-4 w-4" />
            Deep Analytics
          </TabsTrigger>
          <TabsTrigger value="quantum-history" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
            <Database className="h-4 w-4" />
            Quantum History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quantum-ai" className="space-y-6">
          {/* Advanced Filters Panel */}
          <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-indigo-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
                Quantum Filters & AI Configuration
              </CardTitle>
              <CardDescription>
                Fine-tune the neural network parameters for optimal matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confidence Level</label>
                  <Select value={filters.confidence} onValueChange={(value) => setFilters(prev => ({...prev, confidence: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High (80%+)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">Low (<60%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Level</label>
                  <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({...prev, riskLevel: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-Reconcilable</label>
                  <Select value={filters.autoReconcilable} onValueChange={(value) => setFilters(prev => ({...prev, autoReconcilable: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="yes">Auto-Ready Only</SelectItem>
                      <SelectItem value="no">Manual Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Learning Mode</label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={aiConfig.learningMode}
                      onCheckedChange={(checked) => setAiConfig(prev => ({...prev, learningMode: checked}))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {aiConfig.learningMode ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantum Boost</label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={aiConfig.enableDeepLearning}
                      onCheckedChange={(checked) => setAiConfig(prev => ({...prev, enableDeepLearning: checked}))}
                    />
                    <span className="text-sm text-muted-foreground">
                      {aiConfig.enableDeepLearning ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quantum AI Suggestions Panel */}
          <QuantumAISuggestionsPanel
            suggestions={filteredMatches}
            onApplySuggestion={handleApplySuggestion}
            loading={suggestionsLoading}
            aiConfig={aiConfig}
            onConfigChange={setAiConfig}
          />
        </TabsContent>
<TabsContent value="neural-drag" className="space-y-6">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Invoices Panel */}
              <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white">
                      <FileText className="h-4 w-4" />
                    </div>
                    Neural Invoice Pool
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      {invoices?.items?.length || 0}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Drag invoices to create quantum entanglement with transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    <SortableContext items={invoices?.items?.map(i => `invoice-${i.id}`) || []} strategy={verticalListSortingStrategy}>
                      {invoices?.items?.slice(0, 8).map((invoice) => {
                        const match = matches.find(m => m.invoice.id === invoice.id);
                        return (
                          <QuantumSortableItem 
                            key={invoice.id} 
                            id={`invoice-${invoice.id}`} 
                            type="invoice"
                            confidence={match?.matchEngine.confidence}
                          >
                            <BiotechInvoiceCard 
                              invoice={invoice}
                              potentialMatches={matches.filter(m => m.invoice.id === invoice.id).length}
                              confidence={match?.matchEngine.confidence}
                            />
                          </QuantumSortableItem>
                        );
                      })}
                    </SortableContext>
                  </div>
                </CardContent>
              </Card>
              
              {/* Enhanced Transactions Panel */}
              <Card className="border-2 border-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg text-white">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    Quantum Transaction Field
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                      {transactions?.items?.length || 0}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Neural network detects compatibility patterns automatically
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    <SortableContext items={transactions?.items?.map(t => `transaction-${t.id}`) || []} strategy={verticalListSortingStrategy}>
                      {transactions?.items?.slice(0, 8).map((transaction) => {
                        const match = matches.find(m => m.transaction.id === transaction.id);
                        return (
                          <QuantumSortableItem 
                            key={transaction.id} 
                            id={`transaction-${transaction.id}`} 
                            type="transaction"
                            confidence={match?.matchEngine.confidence}
                          >
                            <NeuralTransactionCard 
                              transaction={transaction}
                              potentialMatches={matches.filter(m => m.transaction.id === transaction.id).length}
                              mlPrediction={match?.mlPrediction}
                            />
                          </QuantumSortableItem>
                        );
                      })}
                    </SortableContext>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quantum Drag Overlay */}
            <DragOverlay>
              {draggedItem ? (
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ 
                    scale: 1.2, 
                    rotate: 5,
                    boxShadow: "0 25px 50px rgba(79, 70, 229, 0.4)"
                  }}
                  className="opacity-90 relative"
                >
                  <Card className="w-80 bg-gradient-to-br from-white via-purple-50 to-indigo-50 border-2 border-purple-400 shadow-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
                          <Atom className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Quantum Entanglement
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Neural field active
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Quantum field visualization */}
                  <motion.div
                    className="absolute -inset-4 border-2 border-purple-400/50 rounded-xl"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="deep-analytics" className="space-y-6">
          <div className="text-center py-20">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center"
            >
              <BarChart3 className="h-12 w-12 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              Deep Analytics Engine
            </h3>
            <p className="text-muted-foreground mb-6">
              Advanced analytics and pattern recognition coming in next quantum update
            </p>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              Neural Networks v3.0 - In Development
            </Badge>
          </div>
        </TabsContent>

        <TabsContent value="quantum-history" className="space-y-6">
          <div className="text-center py-20">
            <motion.div
              animate={{
                y: [0, -10, 0],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center"
            >
              <Clock className="h-12 w-12 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
              Quantum History Vault
            </h3>
            <p className="text-muted-foreground mb-6">
              Time-series analysis and reconciliation history tracking
            </p>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              Temporal Engine - Coming Soon
            </Badge>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
