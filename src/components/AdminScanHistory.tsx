import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Search, Trash2, Download, Eye, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 15;

const AdminScanHistory = () => {
  const { db, showToast, refresh, refreshKey } = useApp();
  const [scans, setScans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewScan, setViewScan] = useState<any>(null);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(0);
  const [clearInput, setClearInput] = useState('');

  useEffect(() => {
    if (!db) return;
    setScans(db.query('SELECT * FROM scan_history ORDER BY scanned_at DESC'));
  }, [db, refreshKey]);

  const filtered = useMemo(() => {
    let data = scans;
    if (search) data = data.filter(s => s.url.toLowerCase().includes(search.toLowerCase()) || (s.username || '').toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'ALL') data = data.filter(s => s.status === statusFilter);
    return data;
  }, [scans, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (id: number) => {
    setDeleting(prev => new Set(prev).add(id));
    setTimeout(() => {
      db!.run('DELETE FROM scan_history WHERE id=?', [id]);
      showToast('Record deleted', 'success');
      refresh(); setConfirmDelete(null);
    }, 400);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    ids.forEach(id => db!.run('DELETE FROM scan_history WHERE id=?', [id]));
    showToast(`${ids.length} records deleted`, 'success');
    setSelected(new Set()); setConfirmBulk(false); refresh();
  };

  const handleClearAll = () => {
    if (clearInput !== 'DELETE ALL') return;
    db!.run('DELETE FROM scan_history');
    db!.run('DELETE FROM admin_alerts WHERE type="url_threat"');
    showToast('All scan history cleared', 'success');
    setConfirmClearAll(0); setClearInput(''); refresh();
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const csv = ['URL,Status,Score,User,Email,Date', ...filtered.map(s => `"${s.url}","${s.status}",${s.risk_score},"${s.username}","${s.user_email}","${s.scanned_at}"`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'all_scans.csv'; a.click();
  };

  const getStatusClasses = (s: string) => s === 'SAFE' ? 'bg-accent/20 text-accent' : s === 'SUSPICIOUS' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive';

  return (
    <div className="space-y-4">
      <h2 className="font-orbitron text-lg">All Scan History</h2>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search URL or user..."
            className="w-full bg-input border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground glow-input" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground">
          <option value="ALL">All</option><option value="SAFE">Safe</option><option value="SUSPICIOUS">Suspicious</option><option value="PHISHING">Phishing</option>
        </select>
        <button onClick={exportCSV} className="bg-muted text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition">
          <Download size={14} /> Export
        </button>
        <button onClick={() => setConfirmClearAll(1)} className="btn-danger text-sm flex items-center gap-1.5">
          <AlertTriangle size={14} /> Clear All
        </button>
      </div>

      {selected.size > 0 && (
        <div className="slide-down">
          <button onClick={() => setConfirmBulk(true)} className="btn-danger text-sm flex items-center gap-1.5">
            <Trash2 size={14} /> Delete Selected ({selected.size})
          </button>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="p-3 w-10"><input type="checkbox"
                checked={selected.size === pageData.length && pageData.length > 0}
                onChange={() => selected.size === pageData.length ? setSelected(new Set()) : setSelected(new Set(pageData.map(s => s.id)))}
                className="accent-primary" /></th>
              <th className="p-3 text-left text-muted-foreground font-medium">#</th>
              <th className="p-3 text-left text-muted-foreground font-medium">URL</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Status</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Score</th>
              <th className="p-3 text-left text-muted-foreground font-medium">User</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Date</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {pageData.map((scan, i) => (
                <tr key={scan.id} className={`border-b border-border/50 transition-all ${deleting.has(scan.id) ? 'row-deleting' : ''} ${
                  scan.status === 'SAFE' ? 'table-row-safe' : scan.status === 'SUSPICIOUS' ? 'table-row-suspicious' : 'table-row-phishing'}`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(scan.id)} onChange={() => {
                    const n = new Set(selected); n.has(scan.id) ? n.delete(scan.id) : n.add(scan.id); setSelected(n);
                  }} className="accent-primary" /></td>
                  <td className="p-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 max-w-[200px] truncate" title={scan.url}>{scan.url}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(scan.status)}`}>{scan.status}</span></td>
                  <td className="p-3"><span className={scan.risk_score > 65 ? 'text-destructive' : scan.risk_score > 30 ? 'text-warning' : 'text-accent'}>{scan.risk_score}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{scan.username}</td>
                  <td className="p-3 text-muted-foreground text-xs">{scan.scanned_at}</td>
                  <td className="p-3 flex gap-1.5">
                    <button onClick={() => setViewScan(scan)} className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20"><Eye size={14} /></button>
                    <button onClick={() => setConfirmDelete(scan.id)} className="p-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} records</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-xs">{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setViewScan(null)}>
          <div className="glass-strong p-6 rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-orbitron text-lg text-primary mb-4">Scan Details</h3>
            <div className="space-y-2 text-sm">
              {[['URL', viewScan.url], ['Status', viewScan.status], ['Score', `${viewScan.risk_score}/100`], ['User', viewScan.username], ['Email', viewScan.user_email],
                ['Confidence', `${viewScan.ai_confidence}%`], ['Domain Age', viewScan.domain_age], ['SSL', viewScan.ssl_status], ['Threat Level', viewScan.threat_level], ['Date', viewScan.scanned_at]
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">{l}</span><span className="text-foreground truncate max-w-[60%] text-right">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewScan(null)} className="w-full mt-4 py-2 bg-muted text-foreground rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-destructive mb-2">Delete?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 btn-danger text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-destructive mb-2">Delete {selected.size} records?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmBulk(false)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 py-2 btn-danger text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmClearAll > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-destructive mb-2">⚠️ Clear ALL Scan History?</h3>
            <p className="text-muted-foreground text-sm mb-3">Type <span className="font-mono text-foreground">"DELETE ALL"</span> to confirm:</p>
            <input value={clearInput} onChange={e => setClearInput(e.target.value)}
              className="w-full bg-input border border-destructive/30 rounded-lg py-2 px-3 text-sm text-foreground mb-3" />
            <div className="flex gap-3">
              <button onClick={() => { setConfirmClearAll(0); setClearInput(''); }} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleClearAll} disabled={clearInput !== 'DELETE ALL'} className="flex-1 py-2 btn-danger text-sm disabled:opacity-30">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScanHistory;
