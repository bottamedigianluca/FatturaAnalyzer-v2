import React, { useState } from 'react';
import { FirstRunCheck, SimpleSetupWizard } from '@/components/FirstRunCheck';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { useUIStore } from '@/store';
import App from './App'; // Il tuo App.tsx originale

type WrapperState = 'checking' | 'setup-needed' | 'app-ready';

export const AppWrapper: React.FC = () => {
  const [wrapperState, setWrapperState] = useState<WrapperState>('checking');
  const { addNotification } = useUIStore();

  const handleSetupNeeded = () => {
    console.log('🎯 Setup needed, showing setup wizard');
    setWrapperState('setup-needed');
  };

  const handleSetupComplete = () => {
    console.log('✅ Setup completed, loading main app');
    setWrapperState('app-ready');
    
    addNotification({
      type: 'success',
      title: 'Setup Completato',
      message: 'Il sistema è ora configurato e pronto all\'uso',
      duration: 5000,
    });
  };

  // Checking first run status
  if (wrapperState === 'checking') {
    return (
      <ThemeProvider>
        <FirstRunCheck
          onSetupNeeded={handleSetupNeeded}
          onSetupComplete={handleSetupComplete}
        />
        <Toaster position="top-right" expand={true} richColors closeButton />
      </ThemeProvider>
    );
  }

  // Setup wizard
  if (wrapperState === 'setup-needed') {
    return (
      <ThemeProvider>
        <SimpleSetupWizard onComplete={handleSetupComplete} />
        <Toaster position="top-right" expand={true} richColors closeButton />
      </ThemeProvider>
    );
  }

  // Main app (tuo App.tsx originale)
  return <App />;
};

export default AppWrapper;
