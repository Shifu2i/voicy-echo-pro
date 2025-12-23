# Electron Desktop Widget Setup Guide

This guide explains how to convert the Voice Dictation app into a desktop widget.

## Prerequisites

1. **Node.js 18+** installed
2. **Build tools** for native modules:
   - **Windows**: Visual Studio Build Tools (C++ workload)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `sudo apt install build-essential`

## Step 1: Install Dependencies

```bash
# Install Electron and build tools
npm install electron electron-builder concurrently --save-dev
npm install @electron/rebuild --save-dev

# Install robotjs for keyboard simulation
npm install robotjs

# Rebuild native modules for Electron
npx @electron/rebuild
```

## Step 2: Update package.json

Add/modify these fields in your `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "rebuild": "electron-rebuild -f -w robotjs"
  },
  "build": {
    "appId": "com.voicedictation.widget",
    "productName": "Voice Dictation Widget",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "mac": {
      "target": "dmg",
      "category": "public.app-category.productivity",
      "entitlements": "electron/entitlements.mac.plist",
      "entitlementsInherit": "electron/entitlements.mac.plist"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

Also install wait-on:
```bash
npm install wait-on --save-dev
```

## Step 3: Add Widget Route

Update `src/App.tsx` to add the widget route:

```tsx
import { WidgetView } from '@/components/WidgetView';

// Add this route inside your Routes component:
<Route path="/widget" element={<WidgetView />} />
```

## Step 4: Create macOS Entitlements (if building for macOS)

Create `electron/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
```

## Step 5: Add Tray Icon (Optional)

Place a `icon.png` (16x16 or 32x32) in the `electron/` folder for the system tray.

## Step 6: Run in Development

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server on http://localhost:5173
2. Launch Electron loading the widget view

## Step 7: Build for Production

```bash
npm run electron:build
```

Output will be in `dist-electron/` folder.

## Global Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle dictation on/off |
| `Ctrl+Shift+H` | Show/hide widget |
| `Escape` | Stop dictation (when widget focused) |

## Keyboard Simulation Methods

The widget uses two methods to type into other applications:

1. **robotjs (preferred)**: Simulates actual keystrokes
2. **Clipboard fallback**: Copies text and simulates Ctrl+V

## Troubleshooting

### robotjs installation fails
```bash
# Ensure build tools are installed
# Windows: Install "Desktop development with C++" from Visual Studio Installer
# macOS: xcode-select --install
# Linux: sudo apt install build-essential python3

# Rebuild with verbose output
npm rebuild robotjs --build-from-source
```

### macOS Accessibility Permissions
The app will request accessibility permissions on first launch. 
Go to System Preferences → Security & Privacy → Privacy → Accessibility
and add the app.

### Widget doesn't type into other apps
1. Check that robotjs loaded (look in DevTools console)
2. On macOS, verify accessibility permissions
3. On Windows, try running as administrator

## File Structure

```
your-project/
├── electron/
│   ├── main.js           # Electron main process
│   ├── preload.js        # IPC bridge
│   ├── icon.png          # Tray icon (optional)
│   └── entitlements.mac.plist  # macOS signing
├── src/
│   ├── components/
│   │   └── WidgetView.tsx    # Widget UI
│   └── ...
├── package.json
└── dist-electron/        # Build output
```
