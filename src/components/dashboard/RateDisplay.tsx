import { MarketRate } from '@/types/mallige';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { IndianRupee, Clock, AlertCircle, Sparkles, TrendingUp, Share2, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import jasmineHero from '@/assets/jasmine-hero.jpg';

interface RateDisplayProps {
  rate: MarketRate | null;
  pendingCount: number;
  autoFetchStatus?: 'idle' | 'fetching' | 'done' | 'error';
  lastAutoFetch?: Date | null;
  onRefresh?: () => void;
  onApplyMarketRate?: (rate: number) => void;
}

export const RateDisplay = ({ rate, pendingCount, autoFetchStatus, lastAutoFetch, onRefresh, onApplyMarketRate }: RateDisplayProps) => {
  const currentHour = new Date().getHours();
  const isBeforeTwoPM = currentHour < 14;
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');
  const isFetching = autoFetchStatus === 'fetching';

  const handleShare = async () => {
    const rateText = rate ? `₹${rate.ratePerAtte} per atte` : 'Not set yet';
    const shareText = `🌸 Today's Shankarpura Mallige Rate: ${rateText}\n📅 ${today}\n\nAre you a mallige grower? Track your daily earnings and manage your mallige business easily!\n👉 https://malligeratemanagement.lovable.app`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Today's Mallige Rate", text: shareText });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-xl">
      {/* Jasmine background image */}
      <div className="absolute top-0 right-0 w-40 h-40 md:w-56 md:h-56 opacity-10 pointer-events-none">
        <img src={jasmineHero} alt="" className="w-full h-full object-cover rounded-bl-full" />
      </div>

      <div className="gradient-primary p-[2px] rounded-2xl">
        <div className="bg-card rounded-[14px] p-4 md:p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{today}</p>
                {rate && (
                  <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30 animate-pulse text-xs">
                    <Sparkles className="h-3 w-3" />
                    Live
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full ml-auto text-muted-foreground hover:text-primary"
                  onClick={handleShare}
                  title="Share today's rate"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
                Today's Shankarpura Mallige Rate
              </h2>

              {rate ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-6xl font-display font-bold text-gradient tracking-tight">
                      ₹{rate.ratePerAtte}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-base text-muted-foreground font-medium">per atte</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {rate.source === 'auto' ? 'Auto-fetched' : 'Your set rate'}
                      </span>
                    </div>
                  </div>
                  {rate.source === 'auto' && lastAutoFetch && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      From thecanarapost.com · {format(lastAutoFetch, 'hh:mm a')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-2xl md:text-4xl font-display font-bold text-muted-foreground/50">
                      {isFetching ? (
                        <span className="flex items-center gap-2 text-lg">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Checking...
                        </span>
                      ) : isBeforeTwoPM ? 'Awaiting Rate' : 'Not Set'}
                    </div>
                    {!isFetching && isBeforeTwoPM && (
                      <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/20 py-1 px-2 text-xs">
                        <Clock className="h-3 w-3" />
                        After 2 PM
                      </Badge>
                    )}
                  </div>

                  {/* Auto-fetch status line */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isFetching && <><RefreshCw className="h-3 w-3 animate-spin" /> Checking thecanarapost.com…</>}
                    {!isFetching && autoFetchStatus === 'error' && <><Globe className="h-3 w-3 text-destructive" /><span className="text-destructive">Auto-fetch unavailable</span></>}
                    {!isFetching && autoFetchStatus === 'idle' && !isBeforeTwoPM && <><Globe className="h-3 w-3" /> Checking every 5 min · thecanarapost.com</>}
                    {!isFetching && isBeforeTwoPM && <><Clock className="h-3 w-3" /> Auto-check starts at 2:00 PM</>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-row md:flex-col gap-2">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <span className="text-xs font-semibold text-warning block">{pendingCount} pending</span>
                    <span className="text-[10px] text-warning/70">Set rate to calc</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
                <IndianRupee className="h-3.5 w-3.5 text-primary" />
                <div>
                  <span className="text-xs font-medium text-foreground block">1 atte = 4 chendu</span>
                  <span className="text-[10px] text-muted-foreground">Conversion</span>
                </div>
              </div>

              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isFetching}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Fetching…' : 'Refresh Rate'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
