import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, subMonths, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Legend, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, IndianRupee, Package, Calendar as CalendarIcon, 
  Loader2, ArrowUpRight, ArrowDownRight, Target, Zap, Award, BarChart3, 
  Activity, Sparkles, MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';


const Analytics = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { entries, rates, getMonthlyStats, loading: dataLoading } = useMalligeData();
  
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>();
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const analyticsData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return format(date, 'yyyy-MM');
    });

    const monthlyData = last6Months.map(month => {
      const stats = getMonthlyStats(month);
      return {
        month: format(parseISO(`${month}-01`), 'MMM'),
        fullMonth: format(parseISO(`${month}-01`), 'MMMM yyyy'),
        earnings: stats.totalEarnings,
        quantity: stats.totalQuantity,
        avgRate: stats.averageRate,
        entries: stats.entryCount,
      };
    });

    const rateData = rates
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(r => ({
        date: format(parseISO(r.date), 'dd MMM'),
        rate: r.ratePerAtte,
      }));

    const topDays = [...entries]
      .filter(e => e.totalAmount)
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .slice(0, 5)
      .map(e => ({
        date: format(parseISO(e.date), 'dd MMM'),
        amount: e.totalAmount || 0,
        quantity: e.quantityAtte,
      }));

    const totalEarnings = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalQuantity = entries.reduce((sum, e) => sum + e.quantityAtte, 0);
    const avgRate = rates.length > 0 
      ? rates.reduce((sum, r) => sum + r.ratePerAtte, 0) / rates.length 
      : 0;
    const bestMonth = monthlyData.reduce((best, m) => m.earnings > best.earnings ? m : best, monthlyData[0] || { month: '-', earnings: 0 });

    const dayOfWeekData = [
      { day: 'Sun', shortDay: 'S', earnings: 0, count: 0 },
      { day: 'Mon', shortDay: 'M', earnings: 0, count: 0 },
      { day: 'Tue', shortDay: 'T', earnings: 0, count: 0 },
      { day: 'Wed', shortDay: 'W', earnings: 0, count: 0 },
      { day: 'Thu', shortDay: 'T', earnings: 0, count: 0 },
      { day: 'Fri', shortDay: 'F', earnings: 0, count: 0 },
      { day: 'Sat', shortDay: 'S', earnings: 0, count: 0 },
    ];

    entries.forEach(entry => {
      if (entry.totalAmount && !entry.noMalligeToday) {
        const dayIndex = getDay(parseISO(entry.date));
        dayOfWeekData[dayIndex].earnings += entry.totalAmount;
        dayOfWeekData[dayIndex].count += 1;
      }
    });

    const dayOfWeekAvg = dayOfWeekData.map(d => ({
      ...d,
      avgEarnings: d.count > 0 ? Math.round(d.earnings / d.count) : 0,
    }));

    const bestDay = dayOfWeekAvg.reduce((best, d) => d.avgEarnings > best.avgEarnings ? d : best, dayOfWeekAvg[0]);

    const rateValues = rates.map(r => r.ratePerAtte);
    const rateAvg = rateValues.length > 0 ? rateValues.reduce((a, b) => a + b, 0) / rateValues.length : 0;
    const rateVariance = rateValues.length > 0 
      ? rateValues.reduce((sum, r) => sum + Math.pow(r - rateAvg, 2), 0) / rateValues.length 
      : 0;
    const rateStdDev = Math.sqrt(rateVariance);

    const minRate = rateValues.length > 0 ? Math.min(...rateValues) : 0;
    const maxRate = rateValues.length > 0 ? Math.max(...rateValues) : 0;

    const currentMonth = monthlyData[monthlyData.length - 1];
    const lastMonth = monthlyData[monthlyData.length - 2];
    const earningsChange = lastMonth && lastMonth.earnings > 0 
      ? ((currentMonth.earnings - lastMonth.earnings) / lastMonth.earnings) * 100 
      : 0;
    const quantityChange = lastMonth && lastMonth.quantity > 0 
      ? ((currentMonth.quantity - lastMonth.quantity) / lastMonth.quantity) * 100 
      : 0;

    const thisMonth = format(new Date(), 'yyyy-MM');
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(new Date()),
      end: new Date()
    }).length;
    const activeDaysThisMonth = entries.filter(e => e.date.startsWith(thisMonth) && !e.noMalligeToday).length;
    const activePercentage = daysInMonth > 0 ? Math.round((activeDaysThisMonth / daysInMonth) * 100) : 0;

    let currentStreak = 0;
    const sortedDates = [...new Set(entries.filter(e => !e.noMalligeToday).map(e => e.date))].sort().reverse();
    if (sortedDates.length > 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
      
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = differenceInDays(parseISO(sortedDates[i - 1]), parseISO(sortedDates[i]));
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    const earningsPerAtte = monthlyData.map(m => ({
      ...m,
      earningsPerAtte: m.quantity > 0 ? Math.round(m.earnings / m.quantity) : 0,
    }));

    return {
      monthlyData, rateData, topDays, totalEarnings, totalQuantity, avgRate, bestMonth,
      dayOfWeekAvg, bestDay, rateStdDev, minRate, maxRate, currentMonth, lastMonth,
      earningsChange, quantityChange, activePercentage, activeDaysThisMonth, daysInMonth,
      currentStreak, earningsPerAtte,
    };
  }, [entries, rates, getMonthlyStats]);

  const handleWhatsAppShare = () => {
    if (!exportDateRange?.from || !exportDateRange?.to) return;

    const filteredEntries = entries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: exportDateRange.from!, end: exportDateRange.to! });
    }).filter(e => !e.noMalligeToday)
      .sort((a, b) => a.date.localeCompare(b.date));

    const lines = filteredEntries.map(e => {
      const date = format(parseISO(e.date), 'dd-MM-yyyy');
      const rate = e.ratePerAtte ? `₹${e.ratePerAtte}` : 'Pending';
      const qty = `${e.quantityAtte} atte`;
      const price = e.totalAmount ? `₹${e.totalAmount.toLocaleString('en-IN')}` : '-';
      const paid = e.paymentReceived ? '✅' : '⏳';
      return `${date} | ${rate} | ${qty} | ${price} | ${paid}`;
    });

    const totalPrice = filteredEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const unpaidTotal = filteredEntries.filter(e => !e.paymentReceived).reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const unpaidCount = filteredEntries.filter(e => !e.paymentReceived).length;

    const header = `🌸 *Shankarpura Mallige*\n📅 ${format(exportDateRange.from!, 'dd MMM yyyy')} - ${format(exportDateRange.to!, 'dd MMM yyyy')}\n\n*Date | Rate | Qty | Price | Paid*`;
    const divider = `\n———————————————\n💰 *Total: ₹${totalPrice.toLocaleString('en-IN')}*`;
    const unpaidLine = unpaidCount > 0 ? `\n⚠️ *Unpaid: ₹${unpaidTotal.toLocaleString('en-IN')} (${unpaidCount} days)*` : '';

    const message = `${header}\n${lines.join('\n')}${divider}${unpaidLine}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setExportPopoverOpen(false);
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const COLORS = {
    primary: 'hsl(152 60% 36%)',
    accent: 'hsl(42 90% 55%)',
    success: 'hsl(152 60% 36%)',
    muted: 'hsl(140 12% 60%)',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header with Export */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg gradient-primary">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">Analytics</h1>
            </div>
            <p className="text-xs text-muted-foreground">Insights into your mallige business</p>
          </div>

          {/* Export Button */}
          <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl h-10 border-green-600/30 text-green-700 hover:bg-green-50">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 rounded-xl" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Select date range to share</p>
                <Calendar
                  mode="range"
                  selected={exportDateRange}
                  onSelect={setExportDateRange}
                  disabled={(date) => date > new Date()}
                  numberOfMonths={1}
                  className="p-0 pointer-events-auto"
                  modifiers={{
                    unpaid: entries
                      .filter(e => !e.noMalligeToday && !e.paymentReceived)
                      .map(e => parseISO(e.date)),
                  }}
                  modifiersStyles={{
                    unpaid: {
                      backgroundColor: 'hsl(0 72% 51% / 0.15)',
                      color: 'hsl(0 72% 40%)',
                      fontWeight: 600,
                      borderRadius: '50%',
                    },
                  }}
                />
                <Button 
                  onClick={handleWhatsAppShare}
                  disabled={!exportDateRange?.from || !exportDateRange?.to}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative overflow-hidden rounded-xl bg-card p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                {analyticsData.earningsChange !== 0 && (
                  <Badge variant="outline" className={`gap-0.5 text-[10px] ${analyticsData.earningsChange >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                    {analyticsData.earningsChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(analyticsData.earningsChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground">₹{analyticsData.totalEarnings.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mt-0.5">Total Earnings</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-card p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-accent opacity-5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-accent/10">
                  <Package className="h-4 w-4 text-accent" />
                </div>
                {analyticsData.quantityChange !== 0 && (
                  <Badge variant="outline" className={`gap-0.5 text-[10px] ${analyticsData.quantityChange >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                    {analyticsData.quantityChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(analyticsData.quantityChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground">{analyticsData.totalQuantity.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">atte</span></p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mt-0.5">Total Quantity</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-card p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-success opacity-5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  ₹{analyticsData.minRate}-₹{analyticsData.maxRate}
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground">₹{analyticsData.avgRate.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mt-0.5">Average Rate</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-card p-4 shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-warning opacity-5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-warning/10">
                  <Award className="h-4 w-4 text-warning" />
                </div>
                <Sparkles className="h-3 w-3 text-warning animate-pulse" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground">{analyticsData.bestMonth?.month || '-'}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mt-0.5">Best Month</p>
            </div>
          </div>
        </div>

        {/* Activity & Streak */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="rounded-xl bg-card p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="w-12 h-12 -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                  <circle cx="24" cy="24" r="20" stroke="hsl(var(--primary))" strokeWidth="4" fill="none"
                    strokeDasharray={`${(analyticsData.activePercentage / 100) * 126} 126`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{analyticsData.activePercentage}%</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Active Days</p>
                <p className="text-sm font-semibold">{analyticsData.activeDaysThisMonth}/{analyticsData.daysInMonth}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Streak</p>
                <p className="text-lg font-bold">{analyticsData.currentStreak} <span className="text-xs font-normal text-muted-foreground">days</span></p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-success/20 to-success/5">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Best Day</p>
                <p className="text-lg font-bold">{analyticsData.bestDay.day}</p>
                <p className="text-[10px] text-muted-foreground">₹{analyticsData.bestDay.avgEarnings}/day</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Monthly Performance
              </CardTitle>
              <CardDescription className="text-xs">Earnings & quantity (6 months)</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analyticsData.monthlyData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'earnings') return [`₹${value.toLocaleString()}`, 'Earnings'];
                        if (name === 'quantity') return [`${value.toFixed(1)} atte`, 'Quantity'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="earnings" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={2} name="earnings" />
                    <Line yAxisId="right" type="monotone" dataKey="quantity" stroke={COLORS.accent} strokeWidth={2} dot={{ fill: COLORS.accent, strokeWidth: 0, r: 3 }} name="quantity" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-accent" />
                Rate Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Market rate (±₹{analyticsData.rateStdDev.toFixed(0)} volatility)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div className="h-[250px]">
                {analyticsData.rateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.rateData}>
                      <defs>
                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                        formatter={(value: number) => [`₹${value}/atte`, 'Rate']}
                      />
                      <Area type="monotone" dataKey="rate" stroke={COLORS.accent} fillOpacity={1} fill="url(#colorRate)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No rate data yet</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day of Week & Top Days */}
        <div className="grid lg:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Day of Week
              </CardTitle>
              <CardDescription className="text-xs">Average earnings by day</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.dayOfWeekAvg} layout="vertical">
                    <defs>
                      <linearGradient id="dayBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS.primary} />
                        <stop offset="100%" stopColor={COLORS.accent} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="day" type="category" stroke="hsl(var(--muted-foreground))" width={35} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Avg Earnings']}
                    />
                    <Bar dataKey="avgEarnings" fill="url(#dayBarGradient)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-success" />
                Top Earning Days
              </CardTitle>
              <CardDescription className="text-xs">Best performing days</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {analyticsData.topDays.length > 0 ? (
                <div className="space-y-2">
                  {analyticsData.topDays.map((day, index) => (
                    <div key={day.date} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                        'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{day.date}</p>
                        <p className="text-[10px] text-muted-foreground">{day.quantity} atte</p>
                      </div>
                      <p className="font-bold text-success text-sm">₹{day.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No entries yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Earnings Efficiency */}
        <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Earnings Efficiency
            </CardTitle>
            <CardDescription className="text-xs">Avg earnings per atte over time</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.earningsPerAtte}>
                  <defs>
                    <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.success} />
                      <stop offset="100%" stopColor={COLORS.success} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                    formatter={(value: number) => [`₹${value}/atte`, 'Avg Rate']}
                  />
                  <Bar dataKey="earningsPerAtte" fill="url(#efficiencyGradient)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
