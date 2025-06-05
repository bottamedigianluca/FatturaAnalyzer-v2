import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';

// Layout components
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// First Run components
import { FirstRunCheck, SimpleSetupWizard } from '@/components/FirstRunCheck';

// Page components
import { DashboardPage } from '@/pages/DashboardPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import { ReconciliationPage } from '@/pages/ReconciliationPage';
import { AnagraphicsPage } from '@/pages/AnagraphicsPage';
import { AnagraphicsDetailPage } from '@/pages/AnagraphicsDetailPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ImportExportPage } from '@/pages/ImportExportPage';
import { SettingsPage } from '@/pages/SettingsPage';

// Store
import { useUIStore } from '@/store';

// Styles
import './globals.css';

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// App states
type AppState = 'loading' | 'setup-needed' | 'setup-complete' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const { setLoading, setError, addNotification } = useUIStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading('app-init', true);
      
      // Check if running in Tauri
      if (window.__TAURI_IPC__) {
        try {
          // Setup Tauri-specific configurations
          await invoke('app_ready');
          console.log('🖥️ Tauri initialized successfully');
          
          addNotification({
            type: 'success',
            title: 'Applicazione avviata',
            message: 'FatturaAnalyzer è pronto all\'uso',
            duration: 3000,
          });
        } catch (tauriError) {
          console.warn('⚠️ Tauri initialization failed, continuing in web mode:', tauriError);
        }
      } else {
        console.log('🌐 Running in web mode');
      }
      
      // App initialization completed - FirstRunCheck will handle the rest
      setAppState('loading'); // FirstRunCheck will change this
      
    } catch (error) {
      console.error('❌ App initialization error:', error);
      setError('app-init', 'Errore durante l\'inizializzazione');
      setAppState('error');
      
      addNotification({
        type: 'error',
        title: 'Errore inizializzazione',
        message: 'Si è verificato un errore durante l\'avvio',
        duration: 0,
      });
    } finally {
      setLoading('app-init', false);
    }
  };

  const handleSetupNeeded = () => {
    console.log('🎯 Setup needed, showing setup wizard');
    setAppState('setup-needed');
  };

  const handleSetupComplete = () => {
    console.log('✅ Setup completed, showing main app');
    setAppState('setup-complete');
    
    addNotification({
      type: 'success',
      title: 'Setup Completato',
      message: 'Il sistema è ora configurato e pronto all\'uso',
      duration: 5000,
    });
  };

  // Loading state
  if (appState === 'loading') {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FirstRunCheck
            onSetupNeeded={handleSetupNeeded}
            onSetupComplete={handleSetupComplete}
          />
          <Toaster position="top-right" expand={true} richColors closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Setup needed
  if (appState === 'setup-needed') {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SimpleSetupWizard onComplete={handleSetupComplete} />
          <Toaster position="top-right" expand={true} richColors closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Error state
  if (appState === 'error') {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
              <div className="text-red-500 text-5xl">❌</div>
              <h2 className="text-lg font-semibold text-red-600">Errore Inizializzazione</h2>
              <p className="text-muted-foreground">
                Si è verificato un errore durante l'avvio dell'applicazione
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Riavvia Applicazione
              </button>
            </div>
          </div>
          <Toaster position="top-right" expand={true} richColors closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Main app (setup completed)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Invoices */}
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                
                {/* Transactions */}
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="transactions/:id" element={<TransactionDetailPage />} />
                
                {/* Reconciliation */}
                <Route path="reconciliation" element={<ReconciliationPage />} />
                
                {/* Anagraphics */}
                <Route path="anagraphics" element={<AnagraphicsPage />} />
                <Route path="anagraphics/:id" element={<AnagraphicsDetailPage />} />
                
                {/* Analytics */}
                <Route path="analytics" element={<AnalyticsPage />} />
                
                {/* Import/Export */}
                <Route path="import" element={<ImportExportPage />} />
                
                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
            
            {/* Global Notifications */}
            <Toaster 
              position="top-right"
              expand={true}
              richColors
              closeButton
            />
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
