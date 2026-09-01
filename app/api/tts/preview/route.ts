import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { pcmToWav } from '@/lib/audio';
import {
  getStoredVoicePreviews,
  getStoredVoicePreview,
  saveStoredVoicePreview,
  clearStoredVoicePreviews,
} from '@/lib/db';
import { checkModelRateLimit } from '@/lib/rateLimit';

// Sample preview script for each voice persona
const VOICE_PREVIEWS: Record<string, string> = {
  Kore: "Hello! I'm Kore. My voice is warm, articulate, and confident for presentations and podcasts.",
  Zephyr: "Welcome. I am Zephyr. My tone is velvety and gentle, ideal for meditation and calm narration.",
  Aoede: "Greetings! I'm Aoede, bringing poetic rhythm and expressive storytelling to your characters.",
  Leda: "Good day. I am Leda, offering a refined, poised vocal tone for documentaries and luxury brands.",
  Mimosa: "Hey there! I'm Mimosa. I bring bright, cheerful, and sunny energy to commercials and promos.",
  Thalia: "Hi! I'm Thalia. My delivery is witty, playful, and dynamic for entertaining dialogues.",
  Charon: "In a world of sound, I am Charon. Deep, resonant, and cinematic for dramatic narration.",
  Fenrir: "This is Fenrir. A sharp, commanding, and authoritative voice for lectures and business news.",
  Orpheus: "Step into the story. I am Orpheus, offering a rich baritone for long-form audiobooks.",
  Chiron: "Welcome to this deep dive. I am Chiron, providing wise, professorial clarity for tutorials.",
  Jupiter: "Attention all listeners! I am Jupiter, delivering powerful, broadcast-ready announcer energy.",
  Puck: "Hey what's up! I'm Puck, bringing high energy and modern vibes to tech launches and gaming.",
  Echo: "Systems online. I am Echo, an analytical and modern AI voice with seamless vocal clarity.",
  Callisto: "Initiating transmission. I am Callisto, delivering atmospheric and futuristic precision.",
};

const BASE_VOICE_MAP: Record<string, string> = {
  Kore: 'Kore',
  Zephyr: 'Zephyr',
  Aoede: 'Aoede',
  Leda: 'Leda',
  Mimosa: 'Aoede',
  Thalia: 'Aoede',
  Charon: 'Charon',
  Fenrir: 'Fenrir',
  Orpheus: 'Charon',
  Chiron: 'Fenrir',
  Jupiter: 'Charon',
  Puck: 'Puck',
  Echo: 'Puck',
  Callisto: 'Zephyr',
};

// GET: Returns list of all cached voice preview names
export async function GET() {
  try {
    const previews = await getStoredVoicePreviews();
    const cachedVoiceNames = Object.keys(previews);
    return NextResponse.json({
      success: true,
      cachedVoiceNames,
      count: cachedVoiceNames.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve cached previews.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voiceName = 'Kore', model = 'gemini-3.1-flash-tts-preview', forceRefresh = false, resetAll = false } = body;

    if (resetAll) {
      await clearStoredVoicePreviews();
      return NextResponse.json({
        success: true,
        message: 'All persistent voice preview audio caches cleared.',
      });
    }

    const previewText =
      VOICE_PREVIEWS[voiceName] ||
      `Hello! I am ${voiceName}, ready to bring your speech synthesis projects to life.`;

    // Check persistent file cache first (0ms latency, does not consume RPM)
    if (!forceRefresh) {
      const cached = await getStoredVoicePreview(voiceName);
      if (cached && cached.audioBase64) {
        return NextResponse.json({
          success: true,
          voiceName,
          audioBase64: cached.audioBase64,
          mimeType: 'audio/wav',
          durationSeconds: cached.durationSeconds,
          sampleText: previewText,
          cached: true,
        });
      }
    }

    const targetModel = model || 'gemini-2.5-flash-preview-tts';

    // ── Enforce 2 RPM Limit on Live Preview Generation ────────────────────────
    const rateCheck = checkModelRateLimit(targetModel, true);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate Limit: Max 2 RPM reached. Voice preview generation is on cooldown for ${rateCheck.windowSecondsRemaining}s.`,
          code: 'RPM_COOLDOWN',
          retryAfter: rateCheck.windowSecondsRemaining,
          rpmStatus: rateCheck,
        },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Gemini API Key is missing. Please click Settings to configure your API key.',
          code: 'API_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const mappedVoice = BASE_VOICE_MAP[voiceName] || 'Kore';

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let base64RawPcm: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ parts: [{ text: previewText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: mappedVoice },
            },
          },
        },
      });

      base64RawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (geminiErr: any) {
      console.error(`Gemini voice preview failed for ${voiceName}:`, geminiErr);
      const errMsg = geminiErr?.message || '';

      if (
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.toLowerCase().includes('quota')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Gemini Rate Limit Exceeded. Please wait a moment before previewing voices.',
            code: 'RATE_LIMIT',
            rpmStatus: rateCheck,
          },
          { status: 429 }
        );
      }

      if (
        errMsg.includes('403') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.toLowerCase().includes('api key not valid')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Google Gemini API Key. Please verify your API Key in Settings.',
            code: 'INVALID_API_KEY',
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Preview synthesis error: ${errMsg || 'Failed to generate voice preview.'}`,
          code: 'API_ERROR',
        },
        { status: 500 }
      );
    }

    if (!base64RawPcm) {
      return NextResponse.json(
        {
          success: false,
          error: 'No audio returned by Gemini TTS for voice preview.',
          code: 'NO_AUDIO_RETURNED',
        },
        { status: 502 }
      );
    }

    const pcmBuffer = Buffer.from(base64RawPcm, 'base64');
    const wavBuffer = pcmToWav(pcmBuffer, 24000);
    const durationSeconds = Number((pcmBuffer.length / 48000).toFixed(2));
    const audioBase64 = wavBuffer.toString('base64');
    const finalDuration = Math.max(0.5, durationSeconds);

    // Save to persistent file storage in data/voice_previews.json
    await saveStoredVoicePreview(voiceName, {
      audioBase64,
      durationSeconds: finalDuration,
      sampleText: previewText,
    });

    return NextResponse.json({
      success: true,
      voiceName,
      audioBase64,
      mimeType: 'audio/wav',
      durationSeconds: finalDuration,
      sampleText: previewText,
      cached: false,
      rpmStatus: rateCheck,
    });
  } catch (error: any) {
    console.error('Voice preview fatal error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process voice preview.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
