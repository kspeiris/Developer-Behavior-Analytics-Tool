import React, { useEffect, useMemo, useState } from 'react';
import type { Mode, LocalResult, GitHubResult } from './ui/types';
import KpiCards from './ui/components/KpiCards';
import Charts from './ui/components/Charts';
import { Layout, ThemeProvider } from './ui/Layout';
import { cn } from './lib/utils';

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <DashboardContent />
      </Layout>
    </ThemeProvider>
  );
}

function DashboardContent() {
  const [mode, setMode] = useState<Mode>('local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local
  const [repoPath, setRepoPath] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [localRes, setLocalRes] = useState<LocalResult | null>(null);

  // GitHub
  const [ghClientId, setGhClientId] = useState('');
  const [ghUsername, setGhUsername] = useState('');
  const [ghAuthed, setGhAuthed] = useState(false);
  const [ghRes, setGhRes] = useState<GitHubResult | null>(null);

  // Device flow
  const [deviceFlow, setDeviceFlow] = useState<any | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!window.dbat) {
      setError('Application API not initialized. Please restart the app.');
      return;
    }

    (async () => {
      try {
        const m = await window.dbat.getLastMode();
        setMode(m);
        setRecent(await window.dbat.recentRepos());
        setGhAuthed(await window.dbat.ghHasToken());
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app');
      }
    })();
  }, []);

  useEffect(() => {
    if (!window.dbat) return;
    window.dbat.setMode(mode).catch(() => { });
  }, [mode]);

  const activeResult = useMemo(() => (mode === 'github' ? ghRes : localRes), [mode, ghRes, localRes]);

  async function pickRepo() {
    if (!window.dbat) return;
    setError(null);
    const r = await window.dbat.pickRepo();
    if (!r.ok) return;
    setRepoPath(r.repoPath ?? '');
    setRecent(await window.dbat.recentRepos());
  }

  async function analyzeLocal() {
    if (!window.dbat) return;
    setBusy(true);
    setError(null);
    setLocalRes(null);
    try {
      const res = await window.dbat.analyzeRepo(repoPath, dateFrom.trim() || undefined, dateTo.trim() || undefined);
      if (!res.ok) throw new Error(res.error || 'Analysis failed');
      console.log('Local Analysis Result:', res);
      setLocalRes(res);
    } catch (e: any) {
      console.error('Local analysis error:', e);
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startGitHubLogin() {
    if (!window.dbat) return;
    setError(null);
    setDeviceFlow(null);
    if (!ghClientId.trim()) return setError('Enter your GitHub OAuth App Client ID first.');
    setBusy(true);
    try {
      const flow = await window.dbat.ghStartLogin(ghClientId.trim());
      setDeviceFlow(flow);
      await window.dbat.ghOpenVerificationUrl(flow.verification_uri);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function pollGitHubLogin() {
    if (!window.dbat || !deviceFlow) return;
    setError(null);
    setPolling(true);
    try {
      const tokenRes = await window.dbat.ghPollLogin(ghClientId.trim(), deviceFlow.device_code);
      if (tokenRes?.access_token) {
        setGhAuthed(true);
        setDeviceFlow(null);
        return;
      }
      if (tokenRes?.error && tokenRes.error !== 'authorization_pending') {
        throw new Error(tokenRes.error_description || tokenRes.error);
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setPolling(false);
    }
  }

  async function analyzeGitHub() {
    if (!window.dbat) return;
    setBusy(true);
    setError(null);
    setGhRes(null);
    try {
      if (!ghUsername.trim()) throw new Error('Enter your GitHub username.');
      const res = await window.dbat.ghAnalyzeAccount(ghUsername.trim());
      if (!res.ok) throw new Error(res.error || 'GitHub analysis failed');
      console.log('GitHub Analysis Result:', res);
      setGhRes(res);
    } catch (e: any) {
      console.error('GitHub analysis error:', e);
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportReport() {
    if (!window.dbat) return;
    if (!activeResult?.analytics) return setError('Nothing to export yet. Run an analysis first.');
    setError(null);
    const res = await window.dbat.exportMd(activeResult);
    if (!res.ok) setError(res.error || 'Export failed');
  }

  async function logoutGitHub() {
    if (!window.dbat) return;
    await window.dbat.ghLogout();
    setGhAuthed(false);
    setGhRes(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card p-1">
            <button
              onClick={() => setMode('local')}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === 'local' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Local
            </button>
            <button
              onClick={() => setMode('github')}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === 'github' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              GitHub
            </button>
          </div>
          <button
            disabled={busy}
            onClick={exportReport}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Export MD
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive dark:border-destructive">
          {error}
        </div>
      )}

      {mode === 'local' ? (
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Repository</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={repoPath}
                    onChange={e => setRepoPath(e.target.value)}
                    placeholder="Pick a repo folder (must contain .git)"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button onClick={pickRepo} variant="secondary">Browse</Button>
                </div>
                {recent.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recent.map(r => (
                      <button
                        key={r}
                        onClick={() => setRepoPath(r)}
                        className="rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        title={r}
                      >
                        {shortPath(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-full md:w-40">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Since</label>
                <input
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="w-full md:w-40">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Until</label>
                <input
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button disabled={busy || !repoPath.trim()} onClick={analyzeLocal} className="w-full md:w-auto">
                {busy ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </Card>

          {localRes?.analytics && (
            <DashboardView
              title="Local Repository Dashboard"
              analytics={localRes.analytics}
              extraRight={<div className="text-sm text-muted-foreground">Commits: <span className="font-medium text-foreground">{localRes.commitsCount}</span></div>}
            />
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Client ID</label>
                <input
                  value={ghClientId}
                  onChange={e => setGhClientId(e.target.value)}
                  placeholder="GitHub OAuth Client ID"
                  className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Username</label>
                <input
                  value={ghUsername}
                  onChange={e => setGhUsername(e.target.value)}
                  placeholder="GitHub Username"
                  className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex items-end gap-2">
                {!ghAuthed ? (
                  <>
                    <Button disabled={busy} onClick={startGitHubLogin} variant="outline" className="flex-1">Login</Button>
                    {deviceFlow && (
                      <Button disabled={polling} onClick={pollGitHubLogin} className="flex-1">
                        {polling ? 'Checking...' : 'Authorized'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button disabled={busy} onClick={analyzeGitHub} className="flex-1">Analyze</Button>
                    <Button onClick={logoutGitHub} variant="outline">Logout</Button>
                  </>
                )}
              </div>
            </div>
            {deviceFlow && !ghAuthed && (
              <div className="mt-4 rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Open GitHub verification page. Enter code:</p>
                <div className="mt-2 flex items-center gap-4">
                  <code className="rounded bg-background px-2 py-1 text-lg font-bold">{deviceFlow.user_code}</code>
                  <Button onClick={() => window.dbat?.ghOpenVerificationUrl(deviceFlow.verification_uri)} variant="ghost" size="sm">Re-open page</Button>
                </div>
              </div>
            )}
          </Card>

          {ghRes?.analytics && (
            <DashboardView
              title="GitHub Account Dashboard"
              analytics={ghRes.analytics}
              extraRight={
                <div className="text-sm text-muted-foreground">
                  Repos: <span className="font-medium text-foreground">{ghRes.scannedRepos}</span> ·
                  Commits: <span className="font-medium text-foreground"> {ghRes.commitsCollected}</span> ·
                  Score: <span className="font-medium text-foreground"> {ghRes.engagementScore}/100</span>
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm p-6", className)}>
      {children}
    </div>
  );
}

function Button({ onClick, disabled, variant = 'default', size = 'default', children, className }: any) {
  const variants: any = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  const sizes: any = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}

function DashboardView({ title, analytics, extraRight }: { title: string; analytics: any; extraRight?: React.ReactNode; }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {extraRight}
      </div>
      <KpiCards a={analytics} />
      <Charts a={analytics} />
      <TopList analytics={analytics} />
    </div>
  );
}

function TopList({ analytics }: { analytics: any }) {
  const files = analytics?.topFiles ?? [];
  if (!files.length) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 pb-4">
        <h3 className="font-semibold leading-none tracking-tight">Top modified files</h3>
        <p className="text-sm text-muted-foreground">Files with the most activity.</p>
      </div>
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">File</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Commits</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">+Ins</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">-Del</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {files.map((f: any) => (
              <tr key={f.path} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium">{f.path}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">{f.commits}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right text-green-500">+{f.ins}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right text-red-500">-{f.del}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 text-xs text-muted-foreground">Local mode only.</div>
    </Card>
  );
}

function shortPath(p: string) {
  const parts = p.split(/[/\\]+/).filter(Boolean);
  if (parts.length <= 2) return p;
  return `${parts[0]}/.../${parts[parts.length - 1]}`;
}