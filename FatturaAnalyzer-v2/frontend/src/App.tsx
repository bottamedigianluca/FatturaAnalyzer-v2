import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Import diretti per i componenti principali del layout e dei provider
import { ProvidersWrapper } from '@/providers';
import { Layout } from '@/components/layout/Layout';
import { FullPageLoading, QueryLoadingFallback } from '@/providers/LoadingComponents';

// Importiamo le pagine usando React.lazy per il code-splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage').then(module => ({ default: module.InvoicesPage })));
const InvoiceDetailPage = React.lazy(() => import('./pages/InvoiceDetailPage').then(module => ({ default: module.InvoiceDetailPage })));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const TransactionDetailPage = React.lazy(() => import('./pages/TransactionDetailPage').then(module => ({ default: module.TransactionDetailPage })));
const ReconciliationPage = React.lazy(() => import('./pages/ReconciliationPage').then(module => ({ default: module.ReconciliationPage })));
const AnagraphicsPage = React.lazy(() => import('./pages/AnagraphicsPage').then(module => ({ default: module.AnagraphicsPage })));
const AnagraphicsDetailPage = React.lazy(() => import('./pages/AnagraphicsDetailPage').then(module => ({ default: module.AnagraphicsDetailPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const ImportExportPage = React.lazy(() => import('./pages/ImportExportPage').then(module => ({ default: module.ImportExportPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

// Creazione del client per React Query con configurazione ottimizzata
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti
      gcTime: 30 * 60 * 1000, // 30 minuti (nuovo nome per cacheTime)
      retry: (failureCount, error) => {
        // Non riprovare per errori 4xx, riprova per errori di rete
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Componente principale dell'applicazione - VERSIONE FINALE OTTIMIZZATA
function App() {
  // Gestione errori globale per React Query
  const handleQueryError = React.useCallback((error: Error) => {
    console.error('🚨 React Query Error:', error);
    // Qui potresti aggiungere reporting degli errori
  }, []);

  React.useEffect(() => {
    // Log di debug per sviluppo
    if (import.meta.env.DEV) {
      console.log('🚀 FatturaAnalyzer V4.0 App initialized');
      console.log('📊 Features enabled:', {
        lazyLoading: true,
        reactQuery: true,
        routerV6: true,
        providers: true,
        fallbackSystem: true
      });
    }

    // Gestione errori non catturati
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('🚨 Unhandled error:', event.error);
      // Non bloccare l'app per errori non critici
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      // Previeni il crash dell'app
      event.preventDefault();
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ProvidersWrapper>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<FullPageLoading message="Inizializzazione applicazione..." />}>
            <Routes>
              {/* Redirect della root alla dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Route principali con Layout condiviso */}
              <Route path="/" element={<Layout />}>
                <Route path="dashboard" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <DashboardPage />
                  </Suspense>
                } />
                
                <Route path="invoices" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <InvoicesPage />
                  </Suspense>
                } />
                
                <Route path="invoices/:id" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <InvoiceDetailPage />
                  </Suspense>
                } />
                
                <Route path="transactions" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <TransactionsPage />
                  </Suspense>
                } />
                
                <Route path="transactions/:id" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <TransactionDetailPage />
                  </Suspense>
                } />
                
                <Route path="reconciliation" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <ReconciliationPage />
                  </Suspense>
                } />
                
                <Route path="anagraphics" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <AnagraphicsPage />
                  </Suspense>
                } />
                
                <Route path="anagraphics/:id" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <AnagraphicsDetailPage />
                  </Suspense>
                } />
                
                <Route path="analytics" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                } />
                
                <Route path="import" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <ImportExportPage />
                  </Suspense>
                } />
                
                <Route path="settings" element={
                  <Suspense fallback={<QueryLoadingFallback />}>
                    <SettingsPage />
                  </Suspense>
                } />
              </Route>
              
              {/* Fallback per route non trovate */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ProvidersWrapper>
      
      {/* Toast notifications globali */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
