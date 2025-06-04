import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';

// Layout components
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

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

function App() {
  const { setLoading, setError, addNotification } = useUIStore();

  useEffect(() => {
    // Initialize Tauri app
    const initializeApp = async () => {
      try {
        setLoading('app-init', true);
        
        // Check if running in Tauri
        if (window.__TAURI_IPC__) {
          // Setup Tauri-specific configurations
          await invoke('app_ready');
          
          addNotification({
            type: 'success',
            title: 'Applicazione avviata',
            message: 'FatturaAnalyzer è pronto all\'uso',
            duration: 3000,
          });
        }
        
        // Test API connection
        try {
          const response = await fetch('http://127.0.0.1:8000/health');
          if (!response.ok) {
            throw new Error('API non raggiungibile');
          }
          
          const health = await response.json();
          if (health.status !== 'healthy') {
            throw new Error('API non funzionante');
          }
          
          addNotification({
            type: 'success',
            title: 'Connessione API',
            message: 'Backend collegato correttamente',
            duration: 2000,
          });
        } catch (apiError) {
          setError('api-connection', 'Impossibile connettersi al backend FastAPI');
          addNotification({
            type: 'error',
            title: 'Errore connessione',
            message: 'Verificare che il backend sia avviato su porta 8000',
            duration: 0, // Persistent
            action: {
              label: 'Riprova',
              onClick: () => window.location.reload(),
            },
          });
        }
        
      } catch (error) {
        console.error('App initialization error:', error);
        setError('app-init', 'Errore durante l\'inizializzazione');
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

    initializeApp();
  }, [setLoading, setError, addNotification]);

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