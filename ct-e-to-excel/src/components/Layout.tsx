import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex bg-background transition-colors duration-300">
      <Sidebar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
