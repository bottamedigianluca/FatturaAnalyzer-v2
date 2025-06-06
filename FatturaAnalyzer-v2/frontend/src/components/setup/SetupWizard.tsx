import React, { useState } from 'react';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store';

interface SimpleSetupWizardProps {
  onComplete: () => void;
}

export const SimpleSetupWizard: React.FC<SimpleSetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useUIStore();

  const steps = [
    { id: 1, title: 'Benvenuto', description: 'Configurazione iniziale del sistema.' },
    { id: 2, title: 'Database', description: 'Inizializzazione del database e delle tabelle.' },
    { id: 3, title: 'Completamento', description: 'Finalizzazione del setup.' },
  ];

  const handleNextStep = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      let response;
      if (currentStep === 2) {
        response = await apiClient.request('/api/first-run/wizard/database-setup', { method: 'POST' });
      } else if (currentStep === 3) {
        response = await apiClient.request('/api/first-run/wizard/complete', { method: 'POST' });
      }

      if (response && response.success) {
        if (currentStep === 3) {
          onComplete();
        } else {
          setCurrentStep(prev => prev + 1);
        }
      } else {
        throw new Error(response?.message || 'Si è verificato un errore.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto durante il setup.');
      addNotification({
        type: 'error',
        title: `Errore nello Step ${currentStep}`,
        message: err instanceof Error ? err.message : 'Controlla la connessione al backend.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <p>Benvenuto in FatturaAnalyzer v2! Procediamo con la configurazione iniziale del sistema.</p>
            <Button onClick={() => setCurrentStep(2)} className="w-full">
              Inizia Setup
            </Button>
          </>
        );
      case 2:
        return (
          <>
            <p>Ora creeremo il database e le tabelle necessarie per il funzionamento del sistema.</p>
            <Button onClick={handleNextStep} disabled={isProcessing} className="w-full">
              {isProcessing ? 'Inizializzazione...' : 'Configura Database'}
            </Button>
          </>
        );
      case 3:
        return (
          <>
            <p>Setup quasi completato! Clicca per finalizzare la configurazione e avviare l'applicazione.</p>
            <Button onClick={handleNextStep} disabled={isProcessing} className="w-full">
              {isProcessing ? 'Finalizzazione...' : 'Completa Setup'}
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Setup FatturaAnalyzer v2</h1>
          <p className="text-muted-foreground">{steps[currentStep - 1]?.description}</p>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
        <div className="border border-border rounded-lg p-6 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};
