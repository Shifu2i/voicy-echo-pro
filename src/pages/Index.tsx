import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';

const Index = () => {
  const location = useLocation();
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Card Container */}
        <div className="bg-card rounded-3xl p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground tracking-wide">Write</h1>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Text Area */}
          <div className="bg-muted rounded-2xl">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing..."
              className="min-h-[320px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-2xl p-4 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Voice Recorder */}
          <VoiceRecorder onTranscription={handleTranscription} />
        </div>
      </div>

      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        text={text}
      />
    </div>
  );
};

export default Index;
