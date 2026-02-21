import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Search, Check, Eye, Ban, Trash2, CheckCheck } from 'lucide-react';

const AdminAlerts = () => {
  const { db, showToast, refresh, refreshKey } = useApp();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!db) return;
    setAlerts(db.query('SELECT * FROM admin_alerts ORDER BY created_at DESC'));
  }, [db, refreshKey]);

  const stats = useMemo(() => ({
    total: alerts.length,
    unread: alerts.filter(a => !a.is_read).length,
    phishing: alerts.filter(a => a.status === 'PHISHING').length,
    suspicious: alerts.filter(a => a.status === 'SUSPICIOUS').length,
    newUsers: alerts.filter(a => a.type === 'new_user').length,
  }), [alerts]);

  const filtered = useMemo(() => {
    let data = alerts;
    if (filter === 'unread') data = data.filter(a => !a.is_read);
    else if (filter === 'phishing') data = data.filter(a => a.status === 'PHISHING');
    else if (filter === 'suspicious') data = data.filter(a => a.status === 'SUSPICIOUS');
    else if (filter === 'new_user') data = data.filter(a => a.type === 'new_user');
    else if (filter === 'read') data = data.filter(a => a.is_read);
    if (search) data = data.filter(a => (a.url || a.message || '').toLowerCase().includes(search.toLowerCase()) || (a.reported_by || '').toLowerCase().includes(search.toLowerCase()));
    return data;
  }, [alerts, filter, search]);

  const markRead = (id: number) => { db!.run('UPDATE admin_alerts SET is_read=1 WHERE id=?', [id]); refresh(); showToast('Marked as read', 'info'); };
  const markAllRead = () => { db!.run('UPDATE admin_alerts SET is_read=1'); refresh(); showToast('All marked as read', 'success'); };
  const dismiss = (id: number) => { db!.run('DELETE FROM admin_alerts WHERE id=?', [id]); refresh(); showToast('Alert dismissed', 'info'); };
  const blockURL = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      db!.run('INSERT OR IGNORE INTO blacklist (domain, added_by) VALUES (?, "Admin")', [domain]);
      showToast(`${domain} added to blacklist`, 'success');
      refresh();
    } catch { showToast('Invalid URL', 'error'); }
  };

  const filters = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'unread', label: 'Unread', count: stats.unread },
    { id: 'phishing', label: 'Phishing', count: stats.phishing },
    { id: 'suspicious', label: 'Suspicious', count: stats.suspicious },
    { id: 'new_user', label: 'New Users', count: stats.newUsers },
    { id: 'read', label: 'Read', count: stats.total - stats.unread },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-orbitron text-lg">Alerts Center</h2>
        <button onClick={markAllRead} className="flex items-center gap-1.5 btn-primary-glow px-4 py-2 rounded-lg text-sm">
          <CheckCheck size={14} /> Mark All Read
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts..."
          className="w-full bg-input border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground glow-input" />
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <div key={alert.id} className={`glass p-4 rounded-xl transition-all ${
            alert.status === 'PHISHING' ? 'border-destructive/30 glow-red' :
            alert.status === 'SUSPICIOUS' ? 'border-warning/30 glow-yellow' :
            alert.type === 'new_user' ? 'border-primary/20 glow-cyan' :
            'border-border opacity-60'
          } ${alert.is_read ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${
                    alert.status === 'PHISHING' ? 'text-destructive' : alert.status === 'SUSPICIOUS' ? 'text-warning' : 'text-primary'
                  }`}>
                    {alert.type === 'new_user' ? '🔵 NEW USER REGISTERED' : alert.status === 'PHISHING' ? '🔴 PHISHING DETECTED' : '🟡 SUSPICIOUS URL'}
                  </span>
                  {!alert.is_read && <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />}
                </div>
                {alert.url && <p className="text-sm text-foreground truncate">{alert.url}</p>}
                {alert.message && <p className="text-sm text-foreground">{alert.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  by {alert.reported_by} • {alert.user_email}
                  {alert.risk_score && <> • Score: {alert.risk_score}/100</>}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{alert.created_at?.split(' ')[0]}</span>
            </div>
            <div className="flex gap-2 mt-3">
              {!alert.is_read && (
                <button onClick={() => markRead(alert.id)} className="flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded text-xs hover:bg-accent/20">
                  <Check size={12} /> Mark Read
                </button>
              )}
              {alert.url && (
                <button onClick={() => blockURL(alert.url)} className="flex items-center gap-1 px-2.5 py-1 bg-destructive/10 text-destructive rounded text-xs hover:bg-destructive/20">
                  <Ban size={12} /> Block URL
                </button>
              )}
              <button onClick={() => dismiss(alert.id)} className="flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground rounded text-xs hover:text-foreground">
                <Trash2 size={12} /> Dismiss
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No alerts found</div>
        )}
      </div>
    </div>
  );
};

export default AdminAlerts;
