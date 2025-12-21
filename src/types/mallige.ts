export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface DailyEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  quantityChendu: number;
  quantityAtte: number; // calculated: chendu / 4
  ratePerAtte: number | null;
  totalAmount: number | null;
  rateStatus: 'pending' | 'confirmed';
  flowerShopName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketRate {
  id: string;
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
