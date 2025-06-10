/**
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
    businessDaysOnly = false
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
  }

  if (maxDate && dateObj > maxDate) {
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

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    confidence,
    value: dateObj,
    metadata: {
      isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      quarter: Math.ceil((dateObj.getMonth() + 1) / 3)
    }
  };
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
  } = {}
): EnhancedValidationResult {
  const {
    maxSize = SECURITY_CONFIG.MAX_FILE_SCAN_SIZE,
    allowedTypes = [],
    allowedExtensions = [],
    category = 'documents'
  } = options;

  if (!file) {
    return { 
      isValid: false, 
      error: 'File richiesto',
      severity: 'error'
    };
  }

  const warnings: string[] = [];
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

  return { 
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    riskScore,
    complianceStatus: riskScore < 0.3 ? 'compliant' : riskScore < 0.7 ? 'warning' : 'non_compliant',
    metadata: {
      size: file.size,
      type: file.type,
      extension,
      category,
      lastModified: new Date(file.lastModified)
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
  
  // Files
  validateFile,
  
  // Italian Specific
  validateCAP,
  validateDocumentNumber,
};
