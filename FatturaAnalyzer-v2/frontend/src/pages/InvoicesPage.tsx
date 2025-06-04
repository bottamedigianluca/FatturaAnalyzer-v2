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
      header: 'Data',
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
      header: 'Importo',
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
          </Button