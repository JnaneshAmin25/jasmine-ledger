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
import { Calculator, CalendarIcon, IndianRupee, Package, TrendingUp } from 'lucide-react';
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
        <Button variant="outline" className="gap-2 border-accent/30 text-accent-foreground hover:bg-accent/10">
          <Calculator className="h-4 w-4" />
          Rate Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Rate Calculator
          </DialogTitle>
          <DialogDescription>
            Select a date range to calculate total earnings and statistics
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Range
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
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
              <PopoverContent className="w-auto p-0" align="start">
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
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <IndianRupee className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Earnings</span>
                </div>
                <p className="text-3xl font-bold text-primary">
                  ₹{stats.totalAmount.toLocaleString('en-IN')}
                </p>
                {stats.pendingCount > 0 && (
                  <p className="text-xs text-warning mt-1">
                    {stats.pendingCount} pending {stats.pendingCount === 1 ? 'entry' : 'entries'} not included
                  </p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs">Total Quantity</span>
                  </div>
                  <p className="text-lg font-semibold">{stats.totalQuantityAtte.toFixed(2)} atte</p>
                  <p className="text-xs text-muted-foreground">{stats.totalQuantityChendu} chendu</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Avg. Rate</span>
                  </div>
                  <p className="text-lg font-semibold">₹{stats.averageRate.toFixed(0)}/atte</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Entries</p>
                      <p className="text-lg font-semibold">{stats.entryCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-success">Confirmed: {stats.confirmedCount}</p>
                      {stats.pendingCount > 0 && (
                        <p className="text-xs text-warning">Pending: {stats.pendingCount}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!dateRange?.from || !dateRange?.to) && (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a date range to see your earnings summary</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
