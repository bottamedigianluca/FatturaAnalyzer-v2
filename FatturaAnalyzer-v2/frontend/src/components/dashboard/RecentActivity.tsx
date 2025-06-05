import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  FileText,
  CreditCard,
  Users,
  Target,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  Send,
  Eye,
  Clock,
  User,
  Building2,
  Zap,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Skeleton,
} from '@/components/ui';

// Hooks
import { useRecentActivity } from '@/hooks/useActivity';
import { useUIStore } from '@/store';

// Utils
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  formatDateTime 
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ActivityItem {
  id: string;
  type: 'invoice' | 'transaction' | 'anagraphics' | 'reconciliation' | 'import' | 'export' | 'system';
  action: 'created' | 'updated' | 'deleted' | 'paid' | 'reconciled' | 'imported' | 'exported' | 'error';
  title: string;
  description?: string;
  amount?: number;
  user?: string;
  timestamp: string;
  entity_id?: number;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface RecentActivityProps {
  maxItems?: number;
  embedded?: boolean;
  showFilters?: boolean;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  activityTypes?: ActivityItem['type'][];
}

export function RecentActivity({ 
  maxItems = 50, 
  embedded = false, 
  showFilters = true,
  timeRange = '24h',
  activityTypes
}: RecentActivityProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState(timeRange);

  // Hooks
  const { addNotification } = useUIStore();
  const { data: activities, isLoading, error, refetch } = useRecentActivity({
    limit: maxItems,
    period: filterPeriod,
    types: activityTypes,
  });

  // Filter activities by type
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    
    let filtered = activities;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }
    
    if (activeTab !== 'all') {
      filtered = filtered.filter(activity => {
        switch (activeTab) {
          case 'documents':
            return ['invoice', 'anagraphics'].includes(activity.type);
          case 'transactions':
            return ['transaction', 'reconciliation'].includes(activity.type);
          case 'system':
            return ['import', 'export', 'system'].includes(activity.type);
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [activities, filterType, activeTab]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    
    filteredActivities.forEach(activity => {
      const date = formatDate(activity.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return groups;
  }, [filteredActivities]);

  // Get activity icon
  const getActivityIcon = (type: ActivityItem['type'], action: ActivityItem['action']) => {
    switch (type) {
      case 'invoice':
        return action === 'created' ? Plus : action === 'updated' ? Edit : action === 'paid' ? CheckCircle : FileText;
      case 'transaction':
        return CreditCard;
      case 'anagraphics':
        return action === 'created' ? Plus : action === 'updated' ? Edit : Users;
      case 'reconciliation':
        return Target;
      case 'import':
        return Upload;
      case 'export':
        return Download;
      case 'system':
        return Zap;
      default:
        return Activity;
    }
  };

  // Get activity color
  const getActivityColor = (type: ActivityItem['type'], action: ActivityItem['action'], severity?: string) => {
    if (severity === 'critical' || action === 'error') return 'text-red-600 bg-red-100';
    if (severity === 'high') return 'text-orange-600 bg-orange-100';
    
    switch (action) {
      case 'created':
        return 'text-green-600 bg-green-100';
      case 'updated':
        return 'text-blue-600 bg-blue-100';
      case 'deleted':
        return 'text-red-600 bg-red-100';
      case 'paid':
      case 'reconciled':
        return 'text-green-600 bg-green-100';
      case 'imported':
      case 'exported':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get action label
  const getActionLabel = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created': return 'Creato';
      case 'updated': return 'Modificato';
      case 'deleted': return 'Eliminato';
      case 'paid': return 'Pagato';
      case 'reconciled': return 'Riconciliato';
      case 'imported': return 'Importato';
      case 'exported': return 'Esportato';
      case 'error': return 'Errore';
      default: return action;
    }
  };

  // Calculate activity stats
  const activityStats = useMemo(() => {
    if (!filteredActivities.length) return {
      total: 0,
      errors: 0,
      success: 0,
      mostActive: null,
    };

    const total = filteredActivities.length;
    const errors = filteredActivities.filter(a => a.action === 'error' || a.severity === 'critical').length;
    const success = filteredActivities.filter(a => 
      ['created', 'updated', 'paid', 'reconciled', 'imported', 'exported'].includes(a.action)
    ).length;

    // Find most active type
    const typeCounts = filteredActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActive = Object.entries(typeCounts).reduce((a, b) => 
      typeCounts[a[0]] > typeCounts[b[0]] ? a : b
    )[0];

    return { total, errors, success, mostActive };
  }, [filteredActivities]);

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
    addNotification({
      type: 'info',
      title: 'Attività aggiornata',
      message: 'Lista attività aggiornata con successo',
      duration: 2000,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(!embedded && "")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Attività Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Errore nel caricamento attività
              </h3>
              <p className="text-red-700">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="h-6 w-6 text-blue-600" />
              Attività Recente
            </h2>
            <p className="text-gray-600 mt-1">
              {activityStats.total} attività nelle ultime {filterPeriod === '1h' ? 'ora' : 
                filterPeriod === '24h' ? '24 ore' : 
                filterPeriod === '7d' ? '7 giorni' : '30 giorni'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Aggiorna
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!embedded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Totale Attività</p>
                  <p className="text-xl font-bold text-gray-900">
                    {activityStats.total}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Successi</p>
                  <p className="text-xl font-bold text-green-700">
                    {activityStats.success}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Errori</p>
                  <p className="text-xl font-bold text-red-700">
                    {activityStats.errors}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Più Attivo</p>
                  <p className="text-lg font-bold text-purple-700 capitalize">
                    {activityStats.mostActive || 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filtri:</span>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo attività" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="invoice">Fatture</SelectItem>
                  <SelectItem value="transaction">Transazioni</SelectItem>
                  <SelectItem value="anagraphics">Anagrafiche</SelectItem>
                  <SelectItem value="reconciliation">Riconciliazioni</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Ultima ora</SelectItem>
                  <SelectItem value="24h">Ultime 24 ore</SelectItem>
                  <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                  <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto text-sm text-gray-500">
                {filteredActivities.length} attività
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tutte
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documenti
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transazioni
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {Object.keys(groupedActivities).length === 0 ? (
            // Empty state
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessuna attività recente
                </h3>
                <p className="text-gray-600">
                  Non ci sono attività da mostrare per i filtri selezionati
                </p>
              </CardContent>
            </Card>
          ) : (
            // Activity Timeline
            Object.entries(groupedActivities)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dayActivities]) => (
                <Card key={date}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      {date}
                      <Badge variant="outline" className="ml-auto">
                        {dayActivities.length} attività
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dayActivities
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((activity, index) => {
                        const Icon = getActivityIcon(activity.type, activity.action);
                        const colorClass = getActivityColor(activity.type, activity.action, activity.severity);
                        
                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {/* Activity Icon */}
                            <div className={cn("p-2 rounded-full", colorClass)}>
                              <Icon className="h-4 w-4" />
                            </div>

                            {/* Activity Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {activity.title}
                                  </p>
                                  {activity.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {activity.description}
                                    </p>
                                  )}
                                  
                                  {/* Activity metadata */}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(activity.timestamp)}
                                    </span>
                                    
                                    {activity.user && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {activity.user}
                                      </span>
                                    )}
                                    
                                    <Badge variant="outline" className="text-xs">
                                      {getActionLabel(activity.action)}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Amount or additional info */}
                                <div className="text-right ml-3">
                                  {activity.amount && (
                                    <p className="font-medium text-gray-900">
                                      {formatCurrency(activity.amount)}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {formatDateTime(activity.timestamp).split(' ')[1]}
                                  </p>
                                </div>
                              </div>

                              {/* Action buttons for certain activities */}
                              {(activity.entity_id && ['invoice', 'transaction', 'anagraphics'].includes(activity.type)) && (
                                <div className="flex items-center gap-2 mt-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-2">
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Visualizza dettagli</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  {activity.type === 'invoice' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 px-2">
                                            <ArrowRight className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Vai alla fattura</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Load More Button */}
      {!embedded && filteredActivities.length >= maxItems && (
        <div className="text-center">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Carica più attività
          </Button>
        </div>
      )}
    </div>
  );
}
