/**
 * Error Boundary V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Sistema avanzato di gestione errori con:
 * - Error reporting e analytics
 * - Recovery mechanisms
 * - User-friendly fallbacks
 * - Performance monitoring
 */

import React, { ReactNode, ErrorInfo } from 'react';
import { useUIStore } from '@/store';

// ===== TYPES V4.0 =====
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  lastErrorTime?: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetTimeoutMs?: number;
  isolate?: boolean;
  reportErrors?: boolean;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  retryCount: number;
  additionalInfo?: Record<string, any>;
}

// ===== ERROR BOUNDARY CLASS V4.0 =====
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;
  private errorReportingEnabled: boolean;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0,
    };
    
    this.errorReportingEnabled = props.reportErrors ?? true;
    
    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.reportError = this.reportError.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Genera ID univoco per l'errore
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 ErrorBoundary V4.0 caught an error:', error, errorInfo);
    
    // Aggiorna stato con info dettagliate
    this.setState(prevState => ({
      ...prevState,
      errorInfo,
    }));
    
    // Report dell'errore
    if (this.errorReportingEnabled) {
      this.reportError(error, errorInfo);
    }
    
    // Notifica allo store UI
    this.notifyUIStore(error);
    
    // Callback personalizzato
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Auto-retry se abilitato e non superato il limite
    const { enableRetry = true, maxRetries = 3, resetTimeoutMs = 5000 } = this.props;
    
    if (enableRetry && this.state.retryCount < maxRetries) {
      this.scheduleRetry(resetTimeoutMs);
    }
  }

  // Report errore al sistema di monitoring
  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorReport: ErrorReport = {
        errorId: this.state.errorId!,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount,
        additionalInfo: {
          errorName: error.name,
          cause: (error as any).cause,
          props: this.props.isolate ? '[ISOLATED]' : Object.keys(this.props),
        },
      };
      
      // Qui potresti inviare a un servizio di error tracking
      console.log('📊 Error Report V4.0:', errorReport);
      
      // Salva localmente per debug
      const reports = JSON.parse(localStorage.getItem('error-reports-v4') || '[]');
      reports.push(errorReport);
      
      // Mantieni solo gli ultimi 50 report
      if (reports.length > 50) {
        reports.splice(0, reports.length - 50);
      }
      
      localStorage.setItem('error-reports-v4', JSON.stringify(reports));
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  // Notifica allo store UI
  private notifyUIStore(error: Error) {
    try {
      const { addNotification } = useUIStore.getState();
      
      addNotification({
        type: 'error',
        title: 'Errore dell\'Applicazione',
        message: this.getErrorMessage(error),
        duration: 8000,
      });
    } catch (storeError) {
      console.error('Failed to notify UI store:', storeError);
    }
  }

  // Ottieni messaggio errore user-friendly
  private getErrorMessage(error: Error): string {
    // Mappa errori noti a messaggi comprensibili
    if (error.message.includes('ChunkLoadError')) {
      return 'Errore di caricamento. Aggiorna la pagina.';
    }
    
    if (error.message.includes('Network Error')) {
      return 'Errore di connessione. Verifica la tua connessione internet.';
    }
    
    if (error.message.includes('Unauthorized')) {
      return 'Sessione scaduta. Effettua nuovamente il login.';
    }
    
    if (error.name === 'ValidationError') {
      return 'Errore di validazione dati.';
    }
    
    if (error.message.includes('AI service')) {
      return 'Servizio AI temporaneamente non disponibile.';
    }
    
    return 'Si è verificato un errore imprevisto.';
  }

  // Programma retry automatico
  private scheduleRetry(delayMs: number) {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delayMs);
  }

  // Gestisce retry manuale
  private handleRetry() {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
    }));
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
  }

  // Reset completo dello stato
  private handleReset() {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: 0,
      lastErrorTime: undefined,
    });
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = undefined;
    }
  }

  // Cleanup
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback personalizzato
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Fallback UI predefinito V4.0
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          canRetry={this.props.enableRetry && this.state.retryCount < (this.props.maxRetries || 3)}
        />
      );
    }

    return this.props.children;
  }
}

// ===== ERROR FALLBACK UI COMPONENT =====
interface ErrorFallbackUIProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  canRetry: boolean;
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  onRetry,
  onReset,
  canRetry,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const isDevelopment = import.meta.env.DEV;

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportIssue = () => {
    const subject = `Error Report - ${errorId}`;
    const body = `
Error ID: ${errorId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Retry Count: ${retryCount}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    const mailto = `mailto:support@fatturaanalyzer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
        {/* Icon */}
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Oops! Qualcosa è andato storto
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          Si è verificato un errore imprevisto. Ci scusiamo per l'inconveniente.
        </p>

        {/* Error ID */}
        {errorId && (
          <div className="bg-muted/50 rounded p-2 mb-4 text-xs font-mono text-muted-foreground">
            ID Errore: {errorId}
          </div>
        )}

        {/* Retry Info */}
        {retryCount > 0 && (
          <div className="text-sm text-muted-foreground mb-4">
            Tentativi effettuati: {retryCount}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
            >
              Riprova
            </button>
          )}
          
          <button
            onClick={onReset}
            className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded hover:bg-secondary/90 transition-colors"
          >
            Reset Componente
          </button>
          
          <button
            onClick={handleReload}
            className="w-full border border-border py-2 px-4 rounded hover:bg-accent transition-colors"
          >
            Ricarica Pagina
          </button>
        </div>

        {/* Additional Actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? 'Nascondi' : 'Mostra'} Dettagli Tecnici
          </button>
          
          <div className="mt-2">
            <button
              onClick={handleReportIssue}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Segnala Problema
            </button>
          </div>
        </div>

        {/* Technical Details */}
        {showDetails && (isDevelopment || error) && (
          <div className="mt-4 p-3 bg-muted/30 rounded text-left">
            <h3 className="text-sm font-medium mb-2">Dettagli Tecnici:</h3>
            <div className="text-xs font-mono text-muted-foreground space-y-2">
              {error?.name && (
                <div>
                  <strong>Tipo:</strong> {error.name}
                </div>
              )}
              {error?.message && (
                <div>
                  <strong>Messaggio:</strong> {error.message}
                </div>
              )}
              {isDevelopment && error?.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== UTILITY ERROR BOUNDARIES =====

/**
 * Error Boundary per sezioni specifiche
 */
export const SectionErrorBoundary: React.FC<{
  children: ReactNode;
  section: string;
}> = ({ children, section }) => (
  <ErrorBoundary
    enableRetry={true}
    maxRetries={2}
    isolate={true}
    fallback={
      <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          <span className="font-medium">Errore in {section}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Questa sezione non può essere caricata al momento.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

/**
 * Error Boundary per componenti critici
 */
export const CriticalErrorBoundary: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <ErrorBoundary
    enableRetry={false}
    reportErrors={true}
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Errore Critico
          </h1>
          <p className="text-muted-foreground mb-4">
            L'applicazione ha riscontrato un errore critico e deve essere ricaricata.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Ricarica Applicazione
          </button>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// ===== ERROR REPORTING UTILITIES =====

/**
 * Segnala errore manualmente
 */
export const reportError = (error: Error, context?: string) => {
  console.error(`Manual error report [${context}]:`, error);
  
  const { addNotification } = useUIStore.getState();
  addNotification({
    type: 'error',
    title: context ? `Errore in ${context}` : 'Errore',
    message: error.message,
    duration: 5000,
  });
};

/**
 * Hook per gestire errori in componenti funzionali
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    reportError(error, context);
  }, []);

  return handleError;
};
