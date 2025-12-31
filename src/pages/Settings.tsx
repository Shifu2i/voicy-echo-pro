import { useState, useEffect, useCallback } from 'react';
import { Menu, LogOut, Mic, Keyboard, Trash2, RefreshCw, RotateCcw, ExternalLink, Volume2, Play } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideMenu } from '@/components/SideMenu';
import { BottomTabs } from '@/components/BottomTabs';
import { MicTest } from '@/components/MicTest';
import { VoiceCommandsGuide } from '@/components/VoiceCommandsGuide';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShortcutConfig, formatShortcut, parseKeyEvent, DEFAULT_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { getAvailableVoices, loadTTSSettings, saveTTSSettings, speak, TTSSettings } from '@/utils/textToSpeech';

// Reading background color options
const DYSLEXIA_COLORS = [
  { name: 'Dark Teal', value: '#1E3A3A' },
  { name: 'Soft Blue', value: '#A4C4D4' },
  { name: 'Soft Yellow', value: '#F5E6A3' },
  { name: 'Soft Pink', value: '#F5D0D0' },
  { name: 'Soft Green', value: '#C4E6C4' },
  { name: 'Peach', value: '#F5D4A8' },
  { name: 'Lavender', value: '#E0D4F5' },
  { name: 'White', value: '#FFFFFF' },
];

// Text color presets
const TEXT_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#4A4A4A' },
  { name: 'Navy', value: '#1a1a6e' },
  { name: 'Dark Brown', value: '#6B4423' },
  { name: 'Dark Green', value: '#2D5A2D' },
  { name: 'Light Green', value: '#6B8E6B' },
  { name: 'Dark Purple', value: '#3D1A5E' },
  { name: 'Olive', value: '#556B2F' },
];

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const text = location.state?.text || '';
  
  // Background color state
  const [backgroundColor, setBackgroundColor] = useState('#FFFAF0');
  const [customBgHex, setCustomBgHex] = useState('');
  const [bgHexError, setBgHexError] = useState('');
  
  // Writing color state
  const [writingColor, setWritingColor] = useState('#000000');
  const [customTextHex, setCustomTextHex] = useState('');
  const [textHexError, setTextHexError] = useState('');
  
  // Microphone state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  
  // TTS settings state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(loadTTSSettings);
  const [isTesting, setIsTesting] = useState(false);
  
  // Keyboard shortcuts state
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(() => {
    try {
      const saved = localStorage.getItem('widget-keyboard-shortcuts');
      return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });
  const [capturingKey, setCapturingKey] = useState<keyof ShortcutConfig | null>(null);
  const [capturedKeys, setCapturedKeys] = useState('');

  const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

  // Load audio devices
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(audioInputs);
        
        // Load saved device from localStorage
        const savedDeviceId = localStorage.getItem('selectedMicrophoneId');
        if (savedDeviceId && audioInputs.some(d => d.deviceId === savedDeviceId)) {
          setSelectedMic(savedDeviceId);
        } else if (audioInputs.length > 0) {
          setSelectedMic(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate audio devices:', error);
      }
    };
    
    loadAudioDevices();
  }, []);

  // Load TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = getAvailableVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    // Voices may load async in some browsers
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleTTSChange = (key: keyof TTSSettings, value: string | number) => {
    const updated = { ...ttsSettings, [key]: value };
    setTtsSettings(updated);
    saveTTSSettings(updated);
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      await speak("Hello! This is a test of the text to speech settings.", ttsSettings);
    } catch (e) {
      console.error('TTS test failed:', e);
    }
    setIsTesting(false);
  };

  useEffect(() => {
    if (profile) {
      setBackgroundColor(profile.background_color || '#FFFAF0');
      setWritingColor(profile.writing_color || '#000000');
      
      // If profile bg color is not a preset, show it in the custom input
      const isBgPreset = DYSLEXIA_COLORS.some(c => c.value === profile.background_color);
      if (!isBgPreset && profile.background_color) {
        setCustomBgHex(profile.background_color);
      }
      
      // If profile text color is not a preset, show it in the custom input
      const isTextPreset = TEXT_COLORS.some(c => c.value === profile.writing_color);
      if (!isTextPreset && profile.writing_color) {
        setCustomTextHex(profile.writing_color);
      }
    }
  }, [profile]);

  const handleBgHexInputChange = (value: string) => {
    let hex = value.startsWith('#') ? value : `#${value}`;
    setCustomBgHex(hex);
    setBgHexError(hex.length > 1 && !isValidHex(hex) ? 'Invalid hex format (e.g., #FF5733)' : '');
  };

  const handleTextHexInputChange = (value: string) => {
    let hex = value.startsWith('#') ? value : `#${value}`;
    setCustomTextHex(hex);
    setTextHexError(hex.length > 1 && !isValidHex(hex) ? 'Invalid hex format (e.g., #333333)' : '');
  };

  const handleSaveCustomBgColor = async () => {
    if (!isValidHex(customBgHex)) {
      setBgHexError('Please enter a valid hex color');
      return;
    }
    await handleSaveBackgroundColor(customBgHex);
  };

  const handleSaveCustomTextColor = async () => {
    if (!isValidHex(customTextHex)) {
      setTextHexError('Please enter a valid hex color');
      return;
    }
    await handleSaveWritingColor(customTextHex);
  };

  const handleSaveBackgroundColor = async (color: string) => {
    setIsSaving(true);
    setBackgroundColor(color);
    
    // Save to localStorage for all users
    localStorage.setItem('backgroundColor', color);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ background_color: color })
          .eq('id', user.id);

        if (error) throw error;
        
        await refreshProfile();
      } catch (error: any) {
        toast.error(error.message || 'Failed to save color');
        setIsSaving(false);
        return;
      }
    }
    
    toast.success('Background color saved!');
    setIsSaving(false);
  };

  const handleSaveWritingColor = async (color: string) => {
    setIsSaving(true);
    setWritingColor(color);
    
    // Save to localStorage for all users
    localStorage.setItem('writingColor', color);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ writing_color: color })
          .eq('id', user.id);

        if (error) throw error;
        
        await refreshProfile();
      } catch (error: any) {
        toast.error(error.message || 'Failed to save color');
        setIsSaving(false);
        return;
      }
    }
    
    toast.success('Text color saved!');
    setIsSaving(false);
  };

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    localStorage.setItem('selectedMicrophoneId', deviceId);
    toast.success('Microphone saved!');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  // Keyboard shortcut handlers
  const handleUpdateShortcut = useCallback((key: keyof ShortcutConfig, value: string) => {
    setShortcuts(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('widget-keyboard-shortcuts', JSON.stringify(updated));
      return updated;
    });
    toast.success('Shortcut updated!');
  }, []);

  const handleResetShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.setItem('widget-keyboard-shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
    toast.success('Shortcuts reset to defaults');
  }, []);

  // Capture keyboard shortcut
  useEffect(() => {
    if (!capturingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const parsed = parseKeyEvent(e);
      setCapturedKeys(parsed);
      
      if (e.ctrlKey || e.metaKey || e.altKey) {
        const key = e.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
          handleUpdateShortcut(capturingKey, parsed);
          setCapturingKey(null);
          setCapturedKeys('');
        }
      }
    };

    const handleKeyUp = () => {
      setTimeout(() => {
        if (capturingKey) {
          setCapturedKeys('');
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [capturingKey, handleUpdateShortcut]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1" />
          <div className="bg-muted px-6 py-2 rounded-full">
            <span className="text-sm font-medium text-foreground">SETTINGS</span>
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

        {/* Settings Content */}
        <div className="space-y-4">
          {/* Voice Commands Guide */}
          <VoiceCommandsGuide />

          {/* Account Info */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Account</label>
            <p className="text-xs text-muted-foreground mt-1">
              {user ? user.email : 'Not signed in'}
            </p>
          </div>

          {/* Text-to-Speech Settings */}
          <div className="bg-muted rounded-2xl p-4">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Text-to-Speech
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Customize how text is read aloud
            </p>
            
            {/* Voice Selection */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Voice</label>
                <Select 
                  value={ttsSettings.voiceURI} 
                  onValueChange={(v) => handleTTSChange('voiceURI', v)}
                >
                  <SelectTrigger className="w-full bg-background mt-1">
                    <SelectValue placeholder="System default" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50 max-h-60">
                    <SelectItem value="">System default</SelectItem>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Rate Slider */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs text-muted-foreground">Speed</label>
                  <span className="text-xs text-muted-foreground">{ttsSettings.rate.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[ttsSettings.rate]}
                  onValueChange={([v]) => handleTTSChange('rate', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="mt-2"
                />
              </div>
              
              {/* Pitch Slider */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs text-muted-foreground">Pitch</label>
                  <span className="text-xs text-muted-foreground">{ttsSettings.pitch.toFixed(1)}</span>
                </div>
                <Slider
                  value={[ttsSettings.pitch]}
                  onValueChange={([v]) => handleTTSChange('pitch', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="mt-2"
                />
              </div>
              
              {/* Test Button */}
              <Button
                onClick={handleTestVoice}
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <Play className="w-3 h-3 mr-2" />
                {isTesting ? 'Playing...' : 'Test Voice'}
              </Button>
            </div>
          </div>

          {/* Voice Model */}
          <div className="bg-muted rounded-2xl p-4">
            <label className="text-sm font-medium text-foreground">Voice Model</label>
            <p className="text-xs text-muted-foreground mt-1">VOSK + Whisper (Offline)</p>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-muted rounded-2xl p-4">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Configure shortcuts for the floating widget
            </p>
            
            <div className="space-y-2">
              {/* Mic Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Toggle Mic</span>
                </div>
                <Button
                  variant={capturingKey === 'mic' ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-w-[120px] text-xs font-mono"
                  onClick={() => setCapturingKey(capturingKey === 'mic' ? null : 'mic')}
                >
                  {capturingKey === 'mic' 
                    ? (capturedKeys ? formatShortcut(capturedKeys) : 'Press keys...')
                    : formatShortcut(shortcuts.mic)
                  }
                </Button>
              </div>

              {/* Delete */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Delete</span>
                </div>
                <Button
                  variant={capturingKey === 'delete' ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-w-[120px] text-xs font-mono"
                  onClick={() => setCapturingKey(capturingKey === 'delete' ? null : 'delete')}
                >
                  {capturingKey === 'delete' 
                    ? (capturedKeys ? formatShortcut(capturedKeys) : 'Press keys...')
                    : formatShortcut(shortcuts.delete)
                  }
                </Button>
              </div>

              {/* Replace */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Replace</span>
                </div>
                <Button
                  variant={capturingKey === 'replace' ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-w-[120px] text-xs font-mono"
                  onClick={() => setCapturingKey(capturingKey === 'replace' ? null : 'replace')}
                >
                  {capturingKey === 'replace' 
                    ? (capturedKeys ? formatShortcut(capturedKeys) : 'Press keys...')
                    : formatShortcut(shortcuts.replace)
                  }
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs text-muted-foreground"
              onClick={handleResetShortcuts}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset to defaults
            </Button>
          </div>

          {/* More Section */}
          <div className="bg-muted rounded-2xl p-4">
            <button
              onClick={() => setIsMoreExpanded(!isMoreExpanded)}
              className="w-full flex items-center justify-center py-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
            >
              More
            </button>
            
            {isMoreExpanded && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-6">
                {/* Background Color */}
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Reading Background Color
                  </Label>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {DYSLEXIA_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleSaveBackgroundColor(color.value)}
                        disabled={isSaving}
                        className={`w-full aspect-square rounded-xl border-2 transition-all ${
                          backgroundColor === color.value
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center mt-3">
                    <Input
                      type="text"
                      placeholder="#1E1E1E"
                      value={customBgHex}
                      onChange={(e) => handleBgHexInputChange(e.target.value)}
                      className="flex-1 font-mono uppercase bg-background"
                      maxLength={7}
                    />
                    <Button
                      onClick={handleSaveCustomBgColor}
                      disabled={isSaving || !isValidHex(customBgHex)}
                      size="sm"
                      variant="secondary"
                    >
                      Set
                    </Button>
                  </div>
                  {bgHexError && (
                    <p className="text-xs text-destructive mt-1">{bgHexError}</p>
                  )}
                </div>

                {/* Text Color */}
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Text Color
                  </Label>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleSaveWritingColor(color.value)}
                        disabled={isSaving}
                        className={`w-full aspect-square rounded-xl border-2 transition-all ${
                          writingColor === color.value
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center mt-3">
                    <Input
                      type="text"
                      placeholder="#333333"
                      value={customTextHex}
                      onChange={(e) => handleTextHexInputChange(e.target.value)}
                      className="flex-1 font-mono uppercase bg-background"
                      maxLength={7}
                    />
                    <Button
                      onClick={handleSaveCustomTextColor}
                      disabled={isSaving || !isValidHex(customTextHex)}
                      size="sm"
                      variant="secondary"
                    >
                      Set
                    </Button>
                  </div>
                  {textHexError && (
                    <p className="text-xs text-destructive mt-1">{textHexError}</p>
                  )}
                </div>

                {/* Microphone Input */}
                <div>
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Microphone Input
                  </Label>
                  {audioDevices.length > 0 ? (
                    <>
                      <Select value={selectedMic} onValueChange={handleMicChange}>
                        <SelectTrigger className="w-full bg-background mt-3">
                          <SelectValue placeholder="Select a microphone" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {audioDevices.map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <MicTest deviceId={selectedMic} />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      No microphones detected. Please allow microphone access.
                    </p>
                  )}
                </div>

                {/* About */}
                <div>
                  <label className="text-sm font-medium text-foreground">About</label>
                  <p className="text-xs text-muted-foreground mt-1">ORATOR v1.0 - Voice-first text editing</p>
                </div>

                {/* Floating Widget Mode */}
                <div>
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Floating Widget Mode
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Open a compact floating window for quick voice input
                  </p>
                  <Button
                    onClick={() => navigate('/widget')}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Floating Widget
                  </Button>
                </div>

                {/* Sign Out / Sign In */}
                {user ? (
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full rounded-xl py-4"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/signin')}
                    variant="outline"
                    className="w-full rounded-xl py-4"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={() => toast.success('Settings saved!')}
            className="w-full rounded-2xl py-6 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground"
          >
            Save
          </Button>
        </div>

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

export default Settings;
