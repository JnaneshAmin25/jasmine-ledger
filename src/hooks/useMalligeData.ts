import { useState, useEffect, useCallback } from 'react';
import { DailyEntry, MarketRate, WeeklyEarning, MonthlyStats } from '@/types/mallige';
import { cacheService } from '@/lib/cache';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';

const CACHE_KEY = 'mallige_data';

interface CachedData {
  entries: DailyEntry[];
  rates: MarketRate[];
}

export const useMalligeData = () => {
  const { user, session } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [todayRate, setTodayRate] = useState<MarketRate | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Load from cache first, then sync with Supabase
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

    // Sync with Supabase
    try {
      setSyncing(true);
      
      const [entriesResult, ratesResult] = await Promise.all([
        supabase.from('mallige_entries').select('*').eq('user_id', user.id),
        supabase.from('mallige_rates').select('*').eq('user_id', user.id),
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (ratesResult.error) throw ratesResult.error;

      // Map database rows to app types
      const backendEntries: DailyEntry[] = (entriesResult.data || []).map(row => ({
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

      const backendRates: MarketRate[] = (ratesResult.data || []).map(row => ({
        id: row.id,
        date: row.date,
        ratePerAtte: row.rate_per_atte,
        enteredBy: row.user_id,
        createdAt: row.created_at,
      }));

      setEntries(backendEntries);
      setRates(backendRates);
      
      const rate = backendRates.find((r: MarketRate) => r.date === today);
      setTodayRate(rate || null);
      
      // Update cache
      cacheService.set(`${CACHE_KEY}_${user.id}`, {
        entries: backendEntries,
        rates: backendRates,
      });
    } catch (err) {
      console.error('Failed to sync with backend:', err);
    } finally {
      setSyncing(false);
    }
  }, [user?.id, today]);

  useEffect(() => {
    if (user?.id && session) {
      loadData();
    }
  }, [user?.id, session, loadData]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user?.id) return;

    const entriesChannel = supabase
      .channel('mallige-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mallige_entries',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime entry update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            const newEntry: DailyEntry = {
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
              paymentReceived: row.payment_received ?? false,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
            setEntries(prev => {
              const exists = prev.some(e => e.id === newEntry.id);
              return exists ? prev : [...prev, newEntry];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setEntries(prev => prev.map(e => {
              if (e.id === row.id) {
                return {
                  ...e,
                  quantityChendu: row.quantity,
                  quantityAtte: row.quantity / 4,
                  ratePerAtte: row.rate_per_atte,
                  totalAmount: row.earnings,
                  rateStatus: row.rate_status as 'pending' | 'confirmed',
                  noMalligeToday: row.no_mallige_today,
                  notes: row.notes,
                  paymentReceived: row.payment_received ?? false,
                  updatedAt: row.updated_at,
                };
              }
              return e;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            setEntries(prev => prev.filter(e => e.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    const ratesChannel = supabase
      .channel('mallige-rates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mallige_rates',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime rate update:', payload);
          const currentToday = format(new Date(), 'yyyy-MM-dd');
          
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            const newRate: MarketRate = {
              id: row.id,
              date: row.date,
              ratePerAtte: row.rate_per_atte,
              enteredBy: row.user_id,
              createdAt: row.created_at,
            };
            setRates(prev => {
              const exists = prev.some(r => r.id === newRate.id);
              return exists ? prev : [...prev, newRate];
            });
            // Update todayRate immediately if this is today's rate
            if (row.date === currentToday) {
              setTodayRate(newRate);
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const updatedRate: MarketRate = {
              id: row.id,
              date: row.date,
              ratePerAtte: row.rate_per_atte,
              enteredBy: row.user_id,
              createdAt: row.created_at,
            };
            setRates(prev => prev.map(r => r.id === row.id ? updatedRate : r));
            // Update todayRate immediately if this is today's rate
            if (row.date === currentToday) {
              setTodayRate(updatedRate);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            setRates(prev => prev.filter(r => r.id !== oldRow.id));
            if (oldRow.date === currentToday) {
              setTodayRate(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entriesChannel);
      supabase.removeChannel(ratesChannel);
    };
  }, [user?.id, today]);

  // Update local cache
  const updateCache = useCallback((newEntries: DailyEntry[], newRates: MarketRate[]) => {
    if (!user?.id) return;
    cacheService.set(`${CACHE_KEY}_${user.id}`, {
      entries: newEntries,
      rates: newRates,
    });
  }, [user?.id]);

  // Add new entry
  const addEntry = useCallback(async (entry: Omit<DailyEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'quantityAtte' | 'totalAmount' | 'rateStatus' | 'ratePerAtte' | 'paymentReceived'>) => {
    if (!user?.id) return null;

    const quantityAtte = entry.quantityChendu / 4;
    const rateForDate = rates.find(r => r.date === entry.date);
    const rateStatus = rateForDate ? 'confirmed' : 'pending';
    const totalAmount = rateForDate ? quantityAtte * rateForDate.ratePerAtte : null;

    // Insert to Supabase
    const { data, error } = await supabase.from('mallige_entries').insert({
      user_id: user.id,
      date: entry.date,
      quantity: entry.quantityChendu,
      unit: 'chendu',
      rate_per_atte: rateForDate?.ratePerAtte || null,
      earnings: totalAmount,
      rate_status: rateStatus,
      notes: entry.notes,
      no_mallige_today: false,
    }).select().single();

    if (error) {
      console.error('Failed to save entry:', error);
      return null;
    }

    const newEntry: DailyEntry = {
      id: data.id,
      userId: user.id,
      date: data.date,
      quantityChendu: data.quantity,
      quantityAtte: data.quantity / 4,
      ratePerAtte: data.rate_per_atte,
      totalAmount: data.earnings,
      rateStatus: data.rate_status as 'pending' | 'confirmed',
      noMalligeToday: data.no_mallige_today,
      notes: data.notes,
      paymentReceived: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  // Add "No Mallige Today" entry
  const addNoMalligeEntry = useCallback(async (date: string, notes?: string) => {
    if (!user?.id) return null;

    const existingEntry = entries.find(e => e.date === date);
    if (existingEntry) {
      return null;
    }

    const { data, error } = await supabase.from('mallige_entries').insert({
      user_id: user.id,
      date,
      quantity: 0,
      unit: 'chendu',
      rate_per_atte: null,
      earnings: 0,
      rate_status: 'confirmed',
      notes: notes || 'No mallige given',
      no_mallige_today: true,
    }).select().single();

    if (error) {
      console.error('Failed to save no-mallige entry:', error);
      return null;
    }

    const newEntry: DailyEntry = {
      id: data.id,
      userId: user.id,
      date: data.date,
      quantityChendu: 0,
      quantityAtte: 0,
      ratePerAtte: null,
      totalAmount: 0,
      rateStatus: 'confirmed',
      noMalligeToday: true,
      notes: data.notes,
      paymentReceived: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    return newEntry;
  }, [user?.id, entries, rates, updateCache]);

  // Add or update rate
  const setRate = useCallback(async (date: string, ratePerAtte: number) => {
    if (!user?.id) return null;

    const existingRate = rates.find(r => r.date === date);
    let newRate: MarketRate;
    let updatedRates: MarketRate[];

    if (existingRate) {
      // Update existing rate
      const { error } = await supabase.from('mallige_rates')
        .update({ rate_per_atte: ratePerAtte })
        .eq('id', existingRate.id);

      if (error) {
        console.error('Failed to update rate:', error);
        return null;
      }

      newRate = { ...existingRate, ratePerAtte };
      updatedRates = rates.map(r => r.id === existingRate.id ? newRate : r);
    } else {
      // Insert new rate
      const { data, error } = await supabase.from('mallige_rates').insert({
        user_id: user.id,
        date,
        rate_per_atte: ratePerAtte,
      }).select().single();

      if (error) {
        console.error('Failed to save rate:', error);
        return null;
      }

      newRate = {
        id: data.id,
        date: data.date,
        ratePerAtte: data.rate_per_atte,
        enteredBy: user.id,
        createdAt: data.created_at,
      };
      updatedRates = [...rates, newRate];
    }

    setRates(updatedRates);
    if (date === today) {
      setTodayRate(newRate);
    }

    // Update all pending entries for this date
    const pendingEntries = entries.filter(e => e.date === date && e.rateStatus === 'pending' && !e.noMalligeToday);
    
    if (pendingEntries.length > 0) {
      const updatePromises = pendingEntries.map(entry => 
        supabase.from('mallige_entries').update({
          rate_per_atte: ratePerAtte,
          earnings: entry.quantityAtte * ratePerAtte,
          rate_status: 'confirmed',
        }).eq('id', entry.id)
      );

      await Promise.all(updatePromises);

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
    } else {
      updateCache(entries, updatedRates);
    }

    return newRate;
  }, [user?.id, rates, entries, today, updateCache]);

  // Update payment status
  const updatePaymentStatus = useCallback(async (id: string, paymentReceived: boolean) => {
    if (!user?.id) return false;

    const { error } = await supabase.from('mallige_entries')
      .update({ payment_received: paymentReceived } as any)
      .eq('id', id);

    if (error) {
      console.error('Failed to update payment status:', error);
      return false;
    }

    const updatedEntries = entries.map(e => e.id === id ? { ...e, paymentReceived } : e);
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);
    return true;
  }, [user?.id, entries, rates, updateCache]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const { error } = await supabase.from('mallige_entries').delete().eq('id', id);
    
    if (error) {
      console.error('Failed to delete entry:', error);
      return false;
    }

    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    updateCache(updatedEntries, rates);

    return true;
  }, [user?.id, entries, rates, updateCache]);

  // Get entries for a specific month
  const getEntriesForMonth = useCallback((yearMonth: string) => {
    return entries.filter(e => e.date.startsWith(yearMonth));
  }, [entries]);

  // Get weekly earnings for a specific week (Sun-Sat)
  const getWeeklyEarnings = useCallback((weekOffset: number = 0): WeeklyEarning[] => {
    const referenceDate = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 0 }); // Saturday
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(e => e.date === dateStr && !e.noMalligeToday);
      const amount = dayEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const quantity = dayEntries.reduce((sum, e) => sum + e.quantityAtte, 0);
      return { date: dateStr, amount, quantity };
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
    updatePaymentStatus,
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
