import React, { useState, useMemo, useRef } from 'react';
import { useImportTransactionsCSV } from '@/hooks/useImportExport';
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
  CreditCard,
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
  FileSpreadsheet,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
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
import { 
  useTransactions, 
  useBulkTransactionOperations, 
  useDeleteTransaction,
  useTransactionStats
} from '@/hooks/useTransactions';

import {
  useImportTransactionsCSVZIP,
  useExportData as useExportTransactions,
  useDownloadTransactionTemplate
} from '@/hooks/useImportExport';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatReconciliationStatus 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { BankTransaction, TransactionFilters, ReconciliationStatus } from '@/types';

export function TransactionsPage() {
  // State per filtri e selezione
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    size: 50,
  });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Hooks
  const { data: transactionsData, isLoading, error, refetch } = useTransactions(filters);
  const { data: statsData } = useTransactionStats();
  const { bulkDelete } = useBulkTransactionOperations();
  const deleteTransactionMutation = useDeleteTransaction();
  const importCSVMutation = useImportTransactionsCSV();
  const exportMutation = useExportTransactions();
  const downloadTemplateMutation = useDownloadTransactionTemplate();

  // Definizione colonne tabella
  const columns = useMemo<ColumnDef<BankTransaction>[]>(() => [
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
      accessorKey: 'transaction_date',
      header: 'Data',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.getValue('transaction_date'))}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Descrizione',
      cell: ({ row }) => (
        <div className="max-w-64 truncate" title={row.getValue('description')}>
          {row.getValue('description') || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
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
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        const isIncome = amount > 0;
        
        return (
          <div className={cn(
            'text-right font-medium flex items-center justify-end space-x-1',
            isIncome ? 'text-green-600' : 'text-red-600'
          )}>
            {isIncome ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{formatCurrency(Math.abs(amount))}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'reconciliation_status',
      header: 'Stato Riconciliazione',
      cell: ({ row }) => {
        const status = formatReconciliationStatus(row.getValue('reconciliation_status'));
        return (
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'remaining_amount',
      header: 'Residuo',
      cell: ({ row }) => {
        const remaining = row.original.remaining_amount || 0;
        const total = Math.abs(row.original.amount);
        const percentage = total > 0 ? ((total - Math.abs(remaining)) / total) * 100 : 0;
        
        return (
          <div className="space-y-1">
            <div className={cn(
              'text-right font-medium text-sm',
              remaining > 0 ? 'text-orange-600' : 'text-green-600'
            )}>
              {remaining > 0 ? formatCurrency(remaining) : '€ 0,00'}
            </div>
            {percentage > 0 && (
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'causale_abi',
      header: 'Causale ABI',
      cell: ({ row }) => {
        const causale = row.getValue('causale_abi');
        return causale ? (
          <Badge variant="outline" className="text-xs">
            {causale}
          </Badge>
        ) : null;
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
              <Link to={`/transactions/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizza
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/reconciliation?transaction=${row.original.id}`}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Riconcilia
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setTransactionToDelete(row.original.id);
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
    data: transactionsData?.items || [],
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
  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCSVMutation.mutate(file, {
        onSuccess: () => {
          setShowImportDialog(false);
          refetch();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      });
    }
  };

  const handleExport = (format: 'excel' | 'csv' | 'json') => {
    exportMutation.mutate({
      format,
      filters: {
        ...filters,
        page: undefined, // Export all matching records
        size: undefined,
      },
    });
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteTransactionMutation.mutateAsync(transactionToDelete);
      setShowDeleteDialog(false);
      setTransactionToDelete(null);
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Statistiche rapide
  const stats = useMemo(() => {
    if (!transactionsData?.items) return null;
    
    const transactions = transactionsData.items;
    const income = transactions.filter(t => t.amount > 0);
    const expenses = transactions.filter(t => t.amount < 0);
    
    return {
      total: transactions.length,
      totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0)),
      reconciled: transactions.filter(t => t.reconciliation_status === 'Riconciliato Tot.').length,
      pending: transactions.filter(t => t.reconciliation_status === 'Da Riconciliare').length,
    };
  }, [transactionsData?.items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimenti Bancari</h1>
          <p className="text-muted-foreground">
            Gestione transazioni e movimenti bancari
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadTemplateMutation.mutate()}
            disabled={downloadTemplateMutation.isPending}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Template CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importa CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Esporta
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                JSON (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" asChild>
            <Link to="/transactions/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Transazione
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">transazioni</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">incassi totali</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uscite</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">pagamenti totali</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riconciliate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.reconciled}</div>
              <p className="text-xs text-muted-foreground">completate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Da Riconciliare</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">in sospeso</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtri e Ricerca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri</CardTitle>
          <CardDescription>
            Filtra e cerca tra le transazioni bancarie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {/* Ricerca globale */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca transazioni..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro stato riconciliazione */}
            <Select
              value={filters.status_filter || 'all'}
              onValueChange={(value) => 
                handleFilterChange('status_filter', value === 'all' ? undefined : value as ReconciliationStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Stato riconciliazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="Da Riconciliare">Da Riconciliare</SelectItem>
                <SelectItem value="Riconciliato Parz.">Parzialmente Riconciliate</SelectItem>
                <SelectItem value="Riconciliato Tot.">Completamente Riconciliate</SelectItem>
                <SelectItem value="Ignorato">Ignorate</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro importo minimo */}
            <Input
              type="number"
              placeholder="Importo min €"
              value={filters.min_amount || ''}
              onChange={(e) => 
                handleFilterChange('min_amount', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />

            {/* Filtro importo massimo */}
            <Input
              type="number"
              placeholder="Importo max €"
              value={filters.max_amount || ''}
              onChange={(e) => 
                handleFilterChange('max_amount', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />

            {/* Filtri speciali */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide_pos"
                checked={filters.hide_pos || false}
                onCheckedChange={(checked) => handleFilterChange('hide_pos', checked)}
              />
              <label htmlFor="hide_pos" className="text-sm">Nascondi POS</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide_commissions"
                checked={filters.hide_commissions || false}
                onCheckedChange={(checked) => handleFilterChange('hide_commissions', checked)}
              />
              <label htmlFor="hide_commissions" className="text-sm">Nascondi Commissioni</label>
            </div>
          </div>

          {/* Azioni bulk */}
          {selectedRows.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedRows.length} transazioni selezionate
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Bulk reconcile */}}
                  >
                    Riconcilia Selezionate
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
            Elenco Transazioni
            {transactionsData?.total && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({transactionsData.total} totali)
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
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Errore nel caricamento delle transazioni</p>
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
                            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessuna transazione trovata</p>
                            <p className="text-xs mt-1">
                              Prova a modificare i filtri o importa movimenti bancari
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

      {/* Dialog Import CSV */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importa Movimenti Bancari</DialogTitle>
            <DialogDescription>
              Seleziona un file CSV contenente i movimenti bancari da importare.
              Il file deve seguire il formato del template scaricabile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Clicca per selezionare un file CSV</p>
                  <p className="text-sm text-muted-foreground">o trascina qui il file</p>
                </div>
              </label>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => downloadTemplateMutation.mutate()}
                disabled={downloadTemplateMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Scarica Template
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
              >
                Annulla
              </Button>
            </div>
            {importCSVMutation.isPending && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Importazione in corso...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.
              {transactionToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  ID Transazione: {transactionToDelete}
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
              onClick={handleDeleteTransaction}
              disabled={deleteTransactionMutation.isPending}
            >
              {deleteTransactionMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
