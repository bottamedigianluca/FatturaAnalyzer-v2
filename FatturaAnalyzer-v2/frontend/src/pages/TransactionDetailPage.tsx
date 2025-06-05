import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  Building,
  Hash,
  Activity,
  Target,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate, formatReconciliationStatus } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface TransactionDetail {
  id: number;
  transaction_date: string;
  value_date?: string;
  amount: number;
  description: string;
  causale_abi?: string;
  reconciliation_status: string;
  reconciled_amount: number;
  remaining_amount: number;
  unique_hash: string;
  created_at: string;
  updated_at: string;
  is_income: boolean;
  is_expense: boolean;
}

interface ReconciliationLink {
  id: number;
  invoice_id: number;
  reconciled_amount: number;
  reconciliation_date: string;
  doc_number: string;
  doc_date: string;
  invoice_amount: number;
  counterparty: string;
}

interface PotentialMatch {
  invoice_id: number;
  doc_number: string;
  doc_date: string;
  total_amount: number;
  open_amount: number;
  counterparty_name: string;
  confidence: number;
  match_type: string;
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Fetch transaction details
  const { data: transaction, isLoading: isLoadingTransaction, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/transactions/${id}`);
      if (response.success) {
        return response.data as TransactionDetail;
      }
      throw new Error(response.message || 'Errore nel caricamento');
    },
    enabled: !!id,
  });

  // Fetch reconciliation links
  const { data: reconciliationLinks, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['transaction-reconciliation-links', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/transactions/${id}/reconciliation-links`);
      if (response.success) {
        return response.data as ReconciliationLink[];
      }
      return [];
    },
    enabled: !!id,
  });

  // Fetch potential matches
  const { data: potentialMatches, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['transaction-potential-matches', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/transactions/${id}/potential-matches`);
      if (response.success) {
        return response.data as PotentialMatch[];
      }
      return [];
    },
    enabled: !!id && transaction?.amount > 0, // Solo per entrate
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.delete(`/transactions/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Errore eliminazione');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/transactions');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reconciliation_status }: { reconciliation_status: string }) => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.post(`/transactions/${id}/update-status`, {
        reconciliation_status,
      });
      if (!response.success) {
        throw new Error(response.message || 'Errore aggiornamento');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      setShowStatusDialog(false);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleStatusUpdate = () => {
    if (newStatus) {
      updateStatusMutation.mutate({ reconciliation_status: newStatus });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/transactions')}>
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
              {error instanceof Error ? error.message : 'Errore nel caricamento della transazione'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingTransaction) {
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

  if (!transaction) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Transazione non trovata</h3>
            <p className="text-muted-foreground">La transazione richiesta non esiste o è stata eliminata.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = formatReconciliationStatus(transaction.reconciliation_status);
  const reconciliationProgress = Math.abs(transaction.amount) > 0 ? 
    ((Math.abs(transaction.amount) - Math.abs(transaction.remaining_amount)) / Math.abs(transaction.amount)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {transaction.is_income ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              {transaction.is_income ? 'Entrata' : 'Uscita'} Bancaria
            </h1>
            <p className="text-muted-foreground">
              {formatDate(transaction.transaction_date)} • {formatCurrency(Math.abs(transaction.amount))}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
          
          <Badge variant={transaction.is_income ? 'default' : 'destructive'}>
            {transaction.is_income ? 'Entrata' : 'Uscita'}
          </Badge>
          
          {transaction.causale_abi && (
            <Badge variant="outline">
              ABI: {transaction.causale_abi}
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
                <Link to={`/transactions/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
                <Activity className="mr-2 h-4 w-4" />
                Cambia Stato
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
        {/* Left Column - Transaction Details */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="reconciliation">Riconciliazioni</TabsTrigger>
              {transaction.is_income && (
                <TabsTrigger value="matches">Suggerimenti</TabsTrigger>
              )}
              <TabsTrigger value="history">Cronologia</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Transaction Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Informazioni Transazione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data Operazione</label>
                      <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
                    </div>
                    
                    {transaction.value_date && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data Valuta</label>
                        <p className="font-medium">{formatDate(transaction.value_date)}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Importo</label>
                      <p className={cn(
                        "font-bold text-xl",
                        transaction.is_income ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <div className="flex items-center gap-2">
                        {transaction.is_income ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">Entrata</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-600">Uscita</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {transaction.causale_abi && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Causale ABI</label>
                        <p className="font-medium font-mono">{transaction.causale_abi}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Hash Univoco</label>
                      <p className="font-mono text-xs text-muted-foreground">
                        {transaction.unique_hash.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrizione</label>
                    <p className="mt-1 p-3 bg-muted/50 rounded-lg">{transaction.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Reconciliation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Stato Riconciliazione
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-medium">Importo Totale</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-700">Importo Riconciliato</span>
                    <span className="text-xl font-bold text-green-800">
                      {formatCurrency(transaction.reconciled_amount)}
                    </span>
                  </div>
                  
                  {Math.abs(transaction.remaining_amount) > 0.01 && (
                    <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                      <span className="font-medium text-orange-700">Residuo</span>
                      <span className="text-xl font-bold text-orange-800">
                        {formatCurrency(Math.abs(transaction.remaining_amount))}
                      </span>
                    </div>
                  )}
                  
                  {/* Reconciliation Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso Riconciliazione</span>
                      <span>{reconciliationProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={reconciliationProgress} className="h-2" />
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={statusInfo.variant} className="text-lg px-4 py-2">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reconciliation">
              <Card>
                <CardHeader>
                  <CardTitle>Riconciliazioni Effettuate</CardTitle>
                  <CardDescription>
                    Fatture collegate a questa transazione bancaria
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
                            <TableHead>Fattura</TableHead>
                            <TableHead>Data Fattura</TableHead>
                            <TableHead>Cliente/Fornitore</TableHead>
                            <TableHead>Importo Fattura</TableHead>
                            <TableHead>Importo Riconciliato</TableHead>
                            <TableHead>Data Riconciliazione</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reconciliationLinks.map((link) => (
                            <TableRow key={link.id}>
                              <TableCell>
                                <Link 
                                  to={`/invoices/${link.invoice_id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {link.doc_number}
                                </Link>
                              </TableCell>
                              <TableCell>{formatDate(link.doc_date)}</TableCell>
                              <TableCell className="max-w-32 truncate" title={link.counterparty}>
                                {link.counterparty}
                              </TableCell>
                              <TableCell>{formatCurrency(link.invoice_amount)}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(link.reconciled_amount)}
                              </TableCell>
                              <TableCell>{formatDate(link.reconciliation_date)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="text-center">
                        <Button variant="outline" asChild>
                          <Link to={`/reconciliation?transaction=${id}`}>
                            Gestisci Riconciliazioni
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nessuna riconciliazione</h3>
                      <p className="text-muted-foreground mb-4">
                        Non ci sono ancora fatture collegate a questa transazione.
                      </p>
                      {transaction.is_income && (
                        <Button asChild>
                          <Link to={`/reconciliation?transaction=${id}`}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Riconcilia con Fatture
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {transaction.is_income && (
              <TabsContent value="matches">
                <Card>
                  <CardHeader>
                    <CardTitle>Suggerimenti di Riconciliazione</CardTitle>
                    <CardDescription>
                      Fatture che potrebbero corrispondere a questa entrata
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingMatches ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : potentialMatches && potentialMatches.length > 0 ? (
                      <div className="space-y-3">
                        {potentialMatches.map((match) => (
                          <div key={match.invoice_id} className="p-4 border rounded-lg hover:bg-muted/50">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Link 
                                    to={`/invoices/${match.invoice_id}`}
                                    className="font-medium text-primary hover:underline"
                                  >
                                    {match.doc_number}
                                  </Link>
                                  <Badge variant="outline">
                                    {(match.confidence * 100).toFixed(0)}% match
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {match.counterparty_name} • {formatDate(match.doc_date)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Tipo: {match.match_type}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="font-medium">
                                  {formatCurrency(match.total_amount)}
                                </p>
                                <p className="text-sm text-orange-600">
                                  Aperto: {formatCurrency(match.open_amount)}
                                </p>
                                <Button size="sm" asChild>
                                  <Link to={`/reconciliation?transaction=${id}&invoice=${match.invoice_id}`}>
                                    Riconcilia
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="text-center">
                          <Button variant="outline" asChild>
                            <Link to={`/reconciliation?transaction=${id}`}>
                              Vedi tutte le opzioni
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Nessun suggerimento</h3>
                        <p className="text-muted-foreground mb-4">
                          Non sono state trovate fatture corrispondenti automaticamente.
                        </p>
                        <Button asChild>
                          <Link to={`/reconciliation?transaction=${id}`}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Riconciliazione Manuale
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Cronologia Modifiche</CardTitle>
                  <CardDescription>
                    Storico delle modifiche alla transazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="font-medium">Transazione creata</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {transaction.updated_at !== transaction.created_at && (
                      <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">Transazione aggiornata</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.updated_at)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {reconciliationLinks && reconciliationLinks.map((link) => (
                      <div key={link.id} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">Riconciliazione con fattura {link.doc_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(link.reconciliation_date)} • {formatCurrency(link.reconciled_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
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
              {transaction.is_income && transaction.reconciliation_status !== 'Riconciliato Tot.' && (
                <Button className="w-full" asChild>
                  <Link to={`/reconciliation?transaction=${id}`}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Riconcilia
                  </Link>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowStatusDialog(true)}
              >
                <Activity className="mr-2 h-4 w-4" />
                Cambia Stato
              </Button>
              
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/transactions/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Link>
              </Button>
              
              {transaction.reconciliation_status === 'Ignorato' && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate({ reconciliation_status: 'Da Riconciliare' })}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Riattiva
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Riepilogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "text-3xl font-bold",
                  transaction.is_income ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {transaction.is_income ? 'Entrata' : 'Uscita'}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stato</span>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{formatDate(transaction.transaction_date)}</span>
                </div>
                {transaction.causale_abi && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Causale ABI</span>
                    <span className="font-medium">{transaction.causale_abi}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Riconciliato</span>
                  <span className={cn(
                    "font-medium",
                    transaction.reconciled_amount > 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {formatCurrency(transaction.reconciled_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Residuo</span>
                  <span className={cn(
                    "font-medium",
                    Math.abs(transaction.remaining_amount) > 0.01 ? "text-orange-600" : "text-green-600"
                  )}>
                    {formatCurrency(Math.abs(transaction.remaining_amount))}
                  </span>
                </div>
              </div>
              
              <Progress value={reconciliationProgress} className="h-2" />
              
              <div className="text-center text-xs text-muted-foreground">
                Creata il {formatDate(transaction.created_at)}
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Links Summary */}
          {reconciliationLinks && reconciliationLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Fatture Collegate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {reconciliationLinks.length}
                  </div>
                  <div className="text-sm text-green-600">Riconciliazioni</div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {reconciliationLinks.slice(0, 3).map((link) => (
                    <div key={link.id} className="flex justify-between text-sm">
                      <Link 
                        to={`/invoices/${link.invoice_id}`}
                        className="text-primary hover:underline truncate max-w-[120px]"
                      >
                        {link.doc_number}
                      </Link>
                      <span className="font-medium">
                        {formatCurrency(link.reconciled_amount)}
                      </span>
                    </div>
                  ))}
                  
                  {reconciliationLinks.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{reconciliationLinks.length - 3} altre
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Potential Matches Summary */}
          {transaction.is_income && potentialMatches && potentialMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Suggerimenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {potentialMatches.length}
                  </div>
                  <div className="text-sm text-blue-600">Possibili Match</div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {potentialMatches.slice(0, 3).map((match) => (
                    <div key={match.invoice_id} className="flex justify-between text-sm">
                      <Link 
                        to={`/invoices/${match.invoice_id}`}
                        className="text-primary hover:underline truncate max-w-[120px]"
                      >
                        {match.doc_number}
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {(match.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                  
                  {potentialMatches.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{potentialMatches.length - 3} altri
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-center">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/reconciliation?transaction=${id}`}>
                      Vedi tutti
                    </Link>
                  </Button>
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
              Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.
              {transaction && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{formatDate(transaction.transaction_date)}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {formatCurrency(Math.abs(transaction.amount))} • {transaction.description.substring(0, 50)}...
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

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Stato Riconciliazione</DialogTitle>
            <DialogDescription>
              Seleziona il nuovo stato per questa transazione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona nuovo stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Da Riconciliare">Da Riconciliare</SelectItem>
                <SelectItem value="Riconciliato Parz.">Riconciliato Parzialmente</SelectItem>
                <SelectItem value="Riconciliato Tot.">Riconciliato Totalmente</SelectItem>
                <SelectItem value="Ignorato">Ignorato</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
              >
                Annulla
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={!newStatus || updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? 'Aggiornamento...' : 'Aggiorna'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
