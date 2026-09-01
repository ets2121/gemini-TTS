'use strict';

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const http = require('http');

// ─── Optional: electron-updater (requires publish config in electron-builder.yml) ───
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (_) {
  // Not available in dev mode or when not bundled
}

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let serverProcess = null;
let serverPort = null;
const isDev = !app.isPackaged;

// ─── Paths ───────────────────────────────────────────────────────────────────
const userDataPath = app.getPath('userData');
const configFile = path.join(userDataPath, 'config.json');

// Ensure user data directory exists on first run
fs.mkdirSync(userDataPath, { recursive: true });

// ─── Config helpers ──────────────────────────────────────────────────────────
function readConfig() {
  try {
    if (fs.existsSync(configFile)) {
      return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    }
  } catch (e) {
    console.warn('[Config] Failed to read config.json:', e.message);
  }
  return {};
}

function writeConfig(config) {
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Config] Failed to write config.json:', e.message);
  }
}

// ─── Network helpers ─────────────────────────────────────────────────────────
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * Polls http://127.0.0.1:{port}/api/tts/history until it responds (server ready).
 */
function pollUntilReady(port, maxWaitMs = 35000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://127.0.0.1:${port}/api/tts/history`, (res) => {
        res.resume(); // drain
        resolve();
      });
      req.setTimeout(2500, () => req.destroy());
      req.on('error', () => {
        if (Date.now() - start > maxWaitMs) {
          reject(new Error(`Next.js server did not become ready within ${maxWaitMs / 1000}s`));
        } else {
          setTimeout(attempt, 900);
        }
      });
    }
    setTimeout(attempt, 1500); // short initial delay
  });
}

// ─── Next.js server management ───────────────────────────────────────────────
function startNextServer(port) {
  // Kill any existing server first
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
    serverProcess = null;
  }

  const config = readConfig();
  const apiKey = config.geminiApiKey || '';

  // Resolve server.js path: production uses extraResources, dev uses .next/standalone
  const serverScript = app.isPackaged
    ? path.join(process.resourcesPath, 'nextjs-app', 'server.js')
    : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

  const serverCwd = app.isPackaged
    ? path.join(process.resourcesPath, 'nextjs-app')
    : path.join(__dirname, '..', '.next', 'standalone');

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `Next.js server not found:\n${serverScript}\n\n` +
      `Run "npm run build" first to generate the standalone output.`
    );
  }

  const env = Object.assign({}, process.env, {
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    GEMINI_API_KEY: apiKey,
    // Tells lib/db.ts where to store data files in production
    ELECTRON_USER_DATA: userDataPath,
    // CRITICAL: makes Electron binary behave as plain Node.js
    ELECTRON_RUN_AS_NODE: '1',
  });

  serverProcess = spawn(process.execPath, [serverScript], {
    env,
    cwd: serverCwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  serverProcess.stdout.on('data', (d) => process.stdout.write('[Next] ' + d));
  serverProcess.stderr.on('data', (d) => process.stderr.write('[Next] ' + d));
  serverProcess.on('close', (code) => console.log(`[Next] Server exited (code ${code})`));
  serverProcess.on('error', (err) => console.error('[Next] Process error:', err));

  return serverProcess;
}

// ─── BrowserWindow ───────────────────────────────────────────────────────────
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0A0A0C',
    show: false,
    title: 'AI TTS Generator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Open external URLs in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/** Returns a masked version of the saved API key, or empty string */
ipcMain.handle('get-api-key-masked', () => {
  const { geminiApiKey: key = '' } = readConfig();
  if (!key) return '';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
});

/** Returns true if an API key has been saved */
ipcMain.handle('has-api-key', () => {
  const { geminiApiKey = '' } = readConfig();
  return geminiApiKey.trim().length > 0;
});

/** Saves the new API key and restarts the Next.js server */
ipcMain.handle('set-api-key', async (_, apiKey) => {
  try {
    const config = readConfig();
    config.geminiApiKey = apiKey.trim();
    writeConfig(config);

    startNextServer(serverPort);
    await pollUntilReady(serverPort, 25000);

    return { success: true };
  } catch (err) {
    console.error('[IPC] set-api-key failed:', err);
    return { success: false, error: err.message };
  }
});

/** Returns the Electron app version */
ipcMain.handle('get-app-version', () => app.getVersion());

/** Opens a URL safely in the system browser */
ipcMain.handle('open-external', (_, url) => {
  if (typeof url === 'string' && url.startsWith('https://')) {
    shell.openExternal(url);
  }
});

// ─── Auto-updater ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available.`,
      detail: 'Would you like to download and install it?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded.',
      detail: 'The app will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.warn('[Updater] Auto-update check failed:', err.message);
  });

  // Delay update check by 5s so app loads first
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.warn('[Updater]', e.message);
    });
  }, 5000);
}

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    serverPort = await findFreePort();
    console.log(`[App] Starting Next.js server on port ${serverPort}...`);
    startNextServer(serverPort);
    await pollUntilReady(serverPort);
    console.log('[App] Server ready. Opening window...');
    createWindow(serverPort);
    setupAutoUpdater();
  } catch (err) {
    console.error('[App] Fatal startup error:', err);
    dialog.showErrorBox(
      'Startup Error',
      `AI TTS Generator failed to start:\n\n${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
    serverProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
  }
});

app.on('activate', () => {
  if (mainWindow === null && serverPort) createWindow(serverPort);
});
