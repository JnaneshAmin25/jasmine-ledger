import { useState, useEffect, useCallback } from 'react';
import { DailyEntry, MarketRate, WeeklyEarning, MonthlyStats } from '@/types/mallige';
import { cacheService } from '@/lib/cache';
import { useAuth } from './useAuth';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, subDays } from 'date-fns';

// In-memory storage for demo (since MongoDB connection is complex in Edge Functions)
// In production, this would call the MongoDB Edge Function
const STORAGE_KEY = 'mallige_data';

interface StoredData {
  entries: DailyEntry[];
  rates: MarketRate[];
}

const getStoredData = (userId: string): StoredData => {
  const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
  if (data) {
    return JSON.parse(data);
  }
  return { entries: [], rates: [] };
};

const saveStoredData = (userId: string, data: StoredData) => {
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
};

export const useMalligeData = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRate, setTodayRate] = useState<MarketRate | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      const data = getStoredData(user.id);
      setEntries(data.entries);
      setRates(data.rates);
      
      // Find today's rate
      const rate = data.rates.find(r => r.date === today);
      setTodayRate(rate || null);
      
      setLoading(false);
    }
  }, [user?.id, today]);

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

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    
    const data = getStoredData(user.id);
    data.entries = updatedEntries;
    saveStoredData(user.id, data);

    return newEntry;
  }, [user?.id, entries, rates]);

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
      if (entry.date === date && entry.rateStatus === 'pending') {
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

    const data = getStoredData(user.id);
    data.rates = updatedRates;
    data.entries = updatedEntries;
    saveStoredData(user.id, data);

    return newRate;
  }, [user?.id, rates, entries, today]);

  // Delete entry
  const deleteEntry = useCallback(async (id: string) => {
    if (!user?.id) return false;

    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);

    const data = getStoredData(user.id);
    data.entries = updatedEntries;
    saveStoredData(user.id, data);

    return true;
  }, [user?.id, entries]);

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
      const dayEntries = entries.filter(e => e.date === date);
      const amount = dayEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      const quantity = dayEntries.reduce((sum, e) => sum + e.quantityAtte, 0);
      return { date, amount, quantity };
    });
  }, [entries]);

  // Get monthly stats
  const getMonthlyStats = useCallback((yearMonth: string): MonthlyStats => {
    const monthEntries = entries.filter(e => e.date.startsWith(yearMonth));
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

  // Get pending entries count
  const getPendingEntriesCount = useCallback(() => {
    return entries.filter(e => e.rateStatus === 'pending').length;
  }, [entries]);

  return {
    entries,
    rates,
    loading,
    todayRate,
    addEntry,
    setRate,
    deleteEntry,
    getEntriesForMonth,
    getWeeklyEarnings,
    getMonthlyStats,
    getTodayEntries,
    getPendingEntriesCount,
  };
};
