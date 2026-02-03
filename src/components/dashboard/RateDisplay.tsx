import { MarketRate } from '@/types/mallige';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { IndianRupee, Clock, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';

interface RateDisplayProps {
  rate: MarketRate | null;
  pendingCount: number;
}

export const RateDisplay = ({ rate, pendingCount }: RateDisplayProps) => {
  const currentHour = new Date().getHours();
  const isBeforeNoon = currentHour < 12;
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <div className="gradient-primary p-1">
        <CardContent className="bg-card rounded-lg p-6 md:p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 gradient-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent opacity-5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{today}</p>
                {rate && (
                  <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30 animate-pulse">
                    <Sparkles className="h-3 w-3" />
                    Live
                  </Badge>
                )}
              </div>
              
              <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
                Today's Shankarpura Mallige Rate
              </h2>
              
              {rate ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl md:text-7xl font-display font-bold text-gradient tracking-tight">
                    ₹{rate.ratePerAtte}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xl text-muted-foreground font-medium">per atte</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Market rate
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-3xl md:text-5xl font-display font-bold text-muted-foreground/50">
                    {isBeforeNoon ? 'Awaiting Rate' : 'Not Set'}
                  </div>
                  {isBeforeNoon && (
                    <Badge variant="secondary" className="gap-1.5 bg-warning/10 text-warning border-warning/20 py-1.5 px-3">
                      <Clock className="h-3.5 w-3.5" />
                      Usually set after 12 PM
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Pending entries indicator */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 shadow-sm">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-warning block">
                      {pendingCount} pending {pendingCount === 1 ? 'entry' : 'entries'}
                    </span>
                    <span className="text-xs text-warning/70">Set rate to calculate</span>
                  </div>
                </div>
              )}

              {/* Conversion info */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground block">1 atte = 4 chendu</span>
                  <span className="text-xs text-muted-foreground">Conversion rate</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
