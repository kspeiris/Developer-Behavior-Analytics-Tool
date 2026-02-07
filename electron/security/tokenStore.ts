import keytar from 'keytar';

const SERVICE = 'dbat';
const ACCOUNT = 'github_access_token';

export const tokenStore = {
  async getToken(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE, ACCOUNT);
    } catch {
      return null;
    }
  },
  async setToken(token: string): Promise<void> {
    await keytar.setPassword(SERVICE, ACCOUNT, token);
  },
  async clearToken(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE, ACCOUNT);
    } catch {}
  }
};
