import { FileText, Moon, Sun, ChevronLeft, ChevronRight, LayoutDashboard, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    { path: '/history', label: 'Histórico', icon: History },
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]",
        "flex flex-col transition-all duration-300 ease-in-out relative z-10 shrink-0",
        collapsed ? "w-[60px]" : "w-56"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute -right-3 top-7 z-20 w-6 h-6 rounded-full",
          "bg-card border border-border shadow-sm",
          "flex items-center justify-center",
          "hover:bg-muted transition-colors duration-150",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>

      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-[hsl(var(--sidebar-border))] h-14 shrink-0",
        collapsed ? "justify-center px-0" : "px-4 gap-3"
      )}>
        <div className="w-8 h-8 rounded bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-display font-700 text-sm leading-tight tracking-wide text-foreground">
              CT-e Extractor
            </p>
            <p className="font-mono text-[10px] text-muted-foreground leading-none mt-0.5">
              v1.3.0
            </p>
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Navegação
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className={cn("flex-1 flex flex-col gap-1 py-2", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded transition-all duration-150 relative",
                "text-sm font-medium",
                collapsed ? "justify-center h-9 w-full" : "gap-3 px-3 h-9 w-full",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
              )}
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-[hsl(var(--sidebar-border))] py-3 shrink-0",
        collapsed ? "px-2" : "px-3"
      )}>
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? "Modo Claro" : "Modo Escuro"}
          className={cn(
            "flex items-center rounded transition-all duration-150 text-sm font-medium w-full",
            "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground",
            collapsed ? "justify-center h-9" : "gap-3 px-3 h-9"
          )}
        >
          {darkMode
            ? <Sun className="w-4 h-4 shrink-0 text-primary" />
            : <Moon className="w-4 h-4 shrink-0 text-muted-foreground" />
          }
          {!collapsed && (
            <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>
          )}
        </button>

        {!collapsed && (
          <p className="font-mono text-[10px] text-muted-foreground/50 text-center mt-3 pb-1">
            © 2025 CT-e Extractor
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
