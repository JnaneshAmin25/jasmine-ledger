import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_URL = 'https://thecanarapost.com/2021/12/25/udupi-jasmine-todays-price-19/';

function getTodayDatePatterns(): string[] {
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = monthNames[today.getMonth()];
  const abbr = month.substring(0, 3);
  const day = today.getDate();
  return [
    `${month}\\s+0?${day}(?!\\d)`,
    `0?${day}\\s+${month}`,
    `${abbr}\\.?\\s+0?${day}(?!\\d)`,
    `0?${day}\\s+${abbr}\\.?`,
  ];
}

function extractRateFromHtml(html: string): number | null {
  for (const pattern of getTodayDatePatterns()) {
    // <td>April 22</td><td>630</td>
    const fwd = new RegExp(
      `<td[^>]*>[^<]*${pattern}[^<]*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>`,
      'i'
    );
    const fwdMatch = html.match(fwd);
    if (fwdMatch) {
      const r = parseInt(fwdMatch[1], 10);
      if (r > 0 && r < 10000) return r;
    }

    // Reversed columns: <td>630</td><td>April 22</td>
    const rev = new RegExp(
      `<td[^>]*>\\s*(\\d+)\\s*</td>\\s*<td[^>]*>[^<]*${pattern}[^<]*</td>`,
      'i'
    );
    const revMatch = html.match(rev);
    if (revMatch) {
      const r = parseInt(revMatch[1], 10);
      if (r > 0 && r < 10000) return r;
    }

    // Prose format: "April 22 ... Mallige: Rs 630" or "Mallige Rs 630 ... April 22"
    const prose = new RegExp(
      `${pattern}[\\s\\S]{0,300}?Mallige[:\\s]+(?:Rs\\.?\\s*)?(\\d+)`,
      'i'
    );
    const proseMatch = html.match(prose);
    if (proseMatch) {
      const r = parseInt(proseMatch[1], 10);
      if (r > 0 && r < 10000) return r;
    }

    const proseRev = new RegExp(
      `Mallige[:\\s]+(?:Rs\\.?\\s*)?(\\d+)[\\s\\S]{0,300}?${pattern}`,
      'i'
    );
    const proseRevMatch = html.match(proseRev);
    if (proseRevMatch) {
      const r = parseInt(proseRevMatch[1], 10);
      if (r > 0 && r < 10000) return r;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const rate = extractRateFromHtml(html);
    const date = new Date().toISOString().split('T')[0];

    return new Response(
      JSON.stringify({
        rate,
        date,
        available: rate !== null,
        source: 'thecanarapost.com',
        message: rate ? `Today's rate: Rs ${rate}` : 'Rate not yet published for today',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, available: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
