import { useState, useEffect } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Dyslexia-friendly color options
const DYSLEXIA_COLORS = [
  { name: 'Cream', value: '#FFFAF0', textColor: '#000000' },
  { name: 'Soft Blue', value: '#E6F3FF', textColor: '#000000' },
  { name: 'Soft Yellow', value: '#FFFACD', textColor: '#000000' },
  { name: 'Soft Pink', value: '#FFE4E1', textColor: '#000000' },
  { name: 'Soft Green', value: '#E8F5E9', textColor: '#000000' },
  { name: 'Peach', value: '#FFDAB9', textColor: '#000000' },
  { name: 'Lavender', value: '#E6E6FA', textColor: '#000000' },
  { name: 'Light Gray', value: '#F5F5F5', textColor: '#000000' },
];

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const text = location.state?.text || '';
  
  const [backgroundColor, setBackgroundColor] = useState('#FFFAF0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBackgroundColor(profile.background_color || '#FFFAF0');
    }
  }, [profile]);

  const handleSaveColor = async (color: string) => {
    if (!user) {
      toast.error('Please sign in to save settings');
      return;
    }

    setIsSaving(true);
    setBackgroundColor(color);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ background_color: color })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success('Color saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save color');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const isPaidUser = profile?.subscription_plan === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">SETTINGS</span>
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

        {/* Settings Content */}
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Account</label>
            <p className="text-xs text-muted-foreground mt-1">
              {user ? user.email : 'Not signed in'}
            </p>
          </div>

          {/* Subscription */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Plan</label>
            <p className="text-xs text-muted-foreground mt-1">
              {isPaidUser ? 'Pro Plan - All features' : 'Free Plan - Writing only'}
            </p>
            {!isPaidUser && user && (
              <Button
                onClick={() => navigate('/signup?upgrade=true')}
                className="mt-2 w-full bg-primary text-primary-foreground rounded-xl"
                size="sm"
              >
                Upgrade to Pro - $5/month
              </Button>
            )}
          </div>

          {/* Background Color - Only for paid users */}
          {isPaidUser ? (
            <div className="bg-muted rounded-2xl p-4">
              <Label className="text-sm font-medium text-foreground">
                Reading Background Color
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Choose a dyslexia-friendly background color
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DYSLEXIA_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleSaveColor(color.value)}
                    disabled={isSaving}
                    className={`w-full aspect-square rounded-xl border-2 transition-all ${
                      backgroundColor === color.value
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {DYSLEXIA_COLORS.find(c => c.value === backgroundColor)?.name || 'Custom'}
              </p>
            </div>
          ) : (
            <div className="bg-muted rounded-2xl p-4 opacity-60">
              <Label className="text-sm font-medium text-foreground">
                Reading Background Color
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade to Pro to customize colors
              </p>
            </div>
          )}

          {/* Voice Model */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Voice Model</label>
            <p className="text-xs text-muted-foreground mt-1">VOSK + Whisper (Offline)</p>
          </div>

          {/* About */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">About</label>
            <p className="text-xs text-muted-foreground mt-1">ORATOR v1.0 - Voice-first text editing</p>
          </div>

          {/* Sign Out / Sign In */}
          {user ? (
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full rounded-2xl py-6"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/signin')}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-6"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Bottom padding for tabs */}
        <div className="h-24" />
      </div>

      <BottomTabs text={text} />

      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        text={text}
      />
    </div>
  );
};

export default Settings;
