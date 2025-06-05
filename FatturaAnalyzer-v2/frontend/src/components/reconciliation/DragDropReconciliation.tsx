import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragOverEvent,
  closestCenter,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CreditCard,
  GitMerge,
  Target,
  Zap,
  Eye,
  CheckCircle,
  X,
  ArrowRight,
  DollarSign,
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  Sparkles,
  Filter,
  Search,
  RefreshCw,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Equal,
  Hash,
  Clock,
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
  Progress,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator,
  Switch,
} from '@/components/ui';

// Hooks
import { useInvoices } from '@/hooks/useInvoices';
import { useTransactions } from '@/hooks/useTransactions';
import { usePerformReconciliation } from '@/hooks/useReconciliation';
import { useUIStore, useReconciliationStore } from '@/store';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice, BankTransaction } from '@/types';

interface DragDropReconciliationProps {
  showFilters?: boolean;
  maxItems?: number;
  onReconciliationComplete?: () => void;
}

interface DragData {
  type: 'invoice' | 'transaction';
  item: Invoice | BankTransaction;
  id: string;
}

interface MatchZone {
  id: string;
  type: 'pending' | 'matched';
  items: DragData[];
  totalAmount: number;
  status: 'perfect' | 'close' | 'different' | 'empty';
}

// Sortable item wrapper for drag and drop
function SortableItem({ 
  children, 
  id, 
  data,
  isOverlay = false 
}: { 
  children: React.ReactNode; 
  id: string; 
  data: DragData;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    data: {
      type: data.type,
      item: data.item,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isOverlay) {
    return (
      <div className="rotate-2 scale-105 opacity-90">
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {children}
    </div>
  );
}

// Invoice card component
function InvoiceCard({ 
  invoice, 
  isDragOverlay = false,
  showQuickActions = true 
}: { 
  invoice: Invoice; 
  isDragOverlay?: boolean;
  showQuickActions?: boolean;
}) {
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-md border-l-4",
      invoice.payment_status === 'Pagata Tot.' ? "border-l-green-500 bg-green-50/50" :
      isOverdue ? "border-l-red-500 bg-red-50/50" :
      "border-l-blue-500 bg-blue-50/50",
      isDragOverlay && "shadow-2xl scale-105 rotate-2"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-sm">{invoice.doc_number}</span>
              <Badge variant={
                invoice.payment_status === 'Pagata Tot.' ? 'default' :
                isOverdue ? 'destructive' : 'secondary'
              } className="text-xs">
                {invoice.payment_status}
              </Badge>
            </div>
            
            <p className="text-sm font-medium text-gray-900 mb-1">
              {invoice.counterparty_name}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                {formatDate(invoice.doc_date)}
                {invoice.due_date && (
                  <>
                    <ArrowRight className="h-3 w-3 mx-1" />
                    {formatDate(invoice.due_date)}
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3" />
                <span className="font-bold text-blue-600">
                  {formatCurrency(invoice.total_amount)}
                </span>
                {invoice.open_amount && invoice.open_amount > 0 && (
                  <span className="text-orange-600">
                    (Residuo: {formatCurrency(invoice.open_amount)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {showQuickActions && (
            <div className="flex flex-col gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visualizza fattura</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Transaction card component
function TransactionCard({ 
  transaction, 
  isDragOverlay = false,
  showQuickActions = true 
}: { 
  transaction: BankTransaction; 
  isDragOverlay?: boolean;
  showQuickActions?: boolean;
}) {
  const isIncome = transaction.amount > 0;
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-md border-l-4",
      transaction.reconciliation_status === 'Riconciliato Tot.' ? "border-l-green-500 bg-green-50/50" :
      isIncome ? "border-l-emerald-500 bg-emerald-50/50" : "border-l-red-500 bg-red-50/50",
      isDragOverlay && "shadow-2xl scale-105 rotate-2"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                {isIncome ? 'IN' : 'OUT'}
              </span>
              <Badge variant={
                transaction.reconciliation_status === 'Riconciliato Tot.' ? 'default' :
                transaction.reconciliation_status === 'Da Riconciliare' ? 'secondary' : 'outline'
              } className="text-xs">
                {transaction.reconciliation_status === 'Da Riconciliare' ? 'Nuovo' :
                 transaction.reconciliation_status === 'Riconciliato Parz.' ? 'Parziale' :
                 'Completo'}
              </Badge>
            </div>
            
            <p className="text-sm font-medium text-gray-900 mb-1 truncate">
              {transaction.description || 'Nessuna descrizione'}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                {formatDate(transaction.transaction_date)}
                {transaction.value_date && transaction.value_date !== transaction.transaction_date && (
                  <>
                    <ArrowRight className="h-3 w-3 mx-1" />
                    {formatDate(transaction.value_date)}
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs">
                {isIncome ? <Plus className="h-3 w-3 text-green-500" /> : <Minus className="h-3 w-3 text-red-500" />}
                <span className={cn(
                  "font-bold",
                  isIncome ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(transaction.amount))}
                </span>
                {transaction.remaining_amount && transaction.remaining_amount > 0 && (
                  <span className="text-orange-600">
                    (Residuo: {formatCurrency(transaction.remaining_amount)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {showQuickActions && (
            <div className="flex flex-col gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visualizza transazione</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Match zone component for drag and drop
function MatchZone({ 
  zone, 
  onRemoveItem,
  onReconcile 
}: { 
  zone: MatchZone;
  onRemoveItem: (itemId: string) => void;
  onReconcile: (zone: MatchZone) => void;
}) {
  const invoices = zone.items.filter(item => item.type === 'invoice');
  const transactions = zone.items.filter(item => item.type === 'transaction');
  
  const getStatusColor = () => {
    switch (zone.status) {
      case 'perfect': return 'border-green-500 bg-green-50';
      case 'close': return 'border-yellow-500 bg-yellow-50';
      case 'different': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusIcon = () => {
    switch (zone.status) {
      case 'perfect': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'close': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'different': return <X className="h-5 w-5 text-red-600" />;
      default: return <Target className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (zone.status) {
      case 'perfect': return 'Match Perfetto!';
      case 'close': return 'Match Approssimativo';
      case 'different': return 'Importi Diversi';
      default: return 'Trascina qui per riconciliare';
    }
  };

  const canReconcile = invoices.length > 0 && transactions.length > 0;

  return (
    <Card className={cn(
      "min-h-[200px] border-2 border-dashed transition-all",
      getStatusColor(),
      zone.items.length === 0 && "hover:border-blue-400 hover:bg-blue-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-sm">{getStatusText()}</CardTitle>
          </div>
          
          {zone.totalAmount > 0 && (
            <Badge variant="outline" className="font-mono">
              {formatCurrency(zone.totalAmount)}
            </Badge>
          )}
        </div>
        
        {zone.items.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>{invoices.length} Fatture</span>
            <span>{transactions.length} Movimenti</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {zone.items.length === 0 ? (
          <div className="text-center py-8">
            <GitMerge className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Trascina fatture e movimenti qui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Invoices */}
            {invoices.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Fatture ({invoices.length})
                </h4>
                <div className="space-y-2">
                  {invoices.map((item) => (
                    <div key={item.id} className="relative group">
                      <InvoiceCard 
                        invoice={item.item as Invoice} 
                        showQuickActions={false}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions */}
            {transactions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Movimenti ({transactions.length})
                </h4>
                <div className="space-y-2">
                  {transactions.map((item) => (
                    <div key={item.id} className="relative group">
                      <TransactionCard 
                        transaction={item.item as BankTransaction} 
                        showQuickActions={false}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match summary and action */}
            {canReconcile && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Equal className="h-4 w-4" />
                      <span>Bilancio: {formatCurrency(zone.totalAmount)}</span>
                    </div>
                    {zone.status === 'perfect' && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Gli importi corrispondono perfettamente
                      </div>
                    )}
                    {zone.status === 'close' && (
                      <div className="text-xs text-yellow-600 mt-1">
                        ⚠ Differenza minima negli importi
                      </div>
                    )}
                    {zone.status === 'different' && (
                      <div className="text-xs text-red-600 mt-1">
                        ✗ Gli importi non corrispondono
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => onReconcile(zone)}
                  disabled={zone.status === 'different'}
                  className={cn(
                    "w-full",
                    zone.status === 'perfect' 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-yellow-600 hover:bg-yellow-700"
                  )}
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  {zone.status === 'perfect' ? 'Riconcilia Automaticamente' : 'Riconcilia con Differenza'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DragDropReconciliation({
  showFilters = true,
  maxItems = 20,
  onReconciliationComplete
}: DragDropReconciliationProps) {
  const [invoiceFilters, setInvoiceFilters] = useState({
    status_filter: 'Aperta',
    size: maxItems,
  });
  const [transactionFilters, setTransactionFilters] = useState({
    status_filter: 'Da Riconciliare',
    size: maxItems,
  });
  const [matchZones, setMatchZones] = useState<MatchZone[]>([
    { id: 'zone-1', type: 'pending', items: [], totalAmount: 0, status: 'empty' },
    { id: 'zone-2', type: 'pending', items: [], totalAmount: 0, status: 'empty' },
    { id: 'zone-3', type: 'pending', items: [], totalAmount: 0, status: 'empty' },
  ]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);

  const { addNotification } = useUIStore();
  const performReconciliation = usePerformReconciliation();

  // Data fetching
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(invoiceFilters);
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(transactionFilters);

  const invoices = invoicesData?.items || [];
  const transactions = transactionsData?.items || [];

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Calculate zone status based on amounts
  const calculateZoneStatus = useCallback((items: DragData[]): MatchZone['status'] => {
    if (items.length === 0) return 'empty';
    
    const invoiceTotal = items
      .filter(item => item.type === 'invoice')
      .reduce((sum, item) => sum + (item.item as Invoice).total_amount, 0);
    
    const transactionTotal = items
      .filter(item => item.type === 'transaction')
      .reduce((sum, item) => sum + Math.abs((item.item as BankTransaction).amount), 0);
    
    const difference = Math.abs(invoiceTotal - transactionTotal);
    
    if (difference === 0) return 'perfect';
    if (difference < 1) return 'close'; // Less than 1 euro difference
    return 'different';
  }, []);

  // Update zone when items change
  const updateZone = useCallback((zoneId: string, items: DragData[]) => {
    setMatchZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const invoiceTotal = items
          .filter(item => item.type === 'invoice')
          .reduce((sum, item) => sum + (item.item as Invoice).total_amount, 0);
        
        const transactionTotal = items
          .filter(item => item.type === 'transaction')
          .reduce((sum, item) => sum + Math.abs((item.item as BankTransaction).amount), 0);
        
        return {
          ...zone,
          items,
          totalAmount: invoiceTotal - transactionTotal,
          status: calculateZoneStatus(items),
        };
      }
      return zone;
    }));
  }, [calculateZoneStatus]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged item
    const invoice = invoices.find(inv => `invoice-${inv.id}` === active.id);
    const transaction = transactions.find(trans => `transaction-${trans.id}` === active.id);
    
    if (invoice) {
      setDraggedItem({
        type: 'invoice',
        item: invoice,
        id: `invoice-${invoice.id}`,
      });
    } else if (transaction) {
      setDraggedItem({
        type: 'transaction',
        item: transaction,
        id: `transaction-${transaction.id}`,
      });
    }
  }, [invoices, transactions]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedItem(null);

    if (!over || !draggedItem) return;

    // Check if dropping on a match zone
    const zoneId = over.id as string;
    if (zoneId.startsWith('zone-')) {
      const targetZone = matchZones.find(zone => zone.id === zoneId);
      if (targetZone) {
        // Check if item is already in this zone
        const itemExists = targetZone.items.some(item => item.id === draggedItem.id);
        if (!itemExists) {
          // Remove item from other zones first
          const updatedZones = matchZones.map(zone => ({
            ...zone,
            items: zone.items.filter(item => item.id !== draggedItem.id),
          }));
          
          // Add item to target zone
          const newItems = [...targetZone.items, draggedItem];
          updateZone(zoneId, newItems);
          
          addNotification({
            type: 'info',
            title: 'Elemento aggiunto',
            message: `${draggedItem.type === 'invoice' ? 'Fattura' : 'Movimento'} aggiunto alla zona di riconciliazione`,
            duration: 2000,
          });
        }
      }
    }
  }, [draggedItem, matchZones, updateZone, addNotification]);

  // Remove item from zone
  const handleRemoveItem = useCallback((zoneId: string, itemId: string) => {
    const zone = matchZones.find(z => z.id === zoneId);
    if (zone) {
      const newItems = zone.items.filter(item => item.id !== itemId);
      updateZone(zoneId, newItems);
    }
  }, [matchZones, updateZone]);

  // Perform reconciliation
  const handleReconcile = useCallback(async (zone: MatchZone) => {
    const invoices = zone.items.filter(item => item.type === 'invoice');
    const transactions = zone.items.filter(item => item.type === 'transaction');
    
    if (invoices.length === 0 || transactions.length === 0) {
      addNotification({
        type: 'error',
        title: 'Riconciliazione Impossibile',
        message: 'Servono almeno una fattura e un movimento',
        duration: 3000,
      });
      return;
    }

    try {
      // For now, reconcile the first invoice with the first transaction
      // In a real implementation, you might want to handle multiple items differently
      const invoice = invoices[0].item as Invoice;
      const transaction = transactions[0].item as BankTransaction;
      
      await performReconciliation.mutateAsync({
        invoice_id: invoice.id,
        transaction_id: transaction.id,
        amount: Math.min(invoice.total_amount, Math.abs(transaction.amount)),
      });

      // Clear the zone after successful reconciliation
      updateZone(zone.id, []);
      
      onReconciliationComplete?.();
      
    } catch (error) {
      console.error('Reconciliation error:', error);
    }
  }, [performReconciliation, updateZone, addNotification, onReconciliationComplete]);

  // Custom collision detection
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First check for zones
    const zoneCollisions = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter(container => 
        container.id.toString().startsWith('zone-')
      ),
    });
    
    if (zoneCollisions.length > 0) {
      return zoneCollisions;
    }
    
    // Fallback to pointer detection
    return pointerWithin(args);
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const totalInZones = matchZones.reduce((sum, zone) => sum + zone.items.length, 0);
    const perfectMatches = matchZones.filter(zone => zone.status === 'perfect').length;
    const totalValue = matchZones.reduce((sum, zone) => {
      const invoiceTotal = zone.items
        .filter(item => item.type === 'invoice')
        .reduce((s, item) => s + (item.item as Invoice).total_amount, 0);
      return sum + invoiceTotal;
    }, 0);

    return {
      itemsInZones: totalInZones,
      perfectMatches,
      totalValue,
      availableInvoices: invoices.length,
      availableTransactions: transactions.length,
    };
  }, [matchZones, invoices.length, transactions.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <GitMerge className="h-6 w-6 text-purple-600" />
            Riconciliazione Drag & Drop
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Trascina fatture e movimenti nelle zone per creare riconciliazioni
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fatture Disponibili</p>
                <p className="text-2xl font-bold text-blue-600">{stats.availableInvoices}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Movimenti Disponibili</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.availableTransactions}</p>
              </div>
              <CreditCard className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Lavorazione</p>
                <p className="text-2xl font-bold text-orange-600">{stats.itemsInZones}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Match Perfetti</p>
                <p className="text-2xl font-bold text-green-600">{stats.perfectMatches}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valore Totale</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Stato Fatture</label>
                <Select
                  value={invoiceFilters.status_filter}
                  onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, status_filter: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aperta">Aperte</SelectItem>
                    <SelectItem value="Scaduta">Scadute</SelectItem>
                    <SelectItem value="Pagata Parz.">Pagate Parzialmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stato Movimenti</label>
                <Select
                  value={transactionFilters.status_filter}
                  onValueChange={(value) => setTransactionFilters(prev => ({ ...prev, status_filter: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Da Riconciliare">Da Riconciliare</SelectItem>
                    <SelectItem value="Riconciliato Parz.">Parzialmente Riconciliati</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Limite Risultati</label>
                <Select
                  value={maxItems.toString()}
                  onValueChange={(value) => {
                    const newLimit = parseInt(value);
                    setInvoiceFilters(prev => ({ ...prev, size: newLimit }));
                    setTransactionFilters(prev => ({ ...prev, size: newLimit }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 elementi</SelectItem>
                    <SelectItem value="20">20 elementi</SelectItem>
                    <SelectItem value="50">50 elementi</SelectItem>
                    <SelectItem value="100">100 elementi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Applica Filtri
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left side - Available items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Fatture Disponibili ({invoices.length})
                </CardTitle>
                <CardDescription>
                  Trascina le fatture nelle zone di riconciliazione
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Nessuna fattura disponibile</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <SortableContext 
                      items={invoices.map(inv => `invoice-${inv.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {invoices.map((invoice) => {
                        const isInZone = matchZones.some(zone => 
                          zone.items.some(item => item.id === `invoice-${invoice.id}`)
                        );
                        
                        if (isInZone) return null;
                        
                        return (
                          <SortableItem 
                            key={invoice.id} 
                            id={`invoice-${invoice.id}`}
                            data={{
                              type: 'invoice',
                              item: invoice,
                              id: `invoice-${invoice.id}`,
                            }}
                          >
                            <InvoiceCard invoice={invoice} />
                          </SortableItem>
                        );
                      })}
                    </SortableContext>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Movimenti Disponibili ({transactions.length})
                </CardTitle>
                <CardDescription>
                  Trascina i movimenti nelle zone di riconciliazione
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Nessun movimento disponibile</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <SortableContext 
                      items={transactions.map(trans => `transaction-${trans.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {transactions.map((transaction) => {
                        const isInZone = matchZones.some(zone => 
                          zone.items.some(item => item.id === `transaction-${transaction.id}`)
                        );
                        
                        if (isInZone) return null;
                        
                        return (
                          <SortableItem 
                            key={transaction.id} 
                            id={`transaction-${transaction.id}`}
                            data={{
                              type: 'transaction',
                              item: transaction,
                              id: `transaction-${transaction.id}`,
                            }}
                          >
                            <TransactionCard transaction={transaction} />
                          </SortableItem>
                        );
                      })}
                    </SortableContext>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right side - Match zones */}
          <div className="lg:col-span-2 space-y-4">
            <div className="sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Zone di Riconciliazione
              </h3>
              
              <div className="space-y-4">
                {matchZones.map((zone) => (
                  <div
                    key={zone.id}
                    id={zone.id}
                    className="transition-all"
                  >
                    <MatchZone
                      zone={zone}
                      onRemoveItem={(itemId) => handleRemoveItem(zone.id, itemId)}
                      onReconcile={handleReconcile}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedItem && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.05, rotate: 2 }}
              className="opacity-90"
            >
              {draggedItem.type === 'invoice' ? (
                <InvoiceCard 
                  invoice={draggedItem.item as Invoice} 
                  isDragOverlay={true}
                  showQuickActions={false}
                />
              ) : (
                <TransactionCard 
                  transaction={draggedItem.item as BankTransaction} 
                  isDragOverlay={true}
                  showQuickActions={false}
                />
              )}
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
