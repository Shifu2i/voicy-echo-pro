# App Icons

Place your application icons in this folder:

| File | Platform | Size/Format |
|------|----------|-------------|
| `icon.ico` | Windows | 256x256 (multi-resolution ICO) |
| `icon.icns` | macOS | 1024x1024 (Apple Icon Image) |
| `icon.png` | Linux/Other | 512x512 PNG |

## Creating Icons

### From a single PNG source (recommended)

1. Create a high-resolution PNG (1024x1024 or larger)

2. Use [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker):
   ```bash
   npx electron-icon-maker --input=your-icon.png --output=./electron/icons
   ```

### Online tools

- [iConvert Icons](https://iconverticons.com/online/) - Convert PNG to ICO/ICNS
- [CloudConvert](https://cloudconvert.com/png-to-ico) - PNG to ICO
- [MakeAppIcon](https://makeappicon.com/) - Generate all sizes

### Manual creation

**Windows (ICO):**
Include these sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

**macOS (ICNS):**
Use `iconutil` on macOS:
```bash
mkdir icon.iconset
# Add sized PNGs: icon_16x16.png, icon_32x32.png, etc.
iconutil -c icns icon.iconset
```

**Linux (PNG):**
512x512 PNG is standard for desktop Linux applications.
