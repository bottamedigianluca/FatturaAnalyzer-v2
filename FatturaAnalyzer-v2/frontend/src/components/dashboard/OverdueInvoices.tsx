import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  Send,
  Eye,
  Edit,
  MoreHorizontal,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle,
  X,
  Zap,
  Target,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
} from '@/components/ui';

// Hooks
import { useOverdueInvoices, useUpdateInvoicePaymentStatus } from '@/hooks/useInvoices';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime, 
  formatPaymentStatus,
  formatDueDate 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice } from '@/types';

interface OverdueInvoicesProps {
  maxItems?: number;
  embedded?: boolean;
  showActions?: boolean;
  onInvoiceSelect?: (invoice: Invoice) => void;
}

interface SortConfig {
  key: keyof Invoice | 'days_overdue' | 'overdue_amount';
  direction: 'asc' | 'desc';
}

interface OverdueStats {
  total_amount: number;
  total_count: number;
  avg_days_overdue: number;
  worst_offender: Invoice | null;
}

export function OverdueInvoices({ 
  maxItems = 50, 
  embedded = false, 
  showActions = true,
  onInvoiceSelect 
}: OverdueInvoicesProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'due_date',
    direction: 'asc',
  });
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [filterDays, setFilterDays] = useState<string>('all');
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: overdueData, isLoading, error, refetch } = useOverdueInvoices(maxItems);
  const updatePaymentStatus = useUpdateInvoicePaymentStatus();

  // Process overdue invoices data
  const overdueInvoices = useMemo(() => {
    if (!overdueData?.data) return [];
    
    return overdueData.data.map((invoice: Invoice) => {
      const dueDate = new Date(invoice.due_date || invoice.doc_date);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...invoice,
        days_overdue: Math.max(0, daysOverdue),
        overdue_amount: invoice.open_amount || invoice.total_amount,
        urgency_level: daysOverdue > 90 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
      };
    });
  }, [overdueData]);

  // Filter by days overdue
  const filteredInvoices = useMemo(() => {
    if (filterDays === 'all') return overdueInvoices;
    
    const daysThreshold = parseInt(filterDays);
    return overdueInvoices.filter(invoice => invoice.days_overdue >= daysThreshold);
  }, [overdueInvoices, filterDays]);

  // Sort invoices
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];

      // Handle special sorting keys
      if (sortConfig.key === 'days_overdue') {
        aValue = a.days_overdue;
        bValue = b.days_overdue;
      } else if (sortConfig.key === 'overdue_amount') {
        aValue = a.overdue_amount;
        bValue = b.overdue_amount;
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
  }, [filteredInvoices, sortConfig]);

  // Calculate statistics
  const stats: OverdueStats = useMemo(() => {
    if (sortedInvoices.length === 0) {
      return {
        total_amount: 0,
        total_count: 0,
        avg_days_overdue: 0,
        worst_offender: null,
      };
    }

    const total_amount = sortedInvoices.reduce((sum, inv) => sum + inv.overdue_amount, 0);
    const total_count = sortedInvoices.length;
    const avg_days_overdue = sortedInvoices.reduce((sum, inv) => sum + inv.days_overdue, 0) / total_count;
    const worst_offender = sortedInvoices.reduce((worst, current) => 
      current.days_overdue > worst.days_overdue ? current : worst
    );

    return {
      total_amount,
      total_count,
      avg_days_overdue,
      worst_offender,
    };
  }, [sortedInvoices]);

  // Handlers
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    setSelectedInvoices(prev => {
      if (checked) {
        return [...prev, invoiceId];
      } else {
        return prev.filter(id => id !== invoiceId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(sortedInvoices.map(invoice => invoice.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleMarkAsPaid = async (invoiceId: number, amount?: number) => {
    try {
      await updatePaymentStatus.mutateAsync({
        id: invoiceId,
        payment_status: 'Pagata Tot.',
        paid_amount: amount,
      });
      refetch();
    } catch (error) {
      console.error('Payment status update error:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedInvoices.length === 0) return;

    try {
      switch (action) {
        case 'mark-paid':
          for (const invoiceId of selectedInvoices) {
            const invoice = sortedInvoices.find(inv => inv.id === invoiceId);
            if (invoice) {
              await updatePaymentStatus.mutateAsync({
                id: invoiceId,
                payment_status: 'Pagata Tot.',
                paid_amount: invoice.total_amount,
              });
            }
          }
          break;
        case 'send-reminders':
          // Simulate sending reminders
          addNotification({
            type: 'info',
            title: 'Solleciti inviati',
            message: `Inviati ${selectedInvoices.length} solleciti di pagamento`,
            duration: 3000,
          });
          break;
      }
      setSelectedInvoices([]);
      setBulkActionDialog(false);
      refetch();
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) {
      return <SortAsc className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(!embedded && "")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Fatture Scadute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento fatture scadute
              </h3>
              <p className="text-red-700">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (sortedInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Fatture Scadute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ottimo lavoro! 🎉
            </h3>
            <p className="text-gray-600">
              Non ci sono fatture scadute al momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Fatture Scadute
            </h2>
            <p className="text-gray-600 mt-1">
              {stats.total_count} fatture per un totale di {formatCurrency(stats.total_amount)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setBulkActionDialog(true)}
              disabled={selectedInvoices.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Azioni Bulk ({selectedInvoices.length})
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Importo Totale</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(stats.total_amount)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Numero Fatture</p>
                <p className="text-xl font-bold text-orange-700">
                  {stats.total_count}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Giorni Medi</p>
                <p className="text-xl font-bold text-yellow-700">
                  {Math.round(stats.avg_days_overdue)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Peggiore</p>
                <p className="text-lg font-bold text-purple-700">
                  {stats.worst_offender ? `${stats.worst_offender.days_overdue} giorni` : 'N/A'}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtra per giorni:</span>
            </div>
            
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le scadute</SelectItem>
                <SelectItem value="1">1+ giorni</SelectItem>
                <SelectItem value="7">7+ giorni</SelectItem>
                <SelectItem value="30">30+ giorni</SelectItem>
                <SelectItem value="60">60+ giorni</SelectItem>
                <SelectItem value="90">90+ giorni</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-gray-500">
              Mostrando {sortedInvoices.length} di {overdueInvoices.length} fatture
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
                    onClick={() => handleBulkAction('send-reminders')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Invia Solleciti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('mark-paid')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Segna come Pagate
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedInvoices.length === sortedInvoices.length && sortedInvoices.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">Urgenza</TableHead>
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
                    onClick={() => handleSort('counterparty_name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      {renderSortIcon('counterparty_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center gap-2">
                      Scadenza
                      {renderSortIcon('due_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('days_overdue')}
                  >
                    <div className="flex items-center gap-2">
                      Giorni
                      {renderSortIcon('days_overdue')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('overdue_amount')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Importo
                      {renderSortIcon('overdue_amount')}
                    </div>
                  </TableHead>
                  {showActions && <TableHead className="w-12">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice, index) => (
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
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              invoice.urgency_level === 'critical' && "bg-red-500",
                              invoice.urgency_level === 'high' && "bg-orange-500",
                              invoice.urgency_level === 'medium' && "bg-yellow-500"
                            )} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="capitalize">{invoice.urgency_level} priority</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.doc_number}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={invoice.counterparty_name}>
                        {invoice.counterparty_name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {invoice.due_date ? formatDate(invoice.due_date) : 'Non specificata'}
                        </p>
                        <p className="text-xs text-red-600">
                          {invoice.due_date ? formatRelativeTime(invoice.due_date) : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="destructive"
                        className={cn(
                          invoice.days_overdue > 90 && "bg-red-600",
                          invoice.days_overdue > 30 && invoice.days_overdue <= 90 && "bg-orange-500",
                          invoice.days_overdue <= 30 && "bg-yellow-500"
                        )}
                      >
                        {invoice.days_overdue} giorni
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-red-600">
                        {formatCurrency(invoice.overdue_amount)}
                      </span>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Invia Sollecito
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="h-4 w-4 mr-2" />
                              Chiama Cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleMarkAsPaid(invoice.id, invoice.total_amount)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Segna come Pagata
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Dialog 
        open={!!selectedInvoiceDetail} 
        onOpenChange={() => setSelectedInvoiceDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Fattura Scaduta #{selectedInvoiceDetail?.doc_number}
            </DialogTitle>
            <DialogDescription>
              Dettagli della fattura in ritardo
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoiceDetail && (
            <div className="space-y-6">
              {/* Urgency Alert */}
              <div className={cn(
                "p-4 rounded-lg border",
                getUrgencyColor(
                  selectedInvoiceDetail.days_overdue > 90 ? 'critical' :
                  selectedInvoiceDetail.days_overdue > 30 ? 'high' : 'medium'
                )
              )}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    Fattura scaduta da {selectedInvoiceDetail.days_overdue} giorni
                  </span>
                </div>
                <p className="text-sm mt-1">
                  Scadenza: {selectedInvoiceDetail.due_date ? formatDate(selectedInvoiceDetail.due_date) : 'Non specificata'}
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Cliente</label>
                  <p className="font-medium">{selectedInvoiceDetail.counterparty_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Numero Fattura</label>
                  <p className="font-medium">{selectedInvoiceDetail.doc_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data Fattura</label>
                  <p>{formatDate(selectedInvoiceDetail.doc_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Importo Totale</label>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedInvoiceDetail.total_amount)}
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Stato Pagamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stato</label>
                    <div className="mt-1">
                      <Badge variant={formatPaymentStatus(selectedInvoiceDetail.payment_status).variant}>
                        {formatPaymentStatus(selectedInvoiceDetail.payment_status).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Importo Residuo</label>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(selectedInvoiceDetail.open_amount || selectedInvoiceDetail.total_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Invia Sollecito
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Chiama Cliente
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      handleMarkAsPaid(selectedInvoiceDetail.id, selectedInvoiceDetail.total_amount);
                      setSelectedInvoiceDetail(null);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Segna come Pagata
                  </Button>
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

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Azioni Bulk</DialogTitle>
            <DialogDescription>
              Seleziona un'azione da applicare alle {selectedInvoices.length} fatture selezionate
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button 
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleBulkAction('send-reminders')}
            >
              <Send className="h-4 w-4 mr-2" />
              Invia Solleciti di Pagamento
            </Button>
            
            <Button 
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleBulkAction('mark-paid')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Segna tutte come Pagate
            </Button>
            
            <Button 
              className="w-full justify-start"
              variant="ghost"
              onClick={() => setBulkActionDialog(false)}
            >
              Annulla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
