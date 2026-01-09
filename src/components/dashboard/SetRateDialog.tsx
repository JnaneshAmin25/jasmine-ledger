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
import { format, parseISO } from 'date-fns';
import { IndianRupee, Loader2, TrendingUp, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const SetRateDialog = () => {
  const { setRate, getPendingEntriesCountForDate, getRateForDate } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rateValue, setRateValue] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const existingRate = getRateForDate(dateStr);
  const pendingCount = getPendingEntriesCountForDate(dateStr);

  // Update rate value when date changes and there's an existing rate
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
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
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <TrendingUp className="h-4 w-4" />
          Set Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-display">Set Market Rate</DialogTitle>
          <DialogDescription>
            Enter the Shankarpura mallige market rate per atte for any date
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
            <Label htmlFor="rate" className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Rate per Atte
            </Label>
            <Input
              id="rate"
              type="number"
              step="1"
              min="0"
              placeholder="e.g., 150"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              className="text-lg font-semibold"
              required
            />
            {existingRate && (
              <p className="text-sm text-muted-foreground">
                Current rate for this date: ₹{existingRate.ratePerAtte}
              </p>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                <strong>{pendingCount}</strong> pending {pendingCount === 1 ? 'entry' : 'entries'} for this date will be automatically calculated.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-primary text-primary-foreground"
              disabled={loading || !rateValue}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {existingRate ? 'Update Rate' : 'Set Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
