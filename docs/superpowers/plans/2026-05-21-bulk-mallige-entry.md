# Bulk Mallige Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bulk Add dialog so the user can backfill chendu + rate for the last 7 / 14 / 30 days in one screen, instead of opening AddEntryDialog and SetRateDialog twice per day.

**Architecture:** Single new React component `BulkAddDialog.tsx` mounted on the Dashboard. It uses the existing `addEntry` and `setRate` mutations from `MalligeDataContext` — no schema, no backend, no context changes. State is local to the dialog and keyed by date string so preset changes preserve typed values.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, shadcn/ui (Dialog, Button, Input, ToggleGroup, Badge), date-fns, lucide-react, Supabase (already wired via context).

**TDD note:** This codebase has no test framework (no `test` script in package.json, no vitest/jest installed). The design spec explicitly waives automated tests for this feature. Every task ends with a **manual verification step** in the browser instead of `pytest`-style assertions. Each task is still small (2–5 minutes of code + a quick browser check) and ends with a commit.

**Reference spec:** `docs/superpowers/specs/2026-05-21-bulk-mallige-entry-design.md`

---

## File Structure

**New:**
- `src/components/dashboard/BulkAddDialog.tsx` — the entire feature; one focused component.

**Modified:**
- `src/pages/Dashboard.tsx` — one-line change to render `<BulkAddDialog />` next to the existing dialog buttons.

That's it. No new types, no context changes, no migrations.

---

## Dev server reminder

Before starting any task, the engineer should have the dev server running so each verification step is just a refresh:

```bash
cd E:/jasmine-ledger
bun install        # only on first run
bun run dev
```

The app runs at `http://localhost:8080` (Vite default — check console output for the actual port). Sign in with the existing account before testing. Open browser DevTools console to watch for errors.

---

## Task 1: Scaffold BulkAddDialog and mount on Dashboard

**Goal:** Get a clickable "Bulk Add" button on the Dashboard that opens an empty dialog. No logic yet — just verifying the wiring works.

**Files:**
- Create: `src/components/dashboard/BulkAddDialog.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create the skeleton dialog**

Create `src/components/dashboard/BulkAddDialog.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Mount on Dashboard**

Modify `src/pages/Dashboard.tsx`. Add the import next to the other dashboard imports (around line 11–14):

```tsx
import { BulkAddDialog } from '@/components/dashboard/BulkAddDialog';
```

And render it inside the Quick Actions section, immediately after `<AddEntryDialog />` (currently line 84):

```tsx
<AddEntryDialog />
<BulkAddDialog />
<SetRateDialog />
```

- [ ] **Step 3: Verify in browser**

1. Refresh the dev server in the browser.
2. On the Dashboard, the Quick Actions row should now show **Add Entry · Bulk Add · Set Rate · No Mallige · Calculate** (and the news link).
3. Click **Bulk Add** → dialog opens with the gradient header and "Coming together…" placeholder.
4. Click **Cancel** → dialog closes.
5. Open DevTools console — no React errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx src/pages/Dashboard.tsx
git commit -m "Add BulkAddDialog scaffold and mount on Dashboard"
```

---

## Task 2: Preset selector and date list

**Goal:** Add the 7/14/30-day preset toggle and derive the list of dates to display. Each date shows in a row stub (date label only, no inputs yet).

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Add preset state and date derivation**

Open `BulkAddDialog.tsx`. Replace the `import { useState } from 'react';` line with:

```tsx
import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
```

Inside the `BulkAddDialog` component, after the existing `const [open, setOpen] = useState(false);` line, add:

```tsx
const [preset, setPreset] = useState<7 | 14 | 30>(7);

const dates = useMemo(() => {
  const today = new Date();
  const list: string[] = [];
  for (let i = 1; i <= preset; i++) {
    list.push(format(subDays(today, i), 'yyyy-MM-dd'));
  }
  return list;
}, [preset]);
```

- [ ] **Step 2: Render preset toggle and date rows**

Replace the body `<div className="p-6">…placeholder…</div>` block with:

```tsx
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
      {dates.map((date) => (
        <li key={date} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center px-4 py-3">
          <span className="text-base font-medium">{format(new Date(date), 'EEE, dd MMM')}</span>
          <span className="text-sm text-muted-foreground">—</span>
          <span className="text-sm text-muted-foreground">—</span>
        </li>
      ))}
    </ul>
  </div>
</div>
```

- [ ] **Step 3: Verify in browser**

1. Refresh. Open Bulk Add.
2. Default preset highlighted: **Last 7 days**. Below it, 7 rows showing yesterday → 7 days ago, in reverse chronological order. Today is NOT in the list.
3. Click **Last 14 days** → 14 rows. Click **Last 30 days** → 30 rows with a scrollbar inside the bordered area.
4. Date format is like `Mon, 19 May`.
5. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Add preset selector and date list to BulkAddDialog"
```

---

## Task 3: Row inputs and live estimate

**Goal:** Each row gets a real chendu input (`step="0.25"`) and rate input. As you type, a small "= X atte → ₹Y" estimate appears.

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Add row state**

At the top of the file, add to the imports:

```tsx
import { Input } from '@/components/ui/input';
```

Inside the component, after the `dates` `useMemo`, add:

```tsx
const [rows, setRows] = useState<Record<string, { chendu: string; rate: string }>>({});

const getRow = (date: string) => rows[date] ?? { chendu: '', rate: '' };

const setRow = (date: string, patch: Partial<{ chendu: string; rate: string }>) => {
  setRows((prev) => ({
    ...prev,
    [date]: { ...getRow(date), ...patch },
  }));
};
```

- [ ] **Step 2: Replace the placeholder `<li>` row with real inputs**

Replace the `dates.map(...)` block with:

```tsx
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
```

- [ ] **Step 3: Verify in browser**

1. Refresh. Open Bulk Add.
2. Type `4` into the chendu field of any row, then `150` into rate → the date label area below the date shows `= 1.00 atte → ₹150`.
3. Type `0.25` into chendu → number input accepts the decimal.
4. Type `0.75` into chendu → estimate updates to `= 0.19 atte → ...`.
5. Switch preset from 7 to 30 → the values you typed on the rows for, say, yesterday are still there. Switch back to 7 → still there.
6. Clear chendu → estimate disappears for that row.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Add chendu/rate inputs and live earnings estimate per row"
```

---

## Task 4: Existing entries lock the row; prefill existing rate

**Goal:** Rows for dates that already have an entry become read-only with a `✓ already added` badge. Rows for dates that have a rate but no entry get the rate field pre-filled.

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Pull data from context**

Add this import at the top of the file:

```tsx
import { useMalligeData } from '@/hooks/useMalligeData';
import { Check } from 'lucide-react';
```

Inside the component, after `const [open, setOpen] = useState(false);`, add:

```tsx
const { entries, getRateForDate, hasEntryForDate } = useMalligeData();
```

- [ ] **Step 2: Pre-fill existing rates when the dialog opens or preset changes**

Add a `useEffect` after the `dates` memo:

```tsx
import { useEffect } from 'react';
```

(add to the existing `react` import line — make it `import { useEffect, useMemo, useState } from 'react';`)

```tsx
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
```

- [ ] **Step 3: Render locked rows for existing entries**

In the `dates.map((date) => { ... })` block, replace the entire returned `<li>` with:

```tsx
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

return (
  <li key={date} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center px-4 py-3">
    {/* ...keep the editable row body from Task 3 here unchanged... */}
  </li>
);
```

Make sure the editable `<li>` body kept in the `else` branch is the same JSX from Task 3 (date label + estimate + chendu input + rate input).

- [ ] **Step 4: Verify in browser**

1. Refresh. Open Bulk Add.
2. Any date in the range that already has an entry (e.g. today's earlier test entries, or real past entries) renders as a single greyed row with `Already added` badge and no inputs.
3. Any date that has a rate but no entry: open the row → rate input is pre-filled with that rate.
4. Type in chendu on a pre-filled-rate row → estimate appears using the existing rate.
5. Switch presets — locked rows stay locked.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Lock rows with existing entries and prefill known rates"
```

---

## Task 5: Validation

**Goal:** Block submit when chendu is filled but rate is not. Block when chendu is `0`. Blank chendu = silent skip (no error).

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Add per-row error state**

Inside the component, alongside the `rows` state, add:

```tsx
const [errors, setErrors] = useState<Record<string, 'rate-missing' | 'chendu-zero'>>({});
```

When the user edits any input, clear that row's error. Modify `setRow`:

```tsx
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
```

- [ ] **Step 2: Add a validator**

Above the JSX `return`, add:

```tsx
const validate = (): Record<string, 'rate-missing' | 'chendu-zero'> => {
  const errs: Record<string, 'rate-missing' | 'chendu-zero'> = {};
  for (const date of dates) {
    if (hasEntryForDate(date)) continue;
    const row = getRow(date);
    if (!row.chendu.trim()) continue; // blank = skip
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
```

- [ ] **Step 3: Apply error styling and helper text**

In the editable `<li>` (the non-locked branch from Task 4), wrap each `<Input>` so it picks up the error ring. Replace the chendu `<Input>` with:

```tsx
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
```

Replace the rate `<Input>` with:

```tsx
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
```

- [ ] **Step 4: Wire Save All button to validation (no save yet)**

Replace the disabled Save All `<Button>` in the footer with:

```tsx
<Button
  type="button"
  onClick={() => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // TODO Task 6: perform the actual save here
    console.log('validation passed, would save', rows);
  }}
  disabled={filledCount === 0}
  className="gradient-primary text-primary-foreground rounded-xl h-12 text-base flex-1 min-w-[140px]"
>
  Save All ({filledCount})
</Button>
```

- [ ] **Step 5: Verify in browser**

1. Refresh. Open Bulk Add.
2. With all rows blank → **Save All (0)** is disabled.
3. Type chendu on one row, leave rate blank → button enables → click Save All → rate field gets a red ring + "Rate required" helper.
4. Type rate → ring disappears.
5. Type chendu = `0` → click Save All → chendu field gets red ring + "Must be greater than 0".
6. Type chendu = `4` and rate = `150` → click Save All → console logs `validation passed, would save {...}`. No errors visible.
7. Mixing valid and invalid rows: only the invalid ones show rings; the rest pass silently.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Validate bulk-add rows before submit"
```

---

## Task 6: Submit logic with per-row results and toast

**Goal:** Save All actually writes entries (and rates when needed), reports a summary toast, and keeps failed rows editable.

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Wire mutations and toast**

Update the context destructuring to pull in `addEntry` and `setRate`:

```tsx
const { entries, addEntry, setRate: setRateForDate, getRateForDate, hasEntryForDate } = useMalligeData();
```

(Renaming to `setRateForDate` avoids shadowing the local `setRow`-style style. Use `setRateForDate` everywhere below.)

Add to imports at the top:

```tsx
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
```

In the component body, add the toast hook and a `saving` state:

```tsx
const { toast } = useToast();
const [saving, setSaving] = useState(false);
```

- [ ] **Step 2: Add the submit handler**

Above the JSX `return`, after the `validate` helper, add:

```tsx
const handleSave = async () => {
  const errs = validate();
  setErrors(errs);
  if (Object.keys(errs).length > 0) return;

  setSaving(true);

  const toProcess = dates
    .filter((d) => !hasEntryForDate(d))
    .filter((d) => getRow(d).chendu.trim() !== '')
    .slice()
    .reverse(); // oldest first so the rate is in place before the entry insert

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

  // Clear successful rows from local state so they don't linger; failed rows stay.
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
    // Dialog stays open so the user can retry failed rows.
  }
};
```

- [ ] **Step 3: Wire button to handleSave + spinner**

Replace the Save All button from Task 5 with:

```tsx
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
```

Disable Cancel while saving too:

```tsx
<Button
  type="button"
  variant="outline"
  onClick={() => setOpen(false)}
  disabled={saving}
  className="rounded-xl h-12 text-base flex-1"
>
  Cancel
</Button>
```

- [ ] **Step 4: Verify happy path**

1. Refresh. Open Bulk Add.
2. Fill chendu + rate on two or three different rows.
3. Click Save All → spinner spins → dialog closes → toast says `3 entries saved · 4 days skipped` (or similar).
4. Reopen Bulk Add → those same rows now show `✓ Already added` and are read-only.
5. The Dashboard's WeeklyChart and EntryList reflect the new entries (realtime via `MalligeDataContext`).

- [ ] **Step 5: Verify failure path**

1. In DevTools, go offline (Network tab → "Offline").
2. Open Bulk Add, fill one row, click Save All.
3. Toast: `0 saved · 1 failed: dd MMM. Failed rows are still editable.` (destructive variant)
4. Dialog stays open. Row is still editable.
5. Go back online → click Save All again → succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Wire BulkAddDialog Save All to addEntry and setRate"
```

---

## Task 7: Mobile polish

**Goal:** On narrow screens, the three-column grid stacks readably. On all sizes, focus order is sensible and there are no visual regressions.

**Files:**
- Modify: `src/components/dashboard/BulkAddDialog.tsx`

- [ ] **Step 1: Adjust the dialog and row grid for small screens**

Find the grid header row (sticky top, currently `grid-cols-[1fr_1fr_1fr]`) and change it to:

```tsx
<div className="hidden sm:grid grid-cols-[1fr_1fr_1fr] gap-2 sticky top-0 bg-muted/80 backdrop-blur px-4 py-2 text-sm font-medium text-muted-foreground border-b">
  <div>Date</div>
  <div>Chendu</div>
  <div>Rate (₹/atte)</div>
</div>
```

In the editable `<li>` (the non-locked branch), change the outer grid class from `grid-cols-[1fr_1fr_1fr]` to `grid-cols-1 sm:grid-cols-[1fr_1fr_1fr]` and prefix each input wrapper with a small label that's visible only below the `sm` breakpoint. The chendu wrapper becomes:

```tsx
<div>
  <label className="block text-xs text-muted-foreground mb-1 sm:hidden">Chendu</label>
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
```

And the rate wrapper becomes:

```tsx
<div>
  <label className="block text-xs text-muted-foreground mb-1 sm:hidden">Rate (₹/atte)</label>
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
```

Apply the same `grid-cols-1 sm:grid-cols-[1fr_2fr]` change to the locked `<li>`:

```tsx
<li key={date} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 items-center px-4 py-3 bg-muted/40">
```

Also clamp the dialog itself to fit on phones — find:

```tsx
<DialogContent className="sm:max-w-[640px] rounded-2xl p-0 overflow-hidden">
```

And change to:

```tsx
<DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl p-0">
```

(Remove `overflow-hidden` — we want the dialog to scroll on small screens. The inner table also scrolls, which is fine; the body scroll catches preset switches that overflow.)

- [ ] **Step 2: Verify on mobile width**

1. Refresh. Open Bulk Add.
2. In DevTools, toggle device toolbar and pick iPhone width (~390px).
3. Each row now stacks: Date on top, then Chendu (with "Chendu" label), then Rate (with "Rate (₹/atte)" label). No horizontal overflow.
4. Locked rows: Date on top, "Already added" badge below.
5. Toggle back to desktop width → three-column header reappears, rows go back to a single grid row.
6. Smoke test the happy path again on mobile width: fill one row, click Save All → still works.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/BulkAddDialog.tsx
git commit -m "Make BulkAddDialog responsive on mobile widths"
```

---

## Final verification checklist

After all 7 tasks, run through the spec's manual test plan end-to-end:

- [ ] Default preset is 7 days; today is not in the list
- [ ] Filling chendu without rate triggers rate-required validation
- [ ] Blank chendu = silent skip; `0` chendu = validation error
- [ ] Save All shows a `5 entries saved · 2 days skipped` toast
- [ ] Re-opening shows successful rows as `✓ Already added`
- [ ] Switching preset 7 → 30 preserves data on overlapping dates
- [ ] Dates with pre-existing rates pre-fill the rate field
- [ ] Offline failure surfaces a partial-failure toast and leaves the dialog open
- [ ] WeeklyChart and EntryList update without manual refresh (realtime sync)
- [ ] Mobile width: rows stack cleanly, no horizontal scroll
- [ ] `bun run lint` passes
- [ ] `bun run build` passes

Then ship it.
