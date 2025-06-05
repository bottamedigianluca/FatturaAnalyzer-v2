import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';

interface SetupStep {
  step: number;
  name: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupWizardProps {
  onSetupComplete?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addNotification } = useUIStore();

  // Carica stato setup wizard
  useEffect(() => {
    loadSetupState();
  }, []);

  const loadSetupState = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prima controlla se è first run
      const firstRunResponse = await apiClient.checkFirstRun();
      
      if (firstRunResponse.success && !firstRunResponse.data?.is_first_run) {
        // Setup già completato
        onSetupComplete?.();
        return;
      }

      // Avvia wizard
      const wizardResponse = await fetch('http://127.0.0.1:8000/api/first-run/wizard/start');
      const wizardData = await wizardResponse.json();

      if (wizardData
