import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { EditCommands } from '@/components/EditCommands';
import { Mic, Shield } from 'lucide-react';

const Index = () => {
  const [text, setText] = useState('');

  const handleTranscription = (transcribedText: string) => {
    setText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
  };

  const handleEditComplete = (editedText: string) => {
    setText(editedText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-primary/10">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Echo Edit v2
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your voice into polished text with AI-powered editing
          </p>
        </header>

        {/* Main Editor Card */}
        <Card className="mb-6 p-6 shadow-xl border-2">
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Your Text
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start recording or type your text here..."
              className="min-h-[300px] text-base resize-none focus-visible:ring-primary"
            />
          </div>

          {/* Voice Controls */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium text-foreground">
                Voice Input
              </label>
            </div>
            <VoiceRecorder onTranscription={handleTranscription} />
          </div>

          {/* Edit Commands */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              AI Editing Commands
            </label>
            <EditCommands text={text} onEditComplete={handleEditComplete} />
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                Your audio recordings are never stored. All transcriptions happen in real-time 
                and audio data is immediately deleted after processing.
              </p>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center hover:shadow-lg smooth-transition">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-primary/10">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Voice Dictation</h3>
            <p className="text-sm text-muted-foreground">
              High-accuracy speech-to-text with automatic punctuation
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg smooth-transition">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-accent/10">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Privacy Protected</h3>
            <p className="text-sm text-muted-foreground">
              Zero data storage, immediate deletion after processing
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg smooth-transition">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-primary/10">
              <svg 
                className="h-6 w-6 text-primary" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">AI-Powered Editing</h3>
            <p className="text-sm text-muted-foreground">
              Instant text refinement with voice-triggered commands
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
