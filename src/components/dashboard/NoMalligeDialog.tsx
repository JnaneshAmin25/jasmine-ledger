import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { CalendarOff, CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const NoMalligeDialog = () => {
  const { addNoMalligeEntry, hasEntryForDate } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const alreadyHasEntry = hasEntryForDate(dateStr);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setDatePickerOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (alreadyHasEntry) {
      toast({
        title: 'Entry Exists',
        description: `You already have an entry for ${format(selectedDate, 'dd MMM yyyy')}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const entry = await addNoMalligeEntry(dateStr, notes || undefined);

      if (entry) {
        toast({
          title: 'Recorded ✓',
          description: `Marked ${format(selectedDate, 'dd MMM yyyy')} as no mallige day.`,
        });
        setOpen(false);
        setNotes('');
        setSelectedDate(new Date());
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted rounded-xl h-12 text-base">
          <CalendarOff className="h-5 w-5" />
          No Mallige
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px] rounded-2xl p-0 overflow-hidden">
        <div className="bg-muted/50 p-5">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">No Mallige Today</DialogTitle>
            <DialogDescription className="text-base">
              Mark a day when you didn't give mallige
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
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {alreadyHasEntry && (
              <p className="text-base text-destructive font-medium">
                An entry already exists for this date
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">Reason <span className="text-muted-foreground font-normal text-sm">(Optional)</span></Label>
            <Textarea
              id="notes"
              placeholder="e.g., Rain, Festival, Personal day..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl text-base resize-none"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-12 text-base flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="secondary"
              className="rounded-xl h-12 text-base flex-1"
              disabled={loading || alreadyHasEntry}
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              Mark Day Off
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
