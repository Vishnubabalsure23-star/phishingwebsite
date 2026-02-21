import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ADMIN_EMAILS, maskEmail } from '@/lib/database';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Shield, Mail, Lock } from 'lucide-react';

const AdminLogin = () => {
  const { setScreen, setSession, showToast, setSection } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [adminInfo, setAdminInfo] = useState<{ name: string; level: string } | null>(null);
  const [timer, setTimer] = useState(300);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [verified, setVerified] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  useEffect(() => {
    if (!locked || lockTimer <= 0) return;
    const id = setInterval(() => {
      setLockTimer(t => {
        if (t <= 1) { setLocked(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [locked, lockTimer]);

  const handleSendOTP = () => {
    const info = ADMIN_EMAILS[email.toLowerCase().trim()];
    if (!info) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showToast('Unauthorized email address', 'error');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOTP(code);
    setAdminInfo(info);
    setTimer(300);
    setAttempts(0);
    showToast(`OTP sent to ${maskEmail(email)}`, 'success');
    setStep(2);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOTPChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    text.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = () => {
    if (locked) return;
    const code = otp.join('');
    if (timer <= 0) {
      showToast('OTP expired. Please resend.', 'error');
      setOtp(['', '', '', '', '', '']);
      return;
    }
    if (code !== generatedOTP) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      if (newAttempts >= 3) {
        setLocked(true);
        setLockTimer(120);
        showToast('Too many attempts. Locked for 2 minutes.', 'error');
      } else {
        showToast(`Invalid OTP. ${3 - newAttempts} tries left`, 'error');
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      return;
    }
    setVerified(true);
    showToast(`Welcome, ${adminInfo!.name}!`, 'success');
    setTimeout(() => {
      setSession({
        loggedIn: true, role: 'admin', userId: null,
        username: adminInfo!.name, name: adminInfo!.name,
        email: email.toLowerCase().trim(), avatarColor: '#7c3aed',
        adminLevel: adminInfo!.level, loginTime: Date.now()
      });
      setSection('dashboard');
      setScreen('admin-dashboard');
    }, 1500);
  };

  const handleResend = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOTP(code);
    setTimer(300);
    setAttempts(0);
    setOtp(['', '', '', '', '', '']);
    showToast('New OTP sent!', 'success');
    otpRefs.current[0]?.focus();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (verified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <ParticleCanvas />
        <div className="relative z-10 text-center fade-in-up">
          <div className="text-6xl mb-4 scale-in">✅</div>
          <h2 className="font-orbitron text-2xl text-accent mb-2">Verified Successfully!</h2>
          <p className="text-muted-foreground">Welcome, {adminInfo?.name}!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <ParticleCanvas />
      <div className="relative z-10 w-full max-w-md px-4">
        <button onClick={() => setScreen('role-selection')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-6">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="glass-strong p-8 rounded-2xl glow-purple">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-secondary mx-auto mb-3" />
            <h2 className="font-orbitron text-xl text-secondary">Admin Access Portal</h2>
          </div>

          {step === 1 ? (
            <div className={shaking ? 'shake' : ''}>
              <label className="text-sm text-muted-foreground mb-2 block">Admin Email</label>
              <div className="relative mb-4">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  placeholder="Enter admin email"
                  className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-4 text-foreground glow-input focus:border-secondary"
                />
              </div>
              <button onClick={handleSendOTP} className="w-full btn-secondary-glow py-3 rounded-lg font-semibold">
                Send OTP
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-muted-foreground text-sm mb-4">
                OTP sent to <span className="text-primary">{maskEmail(email)}</span>
              </p>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-5 text-center">
                <span className="text-warning text-xs font-semibold">⚡ DEV MODE — OTP: {generatedOTP}</span>
              </div>
              <div className={`flex justify-center gap-2 mb-4 ${shaking ? 'shake' : ''}`} onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i} ref={el => { otpRefs.current[i] = el; }}
                    type="text" maxLength={1} value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    className={`otp-box ${shaking ? 'error' : ''}`}
                    disabled={locked}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className={`${timer <= 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  ⏱ {formatTime(timer)}
                </span>
                {locked && <span className="text-destructive">🔒 Locked {lockTimer}s</span>}
              </div>
              <button
                onClick={handleVerify}
                disabled={otp.join('').length !== 6 || locked}
                className="w-full btn-primary-glow py-3 rounded-lg font-semibold disabled:opacity-40 mb-3"
              >
                {locked ? `Locked (${lockTimer}s)` : 'Verify OTP'}
              </button>
              <button
                onClick={handleResend} disabled={timer > 0}
                className="w-full text-sm text-muted-foreground hover:text-primary transition disabled:opacity-30"
              >
                Resend OTP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
