import { request } from '@octokit/request';
import { Commit, computeAnalytics } from './metrics.js';

export type DeviceFlowStart = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export type DeviceFlowToken = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
};

/**
 * ✅ IMPORTANT:
 * Device Flow endpoints are on https://github.com (NOT https://api.github.com)
 * - POST https://github.com/login/device/code
 * - POST https://github.com/login/oauth/access_token
 */
export async function githubStartDeviceFlow(clientId: string): Promise<DeviceFlowStart> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope: 'read:user repo'
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub device flow start failed (${res.status}). ${text}`);
  }

  return (await res.json()) as DeviceFlowStart;
}

export async function githubPollDeviceFlow(clientId: string, deviceCode: string): Promise<DeviceFlowToken> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub device flow poll failed (${res.status}). ${text}`);
  }

  return (await res.json()) as DeviceFlowToken;
}

/* -------------------- GitHub API calls (api.github.com) -------------------- */

type Repo = { name: string; owner: { login: string }; full_name: string; fork: boolean };

async function ghGetAllRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;

  while (true) {
    const res = await request('GET /user/repos', {
      headers: { authorization: `token ${token}` },
      per_page: 100,
      page,
      sort: 'updated'
    });

    const batch = res.data as any[];
    repos.push(...(batch as Repo[]));
    if (batch.length < 100) break;

    page++;
    if (page > 30) break; // safety cap
  }

  return repos;
}

async function ghGetLanguages(token: string, owner: string, repo: string): Promise<Record<string, number>> {
  const res = await request('GET /repos/{owner}/{repo}/languages', {
    headers: { authorization: `token ${token}` },
    owner,
    repo
  });
  return res.data as any;
}

async function ghGetCommitsForRepo(token: string, owner: string, repo: string, maxPages = 3): Promise<any[]> {
  const commits: any[] = [];
  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await request('GET /repos/{owner}/{repo}/commits', {
        headers: { authorization: `token ${token}` },
        owner,
        repo,
        per_page: 100,
        page
      });

      const batch = res.data as any[];
      commits.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (err: any) {
    // 409 Conflict means the repository is empty (hosted but no commits yet)
    if (err.status === 409) {
      return [];
    }
    throw err;
  }
  return commits;
}

function normalizeGitHubCommit(c: any): Commit | null {
  const sha = c?.sha;
  const commit = c?.commit;
  if (!sha || !commit?.author?.date) return null;

  const timestamp = new Date(commit.author.date).getTime();
  const author = commit.author.name ?? c?.author?.login ?? 'Unknown';
  const email = commit.author.email ?? '';

  return {
    hash: sha,
    author,
    email,
    timestamp,
    message: commit.message?.split('\n')[0] ?? '',
    insertions: 0,
    deletions: 0,
    files: []
  };
}

export async function githubAnalyzeAccount(token: string, username: string): Promise<any> {
  const repos = await ghGetAllRepos(token);

  const sorted = repos
    .slice()
    .sort((a, b) => Number(a.fork) - Number(b.fork))
    .slice(0, 60); // cap

  const allCommits: Commit[] = [];
  const repoCommitCounts: Array<{ repo: string; commits: number }> = [];
  const languageTotals = new Map<string, number>();

  for (const r of sorted) {
    const owner = r.owner.login;
    const repo = r.name;

    try {
      const ghCommits = await ghGetCommitsForRepo(token, owner, repo, 3);
      const normalized = ghCommits.map(normalizeGitHubCommit).filter(Boolean) as Commit[];
      allCommits.push(...normalized);
      repoCommitCounts.push({ repo: r.full_name, commits: normalized.length });
    } catch (err) {
      console.warn(`Failed to analyze repo ${r.full_name}:`, err);
    }

    try {
      const langs = await ghGetLanguages(token, owner, repo);
      for (const [lang, bytes] of Object.entries(langs)) {
        languageTotals.set(lang, (languageTotals.get(lang) ?? 0) + (bytes ?? 0));
      }
    } catch { }
  }

  const analytics = computeAnalytics(allCommits);

  const topRepos = repoCommitCounts.sort((a, b) => b.commits - a.commits).slice(0, 10);

  const techProfile = [...languageTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, bytes]) => ({ language, bytes }));

  const engagementScore = Math.min(
    100,
    Math.round((analytics.totals.activeDays * 0.8 + topRepos.length * 5 + analytics.totals.commits / 100) * 10) / 10
  );

  return {
    ok: true,
    mode: 'github',
    username,
    scannedRepos: sorted.length,
    totalReposFound: repos.length,
    commitsCollected: allCommits.length,
    analytics,
    topRepos,
    techProfile,
    engagementScore
  };
}
