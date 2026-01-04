# Electron Desktop Widget Setup Guide

This guide explains how to build and distribute the Voice Dictation app as a desktop widget using Electron Forge.

## ✅ What's Implemented

The following Electron Forge components are ready:
- `electron/main.js` - Main process with window management, tray, global hotkeys
- `electron/preload.js` - IPC bridge with robotjs keyboard simulation
- `electron/entitlements.mac.plist` - macOS permissions for accessibility + mic
- `forge.config.js` - Electron Forge configuration with makers for all platforms
- `vite.main.config.mjs` - Vite config for main process
- `vite.preload.config.mjs` - Vite config for preload scripts
- `vite.renderer.config.mjs` - Vite config for React renderer
- `src/components/WidgetView.tsx` - Floating widget UI
- `/widget` route configured in App.tsx

## Prerequisites

1. **Node.js 18+** installed
2. **Build tools** for native modules:
   - **Windows**: Visual Studio Build Tools (C++ workload)
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Linux**: `sudo apt install build-essential python3`

## Quick Start

### Step 1: Clone/Export the Project

Export from Lovable to GitHub and clone locally:

```bash
git clone https://github.com/your-username/voice-dictation-widget.git
cd voice-dictation-widget
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# Install Electron Forge CLI and dependencies
npm install --save-dev @electron-forge/cli @electron-forge/plugin-vite
npm install --save-dev @electron-forge/maker-squirrel @electron-forge/maker-dmg
npm install --save-dev @electron-forge/maker-zip @electron-forge/maker-deb @electron-forge/maker-rpm
npm install --save-dev electron electron-squirrel-startup
npm install --save-dev @electron/rebuild

# Install robotjs for keyboard simulation
npm install robotjs

# Rebuild native modules for Electron
npx @electron/rebuild
```

### Step 3: Add Scripts to package.json

Add these to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "publish": "electron-forge publish",
    "rebuild": "electron-rebuild -f -w robotjs"
  }
}
```

### Step 4: Add Electron Config to package.json

Add these fields to `package.json`:

```json
{
  "main": "electron/main.js",
  "name": "voice-dictation-widget",
  "productName": "Voice Dictation Widget",
  "version": "1.0.0",
  "description": "A desktop voice dictation widget with offline speech recognition"
}
```

### Step 5: Create App Icons

Create icons in `electron/icons/`:

| Platform | File | Size |
|----------|------|------|
| Windows | `icon.ico` | 256x256 (multi-resolution) |
| macOS | `icon.icns` | 1024x1024 |
| Linux/Other | `icon.png` | 512x512 |

You can use tools like:
- [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker)
- [iconvert](https://iconverticons.com/online/)
- [makeappicon](https://makeappicon.com/)

### Step 6: Run the App

```bash
# Development mode (with hot reload)
npm start

# Package app (creates unpacked build)
npm run package

# Create installers for your platform
npm run make
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run in development with Forge + Vite hot reload |
| `npm run package` | Create unpacked app in `out/` directory |
| `npm run make` | Create platform-specific installers |
| `npm run publish` | Upload to configured release server |

## Build Outputs

After running `npm run make`, find installers in `out/make/`:

| Platform | Output Location |
|----------|-----------------|
| Windows | `out/make/squirrel.windows/x64/VoiceDictationWidget-1.0.0 Setup.exe` |
| macOS | `out/make/Voice Dictation Widget-1.0.0-arm64.dmg` |
| Linux (deb) | `out/make/deb/x64/voice-dictation-widget_1.0.0_amd64.deb` |
| Linux (rpm) | `out/make/rpm/x64/voice-dictation-widget-1.0.0-1.x86_64.rpm` |

## Global Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Toggle dictation on/off |
| `Ctrl+Shift+H` / `Cmd+Shift+H` | Show/hide widget |
| `Escape` | Stop dictation (when widget focused) |

## Code Signing (Production)

### macOS

Set these environment variables before building:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

Then run:
```bash
npm run make
```

### Windows

For signing Windows builds, you'll need a code signing certificate. Add to `forge.config.js`:

```javascript
makers: [
  {
    name: '@electron-forge/maker-squirrel',
    config: {
      certificateFile: './cert.pfx',
      certificatePassword: process.env.CERTIFICATE_PASSWORD
    }
  }
]
```

## Auto-Updates (Optional)

To enable auto-updates via GitHub Releases:

1. Install the publisher:
   ```bash
   npm install --save-dev @electron-forge/publisher-github
   ```

2. Uncomment the `publishers` section in `forge.config.js`

3. Set GitHub token:
   ```bash
   export GITHUB_TOKEN="your-github-personal-access-token"
   ```

4. Publish:
   ```bash
   npm run publish
   ```

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

### Build fails with native module errors
```bash
# Clear node_modules and rebuild
rm -rf node_modules
npm install
npx @electron/rebuild
```

## File Structure

```
your-project/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge with robotjs
│   ├── entitlements.mac.plist  # macOS permissions
│   └── icons/               # App icons (create these)
│       ├── icon.ico         # Windows
│       ├── icon.icns        # macOS
│       └── icon.png         # Linux
├── src/
│   ├── components/
│   │   └── WidgetView.tsx   # Widget UI
│   └── ...
├── docs/
│   └── ELECTRON_SETUP.md    # This file
├── forge.config.js          # Electron Forge config
├── vite.main.config.mjs     # Main process bundling
├── vite.preload.config.mjs  # Preload bundling
├── vite.renderer.config.mjs # React app bundling
├── package.json
└── out/                     # Build output (generated)
    └── make/                # Installers
```
