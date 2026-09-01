/**
 * TypeScript declarations for the Electron IPC bridge exposed by electron/preload.js.
 * Available at runtime only when running inside the Electron shell.
 */

interface ElectronAPI {
  /** Always true — use this to detect Electron context in renderer code */
  isElectron: true;
  /** Returns a masked API key like "AIzaSyAB...xyz0" or "" if none saved */
  getMaskedApiKey: () => Promise<string>;
  /** Returns true if a Gemini API key has been saved */
  hasApiKey: () => Promise<boolean>;
  /** Saves a new API key and restarts the Next.js server. */
  setApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  /** Returns the Electron app version string */
  getVersion: () => Promise<string>;
  /** Opens the given https:// URL in the system default browser */
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
