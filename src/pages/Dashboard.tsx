import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMalligeData } from '@/hooks/useMalligeData';
import { format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { RateDisplay } from '@/components/dashboard/RateDisplay';
import { WeeklyChart } from '@/components/dashboard/WeeklyChart';
import { JasmineNewsSlider } from '@/components/dashboard/JasmineNewsSlider';
import { EntryList } from '@/components/dashboard/EntryList';
import { AddEntryDialog } from '@/components/dashboard/AddEntryDialog';
import { BulkAddDialog } from '@/components/dashboard/BulkAddDialog';
import { SetRateDialog } from '@/components/dashboard/SetRateDialog';
import { NoMalligeDialog } from '@/components/dashboard/NoMalligeDialog';
import { RateCalculatorDialog } from '@/components/dashboard/RateCalculatorDialog';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const {
    todayRate,
    getPendingEntriesCount,
    loading: dataLoading,
    syncing,
    setRate,
    autoFetchStatus,
    lastAutoFetch,
    fetchRateFromWebsite,
  } = useMalligeData();

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

  const pendingCount = getPendingEntriesCount();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Syncing indicator */}
        {syncing && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-lg border animate-fade-in">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Syncing...</span>
          </div>
        )}

        {/* Rate Display Section - no card wrapper on mobile */}
        <section className="animate-fade-in">
          <RateDisplay
            rate={todayRate}
            pendingCount={pendingCount}
            autoFetchStatus={autoFetchStatus}
            lastAutoFetch={lastAutoFetch}
            onRefresh={fetchRateFromWebsite}
            onApplyMarketRate={(marketRate) => {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              setRate(todayStr, marketRate);
            }}
          />
        </section>

        {/* Quick Actions - horizontal scroll on mobile */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-wrap gap-2">
            <AddEntryDialog />
            <BulkAddDialog />
            <SetRateDialog />
            <NoMalligeDialog />
            <RateCalculatorDialog />
            <Button
              variant="outline"
              className="gap-2 border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 rounded-xl h-11 font-medium transition-all"
              asChild
            >
              <a 
                href="https://thecanarapost.com/2021/12/25/udupi-jasmine-todays-price-19/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Check Today's Rate
              </a>
            </Button>
          </div>
        </section>

        {/* Weekly Earnings Chart */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <WeeklyChart />
        </section>

        {/* Jasmine News */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <JasmineNewsSlider />
        </section>

        {/* Entry List */}
        <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <EntryList />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
