import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Package, 
  Calendar, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Zap,
  Award,
  BarChart3,
  Activity,
  Sparkles
} from 'lucide-react';

const Analytics = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { entries, rates, getMonthlyStats, loading: dataLoading } = useMalligeData();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Calculate all analytics data
  const analyticsData = useMemo(() => {
    // Last 6 months data
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

    // Rate trends (last 30 entries)
    const rateData = rates
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(r => ({
        date: format(parseISO(r.date), 'dd MMM'),
        rate: r.ratePerAtte,
      }));

    // Top earning days
    const topDays = [...entries]
      .filter(e => e.totalAmount)
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .slice(0, 5)
      .map(e => ({
        date: format(parseISO(e.date), 'dd MMM'),
        amount: e.totalAmount || 0,
        quantity: e.quantityAtte,
      }));

    // Summary stats
    const totalEarnings = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalQuantity = entries.reduce((sum, e) => sum + e.quantityAtte, 0);
    const avgRate = rates.length > 0 
      ? rates.reduce((sum, r) => sum + r.ratePerAtte, 0) / rates.length 
      : 0;
    const bestMonth = monthlyData.reduce((best, m) => m.earnings > best.earnings ? m : best, monthlyData[0] || { month: '-', earnings: 0 });

    // Day of week analysis
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

    // Rate volatility (standard deviation)
    const rateValues = rates.map(r => r.ratePerAtte);
    const rateAvg = rateValues.length > 0 ? rateValues.reduce((a, b) => a + b, 0) / rateValues.length : 0;
    const rateVariance = rateValues.length > 0 
      ? rateValues.reduce((sum, r) => sum + Math.pow(r - rateAvg, 2), 0) / rateValues.length 
      : 0;
    const rateStdDev = Math.sqrt(rateVariance);

    // Rate range
    const minRate = rateValues.length > 0 ? Math.min(...rateValues) : 0;
    const maxRate = rateValues.length > 0 ? Math.max(...rateValues) : 0;

    // Month over month comparison
    const currentMonth = monthlyData[monthlyData.length - 1];
    const lastMonth = monthlyData[monthlyData.length - 2];
    const earningsChange = lastMonth && lastMonth.earnings > 0 
      ? ((currentMonth.earnings - lastMonth.earnings) / lastMonth.earnings) * 100 
      : 0;
    const quantityChange = lastMonth && lastMonth.quantity > 0 
      ? ((currentMonth.quantity - lastMonth.quantity) / lastMonth.quantity) * 100 
      : 0;

    // Active days percentage (this month)
    const thisMonth = format(new Date(), 'yyyy-MM');
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(new Date()),
      end: new Date()
    }).length;
    const activeDaysThisMonth = entries.filter(e => e.date.startsWith(thisMonth) && !e.noMalligeToday).length;
    const activePercentage = daysInMonth > 0 ? Math.round((activeDaysThisMonth / daysInMonth) * 100) : 0;

    // Streak calculation
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

    // Earnings per quantity trend
    const earningsPerAtte = monthlyData.map(m => ({
      ...m,
      earningsPerAtte: m.quantity > 0 ? Math.round(m.earnings / m.quantity) : 0,
    }));

    return {
      monthlyData,
      rateData,
      topDays,
      totalEarnings,
      totalQuantity,
      avgRate,
      bestMonth,
      dayOfWeekAvg,
      bestDay,
      rateStdDev,
      minRate,
      maxRate,
      currentMonth,
      lastMonth,
      earningsChange,
      quantityChange,
      activePercentage,
      activeDaysThisMonth,
      daysInMonth,
      currentStreak,
      earningsPerAtte,
    };
  }, [entries, rates, getMonthlyStats]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const COLORS = {
    primary: 'hsl(38 92% 50%)',
    accent: 'hsl(25 95% 53%)',
    success: 'hsl(142 76% 36%)',
    muted: 'hsl(40 15% 60%)',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl gradient-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-muted-foreground">Deep insights into your mallige business performance</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute inset-0 gradient-primary opacity-5" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                {analyticsData.earningsChange !== 0 && (
                  <Badge variant="outline" className={`gap-1 ${analyticsData.earningsChange >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                    {analyticsData.earningsChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(analyticsData.earningsChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">₹{analyticsData.totalEarnings.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Earnings</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute inset-0 bg-accent opacity-5" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Package className="h-5 w-5 text-accent" />
                </div>
                {analyticsData.quantityChange !== 0 && (
                  <Badge variant="outline" className={`gap-1 ${analyticsData.quantityChange >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                    {analyticsData.quantityChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(analyticsData.quantityChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">{analyticsData.totalQuantity.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">atte</span></p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Quantity</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute inset-0 bg-success opacity-5" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">
                  ₹{analyticsData.minRate} - ₹{analyticsData.maxRate}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">₹{analyticsData.avgRate.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Average Rate</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="absolute inset-0 bg-warning opacity-5" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <Sparkles className="h-4 w-4 text-warning animate-pulse" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">{analyticsData.bestMonth?.month || '-'}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Best Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Streak Stats */}
        <div className="grid md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-16 h-16 -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="hsl(var(--muted))"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="hsl(var(--primary))"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${(analyticsData.activePercentage / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {analyticsData.activePercentage}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Days This Month</p>
                  <p className="text-lg font-semibold">{analyticsData.activeDaysThisMonth} of {analyticsData.daysInMonth} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{analyticsData.currentStreak} <span className="text-base font-normal text-muted-foreground">days</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-success/20 to-success/5">
                  <Target className="h-8 w-8 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Performing Day</p>
                  <p className="text-2xl font-bold">{analyticsData.bestDay.day}</p>
                  <p className="text-xs text-muted-foreground">Avg ₹{analyticsData.bestDay.avgEarnings}/day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Earnings & Rate Trend */}
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Monthly Performance
              </CardTitle>
              <CardDescription>Earnings & quantity over last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analyticsData.monthlyData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'earnings') return [`₹${value.toLocaleString()}`, 'Earnings'];
                        if (name === 'quantity') return [`${value.toFixed(1)} atte`, 'Quantity'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="earnings" 
                      stroke={COLORS.primary}
                      fillOpacity={1} 
                      fill="url(#colorEarnings)" 
                      strokeWidth={2}
                      name="earnings"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="quantity" 
                      stroke={COLORS.accent}
                      strokeWidth={2}
                      dot={{ fill: COLORS.accent, strokeWidth: 0, r: 4 }}
                      name="quantity"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Rate Trend
              </CardTitle>
              <CardDescription>
                Market rate fluctuation (±₹{analyticsData.rateStdDev.toFixed(0)} volatility)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
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
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.75rem'
                        }}
                        formatter={(value: number) => [`₹${value}/atte`, 'Rate']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="rate" 
                        stroke={COLORS.accent}
                        fillOpacity={1}
                        fill="url(#colorRate)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No rate data yet</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day of Week & Top Days */}
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Day of Week Performance
              </CardTitle>
              <CardDescription>Average earnings by day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.dayOfWeekAvg} layout="vertical">
                    <defs>
                      <linearGradient id="dayBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS.primary} />
                        <stop offset="100%" stopColor={COLORS.accent} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <YAxis dataKey="day" type="category" stroke="hsl(var(--muted-foreground))" width={40} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem'
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Avg Earnings']}
                    />
                    <Bar dataKey="avgEarnings" fill="url(#dayBarGradient)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-success" />
                Top Earning Days
              </CardTitle>
              <CardDescription>Your best performing days</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.topDays.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.topDays.map((day, index) => (
                    <div key={day.date} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                        'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{day.date}</p>
                        <p className="text-xs text-muted-foreground">{day.quantity} atte</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">₹{day.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No entries yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Earnings Efficiency */}
        <Card className="border-0 shadow-lg animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Earnings Efficiency
            </CardTitle>
            <CardDescription>Average earnings per atte over time (higher is better)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.earningsPerAtte}>
                  <defs>
                    <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.success} />
                      <stop offset="100%" stopColor={COLORS.success} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem'
                    }}
                    formatter={(value: number) => [`₹${value}/atte`, 'Avg Rate']}
                  />
                  <Bar dataKey="earningsPerAtte" fill="url(#efficiencyGradient)" radius={[8, 8, 0, 0]} maxBarSize={60} />
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
