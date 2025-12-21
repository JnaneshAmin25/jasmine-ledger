import { WeeklyEarning } from '@/types/mallige';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface WeeklyChartProps {
  data: WeeklyEarning[];
}

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const chartData = data.map(d => ({
    ...d,
    day: format(parseISO(d.date), 'EEE'),
    fullDate: format(parseISO(d.date), 'dd MMM'),
  }));

  const totalEarnings = data.reduce((sum, d) => sum + d.amount, 0);
  const totalQuantity = data.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg font-semibold">This Week's Earnings</CardTitle>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold text-foreground">₹{totalEarnings.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantity: </span>
              <span className="font-semibold text-foreground">{totalQuantity.toFixed(1)} atte</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] md:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38 92% 50%)" />
                  <stop offset="100%" stopColor="hsl(25 95% 53%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  boxShadow: 'var(--shadow-md)'
                }}
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
                fill="url(#barGradient)" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
