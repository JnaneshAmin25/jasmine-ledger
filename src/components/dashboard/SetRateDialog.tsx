import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { IndianRupee, Loader2, TrendingUp, CalendarIcon, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const SetRateDialog = () => {
  const { setRate, getPendingEntriesCountForDate, getRateForDate } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rateValue, setRateValue] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const existingRate = getRateForDate(dateStr);
  const pendingCount = getPendingEntriesCountForDate(dateStr);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setDatePickerOpen(false);
      const rate = getRateForDate(format(date, 'yyyy-MM-dd'));
      setRateValue(rate?.ratePerAtte?.toString() || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rate = await setRate(dateStr, parseFloat(rateValue));

      if (rate) {
        toast({
          title: existingRate ? 'Rate Updated' : 'Rate Set',
          description: `Rate for ${format(selectedDate, 'dd MMM yyyy')} is now ₹${rate.ratePerAtte}/atte. ${pendingCount > 0 ? `${pendingCount} entries updated.` : ''}`,
        });
        setOpen(false);
        setRateValue('');
        setSelectedDate(new Date());
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to set rate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 rounded-xl h-11 font-medium transition-all">
          <TrendingUp className="h-4 w-4" />
          Set Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-5">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Set Market Rate
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the Shankarpura mallige market rate per atte
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              Date
            </Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12 rounded-xl text-base",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate" className="flex items-center gap-2 text-base font-medium">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              Rate per Atte
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">₹</span>
              <Input
                id="rate"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="e.g., 150"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                className="h-14 text-xl font-semibold pl-8 rounded-xl"
                required
              />
            </div>
            {existingRate && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <Check className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Current rate: ₹{existingRate.ratePerAtte}
                </span>
              </div>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  {pendingCount} pending {pendingCount === 1 ? 'entry' : 'entries'}
                </p>
                <p className="text-xs text-warning/80 mt-0.5">
                  Will be automatically calculated with this rate
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-12 text-base flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-primary text-primary-foreground rounded-xl h-12 text-base flex-1 min-w-[140px]"
              disabled={loading || !rateValue}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5 mr-1" />
                  {existingRate ? 'Update Rate' : 'Set Rate'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
