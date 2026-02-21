import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { checkStrength } from '@/lib/database';
import { Save, AlertTriangle } from 'lucide-react';

const COLORS = ['#00f5ff', '#7c3aed', '#00ff88', '#ff6b35', '#ec4899', '#f59e0b'];

const UserProfile = () => {
  const { db, session, setSession, showToast, refreshKey, logout } = useApp();
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', username: '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    if (!db || !session?.userId) return;
    const u = db.queryOne('SELECT * FROM users WHERE id=?', [session.userId]);
    if (u) { setUser(u); setForm({ name: u.full_name, email: u.email, username: u.username }); }
    setLoginHistory(db.query('SELECT * FROM login_history WHERE user_id=? ORDER BY login_time DESC LIMIT 5', [session.userId]));
  }, [db, session, refreshKey]);

  const saveProfile = () => {
    if (!db || !user) return;
    if (form.name.length < 3) { showToast('Name too short', 'warning'); return; }
    if (form.username !== user.username && db.queryOne('SELECT id FROM users WHERE username=? AND id!=?', [form.username, user.id])) {
      showToast('Username taken', 'error'); return;
    }
    db.run('UPDATE users SET full_name=?, email=?, username=? WHERE id=?', [form.name, form.email, form.username, user.id]);
    setSession({ ...session!, name: form.name, email: form.email, username: form.username });
    showToast('Profile updated', 'success');
    setEditing(false);
  };

  const changePassword = () => {
    if (!db || !user) return;
    if (pwForm.current !== user.password) { showToast('Current password wrong', 'error'); return; }
    const str = checkStrength(pwForm.newPw);
    if (str.score < 3) { showToast('Password too weak', 'warning'); return; }
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match', 'error'); return; }
    db.run('UPDATE users SET password=? WHERE id=?', [pwForm.newPw, user.id]);
    showToast('Password updated', 'success');
    setPwForm({ current: '', newPw: '', confirm: '' });
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== session?.username) { showToast('Username does not match', 'error'); return; }
    if (!db || !session?.userId) return;
    db.run('DELETE FROM scan_history WHERE scanned_by=?', [session.userId]);
    db.run('DELETE FROM admin_alerts WHERE reported_by=?', [session.username]);
    db.run('DELETE FROM login_history WHERE user_id=?', [session.userId]);
    db.run('DELETE FROM users WHERE id=?', [session.userId]);
    showToast('Account deleted', 'info');
    logout();
  };

  const changeColor = (color: string) => {
    if (!db || !user) return;
    db.run('UPDATE users SET avatar_color=? WHERE id=?', [color, user.id]);
    setSession({ ...session!, avatarColor: color });
    setUser({ ...user, avatar_color: color });
    showToast('Avatar updated', 'success');
  };

  if (!user) return null;

  const strength = checkStrength(pwForm.newPw);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-orbitron text-lg">Profile</h2>

      {/* Avatar */}
      <div className="glass p-6 rounded-2xl flex items-center gap-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold font-orbitron shrink-0"
          style={{ background: user.avatar_color, color: '#0a0f1e' }}>
          {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h3 className="font-orbitron text-lg text-foreground">{user.full_name}</h3>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
          <div className="flex gap-2 mt-3">
            {COLORS.map(c => (
              <button key={c} onClick={() => changeColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${user.avatar_color === c ? 'ring-2 ring-foreground scale-110' : 'opacity-50 hover:opacity-100'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-orbitron text-sm text-muted-foreground">Account Info</h3>
          <button onClick={() => editing ? saveProfile() : setEditing(true)}
            className="btn-primary-glow px-4 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
            <Save size={14} /> {editing ? 'Save' : 'Edit'}
          </button>
        </div>
        {['name', 'email', 'username'].map(field => (
          <div key={field}>
            <label className="text-xs text-muted-foreground capitalize">{field === 'name' ? 'Full Name' : field}</label>
            <input value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
              disabled={!editing}
              className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1 disabled:opacity-60 glow-input" />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Member Since', value: user.joined_date, icon: '📅' },
          { label: 'Total Scans', value: user.total_scans, icon: '🔍' },
          { label: 'Alerts', value: user.alerts_triggered, icon: '🚨' },
          { label: 'Last Login', value: user.last_login?.split(' ')[0] || 'N/A', icon: '🕐' },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <span className="text-xl">{s.icon}</span>
            <p className="text-foreground font-semibold text-sm mt-1">{s.value}</p>
            <p className="text-muted-foreground text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="glass p-6 rounded-2xl space-y-3">
        <h3 className="font-orbitron text-sm text-muted-foreground">Change Password</h3>
        <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
          placeholder="Current Password" className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground glow-input" />
        <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
          placeholder="New Password" className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground glow-input" />
        {pwForm.newPw && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="strength-bar h-full" style={{ width: `${strength.score * 25}%`, background: strength.color }} />
            </div>
            <span className="text-xs" style={{ color: strength.color }}>{strength.level}</span>
          </div>
        )}
        <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
          placeholder="Confirm New Password" className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground glow-input" />
        <button onClick={changePassword} className="btn-primary-glow px-6 py-2 rounded-lg text-sm">Update Password</button>
      </div>

      {/* Login History */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="font-orbitron text-sm text-muted-foreground mb-3">Login History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="p-2 text-left text-muted-foreground">#</th>
              <th className="p-2 text-left text-muted-foreground">Date & Time</th>
              <th className="p-2 text-left text-muted-foreground">Device</th>
              <th className="p-2 text-left text-muted-foreground">IP</th>
            </tr></thead>
            <tbody>
              {loginHistory.map((l, i) => (
                <tr key={l.id} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">{l.login_time}</td>
                  <td className="p-2 text-muted-foreground">{l.device}</td>
                  <td className="p-2 text-muted-foreground">{l.ip_address}</td>
                </tr>
              ))}
              {loginHistory.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No login history</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass p-6 rounded-2xl border border-destructive/30">
        <h3 className="font-orbitron text-sm text-destructive mb-3 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger Zone
        </h3>
        <p className="text-muted-foreground text-sm mb-3">Delete your account and all associated data. This is irreversible.</p>
        <button onClick={() => setDeleteConfirm(true)} className="btn-danger text-sm px-4 py-2">
          ⚠️ Delete My Account
        </button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">Delete Account</h3>
            <p className="text-muted-foreground text-sm mb-3">Type your username <span className="text-foreground font-mono">"{session?.username}"</span> to confirm:</p>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              className="w-full bg-input border border-destructive/30 rounded-lg py-2 px-3 text-sm text-foreground mb-3" />
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== session?.username}
                className="flex-1 py-2 btn-danger text-sm disabled:opacity-30">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
