import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'dbat.sqlite');
const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS recent_repos (
    repo_path TEXT PRIMARY KEY,
    last_opened_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

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

export function setLastMode(mode: 'local' | 'github') {
  db.prepare(`
    INSERT INTO app_state(key, value) VALUES('last_mode', ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(mode);
}

export function getLastMode(): 'local' | 'github' {
  const row = db.prepare(`SELECT value FROM app_state WHERE key='last_mode'`).get() as any;
  return (row?.value === 'github' ? 'github' : 'local') as 'local' | 'github';
}
