import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Zap,
  Target,
  BarChart3,
  Settings,
  Cpu,
  Network,
  Atom,
  Activity,
  Gauge,
  RefreshCw,
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Radar,
  Beaker,
  Lightbulb,
} from 'lucide-react';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
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
  Switch,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';

// Hooks
import {
  useReconciliation,
  useReconciliationAnalytics,
  useReconciliationStatus,
  useMLModelTraining,
  useAutoReconciliation
} from '@/hooks/useReconciliation';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface QuantumSystemMetrics {
  neural_load: number;
  quantum_coherence: number;
  pattern_recognition: number;
  semantic_processing: number;
  ml_accuracy: number;
  processing_speed: number;
}

interface AIModelConfig {
  confidence_threshold: number;
  auto_reconcile_threshold: number;
  learning_rate: number;
  neural_layers: number;
  quantum_enhancement: boolean;
  semantic_analysis: boolean;
  pattern_matching: boolean;
  real_time_learning: boolean;
}

export function ReconciliationPage() {
  // State management
  const [activeMode, setActiveMode] = useState<'manual' | 'assisted' | 'auto'>('assisted');
  const [isQuantumMode, setIsQuantumMode] = useState(true);
  const [showSystemMetrics, setShowSystemMetrics] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<QuantumSystemMetrics>({
    neural_load: 0.42,
    quantum_coherence: 0.87,
    pattern_recognition: 0.93,
    semantic_processing: 0.78,
    ml_accuracy: 0.95,
    processing_speed: 0.89,
  });
  
  const [aiConfig, setAiConfig] = useState<AIModelConfig>({
    confidence_threshold: 0.8,
    auto_reconcile_threshold: 0.9,
    learning_rate: 0.001,
    neural_layers: 128,
    quantum_enhancement: true,
    semantic_analysis: true,
    pattern_matching: true,
    real_time_learning: true,
  });

  // Hooks
  const { data: analytics } = useReconciliationAnalytics();
  const { data: status } = useReconciliationStatus();
  const autoReconcileMutation = useAutoReconciliation();
  const mlTrainingMutation = useMLModelTraining();
  const { addNotification } = useUIStore();

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        neural_load: Math.max(0.1, Math.min(0.9, prev.neural_load + (Math.random() - 0.5) * 0.1)),
        quantum_coherence: Math.max(0.7, Math.min(0.98, prev.quantum_coherence + (Math.random() - 0.5) * 0.05)),
        pattern_recognition: Math.max(0.8, Math.min(0.99, prev.pattern_recognition + (Math.random() - 0.5) * 0.03)),
        semantic_processing: Math.max(0.6, Math.min(0.95, prev.semantic_processing + (Math.random() - 0.5) * 0.08)),
        ml_accuracy: Math.max(0.85, Math.min(0.99, prev.ml_accuracy + (Math.random() - 0.5) * 0.02)),
        processing_speed: Math.max(0.7, Math.min(0.98, prev.processing_speed + (Math.random() - 0.5) * 0.06)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAutoReconcile = async () => {
    try {
      await autoReconcileMutation.mutateAsync({
        confidence_threshold: aiConfig.confidence_threshold,
        max_auto_reconcile: 50,
        quantum_boost: isQuantumMode,
        neural_validation: true,
      });
    } catch (error) {
      console.error('Auto-reconciliation failed:', error);
    }
  };

  const handleMLTraining = async () => {
    try {
      await mlTrainingMutation.mutateAsync({
        training_data_size: 2000,
        quantum_optimization: isQuantumMode,
        neural_enhancement: true,
      });
    } catch (error) {
      console.error('ML training failed:', error);
    }
  };

  const SystemStatusIndicator = ({ label, value, color, icon: Icon }: {
    label: string;
    value: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${color.replace('text-', 'bg-')}`}
            animate={{ width: `${value * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs font-mono text-gray-600 min-w-[40px]">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quantum Header with System Status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/80 via-indigo-50/80 to-purple-50/80">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div
                    className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(59, 130, 246, 0.3)",
                        "0 0 40px rgba(139, 92, 246, 0.4)",
                        "0 0 20px rgba(59, 130, 246, 0.3)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Brain className="h-8 w-8 text-white" />
                  </motion.div>
                  
                  {/* Quantum field indicators */}
                  <motion.div
                    className="absolute -inset-2 border-2 border-blue-400/30 rounded-2xl"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute -inset-4 border border-purple-400/20 rounded-2xl"
                    animate={{ rotate: [360, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Quantum AI Reconciliation Center
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Neural networks e quantum computing per la riconciliazione intelligente
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* System Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg border border-green-200/50">
                  <motion.div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium text-green-700">
                    Sistema Attivo
                  </span>
                </div>
                
                {/* Quantum Mode Toggle */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg border border-purple-200/50">
                  <Atom className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Quantum</span>
                  <Switch
                    checked={isQuantumMode}
                    onCheckedChange={setIsQuantumMode}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                
                {/* System Metrics Toggle */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSystemMetrics(!showSystemMetrics)}
                        className={cn(
                          "border-gray-200/50 bg-white/60",
                          showSystemMetrics && "bg-blue-100 border-blue-300"
                        )}
                      >
                        <Gauge className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Metriche di sistema</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* System Metrics Panel */}
            <AnimatePresence>
              {showSystemMetrics && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200/50"
                >
                  <SystemStatusIndicator
                    label="Quantum Coherence"
                    value={systemMetrics.quantum_coherence}
                    color="text-purple-600"
                    icon={Atom}
                  />
                  <SystemStatusIndicator
                    label="Pattern Recognition"
                    value={systemMetrics.pattern_recognition}
                    color="text-green-600"
                    icon={Network}
                  />
                  <SystemStatusIndicator
                    label="Semantic Processing"
                    value={systemMetrics.semantic_processing}
                    color="text-orange-600"
                    icon={Brain}
                  />
                  <SystemStatusIndicator
                    label="ML Accuracy"
                    value={systemMetrics.ml_accuracy}
                    color="text-emerald-600"
                    icon={Target}
                  />
                  <SystemStatusIndicator
                    label="Processing Speed"
                    value={systemMetrics.processing_speed}
                    color="text-cyan-600"
                    icon={Zap}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mode Selection and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode Selection */}
        <Card className="lg:col-span-2 border-2 border-indigo-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              Modalità di Riconciliazione
            </CardTitle>
            <CardDescription>
              Seleziona il livello di automazione per il processo di riconciliazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  id: 'manual',
                  title: 'Manuale',
                  description: 'Controllo completo del processo',
                  icon: Target,
                  color: 'blue',
                },
                {
                  id: 'assisted',
                  title: 'AI Assistita',
                  description: 'Suggerimenti intelligenti con conferma',
                  icon: Brain,
                  color: 'purple',
                },
                {
                  id: 'auto',
                  title: 'Automatica',
                  description: 'Riconciliazione completamente automatizzata',
                  icon: Zap,
                  color: 'green',
                },
              ].map((mode) => {
                const Icon = mode.icon;
                const isActive = activeMode === mode.id;
                
                return (
                  <motion.div
                    key={mode.id}
                    className={cn(
                      "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                      isActive
                        ? `border-${mode.color}-400 bg-${mode.color}-50`
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    onClick={() => setActiveMode(mode.id as any)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <div className={cn(
                        "mx-auto mb-3 p-3 rounded-lg",
                        isActive
                          ? `bg-${mode.color}-100 text-${mode.color}-600`
                          : "bg-gray-100 text-gray-500"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-2">{mode.title}</h3>
                      <p className="text-xs text-gray-600">{mode.description}</p>
                    </div>
                    
                    {isActive && (
                      <motion.div
                        className={`absolute inset-0 border-2 border-${mode.color}-400 rounded-xl`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-2 border-green-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-green-600" />
              Azioni Rapide
            </CardTitle>
            <CardDescription>
              Operazioni immediate per ottimizzare il flusso di lavoro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleAutoReconcile}
              disabled={autoReconcileMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {autoReconcileMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Auto-Riconcilia Tutto
            </Button>
            
            <Button
              onClick={handleMLTraining}
              disabled={mlTrainingMutation.isPending}
              variant="outline"
              className="w-full border-purple-200 hover:bg-purple-50"
            >
              {mlTrainingMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Beaker className="h-4 w-4 mr-2" />
              )}
              Addestra Modello AI
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Report
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-orange-200 hover:bg-orange-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importa Dati
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Successo</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatPercentage(analytics.success_rate)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Processati</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {analytics.total_processed.toLocaleString()}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Accuratezza AI</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatPercentage(analytics.ml_accuracy)}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Ore Risparmiate</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {analytics.time_saved_hours.toFixed(1)}h
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Configuration Panel */}
      <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-600" />
            Configurazione AI
          </CardTitle>
          <CardDescription>
            Ottimizza i parametri del motore di intelligenza artificiale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-700">
                Soglia Confidenza: {formatPercentage(aiConfig.confidence_threshold)}
              </label>
              <Slider
                value={[aiConfig.confidence_threshold]}
                onValueChange={([value]) => setAiConfig(prev => ({ ...prev, confidence_threshold: value }))}
                max={1}
                min={0.5}
                step={0.05}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-700">
                Auto-Reconcile: {formatPercentage(aiConfig.auto_reconcile_threshold)}
              </label>
              <Slider
                value={[aiConfig.auto_reconcile_threshold]}
                onValueChange={([value]) => setAiConfig(prev => ({ ...prev, auto_reconcile_threshold: value }))}
                max={1}
                min={0.8}
                step={0.02}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-700">
                Neural Layers: {aiConfig.neural_layers}
              </label>
              <Slider
                value={[aiConfig.neural_layers]}
                onValueChange={([value]) => setAiConfig(prev => ({ ...prev, neural_layers: value }))}
                max={256}
                min={32}
                step={16}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-purple-700">
                Learning Rate: {aiConfig.learning_rate.toFixed(4)}
              </label>
              <Slider
                value={[aiConfig.learning_rate * 1000]}
                onValueChange={([value]) => setAiConfig(prev => ({ ...prev, learning_rate: value / 1000 }))}
                max={10}
                min={0.1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiConfig.quantum_enhancement}
                onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, quantum_enhancement: checked }))}
              />
              <label className="text-sm font-medium text-purple-700">Quantum Enhancement</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiConfig.semantic_analysis}
                onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, semantic_analysis: checked }))}
              />
              <label className="text-sm font-medium text-purple-700">Semantic Analysis</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiConfig.pattern_matching}
                onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, pattern_matching: checked }))}
              />
              <label className="text-sm font-medium text-purple-700">Pattern Matching</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={aiConfig.real_time_learning}
                onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, real_time_learning: checked }))}
              />
              <label className="text-sm font-medium text-purple-700">Real-time Learning</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Reconciliation Interface */}
      <ReconciliationView />

      {/* Quantum Processing Status */}
      {(autoReconcileMutation.isPending || mlTrainingMutation.isPending) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <Card className="w-96 border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full mx-auto mb-6"
              />
              
              <h3 className="text-xl font-bold text-purple-700 mb-2">
                {autoReconcileMutation.isPending ? 'Quantum Auto-Reconciliation' : 'Neural Network Training'}
              </h3>
              
              <p className="text-purple-600 mb-4">
                {autoReconcileMutation.isPending 
                  ? 'AI sta processando le riconciliazioni...' 
                  : 'Addestramento del modello in corso...'}
              </p>
              
              <div className="space-y-2">
                <Progress value={65} className="w-full" />
                <p className="text-xs text-purple-500">
                  Processamento quantistico attivo
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
