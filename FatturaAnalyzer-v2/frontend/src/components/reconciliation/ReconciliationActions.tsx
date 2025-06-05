import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitMerge,
  Zap,
  Target,
  RotateCcw,
  Download,
  Upload,
  Settings,
  BarChart3,
  RefreshCw,
  CheckCircle,
  X,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  FileText,
  CreditCard,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Eye,
  Edit,
  Trash2,
  Copy,
  Save,
  Play,
  Pause,
  Square,
  SkipForward,
  Rewind,
  FastForward,
  ArrowRight,
  Plus,
  Minus,
  Equal,
  Hash,
  Percent,
} from 'lucide-react';

// UI Components
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Separator,
  Progress,
  Switch,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

// Hooks
import { 
  usePerformReconciliation,
  useBatchReconciliation,
  useAutoReconciliation,
  useUndoReconciliation,
  useReconciliationAnalytics,
  useReconciliationStatus,
} from '@/hooks/useReconciliation';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ReconciliationActionsProps {
  selectedInvoices?: number[];
  selectedTransactions?: number[];
  reconciliationSuggestions?: any[];
  onRefresh?: () => void;
  showAdvanced?: boolean;
  embedded?: boolean;
}

interface BulkOperationConfig {
  action: 'reconcile' | 'auto-reconcile' | 'undo' | 'validate';
  confirmationRequired: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'success' | 'warning' | 'destructive';
}

interface AutoReconcileSettings {
  confidenceThreshold: number;
  maxAutoReconcile: number;
  enableLearning: boolean;
  enableValidation: boolean;
  amountTolerance: number;
  dateTolerance: number;
}

export function ReconciliationActions({
  selectedInvoices = [],
  selectedTransactions = [],
  reconciliationSuggestions = [],
  onRefresh,
  showAdvanced = false,
  embedded = false
}: ReconciliationActionsProps) {
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAutoDialog, setShowAutoDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [autoSettings, setAutoSettings] = useState<AutoReconcileSettings>({
    confidenceThreshold: 0.8,
    maxAutoReconcile: 20,
    enableLearning: true,
    enableValidation: true,
    amountTolerance: 0.01,
    dateTolerance: 7,
  });

  const { addNotification } = useUIStore();
  
  // Hooks for reconciliation operations
  const performReconciliation = usePerformReconciliation();
  const batchReconciliation = useBatchReconciliation();
  const autoReconciliation = useAutoReconciliation();
  const undoReconciliation = useUndoReconciliation();
  const { data: analytics } = useReconciliationAnalytics();
  const { data: status } = useReconciliationStatus();

  // Calculate available actions based on selections
  const canReconcile = selectedInvoices.length > 0 && selectedTransactions.length > 0;
  const canAutoReconcile = reconciliationSuggestions.filter(s => s.confidence_score > autoSettings.confidenceThreshold).length > 0;
  const hasSelections = selectedInvoices.length > 0 || selectedTransactions.length > 0;

  // Bulk operations configuration
  const bulkOperations: Record<string, BulkOperationConfig> = {
    'batch-reconcile': {
      action: 'reconcile',
      confirmationRequired: true,
      description: `Riconcilia ${selectedInvoices.length} fatture con ${selectedTransactions.length} movimenti`,
      icon: GitMerge,
      variant: 'default',
    },
    'auto-reconcile': {
      action: 'auto-reconcile',
      confirmationRequired: false,
      description: `Riconcilia automaticamente ${reconciliationSuggestions.filter(s => s.confidence_score > autoSettings.confidenceThreshold).length} suggerimenti`,
      icon: Zap,
      variant: 'success',
    },
    'undo-selections': {
      action: 'undo',
      confirmationRequired: true,
      description: `Annulla riconciliazioni per ${hasSelections ? selectedInvoices.length + selectedTransactions.length : 0} elementi`,
      icon: RotateCcw,
      variant: 'warning',
    },
    'validate-matches': {
      action: 'validate',
      confirmationRequired: false,
      description: 'Valida tutti i match selezionati prima della riconciliazione',
      icon: CheckCircle,
      variant: 'default',
    },
  };

  // Handle bulk operations
  const handleBulkOperation = async (operationType: string) => {
    const operation = bulkOperations[operationType];
    if (!operation) return;

    setIsProcessing(true);
    
    try {
      switch (operation.action) {
        case 'reconcile':
          if (canReconcile) {
            // For batch reconciliation, we'll pair invoices with transactions
            const reconciliations = selectedInvoices.slice(0, selectedTransactions.length).map((invoiceId, index) => ({
              invoice_id: invoiceId,
              transaction_id: selectedTransactions[index],
              amount: 0, // This should be calculated based on actual amounts
            }));

            await batchReconciliation.mutateAsync({
              reconciliations,
              parallel_processing: true,
              ml_validation: autoSettings.enableValidation,
            });
          }
          break;

        case 'auto-reconcile':
          await autoReconciliation.mutateAsync({
            confidence_threshold: autoSettings.confidenceThreshold,
            max_auto_reconcile: autoSettings.maxAutoReconcile,
            neural_validation: autoSettings.enableValidation,
          });
          break;

        case 'undo':
          // Undo reconciliations for selected items
          const undoPromises = [
            ...selectedInvoices.map(id => undoReconciliation.undoInvoice.mutateAsync({ 
              invoice_id: id, 
              learn_from_undo: autoSettings.enableLearning 
            })),
