import { useState } from 'react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { MarketRate } from '@/types/mallige';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { IndianRupee, Loader2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SetRateDialogProps {
  currentRate: MarketRate | null;
}

export const SetRateDialog = ({ currentRate }: SetRateDialogProps) => {
  const { setRate, getPendingEntriesCount } = useMalligeData();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateValue, setRateValue] = useState(currentRate?.ratePerAtte?.toString() || '');

  const today = format(new Date(), 'yyyy-MM-dd');
  const pendingCount = getPendingEntriesCount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rate = await setRate(today, parseFloat(rateValue));

      if (rate) {
        toast({
          title: currentRate ? 'Rate Updated' : 'Rate Set',
          description: `Today's rate is now ₹${rate.ratePerAtte}/atte. ${pendingCount > 0 ? `${pendingCount} entries updated.` : ''}`,
        });
        setOpen(false);
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
          {currentRate ? 'Update Rate' : 'Set Today\'s Rate'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {currentRate ? 'Update Today\'s Rate' : 'Set Today\'s Rate'}
          </DialogTitle>
          <DialogDescription>
            Enter the Shankarpura mallige market rate per atte
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
            {currentRate && (
              <p className="text-sm text-muted-foreground">
                Current rate: ₹{currentRate.ratePerAtte}
              </p>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning">
                <strong>{pendingCount}</strong> pending {pendingCount === 1 ? 'entry' : 'entries'} will be automatically calculated.
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
              {currentRate ? 'Update Rate' : 'Set Rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
