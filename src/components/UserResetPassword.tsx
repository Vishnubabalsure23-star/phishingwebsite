import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Shield, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { checkStrength } from '@/lib/database';

const UserResetPassword = () => {
  const { db, setScreen, showToast } = useApp();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetData = sessionStorage.getItem('phishguard_reset_user');
  const resetUser = resetData ? JSON.parse(resetData) : null;

  const strength = checkStrength(newPw);

  const handleReset = () => {
    if (!db || !resetUser) {
      showToast('Invalid reset link. Please try again.', 'error');
      return;
    }
    if (newPw.length < 8) { showToast('Password must be 8+ characters', 'warning'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }

    db.run('UPDATE users SET password=? WHERE id=?', [newPw, resetUser.id]);
    sessionStorage.removeItem('phishguard_reset_user');
    setSuccess(true);
    showToast('Password updated successfully!', 'success');
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <ParticleCanvas />
        <div className="relative z-10 text-center fade-in-up">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-orbitron text-2xl text-primary mb-2">Password Updated!</h2>
          <p className="text-muted-foreground mb-6">Your password has been reset successfully.</p>
          <button onClick={() => setScreen('user-login')} className="btn-primary-glow px-8 py-3 rounded-lg font-semibold">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!resetUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <ParticleCanvas />
        <div className="relative z-10 text-center fade-in-up">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-orbitron text-xl text-destructive mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-6">This reset link is invalid or has expired.</p>
          <button onClick={() => setScreen('user-login')} className="btn-primary-glow px-8 py-3 rounded-lg font-semibold">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <ParticleCanvas />
      <div className="relative z-10 w-full max-w-md px-4">
        <button onClick={() => setScreen('user-login')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-6">
          <ArrowLeft size={18} /> Back to Login
        </button>
        <div className="glass-strong p-8 rounded-2xl glow-cyan">
          <div className="text-center mb-6">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-orbitron text-xl text-primary">Create New Password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Resetting password for <span className="text-primary">{resetUser.username}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New Password (8+ chars)"
                className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-10 text-foreground glow-input"
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {newPw && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex-1 h-1.5 rounded-full transition-colors" style={{ backgroundColor: i <= strength.score ? strength.color : 'hsl(var(--muted))' }} />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>{strength.level}</p>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                placeholder="Confirm Password"
                className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-10 text-foreground glow-input"
              />
              <button onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {confirmPw && newPw && (
              <p className={`text-xs ${newPw === confirmPw ? 'text-primary' : 'text-destructive'}`}>
                {newPw === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}

            <button
              onClick={handleReset}
              disabled={!newPw || !confirmPw}
              className="w-full btn-primary-glow py-3 rounded-lg font-semibold disabled:opacity-40"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserResetPassword;
