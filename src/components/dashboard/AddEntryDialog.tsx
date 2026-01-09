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
import { Plus, Package, Store, FileText, Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const AddEntryDialog = () => {
  const { addEntry, getRateForDate } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [quantityChendu, setQuantityChendu] = useState('');
  const [flowerShopName, setFlowerShopName] = useState('');
  const [notes, setNotes] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const rateForDate = getRateForDate(dateStr);
  const quantityAtte = quantityChendu ? parseFloat(quantityChendu) / 4 : 0;
  const estimatedAmount = rateForDate ? quantityAtte * rateForDate.ratePerAtte : null;

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
          title: 'Entry Added',
          description: entry.rateStatus === 'pending' 
            ? `Entry for ${format(selectedDate, 'dd MMM')} saved. Amount will be calculated when rate is set.`
            : `₹${entry.totalAmount?.toLocaleString()} earned on ${format(selectedDate, 'dd MMM')}!`,
        });
        
        // Reset form
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
        <Button className="gradient-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-shadow gap-2">
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">Add Entry</DialogTitle>
          <DialogDescription>
            Record your mallige delivery for any date
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
            {rateForDate ? (
              <p className="text-sm text-success">
                Rate: ₹{rateForDate.ratePerAtte}/atte
              </p>
            ) : (
              <p className="text-sm text-warning">
                No rate set for this date yet
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quantity (in Chendu)
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 8"
              value={quantityChendu}
              onChange={(e) => setQuantityChendu(e.target.value)}
              required
            />
            {quantityChendu && (
              <p className="text-sm text-muted-foreground">
                = {quantityAtte.toFixed(2)} atte
                {estimatedAmount !== null && (
                  <span className="text-success font-medium">
                    {' '}(₹{estimatedAmount.toLocaleString()} estimated)
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shop" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Flower Shop Name (Optional)
            </Label>
            <Input
              id="shop"
              type="text"
              placeholder="e.g., Krishna Flowers"
              value={flowerShopName}
              onChange={(e) => setFlowerShopName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
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
              className="gradient-primary text-primary-foreground"
              disabled={loading || !quantityChendu}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
