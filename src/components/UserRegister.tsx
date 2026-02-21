import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { checkStrength } from '@/lib/database';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Shield, Check, X } from 'lucide-react';

const COLORS = ['#00f5ff', '#7c3aed', '#00ff88', '#ff6b35', '#ec4899', '#f59e0b'];

const UserRegister = () => {
  const { db, setScreen, showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirm: '', color: '#00f5ff' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const strength = checkStrength(form.password);
  const criteria = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'Contains number', met: /[0-9]/.test(form.password) },
    { label: 'Contains special character', met: /[!@#$%^&*]/.test(form.password) },
  ];

  const validate = (field: string, value: string) => {
    const newErrors = { ...errors };
    delete newErrors[field];

    if (field === 'name' && value.length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = 'Invalid email format';
      else if (db?.queryOne('SELECT id FROM users WHERE email=?', [value])) newErrors.email = 'Email already registered';
    }
    if (field === 'username') {
      if (value.length < 4 || /\s/.test(value)) newErrors.username = 'Min 4 chars, no spaces';
      else if (db?.queryOne('SELECT id FROM users WHERE username=?', [value])) {
        newErrors.username = 'Username taken';
        setSuggestions([`${value}_${Math.floor(Math.random() * 999)}`, `${value}${Math.floor(Math.random() * 99)}`]);
      } else setSuggestions([]);
    }
    if (field === 'confirm' && value !== form.password) newErrors.confirm = 'Passwords do not match';

    setErrors(newErrors);
  };

  const handleSubmit = () => {
    if (!db) return;
    // Validate all
    ['name', 'email', 'username', 'password', 'confirm'].forEach(f => validate(f, (form as any)[f]));
    if (!agreed) { showToast('Please agree to terms', 'warning'); return; }
    if (Object.keys(errors).length > 0 || strength.score < 3) { showToast('Please fix errors', 'warning'); return; }
    if (form.password !== form.confirm) { showToast('Passwords do not match', 'error'); return; }
    if (form.name.length < 3 || form.username.length < 4) { showToast('Please fix errors', 'warning'); return; }

    try {
      db.run(
        'INSERT INTO users (full_name,email,username,password,avatar_color,role,status,joined_date) VALUES (?,?,?,?,?,?,?,date("now"))',
        [form.name, form.email, form.username, form.password, form.color, 'user', 'active']
      );
      db.run(
        'INSERT INTO admin_alerts (type,message,reported_by,user_email) VALUES ("new_user",?,?,?)',
        [`New user registered: ${form.name} (@${form.username})`, form.username, form.email]
      );
      setSuccess(true);
      let c = 3;
      const id = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) { clearInterval(id); setScreen('user-login'); }
      }, 1000);
    } catch (e: any) {
      showToast(e.message || 'Registration failed', 'error');
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <ParticleCanvas />
        <div className="relative z-10 text-center fade-in-up">
          <div className="text-7xl mb-4 scale-in">✅</div>
          <h2 className="font-orbitron text-2xl text-accent mb-2">Account Created Successfully!</h2>
          <p className="text-muted-foreground mb-1">Welcome to PhishGuard AI, {form.name}!</p>
          <p className="text-muted-foreground text-sm">Redirecting to login in {countdown}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-auto py-8">
      <ParticleCanvas />
      <div className="relative z-10 w-full max-w-lg px-4">
        <button onClick={() => setScreen('user-login')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-4">
          <ArrowLeft size={18} /> Back to Login
        </button>
        <div className="glass-strong p-6 md:p-8 rounded-2xl glow-cyan">
          <div className="text-center mb-5">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="font-orbitron text-xl text-primary">Create Account</h2>
          </div>

          <div className="space-y-3">
            {/* Full Name */}
            <div>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={e => validate('name', e.target.value)} placeholder="Full Name"
                className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground glow-input" />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={e => validate('email', e.target.value)} placeholder="Email"
                className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground glow-input" />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Username */}
            <div>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                onBlur={e => validate('username', e.target.value)} placeholder="Username (min 4 chars)"
                className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground glow-input" />
              {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
              {suggestions.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { setForm({ ...form, username: s }); setSuggestions([]); setErrors(e => { const n = {...e}; delete n.username; return n; }); }}
                      className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20">{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <input type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Password (min 8 chars)"
                className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground glow-input" />
              {form.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="strength-bar h-full" style={{ width: `${strength.score * 25}%`, background: strength.color }} />
                    </div>
                    <span className="text-xs" style={{ color: strength.color }}>{strength.level}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {criteria.map(c => (
                      <div key={c.label} className="flex items-center gap-1 text-xs">
                        {c.met ? <Check size={12} className="text-accent" /> : <X size={12} className="text-destructive" />}
                        <span className={c.met ? 'text-accent' : 'text-muted-foreground'}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <input type="password" value={form.confirm}
                onChange={e => { setForm({ ...form, confirm: e.target.value }); if (e.target.value) validate('confirm', e.target.value); }}
                placeholder="Confirm Password"
                className="w-full bg-input border border-border rounded-lg py-2.5 px-4 text-foreground glow-input" />
              {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
            </div>

            {/* Avatar Color */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Avatar Color</label>
              <div className="flex gap-3">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-foreground scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border bg-input accent-primary" />
              I agree to the Terms of Service and Privacy Policy
            </label>

            <button onClick={handleSubmit} className="w-full btn-primary-glow py-3 rounded-lg font-semibold">
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
