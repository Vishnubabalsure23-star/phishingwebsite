import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Search, Edit, Eye, EyeOff, Trash2, UserPlus, Lock, Unlock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { checkStrength } from '@/lib/database';

const PAGE_SIZE = 10;
const COLORS = ['#00f5ff', '#7c3aed', '#00ff88', '#ff6b35', '#ec4899', '#f59e0b'];

const AdminUsers = () => {
  const { db, showToast, refresh, refreshKey } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [viewScans, setViewScans] = useState<any[]>([]);
  const [addUser, setAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', username: '', password: '', role: 'user', color: '#00f5ff' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!db) return;
    setUsers(db.query('SELECT * FROM users ORDER BY created_at DESC'));
  }, [db, refreshKey]);

  const filtered = useMemo(() => {
    let data = users;
    if (search) data = data.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter !== 'all') data = data.filter(u => u.role === roleFilter);
    if (statusFilter !== 'all') data = data.filter(u => u.status === statusFilter);
    return data;
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const togglePassword = (id: number) => {
    const n = new Set(showPasswords);
    n.has(id) ? n.delete(id) : n.add(id);
    setShowPasswords(n);
  };

  const toggleStatus = (user: any) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    db!.run('UPDATE users SET status=? WHERE id=?', [newStatus, user.id]);
    showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    refresh();
  };

  const deleteUser = (id: number) => {
    setDeleting(prev => new Set(prev).add(id));
    setTimeout(() => {
      db!.run('DELETE FROM scan_history WHERE scanned_by=?', [id]);
      db!.run('DELETE FROM login_history WHERE user_id=?', [id]);
      const u = db!.queryOne('SELECT username FROM users WHERE id=?', [id]);
      if (u) db!.run('DELETE FROM admin_alerts WHERE reported_by=?', [u.username]);
      db!.run('DELETE FROM users WHERE id=?', [id]);
      showToast('User deleted', 'success');
      refresh();
      setConfirmDelete(null);
    }, 400);
  };

  const saveEdit = () => {
    if (!editUser) return;
    db!.run('UPDATE users SET full_name=?, email=?, username=?, role=?, status=? WHERE id=?',
      [editUser.full_name, editUser.email, editUser.username, editUser.role, editUser.status, editUser.id]);
    showToast('User updated', 'success');
    setEditUser(null);
    refresh();
  };

  const handleAddUser = () => {
    if (addForm.name.length < 3 || addForm.username.length < 4 || addForm.password.length < 8) {
      showToast('Fill all fields properly', 'warning'); return;
    }
    if (db!.queryOne('SELECT id FROM users WHERE email=?', [addForm.email])) { showToast('Email exists', 'error'); return; }
    if (db!.queryOne('SELECT id FROM users WHERE username=?', [addForm.username])) { showToast('Username exists', 'error'); return; }
    db!.run('INSERT INTO users (full_name,email,username,password,avatar_color,role,status,joined_date) VALUES (?,?,?,?,?,?,?,date("now"))',
      [addForm.name, addForm.email, addForm.username, addForm.password, addForm.color, addForm.role, 'active']);
    showToast('User added', 'success');
    setAddUser(false);
    setAddForm({ name: '', email: '', username: '', password: '', role: 'user', color: '#00f5ff' });
    refresh();
  };

  const openViewUser = (user: any) => {
    setViewUser(user);
    setViewScans(db!.query('SELECT * FROM scan_history WHERE scanned_by=? ORDER BY scanned_at DESC LIMIT 20', [user.id]));
  };

  const bulkDelete = () => {
    Array.from(selected).forEach(id => {
      db!.run('DELETE FROM scan_history WHERE scanned_by=?', [id]);
      db!.run('DELETE FROM login_history WHERE user_id=?', [id]);
      const u = db!.queryOne('SELECT username FROM users WHERE id=?', [id]);
      if (u) db!.run('DELETE FROM admin_alerts WHERE reported_by=?', [u.username]);
      db!.run('DELETE FROM users WHERE id=?', [id]);
    });
    showToast(`${selected.size} users deleted`, 'success');
    setSelected(new Set());
    setConfirmBulk(false);
    refresh();
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const csv = ['Name,Username,Email,Role,Status,Scans,Alerts,Joined',
      ...filtered.map(u => `"${u.full_name}","${u.username}","${u.email}","${u.role}","${u.status}",${u.total_scans},${u.alerts_triggered},"${u.joined_date}"`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'users.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-orbitron text-lg">User Management</h2>
        <div className="flex gap-2">
          <button onClick={() => setAddUser(true)} className="btn-primary-glow px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
            <UserPlus size={14} /> Add User
          </button>
          <button onClick={exportCSV} className="bg-muted text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search..."
            className="w-full bg-input border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-foreground glow-input" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground">
          <option value="all">All Roles</option><option value="user">User</option><option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground">
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex gap-2 slide-down">
          <button onClick={() => setConfirmBulk(true)} className="btn-danger text-sm flex items-center gap-1.5">
            <Trash2 size={14} /> Delete Selected ({selected.size})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="p-3 w-10"><input type="checkbox"
                checked={selected.size === pageData.length && pageData.length > 0}
                onChange={() => { selected.size === pageData.length ? setSelected(new Set()) : setSelected(new Set(pageData.map(u => u.id))); }}
                className="accent-primary" /></th>
              <th className="p-3 text-left text-muted-foreground font-medium">#</th>
              <th className="p-3 text-left text-muted-foreground font-medium">User</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Email</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Password</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Role</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Status</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Scans</th>
              <th className="p-3 text-left text-muted-foreground font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {pageData.map((user, i) => (
                <tr key={user.id} className={`border-b border-border/50 hover:bg-muted/20 transition ${deleting.has(user.id) ? 'row-deleting' : ''}`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(user.id)} onChange={() => {
                    const n = new Set(selected); n.has(user.id) ? n.delete(user.id) : n.add(user.id); setSelected(n);
                  }} className="accent-primary" /></td>
                  <td className="p-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: user.avatar_color, color: '#0a0f1e' }}>
                        {user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-xs">{user.full_name}</p>
                        <p className="text-muted-foreground text-[11px]">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono">{showPasswords.has(user.id) ? user.password : '••••••••'}</span>
                      <button onClick={() => togglePassword(user.id)} className="text-muted-foreground hover:text-primary">
                        {showPasswords.has(user.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`flex items-center gap-1 text-xs ${user.status === 'active' ? 'text-accent' : 'text-destructive'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-accent' : 'bg-destructive'}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{user.total_scans}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditUser({...user})} className="p-1 bg-primary/10 text-primary rounded hover:bg-primary/20"><Edit size={12} /></button>
                      <button onClick={() => toggleStatus(user)} className="p-1 bg-warning/10 text-warning rounded hover:bg-warning/20">
                        {user.status === 'active' ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                      <button onClick={() => openViewUser(user)} className="p-1 bg-muted text-muted-foreground rounded hover:text-foreground"><Eye size={12} /></button>
                      <button onClick={() => setConfirmDelete(user.id)} className="p-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} users</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-xs">{page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 text-muted-foreground disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="glass-strong p-6 rounded-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-orbitron text-lg text-primary mb-4">Edit User</h3>
            <div className="space-y-3">
              {['full_name', 'email', 'username'].map(f => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground capitalize">{f.replace('_', ' ')}</label>
                  <input value={editUser[f]} onChange={e => setEditUser({...editUser, [f]: e.target.value})}
                    className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1 glow-input" />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Role</label>
                  <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}
                    className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1">
                    <option value="user">User</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select value={editUser.status} onChange={e => setEditUser({...editUser, status: e.target.value})}
                    className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1">
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-2 btn-primary-glow rounded-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setViewUser(null)}>
          <div className="glass-strong p-6 rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: viewUser.avatar_color, color: '#0a0f1e' }}>
                {viewUser.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="font-orbitron text-lg text-foreground">{viewUser.full_name}</h3>
                <p className="text-muted-foreground text-sm">@{viewUser.username} • {viewUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[['Scans', viewUser.total_scans], ['Alerts', viewUser.alerts_triggered], ['Status', viewUser.status], ['Joined', viewUser.joined_date]].map(([l, v]) => (
                <div key={l as string} className="bg-muted/30 p-3 rounded-lg text-center">
                  <p className="text-foreground font-semibold text-sm">{v}</p>
                  <p className="text-muted-foreground text-xs">{l}</p>
                </div>
              ))}
            </div>
            <h4 className="font-orbitron text-sm text-muted-foreground mb-2">Scan History</h4>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {viewScans.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs">
                  <span className="truncate max-w-[250px]">{s.url}</span>
                  <span className={s.status === 'SAFE' ? 'text-accent' : s.status === 'SUSPICIOUS' ? 'text-warning' : 'text-destructive'}>{s.status} ({s.risk_score})</span>
                </div>
              ))}
              {viewScans.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No scans</p>}
            </div>
            <button onClick={() => setViewUser(null)} className="w-full mt-4 py-2 bg-muted text-foreground rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setAddUser(false)}>
          <div className="glass-strong p-6 rounded-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-orbitron text-lg text-primary mb-4">Add New User</h3>
            <div className="space-y-3">
              {[['name', 'Full Name'], ['email', 'Email'], ['username', 'Username'], ['password', 'Password']].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground">{l}</label>
                  <input type={f === 'password' ? 'password' : 'text'} value={(addForm as any)[f]}
                    onChange={e => setAddForm({...addForm, [f]: e.target.value})}
                    className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1 glow-input" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})}
                  className="w-full bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground mt-1">
                  <option value="user">User</option><option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Avatar Color</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setAddForm({...addForm, color: c})}
                      className={`w-6 h-6 rounded-full ${addForm.color === c ? 'ring-2 ring-foreground' : 'opacity-50'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAddUser(false)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddUser} className="flex-1 py-2 btn-primary-glow rounded-lg text-sm">Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">Delete User?</h3>
            <p className="text-muted-foreground text-sm mb-4">This removes all their data and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={() => deleteUser(confirmDelete)} className="flex-1 py-2 btn-danger text-sm">🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-strong p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-orbitron text-lg text-destructive mb-2">Delete {selected.size} users?</h3>
            <p className="text-muted-foreground text-sm mb-4">All their data will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBulk(false)} className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm">Cancel</button>
              <button onClick={bulkDelete} className="flex-1 py-2 btn-danger text-sm">🗑️ Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
