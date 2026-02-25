import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ADMIN_EMAILS, maskEmail } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Shield, Mail, Loader2, Copy, Check } from 'lucide-react';

const AdminLogin = () => {
  const { setScreen, setSession, showToast, setSection } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminInfo, setAdminInfo] = useState<{ name: string; level: string } | null>(null);
  const [timer, setTimer] = useState(300);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const invokeOtpAction = async (payload: { action: 'send' | 'verify'; email: string; otp?: string }) => {
    const maxAttempts = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data, error } = await supabase.functions.invoke('send-admin-otp', { body: payload });

      if (!error) return { data, error: null };

      lastError = error;
      const message = String(error.message || '').toLowerCase();
      const isTransientNetworkError =
        message.includes('failed to send a request to the edge function') ||
        message.includes('failed to fetch') ||
        message.includes('network');

      if (!isTransientNetworkError || attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, 700));
    }

    return { data: null, error: lastError };
  };

  const getFriendlyErrorMessage = (err: any, fallback: string) => {
    const raw = String(err?.message || fallback);
    const message = raw.toLowerCase();

    if (message.includes('failed to send a request to the edge function') || message.includes('failed to fetch')) {
      return 'Temporary network issue. Please retry once.';
    }

    return raw;
  };

  const handleSendOTP = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    const info = ADMIN_EMAILS[normalizedEmail];
    if (!info) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showToast('Unauthorized email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeOtpAction({
        action: 'send',
        email: normalizedEmail,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAdminInfo(data.adminInfo || info);
      setEmailSent(!!data.emailSent);
      setGeneratedOtp(data.otpCode || '');
      setTimer(300);
      showToast(data.emailSent ? `OTP sent to ${maskEmail(email)}` : 'OTP generated successfully!', 'success');
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to generate OTP'), 'error');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(generatedOtp);
    setCopied(true);
    showToast('OTP copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
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

  const handleVerify = async () => {
    if (locked) return;
    const code = otp.join('');
    const normalizedEmail = email.toLowerCase().trim();

    if (timer <= 0) {
      showToast('OTP expired. Please resend.', 'error');
      setOtp(['', '', '', '', '', '']);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeOtpAction({
        action: 'verify',
        email: normalizedEmail,
        otp: code,
      });

      if (error) throw error;

      if (data?.locked) {
        setLocked(true);
        setLockTimer(120);
        showToast('Too many attempts. Locked for 2 minutes.', 'error');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        return;
      }

      if (data?.error) {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        showToast(data.error, 'error');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        return;
      }

      // Success
      const verifiedInfo = data.adminInfo || adminInfo!;
      setVerified(true);
      showToast(`Welcome, ${verifiedInfo.name}!`, 'success');
      setTimeout(() => {
        setSession({
          loggedIn: true, role: 'admin', userId: null,
          username: verifiedInfo.name, name: verifiedInfo.name,
          email: normalizedEmail, avatarColor: '#7c3aed',
          adminLevel: verifiedInfo.level, loginTime: Date.now()
        });
        setSection('dashboard');
        setScreen('admin-dashboard');
      }, 1500);
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Verification failed'), 'error');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    setLoading(true);
    try {
      const { data, error } = await invokeOtpAction({
        action: 'send',
        email: normalizedEmail,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedOtp(data.otpCode || '');
      setEmailSent(!!data.emailSent);
      setTimer(300);
      setOtp(['', '', '', '', '', '']);
      showToast('New OTP generated!', 'success');
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to resend OTP'), 'error');
    } finally {
      setLoading(false);
    }
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
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSendOTP()}
                  placeholder="Enter admin email"
                  className="w-full bg-input border border-border rounded-lg py-3 pl-10 pr-4 text-foreground glow-input focus:border-secondary"
                  disabled={loading}
                />
              </div>
              <button onClick={handleSendOTP} disabled={loading} className="w-full btn-secondary-glow py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="animate-spin" size={18} /> Sending...</> : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-muted-foreground text-sm mb-4">
                {emailSent 
                  ? <>OTP sent to <span className="text-primary">{maskEmail(email)}</span>. Check your inbox!</>
                  : <>OTP generated for <span className="text-primary">{maskEmail(email)}</span></>
                }
              </p>

              {/* Show generated OTP only if email was NOT sent (fallback) */}
              {!emailSent && generatedOtp && (
                <div className="mb-4 p-3 rounded-lg bg-secondary/10 border border-secondary/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Your Verification Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-bold text-secondary tracking-[6px]">{generatedOtp}</span>
                    <button onClick={handleCopyOtp} className="text-muted-foreground hover:text-secondary transition p-1">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className={`flex justify-center gap-2 mb-4 ${shaking ? 'shake' : ''}`} onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i} ref={el => { otpRefs.current[i] = el; }}
                    type="text" maxLength={1} value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    className={`otp-box ${shaking ? 'error' : ''}`}
                    disabled={locked || loading}
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
                disabled={otp.join('').length !== 6 || locked || loading}
                className="w-full btn-primary-glow py-3 rounded-lg font-semibold disabled:opacity-40 mb-3 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="animate-spin" size={18} /> Verifying...</> : locked ? `Locked (${lockTimer}s)` : 'Verify OTP'}
              </button>
              <button
                onClick={handleResend} disabled={timer > 0 || loading}
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
