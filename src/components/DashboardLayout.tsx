import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Shield, Menu, X, Bell, LogOut, ChevronLeft } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface Props {
  menuItems: MenuItem[];
  children: React.ReactNode;
  title: string;
  role: 'user' | 'admin';
}

const DashboardLayout: React.FC<Props> = ({ menuItems, children, title, role }) => {
  const { session, section, setSection, logout, db, refreshKey } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (db && role === 'admin') {
      const r = db.queryOne('SELECT COUNT(*) as c FROM admin_alerts WHERE is_read=0');
      setUnreadCount(r?.c || 0);
    }
  }, [db, role, refreshKey]);

  const isAdmin = role === 'admin';
  const accentClass = isAdmin ? 'text-secondary' : 'text-primary';
  const badgeClass = isAdmin ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
          <Shield className={`w-8 h-8 shrink-0 ${accentClass}`} />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className={`font-orbitron text-sm font-bold ${accentClass} truncate`}>PhishGuard AI</h2>
              {isAdmin && <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded font-semibold">ADMIN</span>}
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-muted-foreground">
            <X size={20} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block ml-auto text-muted-foreground hover:text-foreground">
            <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all
                ${section === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-sidebar-primary' : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <span className="text-lg shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: session?.avatarColor || '#00f5ff', color: '#0a0f1e' }}>
              {session?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{session?.name}</p>
                <span className={`text-[10px] ${badgeClass} px-1.5 py-0.5 rounded`}>
                  {isAdmin ? session?.adminLevel : 'USER'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card/50 backdrop-blur shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground">
            <Menu size={22} />
          </button>
          <h1 className="font-orbitron text-sm font-semibold truncate">{title}</h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">{clock}</span>
            {isAdmin && (
              <div className="relative">
                <button onClick={() => setBellOpen(!bellOpen)} className="relative text-muted-foreground hover:text-foreground">
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center bell-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            <button onClick={logout} className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition text-sm">
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
