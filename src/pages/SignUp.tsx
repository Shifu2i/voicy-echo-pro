import { useState } from 'react';
import { Menu, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SideMenu } from '@/components/SideMenu';

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid'>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/write`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            plan: selectedPlan,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with selected plan
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            subscription_plan: selectedPlan,
            subscription_status: selectedPlan === 'free' ? 'active' : 'pending',
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        toast.success('Account created successfully!');
        navigate('/write');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/write`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">sign up</span>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Sign Up Form */}
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl bg-muted border-0 py-6"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl bg-muted border-0 py-6"
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-2xl bg-muted border-0 py-6"
          />

          {/* Plan Selection */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Choose a plan</Label>
            <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as 'free' | 'paid')}>
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-2xl">
                <RadioGroupItem value="free" id="free" />
                <Label htmlFor="free" className="flex-1 cursor-pointer">
                  <div className="font-medium">Free Plan</div>
                  <div className="text-xs text-muted-foreground">Writing window only</div>
                </Label>
                {selectedPlan === 'free' && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-2xl">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid" className="flex-1 cursor-pointer">
                  <div className="font-medium">Pro Plan</div>
                  <div className="text-xs text-muted-foreground">$5/month - All features</div>
                </Label>
                {selectedPlan === 'paid' && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Google Sign Up Button */}
        <Button
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          variant="outline"
          className="w-full rounded-2xl py-6"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </Button>

        {/* Submit Button */}
        <Button
          onClick={handleSignUp}
          disabled={isLoading}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-6"
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>

        {/* Sign In Link */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/signin')}
            className="text-primary hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>

      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        text=""
      />
    </div>
  );
};

export default SignUp;
