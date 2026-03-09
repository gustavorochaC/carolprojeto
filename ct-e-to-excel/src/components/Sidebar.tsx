import { FileText, Moon, Sun, ChevronLeft, ChevronRight, LayoutDashboard, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar = ({ darkMode, onToggleDarkMode, collapsed, onToggleCollapse }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'Histórico', icon: FileSpreadsheet },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out relative z-10",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Collapse Toggle Button */}
      <div className="absolute -right-3 top-8 z-20">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6 rounded-full shadow-md bg-background border border-border hover:bg-muted transition-all hover:scale-110"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Logo Area */}
      <div className="p-4 flex items-center justify-center border-b border-border/50 h-16">
        <div className="flex items-center gap-3 w-full animate-fade-in">
          <div className={cn(
            "p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 transition-all duration-300",
            collapsed && "p-2"
          )}>
            <FileText className={cn("w-6 h-6", collapsed ? "w-6 h-6" : "w-6 h-6")} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap animate-slide-up">
              <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                CT-e Extractor
                <Sparkles className="w-3 h-3 text-amber" />
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">
                v1.2.0
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 flex flex-col gap-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button 
              key={item.path}
              variant={active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 relative overflow-hidden transition-all duration-200",
                collapsed && "justify-center px-0",
                !active && "hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                active && "bg-primary/10 text-primary"
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {!collapsed && <span className="animate-slide-up">{item.label}</span>}
              {active && !collapsed && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full animate-scale-in" />
              )}
              {active && collapsed && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          variant="outline"
          onClick={onToggleDarkMode}
          className={cn(
            "w-full gap-2 font-medium transition-all duration-200 hover:bg-muted",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          title={darkMode ? "Modo Claro" : "Modo Escuro"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber" />
          ) : (
            <Moon className="w-5 h-5 text-primary" />
          )}
          {!collapsed && <span className="animate-slide-up">{darkMode ? "Modo Claro" : "Modo Escuro"}</span>}
        </Button>
        
        {!collapsed && (
          <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/30">
            <p>CT-e Extractor v1.2.0</p>
            <p className="mt-0.5 opacity-60">© 2024</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
