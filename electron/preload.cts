import { contextBridge, ipcRenderer } from 'electron';

type Mode = 'local' | 'github';

const api = {
  getLastMode: (): Promise<Mode> => ipcRenderer.invoke('app:getLastMode'),
  setMode: (mode: Mode): Promise<boolean> => ipcRenderer.invoke('app:setMode', mode),
  getAppState: (key: string): Promise<string | null> => ipcRenderer.invoke('app:getAppState', key),
  setAppState: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('app:setAppState', key, value),
  pickRepo: (): Promise<{ ok: boolean; repoPath?: string; error?: string }> =>
    ipcRenderer.invoke('repo:pick'),
  recentRepos: (): Promise<string[]> => ipcRenderer.invoke('repo:recent'),
  removeRecentRepo: (repoPath: string): Promise<boolean> =>
    ipcRenderer.invoke('repo:removeRecent', repoPath),
  analyzeRepo: (repoPath: string, dateFrom?: string, dateTo?: string): Promise<any> =>
    ipcRenderer.invoke('repo:analyze', repoPath, dateFrom, dateTo),
  addProject: (name: string, repoPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('project:add', name, repoPath),
  getProjects: (): Promise<any[]> => ipcRenderer.invoke('project:list'),
  updateProject: (id: number, name: string): Promise<void> =>
    ipcRenderer.invoke('project:update', id, name),
  deleteProject: (id: number): Promise<void> =>
    ipcRenderer.invoke('project:delete', id),
  touchProject: (id: number): Promise<void> =>
    ipcRenderer.invoke('project:touch', id),
  exportMd: (payload: any): Promise<any> => ipcRenderer.invoke('report:exportMd', payload),
  ghHasToken: (): Promise<boolean> => ipcRenderer.invoke('gh:hasToken'),
  ghLogout: (): Promise<boolean> => ipcRenderer.invoke('gh:logout'),
  ghStartLogin: (clientId: string): Promise<any> => ipcRenderer.invoke('gh:startLogin', clientId),
  ghOpenVerificationUrl: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('gh:openVerificationUrl', url),
  ghPollLogin: (clientId: string, deviceCode: string): Promise<any> =>
    ipcRenderer.invoke('gh:pollLogin', clientId, deviceCode),
  ghAnalyzeAccount: (username: string): Promise<any> =>
    ipcRenderer.invoke('gh:analyzeAccount', username)
};

contextBridge.exposeInMainWorld('dbat', api);

export type DBATApi = typeof api;
