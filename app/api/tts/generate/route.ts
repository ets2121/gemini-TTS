import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { pcmToWav } from '@/lib/audio';
import { insertHistoryItem, TTSHistoryItem } from '@/lib/db';

// Official prebuilt Gemini TTS voice mapping
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voiceName = 'Kore',
      voiceGender = 'Female',
      voiceStyle = '',
      model = 'gemini-3.1-flash-tts-preview',
      pitch = 1.0,
      speed = 1.0,
    } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text prompt is required.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Gemini API Key is missing. Please click Settings (gear icon) to enter your API Key.',
          code: 'API_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format style instruction
    let promptContent = trimmedText;
    if (voiceStyle && voiceStyle.trim()) {
      promptContent = `Say in a ${voiceStyle.trim()} manner: ${trimmedText}`;
    }

    const mappedVoice = BASE_VOICE_MAP[voiceName] || 'Kore';
    const targetModel = model || 'gemini-3.1-flash-tts-preview';

    let base64RawPcm: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ parts: [{ text: promptContent }] }],
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
    } catch (geminiError: any) {
      console.error('Gemini TTS API call failed:', geminiError);
      const errMsg = geminiError?.message || '';

      if (
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.toLowerCase().includes('quota')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Gemini Rate Limit / Quota Exceeded. You have reached the request limit for your API key. Please wait a moment before trying again.',
            code: 'RATE_LIMIT',
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
          error: `Gemini TTS Error: ${errMsg || 'Speech synthesis failed.'}`,
          code: 'API_ERROR',
        },
        { status: 500 }
      );
    }

    if (!base64RawPcm) {
      return NextResponse.json(
        {
          success: false,
          error: 'No audio data was returned by the Gemini TTS engine. Please try a different prompt or voice.',
          code: 'NO_AUDIO_RETURNED',
        },
        { status: 502 }
      );
    }

    const pcmBuffer = Buffer.from(base64RawPcm, 'base64');
    const wavBuffer = pcmToWav(pcmBuffer, 24000);
    const durationSeconds = Number((pcmBuffer.length / 48000).toFixed(2));
    const audioBase64 = wavBuffer.toString('base64');
    const fileSizeBytes = wavBuffer.length;
    const id = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const historyRecord: TTSHistoryItem = {
      id,
      text: trimmedText,
      voice_name: voiceName,
      voice_gender: voiceGender,
      voice_style: voiceStyle || 'Natural',
      model_name: targetModel,
      pitch: Number(pitch) || 1.0,
      speed: Number(speed) || 1.0,
      audio_base64: audioBase64,
      audio_mime_type: 'audio/wav',
      audio_duration: Math.max(0.5, durationSeconds),
      file_size_bytes: fileSizeBytes,
      is_favorite: 0,
      created_at: new Date().toISOString(),
    };

    try {
      await insertHistoryItem(historyRecord);
    } catch (dbErr) {
      console.error('Failed to store generation in history database:', dbErr);
    }

    return NextResponse.json({
      success: true,
      item: historyRecord,
    });
  } catch (error: any) {
    console.error('TTS Generation fatal error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error during speech synthesis.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
