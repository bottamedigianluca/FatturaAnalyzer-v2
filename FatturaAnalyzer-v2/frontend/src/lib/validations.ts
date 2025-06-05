/**
 * Validation utilities for FatturaAnalyzer
 * Validatori per dati fiscali, business logic, etc.
 */

/**
 * Valida un codice fiscale italiano
 */
export function validateCodiceFiscale(cf: string): {
  isValid: boolean;
  error?: string;
} {
  if (!cf) {
    return { isValid: false, error: 'Codice fiscale richiesto' };
  }

  const cleanCF = cf.replace(/\s/g, '').toUpperCase();
  
  // Controllo lunghezza
  if (cleanCF.length !== 16) {
    return { isValid: false, error: 'Il codice fiscale deve essere di 16 caratteri' };
  }

  // Controllo formato (15 caratteri alfanumerici + 1 lettera di controllo)
  if (!/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cleanCF)) {
    return { isValid: false, error: 'Formato codice fiscale non valido' };
  }

  // Algoritmo di controllo
  const oddMap = 'BAFHJNPRTVCESULDGIMOQKWZYX';
  const evenMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const controlMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  
  for (let i = 0; i < 15; i++) {
    const char = cleanCF[i];
    const isOdd = i % 2 === 0;
    
    if (isOdd) {
      // Posizione dispari
      if (/[0-9]/.test(char)) {
        const charMap = '0123456789';
        const oddValues = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21];
        sum += oddValues[charMap.indexOf(char)];
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
  const actualControl = cleanCF[15];

  if (expectedControl !== actualControl) {
    return { isValid: false, error: 'Carattere di controllo non valido' };
  }

  return { isValid: true };
}

/**
 * Valida una partita IVA italiana
 */
export function validatePartitaIva(piva: string): {
  isValid: boolean;
  error?: string;
} {
  if (!piva) {
    return { isValid: false, error: 'Partita IVA richiesta' };
  }

  const cleanPIVA = piva.replace(/\D/g, '');
  
  // Controllo lunghezza
  if (cleanPIVA.length !== 11) {
    return { isValid: false, error: 'La partita IVA deve essere di 11 cifre' };
  }

  // Algoritmo di controllo (metodo Luhn modificato)
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(cleanPIVA[i]);
    
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = digit - 9;
      }
    }
    
    sum += digit;
  }

  const expectedCheck = (10 - (sum % 10)) % 10;
  const actualCheck = parseInt(cleanPIVA[10]);

  if (expectedCheck !== actualCheck) {
    return { isValid: false, error: 'Cifra di controllo non valida' };
  }

  return { isValid: true };
}

/**
 * Valida un IBAN
 */
export function validateIBAN(iban: string): {
  isValid: boolean;
  error?: string;
} {
  if (!iban) {
    return { isValid: false, error: 'IBAN richiesto' };
  }

  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  
  // Controllo lunghezza (varia per paese, ma min 15 max 34)
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
    return { isValid: false, error: 'Lunghezza IBAN non valida' };
  }

  // Controllo formato base
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIBAN)) {
    return { isValid: false, error: 'Formato IBAN non valido' };
  }

  // Algoritmo MOD-97
  const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);
  
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
    return { isValid: false, error: 'Codice di controllo IBAN non valido' };
  }

  return { isValid: true };
}

/**
 * Valida un indirizzo email
 */
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email) {
    return { isValid: false, error: 'Email richiesta' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Formato email non valido' };
  }

  // Controlli aggiuntivi
  if (email.length > 254) {
    return { isValid: false, error: 'Email troppo lunga' };
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length > 64) {
    return { isValid: false, error: 'Parte locale troppo lunga' };
  }

  if (domain.length > 253) {
    return { isValid: false, error: 'Dominio troppo lungo' };
  }

  return { isValid: true };
}

/**
 * Valida un numero di telefono italiano
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  if (!phone) {
    return { isValid: false, error: 'Numero di telefono richiesto' };
  }

  const cleanPhone = phone.replace(/\D/g, '');
  
  // Controllo numeri italiani
  if (cleanPhone.startsWith('39')) {
    // Con prefisso internazionale
    if (cleanPhone.length !== 12 && cleanPhone.length !== 13) {
      return { isValid: false, error: 'Numero italiano non valido (con +39)' };
    }
  } else {
    // Senza prefisso internazionale
    if (cleanPhone.length !== 10) {
      return { isValid: false, error: 'Numero italiano deve essere di 10 cifre' };
    }
    
    // Controllo primi numeri validi per Italia
    if (!['0', '3'].includes(cleanPhone[0])) {
      return { isValid: false, error: 'Numero italiano deve iniziare con 0 o 3' };
    }
  }

  return { isValid: true };
}

/**
 * Valida un importo monetario
 */
export function validateAmount(amount: string | number): {
  isValid: boolean;
  error?: string;
  value?: number;
} {
  if (amount === '' || amount === null || amount === undefined) {
    return { isValid: false, error: 'Importo richiesto' };
  }

  const numericAmount = typeof amount === 'string' 
    ? parseFloat(amount.replace(',', '.'))
    : amount;

  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Importo non valido' };
  }

  if (numericAmount < 0) {
    return { isValid: false, error: 'Importo non può essere negativo' };
  }

  if (numericAmount > 999999999.99) {
    return { isValid: false, error: 'Importo troppo elevato' };
  }

  // Controllo decimali (max 2)
  const decimals = numericAmount.toString().split('.')[1];
  if (decimals && decimals.length > 2) {
    return { isValid: false, error: 'Massimo 2 decimali consentiti' };
  }

  return { isValid: true, value: numericAmount };
}

/**
 * Valida una data
 */
export function validateDate(date: string | Date): {
  isValid: boolean;
  error?: string;
  value?: Date;
} {
  if (!date) {
    return { isValid: false, error: 'Data richiesta' };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Data non valida' };
  }

  // Controllo range ragionevole (1900 - 2100)
  const year = dateObj.getFullYear();
  if (year < 1900 || year > 2100) {
    return { isValid: false, error: 'Anno non valido (1900-2100)' };
  }

  return { isValid: true, value: dateObj };
}

/**
 * Valida un CAP italiano
 */
export function validateCAP(cap: string): {
  isValid: boolean;
  error?: string;
} {
  if (!cap) {
    return { isValid: false, error: 'CAP richiesto' };
  }

  const cleanCAP = cap.replace(/\D/g, '');
  
  if (cleanCAP.length !== 5) {
    return { isValid: false, error: 'CAP deve essere di 5 cifre' };
  }

  // Controllo range CAP italiani (00010-98168)
  const capNumber = parseInt(cleanCAP);
  if (capNumber < 10 || capNumber > 98168) {
    return { isValid: false, error: 'CAP italiano non valido' };
  }

  return { isValid: true };
}

/**
 * Valida un numero di documento
 */
export function validateDocumentNumber(docNumber: string): {
  isValid: boolean;
  error?: string;
} {
  if (!docNumber) {
    return { isValid: false, error: 'Numero documento richiesto' };
  }

  const cleaned = docNumber.trim();
  
  if (cleaned.length === 0) {
    return { isValid: false, error: 'Numero documento non può essere vuoto' };
  }

  if (cleaned.length > 50) {
    return { isValid: false, error: 'Numero documento troppo lungo (max 50 caratteri)' };
  }

  // Controllo caratteri ammessi
  if (!/^[A-Za-z0-9\-_\/\s]+$/.test(cleaned)) {
    return { isValid: false, error: 'Caratteri non ammessi nel numero documento' };
  }

  return { isValid: true };
}

/**
 * Valida una password
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  if (!password) {
    return { 
      isValid: false, 
      error: 'Password richiesta',
      strength: 'weak'
    };
  }

  if (password.length < 8) {
    return { 
      isValid: false, 
      error: 'Password deve essere di almeno 8 caratteri',
      strength: 'weak'
    };
  }

  let score = 0;
  const checks = {
    length: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password)
  };

  score += checks.length ? 2 : 1;
  score += checks.lowercase ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.numbers ? 1 : 0;
  score += checks.symbols ? 2 : 0;

  let strength: 'weak' | 'medium' | 'strong';
  if (score < 4) {
    strength = 'weak';
  } else if (score < 6) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { 
    isValid: score >= 4,
    error: score < 4 ? 'Password troppo debole' : undefined,
    strength
  };
}

/**
 * Valida un range di date
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date
): {
  isValid: boolean;
  error?: string;
} {
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Data inizio: ${startValidation.error}` };
  }

  const endValidation
