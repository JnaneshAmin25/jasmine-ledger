import { MarketRate } from '@/types/mallige';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { IndianRupee, Clock, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import jasmineHero from '@/assets/jasmine-hero.jpg';

interface RateDisplayProps {
  rate: MarketRate | null;
  pendingCount: number;
}

export const RateDisplay = ({ rate, pendingCount }: RateDisplayProps) => {
  const currentHour = new Date().getHours();
  const isBeforeNoon = currentHour < 12;
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

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
              </div>
              
              <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
                Today's Shankarpura Mallige Rate
              </h2>
              
              {rate ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-6xl font-display font-bold text-gradient tracking-tight">
                    ₹{rate.ratePerAtte}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base text-muted-foreground font-medium">per atte</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Market rate
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-2xl md:text-4xl font-display font-bold text-muted-foreground/50">
                    {isBeforeNoon ? 'Awaiting Rate' : 'Not Set'}
                  </div>
                  {isBeforeNoon && (
                    <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/20 py-1 px-2 text-xs">
                      <Clock className="h-3 w-3" />
                      Usually set after 12 PM
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-row md:flex-col gap-2">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <span className="text-xs font-semibold text-warning block">
                      {pendingCount} pending
                    </span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
