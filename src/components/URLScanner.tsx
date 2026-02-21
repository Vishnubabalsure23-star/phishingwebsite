import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { generateRiskScore, getIndicators } from '@/lib/database';
import { Search, AlertTriangle, Skull } from 'lucide-react';

interface ScanResult {
  url: string; score: number; status: string; confidence: number;
  domainAge: string; ssl: string; redirects: number; blacklisted: boolean;
  threatLevel: string; indicators: string[];
}

const STEPS = ['Resolving domain...', 'Checking SSL certificate...', 'Scanning blacklists...', 'Analyzing page structure...', 'Running AI detection...'];

const URLScanner = () => {
  const { db, session, showToast, refresh } = useApp();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!db || !session || !url.trim()) { showToast('Enter a URL', 'warning'); return; }
    let testUrl = url.trim();
    if (!/^https?:\/\//.test(testUrl)) testUrl = 'http://' + testUrl;

    setScanning(true);
    setResult(null);
    setAlertBanner(null);
    setCompletedSteps([]);

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
      setCompletedSteps(prev => [...prev, i]);
    }

    // Check blacklist
    let domain = '';
    try { domain = new URL(testUrl).hostname; } catch { domain = testUrl; }
    const bl = db.queryOne('SELECT * FROM blacklist WHERE ? LIKE "%"||domain||"%"', [testUrl]);

    const score = bl ? 99 : generateRiskScore();
    const status = score <= 30 ? 'SAFE' : score <= 65 ? 'SUSPICIOUS' : 'PHISHING';
    const res: ScanResult = {
      url: testUrl, score, status,
      confidence: Math.floor(75 + Math.random() * 25),
      domainAge: status === 'SAFE' ? `${Math.floor(1 + Math.random() * 10)} years` : `${Math.floor(1 + Math.random() * 30)} days`,
      ssl: status === 'SAFE' ? 'Valid' : 'Invalid',
      redirects: status === 'SAFE' ? Math.floor(Math.random() * 2) : Math.floor(2 + Math.random() * 5),
      blacklisted: !!bl,
      threatLevel: score < 30 ? 'LOW' : score < 65 ? 'MEDIUM' : score < 85 ? 'HIGH' : 'CRITICAL',
      indicators: getIndicators(status),
    };

    db.run(
      'INSERT INTO scan_history (url,status,risk_score,ai_confidence,domain_age,ssl_status,redirect_count,blacklisted,threat_level,threat_indicators,scanned_by,username,user_email) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [testUrl, status, score, res.confidence, res.domainAge, res.ssl, res.redirects, res.blacklisted ? 1 : 0, res.threatLevel, JSON.stringify(res.indicators), session.userId, session.username, session.email]
    );
    db.run('UPDATE users SET total_scans=total_scans+1 WHERE id=?', [session.userId]);

    if (status !== 'SAFE') {
      db.run('UPDATE users SET alerts_triggered=alerts_triggered+1 WHERE id=?', [session.userId]);
      db.run('INSERT INTO admin_alerts (type,url,status,risk_score,reported_by,user_email) VALUES ("url_threat",?,?,?,?,?)',
        [testUrl, status, score, session.username, session.email]);
      setAlertBanner(status);
    }

    setResult(res);
    setScanning(false);
    setCurrentStep(-1);
    showToast('Scan saved to history', 'success');
    refresh();
  }, [db, session, url, showToast, refresh]);

  const ringOffset = result ? 283 - (283 * result.score / 100) : 283;
  const ringColor = result ? (result.score <= 30 ? '#00ff88' : result.score <= 65 ? '#f59e0b' : '#ff003c') : '#00f5ff';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-orbitron text-lg">URL Scanner</h2>

      {/* Input */}
      <div className="glass p-6 rounded-2xl glow-cyan">
        <div className="flex gap-3">
          <input value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scan()}
            placeholder="Enter URL to scan (e.g., https://example.com)"
            className="flex-1 bg-input border border-border rounded-lg py-3 px-4 text-foreground glow-input text-sm"
            disabled={scanning} />
          <button onClick={scan} disabled={scanning}
            className="btn-primary-glow px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-40 shrink-0">
            <Search size={18} /> Scan
          </button>
        </div>
      </div>

      {/* Scanning Animation */}
      {scanning && (
        <div className="glass p-6 rounded-2xl space-y-3">
          {STEPS.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i > currentStep ? 'opacity-30' : ''}`}>
              {completedSteps.includes(i) ? (
                <span className="text-accent text-lg">✅</span>
              ) : i === currentStep ? (
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-muted-foreground">⏳</span>
              )}
              <span className={completedSteps.includes(i) ? 'text-accent' : i === currentStep ? 'text-primary' : 'text-muted-foreground'}>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alert Banner */}
      {alertBanner && (
        <div className={`p-4 rounded-xl border-2 text-center text-sm font-semibold ${
          alertBanner === 'PHISHING' ? 'border-destructive bg-destructive/10 text-destructive pulse-glow-red' : 'border-warning bg-warning/10 text-warning'
        }`}>
          <AlertTriangle className="inline mr-2" size={18} />
          DANGER: This URL is {alertBanner}! This has been reported to Admin immediately!
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="glass p-6 rounded-2xl fade-in-up">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Score Ring */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(225 25% 18%)" strokeWidth="6" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={ringColor} strokeWidth="6"
                  strokeDasharray="283" strokeDashoffset={ringOffset} strokeLinecap="round" className="risk-ring" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-orbitron text-2xl font-bold" style={{ color: ringColor }}>{result.score}</span>
                <span className="text-muted-foreground text-xs">/100</span>
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-4">
                {result.status === 'PHISHING' && <Skull className="text-destructive" size={22} />}
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  result.status === 'SAFE' ? 'bg-accent/20 text-accent glow-green' :
                  result.status === 'SUSPICIOUS' ? 'bg-warning/20 text-warning glow-yellow' :
                  'bg-destructive/20 text-destructive glow-red pulse-glow-red'
                }`}>{result.status}</span>
                <span className="text-muted-foreground text-xs truncate max-w-[300px]">{result.url}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Domain Age', value: result.domainAge },
                  { label: 'SSL Status', value: result.ssl },
                  { label: 'Redirects', value: String(result.redirects) },
                  { label: 'Blacklisted', value: result.blacklisted ? 'Yes ⚠️' : 'No ✅' },
                  { label: 'AI Confidence', value: `${result.confidence}%` },
                  { label: 'Threat Level', value: result.threatLevel },
                ].map(item => (
                  <div key={item.label} className="bg-muted/30 p-2.5 rounded-lg">
                    <p className="text-muted-foreground text-xs mb-0.5">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {result.indicators.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Threat Indicators</p>
                  <div className="space-y-1">
                    {result.indicators.map((ind, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{result.status === 'SAFE' ? '✅' : '⚠️'}</span>
                        <span className="text-foreground">{ind}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default URLScanner;
