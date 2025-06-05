import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  MoreHorizontal,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GitMerge,
  Zap,
  Target,
  Link,
  Unlink,
  FileText,
  Building2,
  Banknote,
  Smartphone,
  Fuel,
  Receipt,
  Scissors,
  Copy,
  ExternalLink,
} from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Skeleton,
  Switch,
} from '@/components/ui';

// Hooks
import { 
  useTransactions, 
  useUpdateTransactionStatus, 
  useDeleteTransaction, 
  useBatchUpdateTransactionStatus,
  useSearchTransactions,
  useTransactionPotentialMatches,
  useTransactionReconciliationLinks,
  useImportTransactionsCSV,
  useExportTransactions,
  useDownloadTransactionTemplate
} from '@/hooks/useTransactions';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatReconciliationStatus,
  formatRelativeTime 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { BankTransaction, TransactionFilters, ReconciliationStatus } from '@/types';

interface TransactionListProps {
  showActions?: boolean;
  showFilters?: boolean;
  maxItems?: number;
  embedded?: boolean;
  onTransactionSelect?: (transaction: BankTransaction) => void;
  reconciliationMode?: boolean;
}

interface SortConfig {
  key: keyof BankTransaction | 'remaining_amount';
  direction: 'asc' | 'desc';
}

interface TransactionTypeFilter {
  all: boolean;
  income: boolean;
  expense: boolean;
  pos: boolean;
  worldline: boolean;
  cash: boolean;
  commissions: boolean;
}

export function TransactionList({ 
  showActions = true, 
  showFilters = true, 
  maxItems,
  embedded = false,
  onTransactionSelect,
  reconciliationMode = false
}: TransactionListProps) {
  // State
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    size: maxItems || 50,
  });
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'transaction_date',
    direction: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<BankTransaction | null>(null);
  const [typeFilters, setTypeFilters] = useState<TransactionTypeFilter>({
    all: true,
    income: true,
    expense: true,
    pos: true,
    worldline: true,
    cash: true,
    commissions: true,
  });
  const [showReconciled, setShowReconciled] = useState(true);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: transactionsData, isLoading, error, refetch } = useTransactions(filters);
  const updateTransactionStatus = useUpdateTransactionStatus();
  const deleteTransaction = useDeleteTransaction();
  const batchUpdateStatus = useBatchUpdateTransactionStatus();
  const searchTransactions = useSearchTransactions();
  const importCSV = useImportTransactionsCSV();
  const exportTransactions = useExportTransactions();
  const downloadTemplate = useDownloadTransactionTemplate();

  // Computed values
  const transactions = transactionsData?.items || [];
  const totalCount = transactionsData?.total || 0;
  const totalPages = Math.ceil(totalCount / (filters.size || 50));

  // Filter transactions by type
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Type filtering
      if (!typeFilters.all) {
        const isIncome = transaction.amount > 0;
        const isExpense = transaction.amount < 0;
        const isPOS = transaction.description?.toLowerCase().includes('pos') || false;
        const isWorldline = transaction.description?.toLowerCase().includes('worldline') || false;
        const isCash = transaction.description?.toLowerCase().includes('contant') || false;
        const isCommission = transaction.description?.toLowerCase().includes('commission') || false;

        if (isIncome && !typeFilters.income) return false;
        if (isExpense && !typeFilters.expense) return false;
        if (isPOS && !typeFilters.pos) return false;
        if (isWorldline && !typeFilters.worldline) return false;
        if (isCash && !typeFilters.cash) return false;
        if (isCommission && !typeFilters.commissions) return false;
      }

      // Reconciliation status filtering
      if (!showReconciled && transaction.reconciliation_status !== 'Da Riconciliare') {
        return false;
      }

      return true;
    });
  }, [transactions, typeFilters, showReconciled]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof BankTransaction];
      let bValue: any = b[sortConfig.key as keyof BankTransaction];

      // Handle special cases
      if (sortConfig.key === 'remaining_amount') {
        aValue = a.remaining_amount || 0;
        bValue = b.remaining_amount || 0;
      }

      // Convert to comparable values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTransactions, sortConfig]);

  // Handlers
  const handleSort = useCallback((key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchQuery('');
      handleFilterChange({ search: undefined });
      return;
    }

    setSearchQuery(query);
    try {
      const response = await searchTransactions.mutateAsync({ 
        query, 
        include_reconciled: showReconciled 
      });
      if (response.success) {
        handleFilterChange({ search: query });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [searchTransactions, handleFilterChange, showReconciled]);

  const handleSelectTransaction = useCallback((transactionId: number, checked: boolean) => {
    setSelectedTransactions(prev => {
      if (checked) {
        return [...prev, transactionId];
      } else {
        return prev.filter(id => id !== transactionId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedTransactions(sortedTransactions.map(transaction => transaction.id));
    } else {
      setSelectedTransactions([]);
    }
  }, [sortedTransactions]);

  const handleUpdateReconciliationStatus = useCallback(async (
    transactionId: number, 
    status: ReconciliationStatus, 
    amount?: number
  ) => {
    try {
      await updateTransactionStatus.mutateAsync({
        id: transactionId,
        reconciliation_status: status,
        reconciled_amount: amount,
      });
      refetch();
    } catch (error) {
      console.error('Status update error:', error);
    }
  }, [updateTransactionStatus, refetch]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedTransactions.length === 0) return;

    try {
      switch (action) {
        case 'mark-reconciled':
          await batchUpdateStatus.mutateAsync({
            transaction_ids: selectedTransactions,
            reconciliation_status: 'Riconciliato Tot.',
          });
          break;
        case 'mark-partial':
          await batchUpdateStatus.mutateAsync({
            transaction_ids: selectedTransactions,
            reconciliation_status: 'Riconciliato Parz.',
          });
          break;
        case 'mark-unreconciled':
          await batchUpdateStatus.mutateAsync({
            transaction_ids: selectedTransactions,
            reconciliation_status: 'Da Riconciliare',
          });
          break;
        case 'ignore':
          await batchUpdateStatus.mutateAsync({
            transaction_ids: selectedTransactions,
            reconciliation_status: 'Ignorato',
          });
          break;
        case 'delete':
          if (confirm(`Eliminare ${selectedTransactions.length} transazioni selezionate?`)) {
            for (const id of selectedTransactions) {
              await deleteTransaction.mutateAsync(id);
            }
          }
          break;
        default:
          break;
      }
      setSelectedTransactions([]);
      refetch();
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [selectedTransactions, batchUpdateStatus, deleteTransaction, refetch]);

  const handleDeleteTransaction = useCallback(async (transactionId: number) => {
    if (confirm('Eliminare questa transazione?')) {
      try {
        await deleteTransaction.mutateAsync(transactionId);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  }, [deleteTransaction, refetch]);

  const handleImportCSV = useCallback(async (file: File) => {
    try {
      await importCSV.mutateAsync(file);
      refetch();
    } catch (error) {
      console.error('Import error:', error);
    }
  }, [importCSV, refetch]);

  const handleExport = useCallback(async (format: 'excel' | 'csv' | 'json') => {
    try {
      await exportTransactions.mutateAsync({ format, filters });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportTransactions, filters]);

  // Get transaction type icon
  const getTransactionIcon = (transaction: BankTransaction) => {
    const desc = transaction.description?.toLowerCase() || '';
    
    if (desc.includes('pos')) return Smartphone;
    if (desc.includes('worldline')) return CreditCard;
    if (desc.includes('contant')) return Banknote;
    if (desc.includes('carburant') || desc.includes('benzin')) return Fuel;
    if (desc.includes('commission')) return Receipt;
    if (desc.includes('bonifico')) return Building2;
    
    return transaction.amount > 0 ? ArrowUpRight : ArrowDownRight;
  };

  // Get transaction category
  const getTransactionCategory = (transaction: BankTransaction) => {
    const desc = transaction.description?.toLowerCase() || '';
    
    if (desc.includes('pos')) return 'POS';
    if (desc.includes('worldline')) return 'Worldline';
    if (desc.includes('contant')) return 'Contanti';
    if (desc.includes('carburant')) return 'Carburante';
    if (desc.includes('commission')) return 'Commissione';
    if (desc.includes('bonifico')) return 'Bonifico';
    
    return transaction.amount > 0 ? 'Entrata' : 'Uscita';
  };

  // Render sort icon
  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const income = sortedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = sortedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const unreconciled = sortedTransactions.filter(t => t.reconciliation_status === 'Da Riconciliare').length;
    const reconciled = sortedTransactions.filter(t => t.reconciliation_status === 'Riconciliato Tot.').length;
    
    return { income, expense, unreconciled, reconciled, netFlow: income - expense };
  }, [sortedTransactions]);

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento transazioni
              </h3>
              <p className="text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="border-red-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-green-600" />
              Movimenti Bancari
            </h2>
            <div className="flex items-center gap-6 mt-2 text-sm">
              <span className="text-gray-600">
                {totalCount} movimenti totali
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                Entrate: {formatCurrency(summaryStats.income)}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                Uscite: {formatCurrency(summaryStats.expense)}
              </span>
              <span className={cn(
                "flex items-center gap-1 font-medium",
                summaryStats.netFlow >= 0 ? "text-green-600" : "text-red-600"
              )}>
                <Target className="h-4 w-4" />
                Netto: {formatCurrency(summaryStats.netFlow)}
              </span>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Esporta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <Receipt className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <Copy className="h-4 w-4 mr-2" />
                    JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" onClick={() => downloadTemplate.mutate()}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>

              <label htmlFor="csv-upload">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Importa CSV
                  </span>
                </Button>
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCSV(file);
                }}
              />

              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Movimento
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Entrate</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(summaryStats.income)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Uscite</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(summaryStats.expense)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Da Riconciliare</p>
                <p className="text-xl font-bold text-orange-700">
                  {summaryStats.unreconciled}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Riconciliate</p>
                <p className="text-xl font-bold text-blue-700">
                  {summaryStats.reconciled}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search and basic filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Cerca movimenti..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery);
                      }
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <Select
                  value={filters.status_filter || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange({ 
                      status_filter: value === 'all' ? undefined : value as ReconciliationStatus
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stato Riconciliazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="Da Riconciliare">Da Riconciliare</SelectItem>
                    <SelectItem value="Riconciliato Tot.">Riconciliate</SelectItem>
                    <SelectItem value="Riconciliato Parz.">Parzialmente Riconciliate</SelectItem>
                    <SelectItem value="Ignorato">Ignorate</SelectItem>
                  </SelectContent>
                </Select>

                {/* Amount Range */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min €"
                    value={filters.min_amount || ''}
                    onChange={(e) => 
                      handleFilterChange({ 
                        min_amount: e.target.value ? Number(e.target.value) : undefined 
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max €"
                    value={filters.max_amount || ''}
                    onChange={(e) => 
                      handleFilterChange({ 
                        max_amount: e.target.value ? Number(e.target.value) : undefined 
                      })
                    }
                  />
                </div>

                {/* Date Range */}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={(e) => 
                      handleFilterChange({ start_date: e.target.value || undefined })
                    }
                  />
                  <Input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={(e) => 
                      handleFilterChange({ end_date: e.target.value || undefined })
                    }
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({ page: 1, size: maxItems || 50 });
                      setSearchQuery('');
                      setTypeFilters({
                        all: true,
                        income: true,
                        expense: true,
                        pos: true,
                        worldline: true,
                        cash: true,
                        commissions: true,
                      });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Advanced filters */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Filtri Avanzati</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-reconciled"
                        checked={showReconciled}
                        onCheckedChange={setShowReconciled}
                      />
                      <label htmlFor="show-reconciled" className="text-sm">
                        Mostra riconciliate
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={typeFilters.all ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, all: !prev.all }))}
                  >
                    Tutti i tipi
                  </Button>
                  <Button
                    variant={typeFilters.income ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, income: !prev.income }))}
                    className="text-green-600 border-green-300"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Entrate
                  </Button>
                  <Button
                    variant={typeFilters.expense ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, expense: !prev.expense }))}
                    className="text-red-600 border-red-300"
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Uscite
                  </Button>
                  <Button
                    variant={typeFilters.pos ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, pos: !prev.pos }))}
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    POS
                  </Button>
                  <Button
                    variant={typeFilters.cash ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, cash: !prev.cash }))}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Contanti
                  </Button>
                  <Button
                    variant={typeFilters.commissions ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilters(prev => ({ ...prev, commissions: !prev.commissions }))}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Commissioni
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedTransactions.length} movimenti selezionati
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('mark-reconciled')}
                      disabled={batchUpdateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Riconcilia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('mark-partial')}
                      disabled={batchUpdateStatus.isPending}
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Parziale
                    </Button>
                                          <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('ignore')}
                      disabled={batchUpdateStatus.isPending}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ignora
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                      disabled={batchUpdateStatus.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransactions([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTransactions.length === sortedTransactions.length && sortedTransactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">Tipo</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('transaction_date')}
                  >
                    <div className="flex items-center gap-2">
                      Data
                      {renderSortIcon('transaction_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-2">
                      Descrizione
                      {renderSortIcon('description')}
                    </div>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Importo
                      {renderSortIcon('amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('reconciled_amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Riconciliato
                      {renderSortIcon('reconciled_amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('remaining_amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Residuo
                      {renderSortIcon('remaining_amount')}
                    </div>
                  </TableHead>
                  <TableHead>Stato</TableHead>
                  {reconciliationMode && <TableHead>Azioni Riconciliazione</TableHead>}
                  {showActions && <TableHead className="w-12">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      {reconciliationMode && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                      {showActions && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                    </TableRow>
                  ))
                ) : sortedTransactions.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={reconciliationMode && showActions ? 11 : showActions ? 10 : reconciliationMode ? 10 : 9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <CreditCard className="h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Nessun movimento trovato
                          </p>
                          <p className="text-gray-600">
                            {searchQuery || Object.keys(filters).length > 2 
                              ? 'Prova a modificare i filtri di ricerca'
                              : 'Inizia importando i tuoi movimenti bancari'
                            }
                          </p>
                        </div>
                        {!searchQuery && Object.keys(filters).length <= 2 && (
                          <Button className="mt-2">
                            <Upload className="h-4 w-4 mr-2" />
                            Importa Movimenti
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  sortedTransactions.map((transaction, index) => {
                    const reconciliationStatusData = formatReconciliationStatus(transaction.reconciliation_status);
                    const Icon = getTransactionIcon(transaction);
                    const category = getTransactionCategory(transaction);
                    const isIncome = transaction.amount > 0;
                    
                    return (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (onTransactionSelect) {
                            onTransactionSelect(transaction);
                          } else {
                            setSelectedTransactionDetail(transaction);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTransactions.includes(transaction.id)}
                            onCheckedChange={(checked) => 
                              handleSelectTransaction(transaction.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                  <Icon className="h-4 w-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{category}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
                            {transaction.value_date && transaction.value_date !== transaction.transaction_date && (
                              <p className="text-xs text-gray-500">
                                Valuta: {formatDate(transaction.value_date)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate" title={transaction.description}>
                              {transaction.description || 'N/A'}
                            </p>
                            {transaction.causale_abi && (
                              <p className="text-xs text-gray-500">
                                Causale ABI: {transaction.causale_abi}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isIncome ? (
                              <ArrowUpRight className="h-3 w-3 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-red-500" />
                            )}
                            <span className={cn(
                              "font-medium",
                              isIncome ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-blue-600">
                            {formatCurrency(transaction.reconciled_amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            (transaction.remaining_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
                          )}>
                            {formatCurrency(transaction.remaining_amount || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={reconciliationStatusData.variant}>
                            {reconciliationStatusData.label}
                          </Badge>
                        </TableCell>
                        {reconciliationMode && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {transaction.reconciliation_status === 'Da Riconciliare' && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleUpdateReconciliationStatus(
                                            transaction.id, 
                                            'Riconciliato Tot.', 
                                            Math.abs(transaction.amount)
                                          )}
                                        >
                                          <GitMerge className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Riconcilia automaticamente</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleUpdateReconciliationStatus(
                                            transaction.id, 
                                            'Ignorato'
                                          )}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Ignora movimento</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                              {transaction.reconciliation_status !== 'Da Riconciliare' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUpdateReconciliationStatus(
                                          transaction.id, 
                                          'Da Riconciliare'
                                        )}
                                      >
                                        <Unlink className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Annulla riconciliazione</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {showActions && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedTransactionDetail(transaction)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizza
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplica
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Link className="h-4 w-4 mr-2" />
                                  Potenziali Corrispondenze
                                </DropdownMenuItem>
                                {transaction.reconciliation_status === 'Da Riconciliare' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateReconciliationStatus(
                                        transaction.id, 
                                        'Riconciliato Tot.', 
                                        Math.abs(transaction.amount)
                                      )}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Riconcilia
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateReconciliationStatus(
                                        transaction.id, 
                                        'Ignorato'
                                      )}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ignora
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!embedded && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((filters.page || 1) - 1) * (filters.size || 50) + 1} - {Math.min((filters.page || 1) * (filters.size || 50), totalCount)} di {totalCount} movimenti
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: (filters.page || 1) - 1 })}
              disabled={!filters.page || filters.page <= 1}
            >
              Precedente
            </Button>
            <span className="text-sm">
              Pagina {filters.page || 1} di {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: (filters.page || 1) + 1 })}
              disabled={!filters.page || filters.page >= totalPages}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <Dialog 
        open={!!selectedTransactionDetail} 
        onOpenChange={() => setSelectedTransactionDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Dettagli Movimento Bancario
            </DialogTitle>
            <DialogDescription>
              Informazioni complete del movimento
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransactionDetail && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Data Transazione</label>
                  <p className="font-medium">{formatDate(selectedTransactionDetail.transaction_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data Valuta</label>
                  <p>{selectedTransactionDetail.value_date ? formatDate(selectedTransactionDetail.value_date) : 'Non specificata'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Categoria</label>
                  <p>{getTransactionCategory(selectedTransactionDetail)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Causale ABI</label>
                  <p>{selectedTransactionDetail.causale_abi || 'N/A'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-600">Descrizione</label>
                <p className="bg-gray-50 p-3 rounded-lg font-medium">
                  {selectedTransactionDetail.description || 'Nessuna descrizione'}
                </p>
              </div>

              {/* Financial Info */}
              <div className={cn(
                "rounded-lg p-4",
                selectedTransactionDetail.amount > 0 ? "bg-green-50" : "bg-red-50"
              )}>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  {selectedTransactionDetail.amount > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  Informazioni Finanziarie
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Importo</label>
                    <p className={cn(
                      "text-xl font-bold",
                      selectedTransactionDetail.amount > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {selectedTransactionDetail.amount > 0 ? '+' : ''}
                      {formatCurrency(selectedTransactionDetail.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Importo Riconciliato</label>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(selectedTransactionDetail.reconciled_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Residuo</label>
                    <p className={cn(
                      "text-lg font-bold",
                      (selectedTransactionDetail.remaining_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
                    )}>
                      {formatCurrency(selectedTransactionDetail.remaining_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stato Riconciliazione</label>
                    <div className="mt-1">
                      <Badge variant={formatReconciliationStatus(selectedTransactionDetail.reconciliation_status).variant}>
                        {formatReconciliationStatus(selectedTransactionDetail.reconciliation_status).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Informazioni Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600">Creata il</label>
                    <p>{formatDate(selectedTransactionDetail.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Aggiornata il</label>
                    <p>{selectedTransactionDetail.updated_at ? formatDate(selectedTransactionDetail.updated_at) : 'Mai'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-600">Hash Univoco</label>
                    <p className="font-mono text-xs break-all">
                      {selectedTransactionDetail.unique_hash}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reconciliation Links */}
              <TransactionReconciliationLinks transactionId={selectedTransactionDetail.id} />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplica
                  </Button>
                  <Button variant="outline" size="sm">
                    <Link className="h-4 w-4 mr-2" />
                    Trova Corrispondenze
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTransactionDetail.reconciliation_status === 'Da Riconciliare' && (
                    <Button
                      onClick={() => {
                        handleUpdateReconciliationStatus(
                          selectedTransactionDetail.id, 
                          'Riconciliato Tot.', 
                          Math.abs(selectedTransactionDetail.amount)
                        );
                        setSelectedTransactionDetail(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Riconcilia
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTransactionDetail(null)}
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component to show reconciliation links
function TransactionReconciliationLinks({ transactionId }: { transactionId: number }) {
  const { data: links, isLoading } = useTransactionReconciliationLinks(transactionId);

  if (isLoading) {
    return (
      <div>
        <h4 className="font-medium mb-3">Riconciliazioni Collegate</h4>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!links?.length) {
    return (
      <div>
        <h4 className="font-medium mb-3">Riconciliazioni Collegate</h4>
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Link className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Nessuna riconciliazione collegata</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-medium mb-3">Riconciliazioni Collegate</h4>
      <div className="space-y-2">
        {links.map((link: any) => (
          <div key={link.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Fattura #{link.invoice_number || link.invoice_id}</p>
                <p className="text-xs text-gray-600">
                  Riconciliato il {formatDate(link.reconciliation_date)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">{formatCurrency(link.reconciled_amount)}</p>
              {link.notes && (
                <p className="text-xs text-gray-600">{link.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
