const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Voice Dictation Widget',
    executableName: 'voice-dictation',
    asar: true,
    icon: './electron/icons/icon',
    appBundleId: 'com.voicedictation.widget',
    // macOS code signing (set env vars for production builds)
    ...(process.env.APPLE_ID && {
      osxSign: {},
      osxNotarize: {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID
      }
    }),
    // Entitlements for accessibility + microphone
    osxEntitlements: './electron/entitlements.mac.plist',
    osxEntitlementsInherit: './electron/entitlements.mac.plist',
    // Extra resources (icons, etc.)
    extraResource: ['./electron/icons']
  },
  rebuildConfig: {
    // Rebuild robotjs for Electron
    force: true
  },
  makers: [
    // Windows - Squirrel installer
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'VoiceDictationWidget',
        authors: 'Voice Dictation Team',
        description: 'A desktop voice dictation widget with offline speech recognition',
        iconUrl: 'https://raw.githubusercontent.com/user/repo/main/electron/icons/icon.ico',
        setupIcon: './electron/icons/icon.ico'
      }
    },
    // macOS - DMG installer
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: './electron/icons/icon.icns'
      }
    },
    // macOS - ZIP (for auto-update and notarization)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    // Linux - Debian package
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'voice-dictation-widget',
          productName: 'Voice Dictation Widget',
          maintainer: 'Voice Dictation Team',
          homepage: 'https://github.com/user/voice-dictation-widget',
          icon: './electron/icons/icon.png',
          categories: ['Utility', 'AudioVideo']
        }
      }
    },
    // Linux - RPM package
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'voice-dictation-widget',
          productName: 'Voice Dictation Widget',
          icon: './electron/icons/icon.png',
          categories: ['Utility', 'AudioVideo']
        }
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // Build configs for main process and preload
        build: [
          {
            entry: 'electron/main.js',
            config: 'vite.main.config.mjs',
            target: 'main'
          },
          {
            entry: 'electron/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload'
          }
        ],
        // Renderer (React app) config
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs'
          }
        ]
      }
    }
  ],
  // Optional: GitHub Releases publisher
  // Uncomment and configure for auto-publishing
  // publishers: [
  //   {
  //     name: '@electron-forge/publisher-github',
  //     config: {
  //       repository: {
  //         owner: 'your-username',
  //         name: 'voice-dictation-widget'
  //       },
  //       prerelease: false,
  //       draft: true
  //     }
  //   }
  // ]
};
