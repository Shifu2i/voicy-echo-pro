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

  // Get user's background color preference
  const backgroundColor = profile?.background_color || '#D8DDE4';
  const isPaidUser = profile?.subscription_plan === 'paid';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 shrink-0">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">WRITE</span>
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

        {/* Text Area - fills available space */}
        <div 
          className="flex-1 rounded-3xl p-1 min-h-0"
          style={{ backgroundColor: isPaidUser ? backgroundColor : '#D8DDE4' }}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start recording or type here..."
            className="h-full text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-3xl p-4"
            style={{ 
              backgroundColor: 'transparent',
              color: '#000000'
            }}
          />
        </div>

        {/* Voice Recorder */}
        <div className="py-4 shrink-0">
          <VoiceRecorder onTranscription={handleTranscription} />
        </div>
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
