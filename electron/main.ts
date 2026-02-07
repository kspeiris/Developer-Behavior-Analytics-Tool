import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { upsertRecentRepo, getRecentRepos, setLastMode, getLastMode } from './db/index.js';
import { analyzeLocalRepo } from './analytics/gitLocal.js';
import {
  githubStartDeviceFlow,
  githubPollDeviceFlow,
  githubAnalyzeAccount
} from './analytics/github.js';
import { tokenStore } from './security/tokenStore.js';
import { buildMarkdownReport } from './report/mdReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Determine preload path based on environment
  let preloadPath: string;

  if (isDev) {
    // In development, preload should be in dist-electron
    preloadPath = path.join(process.cwd(), 'dist-electron', 'preload.cjs');
  } else {
    // In production, preload is bundled with main
    preloadPath = path.join(__dirname, 'preload.cjs');
  }

  // Debug logging
  console.log('=== PRELOAD DEBUG ===');
  console.log('isDev:', isDev);
  console.log('process.cwd():', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', existsSync(preloadPath));
  console.log('====================');

  // Fallback: try alternative paths if preload not found
  if (!existsSync(preloadPath)) {
    const alternatives = [
      path.join(__dirname, 'preload.js'),
      path.join(process.cwd(), 'dist-electron', 'preload.js'),
      path.join(process.cwd(), 'preload.js'),
    ];

    for (const alt of alternatives) {
      if (existsSync(alt)) {
        console.log('⚠️ Using alternative preload path:', alt);
        preloadPath = alt;
        break;
      }
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Sometimes needed for proper IPC
    }
  });

  if (isDev) {
    // Load Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Load built React app
    mainWindow.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }

  // Debug: Check if preload loaded successfully
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript('console.log("window.dbat exists:", !!window.dbat)')
      .then(result => console.log('Preload check result:', result))
      .catch(err => console.error('Preload check failed:', err));
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ---------------- IPC API ---------------- */

ipcMain.handle('app:getLastMode', async () => getLastMode());

ipcMain.handle('app:setMode', async (_e, mode: 'local' | 'github') => {
  setLastMode(mode);
  return true;
});

ipcMain.handle('repo:pick', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select a Git Repository'
  });
  if (res.canceled || res.filePaths.length === 0) return { ok: false, error: 'Cancelled' };

  const repoPath = res.filePaths[0];
  await upsertRecentRepo(repoPath);
  return { ok: true, repoPath };
});

ipcMain.handle('repo:recent', async () => getRecentRepos());

ipcMain.handle('repo:analyze', async (_e, repoPath: string, dateFrom?: string, dateTo?: string) => {
  return analyzeLocalRepo(repoPath, { dateFrom, dateTo });
});

ipcMain.handle('report:exportMd', async (_e, payload: any) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Markdown Report',
    defaultPath: 'DBAT_Report.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });

  if (canceled || !filePath) return { ok: false, error: 'Cancelled' };

  const md = buildMarkdownReport(payload);
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, md, 'utf8');

  try {
    await shell.showItemInFolder(filePath);
  } catch { }

  return { ok: true, filePath };
});

/* -------- GitHub OAuth Device Flow -------- */

ipcMain.handle('gh:hasToken', async () => Boolean(await tokenStore.getToken()));

ipcMain.handle('gh:logout', async () => {
  await tokenStore.clearToken();
  return true;
});

ipcMain.handle('gh:startLogin', async (_e, clientId: string) => {
  return githubStartDeviceFlow(clientId);
});

ipcMain.handle('gh:openVerificationUrl', async (_e, url: string) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('gh:pollLogin', async (_e, clientId: string, deviceCode: string) => {
  const token = await githubPollDeviceFlow(clientId, deviceCode);
  if (token?.access_token) await tokenStore.setToken(token.access_token);
  return token;
});

ipcMain.handle('gh:analyzeAccount', async (_e, username: string) => {
  const token = await tokenStore.getToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  return githubAnalyzeAccount(token, username);
});