import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleTranscription = (transcribedText: string) => {
    setText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
  };

  // Get user's color preferences (profile overrides localStorage)
  const backgroundColor = profile?.background_color || localStorage.getItem('backgroundColor') || '#D8DDE4';
  const writingColor = profile?.writing_color || localStorage.getItem('writingColor') || '#000000';
  const isPaidUser = profile?.subscription_plan === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">WRITE</span>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 transition-all duration-150 hover:bg-muted rounded-lg active:scale-90"
            >
              <Menu className="w-6 h-6 text-foreground transition-transform duration-200 hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div 
          className="rounded-3xl p-1 transition-all duration-300 hover:shadow-lg focus-within:shadow-xl focus-within:ring-2 focus-within:ring-primary/30"
          style={{ backgroundColor }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start recording or type here..."
            className="min-h-[300px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-3xl p-4 transition-all duration-200"
            style={{ 
              backgroundColor: 'transparent',
              color: writingColor
            }}
          />
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder onTranscription={handleTranscription} />

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

export default Index;
