import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { pcmToWav, generateSyntheticVoiceWave } from '@/lib/audio';

// Pre-defined sample script for crisp voice previews
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
  Leda: 'Kore',
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

// Server-side in-memory preview cache to avoid burning Gemini rate limits on repetitive previews
const SERVER_PREVIEW_CACHE = new Map<string, { audioBase64: string; durationSeconds: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voiceName = 'Kore' } = body;

    const previewText =
      VOICE_PREVIEWS[voiceName] ||
      `Hello! I am ${voiceName}, ready to bring your speech synthesis projects to life.`;

    const cacheKey = `preview_${voiceName}`;
    if (SERVER_PREVIEW_CACHE.has(cacheKey)) {
      const cached = SERVER_PREVIEW_CACHE.get(cacheKey)!;
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

    const mappedVoice = BASE_VOICE_MAP[voiceName] || 'Kore';
    const targetModel = 'gemini-3.1-flash-tts-preview';

    let wavBuffer: Buffer;
    let durationSeconds = 0;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

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

        const base64RawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64RawPcm) {
          const pcmBuffer = Buffer.from(base64RawPcm, 'base64');
          wavBuffer = pcmToWav(pcmBuffer, 24000);
          durationSeconds = Number((pcmBuffer.length / 48000).toFixed(2));
        } else {
          wavBuffer = generateSyntheticVoiceWave(previewText, voiceName, 1.0, 1.0);
          durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
        }
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || '';
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.info(`Voice preview for ${voiceName}: using acoustic synthesizer (rate limited).`);
        } else {
          console.warn(`Voice preview note for ${voiceName}:`, errMsg.slice(0, 100));
        }
        wavBuffer = generateSyntheticVoiceWave(previewText, voiceName, 1.0, 1.0);
        durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
      }
    } else {
      wavBuffer = generateSyntheticVoiceWave(previewText, voiceName, 1.0, 1.0);
      durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
    }

    const audioBase64 = wavBuffer.toString('base64');
    const finalDuration = Math.max(0.5, durationSeconds);

    // Cache the generated preview
    SERVER_PREVIEW_CACHE.set(cacheKey, { audioBase64, durationSeconds: finalDuration });

    return NextResponse.json({
      success: true,
      voiceName,
      audioBase64,
      mimeType: 'audio/wav',
      durationSeconds: finalDuration,
      sampleText: previewText,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate voice preview' },
      { status: 500 }
    );
  }
}

