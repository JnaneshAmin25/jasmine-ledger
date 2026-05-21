# Bulk Mallige Entry — Design

**Date:** 2026-05-21
**Status:** Approved (pending user sign-off on this written spec)

## Problem

Backfilling past-week mallige data is painful today. To record one past day the user must:

1. Open `AddEntryDialog` → pick date → enter chendu → save (entry lands in `pending` because no rate is set yet for that date)
2. Open `SetRateDialog` → pick the same date → enter rate → save (entry is recalculated to `confirmed`)

For a week's catch-up that is 14 dialog openings. The user has the data on hand as `(date, chendu, rate)` triples and just wants to punch it in.

## Goal

A single dialog that lets the user enter chendu + rate for the last 7, 14, or 30 days in one screen, then save everything in one click.

## Non-goals

- Importing from CSV / photo / OCR
- Editing entries that already exist (the bulk dialog **locks** any date that already has an entry; editing/deleting goes through the existing per-entry UI)
- Bulk-add for *future* dates
- Backfilling for ranges other than the three presets

## User flow

1. User clicks **Bulk Add** on the Dashboard (new button next to **Add Entry**).
2. Dialog opens with a preset selector at top: `[Last 7 days] [Last 14 days] [Last 30 days]`. Default: 7.
3. A scrollable table renders one row per day in the chosen range (most recent at top, going back). Today is excluded — bulk add is for backfill only.
4. For each row:
   - **Date** column shows formatted date (e.g., `Mon, 19 May`).
   - **Chendu** input (`type="number"`, `step="0.25"`, `min="0"`).
   - **Rate (₹/atte)** input (`type="number"`, `step="1"`, `min="0"`). Pre-filled with the existing rate for that date if one exists.
   - Right-aligned hint: `= X atte → ₹Y` when both chendu and rate are filled.
   - If an entry already exists for that date, the whole row is disabled and shows a `✓ already added` badge instead of the inputs.
5. User changes the preset → table rerenders. Any chendu/rate the user already typed for dates that remain in the new range is preserved.
6. User clicks **Save All**.
7. While saving: button shows a spinner; rows are disabled.
8. On finish, a toast summarises: `5 entries saved · 2 days skipped` (or `3 saved · 2 failed: 15 May, 17 May` on partial failure). Failed rows stay editable; successful rows flip to the `✓ already added` state.

## Per-row rules

- **Blank chendu → skip the row.** No entry, no rate write. This is how the user signals "no delivery that day."
- **Chendu filled, rate blank → validation error on submit.** Tooltip on the rate field: "Rate required when chendu is filled." (User confirmed they always have the rate handy when backfilling.)
- **Chendu and rate both filled:**
  - If no rate exists for that date → write a new rate.
  - If a rate exists and the value differs → update the existing rate (this also reconciles any pending entries for that date via the existing `setRate` logic in `MalligeDataContext`).
  - If a rate exists and the value matches → no rate write, just create the entry.
  - Then create the entry via `addEntry({ date, quantityChendu })`.
- **Existing entry for the date → row locked.** Bulk add never modifies existing entries. To change a past entry, the user deletes it from the list and re-bulk-adds.

## Submit behaviour

- Iterate rows in chronological order (oldest first) so realtime updates stream in naturally.
- For each row: `setRate` (if needed), then `addEntry`. Both are awaited per-row so the per-date rate is in place before the entry is inserted (the existing `addEntry` reads `rates` from context to compute earnings at insert time).
- Independent failures: a failure on one row does not abort the batch. Failed dates are collected and reported in the final toast; their rows remain editable.
- No client-side transaction or rollback — `mallige_entries` and `mallige_rates` are independent and the existing single-add flow has the same semantics.

## Components

### New: `src/components/dashboard/BulkAddDialog.tsx`

State:
- `open: boolean`
- `preset: 7 | 14 | 30`
- `rows: Record<string, { chendu: string; rate: string }>` — keyed by `yyyy-MM-dd` so values survive preset changes
- `saving: boolean`
- `failedDates: string[]` (cleared on next submit)

Derived:
- `dates: string[]` — `eachDayOfInterval` from `today - preset` to `today - 1`, formatted as `yyyy-MM-dd`, reverse-chronological for display.
- For each date: `existingEntry`, `existingRate` looked up from context.

Renders:
- Dialog header (matches visual style of `AddEntryDialog` — gradient header, sparkle icon, rounded 2xl).
- Preset toggle group.
- Scrollable table (max-height ~60vh, internal scroll) with sticky header row.
- Footer: **Cancel** + **Save All** (gradient primary). Save All is disabled when `rows` has zero filled chendu values or while `saving`.

### Modified: `src/pages/Dashboard.tsx`

Add `<BulkAddDialog />` next to the existing `<AddEntryDialog />`. The Bulk Add button is `variant="outline"` with the same height/radius as Set Rate, and uses the `CalendarPlus` icon from lucide-react.

### Unchanged

`MalligeDataContext` — `addEntry` and `setRate` already do everything we need. No backend or schema changes.

## Validation

On Save All, before submitting:
- For each row where chendu is filled: rate must also be filled and `> 0`.
- Chendu must be `> 0` (treat `0` as "user typed zero, skip" — same as blank? **Decision: blank = skip, `0` = validation error** so the user can't accidentally submit zero-quantity entries).
- If any validation fails, no submit happens; the offending rows get a red ring on the bad field.

## Edge cases

- **Preset includes today**: bulk add starts at `today - 1`, never includes today (today is handled by `AddEntryDialog` + `SetRateDialog` because rate auto-fetch runs at 2 PM and shouldn't be raced).
- **All rows blank**: Save All is disabled, no toast needed.
- **All rows have existing entries**: every row is locked, Save All is disabled.
- **Network drops mid-batch**: each row is an independent supabase call; failed ones surface in the final toast.
- **User opens dialog, types data, closes without saving**: state is local to the dialog — closing discards typed values. (Reopening starts fresh. Future improvement: persist in localStorage, but YAGNI for now.)
- **Rate updates triggered by bulk add fire the existing realtime channel**, which will rerender other components naturally.

## Visual style

Matches `AddEntryDialog`:
- Rounded 2xl dialog, hidden overflow, gradient header band.
- Inputs: h-12, rounded-xl, base text.
- Locked rows: `bg-muted/50`, success-colour badge with `Check` icon.
- Estimate hint: `text-success` when both fields present.
- Mobile: table collapses to stacked cards per date (Tailwind responsive breakpoints; not custom JS).

## Testing

Manual test plan (no automated tests exist in repo today; not adding any for this feature):

1. Open Bulk Add → default preset is 7 days → 7 rows visible, today excluded.
2. Fill chendu only on row 1 → click Save All → validation error on rate.
3. Fill chendu + rate on rows 1, 3, 5 → Save All → 3 entries saved, 4 days skipped toast.
4. Reopen Bulk Add → rows 1, 3, 5 now show `✓ already added` and are disabled.
5. Switch preset 7 → 30 → row data preserved for dates that overlap; new rows blank.
6. Pick a date that already has a rate (e.g., from auto-fetch) → rate field is pre-filled; changing it updates the rate.
7. Network failure simulation: kill wifi mid-save → partial failure toast lists failed dates; failed rows stay editable.

## Out of scope (future ideas)

- localStorage persistence of unsaved bulk-add state
- Custom date range picker
- CSV import
- Same-day bulk entry (today is single-add only by design)
