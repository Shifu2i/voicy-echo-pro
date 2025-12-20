import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SideMenu } from '@/components/SideMenu';

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Signed in successfully!');
      navigate('/write');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
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
            <span className="text-sm font-medium text-foreground">sign in</span>
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

        {/* Sign In Form */}
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
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-6"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        {/* Sign Up Link */}
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-primary hover:underline"
          >
            Sign up
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

export default SignIn;
