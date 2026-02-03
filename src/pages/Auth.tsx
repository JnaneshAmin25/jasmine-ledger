import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Flower2, Mail, Lock, User, Loader2, Sparkles, ArrowRight } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });
        navigate('/');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (signupPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupName);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account Exists',
            description: 'An account with this email already exists. Please log in.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Signup Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Account Created!',
          description: 'Welcome to Mallige Manager.',
        });
        navigate('/');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
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
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in relative z-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="p-4 rounded-2xl gradient-primary shadow-glow animate-float">
            <Flower2 className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">
          Mallige Manager
        </h1>
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Track your jasmine flower business
          <Sparkles className="h-4 w-4 text-primary" />
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 relative z-10 animate-scale-in overflow-hidden">
        {/* Card shine effect */}
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
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all rounded-xl group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Login
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="signup" className="mt-0">
            <CardHeader className="pb-4 pt-6">
              <CardTitle className="text-2xl font-display">Create Account</CardTitle>
              <CardDescription>
                Start tracking your mallige business today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0 focus:bg-background transition-colors"
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all rounded-xl group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground text-center relative z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Secure • Private • Made for Mallige farmers
      </p>
    </div>
  );
};

export default Auth;
