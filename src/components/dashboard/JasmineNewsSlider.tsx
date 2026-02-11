import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Autoplay from 'embla-carousel-autoplay';

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export const JasmineNewsSlider = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('jasmine-news');
      if (fnError) throw fnError;
      if (data?.success && data.articles?.length > 0) {
        setArticles(data.articles);
      } else {
        setArticles([]);
      }
    } catch (e) {
      console.error('Failed to fetch news:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-card shadow-md p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Newspaper className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold">Jasmine News</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchNews}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">No news available right now. Tap refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-md overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Newspaper className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Latest Jasmine News</h3>
            <p className="text-[10px] text-muted-foreground">Real-time agriculture updates</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchNews}>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="px-4 pb-4">
        <Carousel
          opts={{ align: 'start', loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {articles.map((article, index) => (
              <CarouselItem key={index} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex flex-col justify-between h-full gap-2">
                    <h4 className="text-sm font-medium leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-primary/80">{article.source}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {article.pubDate ? formatDistanceToNow(new Date(article.pubDate), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </div>
                  </div>
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-3 h-7 w-7" />
          <CarouselNext className="hidden sm:flex -right-3 h-7 w-7" />
        </Carousel>
      </div>
    </div>
  );
};
