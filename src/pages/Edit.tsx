import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { VoiceEditRecorder } from '@/components/VoiceEditRecorder';

const Edit = () => {
  const location = useLocation();
  const [text, setText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [editMode, setEditMode] = useState<'delete' | 'replace' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);

  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(text.substring(start, end));
      }
    }
  };

  const handleEditComplete = (newText: string) => {
    setText(newText);
    setSelectedText('');
    setEditMode(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Card Container */}
        <div className="bg-card rounded-3xl p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground tracking-wide">Edit</h1>
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
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onSelect={handleTextSelect}
              placeholder="Paste or type your text here to edit..."
              className="min-h-[320px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-2xl p-4 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Selection indicator */}
          {selectedText && (
            <div className="bg-primary h-1.5 rounded-full" />
          )}

          {/* Edit Mode Buttons or Active Recorder */}
          {editMode ? (
            <div className="space-y-3">
              <VoiceEditRecorder
                mode={editMode}
                selectedText={selectedText}
                onEditComplete={handleEditComplete}
                fullText={text}
              />
              <button 
                onClick={() => setEditMode(null)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setEditMode('delete')}
                className="flex-1 bg-secondary text-secondary-foreground py-3.5 rounded-full text-sm font-medium hover:bg-secondary/90 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setEditMode('replace')}
                className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Replace
              </button>
            </div>
          )}
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

export default Edit;
