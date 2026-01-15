# Voice Dictation Widget

A powerful voice dictation application with real-time transcription, text-to-speech, spell checking, and grammar checking. Available as both a web app and a native desktop widget.

**URL**: https://lovable.dev/projects/bf56dca1-682d-4988-93fb-b8e77cf22ad7

## Features

- 🎤 **Voice Dictation** - Real-time speech-to-text using Whisper AI
- 🔊 **Read Mode** - Text-to-speech with word/sentence highlighting
- ✍️ **Spell Check** - Inline spelling suggestions
- 📝 **Grammar Check** - Grammar error detection
- ⌨️ **Auto-type** - Type directly into other applications (desktop only)
- 🎯 **Voice Commands** - Control the app with your voice
- 🖥️ **Desktop Widget** - Floating always-on-top widget

---

## Building as a Desktop App

This application can be built as a native desktop widget using Tauri 2.0. The desktop version provides:
- System tray integration
- Global keyboard shortcuts
- Auto-type to any application
- Floating always-on-top widget

### Prerequisites

#### 1. Install Rust

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Windows:**
Download and run [rustup-init.exe](https://win.rustup.rs/)

Verify installation:
```bash
rustc --version
cargo --version
```

#### 2. Install System Dependencies

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Fedora:**
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel libxdo-devel \
  libappindicator-gtk3-devel librsvg2-devel
```

**Windows:**
Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with:
- "Desktop development with C++"
- Windows 10/11 SDK

### Build Steps

#### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install npm dependencies
npm install
```

#### Step 2: Generate App Icons (Optional)

If you have a custom icon (512x512 PNG recommended):
```bash
npm run tauri icon path/to/your/icon.png
```

Or use the existing icon:
```bash
npm run tauri icon src-tauri/icons/icon.png
```

#### Step 3: Development Mode

Run the app in development mode with hot reload:
```bash
npm run tauri dev
```

This will:
1. Start the Vite dev server
2. Build and launch the Tauri application
3. Enable hot reload for frontend changes

#### Step 4: Production Build

Build the app for distribution:
```bash
npm run tauri build
```

### Build Outputs

After a successful build, installers are located at:

| Platform | Location |
|----------|----------|
| **Windows** | `src-tauri/target/release/bundle/nsis/*.exe` |
| **macOS** | `src-tauri/target/release/bundle/dmg/*.dmg` |
| **Linux (deb)** | `src-tauri/target/release/bundle/deb/*.deb` |
| **Linux (AppImage)** | `src-tauri/target/release/bundle/appimage/*.AppImage` |

### Global Hotkeys

The desktop app registers these system-wide shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Shift + D` | Toggle dictation (start/stop recording) |
| `Ctrl/Cmd + Shift + H` | Show/hide the widget |

### Widget Controls (Multi-Action Buttons)

The compact widget uses 4 multi-action buttons for space efficiency:

| Button | Icon | Tap | Hold (0.5s) | Double-Tap |
|--------|------|-----|-------------|------------|
| **Main** | 🎤/🔊 | Start/Stop recording | Open Read Mode | - |
| **Action** | ➤/📋 | Send to app / Copy | Copy to clipboard | Clear text |
| **Mode** | ⌨️ | Toggle auto-type | Open settings | - |
| **Window** | ⬜ | Expand/Collapse | Close widget | Minimize to tray |

**Gesture Controls:**
- **Swipe Up**: Undo last transcription
- **Swipe Down**: Redo
- **Swipe Left/Right** (in Read Mode): Adjust playback speed

### Code Signing (Production)

#### macOS

Set environment variables before building:
```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"

npm run tauri build
```

#### Windows

Configure in `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### Troubleshooting

#### WebGPU Not Available
If Whisper falls back to CPU mode (WASM), ensure:
- Your GPU drivers are up to date
- Your browser/WebView supports WebGPU
- On Linux, you may need to enable WebGPU flags

#### Microphone Permission Denied
- **macOS**: Grant microphone access in System Preferences → Security & Privacy
- **Windows**: Grant access in Settings → Privacy → Microphone
- **Linux**: Ensure PulseAudio/PipeWire permissions are set

#### Build Fails on Linux
Install all required dependencies:
```bash
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev
```

For more detailed troubleshooting, see [docs/TAURI_SETUP.md](docs/TAURI_SETUP.md).

---

## Web Development

### Running the Web App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Technologies

- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
- **Whisper AI** - Speech-to-text (WebGPU/WASM)
- **VOSK** - Real-time preview
- **Tauri 2.0** - Desktop framework

### Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── services/           # Speech recognition services
│   └── utils/              # Utility functions
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/                # Rust source code
│   ├── icons/              # App icons
│   └── tauri.conf.json     # Tauri configuration
└── docs/                   # Documentation
```

---

## Deployment

### Web App

Simply open [Lovable](https://lovable.dev/projects/bf56dca1-682d-4988-93fb-b8e77cf22ad7) and click on Share → Publish.

### Custom Domain

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
