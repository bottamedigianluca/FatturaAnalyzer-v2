import { format, formatDistanceToNow, formatRelative, differenceInDays, parseISO } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { 
  PAYMENT_STATUSES, 
  RECONCILIATION_STATUSES, 
  INVOICE_TYPES, 
  ANAGRAPHICS_TYPES,
  AI_CONFIDENCE_LEVELS,
  CURRENCIES,
  LOCALES,
  DATE_FORMATS,
  CHART_COLORS
} from './constants';
import type { 
  PaymentStatus, 
  ReconciliationStatus, 
  InvoiceType, 
  AnagraphicsType 
} from '../types';

// ===== LOCALE & INTERNATIONALIZATION =====
const localeMap = {
  'it-IT': it,
  'en-US': enUS,
  'de-DE': de,
  'fr-FR': fr,
};
const pivaFormatted = maskValue(piva);
    const cfFormatted = maskValue(cf);
    
    if (validate) {
      if (!validatePIVA(piva)) {
        warnings.push('P.IVA non valida');
        isValid = false;
      }
      if (!validateCF(cf)) {
        warnings.push('Codice Fiscale non valido');
        isValid = false;
      }
    }
    
    if (compact) {
      formatted = `${pivaFormatted} • ${cfFormatted}`;
    } else if (showLabels) {
      formatted = `P.IVA: ${pivaFormatted} • CF: ${cfFormatted}`;
    } else {
      formatted = `${pivaFormatted} / ${cfFormatted}`;
    }
  } else if (piva) {
    const pivaFormatted = maskValue(piva);
    if (validate && !validatePIVA(piva)) {
      warnings.push('P.IVA non valida');
      isValid = false;
    }
    formatted = showLabels ? `P.IVA: ${pivaFormatted}` : pivaFormatted;
  } else if (cf) {
    const cfFormatted = maskValue(cf);
    if (validate && !validateCF(cf)) {
      warnings.push('Codice Fiscale non valido');
      isValid = false;
    }
    formatted = showLabels ? `CF: ${cfFormatted}` : cfFormatted;
  } else {
    formatted = 'Codici fiscali non disponibili';
    warnings.push('Nessun codice fiscale presente');
    isValid = false;
  }
  
  return { formatted, isValid, warnings };
}

/**
 * Formatta l'importo rimanente di una fattura con analisi avanzata
 */
export function formatRemainingAmount(
  totalAmount: number,
  paidAmount: number = 0,
  options: {
    currency?: keyof typeof CURRENCIES;
    showPercentage?: boolean;
    tolerance?: number;
  } = {}
): {
  remaining: number;
  remainingFormatted: string;
  percentage: number;
  percentageFormatted: string;
  isFullyPaid: boolean;
  isOverpaid: boolean;
  isPartiallyPaid: boolean;
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  variant: 'destructive' | 'warning' | 'success' | 'default';
  description: string;
} {
  const { currency = 'EUR', showPercentage = true, tolerance = 0.01 } = options;
  
  const remaining = totalAmount - paidAmount;
  const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  const remainingFormatted = formatCurrency(Math.abs(remaining), { currency });
  const percentageFormatted = formatNumber(percentage, { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  }) + '%';
  
  const isFullyPaid = Math.abs(remaining) <= tolerance;
  const isOverpaid = remaining < -tolerance;
  const isPartiallyPaid = paidAmount > tolerance && remaining > tolerance;
  
  let status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  let variant: 'destructive' | 'warning' | 'success' | 'default';
  let description: string;
  
  if (isOverpaid) {
    status = 'overpaid';
    variant = 'default';
    description = `Pagamento in eccesso di ${remainingFormatted}`;
  } else if (isFullyPaid) {
    status = 'paid';
    variant = 'success';
    description = 'Fattura completamente pagata';
  } else if (isPartiallyPaid) {
    status = 'partial';
    variant = 'warning';
    description = `Rimanente da pagare: ${remainingFormatted}`;
  } else {
    status = 'unpaid';
    variant = 'destructive';
    description = `Totale da pagare: ${remainingFormatted}`;
  }
  
  return {
    remaining,
    remainingFormatted,
    percentage,
    percentageFormatted,
    isFullyPaid,
    isOverpaid,
    isPartiallyPaid,
    status,
    variant,
    description
  };
}

/**
 * Formatta la scadenza con calcoli avanzati e stati contestuali
 */
export function formatDueStatus(
  dueDate?: string | Date,
  referenceDate?: string | Date
): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  bgColor: string;
  icon: string;
  daysUntilDue?: number;
  category: 'overdue' | 'today' | 'soon' | 'normal' | 'future' | 'none';
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  description: string;
} {
  if (!dueDate) {
    return {
      label: 'Senza scadenza',
      variant: 'default',
      color: 'text-gray-500 dark:text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      icon: '📅',
      category: 'none',
      urgency: 'none',
      description: 'Nessuna data di scadenza impostata'
    };
  }

  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const reference = referenceDate ? 
    (typeof referenceDate === 'string' ? parseISO(referenceDate) : referenceDate) : 
    new Date();
  
  const diffDays = differenceInDays(due, reference);
  
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `Scaduta da ${overdueDays} giorni`,
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      icon: '🚨',
      daysUntilDue: diffDays,
      category: 'overdue',
      urgency: overdueDays > 30 ? 'critical' : 'high',
      description: `Pagamento in ritardo di ${overdueDays} giorni`
    };
  } else if (diffDays === 0) {
    return {
      label: 'Scade oggi',
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      icon: '⏰',
      daysUntilDue: diffDays,
      category: 'today',
      urgency: 'critical',
      description: 'Scadenza odierna - azione immediata richiesta'
    };
  } else if (diffDays <= 3) {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'destructive',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      icon: '⚠️',
      daysUntilDue: diffDays,
      category: 'soon',
      urgency: 'high',
      description: 'Scadenza imminente - priorità alta'
    };
  } else if (diffDays <= 7) {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      icon: '📋',
      daysUntilDue: diffDays,
      category: 'soon',
      urgency: 'medium',
      description: 'Scadenza settimanale - monitorare'
    };
  } else if (diffDays <= 30) {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'default',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      icon: '📊',
      daysUntilDue: diffDays,
      category: 'normal',
      urgency: 'low',
      description: 'Scadenza entro il mese corrente'
    };
  } else {
    return {
      label: `Scade tra ${diffDays} giorni`,
      variant: 'success',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '✅',
      daysUntilDue: diffDays,
      category: 'future',
      urgency: 'none',
      description: 'Scadenza futura - nessuna azione richiesta'
    };
  }
}

// ===== TRANSACTION & DESCRIPTION FORMATTING V4.0 =====

/**
 * Formatta una descrizione di transazione con AI enhancement
 */
export function formatTransactionDescription(
  description?: string,
  options: {
    maxLength?: number;
    cleanTechnicalCodes?: boolean;
    enhanceReadability?: boolean;
    detectPatterns?: boolean;
  } = {}
): {
  cleaned: string;
  original: string;
  confidence: number;
  detectedType?: string;
  suggestedCategory?: string;
  technicalCodes: string[];
} {
  const {
    maxLength = 100,
    cleanTechnicalCodes = true,
    enhanceReadability = true,
    detectPatterns = true
  } = options;

  if (!description) {
    return {
      cleaned: 'Descrizione non disponibile',
      original: '',
      confidence: 0,
      technicalCodes: []
    };
  }

  const original = description;
  const technicalCodes: string[] = [];
  let cleaned = description;
  let confidence = 0.5;
  let detectedType: string | undefined;
  let suggestedCategory: string | undefined;

  // Estrai codici tecnici
  if (cleanTechnicalCodes) {
    const technicalPatterns = [
      /\b(SEPA|SWIFT|IBAN|BIC|ABI|CAB|CRO|TRN|REF|TUO)[\s\-:]+(\w+)/gi,
      /\b\d{10,}/g, // Numeri lunghi (ID transazioni)
      /\b[A-Z]{4}\d{6,}/g, // Codici alfanumerici
    ];

    technicalPatterns.forEach(pattern => {
      const matches = cleaned.match(pattern);
      if (matches) {
        technicalCodes.push(...matches);
        cleaned = cleaned.replace(pattern, '').trim();
      }
    });
  }

  // Pattern recognition per tipo transazione
  if (detectPatterns) {
    const patterns = {
      'Bonifico': /bonif|transfer|wire/i,
      'Addebito Diretto': /sdd|addebito|direct debit/i,
      'Carta': /card|carta|pos/i,
      'Commissioni': /commission|fee|spese/i,
      'Interessi': /interest|interess/i,
      'Stipendio': /stipend|salary|wage/i,
      'Affitto': /affitto|rent/i,
      'Utilities': /electric|gas|water|telefon/i,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        detectedType = type;
        confidence = 0.8;
        break;
      }
    }
  }

  // Enhance readability
  if (enhanceReadability) {
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Normalizza spazi
      .replace(/[\/\-]{2,}/g, ' - ') // Normalizza separatori
      .trim();

    // Capitalizza prima lettera
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
  }

  // Truncate se necessario
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength - 3) + '...';
  }

  // Fallback se troppo pulito
  if (cleaned.length < 3) {
    cleaned = detectedType || 'Transazione bancaria';
  }

  return {
    cleaned,
    original,
    confidence,
    detectedType,
    suggestedCategory,
    technicalCodes
  };
}

// ===== FILE & SYSTEM FORMATTING V4.0 =====

/**
 * Formatta un nome file con informazioni aggiuntive
 */
export function formatFileName(
  fileName: string,
  options: {
    maxLength?: number;
    showExtension?: boolean;
    showSize?: boolean;
    size?: number;
    showIcon?: boolean;
  } = {}
): {
  displayName: string;
  extension: string;
  icon: string;
  sizeFormatted?: string;
  category: string;
} {
  const {
    maxLength = 30,
    showExtension = true,
    showSize = false,
    size,
    showIcon = true
  } = options;

  if (!fileName) {
    return {
      displayName: 'File senza nome',
      extension: '',
      icon: '📄',
      category: 'unknown'
    };
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.')) || fileName;
  
  // Determina categoria e icona
  const getFileInfo = (ext: string) => {
    const categories = {
      document: { icon: '📄', exts: ['pdf', 'doc', 'docx', 'txt'] },
      spreadsheet: { icon: '📊', exts: ['xls', 'xlsx', 'csv'] },
      xml: { icon: '🗂️', exts: ['xml', 'p7m'] },
      image: { icon: '🖼️', exts: ['jpg', 'jpeg', 'png', 'gif', 'svg'] },
      archive: { icon: '📦', exts: ['zip', 'rar', '7z'] },
      code: { icon: '💻', exts: ['js', 'ts', 'html', 'css', 'json'] },
    };

    for (const [category, info] of Object.entries(categories)) {
      if (info.exts.includes(ext)) {
        return { category, icon: info.icon };
      }
    }
    return { category: 'unknown', icon: '📄' };
  };

  const { category, icon } = getFileInfo(extension);

  // Truncate nome se necessario
  let displayName = nameWithoutExt;
  if (displayName.length > maxLength - (showExtension ? extension.length + 1 : 0)) {
    const truncateLength = maxLength - (showExtension ? extension.length + 4 : 3);
    displayName = displayName.slice(0, truncateLength) + '...';
  }

  if (showExtension && extension) {
    displayName += '.' + extension;
  }

  // Formatta dimensione file
  let sizeFormatted: string | undefined;
  if (showSize && size !== undefined) {
    sizeFormatted = formatFileSize(size);
  }

  return {
    displayName,
    extension,
    icon: showIcon ? icon : '',
    sizeFormatted,
    category
  };
}

/**
 * Formatta la dimensione di un file
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ===== ANALYTICS & TREND FORMATTING V4.0 =====

/**
 * Formatta un trend con analisi avanzata e previsioni
 */
export function formatTrend(
  current: number,
  previous: number,
  options: {
    formatValue?: (val: number) => string;
    timeframe?: string;
    showForecast?: boolean;
    forecastValue?: number;
    type?: 'revenue' | 'count' | 'percentage' | 'generic';
  } = {}
): {
  current: string;
  previous: string;
  change: string;
  changePercentage: string;
  isPositive: boolean;
  isNegative: boolean;
  isStable: boolean;
  variant: 'success' | 'destructive' | 'default';
  icon: string;
  description: string;
  forecast?: string;
  momentum: 'accelerating' | 'decelerating' | 'stable';
} {
  const {
    formatValue = (val) => formatNumber(val),
    timeframe = 'periodo precedente',
    showForecast = false,
    forecastValue,
    type = 'generic'
  } = options;

  const change = current - previous;
  const changePercentage = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
  const isPositive = change > 0.01; // Tolleranza per errori di arrotondamento
  const isNegative = change < -0.01;
  const isStable = !isPositive && !isNegative;

  // Determina se il trend sta accelerando o decelerando
  let momentum: 'accelerating' | 'decelerating' | 'stable' = 'stable';
  if (showForecast && forecastValue !== undefined) {
    const forecastChange = forecastValue - current;
    const currentTrendDirection = isPositive ? 1 : isNegative ? -1 : 0;
    const forecastTrendDirection = forecastChange > 0 ? 1 : forecastChange < 0 ? -1 : 0;
    
    if (Math.abs(forecastChange) > Math.abs(change)) {
      momentum = 'accelerating';
    } else if (Math.abs(forecastChange) < Math.abs(change)) {
      momentum = 'decelerating';
    }
  }

  // Icone specifiche per tipo
  const getIcon = () => {
    if (isStable) return '➡️';
    
    const iconMap = {
      revenue: isPositive ? '💰' : '📉',
      count: isPositive ? '📈' : '📊',
      percentage: isPositive ? '⬆️' : '⬇️',
      generic: isPositive ? '↗️' : '↘️'
    };
    
    return iconMap[type] || (isPositive ? '↗️' : '↘️');
  };

  // Descrizione dettagliata
  const getDescription = () => {
    const direction = isPositive ? 'aumento' : isNegative ? 'diminuzione' : 'stabilità';
    const magnitude = Math.abs(changePercentage);
    
    let intensity = '';
    if (magnitude > 50) intensity = 'significativo ';
    else if (magnitude > 20) intensity = 'considerevole ';
    else if (magnitude > 5) intensity = 'moderato ';
    else if (magnitude > 1) intensity = 'lieve ';
    
    return `${intensity}${direction} rispetto al ${timeframe}`;
  };

  const result = {
    current: formatValue(current),
    previous: formatValue(previous),
    change: isPositive ? `+${formatValue(Math.abs(change))}` : formatValue(change),
    changePercentage: `${isPositive ? '+' : ''}${changePercentage.toFixed(1)}%`,
    isPositive,
    isNegative,
    isStable,
    variant: isPositive ? 'success' : isNegative ? 'destructive' : 'default' as const,
    icon: getIcon(),
    description: getDescription(),
    momentum
  };

  if (showForecast && forecastValue !== undefined) {
    result.forecast = formatValue(forecastValue);
  }

  return result;
}

/**
 * Formatta metriche di performance con soglie dinamiche
 */
export function formatPerformanceMetric(
  value: number,
  options: {
    unit?: string;
    thresholds?: { excellent: number; good: number; poor: number };
    type?: 'time' | 'percentage' | 'count' | 'size';
    showBenchmark?: boolean;
    benchmark?: number;
  } = {}
): {
  formatted: string;
  category: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  variant: 'success' | 'default' | 'warning' | 'destructive';
  color: string;
  icon: string;
  description: string;
  benchmarkComparison?: string;
} {
  const {
    unit = '',
    thresholds,
    type = 'count',
    showBenchmark = false,
    benchmark
  } = options;

  // Thresholds di default basati sul tipo
  const defaultThresholds = {
    time: { excellent: 100, good: 500, poor: 2000 }, // ms
    percentage: { excellent: 95, good: 80, poor: 60 }, // %
    count: { excellent: 1000, good: 100, poor: 10 },
    size: { excellent: 1024, good: 1024*1024, poor: 10*1024*1024 }, // bytes
  };

  const activeThresholds = thresholds || defaultThresholds[type] || defaultThresholds.count;

  // Formattazione basata sul tipo
  const formatByType = (val: number) => {
    switch (type) {
      case 'time':
        if (val < 1000) return `${val.toFixed(0)} ms`;
        return `${(val / 1000).toFixed(1)} s`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'size':
        return formatFileSize(val);
      default:
        return formatNumber(val) + (unit ? ` ${unit}` : '');
    }
  };

  const formatted = formatByType(value);

  // Determina categoria (logica invertita per tempo - valori più bassi sono migliori)
  const isInverted = type === 'time';
  let category: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  
  if (isInverted) {
    if (value <= activeThresholds.excellent) category = 'excellent';
    else if (value <= activeThresholds.good) category = 'good';
    else if (value <= activeThresholds.poor) category = 'average';
    else if (value <= activeThresholds.poor * 2) category = 'poor';
    else category = 'critical';
  } else {
    if (value >= activeThresholds.excellent) category = 'excellent';
    else if (value >= activeThresholds.good) category = 'good';
    else if (value >= activeThresholds.poor) category = 'average';
    else if (value >= activeThresholds.poor * 0.5) category = 'poor';
    else category = 'critical';
  }

  const categoryConfig = {
    excellent: { variant: 'success', color: CHART_COLORS.SUCCESS, icon: '🏆', desc: 'Eccellente' },
    good: { variant: 'success', color: CHART_COLORS.PRIMARY, icon: '✅', desc: 'Buono' },
    average: { variant: 'default', color: CHART_COLORS.WARNING, icon: '📊', desc: 'Medio' },
    poor: { variant: 'warning', color: CHART_COLORS.WARNING, icon: '⚠️', desc: 'Scarso' },
    critical: { variant: 'destructive', color: CHART_COLORS.DANGER, icon: '🚨', desc: 'Critico' }
  } as const;

  const config = categoryConfig[category];

  let benchmarkComparison: string | undefined;
  if (showBenchmark && benchmark !== undefined) {
    const diff = ((value - benchmark) / benchmark) * 100;
    const better = isInverted ? diff < 0 : diff > 0;
    benchmarkComparison = `${better ? '+' : ''}${diff.toFixed(1)}% vs benchmark`;
  }

  return {
    formatted,
    category,
    variant: config.variant,
    color: config.color,
    icon: config.icon,
    description: config.desc,
    benchmarkComparison
  };
}

// ===== SCORE & RATING FORMATTING V4.0 =====

/**
 * Formatta lo score di un'anagrafica con analisi dettagliata
 */
export function formatAnagraphicsScore(
  score: number,
  options: {
    showStars?: boolean;
    showBadge?: boolean;
    includeAdvice?: boolean;
    historicalData?: number[];
  } = {}
): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  bgColor: string;
  stars: number;
  percentage: number;
  category: string;
  advice?: string;
  trend?: 'improving' | 'declining' | 'stable';
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
} {
  const { showStars = true, showBadge = false, includeAdvice = true, historicalData } = options;
  
  const percentage = Math.min(100, Math.max(0, score));
  const stars = Math.round(percentage / 20); // Converte 0-100 in 0-5 stelle

  // Analisi trend se disponibili dati storici
  let trend: 'improving' | 'declining' | 'stable' | undefined;
  if (historicalData && historicalData.length >= 2) {
    const recent = historicalData.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
    const older = historicalData.slice(0, -3).reduce((sum, val) => sum + val, 0) / (historicalData.length - 3);
    const change = recent - older;
    
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'declining';
    else trend = 'stable';
  }

  // Classificazione dettagliata
  let category: string;
  let variant: 'default' | 'success' | 'warning' | 'destructive';
  let color: string;
  let bgColor: string;
  let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  let advice: string | undefined;

  if (percentage >= 90) {
    category = 'Eccellente';
    variant = 'success';
    color = 'text-green-700 dark:text-green-300';
    bgColor = 'bg-green-100 dark:bg-green-900';
    riskLevel = 'very_low';
    advice = includeAdvice ? 'Cliente affidabile, priorità per offerte premium' : undefined;
  } else if (percentage >= 80) {
    category = 'Ottimo';
    variant = 'success';
    color = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-50 dark:bg-green-950';
    riskLevel = 'low';
    advice = includeAdvice ? 'Cliente affidabile, condizioni di pagamento standard' : undefined;
  } else if (percentage >= 70) {
    category = 'Buono';
    variant = 'success';
    color = 'text-blue-600 dark:text-blue-400';
    bgColor = 'bg-blue-50 dark:bg-blue-950';
    riskLevel = 'low';
    advice = includeAdvice ? 'Cliente stabile, monitorare occasionalmente' : undefined;
  } else if (percentage >= 60) {
    category = 'Discreto';
    variant = 'default';
    color = 'text-yellow-600 dark:text-yellow-400';
    bgColor = 'bg-yellow-50 dark:bg-yellow-950';
    riskLevel = 'medium';
    advice = includeAdvice ? 'Cliente nella media, monitorare pagamenti' : undefined;
  } else if (percentage >= 40) {
    category = 'Medio';
    variant = 'warning';
    color: 'text-orange-600 dark:text-orange-400';
    bgColor = 'bg-orange-50 dark:bg-orange-950';
    riskLevel = 'medium';
    advice = includeAdvice ? 'Attenzione: richiedere garanzie aggiuntive' : undefined;
  } else if (percentage >= 20) {
    category = 'Basso';
    variant = 'warning';
    color = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-50 dark:bg-red-950';
    riskLevel = 'high';
    advice = includeAdvice ? 'Rischio elevato: pagamento anticipato consigliato' : undefined;
  } else {
    category = 'Molto Basso';
    variant = 'destructive';
    color = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-900';
    riskLevel = 'very_high';
    advice = includeAdvice ? 'Rischio critico: evitare crediti, solo contanti' : undefined;
  }

  const label = showBadge ? `${category} (${percentage}/100)` : category;

  return {
    label,
    variant,
    color,
    bgColor,
    stars,
    percentage,
    category,
    advice,
    trend,
    riskLevel
  };
}

// ===== EXPORT & UTILITY FUNCTIONS V4.0 =====

/**
 * Formatta un ID o codice di sistema per display
 */
export function formatSystemId(
  id: string | number,
  options: {
    prefix?: string;
    length?: number;
    uppercase?: boolean;
  } = {}
): string {
  const { prefix = '', length = 8, uppercase = true } = options;
  
  let formatted = String(id);
  
  if (formatted.length < length) {
    formatted = formatted.padStart(length, '0');
  }
  
  if (uppercase) {
    formatted = formatted.toUpperCase();
  }
  
  return prefix ? `${prefix}${formatted}` : formatted;
}

/**
 * Formatta un indirizzo con componenti opzionali
 */
export function formatAddress(
  address: {
    street?: string;
    number?: string;
    city?: string;
    cap?: string;
    province?: string;
    country?: string;
  },
  options: {
    multiline?: boolean;
    includeCountry?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { multiline = false, includeCountry = false, compact = false } = options;
  const { street, number, city, cap, province, country } = address;
  
  const parts: string[] = [];
  
  // Indirizzo
  if (street) {
    const addressLine = number ? `${street} ${number}` : street;
    parts.push(addressLine);
  }
  
  // Città, CAP, Provincia
  if (city || cap || province) {
    const cityParts: string[] = [];
    
    if (cap) cityParts.push(cap);
    if (city) cityParts.push(city);
    if (province && !compact) cityParts.push(`(${province})`);
    
    if (cityParts.length > 0) {
      parts.push(cityParts.join(' '));
    }
  }
  
  // Paese
  if (includeCountry && country) {
    parts.push(country);
  }
  
  const separator = multiline ? '\n' : ', ';
  return parts.join(separator) || 'Indirizzo non disponibile';
}

/**
 * Formatta un numero di telefono internazionale
 */
export function formatPhoneNumber(
  phone: string,
  options: {
    international?: boolean;
    country?: string;
    format?: 'standard' | 'compact' | 'display';
  } = {}
): string {
  const { international = false, country = 'IT', format = 'display' } = options;
  
  if (!phone) return '-';
  
  // Rimuovi caratteri non numerici
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '-';
  
  // Gestione numeri italiani
  if (country === 'IT') {
    if (digits.startsWith('39')) {
      // Numero con prefisso internazionale
      const nationalNumber = digits.slice(2);
      return formatItalianNumber(nationalNumber, format, true);
    } else {
      return formatItalianNumber(digits, format, international);
    }
  }
  
  // Fallback per altri paesi
  return international ? `+${digits}` : digits;
}

function formatItalianNumber(
  digits: string,
  format: 'standard' | 'compact' | 'display',
  showPrefix: boolean
): string {
  const prefix = showPrefix ? '+39 ' : '';
  
  if (digits.length === 10) {
    switch (format) {
      case 'compact':
        return `${prefix}${digits}`;
      case 'standard':
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      case 'display':
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      default:
        return `${prefix}${digits}`;
    }
  }
  
  return `${prefix}${digits}`;
}

/**
 * Formatta una lista di elementi con separatori intelligenti
 */
export function formatList(
  items: string[],
  options: {
    maxItems?: number;
    conjunction?: 'and' | 'or';
    locale?: string;
    moreText?: string;
  } = {}
): string {
  const { maxItems = 3, conjunction = 'and', locale = 'it-IT', moreText } = options;
  
  if (!items || items.length === 0) return '-';
  
  const filteredItems = items.filter(item => item && item.trim());
  
  if (filteredItems.length === 0) return '-';
  
  if (filteredItems.length === 1) return filteredItems[0];
  
  const visibleItems = filteredItems.slice(0, maxItems);
  const hiddenCount = filteredItems.length - maxItems;
  
  let result: string;
  
  if (visibleItems.length === 2) {
    const connector = locale.startsWith('it') ? 
      (conjunction === 'and' ? ' e ' : ' o ') :
      (conjunction === 'and' ? ' and ' : ' or ');
    result = visibleItems.join(connector);
  } else {
    const lastItem = visibleItems.pop()!;
    const connector = locale.startsWith('it') ? 
      (conjunction === 'and' ? ' e ' : ' o ') :
      (conjunction === 'and' ? ' and ' : ' or ');
    result = visibleItems.join(', ') + connector + lastItem;
  }
  
  if (hiddenCount > 0) {
    const defaultMoreText = locale.startsWith('it') ? 
      `e altri ${hiddenCount}` : 
      `and ${hiddenCount} more`;
    result += `, ${moreText || defaultMoreText}`;
  }
  
  return result;
}

/**
 * Formatta un range di valori numerici
 */
export function formatRange(
  min: number,
  max: number,
  options: {
    formatValue?: (val: number) => string;
    separator?: string;
    sameValueText?: string;
    currency?: keyof typeof CURRENCIES;
  } = {}
): string {
  const { 
    formatValue = (val) => formatNumber(val),
    separator = ' - ',
    sameValueText = '',
    currency
  } = options;
  
  const formatter = currency ? 
    (val: number) => formatCurrency(val, { currency }) :
    formatValue;
  
  if (min === max) {
    return sameValueText || formatter(min);
  }
  
  return `${formatter(min)}${separator}${formatter(max)}`;
}

/**
 * Formatta tempo relativo con precisione personalizzabile
 */
export function formatRelativeTime(
  date: string | Date,
  options: {
    precision?: 'second' | 'minute' | 'hour' | 'day';
    locale?: string;
    addSuffix?: boolean;
    includeSeconds?: boolean;
  } = {}
): string {
  const { 
    precision = 'minute',
    locale = getCurrentLocale(),
    addSuffix = true,
    includeSeconds = false
  } = options;
  
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    return formatDistanceToNow(dateObj, {
      addSuffix,
      locale: getDateFnsLocale(),
      includeSeconds
    });
  } catch (error) {
    return 'Data non valida';
  }
}

/**
 * Formatta stato operazione con progress e timing
 */
export function formatOperationStatus(
  status: string,
  options: {
    progress?: number;
    startTime?: string | Date;
    estimatedCompletion?: string | Date;
    showTiming?: boolean;
  } = {}
): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  icon: string;
  progressFormatted?: string;
  timeInfo?: string;
  isComplete: boolean;
  isError: boolean;
} {
  const { progress, startTime, estimatedCompletion, showTiming = true } = options;
  
  const statusMap: Record<string, any> = {
    'pending': { label: 'In Attesa', variant: 'default', color: 'text-gray-600', icon: '⏳' },
    'running': { label: 'In Corso', variant: 'default', color: 'text-blue-600', icon: '⚡' },
    'processing': { label: 'Elaborazione', variant: 'default', color: 'text-blue-600', icon: '⚙️' },
    'completed': { label: 'Completato', variant: 'success', color: 'text-green-600', icon: '✅' },
    'success': { label: 'Successo', variant: 'success', color: 'text-green-600', icon: '🎉' },
    'failed': { label: 'Fallito', variant: 'destructive', color: 'text-red-600', icon: '❌' },
    'error': { label: 'Errore', variant: 'destructive', color: 'text-red-600', icon: '🚨' },
    'cancelled': { label: 'Annullato', variant: 'warning', color: 'text-yellow-600', icon: '🚫' },
    'timeout': { label: 'Timeout', variant: 'warning', color: 'text-orange-600', icon: '⏰' },
  };
  
  const config = statusMap[status.toLowerCase()] || statusMap['pending'];
  
  const result = {
    label: config.label,
    variant: config.variant,
    color: config.color,
    icon: config.icon,
    isComplete: ['completed', 'success'].includes(status.toLowerCase()),
    isError: ['failed', 'error', 'timeout'].includes(status.toLowerCase())
  };
  
  // Formatta progress se disponibile
  if (progress !== undefined) {
    result.progressFormatted = `${Math.round(progress)}%`;
  }
  
  // Informazioni temporali
  if (showTiming && startTime) {
    const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
    const elapsed = formatDistanceToNow(start);
    
    if (estimatedCompletion && !result.isComplete && !result.isError) {
      const eta = typeof estimatedCompletion === 'string' ? parseISO(estimatedCompletion) : estimatedCompletion;
      const remaining = formatDistanceToNow(eta, { addSuffix: true });
      result.timeInfo = `Avviato ${elapsed} fa, completo ${remaining}`;
    } else {
      result.timeInfo = `Avviato ${elapsed} fa`;
    }
  }
  
  return result;
}

// ===== DEFAULT EXPORT V4.0 =====
export default {
  // Currency & Numbers
  formatCurrency,
  formatNumber,
  formatPercentageWithColor,
  
  // Dates & Time
  formatDate,
  formatDateRange,
  formatRelativeTime,
  
  // Business Status
  formatPaymentStatus,
  formatReconciliationStatus,
  formatInvoiceType,
  formatAnagraphicsType,
  
  // AI & Confidence
  formatAIConfidence,
  formatAIScore,
  
  // Documents & Business
  formatDocumentNumber,
  formatTaxCode,
  formatRemainingAmount,
  formatDueStatus,
  
  // Transactions
  formatTransactionDescription,
  
  // Files & System
  formatFileName,
  formatFileSize,
  
  // Analytics & Trends
  formatTrend,
  formatPerformanceMetric,
  
  // Scores & Ratings
  formatAnagraphicsScore,
  
  // Utilities
  formatSystemId,
  formatAddress,
  formatPhoneNumber,
  formatList,
  formatRange,
  formatOperationStatus,
};
        // Fallback per browser non supportati
    const sign = signed && amount > 0 ? '+' : '';
    const symbol = showSymbol ? currencyInfo.symbol : '';
    const code = showCode && !showSymbol ? ` ${currency}` : '';
    
    if (currencyInfo.position === 'before') {
      return `${sign}${symbol}${amount.toFixed(minimumFractionDigits)}${code}`;
    } else {
      return `${sign}${amount.toFixed(minimumFractionDigits)}${symbol}${code}`;
    }
  }
}

/**
 * Formatta un numero con separatori delle migliaia
 */
export function formatNumber(
  value: number,
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
    percentage?: boolean;
  } = {}
): string {
  const {
    locale = getCurrentLocale(),
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
    percentage = false,
  } = options;

  if (isNaN(value) || value === null || value === undefined) {
    return '-';
  }

  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits,
    maximumFractionDigits,
  };

  if (compact) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  if (percentage) {
    formatOptions.style = 'percent';
    value = value / 100; // Intl.NumberFormat expects decimal for percentage
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  } catch (error) {
    return percentage ? `${value.toFixed(2)}%` : value.toFixed(maximumFractionDigits);
  }
}

/**
 * Formatta una percentuale con colore basato sul valore
 */
export function formatPercentageWithColor(
  value: number,
  options: {
    showSign?: boolean;
    precision?: number;
    thresholds?: { positive: number; negative: number };
  } = {}
): {
  formatted: string;
  color: string;
  variant: 'success' | 'destructive' | 'default';
} {
  const {
    showSign = true,
    precision = 1,
    thresholds = { positive: 0, negative: 0 }
  } = options;

  const formatted = formatNumber(value, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    percentage: true,
  });

  const sign = showSign && value > 0 ? '+' : '';
  const displayValue = `${sign}${formatted}`;

  let color: string;
  let variant: 'success' | 'destructive' | 'default';

  if (value > thresholds.positive) {
    color = CHART_COLORS.SUCCESS;
    variant = 'success';
  } else if (value < thresholds.negative) {
    color = CHART_COLORS.DANGER;
    variant = 'destructive';
  } else {
    color = CHART_COLORS.SECONDARY;
    variant = 'default';
  }

  return { formatted: displayValue, color, variant };
}

// ===== DATE & TIME FORMATTING V4.0 =====

/**
 * Formatta una data con opzioni avanzate e localizzazione
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    format?: keyof typeof DATE_FORMATS | string;
    locale?: string;
    relative?: boolean;
    includeTime?: boolean;
    short?: boolean;
  } = {}
): string {
  if (!date) return '-';

  const {
    format: formatType = 'DISPLAY',
    locale = getCurrentLocale(),
    relative = false,
    includeTime = false,
    short = false,
  } = options;

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Data non valida';
    }

    if (relative) {
      return formatDistanceToNow(dateObj, {
        addSuffix: true,
        locale: getDateFnsLocale(),
      });
    }

    let formatString: string;
    
    if (DATE_FORMATS[formatType as keyof typeof DATE_FORMATS]) {
      formatString = DATE_FORMATS[formatType as keyof typeof DATE_FORMATS];
    } else {
      formatString = formatType;
    }

    if (includeTime && !formatString.includes('HH')) {
      formatString += ' HH:mm';
    }

    if (short) {
      formatString = formatString.replace('yyyy', 'yy').replace('MMMM', 'MMM');
    }

    return format(dateObj, formatString, {
      locale: getDateFnsLocale(),
    });
  } catch (error) {
    return 'Errore formato data';
  }
}

/**
 * Formatta un range di date
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date,
  options: {
    format?: string;
    separator?: string;
    sameYear?: boolean;
  } = {}
): string {
  const {
    format: formatType = DATE_FORMATS.DISPLAY,
    separator = ' - ',
    sameYear = true,
  } = options;

  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (sameYear && start.getFullYear() === end.getFullYear()) {
      const startFormatted = format(start, 'dd/MM', { locale: getDateFnsLocale() });
      const endFormatted = format(end, formatType, { locale: getDateFnsLocale() });
      return `${startFormatted}${separator}${endFormatted}`;
    }

    const startFormatted = format(start, formatType, { locale: getDateFnsLocale() });
    const endFormatted = format(end, formatType, { locale: getDateFnsLocale() });
    
    return `${startFormatted}${separator}${endFormatted}`;
  } catch (error) {
    return 'Range date non valido';
  }
}

// ===== BUSINESS STATUS FORMATTING V4.0 =====

/**
 * Formatta lo stato di pagamento con colori e icone V4.0
 */
export function formatPaymentStatus(status: PaymentStatus): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
  bgColor: string;
  icon: string;
  description: string;
} {
  const statusMap: Record<PaymentStatus, any> = {
    'Aperta': { 
      label: 'Aperta', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      icon: '📄',
      description: 'Fattura emessa, in attesa di pagamento'
    },
    'Scaduta': { 
      label: 'Scaduta', 
      variant: 'destructive', 
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      icon: '⚠️',
      description: 'Fattura scaduta, pagamento in ritardo'
    },
    'Pagata Parz.': { 
      label: 'Pagata Parzialmente', 
      variant: 'warning', 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      icon: '💰',
      description: 'Pagamento parziale ricevuto'
    },
    'Pagata Tot.': { 
      label: 'Pagata Totalmente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '✅',
      description: 'Fattura completamente pagata'
    },
    'Insoluta': { 
      label: 'Insoluta', 
      variant: 'destructive', 
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900',
      icon: '❌',
      description: 'Pagamento non ricevuto dopo solleciti'
    },
    'Riconciliata': { 
      label: 'Riconciliata', 
      variant: 'success', 
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900',
      icon: '🔗',
      description: 'Fattura riconciliata con movimenti bancari'
    },
    'In Contestazione': {
      label: 'In Contestazione',
      variant: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      icon: '⚖️',
      description: 'Fattura contestata dal cliente'
    },
    'Rateizzata': {
      label: 'Rateizzata',
      variant: 'default',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      icon: '📅',
      description: 'Pagamento rateizzato concordato'
    },
    'Stornata': {
      label: 'Stornata',
      variant: 'secondary',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      icon: '↩️',
      description: 'Fattura stornata o annullata'
    }
  };

  return statusMap[status] || { 
    label: status, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    icon: '❓',
    description: 'Stato sconosciuto'
  };
}

/**
 * Formatta lo stato di riconciliazione V4.0 con AI insights
 */
export function formatReconciliationStatus(status: ReconciliationStatus): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  aiEnhanced?: boolean;
} {
  const statusMap: Record<ReconciliationStatus, any> = {
    'Da Riconciliare': { 
      label: 'Da Riconciliare', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      icon: '🔍',
      description: 'In attesa di riconciliazione'
    },
    'Riconciliato Parz.': { 
      label: 'Riconciliato Parzialmente', 
      variant: 'warning', 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      icon: '⚡',
      description: 'Riconciliazione parziale completata'
    },
    'Riconciliato Tot.': { 
      label: 'Riconciliato Totalmente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '✅',
      description: 'Riconciliazione completa'
    },
    'Riconciliato Eccesso': { 
      label: 'Riconciliato in Eccesso', 
      variant: 'warning', 
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      icon: '💸',
      description: 'Pagamento superiore all\'importo fatturato'
    },
    'Ignorato': { 
      label: 'Ignorato', 
      variant: 'default', 
      color: 'text-gray-500 dark:text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      icon: '🚫',
      description: 'Elemento escluso dalla riconciliazione'
    },
    'AI Suggerito': {
      label: 'AI Suggerito',
      variant: 'secondary',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      icon: '🤖',
      description: 'Suggerimento automatico dell\'AI',
      aiEnhanced: true
    },
    'Auto Riconciliato': {
      label: 'Auto Riconciliato',
      variant: 'success',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      icon: '⚡',
      description: 'Riconciliato automaticamente con alta confidenza',
      aiEnhanced: true
    },
    'In Revisione': {
      label: 'In Revisione',
      variant: 'warning',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      icon: '👁️',
      description: 'In attesa di revisione manuale'
    }
  };

  return statusMap[status] || { 
    label: status, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    icon: '❓',
    description: 'Stato sconosciuto'
  };
}

/**
 * Formatta il tipo di fattura V4.0
 */
export function formatInvoiceType(type: InvoiceType): {
  label: string;
  shortLabel: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
  bgColor: string;
  icon: string;
  description: string;
} {
  const typeMap: Record<InvoiceType, any> = {
    'Attiva': { 
      label: 'Fattura Attiva (Emessa)', 
      shortLabel: 'Attiva',
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '📤',
      description: 'Fattura emessa verso clienti'
    },
    'Passiva': { 
      label: 'Fattura Passiva (Ricevuta)', 
      shortLabel: 'Passiva',
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      icon: '📥',
      description: 'Fattura ricevuta da fornitori'
    },
    'Nota Credito Attiva': {
      label: 'Nota di Credito Attiva',
      shortLabel: 'NC Attiva',
      variant: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      icon: '📝',
      description: 'Nota di credito emessa'
    },
    'Nota Credito Passiva': {
      label: 'Nota di Credito Passiva',
      shortLabel: 'NC Passiva',
      variant: 'default',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      icon: '📋',
      description: 'Nota di credito ricevuta'
    },
    'Autofattura': {
      label: 'Autofattura',
      shortLabel: 'Auto',
      variant: 'secondary',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950',
      icon: '🔄',
      description: 'Autofatturazione per regime fiscale'
    },
    'Reverse Charge': {
      label: 'Reverse Charge',
      shortLabel: 'RC',
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      icon: '🔀',
      description: 'Fattura con inversione contabile'
    }
  };

  return typeMap[type] || { 
    label: type, 
    shortLabel: type,
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    icon: '❓',
    description: 'Tipo sconosciuto'
  };
}

/**
 * Formatta il tipo di anagrafica V4.0
 */
export function formatAnagraphicsType(type: AnagraphicsType): {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  color: string;
  bgColor: string;
  icon: string;
  description: string;
} {
  const typeMap: Record<AnagraphicsType, any> = {
    'Cliente': { 
      label: 'Cliente', 
      variant: 'success', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '👤',
      description: 'Soggetto che acquista beni/servizi'
    },
    'Fornitore': { 
      label: 'Fornitore', 
      variant: 'secondary', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      icon: '🏢',
      description: 'Soggetto che fornisce beni/servizi'
    },
    'Cliente/Fornitore': {
      label: 'Cliente/Fornitore',
      variant: 'warning',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      icon: '🔄',
      description: 'Soggetto con relazione commerciale bidirezionale'
    },
    'Professionista': {
      label: 'Professionista',
      variant: 'default',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      icon: '👨‍💼',
      description: 'Libero professionista o consulente'
    },
    'Ente Pubblico': {
      label: 'Ente Pubblico',
      variant: 'secondary',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      icon: '🏛️',
      description: 'Pubblica amministrazione o ente statale'
    },
    'Banca': {
      label: 'Banca',
      variant: 'default',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      icon: '🏦',
      description: 'Istituto bancario o finanziario'
    }
  };

  return typeMap[type] || { 
    label: type, 
    variant: 'default', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    icon: '❓',
    description: 'Tipo sconosciuto'
  };
}

// ===== AI & CONFIDENCE FORMATTING V4.0 =====

/**
 * Formatta il livello di confidenza AI con dettagli avanzati
 */
export function formatAIConfidence(confidence: number): {
  label: string;
  percentage: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  color: string;
  bgColor: string;
  icon: string;
  stars: number;
  description: string;
  recommendation: string;
} {
  const percentage = `${Math.round(confidence * 100)}%`;
  
  if (confidence >= AI_CONFIDENCE_LEVELS.VERY_HIGH.min) {
    return {
      label: AI_CONFIDENCE_LEVELS.VERY_HIGH.label,
      percentage,
      variant: 'success',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900',
      icon: '🎯',
      stars: 5,
      description: 'Confidenza estremamente elevata',
      recommendation: 'Sicuro per automazione'
    };
  } else if (confidence >= AI_CONFIDENCE_LEVELS.HIGH.min) {
    return {
      label: AI_CONFIDENCE_LEVELS.HIGH.label,
      percentage,
      variant: 'success',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      icon: '✅',
      stars: 4,
      description: 'Confidenza elevata',
      recommendation: 'Adatto per automazione con supervisione'
    };
  } else if (confidence >= AI_CONFIDENCE_LEVELS.MEDIUM.min) {
    return {
      label: AI_CONFIDENCE_LEVELS.MEDIUM.label,
      percentage,
      variant: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      icon: '⚡',
      stars: 3,
      description: 'Confidenza media',
      recommendation: 'Richiede revisione manuale'
    };
  } else if (confidence >= AI_CONFIDENCE_LEVELS.LOW.min) {
    return {
      label: AI_CONFIDENCE_LEVELS.LOW.label,
      percentage,
      variant: 'warning',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      icon: '⚠️',
      stars: 2,
      description: 'Confidenza bassa',
      recommendation: 'Verifica manuale necessaria'
    };
  } else {
    return {
      label: AI_CONFIDENCE_LEVELS.VERY_LOW.label,
      percentage,
      variant: 'destructive',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      icon: '❌',
      stars: 1,
      description: 'Confidenza molto bassa',
      recommendation: 'Sconsigliato l\'uso automatico'
    };
  }
}

/**
 * Formatta un punteggio AI generico con scale personalizzabili
 */
export function formatAIScore(
  score: number,
  options: {
    scale?: [number, number];
    type?: 'reliability' | 'accuracy' | 'quality' | 'risk';
    showBadge?: boolean;
  } = {}
): {
  formatted: string;
  normalized: number;
  category: string;
  color: string;
  variant: 'success' | 'warning' | 'destructive' | 'default';
  icon: string;
} {
  const { scale = [0, 100], type = 'quality', showBadge = false } = options;
  const [min, max] = scale;
  const normalized = ((score - min) / (max - min)) * 100;
  
  const typeConfig = {
    reliability: { unit: '%', icon: '🛡️', label: 'Affidabilità' },
    accuracy: { unit: '%', icon: '🎯', label: 'Accuratezza' },
    quality: { unit: '/100', icon: '⭐', label: 'Qualità' },
    risk: { unit: '%', icon: '⚠️', label: 'Rischio', invert: true }
  };
  
  const config = typeConfig[type];
  const displayScore = type === 'risk' ? 100 - normalized : normalized;
  const formatted = showBadge 
    ? `${config.label}: ${Math.round(displayScore)}${config.unit}`
    : `${Math.round(displayScore)}${config.unit}`;
  
  let category: string;
  let color: string;
  let variant: 'success' | 'warning' | 'destructive' | 'default';
  
  if (displayScore >= 80) {
    category = type === 'risk' ? 'Basso' : 'Eccellente';
    color = CHART_COLORS.SUCCESS;
    variant = 'success';
  } else if (displayScore >= 60) {
    category = type === 'risk' ? 'Moderato' : 'Buono';
    color = CHART_COLORS.PRIMARY;
    variant = 'default';
  } else if (displayScore >= 40) {
    category = type === 'risk' ? 'Medio' : 'Medio';
    color = CHART_COLORS.WARNING;
    variant = 'warning';
  } else {
    category = type === 'risk' ? 'Alto' : 'Basso';
    color = CHART_COLORS.DANGER;
    variant = 'destructive';
  }
  
  return {
    formatted,
    normalized: displayScore,
    category,
    color,
    variant,
    icon: config.icon
  };
}

// ===== DOCUMENT & BUSINESS FORMATTING V4.0 =====

/**
 * Formatta un numero di documento con prefissi intelligenti
 */
export function formatDocumentNumber(
  docType: string | undefined,
  docNumber: string,
  options: {
    year?: number;
    series?: string;
    showType?: boolean;
    compact?: boolean;
  } = {}
): string {
  if (!docNumber) return '-';
  
  const { year, series, showType = true, compact = false } = options;
  const type = docType?.toLowerCase() || '';
  
  let prefix = '';
  let suffix = '';
  
  if (showType) {
    if (type.includes('fattura') && type.includes('attiva')) {
      prefix = compact ? 'FA' : 'Fatt.';
    } else if (type.includes('fattura') && type.includes('passiva')) {
      prefix = compact ? 'FP' : 'Fatt.P';
    } else if (type.includes('nota') && type.includes('credito')) {
      prefix = compact ? 'NC' : 'N.Cred.';
    } else if (type.includes('ricevuta')) {
      prefix = compact ? 'Ric' : 'Ricevuta';
    } else if (type.includes('autofattura')) {
      prefix = compact ? 'AF' : 'Auto';
    } else if (type.includes('reverse')) {
      prefix = compact ? 'RC' : 'R.Charge';
    } else if (showType) {
      prefix = compact ? 'DOC' : 'Doc.';
    }
  }
  
  if (series) {
    suffix += `/${series}`;
  }
  
  if (year && !compact) {
    suffix += `/${year}`;
  }
  
  return `${prefix ? prefix + ' ' : ''}${docNumber}${suffix}`;
}

/**
 * Formatta codici fiscali con mascheratura e validazione visiva
 */
export function formatTaxCode(
  piva?: string,
  cf?: string,
  options: {
    mask?: boolean;
    validate?: boolean;
    compact?: boolean;
    showLabels?: boolean;
  } = {}
): {
  formatted: string;
  isValid: boolean;
  warnings: string[];
} {
  const { mask = false, validate = true, compact = false, showLabels = true } = options;
  const warnings: string[] = [];
  let isValid = true;
  
  const maskValue = (value: string, visibleChars = 4) => {
    if (!mask || value.length <= visibleChars) return value;
    const visible = value.slice(-visibleChars);
    const masked = '*'.repeat(value.length - visibleChars);
    return masked + visible;
  };
  
  const validatePIVA = (piva: string) => {
    return /^[0-9]{11}$/.test(piva);
  };
  
  const validateCF = (cf: string) => {
    return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf);
  };
  
  let formatted = '';
  
  if (piva && cf) {
    const pivaFormatted = maskValue(piva);
    const cfFormatted = maskValue(cf);
    
    /**
 * Business-specific Formatting Utilities V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Formattatori aggiornati per supportare:
 * - AI confidence levels e smart insights
 * - Nuovi stati business V4.0
 * - Analytics avanzate e metriche real-time
 * - Enhanced reconciliation features
 * - Formattazione internazionale migliorata
 */

import { format, formatDistanceToNow, formatRelative, differenceInDays, parseISO } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { 
  PAYMENT_STATUSES, 
  RECONCILIATION_STATUSES, 
  INVOICE_TYPES, 
  ANAGRAPHICS_TYPES,
  AI_CONFIDENCE_LEVELS,
  CURRENCIES,
  LOCALES,
  DATE_FORMATS,
  CHART_COLORS
} from './constants';
import type { 
  PaymentStatus, 
  ReconciliationStatus, 
  InvoiceType, 
  AnagraphicsType 
} from '@/types';

// ===== LOCALE & INTERNATIONALIZATION =====
const localeMap = {
  'it-IT': it,
  'en-US': enUS,
  'de-DE': de,
  'fr-FR': fr,
};

const getCurrentLocale = () => {
  return navigator.language as keyof typeof localeMap || 'it-IT';
};

const getDateFnsLocale = () => {
  return localeMap[getCurrentLocale()] || it;
};

// ===== CURRENCY & NUMBER FORMATTING V4.0 =====

/**
 * Formatta un importo con valuta e localizzazione avanzata
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: keyof typeof CURRENCIES;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
    signed?: boolean;
  } = {}
): string {
  const {
    currency = 'EUR',
    locale = getCurrentLocale(),
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    showCode = false,
    compact = false,
    signed = false,
  } = options;

  if (isNaN(amount) || amount === null || amount === undefined) {
    return '-';
  }

  const currencyInfo = CURRENCIES[currency];
  const formatOptions: Intl.NumberFormatOptions = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits,
  };

  if (compact) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  if (signed && amount > 0) {
    formatOptions.signDisplay = 'always';
  }

  try {
    let formatted = new Intl.NumberFormat(locale, formatOptions).format(amount);
    
    if (showCode && !showSymbol) {
      formatted += ` ${currency}`;
    }
    
    return formatted;
  } catch (error) {
    // Fallback per browser non supportati
    const sign = signed && amount > 0 ? '+' : '';
    const symbol = showSymbol ? currencyInfo.symbol : '';
