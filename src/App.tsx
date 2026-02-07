import React, { useEffect, useMemo, useState } from 'react';
import type { Mode, LocalResult, GitHubResult } from './ui/types';
import KpiCards from './ui/components/KpiCards';
import Charts from './ui/components/Charts';
import ProjectsView from './ui/views/ProjectsView';
import { Layout, ThemeProvider, type View } from './ui/Layout';
import { cn } from './lib/utils';
import { Loader2, FolderOpen, Github, Calendar as CalendarIcon, Download, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <ThemeProvider>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        <AppContent view={currentView} onViewChange={setCurrentView} />
      </Layout>
    </ThemeProvider>
  );
}

function AppContent({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
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

  useEffect(() => {
    if (repoPath) {
      // Auto-analyze when repoPath changes from project selection?
      // For now, let user click Analyze, or we can trigger it.
    }
  }, [repoPath]);

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
      onViewChange('dashboard'); // Switch to dashboard on success
    } catch (e: any) {
      console.error('Local analysis error:', e);
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  // Auto-trigger analysis if repoPath set via project select
  async function handleProjectSelect(path: string) {
    setRepoPath(path);
    setMode('local');
    // Optional: trigger analysis immediately
    // await analyzeLocal(); // State updates in React are async, better to just set path and let user click, or use effect.
    // Let's just switch view to dashboard. The user will see the path in the input.
    onViewChange('dashboard');
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
      onViewChange('dashboard');
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

  // --- Views ---

  if (view === 'projects') {
    return <ProjectsView onSelectProject={handleProjectSelect} />;
  }

  if (view === 'settings') {
    return (
      <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Application Management</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium">Developer Behavior Analytics Tool</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Troubleshooting</h4>
              <p className="text-sm text-muted-foreground mb-3">
                If you encounter issues with cached data or themes, reloading the application can often resolve them.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" /> Reload Application
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'reports') {
    return (
      <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg">Export Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a comprehensive Markdown report of your current analysis session.
            This report includes summary metrics, detailed insights, and is formatted for easy sharing.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button disabled={busy || !activeResult} onClick={exportReport} className="w-full sm:w-auto">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export Markdown Report
            </Button>
            {!activeResult && (
              <div className="flex items-center text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full">
                <AlertCircle className="mr-1.5 h-3 w-3" />
                Run an analysis first to enable export.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Dashboard & Analytics (Unified for now)
  return (
    <div className="space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
            <button
              onClick={() => setMode('local')}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === 'local' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Local
            </button>
            <button
              onClick={() => setMode('github')}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                mode === 'github' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive dark:border-destructive flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {mode === 'local' ? (
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Repository Path</label>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <FolderOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      value={repoPath}
                      onChange={e => setRepoPath(e.target.value)}
                      placeholder="Pick a repo folder (must contain .git)"
                      className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
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
              <div className="w-full md:w-36">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Since</label>
                <div className="relative mt-2">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="w-full md:w-36">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Until</label>
                <div className="relative mt-2">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <Button disabled={busy || !repoPath.trim()} onClick={analyzeLocal} className="w-full md:w-auto min-w-[100px]">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Analyze'}
              </Button>
            </div>
          </Card>

          {busy && !localRes && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-muted/30">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Analyzing repository...</p>
              </div>
            </div>
          )}

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
                    <Button disabled={busy} onClick={startGitHubLogin} variant="outline" className="flex-1">
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
                    </Button>
                    {deviceFlow && (
                      <Button disabled={polling} onClick={pollGitHubLogin} className="flex-1">
                        {polling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Authorized'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button disabled={busy} onClick={analyzeGitHub} className="flex-1">
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Analyze'}
                    </Button>
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

          {busy && !ghRes && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-muted/30">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Analyzing GitHub account...</p>
              </div>
            </div>
          )}

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
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
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
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-[50%]">File</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Commits</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">+Ins</th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">-Del</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {files.map((f: any) => (
              <tr key={f.path} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium truncate max-w-[200px]" title={f.path}>{f.path}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right font-mono">{f.commits}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right text-green-500 font-mono">+{f.ins}</td>
                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right text-red-500 font-mono">-{f.del}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 text-xs text-muted-foreground bg-muted/20">Local mode only.</div>
    </Card>
  );
}

function shortPath(p: string) {
  const parts = p.split(/[/\\]+/).filter(Boolean);
  if (parts.length <= 2) return p;
  return `${parts[0]}/.../${parts[parts.length - 1]}`;
}