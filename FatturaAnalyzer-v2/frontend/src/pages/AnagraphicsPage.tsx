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
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  Building,
  Mail,
  Phone,
  MapPin,
  Star,
  ArrowUpDown,
  Filter,
  Download,
  Upload,
  AlertTriangle,
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
} from '@/components/ui';

// Utils
import { formatScore } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface AnagraphicsItem {
  id: number;
  type: 'Cliente' | 'Fornitore' | 'Azienda';
  denomination: string;
  piva?: string;
  cf?: string;
  address?: string;
  city?: string;
  province?: string;
  email?: string;
  phone?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

interface AnagraphicsFilters {
  type_filter?: string;
  search?: string;
  city?: string;
  province?: string;
}

interface AnagraphicsListProps {
  data: AnagraphicsItem[];
  loading?: boolean;
  error?: string;
  total?: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onView?: (id: number) => void;
  onFilterChange?: (filters: AnagraphicsFilters) => void;
}

export function AnagraphicsPage({
  data = [],
  loading = false,
  error,
  total = 0,
  onEdit,
  onDelete,
  onView,
  onFilterChange,
}: AnagraphicsListProps) {
  // State
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState<AnagraphicsFilters>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AnagraphicsItem | null>(null);

  // Definizione colonne
  const columns = useMemo<ColumnDef<AnagraphicsItem>[]>(() => [
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
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge
            variant={
              type === 'Cliente' ? 'default' :
              type === 'Fornitore' ? 'secondary' :
              'outline'
            }
            className="text-xs"
          >
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'denomination',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 p-0 font-medium"
        >
          Denominazione
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <div
            className="font-medium cursor-pointer hover:text-primary hover:underline"
            onClick={() => onView?.(row.original.id)}
            title="Clicca per visualizzare dettagli"
          >
            {row.getValue('denomination')}
          </div>
          {row.original.piva && (
            <div className="text-xs text-muted-foreground">
              P.IVA: {row.original.piva}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'city',
      header: 'Città',
      cell: ({ row }) => (
        <div className="flex items-center space-x-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{row.original.city || 'N/A'}</span>
          {row.original.province && (
            <span className="text-muted-foreground">({row.original.province})</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.original.email;
        return email ? (
          <div className="flex items-center space-x-1 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <a
              href={`mailto:${email}`}
              className="text-primary hover:underline truncate max-w-32"
              title={email}
            >
              {email}
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Telefono',
      cell: ({ row }) => {
        const phone = row.original.phone;
        return phone ? (
          <div className="flex items-center space-x-1 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <a
              href={`tel:${phone}`}
              className="text-primary hover:underline"
            >
              {phone}
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => {
        const score = row.original.score;
        if (!score) return <span className="text-muted-foreground text-sm">-</span>;
        
        const scoreInfo = formatScore(score);
        return (
          <div className="flex items-center space-x-1">
            <Star className={cn(
              "h-3 w-3",
              scoreInfo.variant === 'success' ? 'text-green-500' :
              scoreInfo.variant === 'warning' ? 'text-yellow-500' : 'text-red-500'
            )} />
            <Badge variant={scoreInfo.variant} className="text-xs">
              {scoreInfo.text}
            </Badge>
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
            <DropdownMenuItem onClick={() => onView?.(row.original.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizza
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(row.original.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setItemToDelete(row.original);
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
  ], [onView, onEdit]);

  // Setup tabella
  const table = useReactTable({
    data,
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
  const handleFilterChange = (key: keyof AnagraphicsFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDelete?.(itemToDelete.id);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Statistiche rapide
  const stats = useMemo(() => {
    const clienti = data.filter(item => item.type === 'Cliente').length;
    const fornitori = data.filter(item => item.type === 'Fornitore').length;
    const withEmail = data.filter(item => item.email).length;
    const withPhone = data.filter(item => item.phone).length;
    
    return { clienti, fornitori, withEmail, withPhone };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anagrafiche</h1>
          <p className="text-muted-foreground">
            Gestione clienti, fornitori e contatti
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
            <Link to="/anagraphics/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Anagrafica
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clienti</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.clienti}</div>
            <p className="text-xs text-muted-foreground">anagrafiche clienti</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornitori</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.fornitori}</div>
            <p className="text-xs text-muted-foreground">anagrafiche fornitori</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Email</CardTitle>
            <Mail className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.withEmail}</div>
            <p className="text-xs text-muted-foreground">
              {data.length > 0 ? `${((stats.withEmail / data.length) * 100).toFixed(0)}%` : '0%'} del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Telefono</CardTitle>
            <Phone className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.withPhone}</div>
            <p className="text-xs text-muted-foreground">
              {data.length > 0 ? `${((stats.withPhone / data.length) * 100).toFixed(0)}%` : '0%'} del totale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri</CardTitle>
          <CardDescription>Filtra e cerca tra le anagrafiche</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Ricerca globale */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca anagrafiche..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro tipo */}
            <Select
              value={filters.type_filter || 'all'}
              onValueChange={(value) => 
                handleFilterChange('type_filter', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo anagrafica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="Cliente">Clienti</SelectItem>
                <SelectItem value="Fornitore">Fornitori</SelectItem>
                <SelectItem value="Azienda">Aziende</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro città */}
            <Input
              placeholder="Città"
              value={filters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
            />

            {/* Filtro provincia */}
            <Input
              placeholder="Provincia"
              value={filters.province || ''}
              onChange={(e) => handleFilterChange('province', e.target.value || undefined)}
            />
          </div>

          {/* Azioni bulk */}
          {selectedRows.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedRows.length} anagrafiche selezionate
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Esporta Selezionate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      // TODO: Bulk delete
                      console.log('Bulk delete:', selectedRows);
                    }}
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
            Elenco Anagrafiche
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} totali)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Errore nel caricamento delle anagrafiche</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Tabella dati */}
          {!loading && !error && (
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
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessuna anagrafica trovata</p>
                            <p className="text-xs mt-1">
                              Prova a modificare i filtri o crea una nuova anagrafica
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
              Sei sicuro di voler eliminare questa anagrafica? Questa azione non può essere annullata.
              {itemToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{itemToDelete.denomination}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {itemToDelete.type} - {itemToDelete.piva || itemToDelete.cf || 'N/A'}
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
              onClick={handleDeleteConfirm}
            >
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
