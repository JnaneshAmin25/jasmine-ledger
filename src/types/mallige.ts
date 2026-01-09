export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface DailyEntry {
  id: string;
  _id?: string; // MongoDB ID
  userId: string;
  date: string; // YYYY-MM-DD
  quantityChendu: number;
  quantityAtte: number; // calculated: chendu / 4
  ratePerAtte: number | null;
  totalAmount: number | null;
  rateStatus: 'pending' | 'confirmed';
  noMalligeToday?: boolean; // true if user marked "no mallige today"
  flowerShopName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketRate {
  id: string;
  _id?: string; // MongoDB ID
  date: string; // YYYY-MM-DD
  ratePerAtte: number;
  enteredBy: string;
  createdAt: string;
}

export interface WeeklyEarning {
  date: string;
  amount: number;
  quantity: number;
}

export interface MonthlyStats {
  month: string;
  totalEarnings: number;
  totalQuantity: number;
  averageRate: number;
  entryCount: number;
}
