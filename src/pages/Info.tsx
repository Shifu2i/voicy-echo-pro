import { Mic, Wand2, Shield, Zap, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Info = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-110">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Echo Edit</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted" />
        </div>

        {/* Hero Card */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '50ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-105">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            About Echo Edit
          </h1>
          <p className="text-sm text-muted-foreground">
            Privacy-first voice transcription and AI editing
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform duration-200">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Voice Dictation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High-accuracy speech-to-text powered by your browser's Web Speech API. Works in real-time as you speak.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ animationDelay: '150ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 transition-transform duration-200">
                <Wand2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">AI-Powered Editing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Transform your text with intelligent commands. Fix grammar, change tone, summarize, and more.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform duration-200">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Privacy First</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your audio is never stored. All transcriptions happen in real-time and data is immediately deleted.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ animationDelay: '250ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 transition-transform duration-200">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Fast & Free</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No sign-up required. Start using immediately with zero cost for voice transcription.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md hover:scale-[1.02]" style={{ animationDelay: '300ms' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform duration-200">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Browser-Based</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Works directly in your browser. No downloads or installations needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4">
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button 
              onClick={() => navigate('/')}
              className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-200">
                <Mic className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Record</span>
            </button>
            <button 
              onClick={() => navigate('/edit')}
              className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-200">
                <Wand2 className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Edit</span>
            </button>
            <button className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center transition-colors duration-200">
                <Shield className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-medium text-primary">Info</span>
            </button>
          </div>
        </div>

        {/* Bottom padding for fixed nav */}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default Info;