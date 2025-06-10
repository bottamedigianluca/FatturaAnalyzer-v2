/**
 * TypeScript Type Definitions V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Tipi aggiornati per supportare:
 * - Analytics V3.0 Ultra-Optimized con AI/ML
 * - Reconciliation V4.0 Smart Features
 * - Enhanced Transactions V4.0
 * - AI insights e confidence scoring
 * - Real-time features e performance monitoring
 */

// ===== BASE TYPES V4.0 =====
export type AnagraphicsType = "Cliente" | "Fornitore" | "Cliente/Fornitore" | "Professionista" | "Ente Pubblico" | "Banca";
export type InvoiceType = "Attiva" | "Passiva" | "Nota Credito Attiva" | "Nota Credito Passiva" | "Autofattura" | "Reverse Charge";
export type PaymentStatus = "Aperta" | "Scaduta" | "Pagata Parz." | "Pagata Tot." | "Insoluta" | "Riconciliata" | "In Contestazione" | "Rateizzata" | "Stornata";
export type ReconciliationStatus = "Da Riconciliare" | "Riconciliato Parz." | "Riconciliato Tot." | "Riconciliato Eccesso" | "Ignorato" | "AI Suggerito" | "Auto Riconciliato" | "In Revisione";

// ===== V4.0 NEW TYPES =====
export type ConfidenceLevel = "very_high" | "high" | "medium" | "low" | "very_low";
export type AIAnalysisDepth = "quick" | "standard" | "deep" | "comprehensive";
export type ReconciliationMode = "1_to_1" | "n_to_m" | "smart_client" | "auto" | "ultra_smart";
export type SystemStatus = "healthy" | "warning" | "error" | "maintenance" | "degraded";
export type FeatureStatus = "enabled" | "disabled" | "limited" | "unavailable";

// ===== API RESPONSE WRAPPERS V4.0 =====
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  version?: string;
  performance?: {
    execution_time_ms: number;
    cache_hit: boolean;
    ai_enhanced: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  error_code?: string;
  suggestions?: string[];
  retry_after?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  enhanced_data?: {
    ai_insights?: any;
    patterns?: any;
    suggestions?: any;
  };
}

// ===== AI & CONFIDENCE TYPES V4.0 =====
export interface AIInsight {
  id: string;
  type: "pattern" | "anomaly" | "prediction" | "recommendation";
  confidence: number;
  description: string;
  data: any;
  created_at: string;
  expires_at?: string;
}

export interface ConfidenceScore {
  value: number; // 0-1
  level: ConfidenceLevel;
  factors: {
    name: string;
    weight: number;
    contribution: number;
  }[];
  reliability: number;
  last_updated: string;
}

export interface AIValidationResult {
  is_valid: boolean;
  confidence: ConfidenceScore;
  warnings: string[];
  suggestions: string[];
  patterns_detected: string[];
  risk_score: number; // 0-1
}

// ===== ENHANCED ANAGRAPHICS V4.0 =====
export interface AnagraphicsBase {
  type: AnagraphicsType;
  piva?: string;
  cf?: string;
  denomination: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  country: string;
  iban?: string;
  email?: string;
  phone?: string;
  pec?: string;
  codice_destinatario?: string;
  
  // V4.0 Enhanced fields
  website?: string;
  linkedin?: string;
  notes?: string;
  tags?: string[];
  preferred_language?: string;
  payment_terms_days?: number;
  credit_limit?: number;
  discount_percentage?: number;
}

export interface Anagraphics extends AnagraphicsBase {
  id: number;
  score: number;
  created_at: string;
  updated_at: string;
  
  // V4.0 AI Enhanced fields
  ai_insights?: {
    reliability_score: ConfidenceScore;
    payment_behavior: {
      average_days_to_pay: number;
      punctuality_score: number;
      risk_level: "low" | "medium" | "high";
    };
    business_insights: {
      category: string;
      size_estimate: "micro" | "small" |
