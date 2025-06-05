import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

interface FirstRunCheckProps {
  onSetupNeeded: () => void;
  onSetupComplete: () => void;
}

export const FirstRunCheck: React.FC<FirstRunCheckProps> = ({
  onSetupNeeded,
  onSetupComplete
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFirstRunStatus();
  }, []);

  const checkFirstRunStatus = async () => {
    try {
      setIsChecking(true);
      setError(null);
      
      console.log('🔍 Checking first run status...');
      
      // Test connessione backend prima
      const healthResponse = await fetch('http://127.0.0.1:8000/health');
      if (!healthResponse.ok) {
        throw new Error('Backend non raggiungibile');
      }
      
      // Controlla stato first run
      const firstRunResponse = await apiClient.checkFirstRun();
      
      console.log('📋 First run response:', firstRunResponse);
      
      if (firstRunResponse.success) {
        if (firstRunResponse.data?.is_first_run) {
          console.log('🎯 First run detected, showing setup wizard');
          onSetupNeeded();
        } else {
          console.log('✅ System already configured');
          onSetupComplete();
        }
      } else {
        throw new Error('Errore controllo stato sistema');
      }
      
    } catch (error) {
      console.error('❌ First run check failed:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      
      // In caso di errore, assumiamo che serve setup
      onSetupNeeded();
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-lg font-semibold">Controllo configurazione sistema...</h2>
          <p className="text-muted-foreground">Verifico se è necessario configurare il sistema</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl">⚠️</div>
          <h2 className="text-lg font-semibold text-red-600">Errore Connessione</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="space-y-2">
            <button
              onClick={checkFirstRunStatus}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Riprova
            </button>
            <p className="text-sm text-muted-foreground">
              Assicurati che il backend sia avviato su porta 8000
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Componente Setup Wizard semplificato
export const SimpleSetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Benvenuto', description: 'Configurazione iniziale sistema' },
    { id: 2, title: 'Database', description: 'Inizializzazione database' },
    { id: 3, title: 'Completamento', description: 'Finalizzazione setup' }
  ];

  const handleDatabaseSetup = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('🗄️ Starting database setup...');
      
      const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/database-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Database setup successful');
        setCurrentStep(3);
      } else {
        throw new Error(data.message || 'Database setup failed');
      }
      
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      setError(error instanceof Error ? error.message : 'Errore setup database');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('🏁 Completing setup...');
      
      const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('🎉 Setup completed successfully!');
        onComplete();
      } else {
        throw new Error(data.message || 'Setup completion failed');
      }
      
    } catch (error) {
      console.error('❌ Setup completion failed:', error);
      setError(error instanceof Error ? error.message : 'Errore completamento setup');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Setup FatturaAnalyzer v2</h1>
          <p className="text-muted-foreground">Configurazione iniziale del sistema</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Passo {currentStep} di {steps.length}</span>
            <span>{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{steps[currentStep - 1]?.title}</h2>
            <p className="text-muted-foreground">{steps[currentStep - 1]?.description}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p>Benvenuto in FatturaAnalyzer v2! Procediamo con la configurazione iniziale.</p>
              <button
                onClick={() => setCurrentStep(2)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Inizia Setup
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <p>Inizializzo il database e creo le tabelle necessarie...</p>
              <button
                onClick={handleDatabaseSetup}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Configurazione database...
                  </span>
                ) : (
                  'Configura Database'
                )}
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p>Setup quasi completato! Clicca per finalizzare la configurazione.</p>
              <button
                onClick={handleCompleteSetup}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finalizzazione...
                  </span>
                ) : (
                  'Completa Setup'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Sistema di gestione fatture per professionisti italiani
        </div>
      </div>
    </div>
  );
};
