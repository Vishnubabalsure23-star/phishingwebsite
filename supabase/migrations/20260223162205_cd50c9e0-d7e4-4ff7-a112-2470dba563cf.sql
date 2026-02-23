
-- Table to store admin OTP codes
CREATE TABLE public.admin_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

-- No direct client access - only edge functions use this table via service role
-- No RLS policies needed since we use service_role key in edge function

-- Index for quick lookup
CREATE INDEX idx_admin_otps_email ON public.admin_otps (email, used, expires_at);

-- Auto-cleanup old OTPs (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.admin_otps WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_cleanup_otps
AFTER INSERT ON public.admin_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
