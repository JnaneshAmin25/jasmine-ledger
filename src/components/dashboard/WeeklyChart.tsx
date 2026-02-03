import { WeeklyEarning } from '@/types/mallige';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, isToday } from 'date-fns';
import { TrendingUp, Calendar } from 'lucide-react';

interface WeeklyChartProps {
  data: WeeklyEarning[];
}

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const chartData = data.map(d => ({
    ...d,
    day: format(parseISO(d.date), 'EEE'),
    fullDate: format(parseISO(d.date), 'dd MMM'),
    isToday: isToday(parseISO(d.date)),
  }));

  const totalEarnings = data.reduce((sum, d) => sum + d.amount, 0);
  const totalQuantity = data.reduce((sum, d) => sum + d.quantity, 0);
  const avgDaily = totalEarnings / 7;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">This Week's Earnings</CardTitle>
              <p className="text-xs text-muted-foreground">Last 7 days performance</p>
            </div>
          </div>
          
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-gradient">₹{totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            </div>
            <div className="text-center border-l pl-6">
              <p className="text-2xl font-bold text-foreground">{totalQuantity.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Atte</p>
            </div>
            <div className="text-center border-l pl-6 hidden md:block">
              <p className="text-2xl font-bold text-muted-foreground">₹{avgDaily.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg/Day</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[220px] md:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38 92% 50%)" />
                  <stop offset="100%" stopColor="hsl(25 95% 53%)" />
                </linearGradient>
                <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 36%)" />
                  <stop offset="100%" stopColor="hsl(142 76% 46%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 500 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '12px 16px'
                }}
                cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return [`₹${value.toLocaleString()}`, 'Earnings'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return label;
                }}
              />
              <Bar 
                dataKey="amount" 
                radius={[8, 8, 0, 0]}
                maxBarSize={56}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isToday ? 'url(#barGradientToday)' : 'url(#barGradient)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full gradient-primary" />
            <span className="text-xs text-muted-foreground">Past days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
