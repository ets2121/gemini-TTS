'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a safe, typed API to the renderer (Next.js pages) via window.electronAPI.
 * Uses contextBridge to maintain contextIsolation security.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** Always true — lets the renderer detect it's running inside Electron */
  isElectron: true,

  /** Returns a masked version of the saved Gemini API key (e.g. "AIzaSyAB...xyz0") */
  getMaskedApiKey: () => ipcRenderer.invoke('get-api-key-masked'),

  /** Returns true if a Gemini API key has been saved to the local config */
  hasApiKey: () => ipcRenderer.invoke('has-api-key'),

  /**
   * Saves a new Gemini API key and restarts the Next.js server with it.
   * @param {string} key - The full API key string
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  setApiKey: (key) => ipcRenderer.invoke('set-api-key', key),

  /** Returns the current Electron app version string */
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  /** Opens a URL in the system default browser */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
