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
                    label="Neural Load"
                    value={systemMetrics.neural_load}
                    color="text-blue-600"
                    icon={Cpu}
                  />
                  <System
