import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const ADMIN_EMAILS: Record<string, { name: string; level: string }> = {
  "vishnubabalsure@gmail.com": { name: "Vishnu Babalsure", level: "Super Admin" },
  "nileshchatap25@gmail.com": { name: "Nilesh Chatap", level: "Admin" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, otp } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email?.toLowerCase().trim();

    if (action === "send") {
      const adminInfo = ADMIN_EMAILS[normalizedEmail];
      if (!adminInfo) {
        return new Response(
          JSON.stringify({ error: "Unauthorized email" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit OTP
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Invalidate old OTPs
      await supabaseAdmin
        .from("admin_otps")
        .update({ used: true })
        .eq("email", normalizedEmail)
        .eq("used", false);

      // Store new OTP
      await supabaseAdmin.from("admin_otps").insert({
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      // Send OTP email via Resend
      let emailSent = false;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          const { error: emailError } = await resend.emails.send({
            from: "PhishGuard Admin <onboarding@resend.dev>",
            to: [normalizedEmail],
            subject: "Your Admin Login OTP - PhishGuard",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">🛡️ PhishGuard</h1>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Admin Access Portal</p>
                </div>
                <div style="background: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 8px;">Hello, <strong>${adminInfo.name}</strong></p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Your one-time password for admin login:</p>
                  <div style="background: #7c3aed; color: white; font-size: 32px; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block; font-weight: bold;">
                    ${otpCode}
                  </div>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
                <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
            `,
          });

          if (emailError) {
            console.error("Email send error:", emailError);
          } else {
            emailSent = true;
            console.log(`OTP email sent to ${normalizedEmail}`);
          }
        } catch (emailErr) {
          console.error("Resend error:", emailErr);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          adminInfo, 
          emailSent,
          // Only include OTP in response if email failed (fallback)
          ...(emailSent ? {} : { otpCode })
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const adminInfo = ADMIN_EMAILS[normalizedEmail];
      if (!adminInfo) {
        return new Response(
          JSON.stringify({ error: "Unauthorized email" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: otpRecord, error } = await supabaseAdmin
        .from("admin_otps")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "OTP expired or not found. Please request a new one." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.attempts >= 3) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please request a new OTP.", locked: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.otp_code !== otp) {
        await supabaseAdmin
          .from("admin_otps")
          .update({ attempts: otpRecord.attempts + 1 })
          .eq("id", otpRecord.id);

        const remaining = 2 - otpRecord.attempts;
        return new Response(
          JSON.stringify({
            error: remaining > 0
              ? `Invalid OTP. ${remaining} tries left.`
              : "Too many attempts. Please request a new OTP.",
            locked: remaining <= 0
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("admin_otps")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, adminInfo }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
