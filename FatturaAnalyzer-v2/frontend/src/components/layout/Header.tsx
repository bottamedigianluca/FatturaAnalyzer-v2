import React from 'react';
import { Bell, Search, Settings, User, Moon, Sun, Monitor } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Store
import { useUIStore, useNotifications } from '@/store';
import type { Theme } from '@/types';

// Utils
import { cn } from '@/lib/utils';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/invoices': 'Fatture',
  '/transactions': 'Movimenti Bancari',
  '/reconciliation': 'Riconciliazione',
  '/anagraphics': 'Anagrafiche',
  '/analytics': 'Analytics',
  '/import': 'Import/Export',
  '/settings': 'Impostazioni',
};

export function Header() {
  const location = useLocation();
  const { theme, setTheme } = useUIStore();
  const notifications = useNotifications();
  
  const currentPageName = pageNames[location.pathname] || 'FatturaAnalyzer';
  const unreadNotifications = notifications.filter(n => n.type === 'error' || n.type === 'warning').length;

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    // Apply theme immediately
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left section - Page title and search */}
        <div className="flex items-center space-x-4 flex-1">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {currentPageName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestione fatture e riconciliazioni
            </p>
          </div>
          
          <div className="hidden md:flex relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca fatture, clienti, movimenti..."
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Right section - Actions and user menu */}
        <div className="flex items-center space-x-2">
          {/* Search button for mobile */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme toggle */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {theme === 'light' && <Sun className="h-4 w-4" />}
                      {theme === 'dark' && <Moon className="h-4 w-4" />}
                      {theme === 'system' && <Monitor className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cambia tema</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Tema</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleThemeChange('light')}
                  className={cn(theme === 'light' && 'bg-accent')}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Chiaro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleThemeChange('dark')}
                  className={cn(theme === 'dark' && 'bg-accent')}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Scuro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleThemeChange('system')}
                  className={cn(theme === 'system' && 'bg-accent')}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Notifications */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadNotifications > 0 && (
                        <Badge 
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                          variant="destructive"
                        >
                          {unreadNotifications}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifiche {unreadNotifications > 0 && `(${unreadNotifications})`}</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifiche</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nessuna notifica
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start p-3 cursor-default"
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            notification.type === 'error' && "bg-destructive",
                            notification.type === 'warning' && "bg-yellow-500",
                            notification.type === 'success' && "bg-green-500",
                            notification.type === 'info' && "bg-blue-500"
                          )} />
                          <span className="font-medium text-sm">{notification.title}</span>
                        </div>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        )}
                      </DropdownMenuItem>
                    ))}
                    
                    {notifications.length > 5 && (
                      <DropdownMenuItem className="text-center text-sm">
                        E altre {notifications.length - 5} notifiche...
                      </DropdownMenuItem>
                    )}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <a href="/settings">
                    <Settings className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Impostazioni</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profilo
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Impostazioni
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Disconnetti
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}