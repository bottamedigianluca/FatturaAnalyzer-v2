import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { FirstRunCheck } from '@/components/FirstRunCheck';
import { SimpleSetupWizard } from '@/components/setup/SetupWizard';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store';
import {
  DashboardPage,
  InvoicesPage,
  InvoiceDetailPage,
  TransactionsPage,
  TransactionDetailPage,
  ReconciliationPage,
  AnagraphicsPage,
  AnagraphicsDetailPage,
  AnalyticsPage,
  ImportExportPage,
  SettingsPage
} from '@/pages';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

type AppState = 'checking' | 'setup_needed' | 'ready' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('checking');
  const { addNotification } = useUIStore();

  useEffect(() => {
    const initializeTauri = async () => {
      if (window.__TAURI_IPC__) {
        try {
          await invoke('app_ready');
          console.log('Tauri IPC initialized successfully');
        } catch (tauriError) {
          console.warn('Tauri IPC initialization failed, continuing in web mode:', tauriError);
        }
      } else {
        console.log('Running in standard web mode');
      }
    };
    initializeTauri();
  }, []);

  const handleSetupNeeded = () => setAppState('setup_needed');

  const handleSetupComplete = () => {
    addNotification({
      type: 'success',
      title: 'Setup Completato',
      message: 'Il sistema è ora configurato e pronto all\'uso.',
      duration: 5000,
    });
    setAppState('ready');
  };

  const handleError = () => setAppState('error');

  const renderContent = () => {
    switch (appState) {
      case 'checking':
        return (
          <FirstRunCheck
            onSetupNeeded={handleSetupNeeded}
            onSetupComplete={handleSetupComplete}
            onConnectionError={handleError}
          />
        );
      case 'setup_needed':
        return <SimpleSetupWizard onComplete={handleSetupComplete} />;
      case 'error':
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-6 space-y-4 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-destructive">Errore di Connessione</h2>
              <p className="text-muted-foreground">
                Impossibile comunicare con il backend. Assicurati che sia in esecuzione e riprova.
              </p>
              <Button onClick={() => window.location.reload()}>Riprova</Button>
            </div>
          </div>
        );
      case 'ready':
        return (
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                <Route path="/reconciliation" element={<ReconciliationPage />} />
                <Route path="/anagraphics" element={<AnagraphicsPage />} />
                <Route path="/anagraphics/:id" element={<AnagraphicsDetailPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/import" element={<ImportExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        );
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="fattura-analyzer-theme">
        <div className="min-h-screen bg-background font-sans antialiased">
          {renderContent()}
        </div>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
