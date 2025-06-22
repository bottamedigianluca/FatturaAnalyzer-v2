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

// Creazione del client per React Query
const queryClient = new QueryClient();

// Componente principale dell'applicazione
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProvidersWrapper>
        <BrowserRouter>
          <Suspense fallback={<FullPageLoading />}>
            <Routes>
              {/* La rotta base reindirizza alla dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Tutte le route che utilizzano il Layout */}
              <Route path="/" element={<Layout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="transactions/:id" element={<TransactionDetailPage />} />
                <Route path="reconciliation" element={<ReconciliationPage />} />
                <Route path="anagraphics" element={<AnagraphicsPage />} />
                <Route path="anagraphics/:id" element={<AnagraphicsDetailPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="import" element={<ImportExportPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              
              {/* Fallback per qualsiasi rotta non trovata */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ProvidersWrapper>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
