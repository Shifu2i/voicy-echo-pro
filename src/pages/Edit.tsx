import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';
import { VoiceEditRecorder } from '@/components/VoiceEditRecorder';
import { VoiceCommandRecorder } from '@/components/VoiceCommandRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { useUndoStack } from '@/hooks/useUndoStack';

const Edit = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [editMode, setEditMode] = useState<'delete' | 'replace' | 'voice-command' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { pushState, undo, canUndo, reset } = useUndoStack(text);

  useEffect(() => {
    if (location.state?.text) {
      setText(location.state.text);
      reset(location.state.text);
    }
  }, [location.state, reset]);

  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(text.substring(start, end));
      }
    }
  };

  const handleEditComplete = useCallback((newText: string) => {
    pushState(text); // Save current state before change
    setText(newText);
    setSelectedText('');
    setEditMode(null);
  }, [text, pushState]);

  const handleUndo = useCallback(() => {
    const previousText = undo();
    return previousText;
  }, [undo]);

  // Get user's background color preference
  const backgroundColor = profile?.background_color || '#D8DDE4';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">EDIT</span>
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
        <div 
          className="rounded-3xl p-1"
          style={{ backgroundColor }}
        >
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={handleTextSelect}
            placeholder="Paste or type your text here to edit..."
            className="min-h-[300px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-3xl p-4"
            style={{ 
              backgroundColor: 'transparent',
              color: '#000000'
            }}
          />
        </div>

        {/* Selection indicator */}
        {selectedText && (
          <div className="bg-primary h-2 rounded-full" />
        )}

        {/* Edit Mode Buttons or Active Recorder */}
        {editMode === 'voice-command' ? (
          <div className="space-y-3">
            <VoiceCommandRecorder
              fullText={text}
              onEditComplete={handleEditComplete}
              onUndo={handleUndo}
              canUndo={canUndo}
            />
            <button 
              onClick={() => setEditMode(null)}
              className="w-full text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        ) : editMode ? (
          <div className="space-y-3">
            <VoiceEditRecorder
              mode={editMode}
              selectedText={selectedText}
              onEditComplete={handleEditComplete}
              fullText={text}
            />
            <button 
              onClick={() => setEditMode(null)}
              className="w-full text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-4">
              <button
                onClick={() => setEditMode('delete')}
                className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-full text-base font-medium"
              >
                DELETE
              </button>
              <button
                onClick={() => setEditMode('replace')}
                className="flex-1 bg-primary text-primary-foreground py-4 rounded-full text-base font-medium"
              >
                REPLACE
              </button>
            </div>
            <button
              onClick={() => setEditMode('voice-command')}
              className="w-full bg-accent text-accent-foreground py-4 rounded-full text-base font-medium"
            >
              VOICE COMMAND
            </button>
          </div>
        )}

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

export default Edit;
