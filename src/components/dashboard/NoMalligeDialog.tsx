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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const alreadyHasEntry = hasEntryForDate(dateStr);

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
          title: 'Recorded',
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
        <Button variant="outline" className="gap-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted">
          <CalendarOff className="h-4 w-4" />
          No Mallige
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-display">No Mallige Today</DialogTitle>
          <DialogDescription>
            Mark a day when you didn't give mallige
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
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {alreadyHasEntry && (
              <p className="text-sm text-destructive">
                An entry already exists for this date
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Reason (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Rain, Festival, Personal day..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="secondary"
              disabled={loading || alreadyHasEntry}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Mark Day Off
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
