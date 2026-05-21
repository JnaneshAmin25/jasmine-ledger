import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarPlus, Sparkles } from 'lucide-react';

export const BulkAddDialog = () => {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<7 | 14 | 30>(7);

  const dates = useMemo(() => {
    const today = new Date();
    const list: string[] = [];
    for (let i = 1; i <= preset; i++) {
      list.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }
    return list;
  }, [preset]);

  const [rows, setRows] = useState<Record<string, { chendu: string; rate: string }>>({});

  const getRow = (date: string) => rows[date] ?? { chendu: '', rate: '' };

  const setRow = (date: string, patch: Partial<{ chendu: string; rate: string }>) => {
    setRows((prev) => ({
      ...prev,
      [date]: { ...getRow(date), ...patch },
    }));
  };

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

        <div className="p-6 space-y-4">
          <ToggleGroup
            type="single"
            value={String(preset)}
            onValueChange={(v) => {
              if (v === '7' || v === '14' || v === '30') setPreset(Number(v) as 7 | 14 | 30);
            }}
            className="justify-start gap-2"
          >
            <ToggleGroupItem value="7" className="rounded-xl h-10 px-4 text-base">Last 7 days</ToggleGroupItem>
            <ToggleGroupItem value="14" className="rounded-xl h-10 px-4 text-base">Last 14 days</ToggleGroupItem>
            <ToggleGroupItem value="30" className="rounded-xl h-10 px-4 text-base">Last 30 days</ToggleGroupItem>
          </ToggleGroup>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 sticky top-0 bg-muted/80 backdrop-blur px-4 py-2 text-sm font-medium text-muted-foreground border-b">
              <div>Date</div>
              <div>Chendu</div>
              <div>Rate (₹/atte)</div>
            </div>
            <ul className="divide-y">
              {dates.map((date) => {
                const row = getRow(date);
                const chenduNum = row.chendu ? parseFloat(row.chendu) : 0;
                const rateNum = row.rate ? parseFloat(row.rate) : 0;
                const atte = chenduNum / 4;
                const earnings = atte * rateNum;
                const showEstimate = chenduNum > 0 && rateNum > 0;

                return (
                  <li key={date} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center px-4 py-3">
                    <div>
                      <div className="text-base font-medium">{format(new Date(date), 'EEE, dd MMM')}</div>
                      {showEstimate && (
                        <div className="text-xs text-success mt-0.5">
                          = {atte.toFixed(2)} atte → ₹{earnings.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.25"
                      min="0"
                      placeholder="—"
                      value={row.chendu}
                      onChange={(e) => setRow(date, { chendu: e.target.value })}
                      className="h-11 rounded-lg text-base"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="0"
                      placeholder="—"
                      value={row.rate}
                      onChange={(e) => setRow(date, { rate: e.target.value })}
                      className="h-11 rounded-lg text-base"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
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
