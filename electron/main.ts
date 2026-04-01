import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import electronMain from 'electron/main';
import electronCommon from 'electron/common';
import {
  upsertRecentRepo, getRecentRepos, setLastMode, getLastMode,
  removeRecentRepo,
  addProject, getProjects, updateProject, deleteProject, touchProject,
  getAppState, setAppState
} from './db/index.js';
import { analyzeLocalRepo } from './analytics/gitLocal.js';
import {
  githubStartDeviceFlow,
  githubPollDeviceFlow,
  githubAnalyzeAccount
} from './analytics/github.js';
import { tokenStore } from './security/tokenStore.js';
import { buildMarkdownReport } from './report/mdReport.js';

const { app, BrowserWindow, dialog, ipcMain } = electronMain;
const { shell } = electronCommon;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

function createWindow() {
  let preloadPath = isDev
    ? path.join(process.cwd(), 'dist-electron', 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');

  if (!existsSync(preloadPath)) {
    const alternatives = [
      path.join(__dirname, 'preload.js'),
      path.join(process.cwd(), 'dist-electron', 'preload.js'),
      path.join(process.cwd(), 'preload.js')
    ];

    for (const alt of alternatives) {
      if (existsSync(alt)) {
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
      sandbox: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
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

ipcMain.handle('app:getLastMode', async () => getLastMode());

ipcMain.handle('app:setMode', async (_e, mode: 'local' | 'github') => {
  setLastMode(mode);
  return true;
});

ipcMain.handle('app:getAppState', async (_e, key: string) => getAppState(key));

ipcMain.handle('app:setAppState', async (_e, key: string, value: string) => {
  setAppState(key, value);
  return true;
});

ipcMain.handle('repo:pick', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select a Git Repository'
  });

  if (res.canceled || res.filePaths.length === 0) {
    return { ok: false, error: 'Cancelled' };
  }

  const repoPath = res.filePaths[0];
  await upsertRecentRepo(repoPath);
  return { ok: true, repoPath };
});

ipcMain.handle('repo:recent', async () => getRecentRepos());

ipcMain.handle('repo:removeRecent', async (_e, repoPath: string) => {
  removeRecentRepo(repoPath);
  return true;
});

ipcMain.handle('project:add', async (_e, name: string, repoPath: string) => {
  try {
    addProject(name, repoPath);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('project:list', async () => getProjects());

ipcMain.handle('project:update', async (_e, id: number, name: string) => {
  updateProject(id, name);
  return true;
});

ipcMain.handle('project:delete', async (_e, id: number) => {
  deleteProject(id);
  return true;
});

ipcMain.handle('project:touch', async (_e, id: number) => {
  touchProject(id);
  return true;
});

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
  } catch {}

  return { ok: true, filePath };
});

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
