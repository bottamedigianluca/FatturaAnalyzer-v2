import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Providers, Layout e Componenti UI
import { ProvidersWrapper } from '@/providers';
import { Layout } from '@/components/layout/Layout';
import { SimpleSetupWizard } from '@/components/setup/SetupWizard';
import { FullPageLoading, QueryLoadingFallback } from '@/providers/LoadingComponents';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// Servizi e Store
import { apiClient } from '@/services/api';
import { useUIStore, enableAllV4Features } from '@/store';

// Pagine (Lazy Loaded per ottimizzare il caricamento iniziale)
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const InvoicesPage = React.lazy(() => import('@/pages/InvoicesPage').then(module => ({ default: module.InvoicesPage })));
const InvoiceDetailPage = React.lazy(() => import('@/pages/InvoiceDetailPage').then(module => ({ default: module.InvoiceDetailPage })));
const TransactionsPage = React.lazy(() => import('@/pages/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const TransactionDetailPage = React.lazy(() => import('@/pages/TransactionDetailPage').then(module => ({ default: module.TransactionDetailPage })));
const ReconciliationPage = React.lazy(() => import('@/pages/ReconciliationPage').then(module => ({ default: module.ReconciliationPage })));
const AnagraphicsPage = React.lazy(() => import('@/pages/AnagraphicsPage').then(module => ({ default: module.AnagraphicsPage })));
const AnagraphicsDetailPage = React.lazy(() => import('@/pages/AnagraphicsDetailPage').then(module => ({ default: module.AnagraphicsDetailPage })));
const AnalyticsPage = React.lazy(() => import('@/pages/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const ImportExportPage = React.lazy(() => import('@/pages/ImportExportPage').then(module => ({ default: module.ImportExportPage })));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

// Definizione degli stati dell'applicazione, più semplice e robusta
type AppState = 
  | 'initializing' 
  | 'setup_needed' 
  | 'ready' 
  | 'error';

// Creazione del client per React Query
const queryClient = new QueryClient();

function App() {
  const [appState, setAppState] = useState<AppState>('initializing');
  const { addNotification } = useUIStore();

  const initializeApplication = useCallback(async () => {
    console.log('🚀 Initializing FatturaAnalyzer...');
    setAppState('initializing');

    try {
      // 1. Controlla la connessione al backend. Se fallisce, va in errore.
      await apiClient.healthCheck();

      // 2. Controlla se il setup è stato completato.
      const firstRunResponse = await apiClient.checkFirstRun();
      
      // La logica ora è semplice: se il backend dice che è il primo avvio, mostriamo il wizard.
      if (firstRunResponse.data?.is_first_run) {
        console.log("🎯 First run detected. Setup is required.");
        setAppState('setup_needed');
      } else {
        console.log("✅ System already configured. Application is ready.");
        enableAllV4Features(); // Abilita le funzionalità avanzate
        setAppState('ready');
      }

    } catch (error: any) {
      console.error('❌ Initialization failed:', error);
      setAppState('error');
      addNotification({
        type: 'error',
        title: 'Errore di Connessione',
        message: error.message || 'Impossibile connettersi al backend. Verifica che sia in esecuzione.',
        duration: 10000, // Durata maggiore per un errore critico
      });
    }
  }, [addNotification]);

  useEffect(() => {
    // Esegui l'inizializzazione solo una volta al montaggio del componente
    initializeApplication();
  }, [initializeApplication]);

  // Callback per quando il wizard di setup viene completato con successo
  const handleSetupComplete = useCallback(() => {
    addNotification({
      type: 'success',
      title: '🎉 Setup Completato!',
      message: 'FatturaAnalyzer è pronto per l\'utilizzo.',
      duration: 5000,
    });
    enableAllV4Features();
    setAppState('ready');
  }, [addNotification]);
  
  // Funzione di rendering principale basata sullo stato dell'app
  const renderContent = () => {
    switch (appState) {
      case 'initializing':
        return <FullPageLoading message="Inizializzazione in corso..." />;
      
      case 'setup_needed':
        // Mostra il wizard di setup
        return <SimpleSetupWizard onComplete={handleSetupComplete} />;
        
      case 'ready':
        // Mostra l'applicazione principale completa di routing
        return (
          <BrowserRouter>
            <Layout>
              <Suspense fallback={<QueryLoadingFallback />}>
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
              </Suspense>
            </Layout>
          </BrowserRouter>
        );

      case 'error':
        // Mostra una schermata di errore chiara con un pulsante per riprovare
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Errore Critico</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Impossibile avviare l'applicazione. Verifica la connessione al backend e riprova.
            </p>
            <Button onClick={initializeApplication}>
              Riprova
            </Button>
          </div>
        );

      default:
        // Fallback per stati imprevisti
        return <FullPageLoading message="Stato dell'applicazione non riconosciuto." />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ProvidersWrapper>
        {renderContent()}
      </ProvidersWrapper>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
