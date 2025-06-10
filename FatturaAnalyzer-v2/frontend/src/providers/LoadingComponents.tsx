/**
 * LoadingComponents V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Componenti di loading e fallback UI
 */

import React from 'react';

// ===== LOADING SPINNER PRINCIPALE =====
export const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Caricamento FatturaAnalyzer V4.0...</p>
    </div>
  </div>
);

// ===== QUERY LOADING FALLBACK =====
export const QueryLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 p-6 bg-card border border-border rounded-lg shadow-lg">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Inizializzazione servizi...</p>
    </div>
  </div>
);

// ===== AUTH LOADING FALLBACK =====
export const AuthLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4 p-8 bg-card border border-border rounded-lg shadow-lg max-w-sm mx-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Autenticazione</h3>
        <p className="text-sm text-muted-foreground">Verifica delle credenziali in corso...</p>
      </div>
    </div>
  </div>
);

// ===== FEATURE LOADING FALLBACK =====
export const FeatureLoadingFallback = ({ feature }: { feature: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Caricamento {feature}...</p>
    </div>
  </div>
);

// ===== SKELETON LOADING =====
export const SkeletonLoader = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-muted rounded w-full"></div>
      </div>
    ))}
  </div>
);

// ===== TABLE SKELETON =====
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="animate-pulse h-4 bg-muted rounded flex-1"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="animate-pulse h-4 bg-muted/50 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

// ===== CARD SKELETON =====
export const CardSkeleton = () => (
  <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-muted rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-muted rounded w-20"></div>
        <div className="h-8 bg-muted rounded w-16"></div>
      </div>
    </div>
  </div>
);

// ===== DASHBOARD SKELETON =====
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="animate-pulse h-8 bg-muted rounded w-48"></div>
      <div className="animate-pulse h-10 bg-muted rounded w-32"></div>
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="animate-pulse h-6 bg-muted rounded w-40"></div>
        <TableSkeleton />
      </div>
      <div className="space-y-4">
        <div className="animate-pulse h-6 bg-muted rounded w-32"></div>
        <div className="animate-pulse h-64 bg-muted rounded"></div>
      </div>
    </div>
  </div>
);

// ===== FULL PAGE LOADING =====
export const FullPageLoading = ({ message = 'Caricamento...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <div>
        <h2 className="text-xl font-semibold mb-2">FatturaAnalyzer V4.0</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  </div>
);
