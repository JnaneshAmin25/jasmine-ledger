import { DailyEntry, MarketRate, UserProfile } from '@/types/mallige';

const CACHE_PREFIX = 'mallige_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export const cacheService = {
  set: <T>(key: string, data: T): void => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
  },

  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    try {
      const cached: CachedData<T> = JSON.parse(item);
      if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return cached.data;
    } catch {
      return null;
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  },

  clear: (): void => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  },

  // Specific helpers
  getEntries: (userId: string, month?: string): DailyEntry[] => {
    const key = month ? `entries_${userId}_${month}` : `entries_${userId}`;
    return cacheService.get<DailyEntry[]>(key) || [];
  },

  setEntries: (userId: string, entries: DailyEntry[], month?: string): void => {
    const key = month ? `entries_${userId}_${month}` : `entries_${userId}`;
    cacheService.set(key, entries);
  },

  getTodayRate: (): MarketRate | null => {
    return cacheService.get<MarketRate>('today_rate');
  },

  setTodayRate: (rate: MarketRate): void => {
    cacheService.set('today_rate', rate);
  },

  getRateHistory: (): MarketRate[] => {
    return cacheService.get<MarketRate[]>('rate_history') || [];
  },

  setRateHistory: (rates: MarketRate[]): void => {
    cacheService.set('rate_history', rates);
  },
};
