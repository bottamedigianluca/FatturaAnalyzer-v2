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

// Hooks & Utils - CORRETTI per usare API reali
import { 
  useReconciliationSuggestions,
  useManualReconciliation,
  useReconciliationAnalytics,
  useReconciliationSystemStatus,
  useDragDropReconciliation,
  useReconciliationWorkflow,
  useAutoReconciliation,
  useMLModelTraining
} from '@/hooks/useReconciliation';
import { useInvoices } from '@/hooks/useInvoices';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatDate, formatConfidenceScore } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useUIStore, useReconciliationStore } from '@/store';

// Types - CORRETTI per i dati reali dal backend
import type { Invoice, BankTransaction, ReconciliationSuggestion } from '@/types';

// Interfacce corrette per i dati reali dal backend
interface ReconciliationMatch extends ReconciliationSuggestion {
  id: string;
  invoice: Invoice;
  transaction: BankTransaction;
  // Rimuoviamo i campi simulati e usiamo solo quelli reali dal backend
  visualScore: number;
  tags: string[];
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
// Quantum-inspired sortable item component - CORRETTO
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

// Holographic match indicator con dati reali - CORRETTO
function HolographicMatchIndicator({
  match,
  isActive,
  showDetails = false
}: {
  match: ReconciliationMatch;
  isActive: boolean;
  showDetails?: boolean;
}) {
  const confidence = match.confidence_score;

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
      
      {/* Tooltip con dettagli reali */}
      {showDetails && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/90 text-white text-xs rounded-lg p-3 min-w-48 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span className="font-bold">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Match Type:</span>
              <span className="font-mono text-xs">{match.confidence}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-bold">{formatCurrency(match.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
// Biotech Invoice Card con dati reali - CORRETTO
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
                {invoice.counterparty_name || 'Cliente non specificato'}
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
          {/* Biotech data visualization con dati reali */}
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
            
            {/* Payment status con dati reali */}
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
          
          {/* AI match indicators con dati reali */}
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

// Neural Transaction Card con dati reali - CORRETTO
function NeuralTransactionCard({
  transaction,
  isMatched,
  potentialMatches = 0,
  onQuickView,
}: {
  transaction: BankTransaction;
  isMatched?: boolean;
  potentialMatches?: number;
  onQuickView?: () => void;
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
                  {transaction.description?.slice(0, 35) || 'Transazione'}...
                </CardTitle>
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
          </div>
          
          {/* AI match indicators con dati reali */}
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
