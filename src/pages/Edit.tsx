import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { EditCommands } from '@/components/EditCommands';
import { Mic, Wand2, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Edit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState('');

  useEffect(() => {
    // Get text from navigation state
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleEditComplete = (editedText: string) => {
    setText(editedText);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-110">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Echo Edit</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted" />
        </div>

        {/* Hero Card */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '50ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-105">
            <Wand2 className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            AI Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Transform your text with AI commands
          </p>
        </div>

        {/* Text Area */}
        <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your Text
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here to edit..."
            className="min-h-[160px] text-sm resize-none border-0 bg-muted/50 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all duration-200"
          />
        </div>

        {/* Edit Commands */}
        <div className="bg-card rounded-3xl p-4 shadow-sm border border-border animate-fade-in transition-all duration-300 hover:shadow-md" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI Commands
            </span>
          </div>
          <EditCommands text={text} onEditComplete={handleEditComplete} />
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-4">
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button 
              onClick={() => navigate('/', { state: { text } })}
              className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center transition-colors duration-200">
                <Mic className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Record</span>
            </button>
            <button className="flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 active:scale-95">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center transition-colors duration-200">
                <Wand2 className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-medium text-primary">Edit</span>
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

export default Edit;