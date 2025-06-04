import React from 'react';
import { Crown, TrendingUp, Calendar, Star } from 'lucide-react';

// Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Utils
import { formatCurrency, formatCurrencyCompact, formatDate, formatScore } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { TopClientData } from '@/types';

interface TopClientsTableProps {
  data: TopClientData[];
  maxItems?: number;
  showActions?: boolean;
}

export function TopClientsTable({ 
  data, 
  maxItems = 10, 
  showActions = false 
}: TopClientsTableProps) {
  // Ordina per fatturato e limita
  const sortedClients = data
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, maxItems);

  if (!sortedClients || sortedClients.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nessun cliente trovato</p>
          <p className="text-xs mt-1">Importa fatture per visualizzare i top clienti</p>
        </div>
      </div>
    );
  }

  // Calcola totali per percentuali
  const totalRevenue = sortedClients.reduce((sum, client) => sum + client.total_revenue, 0);

  return (
    <div className="space-y-4">
      {/* Header con statistiche veloci */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Top {sortedClients.length} clienti per fatturato
        </div>
        <div className="text-xs text-muted-foreground">
          Totale: {formatCurrencyCompact(totalRevenue)}
        </div>
      </div>

      {/* Lista clienti */}
      <div className="space-y-3">
        {sortedClients.map((client, index) => {
          const revenuePercentage = totalRevenue > 0 ? (client.total_revenue / totalRevenue) * 100 : 0;
          const scoreData = formatScore(client.score);
          
          return (
            <div
              key={client.id}
              className={cn(
                "flex items-center space-x-4 p-3 rounded-lg border transition-colors hover:bg-accent/50",
                index === 0 && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
                index === 1 && "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800",
                index === 2 && "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
              )}
            >
              {/* Posizione e Badge */}
              <div className="flex items-center space-x-2 min-w-0">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                  index === 0 && "bg-yellow-500 text-white",
                  index === 1 && "bg-gray-400 text-white", 
                  index === 2 && "bg-orange-500 text-white",
                  index > 2 && "bg-muted text-muted-foreground"
                )}>
                  {index === 0 ? <Crown className="w-3 h-3" /> : index + 1}
                </div>
                
                {/* Badges speciali */}
                {index === 0 && (
                  <Badge variant="warning" className="text-xs">🏆 Top</Badge>
                )}
                {client.score >= 90 && (
                  <Badge variant="success" className="text-xs">⭐ VIP</Badge>
                )}
              </div>

              {/* Info Cliente */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate" title={client.denomination}>
                      {client.denomination}
                    </p>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        <span>{client.num_invoices} fatture</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3" />
                        <span className={scoreData.variant === 'success' ? 'text-green-600' : 
                                       scoreData.variant === 'warning' ? 'text-yellow-600' : 'text-red-600'}>
                          {scoreData.text}
                        </span>
                      </div>
                      {client.last_order_date && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Ultimo: {formatDate(client.last_order_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Valori Revenue */}
                  <div className="text-right ml-3">
                    <p className="font-bold text-sm">
                      {formatCurrency(client.total_revenue)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {revenuePercentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrencyCompact(client.avg_order_value)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar per Revenue Percentage */}
                <div className="mt-2">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === 0 && "bg-yellow-500",
                        index === 1 && "bg-gray-400",
                        index === 2 && "bg-orange-500",
                        index > 2 && "bg-primary"
                      )}
                      style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Vedi dettagli cliente"
                  >
                    👁️
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Nuova fattura"
                  >
                    ➕
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer con insights */}
      {sortedClients.length >= 3 && (
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Top 3 clienti</p>
              <p className="font-medium">
                {((sortedClients.slice(0, 3).reduce((sum, c) => sum + c.total_revenue, 0) / totalRevenue) * 100).toFixed(1)}%
              </p>
              <p className="text-muted-foreground">del fatturato</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valore medio ordine</p>
              <p className="font-medium">
                {formatCurrencyCompact(
                  sortedClients.reduce((sum, c) => sum + c.avg_order_value, 0) / sortedClients.length
                )}
              </p>
              <p className="text-muted-foreground">per cliente</p>
            </div>
          </div>
        </div>
      )}

      {/* Link per vedere tutti */}
      {data.length > maxItems && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            Vedi tutti i {data.length} clienti
          </Button>
        </div>
      )}
    </div>
  );
}