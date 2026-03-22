const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const targetUrl = 'https://thecanarapost.com/2021/12/25/udupi-jasmine-todays-price-19/';
    const zenrowsKey = Deno.env.get('ZENROWS_API_KEY');

    let html = '';

    if (zenrowsKey) {
      // Use ZenRows for reliable scraping
      const apiUrl = `https://api.zenrows.com/v1/?url=${encodeURIComponent(targetUrl)}&apikey=${zenrowsKey}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error('ZenRows failed, trying direct fetch');
        const directRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        html = await directRes.text();
      } else {
        html = await response.text();
      }
    } else {
      // Direct fetch fallback
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      html = await response.text();
    }

    // Extract the headline rate: "March 22  Mallige: Rs 380"
    const headlineMatch = html.match(/(\w+)\s+(\d{1,2})\s+Mallige:\s*Rs\s*(\d+)/i);
    
    // Also try extracting from table - first row is today's rate
    const tableMatch = html.match(/<td[^>]*>\s*(\w+)\s+(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/i);

    let rate: number | null = null;
    let dateLabel = '';

    if (headlineMatch) {
      rate = parseInt(headlineMatch[3], 10);
      dateLabel = `${headlineMatch[1]} ${headlineMatch[2]}`;
    } else if (tableMatch) {
      rate = parseInt(tableMatch[3], 10);
      dateLabel = `${tableMatch[1]} ${tableMatch[2]}`;
    }

    // Extract recent rates table
    const recentRates: { date: string; rate: number }[] = [];
    const rowRegex = /<td[^>]*>\s*(\w+)\s+(\d{1,2})\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      recentRates.push({
        date: `${match[1]} ${match[2]}`,
        rate: parseInt(match[3], 10),
      });
    }

    if (rate === null) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract rate from page' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        todayRate: rate,
        dateLabel,
        recentRates: recentRates.slice(0, 10),
        source: 'The Canara Post',
        scrapedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping rate:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to scrape rate' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
