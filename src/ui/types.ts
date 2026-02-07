export type Mode = 'local' | 'github';

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

export interface Project {
  id: number;
  name: string;
  path: string;
  created_at: number;
  last_opened_at: number;
}

export type LocalResult = {
  ok: boolean;
  mode: 'local';
  repoPath: string;
  range: { dateFrom: string | null; dateTo: string | null };
  commitsCount: number;
  analytics: Analytics;
};

export type GitHubResult = {
  ok: boolean;
  mode: 'github';
  username: string;
  scannedRepos: number;
  totalReposFound: number;
  commitsCollected: number;
  analytics: Analytics;
  topRepos: Array<{ repo: string; commits: number }>;
  techProfile: Array<{ language: string; bytes: number }>;
  engagementScore: number;
};

declare global {
  interface Window {
    dbat: {
      getLastMode: () => Promise<Mode>;
      setMode: (mode: Mode) => Promise<boolean>;

      pickRepo: () => Promise<{ ok: boolean; repoPath?: string; error?: string }>;
      recentRepos: () => Promise<string[]>;
      analyzeRepo: (repoPath: string, dateFrom?: string, dateTo?: string) => Promise<any>;

      // Project CRUD
      addProject: (name: string, repoPath: string) => Promise<{ ok: boolean; error?: string }>;
      getProjects: () => Promise<Project[]>;
      updateProject: (id: number, name: string) => Promise<void>;
      deleteProject: (id: number) => Promise<void>;
      touchProject: (id: number) => Promise<void>;

      exportMd: (payload: any) => Promise<any>;

      ghHasToken: () => Promise<boolean>;
      ghLogout: () => Promise<boolean>;
      ghStartLogin: (clientId: string) => Promise<any>;
      ghOpenVerificationUrl: (url: string) => Promise<boolean>;
      ghPollLogin: (clientId: string, deviceCode: string) => Promise<any>;
      ghAnalyzeAccount: (username: string) => Promise<any>;
    };
  }
}
