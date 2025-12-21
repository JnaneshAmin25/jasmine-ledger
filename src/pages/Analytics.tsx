import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, parseISO } from 'date-fns';
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
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, Package, Calendar, Loader2 } from 'lucide-react';

const Analytics = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { entries, rates, getMonthlyStats, loading: dataLoading } = useMalligeData();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Calculate last 6 months data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return format(date, 'yyyy-MM');
  });

  const monthlyData = last6Months.map(month => {
    const stats = getMonthlyStats(month);
    return {
      month: format(parseISO(`${month}-01`), 'MMM'),
      earnings: stats.totalEarnings,
      quantity: stats.totalQuantity,
      avgRate: stats.averageRate,
      entries: stats.entryCount,
    };
  });

  // Rate trends
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

  const COLORS = ['hsl(38 92% 50%)', 'hsl(25 95% 53%)', 'hsl(142 76% 36%)', 'hsl(45 30% 60%)', 'hsl(30 15% 40%)'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        <div className="animate-fade-in">
          <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Insights into your mallige business</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="gradient-card border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <IndianRupee className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{totalEarnings.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total Quantity</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalQuantity.toFixed(1)} atte</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Avg Rate</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₹{avgRate.toFixed(0)}</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Best Month</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{bestMonth?.month || '-'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Earnings Chart */}
        <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Last 6 months performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Earnings']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="hsl(38 92% 50%)" 
                    fillOpacity={1} 
                    fill="url(#colorEarnings)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Rate Trends */}
          <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle>Rate Trends</CardTitle>
              <CardDescription>Last 30 entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {rateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                        formatter={(value: number) => [`₹${value}`, 'Rate/Atte']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="hsl(25 95% 53%)" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(25 95% 53%)', strokeWidth: 0, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No rate data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Earning Days */}
          <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Top Earning Days</CardTitle>
              <CardDescription>Your best performing days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {topDays.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDays} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="date" type="category" stroke="hsl(var(--muted-foreground))" width={60} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Earnings']}
                      />
                      <Bar dataKey="amount" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No entries yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quantity Distribution */}
        <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>Monthly Quantity</CardTitle>
            <CardDescription>Quantity sold per month (in atte)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} atte`, 'Quantity']}
                  />
                  <Bar dataKey="quantity" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
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
