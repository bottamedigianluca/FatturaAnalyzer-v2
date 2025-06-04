import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  GitMerge,
  Users,
  BarChart3,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Store
import { useUIStore } from '@/store';

// Utils
import { cn } from '@/lib/utils';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Panoramica generale',
  },
  {
    title: 'Fatture',
    href: '/invoices',
    icon: FileText,
    description: 'Gestione fatture attive e passive',
  },
  {
    title: 'Movimenti',
    href: '/transactions',
    icon: CreditCard,
    description: 'Movimenti bancari e transazioni',
  },
  {
    title: 'Riconciliazione',
    href: '/reconciliation',
    icon: GitMerge,
    description: 'Riconciliazione fatture e pagamenti',
    badge: 'NEW',
  },
  {
    title: 'Anagrafiche',
    href: '/anagraphics',
    icon: Users,
    description: 'Clienti e fornitori',
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Report e analisi dati',
  },
  {
    title: 'Import/Export',
    href: '/import',
    icon: Upload,
    description: 'Importazione ed esportazione dati',
  },
  {
    title: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    description: 'Configurazione applicazione',
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <TooltipProvider>
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen border-r bg-background transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">FatturaAnalyzer</span>
                  <span className="text-xs text-muted-foreground">v2.0</span>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "h-8 w-8",
                sidebarCollapsed && "mx-auto"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground"
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        {item.badge && (
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs">
                            {typeof item.badge === 'string' ? item.badge.slice(0, 2) : item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <div className="text-center">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            {!sidebarCollapsed ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Stato Sistema
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">Backend connesso</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs">Sincronizzazione attiva</span>
                </div>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sistema operativo</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}