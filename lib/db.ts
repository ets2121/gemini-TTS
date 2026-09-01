import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DB_DIR, 'tts_history.json');
const PRESETS_FILE = path.join(DB_DIR, 'voice_presets.json');

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

export async function insertHistoryItem(item: TTSHistoryItem): Promise<void> {
  const items = readHistoryData();
  // Filter out any existing with same id
  const filtered = items.filter((existing) => existing.id !== item.id);
  const normalizedItem: TTSHistoryItem = {
    ...item,
    voice_gender: item.voice_gender || 'Neutral',
    voice_style: item.voice_style || '',
    model_name: item.model_name || 'gemini-3.1-flash-tts-preview',
    pitch: typeof item.pitch === 'number' ? item.pitch : 1.0,
    speed: typeof item.speed === 'number' ? item.speed : 1.0,
    audio_mime_type: item.audio_mime_type || 'audio/wav',
    audio_duration: Number(item.audio_duration) || 0,
    file_size_bytes: Number(item.file_size_bytes) || 0,
    is_favorite: item.is_favorite ? 1 : 0,
    created_at: item.created_at || new Date().toISOString(),
  };

  // Add newest item to the top
  filtered.unshift(normalizedItem);
  writeHistoryData(filtered);
}

export async function getAllHistory(options?: {
  search?: string;
  favoriteOnly?: boolean;
  voiceName?: string;
  limit?: number;
}): Promise<TTSHistoryItem[]> {
  let items = readHistoryData();

  if (options?.favoriteOnly) {
    items = items.filter((i) => i.is_favorite === 1);
  }

  if (options?.voiceName && options.voiceName !== 'all') {
    const targetVoice = options.voiceName.toLowerCase();
    items = items.filter((i) => (i.voice_name || '').toLowerCase() === targetVoice);
  }

  if (options?.search && options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        (i.text || '').toLowerCase().includes(query) ||
        (i.voice_style || '').toLowerCase().includes(query) ||
        (i.voice_name || '').toLowerCase().includes(query)
    );
  }

  // Sort descending by created_at
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (options?.limit && options.limit > 0) {
    items = items.slice(0, options.limit);
  }

  return items;
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
