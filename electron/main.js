const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Widget window configuration
const WIDGET_CONFIG = {
  width: 320,
  height: 200,
  minWidth: 280,
  minHeight: 150,
  maxWidth: 500,
  maxHeight: 400
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WIDGET_CONFIG.width,
    height: WIDGET_CONFIG.height,
    minWidth: WIDGET_CONFIG.minWidth,
    minHeight: WIDGET_CONFIG.minHeight,
    maxWidth: WIDGET_CONFIG.maxWidth,
    maxHeight: WIDGET_CONFIG.maxHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    vibrancy: 'under-window', // macOS blur effect
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Required for robotjs
    }
  });

  // Position widget in bottom-right corner
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - WIDGET_CONFIG.width - 20, height - WIDGET_CONFIG.height - 20);

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/widget');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/widget'
    });
  }

  // Prevent window from being garbage collected
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide instead of close (unless quitting)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Blur effect for Windows 11
  if (process.platform === 'win32') {
    mainWindow.setBackgroundMaterial('mica');
  }
}

function createTray() {
  // Create a simple tray icon (you can replace with your own icon)
  const iconPath = path.join(__dirname, 'icon.png');
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback: create a simple colored icon
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADxSURBVDiNpZMxDoJAEEV/EhtLe4OthbcQW9fCm3ABbOAWJB7AxBPYEAvhBB7B1kob+C0WSJYZWO2bzWT+vP8zmxDAnJACJaAG3Ac3bgVuQAG0wDNwAC6jNrMGZLvBrTU+AXLAT9wTTxs4Ax/AMfAKPIA34Dzo/xrYAD3wDFzGnfgBz0COPQVuhpGcOXACXII+cALewR74Am6DzuuDWWPOE/COqMEReAoahAPwDVwCJ0HPfgZ24GngHLgE7oEX4Da4dQ24t8ALsALugRPgBrgGToPe8wC8IuqwAi6Ac+A4qMC/wBr4BKyADwBmMBPcAAAAAElFTkSuQmCC') : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Widget',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Toggle Dictation',
      accelerator: 'CommandOrControl+Shift+D',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('toggle-dictation');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Voice Dictation Widget');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function registerGlobalShortcuts() {
  // Toggle dictation
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('toggle-dictation');
    }
  });

  // Show/hide widget
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Stop dictation
  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFocused()) {
      mainWindow.webContents.send('stop-dictation');
    }
  });
}

// IPC Handlers
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('set-always-on-top', (_, value) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(value);
});

ipcMain.handle('get-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : true;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Request accessibility permissions on macOS (for keyboard simulation)
if (process.platform === 'darwin') {
  const { systemPreferences } = require('electron');
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    console.log('Requesting accessibility permissions for keyboard simulation...');
    systemPreferences.isTrustedAccessibilityClient(true);
  }
}
