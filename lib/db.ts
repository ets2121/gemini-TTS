import fs from 'fs';
import path from 'path';

// When running inside Electron, use the writable user-data path injected by main.js.
// Falls back to process.cwd()/data for normal Next.js dev/production use.
const DB_DIR = process.env.ELECTRON_USER_DATA
  ? path.join(process.env.ELECTRON_USER_DATA, 'data')
  : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DB_DIR, 'tts_history.json');
const PRESETS_FILE = path.join(DB_DIR, 'voice_presets.json');
const PREFERENCES_FILE = path.join(DB_DIR, 'user_preferences.json');
const VOICE_PREVIEWS_FILE = path.join(DB_DIR, 'voice_previews.json');

export interface TTSHistoryItem {
  id: string;
  text: string;
  voice_name: string;
  voice_gender: string;
  voice_style: string;
  model_name?: string;
  pitch: number;
  speed: number;
  audio_base64: string;
  audio_mime_type: string;
  audio_duration: number;
  file_size_bytes: number;
  is_favorite: number;
  created_at: string;
}

export interface VoiceStylePreset {
  id: string;
  name: string;
  prompt_instruction: string;
  icon_name: string;
  category: string;
  created_at: string;
}

export interface UserPreferencesData {
  voiceId: string;
  voiceStyle: string;
  selectedModel: string;
  pitch: number;
  speed: number;
  autoPlay: boolean;
  downloadFormat: 'mp3' | 'wav';
  lastTextDraft: string;
  updatedAt?: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferencesData = {
  voiceId: 'Kore',
  voiceStyle: 'warm, articulate, confident',
  selectedModel: 'gemini-3.1-flash-tts-preview',
  pitch: 1.0,
  speed: 1.0,
  autoPlay: true,
  downloadFormat: 'mp3',
  lastTextDraft: 'Welcome to AI TTS Generator. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your local library.',
};

const DEFAULT_PRESETS: VoiceStylePreset[] = [
  {
    id: 'preset_whisper',
    name: 'Whispering',
    prompt_instruction: 'Speak in a soft, gentle, intimate whisper with relaxed cadence.',
    icon_name: 'Moon',
    category: 'Atmospheric',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_energetic',
    name: 'Excited Keynote',
    prompt_instruction: 'Speak with high energy, enthusiasm, crisp articulation, and captivating passion like a tech launch keynote.',
    icon_name: 'Zap',
    category: 'Dynamic',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_trailer',
    name: 'Movie Trailer',
    prompt_instruction: 'Speak in a deep, cinematic, dramatic, epic baritone with deliberate pauses and gravitas.',
    icon_name: 'Film',
    category: 'Cinematic',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_news',
    name: 'News Anchor',
    prompt_instruction: 'Speak in a clear, neutral, authoritative, professional broadcast tone with precise cadence.',
    icon_name: 'Radio',
    category: 'Professional',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_meditation',
    name: 'Calm Meditation',
    prompt_instruction: 'Speak in a slow, soothing, warm, mindful rhythm designed for deep breathing and tranquility.',
    icon_name: 'Heart',
    category: 'Wellness',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_storyteller',
    name: 'Fantasy Narrator',
    prompt_instruction: 'Speak with rich theatrical storytelling warmth, expressive inflection, and mysterious wonder.',
    icon_name: 'BookOpen',
    category: 'Creative',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_cheerful',
    name: 'Cheerful Host',
    prompt_instruction: 'Speak with an uplifting, smiling, bright, welcoming tone that radiates friendliness.',
    icon_name: 'Smile',
    category: 'Casual',
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset_robot',
    name: 'Sci-Fi Synth',
    prompt_instruction: 'Speak with rhythmic, analytical, futuristic AI cadence and crisp neutral inflection.',
    icon_name: 'Bot',
    category: 'Sci-Fi',
    created_at: new Date().toISOString(),
  },
];

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Error creating database directory:', err);
  }
}

function readHistoryData(): TTSHistoryItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read history data file, returning empty array:', err);
  }
  return [];
}

function writeHistoryData(items: TTSHistoryItem[]): void {
  ensureDataDir();
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(items, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error writing history data to disk:', err);
  }
}

export async function insertHistoryItem(item: TTSHistoryItem): Promise<TTSHistoryItem> {
  const items = readHistoryData();
  items.unshift(item); // prepend latest
  writeHistoryData(items);
  return item;
}

export async function getHistory(options: {
  search?: string;
  favoriteOnly?: boolean;
  voiceName?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: TTSHistoryItem[]; total: number }> {
  let items = readHistoryData();

  if (options.favoriteOnly) {
    items = items.filter((item) => item.is_favorite === 1);
  }

  if (options.voiceName && options.voiceName !== 'all') {
    items = items.filter(
      (item) => item.voice_name.toLowerCase() === options.voiceName!.toLowerCase()
    );
  }

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.voice_name.toLowerCase().includes(q) ||
        item.voice_style.toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return {
    items: items.slice(offset, offset + limit),
    total,
  };
}

export async function getAllHistory(options: {
  search?: string;
  favoriteOnly?: boolean;
  voiceName?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<TTSHistoryItem[]> {
  const res = await getHistory(options);
  return res.items;
}

export async function getHistoryById(id: string): Promise<TTSHistoryItem | null> {
  const items = readHistoryData();
  return items.find((i) => i.id === id) || null;
}

export async function toggleHistoryFavorite(id: string): Promise<boolean> {
  const items = readHistoryData();
  const target = items.find((i) => i.id === id);
  if (!target) return false;

  target.is_favorite = target.is_favorite === 1 ? 0 : 1;
  writeHistoryData(items);
  return target.is_favorite === 1;
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const items = readHistoryData();
  const filtered = items.filter((i) => i.id !== id);
  writeHistoryData(filtered);
  return true;
}

export async function clearAllHistory(): Promise<boolean> {
  writeHistoryData([]);
  return true;
}

export async function getHistoryStats(): Promise<{
  totalCount: number;
  favoriteCount: number;
  totalDurationSeconds: number;
  totalBytes: number;
}> {
  const items = readHistoryData();
  const totalCount = items.length;
  let favoriteCount = 0;
  let totalDurationSeconds = 0;
  let totalBytes = 0;

  for (const item of items) {
    if (item.is_favorite === 1) {
      favoriteCount++;
    }
    totalDurationSeconds += Number(item.audio_duration) || 0;
    totalBytes += Number(item.file_size_bytes) || 0;
  }

  return {
    totalCount,
    favoriteCount,
    totalDurationSeconds: Number(totalDurationSeconds.toFixed(2)),
    totalBytes,
  };
}

export async function getPresets(): Promise<VoiceStylePreset[]> {
  ensureDataDir();
  try {
    if (fs.existsSync(PRESETS_FILE)) {
      const content = fs.readFileSync(PRESETS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(DEFAULT_PRESETS, null, 2), 'utf-8');
    return DEFAULT_PRESETS;
  } catch (err) {
    console.error('Error fetching presets:', err);
    return DEFAULT_PRESETS;
  }
}

// ─── User Preferences File Persistence ─────────────────────────────────────────

export async function getStoredPreferences(): Promise<UserPreferencesData> {
  ensureDataDir();
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const content = fs.readFileSync(PREFERENCES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_USER_PREFERENCES,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Error reading preferences file:', err);
  }
  return DEFAULT_USER_PREFERENCES;
}

export async function saveStoredPreferences(
  prefs: Partial<UserPreferencesData>
): Promise<UserPreferencesData> {
  ensureDataDir();
  try {
    const current = await getStoredPreferences();
    const updated: UserPreferencesData = {
      ...current,
      ...prefs,
      updatedAt: new Date().toISOString(),
    };
    const tempFile = `${PREFERENCES_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(updated, null, 2), 'utf-8');
    fs.renameSync(tempFile, PREFERENCES_FILE);
    return updated;
  } catch (err) {
    console.error('Error saving user preferences to file:', err);
    return { ...DEFAULT_USER_PREFERENCES, ...prefs };
  }
}

// ─── Voice Previews Audio File Persistence ──────────────────────────────────────

export interface VoicePreviewRecord {
  audioBase64: string;
  durationSeconds: number;
  sampleText: string;
  updatedAt: string;
}

export async function getStoredVoicePreviews(): Promise<Record<string, VoicePreviewRecord>> {
  ensureDataDir();
  try {
    if (fs.existsSync(VOICE_PREVIEWS_FILE)) {
      const content = fs.readFileSync(VOICE_PREVIEWS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading voice previews file:', err);
  }
  return {};
}

export async function getStoredVoicePreview(
  voiceName: string
): Promise<VoicePreviewRecord | null> {
  const previews = await getStoredVoicePreviews();
  return previews[voiceName] || null;
}

export async function saveStoredVoicePreview(
  voiceName: string,
  preview: { audioBase64: string; durationSeconds: number; sampleText: string }
): Promise<void> {
  ensureDataDir();
  try {
    const previews = await getStoredVoicePreviews();
    previews[voiceName] = {
      ...preview,
      updatedAt: new Date().toISOString(),
    };
    const tempFile = `${VOICE_PREVIEWS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(previews, null, 2), 'utf-8');
    fs.renameSync(tempFile, VOICE_PREVIEWS_FILE);
  } catch (err) {
    console.error(`Error saving voice preview for ${voiceName}:`, err);
  }
}

export async function clearStoredVoicePreviews(): Promise<void> {
  ensureDataDir();
  try {
    if (fs.existsSync(VOICE_PREVIEWS_FILE)) {
      fs.unlinkSync(VOICE_PREVIEWS_FILE);
    }
  } catch (err) {
    console.error('Error clearing voice previews file:', err);
  }
}
