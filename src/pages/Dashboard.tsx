import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMalligeData } from '@/hooks/useMalligeData';
import { Header } from '@/components/layout/Header';
import { RateDisplay } from '@/components/dashboard/RateDisplay';
import { WeeklyChart } from '@/components/dashboard/WeeklyChart';
import { EntryList } from '@/components/dashboard/EntryList';
import { AddEntryDialog } from '@/components/dashboard/AddEntryDialog';
import { SetRateDialog } from '@/components/dashboard/SetRateDialog';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { todayRate, getWeeklyEarnings, getPendingEntriesCount, loading: dataLoading } = useMalligeData();

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

  const weeklyEarnings = getWeeklyEarnings();
  const pendingCount = getPendingEntriesCount();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Rate Display Section */}
        <section className="animate-fade-in">
          <RateDisplay rate={todayRate} pendingCount={pendingCount} />
        </section>

        {/* Quick Actions */}
        <section className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <AddEntryDialog />
          <SetRateDialog currentRate={todayRate} />
        </section>

        {/* Weekly Earnings Chart */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <WeeklyChart data={weeklyEarnings} />
        </section>

        {/* Entry List */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <EntryList />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
