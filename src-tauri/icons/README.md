# App Icons

Place your app icons in this directory:

| File | Size | Platform |
|------|------|----------|
| `32x32.png` | 32x32 | All |
| `128x128.png` | 128x128 | All |
| `128x128@2x.png` | 256x256 | macOS Retina |
| `icon.icns` | 1024x1024 | macOS |
| `icon.ico` | Multi-size | Windows |
| `icon.png` | 512x512 | Linux/Tray |

## Generate Icons

Use `tauri icon` command to generate all sizes from a single 1024x1024 source:

```bash
npx tauri icon path/to/source-icon.png
```

Or use online tools:
- [Tauri Icon Generator](https://tauri.app/v1/guides/features/icons/)
- [iconvert](https://iconverticons.com/online/)
