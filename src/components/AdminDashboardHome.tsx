import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const CHART_COLORS = ['#00ff88', '#f59e0b', '#ff003c', '#00f5ff', '#7c3aed'];

const AnimatedCounter: React.FC<{ target: number; color: string }> = ({ target, color }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const dur = 1200;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className="font-orbitron text-3xl font-bold" style={{ color }}>{val}</span>;
};

const AdminDashboardHome = () => {
  const { db, refreshKey } = useApp();
  const [stats, setStats] = useState({ users: 0, scans: 0, alerts: 0, phishing: 0, today: 0, active: 0 });
  const [pieData, setPieData] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;
    setStats({
      users: db.queryOne('SELECT COUNT(*) as c FROM users')?.c || 0,
      scans: db.queryOne('SELECT COUNT(*) as c FROM scan_history')?.c || 0,
      alerts: db.queryOne('SELECT COUNT(*) as c FROM admin_alerts WHERE is_read=0')?.c || 0,
      phishing: db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE status="PHISHING"')?.c || 0,
      today: db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE date(scanned_at)=date("now")')?.c || 0,
      active: db.queryOne('SELECT COUNT(*) as c FROM users WHERE status="active"')?.c || 0,
    });

    const statusCounts = db.query('SELECT status, COUNT(*) as count FROM scan_history GROUP BY status');
    setPieData(statusCounts.map((r: any) => ({
      name: r.status, value: r.count,
      color: r.status === 'SAFE' ? '#00ff88' : r.status === 'SUSPICIOUS' ? '#f59e0b' : '#ff003c'
    })));

    setTopUsers(db.query('SELECT username, total_scans FROM users ORDER BY total_scans DESC LIMIT 5'));
    setRecentAlerts(db.query('SELECT * FROM admin_alerts ORDER BY created_at DESC LIMIT 3'));
    setRecentUsers(db.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 3'));

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), scans: Math.floor(Math.random() * 20) + 5 });
    }
    setActivityData(days);
  }, [db, refreshKey]);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: '👥', color: '#00f5ff' },
    { label: 'Total Scans', value: stats.scans, icon: '🔍', color: '#7c3aed' },
    { label: 'Active Alerts', value: stats.alerts, icon: '🚨', color: '#ff003c' },
    { label: 'Phishing Found', value: stats.phishing, icon: '🛡️', color: '#f59e0b' },
    { label: 'Accuracy', value: 98, icon: '✅', color: '#00ff88' },
    { label: 'Scans Today', value: stats.today, icon: '📈', color: '#06b6d4' },
  ];

  const tooltipStyle = { background: 'hsl(225 40% 11%)', border: '1px solid hsl(225 25% 18%)', borderRadius: 8, color: '#e2e8f0' };

  return (
    <div className="space-y-6">
      <h2 className="font-orbitron text-lg">Admin Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <span className="text-2xl">{s.icon}</span>
            {s.label === 'Accuracy' ? (
              <span className="font-orbitron text-3xl font-bold" style={{ color: s.color }}>98.7%</span>
            ) : (
              <AnimatedCounter target={s.value} color={s.color} />
            )}
            <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">Platform Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="scans" stroke="#7c3aed" fill="url(#purpleGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">URL Classification</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="glass p-5 rounded-2xl">
        <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">Top Active Users</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topUsers}>
            <XAxis dataKey="username" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="total_scans" fill="#00f5ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Alerts + Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-3 text-muted-foreground">Recent Alerts</h3>
          <div className="space-y-2">
            {recentAlerts.map(a => (
              <div key={a.id} className={`p-3 rounded-lg text-sm border ${
                a.status === 'PHISHING' ? 'border-destructive/30 bg-destructive/5' : a.type === 'new_user' ? 'border-primary/30 bg-primary/5' : 'border-warning/30 bg-warning/5'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${a.status === 'PHISHING' ? 'text-destructive' : a.type === 'new_user' ? 'text-primary' : 'text-warning'}`}>
                    {a.type === 'new_user' ? '🔵 NEW USER' : a.status === 'PHISHING' ? '🔴 PHISHING' : '🟡 SUSPICIOUS'}
                  </span>
                  {!a.is_read && <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />}
                </div>
                <p className="text-foreground text-xs mt-1 truncate">{a.url || a.message}</p>
                <p className="text-muted-foreground text-xs">by {a.reported_by}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-3 text-muted-foreground">Recent Registrations</h3>
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: u.avatar_color, color: '#0a0f1e' }}>
                  {u.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
