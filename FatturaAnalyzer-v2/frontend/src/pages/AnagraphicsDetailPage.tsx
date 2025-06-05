import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  FileText,
  Star,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Download,
  Plus,
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
  DialogTrigger,
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
} from '@/components/ui';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate, formatScore, formatPaymentStatus } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface AnagraphicsDetail {
  id: number;
  type: 'Cliente' | 'Fornitore' | 'Azienda';
  denomination: string;
  piva?: string;
  cf?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  country?: string;
  iban?: string;
  email?: string;
  phone?: string;
  pec?: string;
  codice_destinatario?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

interface AnagraphicsStats {
  total_invoices: number;
  total_revenue: number;
  avg_invoice_amount: number;
  last_invoice_date?: string;
  payment_stats: {
    paid_count: number;
    overdue_count: number;
    open_count: number;
    total_outstanding: number;
  };
}

interface RecentInvoice {
  id: number;
  doc_number: string;
  doc_date: string;
  total_amount: number;
  payment_status: string;
  due_date?: string;
  open_amount: number;
}

export function AnagraphicsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch anagraphics details
  const { data: anagraphics, isLoading: isLoadingAnagraphics, error } = useQuery({
    queryKey: ['anagraphics', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/anagraphics/${id}`);
      if (response.success) {
        return response.data as AnagraphicsDetail;
      }
      throw new Error(response.message || 'Errore nel caricamento');
    },
    enabled: !!id,
  });

  // Fetch anagraphics statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['anagraphics-stats', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/analytics/clients/top?client_id=${id}`);
      if (response.success) {
        return response.data as AnagraphicsStats;
      }
      return null;
    },
    enabled: !!id,
  });

  // Fetch recent invoices
  const { data: recentInvoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['anagraphics-invoices', id],
    queryFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.get(`/invoices?anagraphics_id=${id}&size=10`);
      if (response.success) {
        return response.data.items as RecentInvoice[];
      }
      return [];
    },
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID non fornito');
      const response = await apiClient.delete(`/anagraphics/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Errore eliminazione');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anagraphics'] });
      navigate('/anagraphics');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/anagraphics')}>
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
              {error instanceof Error ? error.message : 'Errore nel caricamento dell\'anagrafica'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingAnagraphics) {
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

  if (!anagraphics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/anagraphics')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Anagrafica non trovata</h3>
            <p className="text-muted-foreground">L'anagrafica richiesta non esiste o è stata eliminata.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreInfo = anagraphics.score ? formatScore(anagraphics.score) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/anagraphics')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna all'elenco
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{anagraphics.denomination}</h1>
            <p className="text-muted-foreground">
              {anagraphics.type} • Creata il {formatDate(anagraphics.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={anagraphics.type === 'Cliente' ? 'default' : anagraphics.type === 'Fornitore' ? 'secondary' : 'outline'}
          >
            {anagraphics.type}
          </Badge>
          
          {scoreInfo && (
            <Badge variant={scoreInfo.variant}>
              <Star className="mr-1 h-3 w-3" />
              {scoreInfo.text}
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
                <Link to={`/anagraphics/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Esporta Dati
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
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Dettagli</TabsTrigger>
              <TabsTrigger value="invoices">Fatture</TabsTrigger>
              <TabsTrigger value="documents">Documenti</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informazioni Anagrafica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Denominazione</label>
                      <p className="font-medium">{anagraphics.denomination}</p>
                    </div>
                    
                    {anagraphics.piva && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Partita IVA</label>
                        <p className="font-medium font-mono">{anagraphics.piva}</p>
                      </div>
                    )}
                    
                    {anagraphics.cf && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Codice Fiscale</label>
                        <p className="font-medium font-mono">{anagraphics.cf}</p>
                      </div>
                    )}
                    
                    {anagraphics.codice_destinatario && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Codice Destinatario</label>
                        <p className="font-medium font-mono">{anagraphics.codice_destinatario}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contatti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {anagraphics.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${anagraphics.email}`}
                          className="text-primary hover:underline"
                        >
                          {anagraphics.email}
                        </a>
                      </div>
                    )}
                    
                    {anagraphics.pec && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${anagraphics.pec}`}
                          className="text-primary hover:underline"
                        >
                          {anagraphics.pec} <Badge variant="outline" className="ml-1">PEC</Badge>
                        </a>
                      </div>
                    )}
                    
                    {anagraphics.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`tel:${anagraphics.phone}`}
                          className="text-primary hover:underline"
                        >
                          {anagraphics.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              {(anagraphics.address || anagraphics.city) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Indirizzo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {anagraphics.address && <p>{anagraphics.address}</p>}
                      <p>
                        {anagraphics.cap && `${anagraphics.cap} `}
                        {anagraphics.city}
                        {anagraphics.province && ` (${anagraphics.province})`}
                      </p>
                      {anagraphics.country && anagraphics.country !== 'IT' && (
                        <p className="text-muted-foreground">{anagraphics.country}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Banking */}
              {anagraphics.iban && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Dati Bancari
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">IBAN</label>
                      <p className="font-medium font-mono">{anagraphics.iban}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Fatture Recenti</CardTitle>
                  <CardDescription>
                    Ultime fatture associate a questa anagrafica
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingInvoices ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : recentInvoices && recentInvoices.length > 0 ? (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Numero</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Importo</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>
                                <Link 
                                  to={`/invoices/${invoice.id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {invoice.doc_number}
                                </Link>
                              </TableCell>
                              <TableCell>{formatDate(invoice.doc_date)}</TableCell>
                              <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                              <TableCell>
                                <Badge variant={formatPaymentStatus(invoice.payment_status).variant}>
                                  {formatPaymentStatus(invoice.payment_status).label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/invoices/${invoice.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="text-center">
                        <Button variant="outline" asChild>
                          <Link to={`/invoices?anagraphics_id=${id}`}>
                            Vedi tutte le fatture
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nessuna fattura</h3>
                      <p className="text-muted-foreground mb-4">
                        Non ci sono ancora fatture per questa anagrafica.
                      </p>
                      <Button asChild>
                        <Link to={`/invoices/new?anagraphics_id=${id}`}>
                          <Plus className="mr-2 h-4 w-4" />
                          Crea Fattura
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
                  <CardTitle>Documenti</CardTitle>
                  <CardDescription>
                    Documenti e allegati associati
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

        {/* Right Column - Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link to={`/invoices/new?anagraphics_id=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Fattura
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/anagraphics/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica Anagrafica
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Esporta Dati
              </Button>
            </CardContent>
          </Card>

          {/* Statistics */}
          {isLoadingStats ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ) : stats ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistiche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {stats.total_invoices}
                    </div>
                    <div className="text-sm text-muted-foreground">Fatture Totali</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.total_revenue)}
                    </div>
                    <div className="text-sm text-muted-foreground">Fatturato Totale</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(stats.avg_invoice_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Importo Medio</div>
                  </div>
                </div>
                
                {stats.payment_stats && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Stato Pagamenti</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Pagate</span>
                        <span>{stats.payment_stats.paid_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-600">Aperte</span>
                        <span>{stats.payment_stats.open_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Scadute</span>
                        <span>{stats.payment_stats.overdue_count}</span>
                      </div>
                    </div>
                    
                    {stats.payment_stats.total_outstanding > 0 && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="text-sm font-medium text-orange-800">
                          Crediti in Sospeso
                        </div>
                        <div className="text-lg font-bold text-orange-900">
                          {formatCurrency(stats.payment_stats.total_outstanding)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {stats.last_invoice_date && (
                  <div className="text-center text-sm text-muted-foreground">
                    Ultima fattura: {formatDate(stats.last_invoice_date)}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : anagraphics.type === 'Cliente' ? (
            <Card>
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nessuna attività registrata
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nessuna attività recente
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa anagrafica? Questa azione non può essere annullata.
              {anagraphics && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{anagraphics.denomination}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {anagraphics.type} - {anagraphics.piva || anagraphics.cf || 'N/A'}
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
