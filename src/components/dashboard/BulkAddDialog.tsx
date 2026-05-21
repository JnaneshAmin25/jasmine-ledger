import { useEffect, useMemo, useState } from 'react';
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
import { CalendarPlus, Check, Loader2, Sparkles } from 'lucide-react';
import { useMalligeData } from '@/hooks/useMalligeData';
import { useToast } from '@/hooks/use-toast';

export const BulkAddDialog = () => {
  const { entries, addEntry, setRate: setRateForDate, getRateForDate, hasEntryForDate } = useMalligeData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<7 | 14 | 30>(7);
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => {
    const today = new Date();
    const list: string[] = [];
    for (let i = 1; i <= preset; i++) {
      list.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }
    return list;
  }, [preset]);

  const [rows, setRows] = useState<Record<string, { chendu: string; rate: string }>>({});
  const [errors, setErrors] = useState<Record<string, 'rate-missing' | 'chendu-zero'>>({});

  const getRow = (date: string) => rows[date] ?? { chendu: '', rate: '' };

  const setRow = (date: string, patch: Partial<{ chendu: string; rate: string }>) => {
    setRows((prev) => ({
      ...prev,
      [date]: { ...getRow(date), ...patch },
    }));
    setErrors((prev) => {
      if (!prev[date]) return prev;
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const date of dates) {
        const existingRate = getRateForDate(date);
        if (existingRate && !next[date]?.rate) {
          next[date] = { chendu: next[date]?.chendu ?? '', rate: String(existingRate.ratePerAtte) };
        }
      }
      return next;
    });
  }, [open, dates, getRateForDate]);

  const validate = (): Record<string, 'rate-missing' | 'chendu-zero'> => {
    const errs: Record<string, 'rate-missing' | 'chendu-zero'> = {};
    for (const date of dates) {
      if (hasEntryForDate(date)) continue;
      const row = getRow(date);
      if (!row.chendu.trim()) continue;
      const chenduNum = parseFloat(row.chendu);
      if (!Number.isFinite(chenduNum) || chenduNum <= 0) {
        errs[date] = 'chendu-zero';
        continue;
      }
      const rateNum = parseFloat(row.rate);
      if (!row.rate.trim() || !Number.isFinite(rateNum) || rateNum <= 0) {
        errs[date] = 'rate-missing';
      }
    }
    return errs;
  };

  const filledCount = dates.filter((d) => {
    if (hasEntryForDate(d)) return false;
    const r = getRow(d);
    return r.chendu.trim() !== '';
  }).length;

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);

    const toProcess = dates
      .filter((d) => !hasEntryForDate(d))
      .filter((d) => getRow(d).chendu.trim() !== '')
      .slice()
      .reverse();

    const failed: string[] = [];
    const succeeded: string[] = [];

    for (const date of toProcess) {
      const row = getRow(date);
      const chenduNum = parseFloat(row.chendu);
      const rateNum = parseFloat(row.rate);

      try {
        const existingRate = getRateForDate(date);
        if (!existingRate || existingRate.ratePerAtte !== rateNum) {
          const rateResult = await setRateForDate(date, rateNum);
          if (!rateResult) throw new Error('setRate returned null');
        }
        const entry = await addEntry({ date, quantityChendu: chenduNum });
        if (!entry) throw new Error('addEntry returned null');
        succeeded.push(date);
      } catch (err) {
        console.error('Bulk add failed for', date, err);
        failed.push(date);
      }
    }

    setSaving(false);

    setRows((prev) => {
      const next = { ...prev };
      for (const d of succeeded) delete next[d];
      return next;
    });

    const skipped = dates.filter(
      (d) => !hasEntryForDate(d) && getRow(d).chendu.trim() === '',
    ).length;

    if (failed.length === 0) {
      toast({
        title: 'Bulk Add Complete ✓',
        description: `${succeeded.length} ${succeeded.length === 1 ? 'entry' : 'entries'} saved${skipped > 0 ? ` · ${skipped} day${skipped === 1 ? '' : 's'} skipped` : ''}.`,
      });
      setOpen(false);
    } else {
      const failedLabel = failed
        .map((d) => format(new Date(d), 'dd MMM'))
        .join(', ');
      toast({
        title: 'Some entries failed',
        description: `${succeeded.length} saved · ${failed.length} failed: ${failedLabel}. Failed rows are still editable.`,
        variant: 'destructive',
      });
    }
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
                const locked = hasEntryForDate(date);
                const existingEntry = locked ? entries.find((e) => e.date === date) : null;

                if (locked) {
                  return (
                    <li key={date} className="grid grid-cols-[1fr_2fr] gap-2 items-center px-4 py-3 bg-muted/40">
                      <div className="text-base font-medium text-muted-foreground">
                        {format(new Date(date), 'EEE, dd MMM')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">Already added</span>
                        {existingEntry?.totalAmount != null && (
                          <span className="text-muted-foreground">· ₹{existingEntry.totalAmount.toLocaleString()}</span>
                        )}
                      </div>
                    </li>
                  );
                }

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
                    <div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min="0"
                        placeholder="—"
                        value={row.chendu}
                        onChange={(e) => setRow(date, { chendu: e.target.value })}
                        className={`h-11 rounded-lg text-base ${errors[date] === 'chendu-zero' ? 'ring-2 ring-destructive' : ''}`}
                      />
                      {errors[date] === 'chendu-zero' && (
                        <p className="text-xs text-destructive mt-1">Must be greater than 0</p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="0"
                        placeholder="—"
                        value={row.rate}
                        onChange={(e) => setRow(date, { rate: e.target.value })}
                        className={`h-11 rounded-lg text-base ${errors[date] === 'rate-missing' ? 'ring-2 ring-destructive' : ''}`}
                      />
                      {errors[date] === 'rate-missing' && (
                        <p className="text-xs text-destructive mt-1">Rate required</p>
                      )}
                    </div>
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
            disabled={saving}
            className="rounded-xl h-12 text-base flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={filledCount === 0 || saving}
            className="gradient-primary text-primary-foreground rounded-xl h-12 text-base flex-1 min-w-[140px]"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>Save All ({filledCount})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
