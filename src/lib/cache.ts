import { DailyEntry, MarketRate, UserProfile } from '@/types/mallige';

const CACHE_PREFIX = 'mallige_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

// Simple XOR-based obfuscation using user ID as key
// This prevents casual inspection of localStorage data
function obfuscate(text: string, key: string): string {
  const keyChars = key.split('');
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ keyChars[i % keyChars.length].charCodeAt(0);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // base64 encode the result
}

function deobfuscate(encoded: string, key: string): string {
  try {
    const decoded = atob(encoded);
    const keyChars = key.split('');
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ keyChars[i % keyChars.length].charCodeAt(0);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

// Get encryption key from user context
let _encKey = 'default_key';
export function setEncryptionKey(key: string) {
  _encKey = key;
}

export const cacheService = {
  set: <T>(key: string, data: T): void => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    const json = JSON.stringify(cached);
    const encrypted = obfuscate(json, _encKey);
    localStorage.setItem(`${CACHE_PREFIX}${key}`, encrypted);
  },

  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    try {
      const decrypted = deobfuscate(item, _encKey);
      if (!decrypted) return null;
      const cached: CachedData<T> = JSON.parse(decrypted);
      if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return cached.data;
    } catch {
      // If decryption fails (key changed, corrupted), remove stale data
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
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