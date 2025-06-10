/**
 * App.tsx V4.0 Ultra-Enhanced
 * Aggiornato per utilizzare tutte le nuove funzionalità V4.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { invoke } from '@tauri-apps/api/tauri';

// Updated imports for V4.0
import { ProvidersWrapper } from '@/providers';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { FirstRunCheck } from '@/components/FirstRunCheck';
import { SimpleSetupWizard } from '@/components/setup/SetupWizard';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wifi, WifiOff, Zap, Brain, Cpu, Database } from 'lucide-react';

// V4.0 Enhanced Store Integration
import { 
  useUIStore, 
  useSystemHealth, 
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled,
  useRealTimeUpdates,
  enableAllV4Features,
  useIsFirstRun,
  useHasActiveOperations,
  useSmartFeaturesEnabled
} from '@/store';

// V4.0 Enhanced API
import { testBackendConnectionV4, runCompleteAPITestV4 } from '@/services/api';

// Updated Pages with V4.0 integration
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

// ===== ENHANCED APP STATES V4.0 =====
type AppState = 
  | 'initializing' 
  | 'checking_backend' 
  | 'checking_features'
  | 'validating_v4_compatibility'
  | 'setup_needed' 
  | 'ready' 
  | 'error'
  | 'maintenance'
  | 'degraded'
  | 'v4_activating';

// ===== V4.0 SYSTEM STATUS COMPONENT =====
const V4SystemStatus = () => {
  const systemHealth = useSystemHealth();
  const smartFeatures = useSmartFeaturesEnabled();
  const activeOps = useHasActiveOperations();
  const realTimeUpdates = useRealTimeUpdates();

  const getStatusColor = () => {
    if (!systemHealth.backend_healthy) return 'text-red-500';
    if (activeOps.any_active) return 'text-blue-500';
    if (smartFeatures.all_enabled) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = () => {
    if (!systemHealth.backend_healthy) return WifiOff;
    if (activeOps.any_active) return Cpu;
    if (smartFeatures.all_enabled) return Brain;
    return Wifi;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm">
            <StatusIcon className={`h-4 w-4 ${getStatusColor()}`} />
            <span className="font-medium">FatturaAnalyzer V4.0</span>
          </div>
          {systemHealth.backend_healthy && (
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-500">Online</span>
            </div>
          )}
        </div>
        
        {/* V4.0 Features Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <Brain className={`h-3 w-3 ${smartFeatures.ai_features ? 'text-purple-500' : 'text-gray-400'}`} />
            <span className={smartFeatures.ai_features ? 'text-purple-500' : 'text-gray-400'}>
              AI Enhanced
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Zap className={`h-3 w-3 ${smartFeatures.smart_reconciliation ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className={smartFeatures.smart_reconciliation ? 'text-blue-500' : 'text-gray-400'}>
              Smart Recon
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Database className={`h-3 w-3 ${realTimeUpdates ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={realTimeUpdates ? 'text-green-500' : 'text-gray-400'}>
              Real-time
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Cpu className={`h-3 w-3 ${activeOps.any_active ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className={activeOps.any_active ? 'text-orange-500' : 'text-gray-400'}>
              {activeOps.any_active ? 'Processing' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Operations Status */}
        {activeOps.any_active && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {activeOps.importing && '📥 Importing '}
              {activeOps.exporting && '📤 Exporting '}
              {activeOps.syncing && '☁️ Syncing '}
              {activeOps.loading && '⚡ Loading '}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== V4.0 ENHANCED ERROR BOUNDARY =====
class V4ErrorBoundary extends React.Component<
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
    console.error('🔥 V4.0 App Error:', error, errorInfo);
    
    // V4.0 Enhanced error reporting
    if (window.__FATTURA_ANALYZER_DEBUG__) {
      window.__FATTURA_ANALYZER_DEBUG__.lastError = {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        v4_features: {
          ai_enabled: useUIStore.getState().settings.ai_features_enabled,
          smart_reconciliation: useUIStore.getState().settings.smart_reconciliation_enabled,
          real_time: useUIStore.getState().settings.real_time_updates,
        }
      };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md mx-auto space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              FatturaAnalyzer V4.0 Error
            </h2>
            <p className="text-muted-foreground">
              Si è verificato un errore nell'applicazione V4.0. 
              Tutte le funzionalità avanzate sono state temporaneamente disabilitate.
            </p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()}>
                Ricarica Applicazione
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Disable V4 features and restart
                  localStorage.setItem('v4_features_disabled', 'true');
                  window.location.reload();
                }}
              >
                Riavvia in Modalità Sicura
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===== MAIN APP COMPONENT V4.0 =====
function App() {
  const [appState, setAppState] = useState<AppState>('initializing');
  const [backendConnection, setBackendConnection] = useState<{
    connected: boolean;
    message: string;
    features?: string[];
    v4_compatible?: boolean;
  }>({ connected: false, message: '' });

  const { addNotification, updateSystemStatus } = useUIStore();
  const systemHealth = useSystemHealth();
  const isFirstRun = useIsFirstRun();

  // ===== V4.0 INITIALIZATION =====
  useEffect(() => {
    const initializeV4Application = async () => {
      console.log('🚀 Initializing FatturaAnalyzer V4.0...');
      
      try {
        setAppState('checking_backend');
        
        // V4.0 Backend Connection Test
        const connectionResult = await testBackendConnectionV4();
        setBackendConnection(connectionResult);
        
        if (connectionResult.connected) {
          setAppState('validating_v4_compatibility');
          
          // V4.0 Features Validation
          const apiTest = await runCompleteAPITestV4();
          
          updateSystemStatus({ 
            backend_version: connectionResult.details?.version || 'V4.0',
            api_version: 'V4.0',
            features_enabled: connectionResult.details?.features || [],
            last_health_check: new Date().toISOString(),
            v4_compatible: apiTest.success
          });
          
          if (apiTest.success) {
            setAppState('v4_activating');
            
            // Check if V4 features should be disabled (safe mode)
            const v4Disabled = localStorage.getItem('v4_features_disabled') === 'true';
            
            if (!v4Disabled) {
              // Enable all V4.0 features
              enableAllV4Features();
              
              addNotification({
                type: 'success',
                title: 'FatturaAnalyzer V4.0 Ultra-Enhanced Active! 🚀',
                message: 'AI Analytics, Smart Reconciliation e Real-time Features attivate',
                duration: 4000,
              });
            } else {
              addNotification({
                type: 'warning',
                title: 'Modalità Sicura Attiva',
                message: 'V4.0 features disabilitate. Puoi riattivarle dalle impostazioni.',
                duration: 5000,
              });
              localStorage.removeItem('v4_features_disabled');
            }
            
            setAppState(isFirstRun ? 'setup_needed' : 'ready');
          } else {
            throw new Error('V4.0 Backend compatibility check failed');
          }
        } else {
          setAppState('error');
        }
      } catch (error) {
        console.error('❌ V4.0 Initialization failed:', error);
        setAppState('error');
        
        addNotification({
          type: 'error',
          title: 'Errore Inizializzazione V4.0',
          message: 'Alcune funzionalità potrebbero non essere disponibili',
          duration: 8000,
        });
      }
    };

    // Delay for UI to render
    setTimeout(initializeV4Application, 1000);
  }, [addNotification, updateSystemStatus, isFirstRun]);

  // ===== TAURI INTEGRATION V4.0 =====
  useEffect(() => {
    const initializeTauri = async () => {
      if (window.__TAURI_IPC__) {
        try {
          await invoke('app_ready');
          console.log('🖥️ Tauri Desktop Mode V4.0 Active');
          updateSystemStatus({ 
            adapter_status: { tauri: 'connected', mode: 'desktop' },
            features_enabled: ['tauri_ipc', 'desktop_features', 'file_system_access']
          });
        } catch (error) {
          console.warn('⚠️ Tauri unavailable, running in web mode V4.0');
          updateSystemStatus({ 
            adapter_status: { tauri: 'web_mode' },
            features_enabled: ['web_standard', 'pwa_ready']
          });
        }
      }
    };

    initializeTauri();
  }, [updateSystemStatus]);

  // ===== ERROR RECOVERY V4.0 =====
  const handleRetryConnection = async () => {
    setAppState('initializing');
  };

  const handleActivateV4Features = () => {
    enableAllV4Features();
    addNotification({
      type: 'success',
      title: 'V4.0 Features Attivate! 🚀',
      message: 'AI Analytics, Smart Reconciliation e Real-time attive',
      duration: 3000,
    });
    setAppState('ready');
  };

  const handleSkipToApp = () => {
    addNotification({
      type: 'warning',
      title: 'Modalità Offline V4.0',
      message: 'Funzionalità base disponibili, features avanzate limitate',
      duration: 5000,
    });
    setAppState('degraded');
  };

  // ===== RENDER LOGIC V4.0 =====
  const renderContent = () => {
    switch (appState) {
      case 'initializing':
      case 'checking_backend':
      case 'validating_v4_compatibility':
      case 'v4_activating':
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <div>
                <h2 className="text-2xl font-bold mb-2">FatturaAnalyzer V4.0 Ultra-Enhanced</h2>
                <p className="text-muted-foreground">
                  {appState === 'checking_backend' && 'Connessione al backend V4.0...'}
                  {appState === 'validating_v4_compatibility' && 'Validazione compatibilità V4.0...'}
                  {appState === 'v4_activating' && 'Attivazione features ultra-enhanced...'}
                  {appState === 'initializing' && 'Inizializzazione sistema...'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'setup_needed':
        return (
          <FirstRunCheck
            onSetupNeeded={() => setAppState('setup_needed')}
            onSetupComplete={() => setAppState('ready')}
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
                  Errore Connessione V4.0
                </h2>
                <p className="text-muted-foreground">
                  {backendConnection.message || 'Backend V4.0 non raggiungibile'}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={handleRetryConnection} className="w-full">
                  Riprova Connessione V4.0
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkipToApp}
                  className="w-full"
                >
                  Continua Offline
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleActivateV4Features}
                  className="w-full"
                >
                  🚀 Forza Attivazione V4.0
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
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Caricamento interfaccia V4.0...</p>
              </div>
            </div>
          }>
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
              
              {/* V4.0 System Status Indicator */}
              <V4SystemStatus />
            </BrowserRouter>
          </Suspense>
        );

      default:
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-muted-foreground">Stato applicazione sconosciuto</p>
              <Button onClick={() => setAppState('initializing')}>
                Reinizializza
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <V4ErrorBoundary>
      <ProvidersWrapper 
        enableDevtools={import.meta.env.DEV}
        enablePerformanceMonitoring={true}
      >
        <div className="min-h-screen bg-background font-sans antialiased">
          {renderContent()}
        </div>
        
        {/* V4.0 Enhanced Notifications */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          expand={true}
          duration={4000}
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--card-foreground))',
            },
          }}
        />
        
        {/* React Query DevTools V4.0 */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools 
            initialIsOpen={false} 
            position="bottom-left"
            toggleButtonProps={{
              style: {
                marginLeft: '5px',
                transform: 'scale(0.7)',
                zIndex: 9999,
              }
            }}
          />
        )}
      </ProvidersWrapper>
    </V4ErrorBoundary>
  );
}

export default App;
