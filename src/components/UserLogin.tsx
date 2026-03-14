import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Shield, Eye, EyeOff, User, Lock } from 'lucide-react';
import EmailResetTemplate from './EmailResetTemplate';

const UserLogin = () => {
  const { db, setScreen, setSession, showToast, setSection } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockTimer, setLockTimer] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotId, setForgotId] = useState('');
  const [forgotUser, setForgotUser] = useState<any>(null);

  useEffect(() => {
    if (lockTimer <= 0) return;
    const id = setInterval(() => setLockTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [lockTimer]);

  const handleLogin = () => {
    if (!db || lockTimer > 0) return;
    if (!identifier.trim() || !password) {
      showToast('Please fill in all fields', 'warning'); return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = db.queryOne(
        'SELECT * FROM users WHERE (username=? OR email=?) AND password=?',
        [identifier.trim(), identifier.trim(), password]
      );
      if (!user) {
        const newFails = failCount + 1;
        setFailCount(newFails);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        if (newFails >= 3) { setLockTimer(30); setFailCount(0); showToast('Too many attempts. Locked 30s.', 'error'); }
        else showToast('Invalid credentials', 'error');
        setLoading(false); return;
      }
      if (user.status === 'inactive') {
        showToast('Account deactivated. Contact admin.', 'error');
        setLoading(false); return;
      }
      db.run('UPDATE users SET last_login=datetime("now") WHERE id=?', [user.id]);
      db.run('INSERT INTO login_history (user_id,username,ip_address) VALUES (?,?,?)',
        [user.id, user.username, '192.168.1.' + Math.floor(Math.random() * 255)]);
      const session = {
        loggedIn: true, role: 'user' as const, userId: user.id,
        username: user.username, name: user.full_name,
        email: user.email, avatarColor: user.avatar_color,
        loginTime: Date.now()
      };
      if (remember) localStorage.setItem('phishguard_session', JSON.stringify(session));
      else sessionStorage.setItem('phishguard_session', JSON.stringify(session));
      setSession(session);
      setSection('dashboard');
      setTimeout(() => { setScreen('user-dashboard'); setLoading(false); }, 1500);
    }, 800);
  };

  const handleForgotFind = () => {
    if (!db) return;
    const user = db.queryOne('SELECT * FROM users WHERE username=? OR email=?', [forgotId, forgotId]);
    if (!user) { showToast('Account not found', 'error'); return; }
    setForgotUser(user);
    // Store reset user ID for the reset screen
    sessionStorage.setItem('phishguard_reset_user', JSON.stringify({ id: user.id, email: user.email, username: user.username }));
    setForgotStep(2);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <ParticleCanvas />
      <div className="relative z-10 w-full max-w-md px-4">
        <button onClick={() => setScreen('role-selection')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-6">
          <ArrowLeft size={18} /> Back
        </button>
        <div className={`glass-strong p-8 rounded-2xl glow-cyan ${shaking ? 'shake' : ''}`}>
          <div className="text-center mb-6">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-orbitron text-xl text-primary">User Login</h2>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Username or Email"
                className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-4 text-foreground glow-input"
                disabled={lockTimer > 0}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Password"
                className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-10 text-foreground glow-input"
                disabled={lockTimer > 0}
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-input accent-primary" />
                Remember Me
              </label>
              <button type="button" onClick={() => setShowForgot(true)} className="text-primary hover:underline font-medium">
                Forgot Password?
              </button>
            </div>

            <button onClick={handleLogin} disabled={loading || lockTimer > 0}
              className="w-full btn-primary-glow py-3 rounded-lg font-semibold disabled:opacity-40">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : lockTimer > 0 ? `Locked (${lockTimer}s)` : 'Login'}
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
            New here?{' '}
            <button onClick={() => setScreen('user-register')} className="text-primary hover:underline font-medium">
              Create Account →
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password - Contact Admin Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowForgot(false)}>
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4 glow-cyan" onClick={e => e.stopPropagation()}>
            <h3 className="font-orbitron text-lg text-primary mb-4">Reset Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              To reset your password, please contact an administrator:
            </p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg p-3">
                <Shield className="text-primary shrink-0" size={20} />
                <div>
                  <p className="text-sm font-medium text-foreground">Vishnu Babalsure</p>
                  <a href="mailto:vishnubabalsure@gmail.com" className="text-xs text-primary hover:underline">vishnubabalsure@gmail.com</a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg p-3">
                <Shield className="text-primary shrink-0" size={20} />
                <div>
                  <p className="text-sm font-medium text-foreground">Nilesh Chatap</p>
                  <a href="mailto:nileshchatap25@gmail.com" className="text-xs text-primary hover:underline">nileshchatap25@gmail.com</a>
                </div>
              </div>
            </div>
            <button onClick={() => setShowForgot(false)} className="w-full btn-primary-glow py-2.5 rounded-lg font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLogin;
