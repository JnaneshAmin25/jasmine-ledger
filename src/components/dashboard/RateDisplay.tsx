import { MarketRate } from '@/types/mallige';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { IndianRupee, Clock, AlertCircle, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';

interface RateDisplayProps {
  rate: MarketRate | null;
  pendingCount: number;
  autoFetchStatus?: 'idle' | 'fetching' | 'done' | 'error';
  lastAutoFetch?: Date | null;
  onRefresh?: () => void;
}

export const RateDisplay = ({ rate, pendingCount, autoFetchStatus, lastAutoFetch, onRefresh }: RateDisplayProps) => {
  const currentHour = new Date().getHours();
  const isBeforeTwoPM = currentHour < 14;
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');
  const isFetching = autoFetchStatus === 'fetching';

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="gradient-primary p-1">
        <CardContent className="bg-card rounded-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{today}</p>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Today's Shankarpura Mallige Rate
              </h2>

              {rate ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl md:text-6xl font-display font-bold text-gradient">
                    ₹{rate.ratePerAtte}
                  </span>
                  <span className="text-xl text-muted-foreground font-medium">per atte</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-3xl md:text-4xl font-display font-bold text-muted-foreground">
                    {isFetching ? 'Checking...' : isBeforeNoon ? 'Awaiting Rate' : 'Not Set'}
                  </div>
                  {!isFetching && isBeforeTwoPM && (
                    <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/20">
                      <Clock className="h-3 w-3" />
                      After 2 PM
                    </Badge>
                  )}
                </div>
              )}

              {/* Auto-fetch status */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {isFetching && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Checking thecanarapost.com…
                  </span>
                )}
                {!isFetching && rate?.source === 'auto' && lastAutoFetch && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-fetched · {format(lastAutoFetch, 'hh:mm a')}
                  </span>
                )}
                {!isFetching && autoFetchStatus === 'error' && (
                  <span className="flex items-center gap-1.5 text-xs text-destructive">
                    <Globe className="h-3 w-3" />
                    Auto-fetch unavailable
                  </span>
                )}
                {!isFetching && autoFetchStatus === 'idle' && !rate && !isBeforeTwoPM && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    Checking every 5 min · thecanarapost.com
                  </span>
                )}
                {!isFetching && !rate && isBeforeTwoPM && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Auto-check starts at 2:00 PM
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    {pendingCount} pending {pendingCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  1 atte = 4 chendu
                </span>
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
        </CardContent>
      </div>
    </Card>
  );
};
