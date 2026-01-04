# Tauri Desktop Widget Setup Guide

This guide explains how to build and distribute the Voice Dictation app as a desktop widget using Tauri 2.0.

## ✅ Benefits of Tauri

| Metric | Tauri | Electron |
|--------|-------|----------|
| Bundle Size | ~5-10MB | ~150MB |
| Memory Usage | ~30MB | ~100MB+ |
| Startup Time | <1s | 2-3s |
| Security | Sandboxed WebView | Node.js process |
| Native Feel | Excellent | Good |

## Prerequisites

### 1. Install Rust

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Windows:**
Download and run [rustup-init.exe](https://win.rustup.rs/)

### 2. Install System Dependencies

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libxdo-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

**Windows:**
Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload.

## Quick Start

### Step 1: Clone/Export the Project

Export from Lovable to GitHub and clone locally:

```bash
git clone https://github.com/your-username/voice-dictation-widget.git
cd voice-dictation-widget
```

### Step 2: Install Dependencies

```bash
# Install npm dependencies
npm install

# Install Tauri CLI and plugins
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-clipboard-manager @tauri-apps/plugin-shell
```

### Step 3: Add Scripts to package.json

Add these to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### Step 4: Create App Icons

Create icons in `src-tauri/icons/`:

| File | Size | Platform |
|------|------|----------|
| `32x32.png` | 32x32 | All |
| `128x128.png` | 128x128 | All |
| `128x128@2x.png` | 256x256 | macOS Retina |
| `icon.icns` | 1024x1024 | macOS |
| `icon.ico` | Multi-size | Windows |
| `icon.png` | 512x512 | Linux/Tray |

Generate all sizes from a 1024x1024 source:
```bash
npx tauri icon path/to/source-icon.png
```

### Step 5: Run the App

```bash
# Development mode (with hot reload)
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Run in development with hot reload |
| `npm run tauri:build` | Create platform-specific installer |

## Build Outputs

After running `npm run tauri:build`, find installers in `src-tauri/target/release/bundle/`:

| Platform | Output Location |
|----------|-----------------|
| Windows | `src-tauri/target/release/bundle/nsis/Voice Dictation Widget_1.0.0_x64-setup.exe` |
| macOS | `src-tauri/target/release/bundle/dmg/Voice Dictation Widget_1.0.0_aarch64.dmg` |
| Linux (deb) | `src-tauri/target/release/bundle/deb/voice-dictation-widget_1.0.0_amd64.deb` |
| Linux (AppImage) | `src-tauri/target/release/bundle/appimage/voice-dictation-widget_1.0.0_amd64.AppImage` |

## Global Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Toggle dictation on/off |
| `Ctrl+Shift+H` / `Cmd+Shift+H` | Show/hide widget |

## Code Signing (Production)

### macOS

Set environment variables before building:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows

For signing Windows builds, configure in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

## Troubleshooting

### Rust installation issues
```bash
# Verify Rust is installed
rustc --version

# Update Rust
rustup update
```

### macOS Accessibility Permissions
The app needs accessibility permissions for keyboard simulation.
Go to System Settings → Privacy & Security → Accessibility and add the app.

### Widget doesn't type into other apps
1. Check that the `enigo` crate compiled successfully
2. On macOS, verify accessibility permissions are granted
3. On Linux, ensure `libxdo` is installed

### Build fails with WebKit errors (Linux)
```bash
# Install WebKit dependencies
sudo apt install libwebkit2gtk-4.1-dev
```

## File Structure

```
your-project/
├── src-tauri/
│   ├── Cargo.toml          # Rust dependencies
│   ├── build.rs            # Tauri build script
│   ├── tauri.conf.json     # App configuration
│   ├── capabilities/       # Permission capabilities
│   │   └── default.json
│   ├── icons/              # App icons
│   │   └── README.md
│   └── src/
│       ├── main.rs         # Rust entry point
│       ├── keyboard.rs     # Keyboard simulation (enigo)
│       ├── commands.rs     # Tauri commands
│       └── tray.rs         # System tray
├── src/
│   ├── components/
│   │   └── WidgetView.tsx  # Widget UI (Tauri API)
│   └── ...
├── docs/
│   └── TAURI_SETUP.md      # This file
├── vite.config.ts          # Vite configuration
└── package.json
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │              React Frontend (WebView)            │   │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Widget  │  │   Whisper    │  │    VOSK    │  │   │
│  │  │   UI    │  │    (WASM)    │  │   (WASM)   │  │   │
│  │  └────┬────┘  └──────────────┘  └────────────┘  │   │
│  │       │                                          │   │
│  │       │ @tauri-apps/api                          │   │
│  └───────┼──────────────────────────────────────────┘   │
│          │ invoke() / listen()                          │
├──────────┼──────────────────────────────────────────────┤
│  ┌───────▼──────────────────────────────────────────┐   │
│  │              Rust Backend (Native)                │   │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────┐   │   │
│  │  │ Commands│  │    enigo     │  │   Tray     │   │   │
│  │  │         │  │  (keyboard)  │  │   Menu     │   │   │
│  │  └─────────┘  └──────────────┘  └────────────┘   │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │         Global Shortcut Plugin              │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```
