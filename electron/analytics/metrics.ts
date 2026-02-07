export type Commit = {
  hash: string;
  author: string;
  email?: string;
  timestamp: number;
  message: string;
  insertions: number;
  deletions: number;
  files: Array<{ path: string; ins: number; del: number }>;
};

export type Analytics = {
  totals: {
    commits: number;
    insertions: number;
    deletions: number;
    changedFiles: number;
    activeDays: number;
  };
  commitsByDay: Array<{ day: string; commits: number }>;
  commitsByWeekday: Array<{ weekday: number; commits: number }>;
  commitsByHour: Array<{ hour: number; commits: number }>;
  heatmap: Array<{ weekday: number; hour: number; commits: number }>;
  streak: { longest: number; current: number };
  weekendRatio: { weekday: number; weekend: number; weekendPct: number };
  focusSessions: {
    total: number;
    avgMinutes: number;
    sessionsByDay: Array<{ day: string; sessions: number }>;
  };
  topFiles: Array<{ path: string; commits: number; ins: number; del: number }>;
  mostProductive: { weekday: number; hour: number };
  languages: Array<{ language: string; count: number }>;
  churnByDay: Array<{ day: string; churn: number }>;
  impactScore: number;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minutes(ms: number): number {
  return Math.round(ms / 60000);
}

export function computeAnalytics(commits: Commit[]): Analytics {
  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);

  const byDay = new Map<string, number>();
  const byWeekday = new Map<number, number>();
  const byHour = new Map<number, number>();
  const heat = new Map<string, number>();

  const fileStats = new Map<string, { commits: number; ins: number; del: number }>();

  let totalIns = 0;
  let totalDel = 0;
  let changedFiles = 0;

  for (const c of sorted) {
    const d = new Date(c.timestamp);
    const day = ymd(d);
    const wd = d.getDay();
    const hr = d.getHours();

    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byWeekday.set(wd, (byWeekday.get(wd) ?? 0) + 1);
    byHour.set(hr, (byHour.get(hr) ?? 0) + 1);

    heat.set(`${wd}:${hr}`, (heat.get(`${wd}:${hr}`) ?? 0) + 1);

    totalIns += c.insertions;
    totalDel += c.deletions;

    const uniquePaths = new Set<string>();
    for (const f of c.files) {
      uniquePaths.add(f.path);
      const s = fileStats.get(f.path) ?? { commits: 0, ins: 0, del: 0 };
      s.commits += 1;
      s.ins += f.ins;
      s.del += f.del;
      fileStats.set(f.path, s);
    }
    changedFiles += uniquePaths.size;
  }

  const commitsByDay = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, commits]) => ({ day, commits }));

  const commitsByWeekday = Array.from({ length: 7 }).map((_, weekday) => ({
    weekday,
    commits: byWeekday.get(weekday) ?? 0
  }));

  const commitsByHour = Array.from({ length: 24 }).map((_, hour) => ({
    hour,
    commits: byHour.get(hour) ?? 0
  }));

  const heatmap: Array<{ weekday: number; hour: number; commits: number }> = [];
  for (let wd = 0; wd < 7; wd++) {
    for (let hr = 0; hr < 24; hr++) {
      heatmap.push({ weekday: wd, hour: hr, commits: heat.get(`${wd}:${hr}`) ?? 0 });
    }
  }

  // streak (based on active days list)
  const activeDays = commitsByDay.map(x => x.day);
  const daySet = new Set(activeDays);

  function addDays(date: Date, n: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  let longest = 0;
  let current = 0;

  if (activeDays.length > 0) {
    let run = 1;
    for (let i = 1; i < activeDays.length; i++) {
      const prev = new Date(activeDays[i - 1]);
      const expected = ymd(addDays(prev, 1));
      if (activeDays[i] === expected) run++;
      else run = 1;
      longest = Math.max(longest, run);
    }
    longest = Math.max(longest, 1);

    const last = new Date(activeDays[activeDays.length - 1]);
    current = 1;
    let curDate = last;
    while (true) {
      const prev = addDays(curDate, -1);
      const p = ymd(prev);
      if (!daySet.has(p)) break;
      current++;
      curDate = prev;
    }
  }

  const weekend = (byWeekday.get(0) ?? 0) + (byWeekday.get(6) ?? 0);
  const weekday = sorted.length - weekend;
  const weekendPct = sorted.length === 0 ? 0 : Math.round((weekend / sorted.length) * 1000) / 10;

  // focus sessions (45-min gap)
  const GAP_MS = 45 * 60 * 1000;
  type Session = { start: number; end: number };
  const sessions: Session[] = [];

  if (sorted.length > 0) {
    let s: Session = { start: sorted[0].timestamp, end: sorted[0].timestamp };
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].timestamp;
      const cur = sorted[i].timestamp;
      if (cur - prev <= GAP_MS) s.end = cur;
      else {
        sessions.push(s);
        s = { start: cur, end: cur };
      }
    }
    sessions.push(s);
  }

  const avgMinutes =
    sessions.length === 0
      ? 0
      : Math.round(
        (sessions.reduce((acc, x) => acc + minutes(x.end - x.start), 0) / sessions.length) * 10
      ) / 10;

  const sessionsByDayMap = new Map<string, number>();
  for (const s of sessions) {
    const day = ymd(new Date(s.start));
    sessionsByDayMap.set(day, (sessionsByDayMap.get(day) ?? 0) + 1);
  }

  const sessionsByDay = [...sessionsByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, sessions]) => ({ day, sessions }));

  const topFiles = [...fileStats.entries()]
    .map(([path, s]) => ({ path, ...s }))
    .sort((a, b) => b.commits - a.commits || (b.ins + b.del) - (a.ins + a.del))
    .slice(0, 10);

  // Language Detection (Simple extension based)
  const EXT_NAMES: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    json: 'JSON', css: 'CSS', html: 'HTML', md: 'Markdown', yml: 'YAML', yaml: 'YAML',
    py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', c: 'C', cpp: 'C++', h: 'C/C++',
    cs: 'C#', php: 'PHP', rb: 'Ruby', sh: 'Shell', bat: 'Batch', ps1: 'PowerShell'
  };

  const extMap = new Map<string, number>();
  for (const [path] of fileStats) {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext && ext.length < 10 && /^[a-z0-9]+$/.test(ext)) {
      const name = EXT_NAMES[ext] || ext.toUpperCase();
      extMap.set(name, (extMap.get(name) ?? 0) + 1);
    }
  }
  const languages = [...extMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([language, count]) => ({ language, count }));

  // Churn (Insertions + Deletions) by Day
  const churnMap = new Map<string, number>();
  for (const c of sorted) {
    const day = ymd(new Date(c.timestamp));
    churnMap.set(day, (churnMap.get(day) ?? 0) + (c.insertions + c.deletions));
  }
  const churnByDay = [...churnMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, churn]) => ({ day, churn }));

  // Impact Score (Heuristic: commits * 10 + changedFiles * 5 + activeDays * 20)
  // Normalized to 0-100 scale based on some arbitrary "high performer" baseline?
  // Let's just output raw score for now or simple clamp.
  const rawImpact = (sorted.length * 5) + (changedFiles * 2) + (byDay.size * 10);
  const impactScore = Math.min(100, Math.round(Math.log10(rawImpact + 1) * 25));

  let bestWd = 0;
  let bestHr = 0;
  let bestVal = -1;
  for (const cell of heatmap) {
    if (cell.commits > bestVal) {
      bestVal = cell.commits;
      bestWd = cell.weekday;
      bestHr = cell.hour;
    }
  }

  return {
    totals: {
      commits: sorted.length,
      insertions: totalIns,
      deletions: totalDel,
      changedFiles,
      activeDays: byDay.size
    },
    commitsByDay,
    commitsByWeekday,
    commitsByHour,
    heatmap,
    streak: { longest, current },
    weekendRatio: { weekday, weekend, weekendPct },
    focusSessions: { total: sessions.length, avgMinutes, sessionsByDay },
    topFiles,
    mostProductive: { weekday: bestWd, hour: bestHr },
    languages,
    churnByDay,
    impactScore
  };
}
