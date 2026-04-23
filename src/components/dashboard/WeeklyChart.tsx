import { useState } from 'react';
import { WeeklyEarning } from '@/types/mallige';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, isToday, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMalligeData } from '@/hooks/useMalligeData';

export const WeeklyChart = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const { getWeeklyEarnings } = useMalligeData();
  const data = getWeeklyEarnings(weekOffset);

  const referenceDate = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`;

  const chartData = data.map(d => ({
    ...d,
    day: format(parseISO(d.date), 'EEE'),
    fullDate: format(parseISO(d.date), 'dd MMM'),
    isToday: isToday(parseISO(d.date)),
  }));

  const totalEarnings = data.reduce((sum, d) => sum + d.amount, 0);
  const totalQuantity = data.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="rounded-xl bg-card shadow-md overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Weekly Earnings</h3>
              <p className="text-[10px] text-muted-foreground">Sun – Sat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium min-w-[110px] text-center">{weekLabel}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg" onClick={() => setWeekOffset(0)}>
                This week
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 text-sm mt-2">
          <div className="text-center">
            <p className="text-lg font-bold text-gradient">₹{totalEarnings.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
          </div>
          <div className="text-center border-l pl-4">
            <p className="text-lg font-bold text-foreground">{totalQuantity.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atte</p>
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
