import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function per combinare classi CSS con Tailwind
 * Gestisce conflitti e override di classi
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility per deep clone di oggetti
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T
  }
  
  if (typeof obj === "object") {
    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  
  return obj
}

/**
 * Debounce function per limitare la frequenza di chiamate
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function per limitare la frequenza di esecuzione
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Genera un ID univoco
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Capitalizza la prima lettera di una stringa
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Tronca una stringa alla lunghezza specificata
 */
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str
  return str.substring(0, length - suffix.length) + suffix
}

/**
 * Rimuove accenti da una stringa per ricerche
 */
export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/**
 * Confronta due stringhe ignorando case e accenti
 */
export function fuzzyMatch(str1: string, str2: string): boolean {
  const clean1 = removeAccents(str1.toLowerCase())
  const clean2 = removeAccents(str2.toLowerCase())
  return clean1.includes(clean2) || clean2.includes(clean1)
}

/**
 * Calcola la similarità tra due stringhe (Levenshtein distance)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  
  if (len1 === 0) return len2
  if (len2 === 0) return len1
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null))
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i
  for (let j = 0; j <= len2; j++) matrix[j][0] = j
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }
  
  const maxLen = Math.max(len1, len2)
  return (maxLen - matrix[len2][len1]) / maxLen
}

/**
 * Ordina un array di oggetti per una proprietà
 */
export function sortBy<T>(
  array: T[], 
  key: keyof T, 
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Raggruppa un array di oggetti per una proprietà
 */
export function groupBy<T, K extends keyof T>(
  array: T[], 
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Filtra valori falsy da un array
 */
export function compact<T>(array: (T | null | undefined | false | 0 | "")[]): T[] {
  return array.filter(Boolean) as T[]
}

/**
 * Rimuove duplicati da un array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

/**
 * Rimuove duplicati da un array di oggetti per una proprietà
 */
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
  const seen = new Set()
  return array.filter(item => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}

/**
 * Chunks un array in gruppi di dimensione specificata
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Verifica se un valore è un oggetto semplice
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object
}

/**
 * Merge profondo di oggetti
 */
export function deepMerge<T extends Record<string, any>>(
  target: T, 
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target
  const source = sources.shift()

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key] as any, source[key] as any)
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return deepMerge(target, ...sources)
}

/**
 * Ottiene un valore annidato da un oggetto usando dot notation
 */
export function get(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    result = result?.[key]
    if (result === undefined) return defaultValue
  }
  
  return result
}

/**
 * Imposta un valore annidato in un oggetto usando dot notation
 */
export function set(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  
  let current = obj
  for (const key of keys) {
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[lastKey] = value
}

/**
 * Crea una funzione di pick per selezionare proprietà da un oggetto
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Crea una funzione di omit per escludere proprietà da un oggetto
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * Verifica se due valori sono uguali (deep comparison)
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b
  }
  
  if (a === null || a === undefined || b === null || b === undefined) {
    return false
  }
  
  if (a.prototype !== b.prototype) return false
  
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  
  return keys.every(k => isEqual(a[k], b[k]))
}

/**
 * Utility per gestire sleep/delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function con backoff esponenziale
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry
  } = options

  let attempt = 1
  
  while (attempt <= maxAttempts) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      
      if (onRetry) {
        onRetry(attempt, error as Error)
      }
      
      await sleep(delay * Math.pow(backoff, attempt - 1))
      attempt++
    }
  }
  
  throw new Error('Max attempts reached')
}
