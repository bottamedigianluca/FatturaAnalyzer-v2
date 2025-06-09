import { 
  REGEX_PATTERNS, 
  VALIDATION_RULES, 
  SUPPORTED_FILE_FORMATS,
  MIME_TYPES,
  SECURITY_CONFIG,
  V4_FEATURES
} from './constants';
import type { 
  PaymentStatus, 
  ReconciliationStatus, 
  InvoiceType, 
  AnagraphicsType 
} from '../types';


const cleanVAT = vat.replace(/[\s\-]/g, '').toUpperCase();
  
  if (cleanVAT.length < 4) {
    return {
      isValid: false,
      error: 'Partita IVA europea troppo corta',
      severity: 'error'
    };
  }

  const countryCode = cleanVAT.slice(0, 2);
  const vatNumber = cleanVAT.slice(2);

  // Controllo formato base
  if (!REGEX_PATTERNS.PARTITA_IVA_EU.test(cleanVAT)) {
    return {
      isValid: false,
      error: 'Formato partita IVA europea non valido',
      severity: 'error',
      suggestions: ['Il formato deve essere: 2 lettere del paese + numero IVA']
    };
  }

  // Validazione specifica per paese
  const countryValidation = validateVATByCountry(countryCode, vatNumber);
  
  return {
    ...countryValidation,
    metadata: {
      formatted: cleanVAT,
      countryCode,
      vatNumber,
      country: getCountryName(countryCode)
    }
  };
}

function validateVATByCountry(countryCode: string, vatNumber: string): ValidationResult {
  const patterns: Record<string, { pattern: RegExp; length?: number; name: string }> = {
    'IT': { pattern: /^\d{11}$/, length: 11, name: 'Italia' },
    'DE': { pattern: /^\d{9}$/, length: 9, name: 'Germania' },
    'FR': { pattern: /^[A-Z0-9]{2}\d{9}$/, name: 'Francia' },
    'ES': { pattern: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/, name: 'Spagna' },
    'NL': { pattern: /^\d{9}B\d{2}$/, name: 'Paesi Bassi' },
    'BE': { pattern: /^0\d{9}$/, length: 10, name: 'Belgio' },
    'AT': { pattern: /^U\d{8}$/, name: 'Austria' },
    'PT': { pattern: /^\d{9}$/, length: 9, name: 'Portogallo' },
    'FI': { pattern: /^\d{8}$/, length: 8, name: 'Finlandia' },
    'LU': { pattern: /^\d{8}$/, length: 8, name: 'Lussemburgo' },
  };

  const countryInfo = patterns[countryCode];
  
  if (!countryInfo) {
    return {
      isValid: false,
      error: `Paese non supportato: ${countryCode}`,
      severity: 'warning'
    };
  }

  if (!countryInfo.pattern.test(vatNumber)) {
    return {
      isValid: false,
      error: `Formato P.IVA non valido per ${countryInfo.name}`,
      severity: 'error'
    };
  }

  if (countryInfo.length && vatNumber.length !== countryInfo.length) {
    return {
      isValid: false,
      error: `Lunghezza P.IVA non corretta per ${countryInfo.name} (attesa: ${countryInfo.length})`,
      severity: 'error'
    };
  }

  return { isValid: true };
}

function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    'IT': 'Italia', 'DE': 'Germania', 'FR': 'Francia', 'ES': 'Spagna',
    'NL': 'Paesi Bassi', 'BE': 'Belgio', 'AT': 'Austria', 'PT': 'Portogallo',
    'FI': 'Finlandia', 'LU': 'Lussemburgo', 'DK': 'Danimarca', 'SE': 'Svezia',
    'IE': 'Irlanda', 'GR': 'Grecia', 'CY': 'Cipro', 'MT': 'Malta',
    'SI': 'Slovenia', 'SK': 'Slovacchia', 'CZ': 'Repubblica Ceca',
    'HU': 'Ungheria', 'PL': 'Polonia', 'LT': 'Lituania', 'LV': 'Lettonia',
    'EE': 'Estonia', 'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croazia'
  };
  
  return countries[code] || code;
}

// ===== IBAN VALIDATION V4.0 =====

/**
 * Valida un IBAN con controlli internazionali avanzati
 */
export function validateIBAN(iban: string): EnhancedValidationResult {
  if (!iban) {
    return { 
      isValid: false, 
      error: 'IBAN richiesto',
      severity: 'error'
    };
  }

  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;

  // Controllo lunghezza
  if (cleanIBAN.length < VALIDATION_RULES.IBAN_MIN_LENGTH || 
      cleanIBAN.length > VALIDATION_RULES.IBAN_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Lunghezza IBAN non valida (${VALIDATION_RULES.IBAN_MIN_LENGTH}-${VALIDATION_RULES.IBAN_MAX_LENGTH} caratteri)`,
      severity: 'error'
    };
  }

  // Controllo formato base
  if (!REGEX_PATTERNS.IBAN.test(cleanIBAN)) {
    return { 
      isValid: false, 
      error: 'Formato IBAN non valido',
      severity: 'error',
      suggestions: ['Il formato deve essere: 2 lettere paese + 2 cifre controllo + codice nazionale']
    };
  }

  // Controllo specifico per IBAN italiano
  const countryCode = cleanIBAN.slice(0, 2);
  if (countryCode === 'IT') {
    if (cleanIBAN.length !== VALIDATION_RULES.IBAN_IT_LENGTH) {
      return {
        isValid: false,
        error: `IBAN italiano deve essere di ${VALIDATION_RULES.IBAN_IT_LENGTH} caratteri`,
        severity: 'error'
      };
    }

    if (!REGEX_PATTERNS.IBAN_IT.test(cleanIBAN)) {
      return {
        isValid: false,
        error: 'Formato IBAN italiano non valido',
        severity: 'error'
      };
    }
  }

  // Algoritmo MOD-97
  const { isValid: mod97Valid, error: mod97Error } = validateIBANMod97(cleanIBAN);
  if (!mod97Valid) {
    return {
      isValid: false,
      error: mod97Error,
      severity: 'error',
      confidence: 0.1
    };
  }

  // Controlli aggiuntivi per paese
  const countryChecks = validateIBANByCountry(cleanIBAN);
  warnings.push(...countryChecks.warnings);
  suggestions.push(...countryChecks.suggestions);

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    metadata: {
      formatted: formatIBANDisplay(cleanIBAN),
      country: getCountryName(countryCode),
      bankCode: extractBankCode(cleanIBAN),
      accountNumber: extractAccountNumber(cleanIBAN)
    }
  };
}

function validateIBANMod97(iban: string): ValidationResult {
  try {
    // Sposta i primi 4 caratteri alla fine
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    
    // Converti lettere in numeri
    let numericString = '';
    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        numericString += (char.charCodeAt(0) - 55).toString();
      } else {
        numericString += char;
      }
    }

    // Calcolo modulo 97 per stringhe lunghe
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
    }

    if (remainder !== 1) {
      return { 
        isValid: false, 
        error: 'Codice di controllo IBAN non valido',
        severity: 'error'
      };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Errore nel calcolo del controllo IBAN',
      severity: 'error'
    };
  }
}

function validateIBANByCountry(iban: string): { warnings: string[]; suggestions: string[] } {
  const countryCode = iban.slice(0, 2);
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Lunghezze standard per paese
  const expectedLengths: Record<string, number> = {
    'IT': 27, 'DE': 22, 'FR': 27, 'ES': 24, 'NL': 18, 'BE': 16,
    'AT': 20, 'PT': 25, 'FI': 18, 'LU': 20, 'IE': 22, 'GR': 27
  };

  const expectedLength = expectedLengths[countryCode];
  if (expectedLength && iban.length !== expectedLength) {
    warnings.push(`Lunghezza IBAN insolita per ${getCountryName(countryCode)} (attesa: ${expectedLength})`);
  }

  return { warnings, suggestions };
}

function formatIBANDisplay(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function extractBankCode(iban: string): string {
  const countryCode = iban.slice(0, 2);
  
  // Estrazione codice banca specifica per paese
  switch (countryCode) {
    case 'IT':
      return iban.slice(5, 10); // CIN + ABI + CAB
    case 'DE':
      return iban.slice(4, 12); // BLZ
    case 'FR':
      return iban.slice(4, 9); // Bank code
    default:
      return iban.slice(4, 8); // Generico
  }
}

function extractAccountNumber(iban: string): string {
  const countryCode = iban.slice(0, 2);
  
  switch (countryCode) {
    case 'IT':
      return iban.slice(15); // Numero conto
    case 'DE':
      return iban.slice(12); // Account number
    case 'FR':
      return iban.slice(14); // Account number
    default:
      return iban.slice(8); // Generico
  }
}

// ===== EMAIL VALIDATION V4.0 =====

/**
 * Valida un indirizzo email con controlli avanzati di sicurezza
 */
export function validateEmail(email: string): EnhancedValidationResult {
  if (!email) {
    return { 
      isValid: false, 
      error: 'Email richiesta',
      severity: 'error'
    };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo formato base
  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return { 
      isValid: false, 
      error: 'Formato email non valido',
      severity: 'error',
      suggestions: ['Verificare che l\'email contenga @ e un dominio valido']
    };
  }

  // Controllo lunghezza
  if (email.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Email troppo lunga (max ${VALIDATION_RULES.EMAIL_MAX_LENGTH} caratteri)`,
      severity: 'error'
    };
  }

  const [localPart, domain] = email.split('@');

  // Controlli sulla parte locale
  if (localPart.length > 64) {
    return { 
      isValid: false, 
      error: 'Parte locale troppo lunga (max 64 caratteri)',
      severity: 'error'
    };
  }

  // Controlli sul dominio
  if (domain.length > 253) {
    return { 
      isValid: false, 
      error: 'Dominio troppo lungo (max 253 caratteri)',
      severity: 'error'
    };
  }

  // Controlli di sicurezza avanzati V4.0
  const securityChecks = validateEmailSecurity(email, localPart, domain);
  warnings.push(...securityChecks.warnings);
  suggestions.push(...securityChecks.suggestions);
  confidence = securityChecks.confidence;
  riskScore = securityChecks.riskScore;

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    riskScore,
    complianceStatus: riskScore < 0.3 ? 'compliant' : riskScore < 0.7 ? 'warning' : 'non_compliant',
    metadata: {
      localPart,
      domain,
      provider: identifyEmailProvider(domain),
      isBusinessEmail: isBusinessEmail(domain),
      isDisposable: isDisposableEmail(domain)
    }
  };
}

function validateEmailSecurity(
  email: string, 
  localPart: string, 
  domain: string
): {
  confidence: number;
  riskScore: number;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo caratteri sospetti
  if (/[<>()[\]\\,;:\s@"]/.test(localPart)) {
    warnings.push('Caratteri speciali nella parte locale');
    confidence -= 0.1;
    riskScore += 0.1;
  }

  // Controllo domini temporanei/sospetti
  if (isDisposableEmail(domain)) {
    warnings.push('Email temporanea o usa-e-getta');
    suggestions.push('Richiedere un indirizzo email permanente');
    confidence -= 0.3;
    riskScore += 0.4;
  }

  // Controllo lunghezza parti
  if (localPart.length < 2) {
    warnings.push('Parte locale molto corta');
    confidence -= 0.1;
    riskScore += 0.1;
  }

  // Controllo pattern sospetti
  if (isSuspiciousEmailPattern(email)) {
    warnings.push('Pattern email sospetto');
    confidence -= 0.2;
    riskScore += 0.2;
  }

  return { confidence, riskScore, warnings, suggestions };
}

function identifyEmailProvider(domain: string): string {
  const providers: Record<string, string> = {
    'gmail.com': 'Gmail',
    'outlook.com': 'Outlook',
    'hotmail.com': 'Hotmail',
    'yahoo.com': 'Yahoo',
    'libero.it': 'Libero',
    'virgilio.it': 'Virgilio',
    'tiscali.it': 'Tiscali',
    'alice.it': 'Alice',
    'tin.it': 'TIN',
    'fastwebnet.it': 'Fastweb'
  };

  return providers[domain.toLowerCase()] || 'Altro';
}

function isBusinessEmail(domain: string): boolean {
  const consumerDomains = [
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'libero.it',
    'virgilio.it', 'tiscali.it', 'alice.it', 'tin.it'
  ];
  
  return !consumerDomains.includes(domain.toLowerCase());
}

function isDisposableEmail(domain: string): boolean {
  const disposableDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'tempmail.org', 'yopmail.com', 'temp-mail.org'
  ];
  
  return disposableDomains.includes(domain.toLowerCase());
}

function isSuspiciousEmailPattern(email: string): boolean {
  // Pattern di email sospette
  const suspiciousPatterns = [
    /noreply/i,
    /no-reply/i,
    /test@/i,
    /admin@/i,
    /^[a-z]{1,2}@/i, // Email molto corte
    /\d{8,}@/i, // Solo numeri lunghi
  ];

  return suspiciousPatterns.some(pattern => pattern.test(email));
}

// ===== PHONE NUMBER VALIDATION V4.0 =====

/**
 * Valida un numero di telefono con supporto internazionale
 */
export function validatePhoneNumber(
  phone: string,
  options: {
    country?: string;
    allowInternational?: boolean;
    requireMobile?: boolean;
  } = {}
): EnhancedValidationResult {
  const { country = 'IT', allowInternational = true, requireMobile = false } = options;

  if (!phone) {
    return { 
      isValid: false, 
      error: 'Numero di telefono richiesto',
      severity: 'error'
    };
  }

  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;

  // Controllo caratteri validi
  if (!/^[\+\d]+$/.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'Il numero può contenere solo cifre e il simbolo +',
      severity: 'error'
    };
  }

  // Validazione specifica per paese
  if (country === 'IT') {
    return validateItalianPhone(cleanPhone, requireMobile);
  } else if (allowInternational) {
    return validateInternationalPhone(cleanPhone);
  }

  return {
    isValid: false,
    error: `Validazione non supportata per il paese: ${country}`,
    severity: 'error'
  };
}

function validateItalianPhone(phone: string, requireMobile: boolean): EnhancedValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let phoneType = 'unknown';

  // Rimuovi prefisso internazionale se presente
  let nationalNumber = phone;
  if (phone.startsWith('+39')) {
    nationalNumber = phone.slice(3);
  } else if (phone.startsWith('39') && phone.length > 10) {
    nationalNumber = phone.slice(2);
  }

  // Controllo lunghezza
  if (nationalNumber.length < VALIDATION_RULES.PHONE_MIN_LENGTH || 
      nationalNumber.length > VALIDATION_RULES.PHONE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Numero italiano deve essere di ${VALIDATION_RULES.PHONE_MIN_LENGTH}-${VALIDATION_RULES.PHONE_MAX_LENGTH} cifre`,
      severity: 'error'
    };
  }

  // Determina tipo di numero
  if (REGEX_PATTERNS.PHONE_MOBILE_IT.test(nationalNumber)) {
    phoneType = 'mobile';
  } else if (nationalNumber.startsWith('0')) {
    phoneType = 'landline';
  } else {
    warnings.push('Tipo di numero non riconosciuto');
    confidence -= 0.2;
  }

  // Controllo se richiesto mobile
  if (requireMobile && phoneType !== 'mobile') {
    return {
      isValid: false,
      error: 'È richiesto un numero di cellulare',
      severity: 'error',
      suggestions: ['Inserire un numero che inizia con 3']
    };
  }

  // Controlli aggiuntivi
  if (phoneType === 'landline' && nationalNumber.length !== 10) {
    warnings.push('Lunghezza insolita per numero fisso');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    metadata: {
      formatted: formatItalianPhone(nationalNumber),
      type: phoneType,
      national: nationalNumber,
      international: `+39${nationalNumber}`
    }
  };
}

function validateInternationalPhone(phone: string): EnhancedValidationResult {
  if (!REGEX_PATTERNS.PHONE_INTERNATIONAL.test(phone)) {
    return {
      isValid: false,
      error: 'Formato numero internazionale non valido',
      severity: 'error',
      suggestions: ['Il formato deve essere: +[prefisso paese][numero]']
    };
  }

  return {
    isValid: true,
    confidence: 0.7, // Minore per numeri internazionali non verificabili
    metadata: {
      formatted: phone,
      type: 'international'
    }
  };
}

function formatItalianPhone(phone: string): string {
  if (phone.length === 10) {
    if (phone.startsWith('3')) {
      // Mobile: 3XX XXX XXXX
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    } else {
      // Fisso: 0XX XXXXXXX o 0X XXXXXXXX
      const areaCodeLength = phone.startsWith('02') || phone.startsWith('06') ? 2 : 3;
      return `${phone.slice(0, areaCodeLength)} ${phone.slice(areaCodeLength)}`;
    }
  }
  
  return phone;
}

// ===== AMOUNT & FINANCIAL VALIDATION V4.0 =====

/**
 * Valida un importo monetario con controlli business
 */
export function validateAmount(
  amount: string | number,
  options: {
    currency?: string;
    allowNegative?: boolean;
    maxAmount?: number;
    minAmount?: number;
    requirePositive?: boolean;
  } = {}
): EnhancedValidationResult {
  const {
    currency = 'EUR',
    allowNegative = false,
    maxAmount = VALIDATION_RULES.AMOUNT_MAX,
    minAmount = allowNegative ? -maxAmount : VALIDATION_RULES.AMOUNT_MIN,
    requirePositive = false
  } = options;

  if (amount === '' || amount === null || amount === undefined) {
    return { 
      isValid: false, 
      error: 'Importo richiesto',
      severity: 'error'
    };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;

  // Conversione e pulizia
  let numericAmount: number;
  if (typeof amount === 'string') {
    // Gestisce formati con virgola decimale
    const cleanAmount = amount.replace(/[^\d,.\-+]/g, '').replace(',', '.');
    numericAmount = parseFloat(cleanAmount);
  } else {
    numericAmount = amount;
  }

  if (isNaN(numericAmount)) {
    return { 
      isValid: false, 
      error: 'Importo non valido',
      severity: 'error',
      suggestions: ['Utilizzare solo numeri e punto/virgola per i decimali']
    };
  }

  // Controllo segno
  if (requirePositive && numericAmount <= 0) {
    return {
      isValid: false,
      error: 'Importo deve essere positivo',
      severity: 'error'
    };
  }

  if (!allowNegative && numericAmount < 0) {
    return { 
      isValid: false, 
      error: 'Importo non può essere negativo',
      severity: 'error'
    };
  }

  // Controllo range
  if (numericAmount < minAmount) {
    return {
      isValid: false,
      error: `Importo minimo: ${minAmount}`,
      severity: 'error'
    };
  }

  if (numericAmount > maxAmount) {
    return { 
      isValid: false, 
      error: `Importo massimo: ${maxAmount}`,
      severity: 'error'
    };
  }

  // Controllo decimali
  const decimals = numericAmount.toString().split('.')[1];
  if (decimals && decimals.length > VALIDATION_RULES.AMOUNT_DECIMALS) {
    warnings.push(`Troppi decimali (max ${VALIDATION_RULES.AMOUNT_DECIMALS})`);
    suggestions.push('L\'importo verrà arrotondato');
    confidence -= 0.1;
  }

  // Controlli business
  const businessChecks = validateAmountBusiness(numericAmount, currency);
  warnings.push(...businessChecks.warnings);
  suggestions.push(...businessChecks.suggestions);

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    value: numericAmount,
    metadata: {
      currency,
      rounded: Math.round(numericAmount * 100) / 100,
      category: categorizeAmount(numericAmount)
    }
  };
}

function validateAmountBusiness(amount: number, currency: string): {
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Soglie di attenzione per importi
  const thresholds = {
    EUR: { low: 0.01, warning: 10000, high: 100000 },
    USD: { low: 0.01, warning: 12000, high: 120000 }
  };

  const threshold = thresholds[currency as keyof typeof thresholds] || thresholds.EUR;

  if (amount < threshold.low) {
    warnings.push('Importo molto basso');
  } else if (amount > threshold.high) {
    warnings.push('Importo molto elevato - potrebbe richiedere autorizzazioni aggiuntive');
    suggestions.push('Verificare limiti normativi per importi elevati');
  } else if (amount > threshold.warning) {
    warnings.push('Importo elevato');
  }

  return { warnings, suggestions };
}

function categorizeAmount(amount: number): string {
  if (amount === 0) return 'zero';
  if (amount < 100) return 'small';
  if (amount < 1000) return 'medium';
  if (amount < 10000) return 'large';
  return 'very_large';
}

// ===== DATE VALIDATION V4.0 =====

/**
 * Valida una data con controlli business e range
 */
export function validateDate(
  date: string | Date,
  options: {
    allowFuture?: boolean;
    allowPast?: boolean;
    minDate?: Date;
    maxDate?: Date;
    businessDaysOnly?: boolean;
    requiredFormat?: string;
  } = {}
): EnhancedValidationResult {
  const {
    allowFuture = true,
    allowPast = true,
    minDate,
    maxDate,
    businessDaysOnly = false,
    requiredFormat
  } = options;

  if (!date) {
    return { 
      isValid: false, 
      error: 'Data richiesta',
      severity: 'error'
    };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;

  let dateObj: Date;
  try {
    dateObj = typeof date === 'string' ? new Date(date) : date;
  } catch (error) {
    return {
      isValid: false,
      error: 'Formato data non valido',
      severity: 'error'
    };
  }

  if (isNaN(dateObj.getTime())) {
    return { 
      isValid: false, 
      error: 'Data non valida',
      severity: 'error',
      suggestions: ['Verificare il formato della data']
    };
  }

  // Controllo range anni ragionevole
  const year = dateObj.getFullYear();
  if (year < VALIDATION_RULES.DATE_MIN_YEAR || year > VALIDATION_RULES.DATE_MAX_YEAR) {
    return { 
      isValid: false, 
      error: `Anno non valido (${VALIDATION_RULES.DATE_MIN_YEAR}-${VALIDATION_RULES.DATE_MAX_YEAR})`,
      severity: 'error'
    };
  }

  const now = new Date();
  const isInFuture = dateObj > now;
  const isInPast = dateObj < now;

  // Controllo futuro/passato
  if (!allowFuture && isInFuture) {
    return {
      isValid: false,
      error: 'Date future non consentite',
      severity: 'error'
    };
  }

  if (!allowPast && isInPast) {
    return {
      isValid: false,
      error: 'Date passate non consentite',
      severity: 'error'
    };
  }

  // Controllo range personalizzato
  if (minDate && dateObj < minDate) {
    return {
      isValid: false,
      error: `Data deve essere successiva al ${minDate.toLocaleDateString()}`,
      severity: 'error'
    };
    return {
      isValid: false,
      error: `Data deve essere precedente al ${maxDate.toLocaleDateString()}`,
      severity: 'error'
    };
  }

  // Controllo giorni lavorativi
  if (businessDaysOnly) {
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push('Data in weekend');
      suggestions.push('Considerare un giorno lavorativo');
      confidence -= 0.1;
    }
  }

  // Controlli aggiuntivi
  const dateChecks = validateDateBusiness(dateObj);
  warnings.push(...dateChecks.warnings);
  suggestions.push(...dateChecks.suggestions);

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    value: dateObj,
    metadata: {
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      isHoliday: isItalianHoliday(dateObj),
      quarter: Math.ceil((dateObj.getMonth() + 1) / 3),
      weekOfYear: getWeekOfYear(dateObj)
    }
  };
}

function validateDateBusiness(date: Date): {
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const now = new Date();

  // Controllo festività italiane
  if (isItalianHoliday(date)) {
    warnings.push('Data festiva in Italia');
    suggestions.push('Verificare se appropriata per operazioni business');
  }

  // Controllo date molto vecchie o future
  const diffDays = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365 * 5) {
    if (date < now) {
      warnings.push('Data molto vecchia (>5 anni)');
    } else {
      warnings.push('Data molto futura (>5 anni)');
    }
  }

  return { warnings, suggestions };
}

function isItalianHoliday(date: Date): boolean {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  
  // Festività fisse
  const fixedHolidays = [
    [1, 1],   // Capodanno
    [1, 6],   // Epifania
    [4, 25],  // Festa della Liberazione
    [5, 1],   // Festa del Lavoro
    [6, 2],   // Festa della Repubblica
    [8, 15],  // Ferragosto
    [11, 1],  // Ognissanti
    [12, 8],  // Immacolata
    [12, 25], // Natale
    [12, 26], // Santo Stefano
  ];

  return fixedHolidays.some(([m, d]) => month === m && day === d);
}

function getWeekOfYear(date: Date): number {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

// ===== DATE RANGE VALIDATION V4.0 =====

/**
 * Valida un range di date con controlli business
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  options: {
    maxDuration?: number; // in giorni
    minDuration?: number; // in giorni
    allowSameDay?: boolean;
    businessContext?: 'invoice' | 'report' | 'contract' | 'generic';
  } = {}
): EnhancedValidationResult {
  const { 
    maxDuration = 365 * 5, // 5 anni default
    minDuration = 0,
    allowSameDay = true,
    businessContext = 'generic'
  } = options;

  // Valida singole date
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return { 
      isValid: false, 
      error: `Data inizio: ${startValidation.error}`,
      severity: 'error'
    };
  }

  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return { 
      isValid: false, 
      error: `Data fine: ${endValidation.error}`,
      severity: 'error'
    };
  }

  const start = startValidation.value!;
  const end = endValidation.value!;
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Controllo ordine
  if (start > end) {
    return { 
      isValid: false, 
      error: 'Data inizio deve essere precedente alla data fine',
      severity: 'error'
    };
  }

  // Controllo stesso giorno
  if (!allowSameDay && start.getTime() === end.getTime()) {
    return {
      isValid: false,
      error: 'Data inizio e fine non possono essere uguali',
      severity: 'error'
    };
  }

  // Calcolo durata
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // Controllo durata minima
  if (durationDays < minDuration) {
    return {
      isValid: false,
      error: `Durata minima: ${minDuration} giorni`,
      severity: 'error'
    };
  }

  // Controllo durata massima
  if (durationDays > maxDuration) {
    return { 
      isValid: false, 
      error: `Durata massima: ${maxDuration} giorni`,
      severity: 'error'
    };
  }

  // Controlli specifici per contesto business
  const contextChecks = validateDateRangeByContext(start, end, durationDays, businessContext);
  warnings.push(...contextChecks.warnings);
  suggestions.push(...contextChecks.suggestions);

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    metadata: {
      durationDays,
      durationWeeks: Math.ceil(durationDays / 7),
      durationMonths: Math.ceil(durationDays / 30),
      businessDaysCount: calculateBusinessDays(start, end),
      includesWeekends: durationDays > 5 && hasWeekends(start, end),
      includesHolidays: hasItalianHolidays(start, end)
    }
  };
}

function validateDateRangeByContext(
  start: Date, 
  end: Date, 
  durationDays: number, 
  context: string
): {
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  switch (context) {
    case 'invoice':
      if (durationDays > 365) {
        warnings.push('Range molto ampio per fatture');
        suggestions.push('Considerare periodi più brevi per analisi dettagliate');
      }
      break;
      
    case 'report':
      if (durationDays < 7) {
        warnings.push('Periodo molto breve per report');
      } else if (durationDays > 730) { // 2 anni
        warnings.push('Periodo molto ampio per report dettagliati');
      }
      break;
      
    case 'contract':
      if (durationDays < 30) {
        warnings.push('Contratto di durata molto breve');
      } else if (durationDays > 365 * 10) { // 10 anni
        warnings.push('Contratto di durata molto lunga');
      }
      break;
  }

  return { warnings, suggestions };
}

function calculateBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Non domenica e non sabato
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function hasWeekends(start: Date, end: Date): boolean {
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

function hasItalianHolidays(start: Date, end: Date): boolean {
  const current = new Date(start);
  
  while (current <= end) {
    if (isItalianHoliday(current)) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

// ===== FILE VALIDATION V4.0 =====

/**
 * Valida file caricato con controlli di sicurezza avanzati
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    category?: 'invoices' | 'transactions' | 'anagraphics' | 'documents';
    scanForMalware?: boolean;
    checkSignature?: boolean;
  } = {}
): EnhancedValidationResult {
  const {
    maxSize = SECURITY_CONFIG.MAX_FILE_SCAN_SIZE,
    allowedTypes = [],
    allowedExtensions = [],
    category = 'documents',
    scanForMalware = SECURITY_CONFIG.SCAN_UPLOADED_FILES,
    checkSignature = true
  } = options;

  if (!file) {
    return { 
      isValid: false, 
      error: 'File richiesto',
      severity: 'error'
    };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo dimensione
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { 
      isValid: false, 
      error: `File troppo grande (max ${maxSizeMB}MB)`,
      severity: 'error'
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File vuoto',
      severity: 'error'
    };
  }

  // Controllo estensione
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) {
    warnings.push('File senza estensione');
    confidence -= 0.2;
    riskScore += 0.2;
  } else {
    // Controllo estensioni permesse per categoria
    const categoryExtensions = getCategoryAllowedExtensions(category);
    
    if (allowedExtensions.length > 0) {
      if (!allowedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `Estensione non consentita. Permesse: ${allowedExtensions.join(', ')}`,
          severity: 'error'
        };
      }
    } else if (categoryExtensions.length > 0) {
      if (!categoryExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `Estensione non supportata per ${category}. Permesse: ${categoryExtensions.join(', ')}`,
          severity: 'error'
        };
      }
    }
  }

  // Controllo tipo MIME
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Tipo di file non consentito',
      severity: 'error'
    };
  }

  // Controlli di sicurezza
  const securityChecks = validateFileSecurity(file, extension, checkSignature);
  warnings.push(...securityChecks.warnings);
  suggestions.push(...securityChecks.suggestions);
  confidence = Math.min(confidence, securityChecks.confidence);
  riskScore = Math.max(riskScore, securityChecks.riskScore);

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    riskScore,
    complianceStatus: riskScore < 0.3 ? 'compliant' : riskScore < 0.7 ? 'warning' : 'non_compliant',
    metadata: {
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      type: file.type,
      extension,
      category,
      lastModified: new Date(file.lastModified),
      isSecure: riskScore < 0.3
    }
  };
}

function getCategoryAllowedExtensions(category: string): string[] {
  switch (category) {
    case 'invoices':
      return [...SUPPORTED_FILE_FORMATS.INVOICES.XML, ...SUPPORTED_FILE_FORMATS.INVOICES.P7M, 
              ...SUPPORTED_FILE_FORMATS.INVOICES.PDF, ...SUPPORTED_FILE_FORMATS.INVOICES.EXCEL];
    case 'transactions':
      return [...SUPPORTED_FILE_FORMATS.TRANSACTIONS.CSV, ...SUPPORTED_FILE_FORMATS.TRANSACTIONS.EXCEL,
              ...SUPPORTED_FILE_FORMATS.TRANSACTIONS.TXT];
    case 'anagraphics':
      return [...SUPPORTED_FILE_FORMATS.ANAGRAPHICS.CSV, ...SUPPORTED_FILE_FORMATS.ANAGRAPHICS.EXCEL];
    default:
      return [];
  }
}

function validateFileSecurity(
  file: File, 
  extension: string | undefined, 
  checkSignature: boolean
): {
  confidence: number;
  riskScore: number;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo nome file sospetto
  if (hasSuspiciousFileName(file.name)) {
    warnings.push('Nome file sospetto');
    suggestions.push('Rinominare il file con un nome più descrittivo');
    confidence -= 0.2;
    riskScore += 0.2;
  }

  // Controllo estensioni doppie (possibile malware)
  if (hasDoubleExtension(file.name)) {
    warnings.push('File con estensione doppia rilevato');
    suggestions.push('Verificare l\'autenticità del file');
    confidence -= 0.3;
    riskScore += 0.4;
  }

  // Controllo estensioni eseguibili
  if (extension && isExecutableExtension(extension)) {
    warnings.push('File eseguibile rilevato');
    suggestions.push('I file eseguibili non sono raccomandati');
    confidence -= 0.5;
    riskScore += 0.6;
  }

  return { confidence, riskScore, warnings, suggestions };
}

function hasSuspiciousFileName(fileName: string): boolean {
  const suspiciousPatterns = [
    /temp/i,
    /test/i,
    /malware/i,
    /virus/i,
    /hack/i,
    /\.exe\./i,
    /\.\./,
    /[<>:"|?*]/
  ];

  return suspiciousPatterns.some(pattern => pattern.test(fileName));
}

function hasDoubleExtension(fileName: string): boolean {
  const parts = fileName.split('.');
  return parts.length > 2;
}

function isExecutableExtension(extension: string): boolean {
  const executableExtensions = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'pkg', 'dmg', 'run', 'msi', 'sh'
  ];
  
  return executableExtensions.includes(extension.toLowerCase());
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ===== BUSINESS DATA VALIDATION V4.0 =====

/**
 * Valida dati completi di una fattura
 */
export function validateInvoiceData(data: {
  doc_number: string;
  doc_date: string | Date;
  total_amount: number;
  anagraphics_id: number;
  due_date?: string | Date;
  type?: string;
  payment_terms?: number;
}): BatchValidationResult {
  const results: Record<string, ValidationResult> = {};
  const criticalErrors: string[] = [];

  // Validazione numero documento
  results.doc_number = validateDocumentNumber(data.doc_number);
  
  // Validazione data documento
  results.doc_date = validateDate(data.doc_date, {
    allowFuture: false,
    maxDate: new Date()
  });

  // Validazione importo
  results.total_amount = validateAmount(data.total_amount, {
    requirePositive: true,
    maxAmount: 999999999.99
  });

  // Validazione anagrafica
  if (!data.anagraphics_id || data.anagraphics_id <= 0) {
    results.anagraphics_id = {
      isValid: false,
      error: 'Anagrafica richiesta',
      severity: 'error'
    };
  } else {
    results.anagraphics_id = { isValid: true };
  }

  // Validazione data scadenza (opzionale)
  if (data.due_date) {
    const docDate = typeof data.doc_date === 'string' ? new Date(data.doc_date) : data.doc_date;
    results.due_date = validateDate(data.due_date, {
      minDate: docDate,
      allowPast: false
    });

    // Controllo coerenza con termini di pagamento
    if (data.payment_terms && results.due_date.isValid && results.doc_date.isValid) {
      const expectedDue = new Date(docDate);
      expectedDue.setDate(expectedDue.getDate() + data.payment_terms);
      
      const actualDue = typeof data.due_date === 'string' ? new Date(data.due_date) : data.due_date;
      const diffDays = Math.abs((actualDue.getTime() - expectedDue.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) { // Tolleranza di 1 giorno
        results.due_date.warnings = results.due_date.warnings || [];
        results.due_date.warnings.push('Data scadenza non coerente con termini di pagamento');
      }
    }
  }

  // Raccolta errori critici
  Object.entries(results).forEach(([field, result]) => {
    if (!result.isValid && result.severity === 'error') {
      criticalErrors.push(`${field}: ${result.error}`);
    }
  });

  const validCount = Object.values(results).filter(r => r.isValid).length;
  const warningCount = Object.values(results).filter(r => r.warnings?.length).length;

  return {
    isValid: criticalErrors.length === 0,
    results,
    summary: {
      total: Object.keys(results).length,
      valid: validCount,
      invalid: Object.keys(results).length - validCount,
      warnings: warningCount
    },
    criticalErrors
  };
}

/**
 * Valida dati completi di un'anagrafica
 */
export function validateAnagraphicsData(data: {
  denomination: string;
  piva?: string;
  cf?: string;
  email?: string;
  phone?: string;
  cap?: string;
  iban?: string;
  type?: string;
  address?: string;
  city?: string;
  province?: string;
}): BatchValidationResult {
  const results: Record<string, ValidationResult> = {};
  const criticalErrors: string[] = [];

  // Validazione denominazione
  if (!data.denomination || data.denomination.trim().length === 0) {
    results.denomination = {
      isValid: false,
      error: 'Denominazione richiesta',
      severity: 'error'
    };
  } else if (data.denomination.length > VALIDATION_RULES.DENOMINATION_MAX_LENGTH) {
    results.denomination = {
      isValid: false,
      error: `Denominazione troppo lunga (max ${VALIDATION_RULES.DENOMINATION_MAX_LENGTH} caratteri)`,
      severity: 'error'
    };
  } else {
    results.denomination = { isValid: true };
  }

  // Validazione codici fiscali
  if (data.piva) {
    results.piva = validatePartitaIva(data.piva);
  }

  if (data.cf) {
    results.cf = validateCodiceFiscale(data.cf);
  }

  // Almeno uno tra P.IVA e CF deve essere presente
  if (!data.piva && !data.cf) {
    results.fiscal_codes = {
      isValid: false,
      error: 'Almeno uno tra Partita IVA e Codice Fiscale è richiesto',
      severity: 'error'
    };
  } else {
    results.fiscal_codes = { isValid: true };
  }

  // Validazione contatti (opzionali)
  if (data.email) {
    results.email = validateEmail(data.email);
  }

  if (data.phone) {
    results.phone = validatePhoneNumber(data.phone);
  }

  // Validazione indirizzo (opzionale)
  if (data.cap) {
    results.cap = validateCAP(data.cap);
  }

  if (data.iban) {
    results.iban = validateIBAN(data.iban);
  }

  // Raccolta errori critici
  Object.entries(results).forEach(([field, result]) => {
    if (!result.isValid && result.severity === 'error') {
      criticalErrors.push(`${field}: ${result.error}`);
    }
  });

  const validCount = Object.values(results).filter(r => r.isValid).length;
  const warningCount = Object.values(results).filter(r => r.warnings?.length).length;

  return {
    isValid: criticalErrors.length === 0,
    results,
    summary: {
      total: Object.keys(results).length,
      valid: validCount,
      invalid: Object.keys(results).length - validCount,
      warnings: warningCount
    },
    criticalErrors
  };
}

// ===== ITALIAN POSTAL CODE VALIDATION =====

/**
 * Valida un CAP italiano
 */
export function validateCAP(cap: string): ValidationResult {
  if (!cap) {
    return { 
      isValid: false, 
      error: 'CAP richiesto',
      severity: 'error'
    };
  }

  const cleanCAP = cap.replace(/\D/g, '');
  
  if (cleanCAP.length !== VALIDATION_RULES.CAP_LENGTH) {
    return { 
      isValid: false, 
      error: `CAP deve essere di ${VALIDATION_RULES.CAP_LENGTH} cifre`,
      severity: 'error'
    };
  }

  if (!REGEX_PATTERNS.CAP.test(cleanCAP)) {
    return {
      isValid: false,
      error: 'Formato CAP non valido',
      severity: 'error'
    };
  }

  // Controllo range CAP italiani
  const capNumber = parseInt(cleanCAP);
  if (capNumber < 10 || capNumber > 98168) {
    return { 
      isValid: false, 
      error: 'CAP italiano non valido',
      severity: 'error'
    };
  }

  return { isValid: true };
}

// ===== DOCUMENT NUMBER VALIDATION =====

/**
 * Valida un numero di documento
 */
export function validateDocumentNumber(docNumber: string): ValidationResult {
  if (!docNumber) {
    return { 
      isValid: false, 
      error: 'Numero documento richiesto',
      severity: 'error'
    };
  }

  const cleaned = docNumber.trim();
  
  if (cleaned.length === 0) {
    return { 
      isValid: false, 
      error: 'Numero documento non può essere vuoto',
      severity: 'error'
    };
  }

  if (cleaned.length > VALIDATION_RULES.DOCUMENT_NUMBER_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Numero documento troppo lungo (max ${VALIDATION_RULES.DOCUMENT_NUMBER_MAX_LENGTH} caratteri)`,
      severity: 'error'
    };
  }

  if (!REGEX_PATTERNS.DOCUMENT_CODE.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Caratteri non ammessi nel numero documento',
      severity: 'error',
      suggestions: ['Utilizzare solo lettere, numeri, trattini e underscore']
    };
  }

  return { isValid: true };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Combina risultati di validazione multipli
 */
export function combineValidations(
  ...validations: Array<{ isValid: boolean; error?: string; severity?: string }>
): {
  isValid: boolean;
  errors: string[];
  criticalErrors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const criticalErrors: string[] = [];
  const warnings: string[] = [];

  validations.forEach(validation => {
    if (!validation.isValid && validation.error) {
      if (validation.severity === 'critical' || validation.severity === 'error') {
        criticalErrors.push(validation.error);
      } else if (validation.severity === 'warning') {
        warnings.push(validation.error);
      } else {
        errors.push(validation.error);
      }
    }
  });

  return {
    isValid: criticalErrors.length === 0 && errors.length === 0,
    errors,
    criticalErrors,
    warnings
  };
}

/**
 * Valida formato CSV per import
 */
export function validateCSVFormat(
  csvData: any[],
  requiredColumns: string[],
  options: {
    allowExtraColumns?: boolean;
    caseSensitive?: boolean;
  } = {}
): EnhancedValidationResult {
  const { allowExtraColumns = true, caseSensitive = false } = options;

  if (!csvData || csvData.length === 0) {
    return { 
      isValid: false, 
      error: 'File CSV vuoto',
      severity: 'error'
    };
  }

  const firstRow = csvData[0];
  const actualColumns = Object.keys(firstRow);
  
  // Normalizza nomi colonne se non case sensitive
  const normalizeColumn = (col: string) => caseSensitive ? col : col.toLowerCase().trim();
  const normalizedActual = actualColumns.map(normalizeColumn);
  const normalizedRequired = requiredColumns.map(normalizeColumn);
  
  const missingColumns = normalizedRequired.filter(col => !normalizedActual.includes(col));
  
  if (missingColumns.length > 0) {
    return { 
      isValid: false, 
      error: `Colonne mancanti: ${missingColumns.join(', ')}`,
      severity: 'error',
      suggestions: [`Assicurarsi che il CSV contenga le colonne: ${requiredColumns.join(', ')}`],
      metadata: { missingColumns, availableColumns: actualColumns }
    };
  }

  const warnings: string[] = [];
  if (!allowExtraColumns) {
    const extraColumns = normalizedActual.filter(col => !normalizedRequired.includes(col));
    if (extraColumns.length > 0) {
      warnings.push(`Colonne extra presenti: ${extraColumns.join(', ')}`);
    }
  }

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      totalRows: csvData.length,
      totalColumns: actualColumns.length,
      columnsMatched: normalizedRequired.length
    }
  };
}

// ===== DEFAULT EXPORT V4.0 =====
export default {
  // Italian Fiscal Codes
  validateCodiceFiscale,
  validatePartitaIva,
  validateEuropeanVAT,
  
  // Banking
  validateIBAN,
  
  // Contact Information
  validateEmail,
  validatePhoneNumber,
  
  // Financial
  validateAmount,
  
  // Dates
  validateDate,
  validateDateRange,
  
  // Files
  validateFile,
  
  // Business Data
  validateInvoiceData,
  validateAnagraphicsData,
  
  // Italian Specific
  validateCAP,
  validateDocumentNumber,
  
  // Utilities
  combineValidations,
  validateCSVFormat,
};/**
 * Validation Utilities V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Validatori aggiornati per supportare:
 * - Validazioni business avanzate con AI insights
 * - Controlli fiscali italiani ed europei
 * - Validazioni file e formati V4.0
 * - Controlli di sicurezza e conformità
 * - Validazioni real-time e predittive
 */

import { 
  REGEX_PATTERNS, 
  VALIDATION_RULES, 
  SUPPORTED_FILE_FORMATS,
  MIME_TYPES,
  SECURITY_CONFIG,
  V4_FEATURES
} from './constants';

// ===== TYPES & INTERFACES V4.0 =====

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
  confidence?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface EnhancedValidationResult extends ValidationResult {
  value?: any;
  metadata?: Record<string, any>;
  aiEnhanced?: boolean;
  riskScore?: number;
  complianceStatus?: 'compliant' | 'warning' | 'non_compliant';
}

export interface BatchValidationResult {
  isValid: boolean;
  results: Record<string, ValidationResult>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  criticalErrors: string[];
}

// ===== ITALIAN FISCAL CODE VALIDATION V4.0 =====

/**
 * Valida un codice fiscale italiano con controlli avanzati
 */
export function validateCodiceFiscale(cf: string): EnhancedValidationResult {
  if (!cf) {
    return { 
      isValid: false, 
      error: 'Codice fiscale richiesto',
      severity: 'error'
    };
  }

  const cleanCF = cf.replace(/\s/g, '').toUpperCase();
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.5;
  let riskScore = 0;

  // Controllo lunghezza
  if (cleanCF.length !== VALIDATION_RULES.CODICE_FISCALE_LENGTH) {
    return { 
      isValid: false, 
      error: `Il codice fiscale deve essere di ${VALIDATION_RULES.CODICE_FISCALE_LENGTH} caratteri`,
      severity: 'error',
      suggestions: ['Verificare che il codice fiscale sia completo']
    };
  }

  // Controllo formato base
  if (!REGEX_PATTERNS.CODICE_FISCALE.test(cleanCF)) {
    return { 
      isValid: false, 
      error: 'Formato codice fiscale non valido',
      severity: 'error',
      suggestions: [
        'Il formato corretto è: 6 lettere + 2 cifre + 1 lettera + 2 cifre + 1 lettera + 3 cifre + 1 lettera',
        'Esempio: RSSMRA80A01H501U'
      ]
    };
  }

  // Algoritmo di controllo avanzato
  const { isValid: checksumValid, error: checksumError } = validateCFChecksum(cleanCF);
  if (!checksumValid) {
    return {
      isValid: false,
      error: checksumError,
      severity: 'error',
      confidence: 0.1,
      riskScore: 0.8
    };
  }

  // Controlli di plausibilità avanzati V4.0
  const plausibilityChecks = validateCFPlausibility(cleanCF);
  warnings.push(...plausibilityChecks.warnings);
  suggestions.push(...plausibilityChecks.suggestions);
  confidence = plausibilityChecks.confidence;
  riskScore = plausibilityChecks.riskScore;

  // Controllo blacklist (codici fiscali noti per essere problematici)
  if (isBlacklistedCF(cleanCF)) {
    warnings.push('Codice fiscale presente in lista di controllo');
    riskScore += 0.3;
  }

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    aiEnhanced: V4_FEATURES.AI_BUSINESS_INSIGHTS,
    riskScore,
    complianceStatus: riskScore < 0.3 ? 'compliant' : riskScore < 0.7 ? 'warning' : 'non_compliant',
    metadata: {
      formatted: cleanCF,
      birthYear: extractBirthYear(cleanCF),
      birthPlace: extractBirthPlace(cleanCF),
      gender: extractGender(cleanCF)
    }
  };
}

/**
 * Valida il checksum del codice fiscale
 */
function validateCFChecksum(cf: string): ValidationResult {
  const oddMap = 'BAFHJNPRTVCESULDGIMOQKWZYX';
  const evenMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const controlMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  
  try {
    for (let i = 0; i < 15; i++) {
      const char = cf[i];
      const isOdd = i % 2 === 0;
      
      if (isOdd) {
        // Posizione dispari
        if (/[0-9]/.test(char)) {
          const oddValues = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21];
          sum += oddValues[parseInt(char)];
        } else {
          sum += oddMap.indexOf(char);
        }
      } else {
        // Posizione pari
        if (/[0-9]/.test(char)) {
          sum += parseInt(char);
        } else {
          sum += evenMap.indexOf(char);
        }
      }
    }

    const expectedControl = controlMap[sum % 26];
    const actualControl = cf[15];

    if (expectedControl !== actualControl) {
      return { 
        isValid: false, 
        error: `Carattere di controllo non valido. Atteso: ${expectedControl}, trovato: ${actualControl}`,
        severity: 'error'
      };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Errore nel calcolo del checksum',
      severity: 'error'
    };
  }
}

/**
 * Controlli di plausibilità per codice fiscale
 */
function validateCFPlausibility(cf: string): {
  confidence: number;
  riskScore: number;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Estrai componenti
  const surname = cf.slice(0, 3);
  const name = cf.slice(3, 6);
  const birthYear = parseInt(cf.slice(6, 8));
  const birthMonth = cf[8];
  const birthDay = parseInt(cf.slice(9, 11));
  const birthPlace = cf.slice(11, 15);

  // Controllo mese di nascita
  const validMonths = 'ABCDEHLMPRST';
  if (!validMonths.includes(birthMonth)) {
    warnings.push('Mese di nascita non valido');
    confidence -= 0.2;
    riskScore += 0.2;
  }

  // Controllo giorno di nascita (per donne +40)
  const actualDay = birthDay > 40 ? birthDay - 40 : birthDay;
  if (actualDay < 1 || actualDay > 31) {
    warnings.push('Giorno di nascita non plausibile');
    confidence -= 0.3;
    riskScore += 0.3;
  }

  // Controllo anno di nascita (range ragionevole)
  const currentYear = new Date().getFullYear() % 100;
  const fullBirthYear = birthYear <= currentYear ? 2000 + birthYear : 1900 + birthYear;
  const age = new Date().getFullYear() - fullBirthYear;
  
  if (age < 0 || age > 120) {
    warnings.push('Anno di nascita non plausibile');
    confidence -= 0.3;
    riskScore += 0.3;
  } else if (age > 100) {
    warnings.push('Età molto avanzata, verificare accuratezza');
    confidence -= 0.1;
    riskScore += 0.1;
  }

  // Controllo codice comune di nascita
  if (!isValidBirthPlaceCode(birthPlace)) {
    warnings.push('Codice luogo di nascita non riconosciuto');
    suggestions.push('Verificare il codice del comune di nascita');
    confidence -= 0.2;
    riskScore += 0.2;
  }

  return { confidence, riskScore, warnings, suggestions };
}

/**
 * Utility functions per codice fiscale
 */
function isBlacklistedCF(cf: string): boolean {
  // Lista di codici fiscali noti per essere problematici
  const blacklist = [
    'AAAAAA00A00A000A', // Codice test
    'BBBBBBB00B00B000B', // Codice test
  ];
  return blacklist.includes(cf);
}

function extractBirthYear(cf: string): number {
  const yearCode = parseInt(cf.slice(6, 8));
  const currentYear = new Date().getFullYear() % 100;
  return yearCode <= currentYear ? 2000 + yearCode : 1900 + yearCode;
}

function extractGender(cf: string): 'M' | 'F' {
  const dayCode = parseInt(cf.slice(9, 11));
  return dayCode > 40 ? 'F' : 'M';
}

function extractBirthPlace(cf: string): string {
  return cf.slice(11, 15);
}

function isValidBirthPlaceCode(code: string): boolean {
  // Qui si potrebbe implementare un controllo contro database dei comuni
  // Per ora, controllo formato base
  return /^[A-Z][0-9]{3}$/.test(code) || /^Z[0-9]{3}$/.test(code); // Z per comuni esteri
}

// ===== ITALIAN VAT NUMBER VALIDATION V4.0 =====

/**
 * Valida una partita IVA italiana con controlli avanzati
 */
export function validatePartitaIva(piva: string): EnhancedValidationResult {
  if (!piva) {
    return { 
      isValid: false, 
      error: 'Partita IVA richiesta',
      severity: 'error'
    };
  }

  const cleanPIVA = piva.replace(/\D/g, '');
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo lunghezza
  if (cleanPIVA.length !== VALIDATION_RULES.PARTITA_IVA_LENGTH) {
    return { 
      isValid: false, 
      error: `La partita IVA deve essere di ${VALIDATION_RULES.PARTITA_IVA_LENGTH} cifre`,
      severity: 'error',
      suggestions: ['Verificare che la partita IVA sia completa e non contenga lettere']
    };
  }

  // Controllo cifra di controllo (algoritmo Luhn modificato)
  const { isValid: checksumValid, error: checksumError } = validatePIVAChecksum(cleanPIVA);
  if (!checksumValid) {
    return {
      isValid: false,
      error: checksumError,
      severity: 'error',
      confidence: 0.1,
      riskScore: 0.9
    };
  }

  // Controlli business avanzati V4.0
  const businessChecks = validatePIVABusiness(cleanPIVA);
  warnings.push(...businessChecks.warnings);
  suggestions.push(...businessChecks.suggestions);
  confidence = businessChecks.confidence;
  riskScore = businessChecks.riskScore;

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    aiEnhanced: V4_FEATURES.AI_BUSINESS_INSIGHTS,
    riskScore,
    complianceStatus: riskScore < 0.3 ? 'compliant' : riskScore < 0.7 ? 'warning' : 'non_compliant',
    metadata: {
      formatted: cleanPIVA,
      region: extractPIVARegion(cleanPIVA),
      type: determinePIVAType(cleanPIVA)
    }
  };
}

/**
 * Valida il checksum della partita IVA
 */
function validatePIVAChecksum(piva: string): ValidationResult {
  let sum = 0;
  
  try {
    for (let i = 0; i < 10; i++) {
      let digit = parseInt(piva[i]);
      
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = digit - 9;
        }
      }
      
      sum += digit;
    }

    const expectedCheck = (10 - (sum % 10)) % 10;
    const actualCheck = parseInt(piva[10]);

    if (expectedCheck !== actualCheck) {
      return { 
        isValid: false, 
        error: `Cifra di controllo non valida. Attesa: ${expectedCheck}, trovata: ${actualCheck}`,
        severity: 'error'
      };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Errore nel calcolo del checksum',
      severity: 'error'
    };
  }
}

/**
 * Controlli business per partita IVA
 */
function validatePIVABusiness(piva: string): {
  confidence: number;
  riskScore: number;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.9;
  let riskScore = 0.1;

  // Controllo sequenze sospette
  if (isSuspiciousPIVASequence(piva)) {
    warnings.push('Sequenza numerica sospetta');
    confidence -= 0.2;
    riskScore += 0.2;
  }

  // Controllo range uffici provinciali
  const officeCode = piva.slice(7, 10);
  if (!isValidOfficeCode(officeCode)) {
    warnings.push('Codice ufficio provinciale non riconosciuto');
    confidence -= 0.1;
    riskScore += 0.1;
  }

  return { confidence, riskScore, warnings, suggestions };
}

function isSuspiciousPIVASequence(piva: string): boolean {
  // Controlla sequenze ripetitive o progressive
  const digits = piva.split('').map(Number);
  
  // Tutti i numeri uguali
  if (digits.every(d => d === digits[0])) return true;
  
  // Sequenza crescente/decrescente
  let isSequential = true;
  for (let i = 1; i < digits.length - 1; i++) {
    if (digits[i] !== digits[i-1] + 1 && digits[i] !== digits[i-1] - 1) {
      isSequential = false;
      break;
    }
  }
  
  return isSequential;
}

function isValidOfficeCode(code: string): boolean {
  const officeCode = parseInt(code);
  // Range validi per uffici IVA italiani (semplificato)
  return officeCode >= 1 && officeCode <= 999;
}

function extractPIVARegion(piva: string): string {
  const officeCode = parseInt(piva.slice(7, 10));
  
  // Mapping semplificato codici ufficio -> regioni
  if (officeCode >= 1 && officeCode <= 99) return 'Nord';
  if (officeCode >= 100 && officeCode <= 199) return 'Centro';
  if (officeCode >= 200 && officeCode <= 299) return 'Sud';
  return 'Non determinata';
}

function determinePIVAType(piva: string): string {
  // Analisi euristica del tipo di business basata sui pattern
  const numeric = piva.slice(0, 7);
  
  // Pattern per tipi specifici (molto semplificato)
  if (numeric.startsWith('0')) return 'Ente pubblico';
  if (numeric.startsWith('8')) return 'Società di capitali';
  return 'Standard';
}

// ===== EUROPEAN VAT NUMBER VALIDATION V4.0 =====

/**
 * Valida partita IVA europea
 */
export function validateEuropeanVAT(vat: string): EnhancedValidationResult {
  if (!vat) {
    return { 
      isValid: false, 
      error: 'Partita IVA europea richiesta',
      severity: 'error'
    };
  }

  const cleanVAT = vat.replace(/[\s\-]/g, '').toUpperCase();
