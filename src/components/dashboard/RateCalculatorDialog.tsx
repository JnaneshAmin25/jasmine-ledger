import { useState, useMemo } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Calculator, CalendarIcon, IndianRupee, Package, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export const RateCalculatorDialog = () => {
  const { entries, rates } = useMalligeData();
  
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const stats = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return {
        totalAmount: 0,
        totalQuantityAtte: 0,
        totalQuantityChendu: 0,
        averageRate: 0,
        entryCount: 0,
        confirmedCount: 0,
        pendingCount: 0,
      };
    }

    const filteredEntries = entries.filter(entry => {
      if (entry.noMalligeToday) return false;
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: dateRange.from!, end: dateRange.to! });
    });

    const confirmedEntries = filteredEntries.filter(e => e.rateStatus === 'confirmed');
    const pendingEntries = filteredEntries.filter(e => e.rateStatus === 'pending');

    const totalAmount = confirmedEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalQuantityAtte = filteredEntries.reduce((sum, e) => sum + e.quantityAtte, 0);
    const totalQuantityChendu = filteredEntries.reduce((sum, e) => sum + e.quantityChendu, 0);
    
    const ratesInRange = confirmedEntries.map(e => e.ratePerAtte).filter((r): r is number => r !== null);
    const averageRate = ratesInRange.length > 0 
      ? ratesInRange.reduce((sum, r) => sum + r, 0) / ratesInRange.length 
      : 0;

    return {
      totalAmount,
      totalQuantityAtte,
      totalQuantityChendu,
      averageRate,
      entryCount: filteredEntries.length,
      confirmedCount: confirmedEntries.length,
      pendingCount: pendingEntries.length,
    };
  }, [entries, dateRange]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 rounded-xl h-11 font-medium transition-all">
          <Calculator className="h-4 w-4" />
          Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Calculator className="h-5 w-5 text-accent" />
              Rate Calculator
            </DialogTitle>
            <DialogDescription>
              Select a date range to calculate total earnings
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Date Range
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 rounded-xl",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd MMM yyyy')} - {format(dateRange.to, 'dd MMM yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'dd MMM yyyy')
                    )
                  ) : (
                    <span>Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={(date) => date > new Date()}
                  numberOfMonths={1}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {dateRange?.from && dateRange?.to && (
            <div className="space-y-4 animate-fade-in">
              {/* Total Earnings - Hero Stat */}
              <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 border border-primary/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase tracking-wide">Total Earnings</span>
                  </div>
                  <p className="text-4xl font-bold text-gradient">
                    ₹{stats.totalAmount.toLocaleString('en-IN')}
                  </p>
                  {stats.pendingCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-warning">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <p className="text-xs">
                        {stats.pendingCount} pending {stats.pendingCount === 1 ? 'entry' : 'entries'} not included
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-muted/50 border hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Quantity</span>
                  </div>
                  <p className="text-xl font-bold">{stats.totalQuantityAtte.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">atte</span></p>
                  <p className="text-xs text-muted-foreground">{stats.totalQuantityChendu} chendu</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Avg. Rate</span>
                  </div>
                  <p className="text-xl font-bold">₹{stats.averageRate.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/atte</span></p>
                </div>
              </div>

              {/* Entry Count */}
              <div className="p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Entries</p>
                    <p className="text-2xl font-bold">{stats.entryCount}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 text-success">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm">Confirmed: {stats.confirmedCount}</span>
                    </div>
                    {stats.pendingCount > 0 && (
                      <div className="flex items-center gap-2 text-warning">
                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                        <span className="text-sm">Pending: {stats.pendingCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!dateRange?.from || !dateRange?.to) && (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                <Calculator className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Select a date range</p>
              <p className="text-sm text-muted-foreground/70 mt-1">to see your earnings summary</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
