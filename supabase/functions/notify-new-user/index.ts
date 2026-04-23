import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiting to prevent spam
const recentNotifications = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5; // max 5 notifications per hour

function isRateLimited(email: string): boolean {
  const now = Date.now();
  // Clean old entries
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW) {
      recentNotifications.delete(key);
    }
  }
  
  const count = Array.from(recentNotifications.entries())
    .filter(([, t]) => now - t < RATE_LIMIT_WINDOW).length;
  
  if (count >= MAX_PER_WINDOW) return true;
  
  // Check if same email was notified recently (prevent duplicate signups)
  if (recentNotifications.has(email)) return true;
  
  return false;
}

// Basic spam email detection
function isSpamEmail(email: string): boolean {
  const spamDomains = [
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'dispostable.com', 'fakeinbox.com', 'tempail.com', 'maildrop.cc',
    'trashmail.com', '10minutemail.com', 'temp-mail.org', 'getnada.com',
    'emailondeck.com', 'mohmal.com', 'burnermail.io', 'discard.email',
    'harakirimail.com', 'tmail.com', 'tmpmail.net', 'tmpmail.org',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (spamDomains.includes(domain)) return true;
  
  // Check for obviously fake patterns
  const localPart = email.split('@')[0]?.toLowerCase() || '';
  if (/^[a-z]{20,}$/.test(localPart)) return true; // Very long random strings
  if (/^test\d{4,}/.test(localPart)) return true; // test12345...
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, name } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Spam check
    if (isSpamEmail(email)) {
      console.log("Spam email blocked:", email);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    if (isRateLimited(email)) {
      console.log("Rate limited notification for:", email);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record this notification
    recentNotifications.set(email, Date.now());

    const phone = "918123834047";
    const message = `🌸 *New User Registered!*\n\n👤 Name: ${name || 'Not provided'}\n📧 Email: ${email}\n🕐 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    
    const whatsappUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=`;
    
    // Try CallMeBot (free WhatsApp API)
    // Note: User needs to set up CallMeBot first by sending a message to their bot
    // Alternative: use a simple webhook approach
    console.log("New user notification:", message);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Notification error:", e);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});