import { WeeklyEarning } from '@/types/mallige';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, isToday } from 'date-fns';
import { Calendar } from 'lucide-react';

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
    <div className="rounded-xl bg-card shadow-md overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">This Week</h3>
              <p className="text-[10px] text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold text-gradient">₹{totalEarnings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </div>
            <div className="text-center border-l pl-4">
              <p className="text-lg font-bold text-foreground">{totalQuantity.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atte</p>
            </div>
            <div className="text-center border-l pl-4 hidden sm:block">
              <p className="text-lg font-bold text-muted-foreground">₹{avgDaily.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg/Day</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-1 pb-3">
        <div className="h-[200px] md:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 60% 36%)" />
                  <stop offset="100%" stopColor="hsl(160 55% 42%)" />
                </linearGradient>
                <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(42 90% 55%)" />
                  <stop offset="100%" stopColor="hsl(42 85% 45%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tick={{ fontSize: 10 }}
                tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', boxShadow: 'var(--shadow-lg)', padding: '8px 12px' }}
                cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return [`₹${value.toLocaleString()}`, 'Earnings'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) return payload[0].payload.fullDate;
                  return label;
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isToday ? 'url(#barGradientToday)' : 'url(#barGradient)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t mx-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full gradient-primary" />
            <span className="text-[10px] text-muted-foreground">Past days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};
