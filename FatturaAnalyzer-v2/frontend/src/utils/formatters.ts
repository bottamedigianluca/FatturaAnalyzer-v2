/**
 * Business-specific formatting utilities for FatturaAnalyzer
 * Formattatori specifici per entità di business
 */

import type { PaymentStatus, ReconciliationStatus, InvoiceType, AnagraphicsType } from '@/types';

/**
 * Formatta lo stato di pagamento di una fattura
 */
export function formatPaymentStatus(status: PaymentStatus): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
} {
  const statusMap: Record<PaymentStatus, { label: string; variant: any; color: string }> = {
    'Aperta': { 
      label: 'Aperta', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400' 
    },
    'Scaduta': { 
      label: 'Scaduta', 
      variant: 'destructive', 
      color: 'text-red-600 dark:text-red-400' 
    },
    'Pagata Parz.': { 
      label: 'Pagata Parzialmente', 
      variant: 'warning', 
      color: 'text-yellow-600 dark:text-yellow-400' 
    },
    'Pagata Tot.': { 
      label: 'Pagata Totalmente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400' 
    },
    'Insoluta': { 
      label: 'Insoluta', 
      variant: 'destructive', 
      color: 'text-red-700 dark:text-red-300' 
    },
    'Riconciliata': { 
      label: 'Riconciliata', 
      variant: 'success', 
      color: 'text-green-700 dark:text-green-300' 
    }
  };

  return statusMap[status] || { 
    label: status, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400' 
  };
}

/**
 * Formatta lo stato di riconciliazione
 */
export function formatReconciliationStatus(status: ReconciliationStatus): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
} {
  const statusMap: Record<ReconciliationStatus, { label: string; variant: any; color: string }> = {
    'Da Riconciliare': { 
      label: 'Da Riconciliare', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400' 
    },
    'Riconciliato Parz.': { 
      label: 'Riconciliato Parzialmente', 
      variant: 'warning', 
      color: 'text-yellow-600 dark:text-yellow-400' 
    },
    'Riconciliato Tot.': { 
      label: 'Riconciliato Totalmente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400' 
    },
    'Riconciliato Eccesso': { 
      label: 'Riconciliato in Eccesso', 
      variant: 'warning', 
      color: 'text-orange-600 dark:text-orange-400' 
    },
    'Ignorato': { 
      label: 'Ignorato', 
      variant: 'default', 
      color: 'text-gray-500 dark:text-gray-500' 
    }
  };

  return statusMap[status] || { 
    label: status, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400' 
  };
}

/**
 * Formatta il tipo di fattura
 */
export function formatInvoiceType(type: InvoiceType): {
  label: string;
  shortLabel: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
} {
  const typeMap: Record<InvoiceType, { label: string; shortLabel: string; variant: any; color: string }> = {
    'Attiva': { 
      label: 'Fattura Attiva (Emessa)', 
      shortLabel: 'Attiva',
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400' 
    },
    'Passiva': { 
      label: 'Fattura Passiva (Ricevuta)', 
      shortLabel: 'Passiva',
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400' 
    }
  };

  return typeMap[type] || { 
    label: type, 
    shortLabel: type,
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400' 
  };
}

/**
 * Formatta il tipo di anagrafica
 */
export function formatAnagraphicsType(type: AnagraphicsType): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
  icon: string;
} {
  const typeMap: Record<AnagraphicsType, { label: string; variant: any; color: string; icon: string }> = {
    'Cliente': { 
      label: 'Cliente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400',
      icon: '👤'
    },
    'Fornitore': { 
      label: 'Fornitore', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400',
      icon: '🏢'
    }
  };

  return typeMap[type] || { 
    label: type, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400',
    icon: '❓'
  };
}

/**
 * Formatta un numero di documento
 */
export function formatDocumentNumber(
  docType: string | undefined,
  docNumber: string
): string {
  if (!docNumber) return '-';
  
  const type = docType?.toLowerCase() || '';
  
  if (type.includes('fattura')) {
    return `Fatt. ${docNumber}`;
  } else if (type.includes('nota')) {
    return `NC ${docNumber}`;
  } else if (type.includes('ricevuta')) {
    return `Ric. ${docNumber}`;
  }
  
  return docNumber;
}

/**
 * Formatta un codice di identificazione fiscale
 */
export function formatTaxCode(
  piva?: string,
  cf?: string
): string {
  if (piva && cf) {
    return `P.IVA: ${piva} • CF: ${cf}`;
  } else if (piva) {
    return `P.IVA: ${piva}`;
  } else if (cf) {
    return `CF: ${cf}`;
  }
  
  return 'Codici fiscali non disponibili';
}

/**
 * Formatta l'importo rimanente di una fattura
 */
export function formatRemainingAmount(
  totalAmount: number,
  paidAmount: number = 0
): {
  remaining: number;
  percentage: number;
  isFullyPaid: boolean;
  isOverpaid: boolean;
} {
  const remaining = totalAmount - paidAmount;
  const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  return {
    remaining,
    percentage,
    isFullyPaid: remaining <= 0.01, // Tolleranza per errori di arrotondamento
    isOverpaid: remaining < -0.01
  };
}

/**
 * Formatta la scadenza di una fattura
 */
export function formatDueStatus(dueDate?: string): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  daysUntilDue?: number;
} {
  if (!dueDate) {
    return {
      label: 'Senza scadenza',
      variant: 'default',
      color: 'text-gray-500 dark:text-gray-500'
    };
  }

  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Scaduta da ${Math.abs(diffDays)} giorni`,
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      daysUntilDue: diffDays
    };
  } else if (diffDays === 0) {
    return {
      label: 'Scade oggi',
      variant: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
      daysUntilDue: diffDays
    };
  } else if (diffDays <= 7) {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      daysUntilDue: diffDays
    };
  } else if (diffDays <= 30) {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'default',
      color: 'text-blue-600 dark:text-blue-400',
      daysUntilDue: diffDays
    };
  } else {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'success',
      color: 'text-green-600 dark:text-green-400',
      daysUntilDue: diffDays
    };
  }
}

/**
 * Formatta la confidenza di una riconciliazione
 */
export function formatConfidence(confidence: number): {
  label: string;
  percentage: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
} {
  const percentage = `${Math.round(confidence * 100)}%`;
  
  if (confidence >= 0.9) {
    return {
      label: 'Alta',
      percentage,
      variant: 'success',
      color: 'text-green-600 dark:text-green-400'
    };
  } else if (confidence >= 0.7) {
    return {
      label: 'Media',
      percentage,
      variant: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400'
    };
  } else {
    return {
      label: 'Bassa',
      percentage,
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400'
    };
  }
}

/**
 * Formatta una descrizione di transazione bancaria per renderla più leggibile
 */
export function formatTransactionDescription(description?: string): string {
  if (!description) return 'Descrizione non disponibile';
  
  // Rimuovi codici tecnici comuni
  let cleaned = description
    .replace(/^(SEPA|SWIFT|IBAN|BIC)[\s\-:]+/i, '')
    .replace(/\b(TRN|REF|CRO|TUO|ABI|CAB)\s*:\s*\w+/gi, '')
    .replace(/\b\d{10,}\b/g, '') // Rimuovi numeri lunghi (identificativi)
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalizza la prima lettera
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  
  return cleaned || 'Transazione bancaria';
}

/**
 * Formatta il nome di un file caricato
 */
export function formatFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
  
  return `${truncatedName}...${extension ? '.' + extension : ''}`;
}

/**
 * Formatta lo score di un'anagrafica
 */
export function formatAnagraphicsScore(score: number): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  stars: number;
} {
  const stars = Math.round(score / 20); // Converte 0-100 in 0-5 stelle
  
  if (score >= 80) {
    return {
      label: 'Eccellente',
      variant: 'success',
      color: 'text-green-600 dark:text-green-400',
      stars
    };
  } else if (score >= 60) {
    return {
      label: 'Buono',
      variant: 'success',
      color: 'text-blue-600 dark:text-blue-400',
      stars
    };
  } else if (score >= 40) {
    return {
      label: 'Medio',
      variant: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      stars
    };
  } else if (score >= 20) {
    return {
      label: 'Basso',
      variant: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
      stars
    };
  } else {
    return {
      label: 'Molto Basso',
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      stars
    };
  }
}

/**
 * Formatta un trend (crescita/decrescita)
 */
export function formatTrend(
  current: number,
  previous: number,
  formatValue: (val: number) => string = (val) => val.toString()
): {
  value: string;
  change: string;
  changePercentage: string;
  isPositive: boolean;
  isNegative: boolean;
  variant: 'success' | 'destructive' | 'default';
} {
  const change = current - previous;
  const changePercentage = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  return {
    value: formatValue(current),
    change: isPositive ? `+${formatValue(Math.abs(change))}` : formatValue(change),
    changePercentage: `${isPositive ? '+' : ''}${changePercentage.toFixed(1)}%`,
    isPositive,
    isNegative,
    variant: isPositive ? 'success' : isNegative ? 'destructive' : 'default'
  };
}
