import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Flower2, Mail, Lock, User, Loader2, Sparkles, ArrowRight, Shield, BarChart3, TrendingUp, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TRUST_POINTS = [
  { icon: Shield, title: 'Secure & Private', desc: 'Your data is encrypted and only visible to you' },
  { icon: BarChart3, title: 'Track Everything', desc: 'Daily entries, rates, earnings & payment status' },
  { icon: TrendingUp, title: 'Smart Analytics', desc: 'Weekly/monthly trends and insights at a glance' },
  { icon: MessageCircle, title: 'AI Assistant', desc: 'Ask anything in English or Kannada, anytime' },
];

const notifyNewUser = async (email: string, name: string) => {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-new-user`;
    await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email, name }),
    });
  } catch {
    // Silent fail - user should never know
  }
};

const Auth = () => {
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Google sign-in failed. Please try again.', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
        navigate('/');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (signupPassword.length < 6) {
      toast({ title: 'Weak Password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupName);
      if (error) {
        if (error.message.includes('already registered')) {
          toast({ title: 'Account Exists', description: 'An account with this email already exists. Please log in.', variant: 'destructive' });
        } else {
          toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
        }
      } else {
        // Silently notify owner
        notifyNewUser(signupEmail, signupName);
        toast({ title: 'Account Created!', description: 'Welcome to Mallige Manager.' });
        navigate('/');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-hero gap-4">
        <div className="p-4 rounded-2xl gradient-primary shadow-glow animate-pulse-glow">
          <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Trust & Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background image with dark overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}jasmine-hero.jpg)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(150,30%,10%,0.88)] via-[hsl(150,20%,8%,0.92)] to-[hsl(152,40%,15%,0.85)]" />
        
        {/* Content over overlay */}
        <div className="relative z-10 flex flex-col justify-between p-10 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Flower2 className="h-7 w-7 text-white" />
            </div>
            <span className="font-display text-2xl font-bold">Mallige Manager</span>
          </div>
          
          {/* Trust points */}
          <div className="space-y-6 max-w-md">
            <h2 className="font-display text-3xl font-bold leading-tight">
              Why 100+ farmers trust<br />
              <span className="text-[hsl(42,90%,65%)]">Mallige Manager</span>
            </h2>
            <div className="space-y-4">
              {TRUST_POINTS.map((point, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors shrink-0">
                    <point.icon className="h-5 w-5 text-[hsl(42,90%,65%)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/95">{point.title}</h3>
                    <p className="text-sm text-white/60">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer quote */}
          <div className="text-white/40 text-sm">
            <p>"ಮಲ್ಲಿಗೆ ವ್ಯಾಪಾರಕ್ಕೆ ಉತ್ತಮ ಅಪ್ಲಿಕೇಶನ್"</p>
            <p className="mt-1">— Mallige farmers, Shankarpura</p>
          </div>
        </div>
      </div>

      {/* Right - Auth Forms */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gradient-hero relative overflow-hidden">
        {/* Mobile-only background decorations */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center animate-fade-in relative z-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-4 rounded-2xl gradient-primary shadow-glow animate-float">
              <Flower2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Mallige Manager</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Track your jasmine flower business
            <Sparkles className="h-4 w-4 text-primary" />
          </p>
        </div>

        <Card className="w-full max-w-md shadow-xl border-0 relative z-10 animate-scale-in overflow-hidden">
          <div className="absolute inset-0 gradient-card" />
          
          <Tabs defaultValue="login" className="w-full relative">
            <TabsList className="grid w-full grid-cols-2 m-4 mb-0 w-[calc(100%-32px)] bg-muted/80">
              <TabsTrigger value="login" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl font-semibold gap-3"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" /> Email
                    </Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" /> Password
                    </Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors" required />
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all rounded-xl group" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Login <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0">
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-2xl font-display">Create Account</CardTitle>
                <CardDescription>Start tracking your mallige business today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Google Sign Up */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl font-semibold gap-3"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" /> Full Name
                    </Label>
                    <Input id="signup-name" type="text" placeholder="Your name" value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" /> Email
                    </Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" /> Password
                    </Label>
                    <Input id="signup-password" type="password" placeholder="Min 6 characters" value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all rounded-xl group" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Mobile trust badges */}
        <div className="lg:hidden mt-6 grid grid-cols-2 gap-3 max-w-md w-full relative z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {TRUST_POINTS.map((point, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
              <point.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">{point.title}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground text-center relative z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          Secure • Private • Made for Mallige farmers
        </p>
      </div>
    </div>
  );
};

export default Auth;
