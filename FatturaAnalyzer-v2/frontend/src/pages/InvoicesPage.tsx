import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

// Components
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

// Hooks
import { useInvoices, useBulkInvoiceOperations, useDeleteInvoice } from '@/hooks/useInvoices';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatPaymentStatus, 
  formatDueDate 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice, InvoiceFilters, PaymentStatus, InvoiceType } from '@/types';

export function InvoicesPage() {
  // State per filtri e selezione
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    size: 50,
  });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

  // API Hooks
  const { data: invoicesData, isLoading, error, refetch } = useInvoices(filters);
  const { bulkUpdateStatus, bulkDelete } = useBulkInvoiceOperations();
  const deleteInvoiceMutation = useDeleteInvoice();

  // Definizione colonne tabella
  const columns = useMemo<ColumnDef<Invoice>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleziona tutto"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleziona riga"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'doc_number',
      header: 'Numero',
      cell: ({ row }) => (
        <div className="font-medium">
          <Link 
            to={`/invoices/${row.original.id}`}
            className="text-primary hover:underline"
          >
            {row.getValue('doc_number')}
          </Link>
          <div className="text-xs text-muted-foreground">
            {row.original.type}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'doc_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 p-0 font-medium"
        >
          Data
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.getValue('doc_date'))}
        </div>
      ),
    },
    {
      accessorKey: 'counterparty_name',
      header: 'Cliente/Fornitore',
      cell: ({ row }) => (
        <div className="max-w-48 truncate" title={row.getValue('counterparty_name')}>
          {row.getValue('counterparty_name')}
        </div>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 p-0 font-medium"
        >
          Importo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.getValue('total_amount'))}
        </div>
      ),
    },
    {
      accessorKey: 'due_date',
      header: 'Scadenza',
      cell: ({ row }) => {
        const dueDate = row.getValue('due_date') as string;
        const isPaid = row.original.payment_status === 'Pagata Tot.';
        const dueDateInfo = formatDueDate(dueDate, isPaid);
        
        return (
          <Badge variant={dueDateInfo.variant} className="text-xs">
            {dueDateInfo.text}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Stato',
      cell: ({ row }) => {
        const status = formatPaymentStatus(row.getValue('payment_status'));
        return (
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'open_amount',
      header: 'Residuo',
      cell: ({ row }) => {
        const openAmount = row.original.open_amount || 0;
        return (
          <div className={cn(
            'text-right font-medium text-sm',
            openAmount > 0 ? 'text-orange-600' : 'text-green-600'
          )}>
            {openAmount > 0 ? formatCurrency(openAmount) : '€ 0,00'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={`/invoices/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizza
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/invoices/${row.original.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Modifica
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setInvoiceToDelete(row.original.id);
                setShowDeleteDialog(true);
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  // Setup tabella
  const table = useReactTable({
    data: invoicesData?.items || [],
    columns,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' 
        ? updater(selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {}))
        : updater;
      setSelectedRows(Object.keys(newSelection).map(Number));
    },
    state: {
      globalFilter,
      rowSelection: selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    },
  });

  // Handlers
  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleBulkStatusUpdate = async (status: PaymentStatus) => {
    if (selectedRows.length === 0) return;
    
    try {
      await bulkUpdateStatus.mutateAsync({
        invoiceIds: selectedRows,
        payment_status: status,
      });
      setSelectedRows([]);
      refetch();
    } catch (error) {
      console.error('Bulk update error:', error);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      await deleteInvoiceMutation.mutateAsync(invoiceToDelete);
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Statistiche rapide
  const stats = useMemo(() => {
    if (!invoicesData?.items) return null;
    
    const invoices = invoicesData.items;
    return {
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
      paidAmount: invoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
      overdue: invoices.filter(inv => {
        if (!inv.due_date || inv.payment_status === 'Pagata Tot.') return false;
        return new Date(inv.due_date) < new Date();
      }).length,
    };
  }, [invoicesData?.items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fatture</h1>
          <p className="text-muted-foreground">
            Gestione fatture attive e passive
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Importa
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Esporta
          </Button>
          <Button size="sm" asChild>
            <Link to="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Fattura
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Fatture</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">nel periodo</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Importo Totale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">fatturato lordo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incassato</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.paidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAmount > 0 ? 
                  `${((stats.paidAmount / stats.totalAmount) * 100).toFixed(1)}%` : 
                  '0%'
                } del totale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scadute</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">fatture in ritardo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri</CardTitle>
          <CardDescription>Filtra e cerca tra le fatture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Ricerca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca fatture..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tipo fattura */}
            <Select
              value={filters.type_filter || 'all'}
              onValueChange={(value) => 
                handleFilterChange('type_filter', value === 'all' ? undefined : value as InvoiceType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo fattura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="Attiva">Fatture Attive</SelectItem>
                <SelectItem value="Passiva">Fatture Passive</SelectItem>
              </SelectContent>
            </Select>

            {/* Stato pagamento */}
            <Select
              value={filters.status_filter || 'all'}
              onValueChange={(value) => 
                handleFilterChange('status_filter', value === 'all' ? undefined : value as PaymentStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Stato pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="Aperta">Aperte</SelectItem>
                <SelectItem value="Pagata Parz.">Parzialmente Pagate</SelectItem>
                <SelectItem value="Pagata Tot.">Pagate</SelectItem>
                <SelectItem value="Scaduta">Scadute</SelectItem>
              </SelectContent>
            </Select>

            {/* Data inizio */}
            <Input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
            />

            {/* Data fine */}
            <Input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
            />
          </div>

          {/* Azioni bulk */}
          {selectedRows.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedRows.length} fatture selezionate
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('Pagata Tot.' as PaymentStatus)}
                  >
                    Segna come Pagate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => bulkDelete.mutate(selectedRows)}
                    disabled={bulkDelete.isPending}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Elimina
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella */}
      <Card>
        <CardHeader>
          <CardTitle>
            Elenco Fatture
            {invoicesData?.total && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({invoicesData.total} totali)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Errore nel caricamento delle fatture</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-2"
                >
                  Riprova
                </Button>
              </div>
            </div>
          )}

          {/* Tabella dati */}
          {!isLoading && !error && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-muted/50"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          <div className="text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessuna fattura trovata</p>
                            <p className="text-xs mt-1">
                              Prova a modificare i filtri o crea una nuova fattura
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginazione */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  {selectedRows.length > 0 && (
                    <span>{selectedRows.length} di {table.getFilteredRowModel().rows.length} righe selezionate. </span>
                  )}
                  Mostra {table.getState().pagination.pageSize} di {table.getFilteredRowModel().rows.length} risultati
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Precedente
                  </Button>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Pagina {table.getState().pagination.pageIndex + 1} di{' '}
                    {table.getPageCount()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Successiva
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa fattura? Questa azione non può essere annullata.
              {invoiceToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  ID Fattura: {invoiceToDelete}
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
              onClick={handleDeleteInvoice}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
