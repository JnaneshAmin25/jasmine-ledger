import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarPlus, Sparkles } from 'lucide-react';

export const BulkAddDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 rounded-xl h-11 font-medium transition-all"
        >
          <CalendarPlus className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] rounded-2xl p-0 overflow-hidden">
        <div className="gradient-primary p-5">
          <DialogHeader className="text-primary-foreground">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Bulk Add Past Entries
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-base">
              Fill in chendu and rate for past days. Leave a day blank to skip.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <p className="text-base text-muted-foreground">Coming together…</p>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl h-12 text-base flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled
            className="gradient-primary text-primary-foreground rounded-xl h-12 text-base flex-1 min-w-[140px]"
          >
            Save All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
