const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  image: string;
}

function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}[^>]*>(.+?)</${tag}>`, 's');
  const match = xml.match(regex);
  return (match?.[1] || match?.[2] || '').trim();
}

function extractSource(itemXml: string): string {
  const sourceMatch = itemXml.match(/<source[^>]*>(?:<!\[CDATA\[)?(.+?)(?:\]\]>)?<\/source>/);
  return sourceMatch?.[1]?.trim() || 'Google News';
}

function extractImage(itemXml: string): string {
  // Try media:content
  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"/);
  if (mediaMatch?.[1]) return mediaMatch[1];
  // Try enclosure
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enclosureMatch?.[1]) return enclosureMatch[1];
  // Try media:thumbnail
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url="([^"]+)"/);
  if (thumbMatch?.[1]) return thumbMatch[1];
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const queries = [
      'jasmine+flower+agriculture+India',
      'mallige+price+Karnataka',
      'jasmine+cultivation+farming',
    ];
    
    const allItems: NewsItem[] = [];

    for (const query of queries) {
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
      
      try {
        const response = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        
        if (!response.ok) continue;
        
        const xml = await response.text();
        const items = xml.split('<item>').slice(1);
        
        for (const itemXml of items.slice(0, 5)) {
          const title = extractXmlValue(itemXml, 'title');
          const link = extractXmlValue(itemXml, 'link');
          const pubDate = extractXmlValue(itemXml, 'pubDate');
          const source = extractSource(itemXml);
          const image = extractImage(itemXml);
          
          if (title && link) {
            allItems.push({ title, link, pubDate, source, image });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch query ${query}:`, e);
      }
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date descending
    unique.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return new Response(
      JSON.stringify({ success: true, articles: unique.slice(0, 15) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
