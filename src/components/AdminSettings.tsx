import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Eye, EyeOff, Copy, Trash2, Plus, RefreshCw, AlertTriangle } from 'lucide-react';

const AdminSettings = () => {
  const { db, showToast, refresh, refreshKey } = useApp();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [sensitivity, setSensitivity] = useState(7);
  const [autoBlock, setAutoBlock] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState('65');
  const [resetConfirm, setResetConfirm] = useState(0);
  const [resetInput, setResetInput] = useState('');

  useEffect(() => {
    if (!db) return;
    const rows = db.query('SELECT * FROM system_settings');
    const s: Record<string, string> = {};
    rows.forEach((r: any) => { s[r.key] = r.value; });
    setSettings(s);
    setSensitivity(parseInt(s.sensitivity || '7'));
    setAutoBlock(s.auto_block === 'true');
    setAlertThreshold(s.alert_threshold || '65');
    setBlacklist(db.query('SELECT * FROM blacklist ORDER BY added_at DESC'));
  }, [db, refreshKey]);

  const saveSetting = (key: string, value: string) => {
    db!.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', [key, value]);
    showToast('Setting saved', 'success');
  };

  const regenerateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const key = 'pg-api-' + Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    saveSetting('api_key', key);
    setSettings({ ...settings, api_key: key });
    showToast('API key regenerated', 'success');
  };

  const addToBlacklist = () => {
    if (!newDomain.trim()) return;
    try {
      db!.run('INSERT OR IGNORE INTO blacklist (domain, added_by) VALUES (?, "Admin")', [newDomain.trim()]);
      setNewDomain('');
      refresh();
      showToast('Domain added to blacklist', 'success');
    } catch { showToast('Already in blacklist', 'warning'); }
  };

  const removeDomain = (id: number) => {
    db!.run('DELETE FROM blacklist WHERE id=?', [id]);
    refresh();
    showToast('Domain removed', 'info');
  };

  const handleReset = () => {
    if (resetInput !== 'RESET DATABASE') return;
    // Drop and recreate
    db!.exec('DROP TABLE IF EXISTS scan_history; DROP TABLE IF EXISTS admin_alerts; DROP TABLE IF EXISTS login_history; DROP TABLE IF EXISTS blacklist; DROP TABLE IF EXISTS system_settings; DROP TABLE IF EXISTS users;');
    db!.createTables();
    db!.seedData();
    showToast('Database reset complete', 'success');
    setResetConfirm(0);
    setResetInput('');
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-orbitron text-lg">System Settings</h2>

      {/* API Key */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="font-orbitron text-sm text-muted-foreground mb-4">API Configuration</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-input border border-border rounded-lg py-2 px-3 text-sm font-mono text-foreground flex items-center gap-2">
            <span>{showApiKey ? settings.api_key : '••••••••••••••••••••••••••••'}</span>
          </div>
          <button onClick={() => setShowApiKey(!showApiKey)} className="p-2 text-muted-foreground hover:text-primary">
            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(settings.api_key || ''); showToast('Copied', 'success'); }}
            className="p-2 text-muted-foreground hover:text-primary"><Copy size={16} /></button>
          <button onClick={regenerateKey} className="p-2 text-muted-foreground hover:text-warning"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Detection Settings */}
      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="font-orbitron text-sm text-muted-foreground">Detection Settings</h3>
        <div>
          <label className="text-sm text-muted-foreground flex justify-between">
            Sensitivity <span className="text-primary font-mono">{sensitivity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={sensitivity}
            onChange={e => { setSensitivity(+e.target.value); saveSetting('sensitivity', e.target.value); }}
            className="w-full mt-2 accent-primary" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auto-block phishing URLs</span>
          <button onClick={() => { setAutoBlock(!autoBlock); saveSetting('auto_block', String(!autoBlock)); }}
            className={`w-11 h-6 rounded-full transition-all ${autoBlock ? 'bg-primary' : 'bg-muted'} relative`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-all ${autoBlock ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Alert Threshold Score</label>
          <input type="number" value={alertThreshold}
            onChange={e => { setAlertThreshold(e.target.value); saveSetting('alert_threshold', e.target.value); }}
            className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1 glow-input" />
        </div>
      </div>

      {/* Blacklist */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="font-orbitron text-sm text-muted-foreground mb-4">Blacklist Management</h3>
        <div className="flex gap-2 mb-4">
          <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addToBlacklist()}
            placeholder="Enter domain to block..."
            className="flex-1 bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground glow-input" />
          <button onClick={addToBlacklist} className="btn-primary-glow px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {blacklist.map(b => (
            <div key={b.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
              <div>
                <span className="text-sm text-foreground font-mono">{b.domain}</span>
                <span className="text-xs text-muted-foreground ml-3">by {b.added_by}</span>
              </div>
              <button onClick={() => removeDomain(b.id)} className="p-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {blacklist.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No domains blacklisted</p>}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass p-6 rounded-2xl border border-destructive/30">
        <h3 className="font-orbitron text-sm text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger Zone
        </h3>
        <div className="space-y-3">
          <button onClick={() => { db!.run('DELETE FROM scan_history'); db!.run('DELETE FROM admin_alerts WHERE type="url_threat"'); refresh(); showToast('Scan history cleared', 'success'); }}
            className="btn-danger text-sm px-4 py-2 w-full text-left">🗑️ Clear All Scan History</button>
          <button onClick={() => { db!.run('DELETE FROM admin_alerts'); refresh(); showToast('Alerts cleared', 'success'); }}
            className="btn-danger text-sm px-4 py-2 w-full text-left">🗑️ Clear All Alerts</button>
          <button onClick={() => setResetConfirm(1)}
            className="btn-danger text-sm px-4 py-2 w-full text-left">🔄 Reset Entire Database</button>
        </div>
      </div>

      {resetConfirm > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">⚠️ Reset Database?</h3>
            <p className="text-muted-foreground text-sm mb-3">This will delete ALL data and reseed. Type <span className="font-mono text-foreground">"RESET DATABASE"</span>:</p>
            <input value={resetInput} onChange={e => setResetInput(e.target.value)}
              className="w-full bg-input border border-destructive/30 rounded-lg py-2 px-3 text-sm text-foreground mb-3" />
            <div className="flex gap-3">
              <button onClick={() => { setResetConfirm(0); setResetInput(''); }} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleReset} disabled={resetInput !== 'RESET DATABASE'} className="flex-1 py-2 btn-danger text-sm disabled:opacity-30">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
