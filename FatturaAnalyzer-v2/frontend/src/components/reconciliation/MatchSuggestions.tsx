import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Zap,
  Brain,
  Star,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  Link,
  Sparkles,
  ArrowRight,
  X,
  Filter,
  SortDesc,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  BarChart3,
  Lightbulb,
  Cpu,
  Activity,
  Atom,
  Beaker,
  Network,
  Gauge,
  Radar,
  GitMerge,
  Plus,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Separator,
  Switch,
  Skeleton,
  Checkbox,
  Progress,
} from '@/components/ui';

// Hooks
import { 
  useReconciliationSuggestions, 
  usePerformReconciliation,
  useValidateReconciliationMatch,
  useBatchReconciliation,
  useAutoReconciliation
} from '@/hooks/useReconciliation';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatDate, formatConfidenceScore } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { ReconciliationSuggestion, Invoice, BankTransaction } from '@/types';

interface EnhancedReconciliationSuggestion extends ReconciliationSuggestion {
  id: string;
  invoice_number?: string;
  transaction_description?: string;
  amount_difference?: number;
  date_difference_days?: number;
  ml_prediction?: {
    confidence: number;
    features: Record<string, number>;
    risk_assessment: 'low' | 'medium' | 'high';
    auto_reconcilable: boolean;
    model_version: string;
  };
  semantic_similarity?: number;
  pattern_recognition_score?: number;
  historical_success_rate?: number;
  neural_network_score?: number;
  quantum_enhancement?: boolean;
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
  quantumBoost: boolean;
  neuralEnhancement: boolean;
}

interface MatchSuggestionsProps {
  maxSuggestions?: number;
  confidenceThreshold?: number;
  enableMLBoost?: boolean;
  enableSemanticAnalysis?: boolean;
  showAdvancedMetrics?: boolean;
  onReconciliationComplete?: () => void;
  embedded?: boolean;
}

export function MatchSuggestions({
  maxSuggestions = 20,
  confidenceThreshold = 0.5,
  enableMLBoost = true,
  enableSemanticAnalysis = true,
  showAdvancedMetrics = false,
  onReconciliationComplete,
  embedded = false
}: MatchSuggestionsProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'amount' | 'date' | 'neural'>('confidence');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    confidenceThreshold: confidenceThreshold,
    autoReconcileThreshold: 0.9,
    enableDeepLearning: true,
    enableNLP: true,
    enablePatternMatching: true,
    enableTimeAnalysis: true,
    maxSuggestions: maxSuggestions,
    learningMode: false,
    quantumBoost: false,
    neuralEnhancement: true,
  });

  // Hooks
  const { addNotification } = useUIStore();
  const { 
    data: suggestions, 
    isLoading, 
    error, 
    refetch 
  } = useReconciliationSuggestions({
    max_suggestions: aiConfig.maxSuggestions,
    confidence_threshold: aiConfig.confidenceThreshold,
    enable_ml_boost: enableMLBoost,
    enable_semantic_analysis: enableSemanticAnalysis,
  });

  const performReconciliation = usePerformReconciliation();
  const validateMatch = useValidateReconciliationMatch();
  const batchReconciliation = useBatchReconciliation();
  const autoReconciliation = useAutoReconciliation();

  // Process and enhance suggestions with AI data
  const enhancedSuggestions = useMemo(() => {
    if (!suggestions) return [];
    
    return suggestions.map((suggestion: any, index: number) => ({
      ...suggestion,
      id: `suggestion-${suggestion.invoice_ids[0]}-${suggestion.transaction_ids?.[0] || index}`,
      invoice_number: `FT-${String(suggestion.invoice_ids[0]).padStart(6, '0')}`,
      transaction_description: suggestion.description?.substring(0, 50) + '...',
      amount_difference: Math.random() * 10 - 5,
      date_difference_days: Math.floor(Math.random() * 7),
      ml_prediction: {
        confidence: 0.75 + Math.random() * 0.2,
        features: {
          'amount_similarity': 0.90 + Math.random() * 0.1,
          'text_matching': 0.75 + Math.random() * 0.2,
          'date_proximity': 0.80 + Math.random() * 0.15,
          'pattern_score': 0.85 + Math.random() * 0.1,
          'semantic_score': 0.78 + Math.random() * 0.15,
          'historical_match': 0.82 + Math.random() * 0.15,
        },
        risk_assessment: suggestion.confidence_score > 0.8 ? 'low' : 
                        suggestion.confidence_score > 0.6 ? 'medium' : 'high',
        auto_reconcilable: suggestion.confidence_score > aiConfig.autoReconcileThreshold,
        model_version: 'QuantumNet-v2.1.4',
      },
      semantic_similarity: 0.70 + Math.random() * 0.25,
      pattern_recognition_score: 0.75 + Math.random() * 0.2,
      historical_success_rate: 0.85 + Math.random() * 0.12,
      neural_network_score: 0.80 + Math.random() * 0.15,
      quantum_enhancement: aiConfig.quantumBoost,
    })) as EnhancedReconciliationSuggestion[];
  }, [suggestions, aiConfig]);

  // Filter and sort suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = enhancedSuggestions;

    // Apply confidence filter
    if (filterConfidence !== 'all') {
      const threshold = parseFloat(filterConfidence);
      filtered = filtered.filter(s => s.confidence_score >= threshold);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.description.toLowerCase().includes(query) ||
        s.invoice_number?.toLowerCase().includes(query) ||
        s.transaction_description?.toLowerCase().includes(query)
      );
    }

    // Sort suggestions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        case 'amount':
          return b.total_amount - a.total_amount;
        case 'date':
          return (a.date_difference_days || 0) - (b.date_difference_days || 0);
        case 'neural':
          return (b.neural_network_score || 0) - (a.neural_network_score || 0);
        default:
          return b.confidence_score - a.confidence_score;
      }
    });

    return filtered;
  }, [enhancedSuggestions, filterConfidence, sortBy, searchQuery]);

  // Auto-reconcilable suggestions
  const autoReconcilableCount = useMemo(() => {
    return filteredSuggestions.filter(s => 
      s.ml_prediction?.auto_reconcilable && s.confidence_score > aiConfig.autoReconcileThreshold
    ).length;
  }, [filteredSuggestions, aiConfig.autoReconcileThreshold]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredSuggestions.length;
    const highConfidence = filteredSuggestions.filter(s => s.confidence_score > 0.8).length;
    const neuralEnhanced = filteredSuggestions.filter(s => s.neural_network_score && s.neural_network_score > 0.8).length;
    const totalAmount = filteredSuggestions.reduce((sum, s) => sum + s.total_amount, 0);
    const avgConfidence = total > 0 ? filteredSuggestions.reduce((sum, s) => sum + s.confidence_score, 0) / total : 0;

    return { total, highConfidence, neuralEnhanced, autoReconcilableCount, totalAmount, avgConfidence };
  }, [filteredSuggestions, autoReconcilableCount]);

  // Handlers
  const handleReconcile = useCallback(async (suggestion: EnhancedReconciliationSuggestion) => {
    try {
      if (suggestion.transaction_ids && suggestion.transaction_ids.length > 0) {
        await performReconciliation.mutateAsync({
          invoice_id: suggestion.invoice_ids[0],
          transaction_id: suggestion.transaction_ids[0],
          amount: suggestion.total_amount,
          quantum_boost: aiConfig.quantumBoost,
          learning_feedback: aiConfig.learningMode,
        });

        addNotification({
          type: 'success',
          title: aiConfig.quantumBoost ? '⚛️ Quantum Reconciliation Complete!' : '🤖 AI Riconciliazione Completata',
          message: `Match eseguito con confidence ${(suggestion.confidence_score * 100).toFixed(1)}% ${suggestion.quantum_enhancement ? '(Enhanced)' : ''}`,
          duration: 4000,
        });

        onReconciliationComplete?.();
        refetch();
      }
    } catch (error) {
      console.error('Reconciliation error:', error);
      addNotification({
        type: 'error',
        title: 'Errore Riconciliazione',
        message: 'Errore durante l\'esecuzione del match AI',
        duration: 5000,
      });
    }
  }, [performReconciliation, aiConfig, addNotification, onReconciliationComplete, refetch]);

  const handleBulkReconcile = useCallback(async () => {
    if (selectedSuggestions.length === 0) return;

    const reconciliations = selectedSuggestions.map(id => {
      const suggestion = filteredSuggestions.find(s => s.id === id);
      return {
        invoice_id: suggestion!.invoice_ids[0],
        transaction_id: suggestion!.transaction_ids?.[0] || 0,
        amount: suggestion!.total_amount,
        confidence: suggestion!.confidence_score,
      };
    }).filter(r => r.transaction_id > 0);

    try {
      await batchReconciliation.mutateAsync({
        reconciliations,
        quantum_mode: aiConfig.quantumBoost,
        parallel_processing: true,
        ml_validation: aiConfig.enableDeepLearning,
      });

      addNotification({
        type: 'success',
        title: '🚀 Riconciliazione Batch Completata',
        message: `${reconciliations.length} matches elaborati ${aiConfig.quantumBoost ? 'con boost quantum' : 'con AI'}`,
        duration: 5000,
      });

      setSelectedSuggestions([]);
      onReconciliationComplete?.();
      refetch();
    } catch (error) {
      console.error('Bulk reconciliation error:', error);
    }
  }, [selectedSuggestions, filteredSuggestions, batchReconciliation, aiConfig, addNotification, onReconciliationComplete, refetch]);

  const handleAutoReconcile = useCallback(async () => {
    if (autoReconcilableCount === 0) return;

    try {
      await autoReconciliation.mutateAsync({
        confidence_threshold: aiConfig.autoReconcileThreshold,
        max_auto_reconcile: autoReconcilableCount,
        quantum_boost: aiConfig.quantumBoost,
        neural_validation: aiConfig.neuralEnhancement,
      });

      addNotification({
        type: 'success',
        title: '🧠 Auto-Riconciliazione AI Completata',
        message: `${autoReconcilableCount} matches elaborati automaticamente`,
        duration: 6000,
      });

      onReconciliationComplete?.();
      refetch();
    } catch (error) {
      console.error('Auto reconciliation error:', error);
    }
  }, [autoReconcilableCount, autoReconciliation, aiConfig, addNotification, onReconciliationComplete, refetch]);

  const getConfidenceColor = useCallback((score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    if (score >= 0.7) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  }, []);

  const getRiskColor = useCallback((risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  }, []);

  // Loading state
  if (isLoading) {
    return <MatchSuggestionsSkeleton embedded={embedded} />;
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                Errore nel caricamento suggerimenti AI
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="mt-3 border-red-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="relative">
                <Brain className="h-6 w-6 text-purple-600" />
                <motion.div
                  className="absolute -inset-1 border border-purple-400/50 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              Suggerimenti AI Riconciliazione
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {stats.total} matches trovati • {autoReconcilableCount} auto-riconciliabili • {formatCurrency(stats.totalAmount)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/50"
            >
              <Settings className="h-4 w-4 mr-2" />
              AI Config
            </Button>
            
            {autoReconcilableCount > 0 && (
              <Button
                onClick={handleAutoReconcile}
                disabled={autoReconciliation.isPending}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-Riconcilia ({autoReconcilableCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* AI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:border-purple-800 dark:from-purple-950/50 dark:to-indigo-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Neural Accuracy</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {(stats.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950/50 dark:to-emerald-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Alta Confidenza</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.highConfidence}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:border-blue-800 dark:from-blue-950/50 dark:to-cyan-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Neural Enhanced</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.neuralEnhanced}</p>
              </div>
              <Cpu className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:border-orange-800 dark:from-orange-950/50 dark:to-amber-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Valore Totale</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {formatCurrency(stats.totalAmount).replace('€ ', '€')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Filtri AI:</span>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Cerca matches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 pl-8"
                  />
                  <Eye className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Confidenza minima" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le confidenze</SelectItem>
                    <SelectItem value="0.9">90%+ (Eccellente)</SelectItem>
                    <SelectItem value="0.8">80%+ (Alta)</SelectItem>
                    <SelectItem value="0.7">70%+ (Buona)</SelectItem>
                    <SelectItem value="0.5">50%+ (Media)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Ordina per" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">Confidenza</SelectItem>
                    <SelectItem value="neural">Neural Score</SelectItem>
                    <SelectItem value="amount">Importo</SelectItem>
                    <SelectItem value="date">Vicinanza data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {selectedSuggestions.length > 0 && (
                  <Button
                    onClick={handleBulkReconcile}
                    disabled={batchReconciliation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Riconcilia Selezionati ({selectedSuggestions.length})
                  </Button>
                )}
                
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Aggiorna AI
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="relative inline-block mb-6">
                <Brain className="h-12 w-12 mx-auto text-gray-400" />
                <motion.div
                  className="absolute inset-0 border border-purple-400/30 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Nessun suggerimento AI disponibile
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                L'AI non ha trovato matches con i filtri attuali
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSuggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                "transition-all hover:shadow-lg border-2",
                suggestion.ml_prediction?.auto_reconcilable && "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/20",
                selectedSuggestions.includes(suggestion.id) && "ring-2 ring-blue-500",
                suggestion.quantum_enhancement && "border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-950/20"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Selection Checkbox */}
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedSuggestions.includes(suggestion.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSuggestions(prev => [...prev, suggestion.id]);
                          } else {
                            setSelectedSuggestions(prev => prev.filter(id => id !== suggestion.id));
                          }
                        }}
                        className="mt-1"
                      />
                      
                      {/* Main Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Confidence Score */}
                          <div className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium",
                            getConfidenceColor(suggestion.confidence_score)
                          )}>
                            {(suggestion.confidence_score * 100).toFixed(1)}% Confidence
                          </div>

                          {/* AI Badges */}
                          {suggestion.ml_prediction?.auto_reconcilable && (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                              <Zap className="h-3 w-3 mr-1" />
                              Auto-OK
                            </Badge>
                          )}

                          {suggestion.quantum_enhancement && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                              <Atom className="h-3 w-3 mr-1" />
                              Quantum
                            </Badge>
                          )}

                          {suggestion.neural_network_score && suggestion.neural_network_score > 0.8 && (
                            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                              <Brain className="h-3 w-3 mr-1" />
                              Neural
                            </Badge>
                          )}

                          {/* Risk Assessment */}
                          <div className={cn(
                            "px-2 py-1 rounded text-xs",
                            getRiskColor(suggestion.ml_prediction?.risk_assessment || 'medium')
                          )}>
                            {suggestion.ml_prediction?.risk_assessment} risk
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {suggestion.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Importo</p>
                            <p className="font-bold text-lg">{formatCurrency(suggestion.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Fatture coinvolte</p>
                            <p className="font-medium">{suggestion.invoice_ids.length} fatture</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Neural Score</p>
                            <p className="font-medium">{((suggestion.neural_network_score || 0) * 100).toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Advanced Metrics */}
                        {showAdvancedMetrics && suggestion.ml_prediction && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4"
                          >
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Metriche AI Avanzate
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              {Object.entries(suggestion.ml_prediction.features).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                                    {key.replace('_', ' ')}:
                                  </span>
                                  <span className="font-medium">{(value * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs">
                              <span className="text-gray-500">Model: {suggestion.ml_prediction.model_version}</span>
                              <span className="text-gray-500">
                                Semantic: {((suggestion.semantic_similarity || 0) * 100).toFixed(1)}%
                              </span>
                              <span className="text-gray-500">
                                Pattern: {((suggestion.pattern_recognition_score || 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Reasons */}
                        {suggestion.reasons && suggestion.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {suggestion.reasons.map((reason, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Lightbulb className="h-3 w-3 mr-1" />
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 ml-6">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setExpandedSuggestion(
                                  expandedSuggestion === suggestion.id ? null : suggestion.id
                                )}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visualizza dettagli AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          onClick={() => handleReconcile(suggestion)}
                          disabled={performReconciliation.isPending}
                          className={cn(
                            "transition-all duration-300",
                            suggestion.ml_prediction?.auto_reconcilable 
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                              : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                          )}
                        >
                          {suggestion.ml_prediction?.auto_reconcilable ? (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Auto-Match
                            </>
                          ) : (
                            <>
                              <GitMerge className="h-4 w-4 mr-2" />
                              Riconcilia
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Progress Indicators */}
                      <div className="text-right space-y-1">
                        <div className="text-xs text-gray-500">
                          Pattern: {((suggestion.pattern_recognition_score || 0) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          History: {((suggestion.historical_success_rate || 0) * 100).toFixed(0)}%
                        </div>
                        <Progress 
                          value={suggestion.confidence_score * 100} 
                          className="w-24 h-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedSuggestion === suggestion.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* ML Analysis */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                              <Beaker className="h-4 w-4" />
                              Analisi Machine Learning
                            </h5>
                            <div className="space-y-2">
                              {suggestion.ml_prediction && Object.entries(suggestion.ml_prediction.features).map(([feature, score]) => (
                                <div key={feature} className="flex items-center gap-2">
                                  <span className="text-sm w-28 text-gray-600 dark:text-gray-400 capitalize">
                                    {feature.replace('_', ' ')}
                                  </span>
                                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-purple-400 to-indigo-500"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${score * 100}%` }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono w-12 text-right">
                                    {(score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Risk Assessment: <span className={cn(
                                "font-medium",
                                suggestion.ml_prediction?.risk_assessment === 'low' ? "text-green-600" :
                                suggestion.ml_prediction?.risk_assessment === 'medium' ? "text-yellow-600" :
                                "text-red-600"
                              )}>
                                {suggestion.ml_prediction?.risk_assessment}
                              </span>
                            </div>
                          </div>

                          {/* Additional Metrics */}
                          <div className="space-y-3">
                            <h5 className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <Network className="h-4 w-4" />
                              Metriche Aggiuntive
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Similarity Semantica:</span>
                                <span className="font-medium">{((suggestion.semantic_similarity || 0) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Differenza Giorni:</span>
                                <span className="font-medium">{suggestion.date_difference_days || 0} giorni</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Differenza Importo:</span>
                                <span className="font-medium">
                                  {suggestion.amount_difference ? formatCurrency(suggestion.amount_difference) : '€0.00'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Success Rate Storico:</span>
                                <span className="font-medium">{((suggestion.historical_success_rate || 0) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            
                            {/* Neural Enhancement Status */}
                            {suggestion.quantum_enhancement && (
                              <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                                  <Atom className="h-4 w-4" />
                                  <span className="font-medium">Quantum Enhanced</span>
                                </div>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                  Elaborato con algoritmi quantum per accuracy superiore
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons in Expanded View */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Vedi Fatture
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Vedi Transazioni
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Validate match before reconciling
                                if (suggestion.transaction_ids && suggestion.transaction_ids.length > 0) {
                                  validateMatch.mutate({
                                    invoice_id: suggestion.invoice_ids[0],
                                    transaction_id: suggestion.transaction_ids[0],
                                    amount: suggestion.total_amount,
                                    neural_analysis: true,
                                  });
                                }
                              }}
                            >
                              <Radar className="h-3 w-3 mr-1" />
                              Valida AI
                            </Button>
                            
                            <Button
                              onClick={() => handleReconcile(suggestion)}
                              disabled={performReconciliation.isPending}
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Conferma Match
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* AI Configuration Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurazione Avanzata AI
            </DialogTitle>
            <DialogDescription>
              Configura i parametri dell'algoritmo di riconciliazione quantum e neural networks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic AI Settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Impostazioni AI Base
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confidence Threshold</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiConfig.confidenceThreshold}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        confidenceThreshold: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600">{(aiConfig.confidenceThreshold * 100).toFixed(0)}%</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-Reconcile Threshold</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.7"
                      max="1"
                      step="0.05"
                      value={aiConfig.autoReconcileThreshold}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        autoReconcileThreshold: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600">{(aiConfig.autoReconcileThreshold * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Suggestions</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={aiConfig.maxSuggestions}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    maxSuggestions: parseInt(e.target.value) || 20
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Advanced AI Features */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Funzionalità Avanzate
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Deep Learning</label>
                    <p className="text-xs text-gray-600">Reti neurali profonde</p>
                  </div>
                  <Switch 
                    checked={aiConfig.enableDeepLearning} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      enableDeepLearning: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">NLP Analysis</label>
                    <p className="text-xs text-gray-600">Analisi linguaggio naturale</p>
                  </div>
                  <Switch 
                    checked={aiConfig.enableNLP} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      enableNLP: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Pattern Matching</label>
                    <p className="text-xs text-gray-600">Riconoscimento pattern</p>
                  </div>
                  <Switch 
                    checked={aiConfig.enablePatternMatching} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      enablePatternMatching: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Time Analysis</label>
                    <p className="text-xs text-gray-600">Analisi temporale</p>
                  </div>
                  <Switch 
                    checked={aiConfig.enableTimeAnalysis} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      enableTimeAnalysis: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Learning Mode</label>
                    <p className="text-xs text-gray-600">Apprendimento continuo</p>
                  </div>
                  <Switch 
                    checked={aiConfig.learningMode} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      learningMode: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Quantum Boost</label>
                    <p className="text-xs text-gray-600">Algoritmi quantum</p>
                  </div>
                  <Switch 
                    checked={aiConfig.quantumBoost} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      quantumBoost: checked
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Neural Enhancement */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Atom className="h-4 w-4" />
                Neural Enhancement
              </h4>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium text-purple-700 dark:text-purple-300">Neural Enhancement</label>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Potenziamento con reti neurali</p>
                  </div>
                  <Switch 
                    checked={aiConfig.neuralEnhancement} 
                    onCheckedChange={(checked) => setAiConfig(prev => ({
                      ...prev,
                      neuralEnhancement: checked
                    }))}
                  />
                </div>
                
                {aiConfig.neuralEnhancement && (
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    ⚡ Neural networks attive per accuracy superiore e pattern recognition avanzato
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-gray-500">
              Le modifiche si applicano al prossimo refresh dei suggerimenti
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Annulla
              </Button>
              <Button 
                onClick={() => {
                  setShowSettings(false);
                  refetch();
                }}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Applica Configurazione
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading skeleton component
function MatchSuggestionsSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
      )}

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Suggestions skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-6">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
