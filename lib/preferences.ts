/**
 * Local storage auto-save preferences manager for Text-to-Speech Studio
 */

export interface TTSUserPreferences {
  voiceId: string;
  voiceStyle: string;
  pitch: number;
  speed: number;
  autoPlay: boolean;
  downloadFormat: 'mp3' | 'wav';
  lastTextDraft: string;
}

const STORAGE_KEY = 'tts_studio_user_preferences_v1';

export const DEFAULT_PREFERENCES: TTSUserPreferences = {
  voiceId: 'Kore',
  voiceStyle: 'warm, articulate, confident',
  pitch: 1.0,
  speed: 1.0,
  autoPlay: true,
  downloadFormat: 'mp3',
  lastTextDraft: 'Welcome to SpeechCraft Studio. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your SQLite database.',
};

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

export function saveUserPreferences(prefs: Partial<TTSUserPreferences>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadUserPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save user preferences to localStorage:', e);
  }
}
