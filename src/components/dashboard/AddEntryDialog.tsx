import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Package, Store, FileText, Loader2, CalendarIcon, Sparkles, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const AddEntryDialog = () => {
  const { addEntry, getRateForDate } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [quantityChendu, setQuantityChendu] = useState('');
  const [flowerShopName, setFlowerShopName] = useState('');
  const [notes, setNotes] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const rateForDate = getRateForDate(dateStr);
  const quantityAtte = quantityChendu ? parseFloat(quantityChendu) / 4 : 0;
  const estimatedAmount = rateForDate ? quantityAtte * rateForDate.ratePerAtte : null;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setDatePickerOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const entry = await addEntry({
        date: dateStr,
        quantityChendu: parseFloat(quantityChendu),
        flowerShopName: flowerShopName || undefined,
        notes: notes || undefined,
      });

      if (entry) {
        toast({
          title: 'Entry Added ✓',
          description: entry.rateStatus === 'pending' 
            ? `Entry for ${format(selectedDate, 'dd MMM')} saved. Amount will be calculated when rate is set.`
            : `₹${entry.totalAmount?.toLocaleString()} earned on ${format(selectedDate, 'dd MMM')}!`,
        });
        
        setQuantityChendu('');
        setFlowerShopName('');
        setNotes('');
        setSelectedDate(new Date());
        setOpen(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all gap-2 rounded-xl h-12 px-6 text-base">
          <Plus className="h-5 w-5" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] rounded-2xl p-0 overflow-hidden">
        <div className="gradient-primary p-5">
          <DialogHeader className="text-primary-foreground">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Add Entry
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-base">
              Record your mallige delivery
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Picker */}
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
            {rateForDate ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/20">
                <Check className="h-5 w-5 text-success" />
                <span className="text-base text-success font-medium">
                  Rate: ₹{rateForDate.ratePerAtte}/atte
                </span>
              </div>
            ) : (
              <p className="text-base text-warning flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/20">
                <CalendarIcon className="h-5 w-5" />
                No rate set for this date yet
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-2 text-base font-medium">
              <Package className="h-5 w-5 text-muted-foreground" />
              Quantity (Chendu)
            </Label>
            <Input
              id="quantity"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="e.g., 8"
              value={quantityChendu}
              onChange={(e) => setQuantityChendu(e.target.value)}
              className="h-12 rounded-xl text-lg"
              required
            />
            {quantityChendu && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50">
                <span className="text-base text-muted-foreground">
                  = {quantityAtte.toFixed(2)} atte
                </span>
                {estimatedAmount !== null && (
                  <span className="text-base text-success font-semibold">
                    ₹{estimatedAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Flower Shop */}
          <div className="space-y-2">
            <Label htmlFor="shop" className="flex items-center gap-2 text-base font-medium">
              <Store className="h-5 w-5 text-muted-foreground" />
              Flower Shop <span className="text-muted-foreground font-normal text-sm">(Optional)</span>
            </Label>
            <Input
              id="shop"
              type="text"
              placeholder="e.g., Krishna Flowers"
              value={flowerShopName}
              onChange={(e) => setFlowerShopName(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 text-base font-medium">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Notes <span className="text-muted-foreground font-normal text-sm">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl resize-none text-base"
            />
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-12 text-base flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-primary text-primary-foreground rounded-xl h-12 text-base flex-1 min-w-[140px]"
              disabled={loading || !quantityChendu}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-1" />
                  Add Entry
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
