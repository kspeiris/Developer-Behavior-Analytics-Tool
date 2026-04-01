const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const { existsSync } = require('node:fs');

const appRoot = __dirname;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(devServerUrl);
let mainWindow = null;
let depsPromise = null;

function loadDeps() {
  if (!depsPromise) {
    depsPromise = Promise.all([
      import('./dist-electron/db/index.js'),
      import('./dist-electron/analytics/gitLocal.js'),
      import('./dist-electron/analytics/github.js'),
      import('./dist-electron/security/tokenStore.js'),
      import('./dist-electron/report/mdReport.js')
    ]).then(([db, gitLocal, github, tokenStore, mdReport]) => ({
      db,
      gitLocal,
      github,
      tokenStore,
      mdReport
    }));
  }

  return depsPromise;
}

function createWindow() {
  const preloadPath = path.join(appRoot, 'dist-electron', 'preload.cjs');
  const iconPath = path.join(appRoot, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    backgroundColor: '#09090b',
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(appRoot, 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await loadDeps();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app:getLastMode', async () => {
  const { db } = await loadDeps();
  return db.getLastMode();
});

ipcMain.handle('app:setMode', async (_e, mode) => {
  const { db } = await loadDeps();
  db.setLastMode(mode);
  return true;
});

ipcMain.handle('app:getAppState', async (_e, key) => {
  const { db } = await loadDeps();
  return db.getAppState(key);
});

ipcMain.handle('app:setAppState', async (_e, key, value) => {
  const { db } = await loadDeps();
  db.setAppState(key, value);
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
  const { db } = await loadDeps();
  await db.upsertRecentRepo(repoPath);
  return { ok: true, repoPath };
});

ipcMain.handle('repo:recent', async () => {
  const { db } = await loadDeps();
  return db.getRecentRepos();
});

ipcMain.handle('repo:removeRecent', async (_e, repoPath) => {
  const { db } = await loadDeps();
  db.removeRecentRepo(repoPath);
  return true;
});

ipcMain.handle('project:add', async (_e, name, repoPath) => {
  try {
    const { db } = await loadDeps();
    db.addProject(name, repoPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('project:list', async () => {
  const { db } = await loadDeps();
  return db.getProjects();
});

ipcMain.handle('project:update', async (_e, id, name) => {
  const { db } = await loadDeps();
  db.updateProject(id, name);
  return true;
});

ipcMain.handle('project:delete', async (_e, id) => {
  const { db } = await loadDeps();
  db.deleteProject(id);
  return true;
});

ipcMain.handle('project:touch', async (_e, id) => {
  const { db } = await loadDeps();
  db.touchProject(id);
  return true;
});

ipcMain.handle('repo:analyze', async (_e, repoPath, dateFrom, dateTo) => {
  const { gitLocal } = await loadDeps();
  return gitLocal.analyzeLocalRepo(repoPath, { dateFrom, dateTo });
});

ipcMain.handle('report:exportMd', async (_e, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Markdown Report',
    defaultPath: 'DBAT_Report.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });

  if (canceled || !filePath) return { ok: false, error: 'Cancelled' };

  const { mdReport } = await loadDeps();
  const md = mdReport.buildMarkdownReport(payload);
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, md, 'utf8');

  try {
    await shell.showItemInFolder(filePath);
  } catch {}

  return { ok: true, filePath };
});

ipcMain.handle('gh:hasToken', async () => {
  const { tokenStore } = await loadDeps();
  return Boolean(await tokenStore.tokenStore.getToken());
});

ipcMain.handle('gh:logout', async () => {
  const { tokenStore } = await loadDeps();
  await tokenStore.tokenStore.clearToken();
  return true;
});

ipcMain.handle('gh:startLogin', async (_e, clientId) => {
  const { github } = await loadDeps();
  return github.githubStartDeviceFlow(clientId);
});

ipcMain.handle('gh:openVerificationUrl', async (_e, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('gh:pollLogin', async (_e, clientId, deviceCode) => {
  const { github, tokenStore } = await loadDeps();
  const token = await github.githubPollDeviceFlow(clientId, deviceCode);
  if (token?.access_token) await tokenStore.tokenStore.setToken(token.access_token);
  return token;
});

ipcMain.handle('gh:analyzeAccount', async (_e, username) => {
  const { github, tokenStore } = await loadDeps();
  const token = await tokenStore.tokenStore.getToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  return github.githubAnalyzeAccount(token, username);
});
