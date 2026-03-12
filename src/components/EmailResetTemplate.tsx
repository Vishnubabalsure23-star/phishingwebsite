import { Mail, Inbox } from 'lucide-react';

interface EmailResetTemplateProps {
  username: string;
  maskedEmail: string;
  onClose: () => void;
  onOpenInbox: () => void;
}

const EmailResetTemplate = ({ username, maskedEmail, onClose, onOpenInbox }: EmailResetTemplateProps) => {
  return (
    <div className="space-y-4 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
        <Mail className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-sm text-foreground font-medium mb-1">Reset Link Sent!</p>
        <p className="text-sm text-muted-foreground">
          We've sent a password reset link to
        </p>
        <p className="text-primary font-medium mt-1">{maskedEmail}</p>
      </div>
      <p className="text-xs text-muted-foreground">Check your inbox and spam folder. The link will expire in 15 minutes.</p>

      <button onClick={onOpenInbox}
        className="w-full btn-primary-glow py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
        <Inbox size={16} /> Open Inbox
      </button>

      <button onClick={onClose}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition py-1">
        Back to Login
      </button>
    </div>
  );
};

export default EmailResetTemplate;
