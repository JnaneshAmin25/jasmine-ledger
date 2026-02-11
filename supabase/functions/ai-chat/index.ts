import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate user and fetch their data
    let userDataContext = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        
        if (!claimsError && claimsData?.claims?.sub) {
          const userId = claimsData.claims.sub;

          // Fetch user's recent entries and rates
          const [entriesRes, ratesRes] = await Promise.all([
            supabase.from("mallige_entries").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(60),
            supabase.from("mallige_rates").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
          ]);

          const entries = entriesRes.data || [];
          const rates = ratesRes.data || [];

          // Build summary
          const totalEntries = entries.filter(e => !e.no_mallige_today).length;
          const totalEarnings = entries.reduce((s, e) => s + (e.earnings || 0), 0);
          const totalQuantity = entries.reduce((s, e) => s + (e.quantity || 0), 0);
          const unpaidEntries = entries.filter(e => !e.payment_received && !e.no_mallige_today);
          const unpaidTotal = unpaidEntries.reduce((s, e) => s + (e.earnings || 0), 0);
          const latestRate = rates.length > 0 ? rates[0] : null;
          const noMalligeDays = entries.filter(e => e.no_mallige_today).length;

          // Recent entries detail (last 10)
          const recentEntries = entries.slice(0, 10).map(e => {
            if (e.no_mallige_today) return `${e.date}: No mallige`;
            return `${e.date}: ${e.quantity} chendu (${(e.quantity / 4).toFixed(1)} atte), Rate: ₹${e.rate_per_atte || 'pending'}/atte, Earned: ₹${e.earnings || 'pending'}, Payment: ${e.payment_received ? '✅' : '⏳'}`;
          }).join("\n");

          // Rate history (last 10)
          const rateHistory = rates.slice(0, 10).map(r => `${r.date}: ₹${r.rate_per_atte}/atte`).join("\n");

          userDataContext = `

USER'S ACTUAL DATA (last 60 entries):
- Total entries with mallige: ${totalEntries}
- Total earnings: ₹${totalEarnings.toLocaleString("en-IN")}
- Total quantity: ${totalQuantity} chendu (${(totalQuantity / 4).toFixed(1)} atte)
- Unpaid entries: ${unpaidEntries.length} (₹${unpaidTotal.toLocaleString("en-IN")})
- No-mallige days: ${noMalligeDays}
- Latest rate: ${latestRate ? `₹${latestRate.rate_per_atte}/atte on ${latestRate.date}` : "Not set"}

RECENT ENTRIES (last 10):
${recentEntries || "No entries yet"}

RATE HISTORY (last 10):
${rateHistory || "No rates set yet"}

You now have access to this user's data. Answer their questions using this real data. When they ask about earnings, rates, payments, etc., use the actual numbers above.`;
        }
      } catch (authErr) {
        console.error("Auth/data fetch error:", authErr);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are the Mallige Manager AI Assistant — a helpful assistant for jasmine (mallige) flower farmers in Shankarpura, Karnataka, India.

You help users with:
- Understanding their mallige entries, rates, earnings, and payment tracking
- Answering questions about jasmine farming, market rates, and best practices
- Explaining how to use the Mallige Manager app features
- General agriculture and flower market queries

Keep answers concise, friendly, and practical. Use ₹ for currency.

LANGUAGE RULES:
- If the user writes in Kannada (ಕನ್ನಡ), ALWAYS respond fully in Kannada script.
- If the user writes in English, respond in English.
- If the user mixes both, respond in the same mix they used.
- Use simple, everyday Kannada that a 30+ year old farmer from Karnataka would understand. Avoid overly formal or Sanskritized Kannada.
- For technical or app-related terms that don't have common Kannada equivalents, use the English term with a brief Kannada explanation.
${userDataContext}`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});