import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Search, Trash2, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

const ScanHistory = () => {
  const { db, session, showToast, refresh, refreshKey, setSection } = useApp();
  const [scans, setScans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewScan, setViewScan] = useState<any>(null);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [sortCol, setSortCol] = useState('scanned_at');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!db || !session) return;
    setScans(db.query('SELECT * FROM scan_history WHERE username=? ORDER BY scanned_at DESC', [session.username]));
  }, [db, session, refreshKey]);

  const filtered = useMemo(() => {
    let data = scans;
    if (search) data = data.filter(s => s.url.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'ALL') data = data.filter(s => s.status === statusFilter);
    data = [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return data;
  }, [scans, search, statusFilter, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const handleDelete = (id: number) => {
    setDeleting(prev => new Set(prev).add(id));
    setTimeout(() => {
      db!.run('DELETE FROM scan_history WHERE id=? AND username=?', [id, session!.username]);
      db!.run('DELETE FROM admin_alerts WHERE url=(SELECT url FROM scan_history WHERE id=?) AND reported_by=?', [id, session!.username]);
      showToast('Record deleted', 'success');
      refresh();
      setConfirmDelete(null);
      setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; });
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 400);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    ids.forEach(id => setDeleting(prev => new Set(prev).add(id)));
    setTimeout(() => {
      ids.forEach(id => {
        db!.run('DELETE FROM scan_history WHERE id=? AND username=?', [id, session!.username]);
      });
      showToast(`${ids.length} records deleted`, 'success');
      refresh();
      setSelected(new Set());
      setConfirmBulk(false);
    }, 400);
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['URL', 'Status', 'Risk Score', 'Scanned At'];
    const rows = filtered.map(s => [s.url, s.status, s.risk_score, s.scanned_at]);
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${v}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'scan_history.csv';
    a.click();
  };

  const toggleAll = () => {
    if (selected.size === pageData.length) setSelected(new Set());
    else setSelected(new Set(pageData.map(s => s.id)));
  };

  const getStatusClasses = (s: string) =>
    s === 'SAFE' ? 'bg-accent/20 text-accent' : s === 'SUSPICIOUS' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive';

  if (scans.length === 0 && !search && statusFilter === 'ALL') {
    return (
      <div className="text-center py-20">
        <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-orbitron text-lg text-muted-foreground mb-2">No scan history yet</h3>
        <p className="text-muted-foreground text-sm mb-4">Scan your first URL to see results here</p>
        <button onClick={() => setSection('scanner')} className="btn-primary-glow px-6 py-2.5 rounded-lg text-sm">
          🔍 Go to Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-orbitron text-lg">My Scan History</h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search URL..." className="w-full bg-input border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground glow-input" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground">
          <option value="ALL">All Status</option>
          <option value="SAFE">Safe</option>
          <option value="SUSPICIOUS">Suspicious</option>
          <option value="PHISHING">Phishing</option>
        </select>
        <button onClick={exportCSV} className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg text-sm transition">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 slide-down">
          <button onClick={() => setConfirmBulk(true)} className="btn-danger flex items-center gap-1.5 text-sm">
            <Trash2 size={14} /> Delete Selected ({selected.size})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 w-10"><input type="checkbox" checked={selected.size === pageData.length && pageData.length > 0} onChange={toggleAll} className="accent-primary" /></th>
                <th className="p-3 text-left text-muted-foreground font-medium">#</th>
                <th className="p-3 text-left text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort('url')}>URL</th>
                <th className="p-3 text-left text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                <th className="p-3 text-left text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort('risk_score')}>Score</th>
                <th className="p-3 text-left text-muted-foreground font-medium cursor-pointer" onClick={() => handleSort('scanned_at')}>Date</th>
                <th className="p-3 text-left text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((scan, i) => (
                <tr key={scan.id} className={`border-b border-border/50 transition-all ${deleting.has(scan.id) ? 'row-deleting' : ''} ${
                  scan.status === 'SAFE' ? 'table-row-safe' : scan.status === 'SUSPICIOUS' ? 'table-row-suspicious' : 'table-row-phishing'
                }`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(scan.id)} onChange={() => {
                    const n = new Set(selected); n.has(scan.id) ? n.delete(scan.id) : n.add(scan.id); setSelected(n);
                  }} className="accent-primary" /></td>
                  <td className="p-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 max-w-[250px] truncate" title={scan.url}>{scan.url}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(scan.status)}`}>{scan.status}</span></td>
                  <td className="p-3"><span className={scan.risk_score > 65 ? 'text-destructive' : scan.risk_score > 30 ? 'text-warning' : 'text-accent'}>{scan.risk_score}</span></td>
                  <td className="p-3 text-muted-foreground text-xs">{scan.scanned_at}</td>
                  <td className="p-3 flex gap-1.5">
                    <button onClick={() => setViewScan(scan)} className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition"><Eye size={14} /></button>
                    <button onClick={() => setConfirmDelete(scan.id)} className="p-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} records</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight size={18} /></button>
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
              {[['URL', viewScan.url], ['Status', viewScan.status], ['Risk Score', `${viewScan.risk_score}/100`],
                ['AI Confidence', `${viewScan.ai_confidence}%`], ['Domain Age', viewScan.domain_age],
                ['SSL', viewScan.ssl_status], ['Redirects', viewScan.redirect_count],
                ['Blacklisted', viewScan.blacklisted ? 'Yes' : 'No'], ['Threat Level', viewScan.threat_level],
                ['Scanned At', viewScan.scanned_at]
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
            {viewScan.threat_indicators && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Indicators</p>
                {JSON.parse(viewScan.threat_indicators).map((ind: string, i: number) => (
                  <p key={i} className="text-xs text-foreground">⚠️ {ind}</p>
                ))}
              </div>
            )}
            <button onClick={() => setViewScan(null)} className="w-full mt-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80">Close</button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">Delete Record?</h3>
            <p className="text-muted-foreground text-sm mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 btn-danger text-sm">🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">Delete {selected.size} records?</h3>
            <p className="text-muted-foreground text-sm mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBulk(false)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 py-2 btn-danger text-sm">🗑️ Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanHistory;
