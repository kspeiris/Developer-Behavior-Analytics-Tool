import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

function getUserDataDir() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) return path.join(appData, 'DBAT');
  }

  if (process.platform === 'darwin') {
    const home = process.env.HOME;
    if (home) return path.join(home, 'Library', 'Application Support', 'DBAT');
  }

  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, 'DBAT');

  const home = process.env.HOME;
  if (home) return path.join(home, '.config', 'DBAT');

  return path.join(process.cwd(), '.dbat');
}

const userDataDir = getUserDataDir();
mkdirSync(userDataDir, { recursive: true });

const dbPath = path.join(userDataDir, 'dbat.sqlite');
const db = new Database(dbPath);

export type Project = {
  id: number;
  name: string;
  path: string;
  created_at: number;
  last_opened_at: number;
};

db.pragma('journal_mode = WAL');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recent_repos (
      repo_path TEXT PRIMARY KEY,
      last_opened_at INTEGER NOT NULL
    );
  `);
} catch (e) {
  console.error('Failed to create recent_repos:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_opened_at INTEGER NOT NULL
    );
  `);
} catch (e) {
  console.error('Failed to create projects:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
} catch (e) {
  console.error('Failed to create app_state:', e);
}

export function upsertRecentRepo(repoPath: string) {
  db.prepare(`
    INSERT INTO recent_repos(repo_path, last_opened_at)
    VALUES(?, ?)
    ON CONFLICT(repo_path) DO UPDATE SET last_opened_at=excluded.last_opened_at
  `).run(repoPath, Date.now());
}

export function getRecentRepos(limit = 8): string[] {
  return db.prepare(`
    SELECT repo_path FROM recent_repos
    ORDER BY last_opened_at DESC
    LIMIT ?
  `).all(limit).map((r: any) => r.repo_path);
}

export function removeRecentRepo(repoPath: string) {
  return db.prepare(`DELETE FROM recent_repos WHERE repo_path = ?`).run(repoPath);
}

export function addProject(name: string, repoPath: string) {
  return db.prepare(`
    INSERT INTO projects (name, path, created_at, last_opened_at)
    VALUES (?, ?, ?, ?)
  `).run(name, repoPath, Date.now(), Date.now());
}

export function getProjects(): Project[] {
  return db.prepare(`SELECT * FROM projects ORDER BY last_opened_at DESC`).all() as Project[];
}

export function updateProject(id: number, name: string) {
  return db.prepare(`UPDATE projects SET name = ? WHERE id = ?`).run(name, id);
}

export function deleteProject(id: number) {
  return db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

export function touchProject(id: number) {
  return db.prepare(`UPDATE projects SET last_opened_at = ? WHERE id = ?`).run(Date.now(), id);
}

export function setAppState(key: string, value: string) {
  db.prepare(`
    INSERT INTO app_state(key, value) VALUES(?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, value);
}

export function getAppState(key: string): string | null {
  const row = db.prepare(`SELECT value FROM app_state WHERE key=?`).get(key) as any;
  return row?.value ?? null;
}

export function setLastMode(mode: 'local' | 'github') {
  setAppState('last_mode', mode);
}

export function getLastMode(): 'local' | 'github' {
  const val = getAppState('last_mode');
  return (val === 'github' ? 'github' : 'local') as 'local' | 'github';
}
