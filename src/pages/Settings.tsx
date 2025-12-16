import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';

const Settings = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const text = location.state?.text || '';

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
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">App Theme</label>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </div>

          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Voice Model</label>
            <p className="text-xs text-muted-foreground mt-1">VOSK + Whisper (Offline)</p>
          </div>

          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">About</label>
            <p className="text-xs text-muted-foreground mt-1">ORATOR v1.0 - Voice-first text editing</p>
          </div>
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