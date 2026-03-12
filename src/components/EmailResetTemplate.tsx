import { Shield, Lock } from 'lucide-react';

interface EmailResetTemplateProps {
  username: string;
  maskedEmail: string;
  onClose: () => void;
}

const EmailResetTemplate = ({ username, maskedEmail, onClose }: EmailResetTemplateProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          We've sent a reset link to <span className="text-primary font-medium">{maskedEmail}</span>
        </p>
      </div>

      {/* Email Preview */}
      <div className="rounded-xl overflow-hidden border border-border">
        {/* Email header bar */}
        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
          </div>
          <span className="text-xs text-muted-foreground ml-2 font-mono">inbox — PhishGuard Security</span>
        </div>

        {/* Email body - white background like real emails */}
        <div className="bg-white p-6 text-center">
          {/* Logo */}
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

          <p className="text-sm text-gray-600 mb-1">Hello, <strong className="text-gray-800">{username}</strong></p>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
            We received a request to reset the password for your PhishGuard account. Click the button below to create a new password.
          </p>

          {/* CTA Button - display only, not clickable (user must use actual email link) */}
          <div
            className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white cursor-default select-none opacity-90"
            style={{ background: 'linear-gradient(135deg, hsl(183, 100%, 50%), hsl(183, 100%, 35%))' }}
          >
            🔐 Reset My Password
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">* Click this link in your actual email to reset</p>

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

      <button onClick={onClose}
        className="w-full btn-primary-glow py-2.5 rounded-lg text-sm font-medium">
        Back to Login
      </button>
    </div>
  );
};

export default EmailResetTemplate;
