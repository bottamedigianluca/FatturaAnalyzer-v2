import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash,
  Download,
  Share,
  FileText,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Printer,
  Mail,
  Copy,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  Separator,
} from '@/components/ui';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate, formatPaymentStatus, formatDueDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface InvoiceDetail {
  id: number;
  type: 'Attiva' | 'Passiva';
  doc_type: string;
  doc_number: string;
  doc_date: string;
  total_amount: number;
  due_date?: string;
  payment_status: string;
  paid_amount: number;
  payment_method?: string;
  notes?: string;
  xml_filename?: string;
  p7m_source_file?: string;
  counterparty_name: string;
  open_amount: number;
  lines: InvoiceLine[];
  vat_summary: VATSummary[];
  created_at: string;
  updated_at: string;
}

interface InvoiceLine {
  id: number;
  line_number: number;
  description: string;
  quantity: number;
  unit_measure?: string;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  item_code?: string;
  item_type?: string;
}

interface VATSummary {
  id: number;
  vat_rate: number;
  taxable_amount: number;
  vat_amount: number;
}

interface ReconciliationLink {
  id: number;
  transaction_id: number;
  reconciled_amount: number;
  reconciliation_date: string;
  transaction_date: string;
  transaction_amount: number;
  description: string;
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading: isLoadingInvoice, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/invoices/${id}`);
      if (response.success) {
        return response.data as InvoiceDetail;
      }
      throw new Error(response.message || 'Errore nel caricamento');
    },
    enabled: !!id,
  });

  // Fetch reconciliation links
  const { data: reconciliationLinks, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['invoice-reconciliation-links', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/invoices/${id}/reconciliation-links`);
      if (response.success) {
        return response.data as ReconciliationLink[];
      }
      return [];
    },
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.delete(`/invoices/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Errore eliminazione');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices');
    },
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ payment_status, paid_amount }: { payment_status: string; paid_amount?: number }) => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.post(`/invoices/${id}/update-payment-status`, {
        payment_status,
        paid_amount,
      });
      if (!response.success) {
        throw new Error(response.message || 'Errore aggiornamento');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setShowPaymentDialog(false);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleMarkAsPaid = () => {
    updatePaymentMutation.mutate({
      payment_status: 'Pagata Tot.',
      paid_amount: invoice?.total_amount,
    });
  };

  const handleMarkAsOpen = () => {
    updatePaymentMutation.mutate({
      payment_status: 'Aperta',
      paid_amount: 0,
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
        </div>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Errore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Errore nel caricamento della fattura'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Fattura non trovata</h3>
            <p className="text-muted-foreground">La fattura richiesta non esiste o è stata eliminata.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentStatusInfo = formatPaymentStatus(invoice.payment_status);
  const dueDateInfo = invoice.due_date ? formatDueDate(invoice.due_date, invoice.payment_status === 'Pagata Tot.') : null;
  const paymentProgress = invoice.total_amount > 0 ? (invoice.paid_amount / invoice.total_amount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Fattura {invoice.doc_number}
            </h1>
            <p className="text-muted-foreground">
              {invoice.type} • {formatDate(invoice.doc_date)} • {invoice.counterparty_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={paymentStatusInfo.variant}>
            {paymentStatusInfo.label}
          </Badge>
          
          <Badge variant={invoice.type === 'Attiva' ? 'default' : 'secondary'}>
            {invoice.type}
          </Badge>
          
          {dueDateInfo && (
            <Badge variant={dueDateInfo.variant}>
              {dueDateInfo.text}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/invoices/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Scarica PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Stampa
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Invia via Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Invoice Details */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="lines">Righe</TabsTrigger>
              <TabsTrigger value="payments">Pagamenti</TabsTrigger>
              <TabsTrigger value="documents">Documenti</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Invoice Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informazioni Fattura
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Numero Documento</label>
                      <p className="font-medium">{invoice.doc_number}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo Documento</label>
                      <p className="font-medium">{invoice.doc_type}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data Documento</label>
                      <p className="font-medium">{formatDate(invoice.doc_date)}</p>
                    </div>
                    
                    {invoice.due_date && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data Scadenza</label>
                        <p className="font-medium">{formatDate(invoice.due_date)}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Controparte</label>
                      <p className="font-medium">{invoice.counterparty_name}</p>
                    </div>
                    
                    {invoice.payment_method && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Metodo Pagamento</label>
                        <p className="font-medium">{invoice.payment_method}</p>
                      </div>
                    )}
                  </div>
                  
                  {invoice.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Note</label>
                      <p className="mt-1">{invoice.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Amount Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Riepilogo Importi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                      <span className="font-medium">Importo Totale</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-700">Importo Pagato</span>
                      <span className="text-xl font-bold text-green-800">
                        {formatCurrency(invoice.paid_amount)}
                      </span>
                    </div>
                    
                    {invoice.open_amount > 0 && (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                        <span className="font-medium text-orange-700">Residuo da Pagare</span>
                        <span className="text-xl font-bold text-orange-800">
                          {formatCurrency(invoice.open_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Payment Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso Pagamento</span>
                      <span>{paymentProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={paymentProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Source Files */}
              {(invoice.xml_filename || invoice.p7m_source_file) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      File Sorgente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {invoice.xml_filename && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">{invoice.xml_filename}</span>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Scarica XML
                        </Button>
                      </div>
                    )}
                    
                    {invoice.p7m_source_file && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">{invoice.p7m_source_file}</span>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Scarica P7M
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="lines">
              <Card>
                <CardHeader>
                  <CardTitle>Righe Fattura</CardTitle>
                  <CardDescription>
                    Dettaglio delle righe e dei prodotti/servizi fatturati
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoice.lines && invoice.lines.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrizione</TableHead>
                            <TableHead>Qtà</TableHead>
                            <TableHead>Prezzo Unit.</TableHead>
                            <TableHead>IVA</TableHead>
                            <TableHead className="text-right">Totale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{line.description}</p>
                                  {line.item_code && (
                                    <p className="text-xs text-muted-foreground">
                                      Codice: {line.item_code}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {line.quantity} {line.unit_measure || ''}
                              </TableCell>
                              <TableCell>{formatCurrency(line.unit_price)}</TableCell>
                              <TableCell>{line.vat_rate}%</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(line.total_price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* VAT Summary */}
                      {invoice.vat_summary && invoice.vat_summary.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">Riepilogo IVA</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Aliquota IVA</TableHead>
                                <TableHead>Imponibile</TableHead>
                                <TableHead>Imposta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoice.vat_summary.map((vat) => (
                                <TableRow key={vat.id}>
                                  <TableCell>{vat.vat_rate}%</TableCell>
                                  <TableCell>{formatCurrency(vat.taxable_amount)}</TableCell>
                                  <TableCell>{formatCurrency(vat.vat_amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nessuna riga</h3>
                      <p className="text-muted-foreground">
                        Non sono state trovate righe per questa fattura.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Riconciliazioni</CardTitle>
                  <CardDescription>
                    Movimenti bancari collegati a questa fattura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingLinks ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : reconciliationLinks && reconciliationLinks.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data Riconciliazione</TableHead>
                            <TableHead>Data Movimento</TableHead>
                            <TableHead>Descrizione</TableHead>
                            <TableHead>Importo Movimento</TableHead>
                            <TableHead>Importo Riconciliato</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reconciliationLinks.map((link) => (
                            <TableRow key={link.id}>
                              <TableCell>{formatDate(link.reconciliation_date)}</TableCell>
                              <TableCell>{formatDate(link.transaction_date)}</TableCell>
                              <TableCell className="max-w-64 truncate" title={link.description}>
                                {link.description}
                              </TableCell>
                              <TableCell>{formatCurrency(link.transaction_amount)}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(link.reconciled_amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="text-center">
                        <Button variant="outline" asChild>
                          <Link to={`/reconciliation?invoice=${id}`}>
                            Gestisci Riconciliazioni
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nessuna riconciliazione</h3>
                      <p className="text-muted-foreground mb-4">
                        Non ci sono ancora movimenti bancari collegati a questa fattura.
                      </p>
                      <Button asChild>
                        <Link to={`/reconciliation?invoice=${id}`}>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Riconcilia Pagamenti
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documenti Allegati</CardTitle>
                  <CardDescription>
                    File e documenti associati alla fattura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nessun documento</h3>
                    <p className="text-muted-foreground">
                      Funzionalità in sviluppo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions and Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.payment_status !== 'Pagata Tot.' && (
                <Button 
                  className="w-full" 
                  onClick={handleMarkAsPaid}
                  disabled={updatePaymentMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Segna come Pagata
                </Button>
              )}
              
              {invoice.payment_status === 'Pagata Tot.' && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleMarkAsOpen}
                  disabled={updatePaymentMutation.isPending}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Riapri Fattura
                </Button>
              )}
              
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/invoices/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Link>
              </Button>
              
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Scarica PDF
              </Button>
              
              <Button variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Invia via Email
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/reconciliation?invoice=${id}`}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Riconcilia
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stato Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge variant={paymentStatusInfo.variant} className="text-lg px-4 py-2">
                  {paymentStatusInfo.label}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pagato</span>
                  <span>{formatCurrency(invoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Residuo</span>
                  <span className={cn(
                    "font-medium",
                    invoice.open_amount > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {formatCurrency(invoice.open_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Totale</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
              
              <Progress value={paymentProgress} className="h-2" />
              
              {invoice.due_date && (
                <div className="text-center text-sm text-muted-foreground">
                  Scadenza: {formatDate(invoice.due_date)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {invoice.doc_number}
                </div>
                <div className="text-sm text-muted-foreground">Numero Documento</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{invoice.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{formatDate(invoice.doc_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente/Fornitore</span>
                  <span className="font-medium truncate ml-2" title={invoice.counterparty_name}>
                    {invoice.counterparty_name}
                  </span>
                </div>
                {invoice.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metodo Pagamento</span>
                    <span className="font-medium">{invoice.payment_method}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="text-center text-xs text-muted-foreground">
                Creata il {formatDate(invoice.created_at)}
                {invoice.updated_at !== invoice.created_at && (
                  <div>Aggiornata il {formatDate(invoice.updated_at)}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Summary */}
          {reconciliationLinks && reconciliationLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Riconciliazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {reconciliationLinks.length}
                  </div>
                  <div className="text-sm text-green-600">Movimenti Collegati</div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {reconciliationLinks.slice(0, 3).map((link) => (
                    <div key={link.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">
                        {formatDate(link.transaction_date)}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(link.reconciled_amount)}
                      </span>
                    </div>
                  ))}
                  
                  {reconciliationLinks.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{reconciliationLinks.length - 3} altri
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa fattura? Questa azione non può essere annullata.
              {invoice && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Fattura {invoice.doc_number}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {invoice.type} - {formatDate(invoice.doc_date)} - {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
