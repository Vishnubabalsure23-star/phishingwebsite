import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = { SAFE: '#00ff88', SUSPICIOUS: '#f59e0b', PHISHING: '#ff003c' };

const AnimatedCounter: React.FC<{ target: number; color: string }> = ({ target, color }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      start = Math.floor(progress * target);
      setVal(start);
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target]);
  return <span className="font-orbitron text-3xl font-bold" style={{ color }}>{val}</span>;
};

const UserDashboardHome = () => {
  const { db, session, refreshKey } = useApp();
  const [stats, setStats] = useState({ total: 0, phishing: 0, suspicious: 0, safe: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !session) return;
    const u = session.username;
    const total = db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE username=?', [u])?.c || 0;
    const phishing = db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE username=? AND status="PHISHING"', [u])?.c || 0;
    const suspicious = db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE username=? AND status="SUSPICIOUS"', [u])?.c || 0;
    const safe = db.queryOne('SELECT COUNT(*) as c FROM scan_history WHERE username=? AND status="SAFE"', [u])?.c || 0;
    setStats({ total, phishing, suspicious, safe });
    setPieData([
      { name: 'Safe', value: safe, color: COLORS.SAFE },
      { name: 'Suspicious', value: suspicious, color: COLORS.SUSPICIOUS },
      { name: 'Phishing', value: phishing, color: COLORS.PHISHING },
    ].filter(d => d.value > 0));
    setRecent(db.query('SELECT * FROM scan_history WHERE username=? ORDER BY scanned_at DESC LIMIT 5', [u]));

    // Simulated activity data for last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ name: label, scans: Math.floor(Math.random() * 10) + 1 });
    }
    setActivityData(days);
  }, [db, session, refreshKey]);

  const statCards = [
    { label: 'Total Scans', value: stats.total, icon: '🔍', color: '#00f5ff' },
    { label: 'Phishing', value: stats.phishing, icon: '🔴', color: '#ff003c' },
    { label: 'Suspicious', value: stats.suspicious, icon: '🟡', color: '#f59e0b' },
    { label: 'Safe', value: stats.safe, icon: '🟢', color: '#00ff88' },
  ];

  const getStatusColor = (s: string) => s === 'SAFE' ? 'text-accent' : s === 'SUSPICIOUS' ? 'text-warning' : 'text-destructive';

  return (
    <div className="space-y-6">
      <h2 className="font-orbitron text-lg">Welcome back, {session?.name} 👋</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <AnimatedCounter target={s.value} color={s.color} />
            <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">Activity Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(225 40% 11%)', border: '1px solid hsl(225 25% 18%)', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="scans" stroke="#00f5ff" fill="url(#cyanGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5 rounded-2xl">
          <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">URL Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(225 40% 11%)', border: '1px solid hsl(225 25% 18%)', borderRadius: 8, color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="glass p-5 rounded-2xl">
        <h3 className="font-orbitron text-sm mb-4 text-muted-foreground">Recent Scans</h3>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No scans yet. Start scanning URLs!</p>
        ) : (
          <div className="space-y-2">
            {recent.map(scan => (
              <div key={scan.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <span className="truncate max-w-[200px] md:max-w-[400px] text-foreground">{scan.url}</span>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${getStatusColor(scan.status)}`}>{scan.status}</span>
                  <span className="text-muted-foreground text-xs">{scan.risk_score}/100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboardHome;
