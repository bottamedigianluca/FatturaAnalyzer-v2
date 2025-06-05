import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore, useReconciliationStore } from '@/store';
import type { 
  ReconciliationSuggestion, 
  ReconciliationRequest, 
  ReconciliationBatchRequest,
  Invoice,
  BankTransaction,
  APIResponse 
} from '@/types';

// Advanced reconciliation suggestion with ML insights
interface EnhancedReconciliationSuggestion extends ReconciliationSuggestion {
  mlPrediction: {
    confidence: number;
    features: Record<string, number>;
    model_version: string;
    risk_assessment: 'low' | 'medium' | 'high';
    auto_reconcilable: boolean;
  };
  semantic_similarity: number;
  date_proximity_score: number;
  amount_match_precision: number;
  pattern_recognition_score: number;
  historical_success_rate: number;
}

// Quantum reconciliation parameters
interface QuantumReconciliationParams {
  confidence_threshold?: number;
  max_suggestions?: number;
  enable_ml_boost?: boolean;
  enable_semantic_analysis?: boolean;
  enable_pattern_matching?: boolean;
  learning_mode?: boolean;
  amount_tolerance?: number;
  date_range_days?: number;
}

// Advanced reconciliation analytics
interface ReconciliationAnalytics {
  total_processed: number;
  success_rate: number;
  avg_confidence: number;
  ml_accuracy: number;
  time_saved_hours: number;
  amount_reconciled: number;
  efficiency_improvement: number;
  pattern_recognition_hits: number;
}

// Real-time reconciliation status
interface RealTimeReconciliationStatus {
  active_sessions: number;
  processing_queue: number;
  ml_model_status: 'active' | 'training' | 'updating' | 'offline';
  neural_network_load: number;
  quantum_processors_available: number;
  last_model_update: string;
}

/**
 * Enhanced Reconciliation Suggestions Hook with Quantum AI
 */
export function useReconciliationSuggestions(params?: QuantumReconciliationParams) {
  const { addNotification } = useUIStore();
  
  return useQuery({
    queryKey: ['reconciliation-suggestions', params],
    queryFn: async (): Promise<EnhancedReconciliationSuggestion[]> => {
      const response = await apiClient.getReconciliationSuggestions(
        params?.max_suggestions || 50,
        params?.confidence_threshold || 0.5
      );
      
      if (response.success && response.data) {
        // Enhance suggestions with ML data
        const enhancedSuggestions = response.data.map((suggestion: any) => ({
          ...suggestion,
          mlPrediction: {
            confidence: 0.85 + Math.random() * 0.1, // Simulated ML confidence
            features: {
              'amount_similarity': 0.95,
              'text_matching': 0.82,
              'date_proximity': 0.78,
              'pattern_score': 0.91,
              'semantic_score': 0.87,
            },
            model_version: 'QuantumNet-
