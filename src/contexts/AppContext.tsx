import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Database } from '@/lib/database';

export type Screen = 'loading' | 'role-selection' | 'admin-login' | 'user-login' | 'user-register' | 'user-dashboard' | 'admin-dashboard';

export interface Session {
  loggedIn: boolean;
  role: 'user' | 'admin';
  userId: number | null;
  username: string;
  name: string;
  email: string;
  avatarColor: string;
  adminLevel?: string;
  loginTime: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  db: Database | null;
  session: Session | null;
  setSession: (s: Session | null) => void;
  screen: Screen;
  setScreen: (s: Screen) => void;
  section: string;
  setSection: (s: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  toasts: Toast[];
  refreshKey: number;
  refresh: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [section, setSection] = useState('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const toastId = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (s) {
      const str = JSON.stringify(s);
      sessionStorage.setItem('phishguard_session', str);
    }
  }, []);

  const saveSessionPersistent = useCallback((s: Session) => {
    localStorage.setItem('phishguard_session', JSON.stringify(s));
  }, []);

  const logout = useCallback(() => {
    setSessionState(null);
    localStorage.removeItem('phishguard_session');
    sessionStorage.removeItem('phishguard_session');
    setScreen('role-selection');
    setSection('dashboard');
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const database = new Database();
      await database.init();
      setDb(database);

      const stored = sessionStorage.getItem('phishguard_session') || localStorage.getItem('phishguard_session');
      if (stored) {
        try {
          const s = JSON.parse(stored) as Session;
          if (s.loggedIn) {
            setSessionState(s);
            setScreen(s.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
            return;
          }
        } catch {}
      }
      setScreen('role-selection');
    };
    initApp();
  }, []);

  return (
    <AppContext.Provider value={{ db, session, setSession: (s) => { setSession(s); if (s) saveSessionPersistent(s); }, screen, setScreen, section, setSection, showToast, toasts, refreshKey, refresh, logout }}>
      {children}
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && '✅ '}
            {t.type === 'error' && '❌ '}
            {t.type === 'warning' && '⚠️ '}
            {t.type === 'info' && 'ℹ️ '}
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};
