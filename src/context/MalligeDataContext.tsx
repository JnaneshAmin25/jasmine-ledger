import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { DailyEntry, MarketRate, WeeklyEarning, MonthlyStats } from '@/types/mallige';
import { cacheService, setEncryptionKey } from '@/lib/cache';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from 'date-fns';

const CACHE_KEY = 'mallige_data';
const AUTO_FETCH_INTERVAL_MS = 5 * 60 * 1000;
const CANARA_POST_URL = 'https://thecanarapost.com/2021/12/25/udupi-jasmine-todays-price-19/';
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

interface CachedData {
  entries: DailyEntry[];
  rates: MarketRate[];
}

function getTodayPatterns(): RegExp[] {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const now = new Date();
  const month = monthNames[now.getMonth()];
  const abbr = month.slice(0, 3);
  const day = now.getDate();
  return [
    `${month}\\s+0?${day}(?!\\d)`,
    `0?${day}\\s+${month}`,
    `${abbr}\\.?\\s+0?${day}(?!\\d)`,
  ].map(v => new RegExp(v, 'i'));
}

function extractRateFromHtml(html: string): number | null {
  for (const pattern of getTodayPatterns()) {
    const p = pattern.source;
    const fwd = new RegExp(`<td[^>]*>[^<]*${p}[^<]*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>`, 'i');
    const fwdM = html.match(fwd);
    if (fwdM) { const r = +fwdM[1]; if (r > 0 && r < 10000) return r; }

    const rev = new RegExp(`<td[^>]*>\\s*(\\d+)\\s*</td>\\s*<td[^>]*>[^<]*${p}[^<]*</td>`, 'i');
    const revM = html.match(rev);
    if (revM) { const r = +revM[1]; if (r > 0 && r < 10000) return r; }

    const prose = new RegExp(`${p}[\\s\\S]{0,300}?Mallige[:\\s]+(?:Rs\\.?\\s*)?(\\d+)`, 'i');
    const proseM = html.match(prose);
    if (proseM) { const r = +proseM[1]; if (r > 0 && r < 10000) return r; }
  }
  return null;
}

export interface MalligeDataContextValue {
  entries: DailyEntry[];
  rates: MarketRate[];
  loading: boolean;
  syncing: boolean;
  todayRate: MarketRate | null;
  autoFetchStatus: 'idle' | 'fetching' | 'done' | 'error';
  lastAutoFetch: Date | null;
  addEntry: (entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte' | 'paymentReceived'>) => Promise<DailyEntry | null>;
  addNoMalligeEntry: (date: string, notes?: string) => Promise<DailyEntry | null>;
  setRate: (date: string, ratePerAtte: number, source?: 'auto' | 'manual') => Promise<MarketRate | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  updatePaymentStatus: (id: string, paymentReceived: boolean) => Promise<boolean>;
  getEntriesForMonth: (yearMonth: string) => DailyEntry[];
  getWeeklyEarnings: (weekOffset?: number) => WeeklyEarning[];
  getMonthlyStats: (yearMonth: string) => MonthlyStats;
  getTodayEntries: () => DailyEntry[];
  getPendingEntriesCount: () => number;
  getPendingEntriesCountForDate: (date: string) => number;
  getRateForDate: (date: string) => MarketRate | null;
  hasEntryForDate: (date: string) => boolean;
  refresh: () => void;
  fetchRateFromWebsite: () => Promise<void>;
}

const MalligeDataContext = createContext<MalligeDataContextValue | null>(null);

export const MalligeDataProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [todayRate, setTodayRate] = useState<MarketRate | null>(null);
  const [autoFetchStatus, setAutoFetchStatus] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle');
  const [lastAutoFetch, setLastAutoFetch] = useState<Date | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setEncryptionKey(user.id);

    // Show cached data instantly while syncing
    const cached = cacheService.get<CachedData>(`${CACHE_KEY}_${user.id}`);
    if (cached) {
      setEntries(cached.entries);
      setRates(cached.rates);
      setTodayRate(cached.rates.find(r => r.date === today) ?? null);
    }
    setLoading(false);

    try {
      setSyncing(true);
      const [entriesResult, ratesResult] = await Promise.all([
        supabase.from('mallige_entries').select('*').eq('user_id', user.id),
        supabase.from('mallige_rates').select('*').eq('user_id', user.id),
      ]);
      if (entriesResult.error) throw entriesResult.error;
      if (ratesResult.error) throw ratesResult.error;

      const backendEntries: DailyEntry[] = (entriesResult.data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        quantityChendu: row.quantity,
        quantityAtte: row.quantity / 4,
        ratePerAtte: row.rate_per_atte,
        totalAmount: row.earnings,
        rateStatus: row.rate_status as 'pending' | 'confirmed',
        noMalligeToday: row.no_mallige_today,
        notes: row.notes,
        paymentReceived: (row as any).payment_received ?? false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const backendRates: MarketRate[] = (ratesResult.data ?? []).map(row => ({
        id: row.id,
        date: row.date,
        ratePerAtte: row.rate_per_atte,
        enteredBy: row.user_id,
        createdAt: row.created_at,
      }));

      setEntries(backendEntries);
      setRates(backendRates);
      setTodayRate(backendRates.find(r => r.date === today) ?? null);
      cacheService.set(`${CACHE_KEY}_${user.id}`, { entries: backendEntries, rates: backendRates });
    } catch (err) {
      console.error('Failed to sync with backend:', err);
    } finally {
      setSyncing(false);
    }
  }, [user?.id, today]);

  useEffect(() => {
    if (user?.id && session) loadData();
  }, [user?.id, session, loadData]);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  // Keeps all components in sync instantly without page refresh

  useEffect(() => {
    if (!user?.id) return;

    const entriesChannel = supabase
      .channel('mallige-entries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mallige_entries', filter: `user_id=eq.${user.id}` }, payload => {
        const currentToday = format(new Date(), 'yyyy-MM-dd');
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newEntry: DailyEntry = {
            id: row.id, userId: row.user_id, date: row.date,
            quantityChendu: row.quantity, quantityAtte: row.quantity / 4,
            ratePerAtte: row.rate_per_atte, totalAmount: row.earnings,
            rateStatus: row.rate_status as 'pending' | 'confirmed',
            noMalligeToday: row.no_mallige_today, notes: row.notes,
            paymentReceived: row.payment_received ?? false,
            createdAt: row.created_at, updatedAt: row.updated_at,
          };
          setEntries(prev => prev.some(e => e.id === newEntry.id) ? prev : [...prev, newEntry]);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          setEntries(prev => prev.map(e => e.id !== row.id ? e : {
            ...e, quantityChendu: row.quantity, quantityAtte: row.quantity / 4,
            ratePerAtte: row.rate_per_atte, totalAmount: row.earnings,
            rateStatus: row.rate_status as 'pending' | 'confirmed',
            noMalligeToday: row.no_mallige_today, notes: row.notes,
            paymentReceived: row.payment_received ?? false, updatedAt: row.updated_at,
          }));
        } else if (payload.eventType === 'DELETE') {
          setEntries(prev => prev.filter(e => e.id !== (payload.old as any).id));
        }
        void currentToday; // used above via closure
      })
      .subscribe();

    const ratesChannel = supabase
      .channel('mallige-rates-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mallige_rates', filter: `user_id=eq.${user.id}` }, payload => {
        const currentToday = format(new Date(), 'yyyy-MM-dd');
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newRate: MarketRate = { id: row.id, date: row.date, ratePerAtte: row.rate_per_atte, enteredBy: row.user_id, createdAt: row.created_at };
          setRates(prev => prev.some(r => r.id === newRate.id) ? prev : [...prev, newRate]);
          if (row.date === currentToday) setTodayRate(newRate);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          const updatedRate: MarketRate = { id: row.id, date: row.date, ratePerAtte: row.rate_per_atte, enteredBy: row.user_id, createdAt: row.created_at };
          setRates(prev => prev.map(r => r.id === row.id ? updatedRate : r));
          if (row.date === currentToday) setTodayRate(updatedRate);
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          setRates(prev => prev.filter(r => r.id !== old.id));
          if (old.date === currentToday) setTodayRate(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(entriesChannel);
      supabase.removeChannel(ratesChannel);
    };
  }, [user?.id]);

  // ── Cache helper ──────────────────────────────────────────────────────────

  const updateCache = useCallback((newEntries: DailyEntry[], newRates: MarketRate[]) => {
    if (!user?.id) return;
    cacheService.set(`${CACHE_KEY}_${user.id}`, { entries: newEntries, rates: newRates });
  }, [user?.id]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addEntry = useCallback(async (
    entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte' | 'paymentReceived'>
  ): Promise<DailyEntry | null> => {
    if (!user?.id) return null;
    const quantityAtte = entry.quantityChendu / 4;
    const rateForDate = rates.find(r => r.date === entry.date);

    const { data, error } = await supabase.from('mallige_entries').insert({
      user_id: user.id,
      date: entry.date,
      quantity: entry.quantityChendu,
      unit: 'chendu',
      rate_per_atte: rateForDate?.ratePerAtte ?? null,
      earnings: rateForDate ? quantityAtte * rateForDate.ratePerAtte : null,
      rate_status: rateForDate ? 'confirmed' : 'pending',
      notes: entry.notes,
      no_mallige_today: false,
    }).select().single();

    if (error) { console.error('Failed to save entry:', error); return null; }

    const newEntry: DailyEntry = {
      id: data.id, userId: user.id, date: data.date,
      quantityChendu: data.quantity, quantityAtte: data.quantity / 4,
      ratePerAtte: data.rate_per_atte, totalAmount: data.earnings,
      rateStatus: data.rate_status as 'pending' | 'confirmed',
      noMalligeToday: data.no_mallige_today, notes: data.notes,
      paymentReceived: false, createdAt: data.created_at, updatedAt: data.updated_at,
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);
    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  const addNoMalligeEntry = useCallback(async (date: string, notes?: string): Promise<DailyEntry | null> => {
    if (!user?.id || entries.some(e => e.date === date)) return null;

    const { data, error } = await supabase.from('mallige_entries').insert({
      user_id: user.id, date, quantity: 0, unit: 'chendu',
      rate_per_atte: null, earnings: 0, rate_status: 'confirmed',
      notes: notes ?? 'No mallige given', no_mallige_today: true,
    }).select().single();

    if (error) { console.error('Failed to save no-mallige entry:', error); return null; }

    const newEntry: DailyEntry = {
      id: data.id, userId: user.id, date: data.date,
      quantityChendu: 0, quantityAtte: 0, ratePerAtte: null, totalAmount: 0,
      rateStatus: 'confirmed', noMalligeToday: true, notes: data.notes,
      paymentReceived: false, createdAt: data.created_at, updatedAt: data.updated_at,
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);
    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  const setRate = useCallback(async (
    date: string, ratePerAtte: number, source: 'auto' | 'manual' = 'manual'
  ): Promise<MarketRate | null> => {
    if (!user?.id) return null;

    const existingRate = rates.find(r => r.date === date);
    let newRate: MarketRate;
    let updatedRates: MarketRate[];

    if (existingRate) {
      const { error } = await supabase.from('mallige_rates').update({ rate_per_atte: ratePerAtte }).eq('id', existingRate.id);
      if (error) { console.error('Failed to update rate:', error); return null; }
      newRate = { ...existingRate, ratePerAtte, source };
      updatedRates = rates.map(r => r.id === existingRate.id ? newRate : r);
    } else {
      const { data, error } = await supabase.from('mallige_rates').insert({
        user_id: user.id, date, rate_per_atte: ratePerAtte,
      }).select().single();
      if (error) { console.error('Failed to save rate:', error); return null; }
      newRate = { id: data.id, date: data.date, ratePerAtte: data.rate_per_atte, enteredBy: user.id, createdAt: data.created_at, source };
      updatedRates = [...rates, newRate];
    }

    setRates(updatedRates);
    if (date === today) setTodayRate(newRate);

    // Auto-calculate pending entries for this date
    const pending = entries.filter(e => e.date === date && e.rateStatus === 'pending' && !e.noMalligeToday);
    if (pending.length > 0) {
      await Promise.all(pending.map(e => supabase.from('mallige_entries').update({
        rate_per_atte: ratePerAtte, earnings: e.quantityAtte * ratePerAtte, rate_status: 'confirmed',
      }).eq('id', e.id)));
    }

    const updatedEntries = entries.map(e =>
      e.date === date && e.rateStatus === 'pending' && !e.noMalligeToday
        ? { ...e, ratePerAtte, totalAmount: e.quantityAtte * ratePerAtte, rateStatus: 'confirmed' as const, updatedAt: new Date().toISOString() }
        : e
    );
    setEntries(updatedEntries);
    updateCache(updatedEntries, updatedRates);
    return newRate;
  }, [user?.id, rates, entries, today, updateCache]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false;
    const { error } = await supabase.from('mallige_entries').delete().eq('id', id);
    if (error) { console.error('Failed to delete entry:', error); return false; }
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);
    return true;
  }, [user?.id, entries, rates, updateCache]);

  const updatePaymentStatus = useCallback(async (id: string, paymentReceived: boolean): Promise<boolean> => {
    if (!user?.id) return false;
    const { error } = await supabase.from('mallige_entries').update({ payment_received: paymentReceived } as any).eq('id', id);
    if (error) { console.error('Failed to update payment status:', error); return false; }
    const updatedEntries = entries.map(e => e.id === id ? { ...e, paymentReceived } : e);
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);
    return true;
  }, [user?.id, entries, rates, updateCache]);

  // ── Auto-fetch rate from The Canara Post ──────────────────────────────────

  // Stable ref so polling interval always uses latest setRate without restarting
  const setRateRef = useRef(setRate);
  setRateRef.current = setRate;

  const fetchRateFromWebsite = useCallback(async () => {
    if (!user?.id) return;
    setAutoFetchStatus('fetching');
    try {
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(CANARA_POST_URL)}&timestamp=${Date.now()}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
      const json = await res.json();
      const rate = extractRateFromHtml(json.contents ?? '');
      if (rate !== null) {
        await setRateRef.current(today, rate, 'auto');
        setLastAutoFetch(new Date());
        setAutoFetchStatus('done');
      } else {
        setAutoFetchStatus('idle');
      }
    } catch {
      setAutoFetchStatus('error');
    }
  }, [user?.id, today]);

  // Wait until 2 PM then check every 5 min until rate is found
  useEffect(() => {
    if (!user?.id || loading) return;
    if (todayRate) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      fetchRateFromWebsite();
      interval = setInterval(fetchRateFromWebsite, AUTO_FETCH_INTERVAL_MS);
    };

    const now = new Date();
    if (now.getHours() >= 14) {
      startPolling();
    } else {
      const msUntilTwoPM =
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).getTime() - now.getTime();
      const timeout = setTimeout(startPolling, msUntilTwoPM);
      return () => { clearTimeout(timeout); if (interval) clearInterval(interval); };
    }

    return () => { if (interval) clearInterval(interval); };
  }, [user?.id, loading, todayRate, fetchRateFromWebsite]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const getEntriesForMonth = useCallback((yearMonth: string) =>
    entries.filter(e => e.date.startsWith(yearMonth)), [entries]);

  const getWeeklyEarnings = useCallback((weekOffset = 0): WeeklyEarning[] => {
    const ref = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
    const days = eachDayOfInterval({
      start: startOfWeek(ref, { weekStartsOn: 0 }),
      end: endOfWeek(ref, { weekStartsOn: 0 }),
    });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.date === dateStr && !e.noMalligeToday);
      return {
        date: dateStr,
        amount: dayEntries.reduce((s, e) => s + (e.totalAmount ?? 0), 0),
        quantity: dayEntries.reduce((s, e) => s + e.quantityAtte, 0),
      };
    });
  }, [entries]);

  const getMonthlyStats = useCallback((yearMonth: string): MonthlyStats => {
    const monthEntries = entries.filter(e => e.date.startsWith(yearMonth) && !e.noMalligeToday);
    const confirmed = monthEntries.filter(e => e.rateStatus === 'confirmed');
    return {
      month: yearMonth,
      totalEarnings: confirmed.reduce((s, e) => s + (e.totalAmount ?? 0), 0),
      totalQuantity: monthEntries.reduce((s, e) => s + e.quantityAtte, 0),
      averageRate: confirmed.length > 0
        ? confirmed.reduce((s, e) => s + (e.ratePerAtte ?? 0), 0) / confirmed.length : 0,
      entryCount: monthEntries.length,
    };
  }, [entries]);

  const getTodayEntries = useCallback(() =>
    entries.filter(e => e.date === today), [entries, today]);

  const getPendingEntriesCount = useCallback(() =>
    entries.filter(e => e.rateStatus === 'pending').length, [entries]);

  const getPendingEntriesCountForDate = useCallback((date: string) =>
    entries.filter(e => e.date === date && e.rateStatus === 'pending').length, [entries]);

  const getRateForDate = useCallback((date: string) =>
    rates.find(r => r.date === date) ?? null, [rates]);

  const hasEntryForDate = useCallback((date: string) =>
    entries.some(e => e.date === date), [entries]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return (
    <MalligeDataContext.Provider value={{
      entries, rates, loading, syncing, todayRate,
      autoFetchStatus, lastAutoFetch,
      addEntry, addNoMalligeEntry, setRate, deleteEntry, updatePaymentStatus,
      getEntriesForMonth, getWeeklyEarnings, getMonthlyStats,
      getTodayEntries, getPendingEntriesCount, getPendingEntriesCountForDate,
      getRateForDate, hasEntryForDate, refresh, fetchRateFromWebsite,
    }}>
      {children}
    </MalligeDataContext.Provider>
  );
};

export const useMalligeDataContext = (): MalligeDataContextValue => {
  const ctx = useContext(MalligeDataContext);
  if (!ctx) throw new Error('useMalligeDataContext must be used inside MalligeDataProvider');
  return ctx;
};
