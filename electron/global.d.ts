import type { DBATApi } from './preload';

declare global {
  interface Window {
    dbat: DBATApi;
  }
}

export {};