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
              className="p-2"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="bg-muted rounded-3xl p-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start recording or type here..."
            className="min-h-[300px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-3xl p-4"
          />
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder onTranscription={handleTranscription} />
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