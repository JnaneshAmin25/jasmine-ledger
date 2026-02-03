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
import { NoMalligeDialog } from '@/components/dashboard/NoMalligeDialog';
import { RateCalculatorDialog } from '@/components/dashboard/RateCalculatorDialog';
import { Loader2, Plus, TrendingUp, CalendarX, Calculator } from 'lucide-react';

const Dashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { todayRate, getWeeklyEarnings, getPendingEntriesCount, loading: dataLoading, syncing } = useMalligeData();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-hero gap-4">
        <div className="p-4 rounded-2xl gradient-primary shadow-glow animate-pulse-glow">
          <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
        </div>
        <p className="text-muted-foreground animate-pulse">Loading your data...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const weeklyEarnings = getWeeklyEarnings();
  const pendingCount = getPendingEntriesCount();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Syncing indicator */}
        {syncing && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-lg border animate-fade-in">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Syncing...</span>
          </div>
        )}

        {/* Rate Display Section */}
        <section className="animate-fade-in">
          <RateDisplay rate={todayRate} pendingCount={pendingCount} />
        </section>

        {/* Quick Actions */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-wrap gap-3">
            <AddEntryDialog />
            <SetRateDialog />
            <NoMalligeDialog />
            <RateCalculatorDialog />
          </div>
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
