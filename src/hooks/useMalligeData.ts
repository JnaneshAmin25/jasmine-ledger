import { useState, useEffect, useCallback } from 'react';
import { DailyEntry, MarketRate, WeeklyEarning, MonthlyStats } from '@/types/mallige';
import { cacheService } from '@/lib/cache';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

const CACHE_KEY = 'mallige_data';

interface CachedData {
  entries: DailyEntry[];
  rates: MarketRate[];
}

// API call to Edge Function
const mongoApi = async (action: string, payload: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await supabase.functions.invoke('mongodb-api', {
    body: { ...payload, action },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
};

export const useMalligeData = () => {
  const { user, session } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [todayRate, setTodayRate] = useState<MarketRate | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Load from cache first, then sync with backend
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Load from cache first for instant display
    const cached = cacheService.get<CachedData>(`${CACHE_KEY}_${user.id}`);
    if (cached) {
      setEntries(cached.entries);
      setRates(cached.rates);
      const rate = cached.rates.find(r => r.date === today);
      setTodayRate(rate || null);
    }

    setLoading(false);

    // Sync with backend
    try {
      setSyncing(true);
      const result = await mongoApi('sync', { userId: user.id, collection: '' });
      
      if (result) {
        const backendEntries = result.entries || [];
        const backendRates = result.rates || [];
        
        setEntries(backendEntries);
        setRates(backendRates);
        
        const rate = backendRates.find((r: MarketRate) => r.date === today);
        setTodayRate(rate || null);
        
        // Update cache
        cacheService.set(`${CACHE_KEY}_${user.id}`, {
          entries: backendEntries,
          rates: backendRates,
        });
      }
    } catch (err) {
      console.error('Failed to sync with backend:', err);
      // Keep using cached/local data
    } finally {
      setSyncing(false);
    }
  }, [user?.id, today]);

  useEffect(() => {
    if (user?.id && session) {
      loadData();
    }
  }, [user?.id, session, loadData]);

  // Update local cache
  const updateCache = useCallback((newEntries: DailyEntry[], newRates: MarketRate[]) => {
    if (!user?.id) return;
    cacheService.set(`${CACHE_KEY}_${user.id}`, {
      entries: newEntries,
      rates: newRates,
    });
  }, [user?.id]);

  // Add new entry
  const addEntry = useCallback(async (entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte'>) => {
    if (!user?.id) return null;

    const quantityAtte = entry.quantityChendu / 4;
    const rateForDate = rates.find(r => r.date === entry.date);
    const rateStatus = rateForDate ? 'confirmed' : 'pending';
    const totalAmount = rateForDate ? quantityAtte * rateForDate.ratePerAtte : null;

    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      userId: user.id,
      ...entry,
      quantityAtte,
      ratePerAtte: rateForDate?.ratePerAtte || null,
      totalAmount,
      rateStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    // Sync to backend
    try {
      const result = await mongoApi('insertOne', {
        userId: user.id,
        collection: 'entries',
        data: newEntry,
      });
      
      if (result?.document) {
        // Update with backend ID
        const finalEntry = { ...newEntry, _id: result.insertedId };
        const finalEntries = updatedEntries.map(e => e.id === newEntry.id ? finalEntry : e);
        setEntries(finalEntries);
        updateCache(finalEntries, rates);
        return finalEntry;
      }
    } catch (err) {
      console.error('Failed to save entry to backend:', err);
    }

    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  // Add "No Mallige Today" entry
  const addNoMalligeEntry = useCallback(async (date: string, notes?: string) => {
    if (!user?.id) return null;

    const existingEntry = entries.find(e => e.date === date);
    if (existingEntry) {
      return null; // Already has an entry for this date
    }

    const newEntry: DailyEntry = {
      id: crypto.randomUUID(),
      userId: user.id,
      date,
      quantityChendu: 0,
      quantityAtte: 0,
      ratePerAtte: null,
      totalAmount: 0,
      rateStatus: 'confirmed',
      noMalligeToday: true,
      notes: notes || 'No mallige given',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    try {
      await mongoApi('insertOne', {
        userId: user.id,
        collection: 'entries',
        data: newEntry,
      });
    } catch (err) {
      console.error('Failed to save no-mallige entry:', err);
    }

    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  // Add or update rate
  const setRate = useCallback(async (date: string, ratePerAtte: number) => {
    if (!user?.id) return null;

    const existingRateIndex = rates.findIndex(r => r.date === date);
    let updatedRates: MarketRate[];
    let newRate: MarketRate;

    if (existingRateIndex >= 0) {
      newRate = {
        ...rates[existingRateIndex],
        ratePerAtte,
      };
      updatedRates = [...rates];
      updatedRates[existingRateIndex] = newRate;
    } else {
      newRate = {
        id: crypto.randomUUID(),
        date,
        ratePerAtte,
        enteredBy: user.id,
        createdAt: new Date().toISOString(),
      };
      updatedRates = [...rates, newRate];
    }

    setRates(updatedRates);
    if (date === today) {
      setTodayRate(newRate);
    }

    // Update all pending entries for this date
    const updatedEntries = entries.map(entry => {
      if (entry.date === date && entry.rateStatus === 'pending' && !entry.noMalligeToday) {
        return {
          ...entry,
          ratePerAtte,
          totalAmount: entry.quantityAtte * ratePerAtte,
          rateStatus: 'confirmed' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    setEntries(updatedEntries);
    updateCache(updatedEntries, updatedRates);

    // Sync to backend
    try {
      if (existingRateIndex >= 0) {
        await mongoApi('updateOne', {
          userId: user.id,
          collection: 'rates',
          filter: { id: newRate.id },
          update: { ratePerAtte },
        });
      } else {
        await mongoApi('insertOne', {
          userId: user.id,
          collection: 'rates',
          data: newRate,
        });
      }

      // Update pending entries in backend
      for (const entry of updatedEntries.filter(e => e.date === date && e.rateStatus === 'confirmed')) {
        await mongoApi('updateOne', {
          userId: user.id,
          collection: 'entries',
          filter: { id: entry.id },
          update: { 
            ratePerAtte: entry.ratePerAtte, 
            totalAmount: entry.totalAmount, 
            rateStatus: entry.rateStatus 
          },
        });
      }
    } catch (err) {
      console.error('Failed to save rate to backend:', err);
    }

    return newRate;
  }, [user?.id, rates, entries, today, updateCache]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    try {
      await mongoApi('deleteOne', {
        userId: user.id,
        collection: 'entries',
        filter: { id },
      });
    } catch (err) {
      console.error('Failed to delete entry from backend:', err);
    }

    return true;
  }, [user?.id, entries, rates, updateCache]);

  // Get entries for a specific month
  const getEntriesForMonth = useCallback((yearMonth: string) => {
    return entries.filter(e => e.date.startsWith(yearMonth));
  }, [entries]);

  // Get weekly earnings (last 7 days)
  const getWeeklyEarnings = useCallback((): WeeklyEarning[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return last7Days.map(date => {
      const dayEntries = entries.filter(e => e.date === date && !e.noMalligeToday);
      const amount = dayEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const quantity = dayEntries.reduce((sum, e) => sum + e.quantityAtte, 0);
      return { date, amount, quantity };
    });
  }, [entries]);

  // Get monthly stats
  const getMonthlyStats = useCallback((yearMonth: string): MonthlyStats => {
    const monthEntries = entries.filter(e => e.date.startsWith(yearMonth) && !e.noMalligeToday);
    const confirmedEntries = monthEntries.filter(e => e.rateStatus === 'confirmed');
    
    const totalEarnings = confirmedEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalQuantity = monthEntries.reduce((sum, e) => sum + e.quantityAtte, 0);
    const avgRate = confirmedEntries.length > 0 
      ? confirmedEntries.reduce((sum, e) => sum + (e.ratePerAtte || 0), 0) / confirmedEntries.length 
      : 0;

    return {
      month: yearMonth,
      totalEarnings,
      totalQuantity,
      averageRate: avgRate,
      entryCount: monthEntries.length,
    };
  }, [entries]);

  // Get today's entries
  const getTodayEntries = useCallback(() => {
    return entries.filter(e => e.date === today);
  }, [entries, today]);

  // Get pending entries count (all)
  const getPendingEntriesCount = useCallback(() => {
    return entries.filter(e => e.rateStatus === 'pending').length;
  }, [entries]);

  // Get pending entries count for a specific date
  const getPendingEntriesCountForDate = useCallback((date: string) => {
    return entries.filter(e => e.date === date && e.rateStatus === 'pending').length;
  }, [entries]);

  // Get rate for a specific date
  const getRateForDate = useCallback((date: string) => {
    return rates.find(r => r.date === date) || null;
  }, [rates]);

  // Check if entry exists for date
  const hasEntryForDate = useCallback((date: string) => {
    return entries.some(e => e.date === date);
  }, [entries]);

  // Refresh data from backend
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    entries,
    rates,
    loading,
    syncing,
    todayRate,
    addEntry,
    addNoMalligeEntry,
    setRate,
    deleteEntry,
    getEntriesForMonth,
    getWeeklyEarnings,
    getMonthlyStats,
    getTodayEntries,
    getPendingEntriesCount,
    getPendingEntriesCountForDate,
    getRateForDate,
    hasEntryForDate,
    refresh,
  };
};
