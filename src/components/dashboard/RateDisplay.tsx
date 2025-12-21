import { MarketRate } from '@/types/mallige';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { IndianRupee, Clock, AlertCircle } from 'lucide-react';

interface RateDisplayProps {
  rate: MarketRate | null;
  pendingCount: number;
}

export const RateDisplay = ({ rate, pendingCount }: RateDisplayProps) => {
  const currentHour = new Date().getHours();
  const isBeforeNoon = currentHour < 12;
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

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
                    {isBeforeNoon ? 'Awaiting Rate' : 'Not Set'}
                  </div>
                  {isBeforeNoon && (
                    <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/20">
                      <Clock className="h-3 w-3" />
                      After 12 PM
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {/* Pending entries indicator */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    {pendingCount} pending {pendingCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              )}

              {/* Quick stats */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  1 atte = 4 chendu
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
