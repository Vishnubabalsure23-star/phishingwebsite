import { useApp } from '@/contexts/AppContext';
import RoleSelection from '@/components/RoleSelection';
import AdminLogin from '@/components/AdminLogin';
import UserLogin from '@/components/UserLogin';
import UserRegister from '@/components/UserRegister';
import DashboardLayout from '@/components/DashboardLayout';
import UserDashboardHome from '@/components/UserDashboardHome';
import URLScanner from '@/components/URLScanner';
import ScanHistory from '@/components/ScanHistory';
import UserProfile from '@/components/UserProfile';
import AdminDashboardHome from '@/components/AdminDashboardHome';
import AdminAlerts from '@/components/AdminAlerts';
import AdminUsers from '@/components/AdminUsers';
import AdminScanHistory from '@/components/AdminScanHistory';
import AdminSettings from '@/components/AdminSettings';
import ChatSupport from '@/components/ChatSupport';
import ChatBubbleWidget from '@/components/ChatBubbleWidget';
import { Shield } from 'lucide-react';

const USER_MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'scanner', label: 'URL Scanner', icon: '🔍' },
  { id: 'history', label: 'My Scan History', icon: '📋' },
  { id: 'support', label: 'AI Support', icon: '🤖' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

const Index = () => {
  const { screen, section, db, refreshKey } = useApp();

  const unreadAlerts = db?.queryOne('SELECT COUNT(*) as c FROM admin_alerts WHERE is_read=0')?.c || 0;

  const ADMIN_MENU = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'alerts', label: 'Alerts Center', icon: '🚨', badge: unreadAlerts },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'analytics', label: 'All Scan History', icon: '📊' },
    { id: 'settings', label: 'System Settings', icon: '⚙️' },
  ];

  if (screen === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center fade-in-up">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4 spin-slow" />
          <h2 className="font-orbitron text-xl text-primary">PhishGuard AI</h2>
          <p className="text-muted-foreground text-sm mt-2">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (screen === 'role-selection') return <RoleSelection />;
  if (screen === 'admin-login') return <AdminLogin />;
  if (screen === 'user-login') return <UserLogin />;
  if (screen === 'user-register') return <UserRegister />;

  if (screen === 'user-dashboard') {
    const titles: Record<string, string> = { dashboard: 'Dashboard', scanner: 'URL Scanner', history: 'Scan History', support: 'AI Support', profile: 'Profile' };
    return (
      <DashboardLayout menuItems={USER_MENU} title={titles[section] || 'Dashboard'} role="user">
        {section === 'dashboard' && <UserDashboardHome />}
        {section === 'scanner' && <URLScanner />}
        {section === 'history' && <ScanHistory />}
        {section === 'support' && <ChatSupport />}
        {section === 'profile' && <UserProfile />}
      </DashboardLayout>
    );
  }

  if (screen === 'admin-dashboard') {
    const titles: Record<string, string> = { dashboard: 'Dashboard', alerts: 'Alerts Center', users: 'User Management', analytics: 'All Scan History', settings: 'System Settings' };
    return (
      <DashboardLayout menuItems={ADMIN_MENU} title={titles[section] || 'Dashboard'} role="admin">
        {section === 'dashboard' && <AdminDashboardHome />}
        {section === 'alerts' && <AdminAlerts />}
        {section === 'users' && <AdminUsers />}
        {section === 'analytics' && <AdminScanHistory />}
        {section === 'settings' && <AdminSettings />}
      </DashboardLayout>
    );
  }

  return (
    <>
      {/* Floating chat widget on role-selection page */}
      {screen === 'role-selection' && <ChatBubbleWidget />}
      {null}
    </>
  );
};

export default Index;
