const { contextBridge, ipcRenderer, clipboard } = require('electron');

// Try to load robotjs for keyboard simulation
let robot = null;
try {
  robot = require('robotjs');
  console.log('robotjs loaded successfully');
} catch (error) {
  console.warn('robotjs not available, using clipboard fallback:', error.message);
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  isElectron: true,
  platform: process.platform,

  // Keyboard simulation - types text into active application
  typeText: async (text) => {
    if (!text || text.trim() === '') return { success: false, error: 'Empty text' };

    try {
      if (robot) {
        // Use robotjs for natural typing
        // Small delay to ensure focus is on target app
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Type each character with a small delay for reliability
        robot.setKeyboardDelay(10);
        robot.typeString(text);
        
        return { success: true, method: 'robotjs' };
      } else {
        // Fallback: copy to clipboard and simulate paste
        return await pasteText(text);
      }
    } catch (error) {
      console.error('typeText error:', error);
      // Fallback to clipboard method
      return await pasteText(text);
    }
  },

  // Type with configurable delay between characters
  typeTextWithDelay: async (text, delayMs = 20) => {
    if (!text || text.trim() === '') return { success: false, error: 'Empty text' };
    
    try {
      if (robot) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        for (const char of text) {
          robot.typeString(char);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        return { success: true, method: 'robotjs-delayed' };
      } else {
        return await pasteText(text);
      }
    } catch (error) {
      console.error('typeTextWithDelay error:', error);
      return await pasteText(text);
    }
  },

  // Clipboard-based paste (faster for long text)
  pasteText: async (text) => {
    return await pasteText(text);
  },

  // Copy text to clipboard only (without pasting)
  copyToClipboard: (text) => {
    clipboard.writeText(text);
    return { success: true };
  },

  // Read from clipboard
  readClipboard: () => {
    return clipboard.readText();
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', value),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),

  // IPC listeners for main process commands
  onToggleDictation: (callback) => {
    ipcRenderer.on('toggle-dictation', () => callback());
    return () => ipcRenderer.removeAllListeners('toggle-dictation');
  },
  
  onStopDictation: (callback) => {
    ipcRenderer.on('stop-dictation', () => callback());
    return () => ipcRenderer.removeAllListeners('stop-dictation');
  }
});

// Helper function for clipboard-based paste
async function pasteText(text) {
  try {
    // Save current clipboard content
    const previousClipboard = clipboard.readText();
    
    // Write new text to clipboard
    clipboard.writeText(text);
    
    // Small delay to ensure clipboard is updated
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (robot) {
      // Simulate Ctrl+V (or Cmd+V on macOS)
      const modifier = process.platform === 'darwin' ? 'command' : 'control';
      robot.keyTap('v', modifier);
      
      // Restore previous clipboard after a short delay
      setTimeout(() => {
        clipboard.writeText(previousClipboard);
      }, 200);
      
      return { success: true, method: 'clipboard-paste' };
    } else {
      // Can't paste without robotjs, but text is in clipboard
      return { 
        success: true, 
        method: 'clipboard-only',
        message: 'Text copied to clipboard. Press Ctrl+V to paste.'
      };
    }
  } catch (error) {
    console.error('pasteText error:', error);
    return { success: false, error: error.message };
  }
}

console.log('Preload script loaded');
