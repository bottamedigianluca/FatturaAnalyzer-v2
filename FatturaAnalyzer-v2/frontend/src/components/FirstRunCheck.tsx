// src/components/FirstRunCheck.tsx - VERSIONE CORRETTA

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings,
  Database,
  Zap,
  Brain,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Users,
  FileText,
  CreditCard,
  BarChart3,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

interface FirstRunStatus {
  is_first_run: boolean;
  setup_completed: boolean;
  has_data: boolean;
  features_available: string[];
  next_steps: string[];
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  optional: boolean;
}

interface FirstRunCheckProps {
  children?: React.ReactNode;
  onSetupNeeded?: () => void;
  onSetupComplete?: () => void;
  onConnectionError?: () => void;
}

export function FirstRunCheck({ 
  children,
  onSetupNeeded,
  onSetupComplete,
  onConnectionError 
}: FirstRunCheckProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  // Check first run status con error handling migliorato
  const { 
    data: firstRunData, 
    isLoading: checkingFirstRun, 
    error: firstRunError,
    refetch: recheckFirstRun 
  } = useQuery({
    queryKey: ['first-run-check'],
    queryFn: async (): Promise<{ data: FirstRunStatus }> => {
      try {
        console.log('🔍 Checking first run status...');
        const response = await apiClient.checkFirstRun();
        console.log('📋 First run response:', response);
        
        // Se il backend indica first run, mostra il wizard
        if (response?.data?.is_first_run) {
          console.log('🎯 First run detected, showing setup wizard');
          setShowWizard(true);
          onSetupNeeded?.();
        }
        
        return response;
      } catch (error) {
        console.error('❌ First run check failed:', error);
        onConnectionError?.();
        // In caso di errore, assumiamo che non sia first run per evitare loop
        return {
          data: {
            is_first_run: false,
            setup_completed: true,
            has_data: true,
            features_available: [],
            next_steps: [],
          }
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1, // Ridotto retry per evitare loop
    retryDelay: 2000,
  });

  // Setup steps configuration
  const setupSteps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Benvenuto in FatturaAnalyzer V4.0',
      description: 'Sistema Enterprise per PMI con AI integrata',
      icon: Sparkles,
      completed: true,
      optional: false,
    },
    {
      id: 'database',
      title: 'Configurazione Database',
      description: 'Inizializzazione database e strutture dati',
      icon: Database,
      completed: false,
      optional: false,
    },
    {
      id: 'features',
      title: 'Attivazione Funzionalità',
      description: 'Configurazione moduli enterprise e AI',
      icon: Brain,
      completed: false,
      optional: false,
    },
    {
      id: 'data',
      title: 'Caricamento Dati Iniziali',
      description: 'Import dati di esempio (opzionale)',
      icon: FileText,
      completed: false,
      optional: true,
    },
    {
      id: 'complete',
      title: 'Setup Completato',
      description: 'Sistema pronto per l\'utilizzo enterprise',
      icon: CheckCircle,
      completed: false,
      optional: false,
    },
  ];

  // Setup mutations
  const startSetupMutation = useMutation({
    mutationFn: () => apiClient.startSetupWizard(),
    onSuccess: () => {
      setCurrentStep(1);
      setSetupProgress(20);
      addNotification({
        type: 'success',
        title: 'Setup Avviato',
        message: 'Configurazione sistema iniziata',
      });
    },
    onError: (error: Error) => {
      console.error('❌ Setup start failed:', error);
      addNotification({
        type: 'error',
        title: 'Errore Setup',
        message: 'Impossibile avviare la configurazione',
      });
    },
  });

  const setupDatabaseMutation = useMutation({
    mutationFn: () => apiClient.setupDatabase(),
    onSuccess: () => {
      setCurrentStep(2);
      setSetupProgress(50);
      addNotification({
        type: 'success',
        title: 'Database Configurato',
        message: 'Database inizializzato correttamente',
      });
    },
    onError: (error: Error) => {
      console.error('❌ Database setup failed:', error);
      addNotification({
        type: 'error',
        title: 'Errore Database',
        message: 'Errore nella configurazione database',
      });
    },
  });

  const completeSetupMutation = useMutation({
    mutationFn: () => apiClient.completeSetupWizard(),
    onSuccess: () => {
      setCurrentStep(4);
      setSetupProgress(100);
      setShowWizard(false);
      
      // Refresh first run check
      queryClient.invalidateQueries({ queryKey: ['first-run-check'] });
      
      addNotification({
        type: 'success',
        title: '🎉 Setup Completato!',
        message: 'FatturaAnalyzer V4.0 è pronto per l\'utilizzo enterprise',
        duration: 5000,
      });

      onSetupComplete?.();
    },
    onError: (error: Error) => {
      console.error('❌ Setup completion failed:', error);
      addNotification({
        type: 'error',
        title: 'Errore Completamento',
        message: 'Errore nel completamento setup',
      });
    },
  });

  const skipSetupMutation = useMutation({
    mutationFn: () => apiClient.skipWizard(),
    onSuccess: () => {
      setShowWizard(false);
      queryClient.invalidateQueries({ queryKey: ['first-run-check'] });
      
      addNotification({
        type: 'info',
        title: 'Setup Saltato',
        message: 'Potrai configurare il sistema in seguito',
      });

      onSetupComplete?.();
    },
    onError: (error: Error) => {
      console.error('❌ Skip setup failed:', error);
      // In caso di errore nello skip, forziamo la chiusura
      setShowWizard(false);
      onSetupComplete?.();
    },
  });

  // Handlers
  const handleNextStep = async () => {
    try {
      switch (currentStep) {
        case 0:
          await startSetupMutation.mutateAsync();
          break;
        case 1:
          await setupDatabaseMutation.mutateAsync();
          break;
        case 2:
          setCurrentStep(3);
          setSetupProgress(75);
          break;
        case 3:
          await completeSetupMutation.mutateAsync();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('❌ Setup step failed:', error);
    }
  };

  const handleSkipSetup = async () => {
    try {
      await skipSetupMutation.mutateAsync();
    } catch (error) {
      console.error('❌ Skip failed, forcing close:', error);
      setShowWizard(false);
      onSetupComplete?.();
    }
  };

  // Error state
  if (firstRunError) {
    console.error('❌ First run check error:', firstRunError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-96 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Errore di Connessione
            </h3>
            <p className="text-red-700 mb-4">
              Impossibile connettersi al backend. Verifica che il server sia avviato.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => recheckFirstRun()} 
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova Connessione
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowWizard(false)}
                className="w-full"
              >
                Continua Comunque
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (checkingFirstRun) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-96 border-blue-200">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-6"
            />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Inizializzazione Sistema
            </h3>
            <p className="text-blue-700">
              Verifica configurazione FatturaAnalyzer V4.0...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se non è first run, mostra direttamente l'app
  const isFirstRun = firstRunData?.data?.is_first_run;
  if (!isFirstRun || !showWizard) {
    return <>{children}</>;
  }

  // Setup wizard UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                FatturaAnalyzer V4.0
              </h1>
            </motion.div>
            <p className="text-xl text-gray-600">
              Configurazione Sistema Enterprise per PMI
            </p>
            
            {/* Progress */}
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progresso Setup</span>
                <span>{setupProgress}%</span>
              </div>
              <Progress value={setupProgress} className="h-2" />
            </div>
          </div>

          {/* Setup Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep || step.completed;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "transition-all duration-300",
                    isActive && "ring-2 ring-purple-400 border-purple-300 bg-purple-50",
                    isCompleted && "bg-green-50 border-green-300",
                    !isActive && !isCompleted && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isActive && "bg-purple-100 text-purple-600",
                          isCompleted && "bg-green-100 text-green-600",
                          !isActive && !isCompleted && "bg-gray-100 text-gray-400"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{step.title}</h3>
                            {step.optional && (
                              <Badge variant="outline" className="text-xs">
                                Opzionale
                              </Badge>
                            )}
                            {isCompleted && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Current Step Details */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <CardContent className="p-8">
                  {currentStep === 0 && (
                    <div className="text-center">
                      <Sparkles className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-purple-900 mb-4">
                        Benvenuto in FatturaAnalyzer V4.0
                      </h2>
                      <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                        Stai per configurare il sistema enterprise più avanzato per la gestione 
                        fatture con AI integrata. Il setup richiederà solo pochi minuti.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-4">
                          <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <h3 className="font-semibold mb-1">AI Integrata</h3>
                          <p className="text-sm text-gray-600">Riconciliazione automatica intelligente</p>
                        </div>
                        <div className="text-center p-4">
                          <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <h3 className="font-semibold mb-1">Analytics Avanzate</h3>
                          <p className="text-sm text-gray-600">Dashboard executive e reporting</p>
                        </div>
                        <div className="text-center p-4">
                          <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <h3 className="font-semibold mb-1">Multi-utente</h3>
                          <p className="text-sm text-gray-600">Gestione team e permessi</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="text-center">
                      <Database className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-blue-900 mb-4">
                        Configurazione Database
                      </h2>
                      <p className="text-gray-700 mb-6">
                        Inizializzazione delle strutture dati e configurazione database enterprise.
                      </p>
                      {setupDatabaseMutation.isPending && (
                        <div className="space-y-4">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                          <p className="text-sm text-gray-600">Configurazione in corso...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="text-center">
                      <Brain className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-purple-900 mb-4">
                        Attivazione Funzionalità AI
                      </h2>
                      <p className="text-gray-700 mb-6">
                        Configurazione moduli enterprise e inizializzazione sistema AI.
                      </p>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="text-center">
                      <FileText className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-orange-900 mb-4">
                        Dati Iniziali (Opzionale)
                      </h2>
                      <p className="text-gray-700 mb-6">
                        Vuoi caricare alcuni dati di esempio per esplorare le funzionalità?
                      </p>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="text-center">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-green-900 mb-4">
                        Setup Completato!
                      </h2>
                      <p className="text-gray-700 mb-6">
                        FatturaAnalyzer V4.0 è ora configurato e pronto per l'utilizzo enterprise.
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="outline"
                      onClick={handleSkipSetup}
                      disabled={startSetupMutation.isPending || setupDatabaseMutation.isPending || completeSetupMutation.isPending}
                    >
                      Salta Setup
                    </Button>

                    <div className="flex gap-3">
                      {currentStep < setupSteps.length - 1 ? (
                        <Button
                          onClick={handleNextStep}
                          disabled={startSetupMutation.isPending || setupDatabaseMutation.isPending || completeSetupMutation.isPending}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {startSetupMutation.isPending || setupDatabaseMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4 mr-2" />
                          )}
                          {currentStep === 0 ? 'Inizia Setup' : 
                           currentStep === 3 ? 'Salta Dati' : 'Continua'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowWizard(false)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Accedi al Sistema
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Fix per problemi SES - Utility function
export const suppressSESErrors = () => {
  // Disable SES-related errors in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalError = console.error;
    console.error = (...args) => {
      // Filtra errori SES che sono noise in development
      if (args[0]?.includes?.('SES_UNCAUGHT_EXCEPTION')) {
        return; // Ignora questo errore specifico
      }
      originalError.apply(console, args);
    };
  }
};

// Applica la correzione al mount
if (typeof window !== 'undefined') {
  suppressSESErrors();
}
