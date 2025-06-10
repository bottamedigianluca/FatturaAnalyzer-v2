import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { invoke } from '@tauri-apps/api/tauri';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { FirstRunCheck } from '@/components/FirstRunCheck';
import { SimpleSetupWizard } from '@/components/setup/SetupWizard';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, WifiOff, Zap, Brain } from 'lucide-react';
import { 
  useUIStore, 
  useSystemHealth, 
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled,
  useRealTimeUpdates,
  enableAllV4Features,
  useIsFirstRun 
} from '@/store';
import { testBackendConnectionV4 } from '@/services/api';
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

// ===== QUERY CLIENT V4.0 =====
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Smart retry logic per V4.0
        if (error?.message?.includes('Backend non raggiungibile')) {
          return failureCount < 3;
        }
        if (error?.message?.includes('AI service unavailable')) {
          return failureCount < 2;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation Error V4.0:', error);
      }
    }
  },
});

// ===== APP STATES V4.0 =====
type AppState = 
  | 'initializing' 
  | 'checking_backend' 
  | 'checking_features'
  | 'setup_needed' 
  | 'ready' 
  | 'error'
  | 'maintenance'
  | 'degraded';

// ===== ERROR BOUNDARY V4.0 =====
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary V4.0:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md mx-auto space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              Errore Applicazione V4.0
            </h2>
            <p className="text-muted-foreground">
              Si è verificato un errore imprevisto. Ricaricare la pagina per continuare.
            </p>
            <Button onClick={() => window.location.reload()}>
              Ricarica Applicazione
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===== LOADING COMPONENTS V4.0 =====
const InitializingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground animate-pulse">
        Inizializzazione FatturaAnalyzer V4.0...
      </p>
    </div>
  </div>
);

const SystemStatus = ({ status }: { status: any }) => {
  const Icon = status.backend_healthy ? Wifi : WifiOff;
  const aiEnabled = useAIFeaturesEnabled();
  const smartReconciliation = useSmartReconciliationEnabled();
  const realTimeUpdates = useRealTimeUpdates();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2 text-sm">
          <Icon className={`h-4 w-4 ${status.backend_healthy ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-muted-foreground">Sistema V4.0</span>
        </div>
        
        <div className="flex items-center space-x-3 mt-2">
          {aiEnabled && (
            <div className="flex items-center space-x-1">
              <Brain className="h-3 w-3 text-purple-500" />
              <span className="text-xs text-purple-500">AI</span>
            </div>
          )}
          {smartReconciliation && (
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-500">Smart</span>
            </div>
          )}
          {realTimeUpdates && (
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-500">Real-time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN APP COMPONENT V4.0 =====
function App() {
  const [appState, setAppState] = useState<AppState>('initializing');
  const [backendConnection, setBackendConnection] = useState<{
    connected: boolean;
    message: string;
    features?: string[];
  }>({ connected: false, message: '' });

  const { addNotification, updateSystemStatus } = useUIStore();
  const systemHealth = useSystemHealth();
  const isFirstRun = useIsFirstRun();

  // ===== TAURI INITIALIZATION V4.0 =====
  useEffect(() => {
    const initializeTauri = async () => {
      if (window.__TAURI_IPC__) {
        try {
          await invoke('app_ready');
          console.log('🚀 Tauri IPC V4.0 initialized successfully');
          updateSystemStatus({ 
            adapter_status: { tauri: 'connected' },
            features_enabled: ['tauri_ipc', 'desktop_features']
          });
        } catch (tauriError) {
          console.warn('⚠️ Tauri IPC initialization failed, continuing in web mode:', tauriError);
          updateSystemStatus({ 
            adapter_status: { tauri: 'web_mode' },
            features_enabled: ['web_only']
          });
        }
      } else {
        console.log('🌐 Running in standard web mode V4.0');
        updateSystemStatus({ 
          adapter_status: { tauri: 'not_available' },
          features_enabled: ['web_standard']
        });
      }
    };

    initializeTauri();
  }, [updateSystemStatus]);

  // ===== BACKEND CONNECTION CHECK V4.0 =====
  useEffect(() => {
    const checkBackend = async () => {
      setAppState('checking_backend');
      
      try {
        const connectionResult = await testBackendConnectionV4();
        setBackendConnection(connectionResult);
        
        if (connectionResult.connected) {
          updateSystemStatus({ 
            backend_version: connectionResult.details?.version || 'V4.0',
            api_version: 'V4.0',
            features_enabled: connectionResult.details?.features || [],
            last_health_check: new Date().toISOString()
          });
          
          setAppState('checking_features');
        } else {
          setAppState('error');
        }
      } catch (error) {
        console.error('❌ Backend connection failed:', error);
        setBackendConnection({
          connected: false,
          message: 'Backend V4.0 non raggiungibile'
        });
        setAppState('error');
      }
    };

    if (appState === 'initializing') {
      // Delay per permettere all'UI di renderizzare
      setTimeout(checkBackend, 1000);
    }
  }, [appState, updateSystemStatus]);

  // ===== FEATURES CHECK V4.0 =====
  useEffect(() => {
    const checkFeatures = async () => {
      if (appState === 'checking_features') {
        try {
          // Abilita tutte le features V4.0 per default
          enableAllV4Features();
          
          addNotification({
            type: 'success',
            title: 'FatturaAnalyzer V4.0 Ready',
            message: 'Tutte le funzionalità ultra-enhanced sono attive',
            duration: 3000,
          });

          if (isFirstRun) {
            setAppState('setup_needed');
          } else {
            setAppState('ready');
          }
        } catch (error) {
          console.error('Features check failed:', error);
          setAppState('degraded');
        }
      }
    };

    checkFeatures();
  }, [appState, isFirstRun, addNotification]);

  // ===== ERROR RECOVERY V4.0 =====
  const handleRetryConnection = async () => {
    setAppState('initializing');
  };

  const handleSkipToApp = () => {
    addNotification({
      type: 'warning',
      title: 'Modalità Offline',
      message: 'Alcune funzionalità potrebbero non essere disponibili',
      duration: 5000,
    });
    setAppState('degraded');
  };

  // ===== SETUP HANDLERS V4.0 =====
  const handleSetupComplete = () => {
    addNotification({
      type: 'success',
      title: 'Setup Completato V4.0',
      message: 'Il sistema è configurato e pronto con tutte le funzionalità ultra-enhanced',
      duration: 5000,
    });
    setAppState('ready');
  };

  // ===== RENDER LOGIC V4.0 =====
  const renderContent = () => {
    switch (appState) {
      case 'initializing':
      case 'checking_backend':
      case 'checking_features':
        return <InitializingScreen />;

      case 'setup_needed':
        return (
          <FirstRunCheck
            onSetupNeeded={() => setAppState('setup_needed')}
            onSetupComplete={handleSetupComplete}
            onConnectionError={() => setAppState('error')}
          />
        );

      case 'error':
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8 space-y-6 max-w-md mx-auto">
              <WifiOff className="h-16 w-16 text-destructive mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-destructive">
                  Errore di Connessione V4.0
                </h2>
                <p className="text-muted-foreground">
                  {backendConnection.message || 'Impossibile comunicare con il backend'}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={handleRetryConnection} className="w-full">
                  Riprova Connessione
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkipToApp}
                  className="w-full"
                >
                  Continua Offline
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Verifica che il backend V4.0 sia in esecuzione su porta 8000
              </div>
            </div>
          </div>
        );

      case 'degraded':
      case 'ready':
        return (
          <Suspense fallback={<InitializingScreen />}>
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
                  <Route path="/import-export" element={<ImportExportPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
              
              {/* System Status Indicator V4.0 */}
              <SystemStatus status={systemHealth} />
            </BrowserRouter>
          </Suspense>
        );

      default:
        return <InitializingScreen />;
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="fattura-analyzer-theme-v4">
          <div className="min-h-screen bg-background font-sans antialiased">
            {renderContent()}
          </div>
          
          {/* Notifications V4.0 */}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton 
            expand={true}
            duration={4000}
          />
          
          {/* React Query DevTools (only in development) */}
          {import.meta.env.DEV && (
            <ReactQueryDevtools 
              initialIsOpen={false} 
              position="bottom-left"
              toggleButtonProps={{
                style: {
                  marginLeft: '5px',
                  transform: 'scale(0.7)',
                }
              }}
            />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
