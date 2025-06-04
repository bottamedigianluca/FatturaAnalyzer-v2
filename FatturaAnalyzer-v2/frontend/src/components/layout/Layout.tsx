import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Components
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Store
import { useUIStore } from '@/store';

export function Layout() {
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* Header */}
        <Header />
        
        {/* Page content */}
        <main className="p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}