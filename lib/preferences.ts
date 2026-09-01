/**
 * Preferences manager with dual-layer storage:
 * 1. Persistent backend file (%APPDATA%/data/user_preferences.json)
 * 2. Instant local storage cache
 */

export interface TTSUserPreferences {
  voiceId: string;
  voiceStyle: string;
  selectedModel: string;
  pitch: number;
  speed: number;
  autoPlay: boolean;
  downloadFormat: 'mp3' | 'wav';
  lastTextDraft: string;
}

const STORAGE_KEY = 'ai_tts_generator_user_preferences_v2';

export const DEFAULT_PREFERENCES: TTSUserPreferences = {
  voiceId: 'Kore',
  voiceStyle: 'warm, articulate, confident',
  selectedModel: 'gemini-3.1-flash-tts-preview',
  pitch: 1.0,
  speed: 1.0,
  autoPlay: true,
  downloadFormat: 'mp3',
  lastTextDraft: 'Welcome to AI TTS Generator. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your local library.',
};

/**
 * Synchronous read from localStorage for instant initial render.
 */
export function loadUserPreferences(): TTSUserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch (e) {
    console.warn('Failed to load user preferences from localStorage:', e);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Asynchronous fetch from persistent server JSON file.
 */
export async function fetchUserPreferences(): Promise<TTSUserPreferences> {
  try {
    const res = await fetch('/api/tts/preferences');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.preferences) {
        const merged = { ...DEFAULT_PREFERENCES, ...data.preferences };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (_) {}
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not fetch preferences from server API, falling back to local storage:', err);
  }
  return loadUserPreferences();
}

let saveTimeout: any = null;

/**
 * Saves preferences to localStorage immediately and syncs with server file storage (debounced).
 */
export function saveUserPreferences(prefs: Partial<TTSUserPreferences>): void {
  if (typeof window === 'undefined') return;

  const current = loadUserPreferences();
  const updated = { ...current, ...prefs };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save user preferences to localStorage:', e);
  }

  // Debounced server sync
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await fetch('/api/tts/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Failed to sync preferences to server:', err);
    }
  }, 300);
}
