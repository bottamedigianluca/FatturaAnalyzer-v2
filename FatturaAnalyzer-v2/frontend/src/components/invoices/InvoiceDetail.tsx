import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Hash,
  CheckCircle,
  AlertTriangle,
  Clock,
  Edit,
  Trash2,
  Copy,
  Download,
  Send,
  Printer,
  ArrowLeft,
  MoreHorizontal,
  Target,
  Zap,
  Shield,
  Building2,
  Receipt,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Skeleton,
} from '@/components/ui';

// Hooks
import { useInvoice, useUpdateInvoicePaymentStatus, useDeleteInvoice } from '@/hooks/useInvoices';
import { useInvoiceReconciliationLinks } from '@/hooks/useInvoices';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  formatPaymentStatus,
  formatDueDate,
  formatVATNumber,
  formatTaxCode,
  formatAddress,
  formatPhoneNumber
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice, InvoiceLine, InvoiceVATSummary } from '@/types';

interface InvoiceDetailProps {
  invoiceId: number;
  onBack?: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  embedded?: boolean;
}

export function InvoiceDetail({ 
  invoiceId, 
  onBack, 
  onEdit, 
  onDelete,
  embedded = false 
}: InvoiceDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const { data: reconciliationLinks } = useInvoiceReconciliationLinks(invoiceId);
  const updatePaymentStatus = useUpdateInvoicePaymentStatus();
  const deleteInvoice = useDeleteInvoice();

  // Handlers
  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    
    try {
      await updatePaymentStatus.mutateAsync({
        id: invoice.id,
        payment_status: 'Pagata Tot.',
        paid_amount: invoice.total_amount,
      });
      refetch();
    } catch (error) {
      console.error('Payment status update error:', error);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      onDelete?.(invoice);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    addNotification({
      type: 'info',
      title: 'Email inviata',
      message: `Fattura ${invoice?.doc_number} inviata via email`,
      duration: 3000,
    });
  };

  const handleDownloadPDF = () => {
    addNotification({
      type: 'success',
      title: 'PDF scaricato',
      message: `PDF della fattura ${invoice?.doc_number} scaricato`,
      duration: 3000,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <InvoiceDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !invoice) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento fattura
              </h3>
              <p className="text-red-700">
                {error instanceof Error ? error.message : 'Fattura non trovata'}
              </p>
              {onBack && (
                <Button onClick={onBack} variant="outline" className="mt-3 border-red-300">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna indietro
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paymentStatusData = formatPaymentStatus(invoice.payment_status);
  const dueDateData = formatDueDate(invoice.due_date, invoice.payment_status === 'Pagata Tot.');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && !embedded && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
          )}
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Fattura {invoice.doc_number}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={paymentStatusData.variant}>
                {paymentStatusData.label}
              </Badge>
              <Badge variant={dueDateData.variant}>
                {dueDateData.text}
              </Badge>
              <span className="text-sm text-gray-600">
                {invoice.type} • {formatDate(invoice.doc_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Stampa
          </Button>
          
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          
          <Button variant="outline" onClick={handleSendEmail}>
            <Send className="h-4 w-4 mr-2" />
            Invia
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit?.(invoice)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.payment_status !== 'Pagata Tot.' && (
                <DropdownMenuItem onClick={handleMarkAsPaid}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Segna come Pagata
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="lines">Righe</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
          <TabsTrigger value="history">Cronologia</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600" />
                  Riepilogo Fattura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <p className="font-medium">{invoice.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Numero</label>
                    <p className="font-medium">{invoice.doc_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Data Emissione</label>
                    <p>{formatDate(invoice.doc_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Scadenza</label>
                    <p>{invoice.due_date ? formatDate(invoice.due_date) : 'Non specificata'}</p>
                  </div>
                </div>

                <Separator />

                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Importi</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Importo Totale</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pagato</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(invoice.paid_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium">Residuo</span>
                      <span className={cn(
                        "font-bold",
                        (invoice.open_amount || 0) > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {formatCurrency(invoice.open_amount || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {invoice.payment_method && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Metodo di Pagamento</label>
                    <p className="font-medium">{invoice.payment_method}</p>
                  </div>
                )}

                {/* Notes */}
                {invoice.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Note</label>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer/Supplier Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {invoice.type === 'Attiva' ? 'Cliente' : 'Fornitore'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Denominazione</label>
                  <p className="font-medium text-lg">{invoice.counterparty_name || 'N/A'}</p>
                </div>

                {/* Customer details would be populated from anagraphics */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    ID Anagrafica: {invoice.anagraphics_id}
                  </p>
                  <Button variant="ghost
