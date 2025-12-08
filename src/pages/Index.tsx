import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Mic, Wand2, Shield, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState('');

  useEffect(() => {
    // Get text from navigation state if coming back from edit
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleTranscription = (transcribedText: string) => {
    setText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-110">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Echo Edit</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted" />
        </div>

        {/* Hero Card */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '50ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-105">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Voice to Text
          </h1>
          <p className="text-sm text-muted-foreground">
            Speak and let AI transform your words
          </p>
        </div>

        {/* Voice Recorder */}
        <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '100ms' }}>
          <VoiceRecorder onTranscription={handleTranscription} />
        </div>

        {/* Text Area */}
        <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your Text
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start recording or type here..."
            className="min-h-[160px] text-sm resize-none border-0 bg-muted/50 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all duration-200"
          />
        </div>

        {/* Feature Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shrink-0 transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Fast</span>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shrink-0 transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Private</span>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shrink-0 transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">AI Powered</span>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-muted/50 rounded-2xl p-4 animate-fade-in transition-all duration-300 hover:bg-muted/70" style={{ animationDelay: '250ms' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-card flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your audio is never stored. All processing happens in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4">
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center transition-colors duration-200">
                <Mic className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-medium text-primary">Record</span>
            </button>
            <button 
              onClick={() => navigate('/edit', { state: { text } })}
              className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-200">
                <Wand2 className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Edit</span>
            </button>
            <button 
              onClick={() => navigate('/info')}
              className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-200">
                <Shield className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Info</span>
            </button>
          </div>
        </div>

        {/* Bottom padding for fixed nav */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default Index;
