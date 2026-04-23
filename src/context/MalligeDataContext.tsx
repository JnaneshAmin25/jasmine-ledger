import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { DailyEntry, MarketRate, WeeklyEarning, MonthlyStats } from '@/types/mallige';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

const STORAGE_KEY = 'mallige_data';
const AUTO_FETCH_INTERVAL_MS = 5 * 60 * 1000;
const CANARA_POST_URL = 'https://thecanarapost.com/2021/12/25/udupi-jasmine-todays-price-19/';
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

interface StoredData {
  entries: DailyEntry[];
  rates: MarketRate[];
}

const getStoredData = (userId: string): StoredData => {
  const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
  if (data) return JSON.parse(data);
  return { entries: [], rates: [] };
};

const saveStoredData = (userId: string, data: StoredData) => {
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
};

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
  todayRate: MarketRate | null;
  autoFetchStatus: 'idle' | 'fetching' | 'done' | 'error';
  lastAutoFetch: Date | null;
  addEntry: (entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte'>) => Promise<DailyEntry | null>;
  setRate: (date: string, ratePerAtte: number, source?: 'auto' | 'manual') => Promise<MarketRate | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  getEntriesForMonth: (yearMonth: string) => DailyEntry[];
  getWeeklyEarnings: () => WeeklyEarning[];
  getMonthlyStats: (yearMonth: string) => MonthlyStats;
  getTodayEntries: () => DailyEntry[];
  getPendingEntriesCount: () => number;
  fetchRateFromWebsite: () => Promise<void>;
}

const MalligeDataContext = createContext<MalligeDataContextValue | null>(null);

export const MalligeDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRate, setTodayRate] = useState<MarketRate | null>(null);
  const [autoFetchStatus, setAutoFetchStatus] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle');
  const [lastAutoFetch, setLastAutoFetch] = useState<Date | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user?.id) {
      const data = getStoredData(user.id);
      setEntries(data.entries);
      setRates(data.rates);
      setTodayRate(data.rates.find(r => r.date === today) ?? null);
      setLoading(false);
    }
  }, [user?.id, today]);

  const addEntry = useCallback(async (
    entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte'>
  ): Promise<DailyEntry | null> => {
    if (!user?.id) return null;

    const quantityAtte = entry.quantityChendu / 4;
    const rateForDate = rates.find(r => r.date === entry.date);
    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      userId: user.id,
      ...entry,
      quantityAtte,
      ratePerAtte: rateForDate?.ratePerAtte ?? null,
      totalAmount: rateForDate ? quantityAtte * rateForDate.ratePerAtte : null,
      rateStatus: rateForDate ? 'confirmed' : 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => {
      const updated = [...prev, newEntry];
      const data = getStoredData(user.id);
      data.entries = updated;
      saveStoredData(user.id, data);
      return updated;
    });

    return newEntry;
  }, [user?.id, rates]);

  const setRate = useCallback(async (
    date: string, ratePerAtte: number, source: 'auto' | 'manual' = 'manual'
  ): Promise<MarketRate | null> => {
    if (!user?.id) return null;

    let newRate: MarketRate;

    setRates(prevRates => {
      const idx = prevRates.findIndex(r => r.date === date);
      if (idx >= 0) {
        newRate = { ...prevRates[idx], ratePerAtte, source };
        const updated = [...prevRates];
        updated[idx] = newRate;
        return updated;
      }
      newRate = {
        id: crypto.randomUUID(),
        date,
        ratePerAtte,
        enteredBy: user.id,
        source,
        createdAt: new Date().toISOString(),
      };
      return [...prevRates, newRate];
    });

    if (date === today) {
      setTodayRate(prev => prev
        ? { ...prev, ratePerAtte, source }
        : {
            id: crypto.randomUUID(),
            date,
            ratePerAtte,
            enteredBy: user.id,
            source,
            createdAt: new Date().toISOString(),
          }
      );
    }

    // Auto-calculate all pending entries for this date
    setEntries(prevEntries => {
      const updated = prevEntries.map(entry =>
        entry.date === date && entry.rateStatus === 'pending'
          ? { ...entry, ratePerAtte, totalAmount: entry.quantityAtte * ratePerAtte, rateStatus: 'confirmed' as const, updatedAt: new Date().toISOString() }
          : entry
      );
      // Persist both rates and entries together
      setRates(prevRates => {
        const data = getStoredData(user.id);
        data.rates = prevRates;
        data.entries = updated;
        saveStoredData(user.id, data);
        return prevRates;
      });
      return updated;
    });

    return newRate!;
  }, [user?.id, today]);

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

  // Wait until 2 PM, then check every 5 min until rate is found
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

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false;
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      const data = getStoredData(user.id);
      data.entries = updated;
      saveStoredData(user.id, data);
      return updated;
    });
    return true;
  }, [user?.id]);

  const getEntriesForMonth = useCallback((yearMonth: string) =>
    entries.filter(e => e.date.startsWith(yearMonth)),
  [entries]);

  const getWeeklyEarnings = useCallback((): WeeklyEarning[] =>
    Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.date === date);
      return {
        date,
        amount: dayEntries.reduce((s, e) => s + (e.totalAmount ?? 0), 0),
        quantity: dayEntries.reduce((s, e) => s + e.quantityAtte, 0),
      };
    }),
  [entries]);

  const getMonthlyStats = useCallback((yearMonth: string): MonthlyStats => {
    const monthEntries = entries.filter(e => e.date.startsWith(yearMonth));
    const confirmed = monthEntries.filter(e => e.rateStatus === 'confirmed');
    return {
      month: yearMonth,
      totalEarnings: confirmed.reduce((s, e) => s + (e.totalAmount ?? 0), 0),
      totalQuantity: monthEntries.reduce((s, e) => s + e.quantityAtte, 0),
      averageRate: confirmed.length > 0
        ? confirmed.reduce((s, e) => s + (e.ratePerAtte ?? 0), 0) / confirmed.length
        : 0,
      entryCount: monthEntries.length,
    };
  }, [entries]);

  const getTodayEntries = useCallback(() =>
    entries.filter(e => e.date === today),
  [entries, today]);

  const getPendingEntriesCount = useCallback(() =>
    entries.filter(e => e.rateStatus === 'pending').length,
  [entries]);

  return (
    <MalligeDataContext.Provider value={{
      entries, rates, loading, todayRate,
      autoFetchStatus, lastAutoFetch,
      addEntry, setRate, deleteEntry,
      getEntriesForMonth, getWeeklyEarnings, getMonthlyStats,
      getTodayEntries, getPendingEntriesCount, fetchRateFromWebsite,
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
