import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  MoreHorizontal,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  TrendingUp,
  FileText,
  Globe,
  Hash,
  X,
  CheckCircle,
  AlertTriangle,
  Copy,
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Skeleton,
} from '@/components/ui';

// Components
import { AnagraphicsForm } from './AnagraphicsForm';

// Hooks
import { 
  useAnagraphics, 
  useDeleteAnagraphics, 
  useSearchAnagraphics,
  useBulkAnagraphicsOperations,
  useAnagraphicsStats,
  useExportAnagraphics
} from '@/hooks/useAnagraphics';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatVATNumber, 
  formatTaxCode, 
  formatPhoneNumber,
  formatAddress,
  formatScore
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Anagraphics, AnagraphicsFilters, AnagraphicsType } from '@/types';

interface AnagraphicsListProps {
  showActions?: boolean;
  showFilters?: boolean;
  maxItems?: number;
  embedded?: boolean;
  onAnagraphicsSelect?: (anagraphics: Anagraphics) => void;
  initialType?: AnagraphicsType;
}

interface SortConfig {
  key: keyof Anagraphics | 'score' | 'full_address';
  direction: 'asc' | 'desc';
}

export function AnagraphicsList({ 
  showActions = true, 
  showFilters = true, 
  maxItems,
  embedded = false,
  onAnagraphicsSelect,
  initialType
}: AnagraphicsListProps) {
  // State
  const [filters, setFilters] = useState<AnagraphicsFilters>({
    page: 1,
    size: maxItems || 50,
    type_filter: initialType,
  });
  const [selectedAnagraphics, setSelectedAnagraphics] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'denomination',
    direction: 'asc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnagraphicsDetail, setSelectedAnagraphicsDetail] = useState<Anagraphics | null>(null);
  const [showAnagraphicsForm, setShowAnagraphicsForm] = useState(false);
  const [editingAnagraphics, setEditingAnagraphics] = useState<Anagraphics | null>(null);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: anagraphicsData, isLoading, error, refetch } = useAnagraphics(filters);
  const deleteAnagraphics = useDeleteAnagraphics();
  const searchAnagraphics = useSearchAnagraphics();
  const { data: stats } = useAnagraphicsStats();
  const exportAnagraphics = useExportAnagraphics();
  const { bulkDelete } = useBulkAnagraphicsOperations();

  // Computed values
  const anagraphicsList = anagraphicsData?.items || [];
  const totalCount = anagraphicsData?.total || 0;
  const totalPages = Math.ceil(totalCount / (filters.size || 50));

  // Sorted anagraphics
  const sortedAnagraphics = useMemo(() => {
    const sorted = [...anagraphicsList].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Anagraphics];
      let bValue: any = b[sortConfig.key as keyof Anagraphics];

      // Handle special cases
      if (sortConfig.key === 'full_address') {
        aValue = formatAddress(a.address, a.city, a.cap, a.province, a.country);
        bValue = formatAddress(b.address, b.city, b.cap, b.province, b.country);
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

    return sorted;
  }, [anagraphicsList, sortConfig]);

  // Handlers
  const handleSort = useCallback((key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<AnagraphicsFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchQuery('');
      handleFilterChange({ search: undefined });
      return;
    }

    setSearchQuery(query);
    try {
      const response = await searchAnagraphics.mutateAsync({ 
        query, 
        type_filter: filters.type_filter 
      });
      if (response.success) {
        handleFilterChange({ search: query });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [searchAnagraphics, handleFilterChange, filters.type_filter]);

  const handleSelectAnagraphics = useCallback((anagraphicsId: number, checked: boolean) => {
    setSelectedAnagraphics(prev => {
      if (checked) {
        return [...prev, anagraphicsId];
      } else {
        return prev.filter(id => id !== anagraphicsId);
      }
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedAnagraphics(sortedAnagraphics.map(anagraphics => anagraphics.id));
    } else {
      setSelectedAnagraphics([]);
    }
  }, [sortedAnagraphics]);

  const handleDeleteAnagraphics = useCallback(async (anagraphicsId: number) => {
    const anagraphics = anagraphicsList.find(a => a.id === anagraphicsId);
    if (confirm(`Eliminare l'anagrafica "${anagraphics?.denomination}"?`)) {
      try {
        await deleteAnagraphics.mutateAsync(anagraphicsId);
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  }, [deleteAnagraphics, refetch, anagraphicsList]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAnagraphics.length === 0) return;
    
    if (confirm(`Eliminare ${selectedAnagraphics.length} anagrafiche selezionate?`)) {
      try {
        await bulkDelete.mutateAsync(selectedAnagraphics);
        setSelectedAnagraphics([]);
        refetch();
      } catch (error) {
        console.error('Bulk delete error:', error);
      }
    }
  }, [selectedAnagraphics, bulkDelete, refetch]);

  const handleExport = useCallback(async (format: 'excel' | 'csv' | 'json') => {
    try {
      await exportAnagraphics.mutateAsync({ format, filters });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportAnagraphics, filters]);

  const handleEdit = useCallback((anagraphics: Anagraphics) => {
    setEditingAnagraphics(anagraphics);
    setShowAnagraphicsForm(true);
  }, []);

  const handleFormSuccess = useCallback((anagraphics: Anagraphics) => {
    setShowAnagraphicsForm(false);
    setEditingAnagraphics(null);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setShowAnagraphicsForm(false);
    setEditingAnagraphics(null);
  }, []);

  // Render sort icon
  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Get anagraphics type icon
  const getTypeIcon = (type: AnagraphicsType) => {
    return type === 'Cliente' ? Users : Building2;
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const clients = sortedAnagraphics.filter(a => a.type === 'Cliente').length;
    const suppliers = sortedAnagraphics.filter(a => a.type === 'Fornitore').length;
    const avgScore = sortedAnagraphics.reduce((sum, a) => sum + a.score, 0) / (sortedAnagraphics.length || 1);
    const withPIVA = sortedAnagraphics.filter(a => a.piva).length;
    
    return { clients, suppliers, avgScore: Math.round(avgScore), withPIVA };
  }, [sortedAnagraphics]);

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento anagrafiche
              </h3>
              <p className="text-red-700 mb-4">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="border-red-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with summary stats */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-600" />
              Gestione Anagrafiche
            </h2>
            <div className="flex items-center gap-6 mt-2 text-sm">
              <span className="text-gray-600">
                {totalCount} anagrafiche totali
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Users className="h-4 w-4" />
                {summaryStats.clients} clienti
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Building2 className="h-4 w-4" />
                {summaryStats.suppliers} fornitori
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <Star className="h-4 w-4" />
                Score medio: {summaryStats.avgScore}
              </span>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Esporta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <Copy className="h-4 w-4 mr-2" />
                    JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline"
                onClick={() => setShowAnagraphicsForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Anagrafica
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Clienti</p>
                <p className="text-xl font-bold text-green-700">
                  {summaryStats.clients}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Fornitori</p>
                <p className="text-xl font-bold text-blue-700">
                  {summaryStats.suppliers}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Score Medio</p>
                <p className="text-xl font-bold text-yellow-700">
                  {summaryStats.avgScore}/100
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Con P.IVA</p>
                <p className="text-xl font-bold text-purple-700">
                  {summaryStats.withPIVA}
                </p>
              </div>
              <Hash className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cerca anagrafiche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select
                value={filters.type_filter || 'all'}
                onValueChange={(value) => 
                  handleFilterChange({ 
                    type_filter: value === 'all' ? undefined : value as AnagraphicsType
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="Cliente">Clienti</SelectItem>
                  <SelectItem value="Fornitore">Fornitori</SelectItem>
                </SelectContent>
              </Select>

              {/* City Filter */}
              <Input
                placeholder="Città"
                value={filters.city || ''}
                onChange={(e) => 
                  handleFilterChange({ city: e.target.value || undefined })
                }
              />

              {/* Province Filter */}
              <Input
                placeholder="Provincia"
                value={filters.province || ''}
                onChange={(e) => 
                  handleFilterChange({ province: e.target.value || undefined })
                }
                maxLength={2}
              />

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ page: 1, size: maxItems || 50 });
                    setSearchQuery('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedAnagraphics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedAnagraphics.length} anagrafiche selezionate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('excel')}
                    >
                      Esporta Selezionate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={bulkDelete.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAnagraphics([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAnagraphics.length === sortedAnagraphics.length && sortedAnagraphics.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">Tipo</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('denomination')}
                  >
                    <div className="flex items-center gap-2">
                      Denominazione
                      {renderSortIcon('denomination')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('piva')}
                  >
                    <div className="flex items-center gap-2">
                      P.IVA
                      {renderSortIcon('piva')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('full_address')}
                  >
                    <div className="flex items-center gap-2">
                      Indirizzo
                      {renderSortIcon('full_address')}
                    </div>
                  </TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center gap-2 justify-end">
                      Score
                      {renderSortIcon('score')}
                    </div>
                  </TableHead>
                  {showActions && <TableHead className="w-12">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      {showActions && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                    </TableRow>
                  ))
                ) : sortedAnagraphics.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={showActions ? 8 : 7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Nessuna anagrafica trovata
                          </p>
                          <p className="text-gray-600">
                            {searchQuery || Object.keys(filters).length > 2 
                              ? 'Prova a modificare i filtri di ricerca'
                              : 'Inizia creando la tua prima anagrafica'
                            }
                          </p>
                        </div>
                        {!searchQuery && Object.keys(filters).length <= 2 && (
                          <Button 
                            className="mt-2"
                            onClick={() => setShowAnagraphicsForm(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Crea Prima Anagrafica
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  sortedAnagraphics.map((anagraphics, index) => {
                    const TypeIcon = getTypeIcon(anagraphics.type);
                    const scoreData = formatScore(anagraphics.score);
                    const fullAddress = formatAddress(
                      anagraphics.address, 
                      anagraphics.city, 
                      anagraphics.cap, 
                      anagraphics.province, 
                      anagraphics.country
                    );
                    
                    return (
                      <motion.tr
                        key={anagraphics.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (onAnagraphicsSelect) {
                            onAnagraphicsSelect(anagraphics);
                          } else {
                            setSelectedAnagraphicsDetail(anagraphics);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedAnagraphics.includes(anagraphics.id)}
                            onCheckedChange={(checked) => 
                              handleSelectAnagraphics(anagraphics.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  anagraphics.type === 'Cliente' 
                                    ? "bg-green-100 text-green-600" 
                                    : "bg-blue-100 text-blue-600"
                                )}>
                                  <TypeIcon className="h-4 w-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{anagraphics.type}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium truncate max-w-xs" title={anagraphics.denomination}>
                              {anagraphics.denomination}
                            </p>
                            {anagraphics.cf && (
                              <p className="text-xs text-gray-500">
                                CF: {formatTaxCode(anagraphics.cf)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {anagraphics.piva ? (
                              <p className="font-mono text-sm">
                                {formatVATNumber(anagraphics.piva)}
                              </p>
                            ) : (
                              <p className="text-gray-400 text-sm">N/A</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate" title={fullAddress}>
                              {fullAddress}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {anagraphics.email && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-24" title={anagraphics.email}>
                                  {anagraphics.email}
                                </span>
                              </div>
                            )}
                            {anagraphics.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Phone className="h-3 w-3" />
                                <span>{formatPhoneNumber(anagraphics.phone)}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={scoreData.variant}>
                            {scoreData.text}
                          </Badge>
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
                                <DropdownMenuItem onClick={() => setSelectedAnagraphicsDetail(anagraphics)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizza
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(anagraphics)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplica
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Nuova Fattura
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Report Finanziario
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteAnagraphics(anagraphics.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!embedded && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((filters.page || 1) - 1) * (filters.size || 50) + 1} - {Math.min((filters.page || 1) * (filters.size || 50), totalCount)} di {totalCount} anagrafiche
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: (filters.page || 1) - 1 })}
              disabled={!filters.page || filters.page <= 1}
            >
              Precedente
            </Button>
            <span className="text-sm">
              Pagina {filters.page || 1} di {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: (filters.page || 1) + 1 })}
              disabled={!filters.page || filters.page >= totalPages}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      {/* Anagraphics Form Dialog */}
      <Dialog open={showAnagraphicsForm} onOpenChange={setShowAnagraphicsForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnagraphics ? 'Modifica Anagrafica' : 'Nuova Anagrafica'}
            </DialogTitle>
            <DialogDescription>
              {editingAnagraphics 
                ? `Modifica i dati di ${editingAnagraphics.denomination}`
                : 'Crea una nuova anagrafica cliente o fornitore'
              }
            </DialogDescription>
          </DialogHeader>
          
          <AnagraphicsForm
            anagraphics={editingAnagraphics || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            embedded={true}
            initialType={initialType}
          />
        </DialogContent>
      </Dialog>

      {/* Anagraphics Detail Modal */}
      <Dialog 
        open={!!selectedAnagraphicsDetail} 
        onOpenChange={() => setSelectedAnagraphicsDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dettagli Anagrafica
            </DialogTitle>
            <DialogDescription>
              Informazioni complete dell'anagrafica
            </DialogDescription>
          </DialogHeader>
          
          {selectedAnagraphicsDetail && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedAnagraphicsDetail.type === 'Cliente' ? 'success' : 'default'}>
                      {selectedAnagraphicsDetail.type}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Score Qualità</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={formatScore(selectedAnagraphicsDetail.score).variant}>
                      {formatScore(selectedAnagraphicsDetail.score).text}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Denomination */}
              <div>
                <label className="text-sm font-medium text-gray-600">Denominazione</label>
                <p className="text-lg font-bold mt-1">{selectedAnagraphicsDetail.denomination}</p>
              </div>

              {/* Fiscal Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Dati Fiscali</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Partita IVA</label>
                    <p className="font-mono">
                      {selectedAnagraphicsDetail.piva ? formatVATNumber(selectedAnagraphicsDetail.piva) : 'Non specificata'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Codice Fiscale</label>
                    <p className="font-mono">
                      {selectedAnagraphicsDetail.cf ? formatTaxCode(selectedAnagraphicsDetail.cf) : 'Non specificato'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-medium mb-3">Indirizzo</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium">
                    {formatAddress(
                      selectedAnagraphicsDetail.address,
                      selectedAnagraphicsDetail.city,
                      selectedAnagraphicsDetail.cap,
                      selectedAnagraphicsDetail.province,
                      selectedAnagraphicsDetail.country
                    )}
                  </p>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <h4 className="font-medium mb-3">Contatti</h4>
                <div className="grid grid-cols-1 gap-3">
                  {selectedAnagraphicsDetail.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{selectedAnagraphicsDetail.email}</span>
                    </div>
                  )}
                  {selectedAnagraphicsDetail.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{formatPhoneNumber(selectedAnagraphicsDetail.phone)}</span>
                    </div>
                  )}
                  {selectedAnagraphicsDetail.pec && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-500" />
                      <span>PEC: {selectedAnagraphicsDetail.pec}</span>
                    </div>
                  )}
                  {selectedAnagraphicsDetail.iban && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <span className="font-mono">{selectedAnagraphicsDetail.iban}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Electronic Invoice */}
              {selectedAnagraphicsDetail.codice_destinatario && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Fatturazione Elettronica</h4>
                  <p className="text-sm">
                    Codice Destinatario: <span className="font-mono">{selectedAnagraphicsDetail.codice_destinatario}</span>
                  </p>
                </div>
              )}

              {/* System Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Informazioni Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600">Creata il</label>
                    <p>{formatDate(selectedAnagraphicsDetail.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600">Aggiornata il</label>
                    <p>{formatDate(selectedAnagraphicsDetail.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingAnagraphics(selectedAnagraphicsDetail);
                      setSelectedAnagraphicsDetail(null);
                      setShowAnagraphicsForm(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplica
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Nuova Fattura
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedAnagraphicsDetail(null)}
                >
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
