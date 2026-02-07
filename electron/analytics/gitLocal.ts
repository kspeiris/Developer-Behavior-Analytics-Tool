import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Commit, computeAnalytics } from './metrics.js';

function hasGitDir(repoPath: string): boolean {
  return fs.existsSync(path.join(repoPath, '.git'));
}

function buildGitArgs(dateFrom?: string, dateTo?: string): string[] {
  const args = [
    'log',
    '--all',
    '--no-merges',
    '--date=unix',
    '--pretty=format:--COMMIT--%n%H%n%an%n%ae%n%ad%n%s%n--STATS--',
    '--numstat'
  ];
  if (dateFrom) args.push(`--since=${dateFrom}`);
  if (dateTo) args.push(`--until=${dateTo}`);
  return args;
}

export async function analyzeLocalRepo(
  repoPath: string,
  opts: { dateFrom?: string; dateTo?: string }
): Promise<any> {
  if (!hasGitDir(repoPath)) return { ok: false, error: 'Invalid repository: .git folder not found' };

  const args = buildGitArgs(opts.dateFrom, opts.dateTo);

  const commits: Commit[] = [];
  let current: Commit | null = null;
  let mode: 'idle' | 'commitHeader' | 'stats' = 'idle';

  const child = spawn('git', args, { cwd: repoPath });

  let stderr = '';
  child.stderr.on('data', d => (stderr += d.toString('utf8')));

  const chunks: string[] = [];
  child.stdout.on('data', d => chunks.push(d.toString('utf8')));

  const exitCode: number = await new Promise(resolve => child.on('close', c => resolve(c ?? 1)));
  if (exitCode !== 0) return { ok: false, error: stderr || `git exited with code ${exitCode}` };

  const lines = chunks.join('').split(/\r?\n/);

  let headerLineIndex = 0;
  const header: string[] = [];

  function finalizeCurrent() {
    if (!current) return;
    commits.push(current);
    current = null;
  }

  for (const line of lines) {
    if (line.startsWith('--COMMIT--')) {
      finalizeCurrent();
      current = {
        hash: '',
        author: '',
        email: '',
        timestamp: 0,
        message: '',
        insertions: 0,
        deletions: 0,
        files: []
      };
      mode = 'commitHeader';
      headerLineIndex = 0;
      header.length = 0;
      continue;
    }

    if (!current) continue;

    if (mode === 'commitHeader') {
      if (line.startsWith('--STATS--')) {
        mode = 'stats';
        continue;
      }

      header.push(line);
      headerLineIndex++;

      if (headerLineIndex === 5) {
        current.hash = header[0] ?? '';
        current.author = header[1] ?? '';
        current.email = header[2] ?? '';
        const tsSec = Number(header[3] ?? '0');
        current.timestamp = Number.isFinite(tsSec) ? tsSec * 1000 : 0;
        current.message = header[4] ?? '';
      }
      continue;
    }

    if (mode === 'stats') {
      if (!line) continue;
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const insRaw = parts[0];
        const delRaw = parts[1];
        const file = parts.slice(2).join('\t');

        const ins = insRaw === '-' ? 0 : Number(insRaw);
        const del = delRaw === '-' ? 0 : Number(delRaw);

        if (Number.isFinite(ins) && Number.isFinite(del) && file) {
          current.files.push({ path: file, ins, del });
          current.insertions += ins;
          current.deletions += del;
        }
      }
    }
  }

  finalizeCurrent();
  const analytics = computeAnalytics(commits);

  return {
    ok: true,
    mode: 'local',
    repoPath,
    range: { dateFrom: opts.dateFrom ?? null, dateTo: opts.dateTo ?? null },
    commitsCount: commits.length,
    analytics,
    commitsPreview: commits.slice(0, 5)
  };
}
