import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
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
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  MoreHorizontal,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Mail,
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
} from '@/components/ui';

// Hooks
import { 
  useInvoices, 
  useUpdateInvoicePaymentStatus, 
  useDeleteInvoice, 
  useBulkInvoiceOperations,
  useSearchInvoices,
  useOverdueInvoices 
} from '@/hooks/useInvoices';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatPaymentStatus, 
  formatDueDate,
  formatRelativeTime 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice, InvoiceFilters, PaymentStatus } from '@/types';

interface InvoiceListProps {
  showActions?: boolean;
  showFilters?: boolean;
  maxItems?: number;
  embedded?: boolean;
  onInvoiceSelect?: (invoice: Invoice) => void;
}

interface SortConfig {
  key: keyof Invoice | 'counterparty_name' | 'open_amount';
  direction: 'asc' | 'desc';
}

export function InvoiceList({ 
  showActions = true, 
  showFilters = true, 
  maxItems,
  embedded = false,
  onInvoiceSelect 
}: InvoiceListProps) {
  // State
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    size: maxItems || 50,
  });
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'doc_date',
    direction: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: invoicesData, isLoading, error, refetch } = useInvoices(filters);
  const updatePaymentStatus = useUpdateInvoicePaymentStatus();
  const deleteInvoice = useDeleteInvoice();
  const { bulkUpdateStatus, bulkDelete } = useBulkInvoiceOperations();
  const searchInvoices = useSearchInvoices();

  // Computed values
  const invoices = invoicesData?.items || [];
  const totalCount = invoicesData?.total || 0;
  const totalPages = Math.ceil(totalCount / (filters.size || 50));

  // Sorted invoices
  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Invoice];
      let bValue: any = b[sortConfig.key as keyof Invoice];

      // Handle special cases
      if (sortConfig.key === 'counterparty_name') {
        aValue = a.counterparty_name || '';
        bValue = b.counterparty_name || '';
      } else if (sortConfig.key === 'open_amount') {
        aValue = a.open_amount || 0;
        bValue = b.open_amount || 0;
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
  }, [invoices, sortConfig]);

  // Handlers
  const handleSort = useCallback((key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<InvoiceFilters>) => {
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
      const response = await searchInvoices.mutateAsync({ query });
      if (response.success) {
        // Update filters to show search results
        handleFilterChange({ search: query });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [searchInvoices, handleFilterChange]);

  const handleSelectInvoice = useCallback((invoiceId: number, checked: boolean) => {
    setSelectedInvoices(prev => {
      if (checked) {
        return [...prev, invoiceId];
      } else {
        return prev.filter(id => id !== invoiceId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
    } else {
      setSelectedInvoices([]);
    }
  }, [invoices]);

  const handleUpdatePaymentStatus = useCallback(async (
    invoiceId: number, 
    status: PaymentStatus, 
    amount?: number
  ) => {
    try {
      await updatePaymentStatus.mutateAsync({
        id: invoiceId,
        payment_status: status,
        paid_amount: amount,
      });
      refetch();
    } catch (error) {
      console.error('Payment status update error:', error);
    }
  }, [updatePaymentStatus, refetch]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedInvoices.length === 0) return;

    try {
      switch (action) {
        case 'mark-paid':
          await bulkUpdateStatus.mutateAsync({
            invoiceIds: selectedInvoices,
            payment_status: 'Pagata Tot.',
          });
          break;
        case 'mark-overdue':
          await bulkUpdateStatus.mutateAsync({
            invoiceIds: selectedInvoices,
            payment_status: 'Scaduta',
          });
          break;
        case 'delete':
          if (confirm(`Eliminare ${selectedInvoices.length} fatture selezionate?`)) {
            await bulkDelete.mutateAsync(selectedInvoices);
          }
          break;
        default:
          break;
      }
      setSelectedInvoices([]);
      setShowBulkActions(false);
      refetch();
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  }, [selectedInvoices, bulkUpdateStatus, bulkDelete, refetch]);

  const handleDeleteInvoice = useCallback(async (invoiceId: number) => {
    if (confirm('Eliminare questa fattura?')) {
      try {
        await deleteInvoice.mutateAsync(invoiceId);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  }, [deleteInvoice, refetch]);

  // Render sort icon
  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento fatture
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
      {/* Header with search and actions */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              Gestione Fatture
            </h2>
            <p className="text-gray-600 mt-1">
              {totalCount} fatture totali
            </p>
          </div>

          {showActions && (
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importa
              </Button>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Fattura
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cerca fatture..."
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

              {/* Type Filter */}
              <Select
                value={filters.type_filter || 'all'}
                onValueChange={(value) => 
                  handleFilterChange({ 
                    type_filter: value === 'all' ? undefined : value as 'Attiva' | 'Passiva' 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="Attiva">Fatture Attive</SelectItem>
                  <SelectItem value="Passiva">Fatture Passive</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={filters.status_filter || 'all'}
                onValueChange={(value) => 
                  handleFilterChange({ 
                    status_filter: value === 'all' ? undefined : value 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="Aperta">Aperte</SelectItem>
                  <SelectItem value="Pagata Tot.">Pagate</SelectItem>
                  <SelectItem value="Scaduta">Scadute</SelectItem>
                  <SelectItem value="Pagata Parz.">Parzialmente Pagate</SelectItem>
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
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedInvoices.length > 0 && (
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
                      {selectedInvoices.length} fatture selezionate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('mark-paid')}
                      disabled={bulkUpdateStatus.isPending}
                    >
                      Segna come Pagate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('mark-overdue')}
                      disabled={bulkUpdateStatus.isPending}
                    >
                      Segna come Scadute
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                      disabled={bulkDelete.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInvoices([])}
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
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('doc_number')}
                  >
                    <div className="flex items-center gap-2">
                      Numero
                      {renderSortIcon('doc_number')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('doc_date')}
                  >
                    <div className="flex items-center gap-2">
                      Data
                      {renderSortIcon('doc_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('counterparty_name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente/Fornitore
                      {renderSortIcon('counterparty_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Importo
                      {renderSortIcon('total_amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('open_amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Residuo
                      {renderSortIcon('open_amount')}
                    </div>
                  </TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Scadenza</TableHead>
                  {showActions && <TableHead className="w-12">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      {showActions && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                    </TableRow>
                  ))
                ) : sortedInvoices.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={showActions ? 9 : 8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Nessuna fattura trovata
                          </p>
                          <p className="text-gray-600">
                            {searchQuery || Object.keys(filters).length > 2 
                              ? 'Prova a modificare i filtri di ricerca'
                              : 'Inizia creando la tua prima fattura'
                            }
                          </p>
                        </div>
                        {!searchQuery && Object.keys(filters).length <= 2 && (
                          <Button className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Crea Prima Fattura
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  sortedInvoices.map((invoice, index) => {
                    const paymentStatusData = formatPaymentStatus(invoice.payment_status);
                    const dueDateData = formatDueDate(invoice.due_date, invoice.payment_status === 'Pagata Tot.');
                    
                    return (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (onInvoiceSelect) {
                            onInvoiceSelect(invoice);
                          } else {
                            setSelectedInvoiceDetail(invoice);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={(checked) => 
                              handleSelectInvoice(invoice.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              invoice.type === 'Attiva' ? "bg-green-500" : "bg-blue-500"
                            )} />
                            {invoice.doc_number}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(invoice.doc_date)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={invoice.counterparty_name}>
                            {invoice.counterparty_name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            (invoice.open_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
                          )}>
                            {formatCurrency(invoice.open_amount || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={paymentStatusData.variant}>
                            {paymentStatusData.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={dueDateData.variant}>
                            {dueDateData.text}
                          </Badge>
                        </TableCell>
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
                                <DropdownMenuItem onClick={() => setSelectedInvoiceDetail(invoice)}>
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
                                  <Printer className="h-4 w-4 mr-2" />
                                  Stampa
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Invia Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {invoice.payment_status !== 'Pagata Tot.' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdatePaymentStatus(invoice.id, 'Pagata Tot.', invoice.total_amount)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Segna come Pagata
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
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
            Mostrando {((filters.page || 1) - 1) * (filters.size || 50) + 1} - {Math.min((filters.page || 1) * (filters.size || 50), totalCount)} di {totalCount} fatture
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

      {/* Invoice Detail Modal */}
      <Dialog 
        open={!!selectedInvoiceDetail} 
        onOpenChange={() => setSelectedInvoiceDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dettagli Fattura {selectedInvoiceDetail?.doc_number}
            </DialogTitle>
            <DialogDescription>
              Informazioni complete della fattura
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoiceDetail && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="font-medium">{selectedInvoiceDetail.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Numero</label>
                  <p className="font-medium">{selectedInvoiceDetail.doc_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data</label>
                  <p>{formatDate(selectedInvoiceDetail.doc_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Scadenza</label>
                  <p>{selectedInvoiceDetail.due_date ? formatDate(selectedInvoiceDetail.due_date) : 'Non specificata'}</p>
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Informazioni Finanziarie</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Importo Totale</label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedInvoiceDetail.total_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Importo Pagato</label>
                    <p className="text-lg font-bold">
                      {formatCurrency(selectedInvoiceDetail.paid_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Residuo</label>
                    <p className={cn(
                      "text-lg font-bold",
                      (selectedInvoiceDetail.open_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
                    )}>
                      {formatCurrency(selectedInvoiceDetail.open_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stato Pagamento</label>
                    <div className="mt-1">
                      <Badge variant={formatPaymentStatus(selectedInvoiceDetail.payment_status).variant}>
                        {formatPaymentStatus(selectedInvoiceDetail.payment_status).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Counterparty Info */}
              <div>
                <h4 className="font-medium mb-3">Cliente/Fornitore</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium text-blue-900">
                    {selectedInvoiceDetail.counterparty_name || 'Nome non disponibile'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    ID Anagrafica: {selectedInvoiceDetail.anagraphics_id}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 gap-4">
                {selectedInvoiceDetail.payment_method && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Metodo di Pagamento</label>
                    <p>{selectedInvoiceDetail.payment_method}</p>
                  </div>
                )}
                {selectedInvoiceDetail.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Note</label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">
                      {selectedInvoiceDetail.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Invoice Lines */}
              {selectedInvoiceDetail.lines && selectedInvoiceDetail.lines.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Righe Fattura</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrizione</TableHead>
                          <TableHead className="text-right">Quantità</TableHead>
                          <TableHead className="text-right">Prezzo Unit.</TableHead>
                          <TableHead className="text-right">Totale</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoiceDetail.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{line.description}</p>
                                {line.item_code && (
                                  <p className="text-xs text-gray-500">Codice: {line.item_code}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {line.quantity} {line.unit_measure}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(line.unit_price || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(line.total_price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.vat_rate}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* VAT Summary */}
              {selectedInvoiceDetail.vat_summary && selectedInvoiceDetail.vat_summary.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Riepilogo IVA</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aliquota IVA</TableHead>
                          <TableHead className="text-right">Imponibile</TableHead>
                          <TableHead className="text-right">Imposta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoiceDetail.vat_summary.map((vat) => (
                          <TableRow key={vat.id}>
                            <TableCell>{vat.vat_rate}%</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(vat.taxable_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(vat.vat_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* System Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Informazioni Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600">Creata il</label>
                    <p>{formatDate(selectedInvoiceDetail.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Aggiornata il</label>
                    <p>{formatDate(selectedInvoiceDetail.updated_at)}</p>
                  </div>
                  {selectedInvoiceDetail.xml_filename && (
                    <div>
                      <label className="text-gray-600">File XML</label>
                      <p className="font-mono text-xs">{selectedInvoiceDetail.xml_filename}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-gray-600">Hash Univoco</label>
                    <p className="font-mono text-xs">{selectedInvoiceDetail.unique_hash.slice(0, 16)}...</p>
                  </div>
                </div>
              </div>

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
                    <Printer className="h-4 w-4 mr-2" />
                    Stampa
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedInvoiceDetail.payment_status !== 'Pagata Tot.' && (
                    <Button
                      onClick={() => {
                        handleUpdatePaymentStatus(
                          selectedInvoiceDetail.id, 
                          'Pagata Tot.', 
                          selectedInvoiceDetail.total_amount
                        );
                        setSelectedInvoiceDetail(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Segna come Pagata
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedInvoiceDetail(null)}
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
