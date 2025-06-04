/**
 * Utility functions for formatting data
 * Funzioni per formattare valute, date, numeri per l'UI italiana
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';

// Currency formatting
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: string = 'EUR',
  locale: string = 'it-IT'
): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '€ 0,00';
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '€ 0,00';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    // Fallback formatting
    return `€ ${numericAmount.toFixed(2).replace('.', ',')}`;
  }
};

// Compact currency formatting for large numbers
export const formatCurrencyCompact = (
  amount: number | string | null | undefined,
  currency: string = 'EUR',
  locale: string = 'it-IT'
): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '€ 0';
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '€ 0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(numericAmount);
  } catch (error) {
    // Manual compact formatting
    const abs = Math.abs(numericAmount);
    if (abs >= 1000000) {
      return `€ ${(numericAmount / 1000000).toFixed(1)}M`;
    } else if (abs >= 1000) {
      return `€ ${(numericAmount / 1000).toFixed(1)}K`;
    } else {
      return `€ ${numericAmount.toFixed(0)}`;
    }
  }
};

// Number formatting
export const formatNumber = (
  value: number | string | null | undefined,
  locale: string = 'it-IT',
  options: Intl.NumberFormatOptions = {}
): string => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(numericValue);
  } catch (error) {
    return numericValue.toString();
  }
};

// Percentage formatting
export const formatPercentage = (
  value: number | string | null | undefined,
  locale: string = 'it-IT',
  decimals: number = 1
): string => {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0%';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue / 100);
  } catch (error) {
    return `${numericValue.toFixed(decimals)}%`;
  }
};

// Date formatting
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string => {
  if (!date) {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return '-';
    }

    return format(dateObj, formatStr, { locale: it });
  } catch (error) {
    return '-';
  }
};

// DateTime formatting
export const formatDateTime = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string => {
  return formatDate(date, formatStr);
};

// Relative time formatting
export const formatRelativeTime = (
  date: string | Date | null | undefined
): string => {
  if (!date) {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return '-';
    }

    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: it 
    });
  } catch (error) {
    return '-';
  }
};

// Due date formatting with status
export const formatDueDate = (
  dueDate: string | Date | null | undefined,
  isPaid: boolean = false
): { text: string; variant: 'default' | 'warning' | 'destructive' | 'success' } => {
  if (!dueDate) {
    return { text: 'Senza scadenza', variant: 'default' };
  }

  if (isPaid) {
    return { text: 'Pagata', variant: 'success' };
  }

  try {
    const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    
    if (!isValid(dateObj)) {
      return { text: 'Data non valida', variant: 'default' };
    }

    const now = new Date();
    const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: `Scaduta ${Math.abs(diffDays)} giorni fa`, 
        variant: 'destructive' 
      };
    } else if (diffDays === 0) {
      return { text: 'Scade oggi', variant: 'warning' };
    } else if (diffDays <= 7) {
      return { 
        text: `Scade tra ${diffDays} giorni`, 
        variant: 'warning' 
      };
    } else {
      return { 
        text: `Scade il ${formatDate(dateObj)}`, 
        variant: 'default' 
      };
    }
  } catch (error) {
    return { text: 'Errore data', variant: 'default' };
  }
};

// Payment status formatting
export const formatPaymentStatus = (
  status: string | null | undefined
): { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' } => {
  switch (status) {
    case 'Pagata Tot.':
      return { label: 'Pagata', variant: 'success' };
    case 'Pagata Parz.':
      return { label: 'Parziale', variant: 'warning' };
    case 'Scaduta':
      return { label: 'Scaduta', variant: 'destructive' };
    case 'Aperta':
      return { label: 'Aperta', variant: 'default' };
    case 'Insoluta':
      return { label: 'Insoluta', variant: 'destructive' };
    case 'Riconciliata':
      return { label: 'Riconciliata', variant: 'success' };
    default:
      return { label: status || 'Sconosciuto', variant: 'secondary' };
  }
};

// Reconciliation status formatting
export const formatReconciliationStatus = (
  status: string | null | undefined
): { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' } => {
  switch (status) {
    case 'Riconciliato Tot.':
      return { label: 'Completa', variant: 'success' };
    case 'Riconciliato Parz.':
      return { label: 'Parziale', variant: 'warning' };
    case 'Da Riconciliare':
      return { label: 'Da fare', variant: 'default' };
    case 'Riconciliato Eccesso':
      return { label: 'Eccesso', variant: 'warning' };
    case 'Ignorato':
      return { label: 'Ignorato', variant: 'secondary' };
    default:
      return { label: status || 'Sconosciuto', variant: 'secondary' };
  }
};

// File size formatting
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

// Document number formatting
export const formatDocumentNumber = (
  docNumber: string | null | undefined,
  docType?: string
): string => {
  if (!docNumber) {
    return '-';
  }

  // Add document type prefix if provided
  if (docType) {
    return `${docType} ${docNumber}`;
  }

  return docNumber;
};

// VAT number formatting
export const formatVATNumber = (vat: string | null | undefined): string => {
  if (!vat) {
    return '-';
  }

  // Italian VAT format: IT + 11 digits
  if (vat.length === 11 && /^\d+$/.test(vat)) {
    return `IT${vat}`;
  }

  // Already formatted or different format
  return vat;
};

// Tax code formatting
export const formatTaxCode = (taxCode: string | null | undefined): string => {
  if (!taxCode) {
    return '-';
  }

  // Italian tax code format (16 characters)
  if (taxCode.length === 16) {
    return taxCode.toUpperCase();
  }

  return taxCode;
};

// IBAN formatting
export const formatIBAN = (iban: string | null | undefined): string => {
  if (!iban) {
    return '-';
  }

  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  
  // Add spaces every 4 characters for readability
  return cleanIBAN.replace(/(.{4})/g, '$1 ').trim();
};

// Phone number formatting
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) {
    return '-';
  }

  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Italian mobile format
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    return `+39 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  
  // Italian landline format
  if (cleanPhone.length >= 9 && cleanPhone.length <= 11) {
    return `+39 ${cleanPhone}`;
  }

  // Return as-is if doesn't match Italian formats
  return phone;
};

// Address formatting
export const formatAddress = (
  address?: string,
  city?: string,
  cap?: string,
  province?: string,
  country?: string
): string => {
  const parts = [];
  
  if (address) parts.push(address);
  
  const locationParts = [];
  if (cap) locationParts.push(cap);
  if (city) locationParts.push(city);
  if (province) locationParts.push(`(${province})`);
  
  if (locationParts.length > 0) {
    parts.push(locationParts.join(' '));
  }
  
  if (country && country !== 'IT') {
    parts.push(country);
  }
  
  return parts.join(', ') || '-';
};

// Amount difference formatting
export const formatAmountDifference = (
  amount1: number,
  amount2: number
): { text: string; variant: 'default' | 'success' | 'warning' | 'destructive' } => {
  const diff = amount1 - amount2;
  const absDiff = Math.abs(diff);
  
  if (absDiff < 0.01) {
    return { text: 'Esatto', variant: 'success' };
  } else if (diff > 0) {
    return { text: `+${formatCurrency(absDiff)}`, variant: 'warning' };
  } else {
    return { text: `-${formatCurrency(absDiff)}`, variant: 'destructive' };
  }
};

// Confidence score formatting
export const formatConfidenceScore = (
  score: number | null | undefined
): { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' } => {
  if (score === null || score === undefined) {
    return { label: 'N/A', variant: 'default' };
  }

  const percentage = score * 100;
  
  if (percentage >= 80) {
    return { label: `${percentage.toFixed(0)}% - Alta`, variant: 'success' };
  } else if (percentage >= 60) {
    return { label: `${percentage.toFixed(0)}% - Media`, variant: 'warning' };
  } else {
    return { label: `${percentage.toFixed(0)}% - Bassa`, variant: 'destructive' };
  }
};

// Chart data formatting
export const formatChartValue = (
  value: number,
  type: 'currency' | 'number' | 'percentage' = 'number'
): string => {
  switch (type) {
    case 'currency':
      return formatCurrencyCompact(value);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};

// Duration formatting (for payment terms, etc.)
export const formatDuration = (days: number | null | undefined): string => {
  if (!days || days === 0) {
    return 'Immediato';
  }

  if (days === 1) {
    return '1 giorno';
  }

  if (days < 30) {
    return `${days} giorni`;
  }

  const months = Math.round(days / 30);
  if (months === 1) {
    return '1 mese';
  }

  return `${months} mesi`;
};

// Search highlighting
export const highlightSearchTerm = (
  text: string,
  searchTerm: string
): React.ReactNode => {
  if (!searchTerm.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\// Document number formatting
export const formatDocumentNumber = (
  docNumber: string | null | undefined,
  docType?: string
): string => {
  if (!docNumber')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Truncate text with ellipsis
export const truncateText = (
  text: string | null | undefined,
  maxLength: number = 50
): string => {
  if (!text) {
    return '-';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
};

// Score formatting with color
export const formatScore = (
  score: number | null | undefined
): { text: string; variant: 'default' | 'success' | 'warning' | 'destructive' } => {
  if (score === null || score === undefined) {
    return { text: 'N/A', variant: 'default' };
  }

  const roundedScore = Math.round(score);
  
  if (roundedScore >= 80) {
    return { text: `${roundedScore}/100`, variant: 'success' };
  } else if (roundedScore >= 60) {
    return { text: `${roundedScore}/100`, variant: 'warning' };
  } else {
    return { text: `${roundedScore}/100`, variant: 'destructive' };
  }
};