'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, X, Key, CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * ElectronSettings — A floating settings button + modal that only renders
 * when the app is running inside the Electron shell (window.electronAPI exists).
 *
 * Allows the user to set / update their Gemini API key. Saving restarts the
 * Next.js server process with the new key, then reloads the page.
 */
export function ElectronSettings() {
  const [isElectron, setIsElectron] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Detect Electron environment on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsElectron(true);
      window.electronAPI.hasApiKey().then(setHasKey);
      window.electronAPI.getMaskedApiKey().then(setMaskedKey);
      window.electronAPI.getVersion().then(setVersion);
    }
  }, []);

  const refreshKeyState = useCallback(async () => {
    if (!window.electronAPI) return;
    const [has, masked] = await Promise.all([
      window.electronAPI.hasApiKey(),
      window.electronAPI.getMaskedApiKey(),
    ]);
    setHasKey(has);
    setMaskedKey(masked);
  }, []);

  const handleOpen = async () => {
    await refreshKeyState();
    setApiKeyInput('');
    setStatus('idle');
    setErrorMsg('');
    setIsOpen(true);
  };

  const handleSave = async () => {
    const key = apiKeyInput.trim();
    if (!key || !window.electronAPI) return;

    setStatus('saving');
    setErrorMsg('');

    try {
      const result = await window.electronAPI.setApiKey(key);
      if (result.success) {
        setHasKey(true);
        setMaskedKey(`${key.slice(0, 8)}...${key.slice(-4)}`);
        setApiKeyInput('');
        setStatus('success');
        // Reload the page so the new key takes effect immediately
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1200);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Failed to save API key. Please try again.');
    }
  };

  const handleOpenExternal = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  // Don't render anything in the browser / non-Electron context
  if (!isElectron) return null;

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        id="electron-settings-btn"
        onClick={handleOpen}
        aria-label="Open app settings"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full
                   bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-md shadow-xl
                   text-zinc-400 hover:text-white hover:border-teal-500/60
                   transition-all duration-200 text-xs font-medium group"
      >
        <span className="relative flex h-2 w-2">
          {hasKey ? (
            <span className="w-2 h-2 rounded-full bg-teal-400" />
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative w-2 h-2 rounded-full bg-amber-500" />
            </>
          )}
        </span>
        <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
        <span>Settings</span>
      </button>

      {/* ── Settings modal ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 bg-[#111114] border border-zinc-700/50
                          rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4
                            border-b border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20
                                flex items-center justify-center shrink-0">
                  <Settings className="w-4.5 h-4.5 text-teal-400" />
                </div>
                <div>
                  <h2 id="settings-title" className="text-base font-semibold text-white leading-tight">
                    App Settings
                  </h2>
                  {version && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      AI TTS Generator&nbsp;v{version}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-zinc-500 hover:text-white hover:bg-zinc-800
                           transition-colors duration-150"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">

              {/* Current key status */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl
                              bg-zinc-900/60 border border-zinc-800/60">
                {hasKey ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300">API Key Active</p>
                      <p className="text-[11px] text-zinc-500 font-mono truncate">{maskedKey}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-300">No API Key Set</p>
                      <p className="text-[11px] text-zinc-500">Add your key below to enable TTS generation.</p>
                    </div>
                  </>
                )}
              </div>

              {/* API Key input */}
              <div className="space-y-2">
                <label
                  htmlFor="api-key-input"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Key className="w-3.5 h-3.5 text-teal-400" />
                  {hasKey ? 'Replace Gemini API Key' : 'Gemini API Key'}
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder={hasKey ? 'Paste new key to replace…' : 'AIza…'}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700
                             rounded-xl text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:ring-1 focus:ring-teal-500/60 focus:border-teal-500/60
                             transition-all duration-150 font-mono"
                />
                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                  Get yours at&nbsp;
                  <button
                    type="button"
                    onClick={() => handleOpenExternal('https://aistudio.google.com/apikey')}
                    className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-0.5 underline"
                  >
                    aistudio.google.com/apikey
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </p>
              </div>

              {/* Error message */}
              {status === 'error' && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{errorMsg}</p>
                </div>
              )}

              {/* Save button */}
              <button
                id="save-api-key-btn"
                onClick={handleSave}
                disabled={!apiKeyInput.trim() || status === 'saving' || status === 'success'}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm
                           transition-all duration-200 flex items-center justify-center gap-2
                           bg-teal-600 hover:bg-teal-500 text-white
                           disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                {status === 'saving' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying & Restarting…
                  </>
                )}
                {status === 'success' && (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved! Reloading…
                  </>
                )}
                {(status === 'idle' || status === 'error') && (
                  <>
                    <Key className="w-4 h-4" />
                    Save & Apply Key
                  </>
                )}
              </button>

              {status === 'saving' && (
                <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Server is restarting with the new key…
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <p className="text-[11px] text-zinc-600 text-center">
                Your API key is stored locally in your system's AppData folder and is never transmitted anywhere except directly to Google's API.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
