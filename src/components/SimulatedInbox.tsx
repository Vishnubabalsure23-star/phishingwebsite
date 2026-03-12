import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import ParticleCanvas from './ParticleCanvas';
import { ArrowLeft, Inbox, Mail, MailOpen, Shield, Lock, Star, Trash2, Clock } from 'lucide-react';

const SimulatedInbox = () => {
  const { setScreen, showToast } = useApp();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emailOpened, setEmailOpened] = useState(false);

  const resetData = sessionStorage.getItem('phishguard_reset_user');
  const resetUser = resetData ? JSON.parse(resetData) : null;

  const maskedEmail = resetUser?.email?.replace(/(.{2})(.*)(@.*)/, '$1****$3') || 'unknown';
  const timeNow = new Date();
  const timeStr = `${timeNow.getHours().toString().padStart(2, '0')}:${timeNow.getMinutes().toString().padStart(2, '0')}`;

  const emails = [
    {
      id: 'reset',
      from: 'PhishGuard Security',
      fromEmail: 'noreply@phishguard.io',
      subject: '🔐 Password Reset Request',
      preview: 'We received a request to reset your password...',
      time: timeStr,
      unread: !emailOpened,
      isReset: true,
    },
    {
      id: 'welcome',
      from: 'PhishGuard Team',
      fromEmail: 'team@phishguard.io',
      subject: 'Welcome to PhishGuard!',
      preview: 'Thank you for joining PhishGuard Security Platform...',
      time: '09:15',
      unread: false,
      isReset: false,
    },
    {
      id: 'scan',
      from: 'PhishGuard Alerts',
      fromEmail: 'alerts@phishguard.io',
      subject: 'Weekly Scan Report',
      preview: 'Your weekly scan summary is ready to view...',
      time: 'Yesterday',
      unread: false,
      isReset: false,
    },
  ];

  const handleResetClick = () => {
    setScreen('user-reset-password');
  };

  if (!resetUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <ParticleCanvas />
        <div className="relative z-10 text-center fade-in-up">
          <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-orbitron text-xl text-muted-foreground mb-2">No Reset Email</h2>
          <p className="text-muted-foreground mb-6">No password reset request found.</p>
          <button onClick={() => setScreen('user-login')} className="btn-primary-glow px-8 py-3 rounded-lg font-semibold">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <ParticleCanvas />
      <div className="relative z-10 w-full max-w-2xl px-4">
        <button onClick={() => setScreen('user-login')} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-4">
          <ArrowLeft size={18} /> Back to Login
        </button>

        <div className="glass-strong rounded-2xl overflow-hidden glow-cyan">
          {/* Inbox header */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <Inbox className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-orbitron text-sm text-primary">Simulated Inbox</h2>
              <p className="text-xs text-muted-foreground">{maskedEmail} • {emails.filter(e => e.unread).length} unread</p>
            </div>
          </div>

          {/* Email list or email view */}
          {!selectedEmail ? (
            <div className="divide-y divide-border">
              {emails.map(email => (
                <button
                  key={email.id}
                  onClick={() => { setSelectedEmail(email.id); if (email.isReset) setEmailOpened(true); }}
                  className={`w-full text-left px-5 py-3.5 hover:bg-muted/50 transition flex items-start gap-3 ${email.unread ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-0.5">
                    {email.unread ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <MailOpen className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${email.unread ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                        {email.from}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} /> {email.time}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${email.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{email.preview}</p>
                  </div>
                  {email.isReset && email.unread && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ) : selectedEmail === 'reset' ? (
            <div className="p-0">
              {/* Email toolbar */}
              <div className="px-5 py-2 border-b border-border flex items-center gap-3 text-muted-foreground">
                <button onClick={() => setSelectedEmail(null)} className="hover:text-primary transition">
                  <ArrowLeft size={16} />
                </button>
                <button className="hover:text-primary transition"><Star size={16} /></button>
                <button className="hover:text-destructive transition"><Trash2 size={16} /></button>
                <span className="ml-auto text-xs">From: noreply@phishguard.io</span>
              </div>

              {/* Email content - white bg like real email */}
              <div className="bg-white p-6 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(183, 100%, 50%), hsl(262, 84%, 58%))' }}>
                  <Shield className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  PhishGuard
                </h3>
                <p className="text-xs text-gray-400 tracking-widest uppercase mb-6">Security Platform</p>

                <div className="w-16 h-0.5 mx-auto mb-6" style={{ background: 'linear-gradient(90deg, hsl(183, 100%, 50%), hsl(262, 84%, 58%))' }} />

                <div className="flex items-center justify-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <h4 className="text-base font-semibold text-gray-800">Password Reset Request</h4>
                </div>

                <p className="text-sm text-gray-600 mb-1">Hello, <strong className="text-gray-800">{resetUser.username}</strong></p>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
                  We received a request to reset the password for your PhishGuard account. Click the button below to create a new password.
                </p>

                {/* Clickable CTA - navigates to reset page */}
                <button
                  onClick={handleResetClick}
                  className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, hsl(183, 100%, 50%), hsl(183, 100%, 35%))' }}
                >
                  🔐 Reset My Password
                </button>

                <p className="text-xs text-gray-400 mt-4">This link expires in <strong>15 minutes</strong></p>

                <div className="w-full h-px bg-gray-200 my-6" />

                <p className="text-xs text-gray-400 leading-relaxed">
                  If you didn't request this, you can safely ignore this email.<br />
                  Your account remains secure.
                </p>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    © 2026 PhishGuard • Secure URL Scanner
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-0">
              <div className="px-5 py-2 border-b border-border flex items-center gap-3 text-muted-foreground">
                <button onClick={() => setSelectedEmail(null)} className="hover:text-primary transition">
                  <ArrowLeft size={16} />
                </button>
                <span className="ml-auto text-xs">From: {emails.find(e => e.id === selectedEmail)?.fromEmail}</span>
              </div>
              <div className="p-6 text-center">
                <MailOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{emails.find(e => e.id === selectedEmail)?.subject}</h3>
                <p className="text-sm text-muted-foreground">{emails.find(e => e.id === selectedEmail)?.preview}</p>
                <p className="text-xs text-muted-foreground mt-4 italic">This is a simulated email for demo purposes.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatedInbox;
