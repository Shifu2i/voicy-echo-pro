import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';
import { VoiceEditRecorder } from '@/components/VoiceEditRecorder';
import { useAuth } from '@/contexts/AuthContext';

const Edit = () => {
  const location = useLocation();
  const { profile } = useAuth();
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

  // Get user's background color preference
  const backgroundColor = profile?.background_color || '#D8DDE4';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 shrink-0">
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

        {/* Text Area - fills available space */}
        <div 
          className="flex-1 rounded-3xl p-1 min-h-0"
          style={{ backgroundColor }}
        >
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={handleTextSelect}
            placeholder="Paste or type your text here to edit..."
            className="h-full text-base resize-none border-0 bg-transparent focus-visible:ring-0 rounded-3xl p-4"
            style={{ 
              backgroundColor: 'transparent',
              color: '#000000'
            }}
          />
        </div>

        {/* Selection indicator */}
        {selectedText && (
          <div className="bg-primary h-2 rounded-full mt-2 shrink-0" />
        )}

        {/* Edit Mode Buttons or Active Recorder */}
        <div className="py-4 shrink-0">
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
                className="w-full text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
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
          )}
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

export default Edit;
