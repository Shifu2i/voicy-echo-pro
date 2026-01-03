# Electron Desktop Widget Setup Guide

This guide explains how to run the Voice Dictation app as a desktop widget.

## ✅ What's Already Implemented

The following Electron components are ready:
- `electron/main.js` - Main process with window management, tray, global hotkeys
- `electron/preload.js` - IPC bridge with robotjs keyboard simulation
- `electron/entitlements.mac.plist` - macOS permissions for accessibility + mic
- `src/components/WidgetView.tsx` - Floating widget UI
- `/widget` route configured in App.tsx

## Prerequisites

1. **Node.js 18+** installed
2. **Build tools** for native modules:
   - **Windows**: Visual Studio Build Tools (C++ workload)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `sudo apt install build-essential`

## Quick Start

### Step 1: Install Electron Dependencies

After cloning/exporting the project, run:

```bash
# Install Electron and build tools
npm install electron electron-builder concurrently wait-on --save-dev
npm install @electron/rebuild --save-dev

# Install robotjs for keyboard simulation
npm install robotjs

# Rebuild native modules for Electron
npx @electron/rebuild
```

### Step 2: Add Scripts to package.json

Add these to your `package.json` scripts:

```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "rebuild": "electron-rebuild -f -w robotjs"
  }
}
```

### Step 3: Add Electron Config to package.json

Add these fields to `package.json`:

```json
{
  "main": "electron/main.js",
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

### Step 4: Run the App

```bash
# Development mode
npm run electron:dev

# Build distributable
npm run electron:build
```

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
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge with robotjs
│   └── entitlements.mac.plist  # macOS permissions
├── src/
│   ├── components/
│   │   └── WidgetView.tsx   # Widget UI
│   └── ...
├── docs/
│   └── ELECTRON_SETUP.md    # This file
├── package.json
└── dist-electron/           # Build output
```
