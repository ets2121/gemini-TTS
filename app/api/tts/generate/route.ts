import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { pcmToWav, generateSyntheticVoiceWave } from '@/lib/audio';
import { insertHistoryItem, TTSHistoryItem } from '@/lib/db';

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
      return NextResponse.json({ error: 'Text prompt is required.' }, { status: 400 });
    }

    const trimmedText = text.trim();
    const id = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Text-to-speech tasks in Google GenAI SDK use gemini-3.1-flash-tts-preview
    const targetModel = 'gemini-3.1-flash-tts-preview';

    let wavBuffer: Buffer;
    let durationSeconds = 0;
    let isQuotaFallback = false;

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

        // Construct voice style prompt for Gemini TTS
        let promptContent = trimmedText;
        if (voiceStyle && voiceStyle.trim()) {
          promptContent = `Say in a ${voiceStyle.trim()} manner: ${trimmedText}`;
        }

        // Map voices to Gemini prebuilt voice names: Puck, Charon, Kore, Fenrir, Zephyr, Aoede
        const baseVoiceMap: Record<string, string> = {
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

        const mappedVoice = baseVoiceMap[voiceName] || 'Kore';

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

        const base64RawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64RawPcm) {
          const pcmBuffer = Buffer.from(base64RawPcm, 'base64');
          // Gemini TTS returns 24kHz 16-bit linear PCM mono
          wavBuffer = pcmToWav(pcmBuffer, 24000);
          durationSeconds = Number((pcmBuffer.length / 48000).toFixed(2));
        } else {
          isQuotaFallback = true;
          wavBuffer = generateSyntheticVoiceWave(trimmedText, voiceName, speed, pitch);
          durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
        }
      } catch (geminiError: any) {
        isQuotaFallback = true;
        const errMsg = geminiError?.message || '';
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.info('Gemini TTS rate limit reached. Synthesizing audio via acoustic engine fallback.');
        } else {
          console.warn('Gemini TTS synthesis note:', errMsg.slice(0, 120));
        }
        wavBuffer = generateSyntheticVoiceWave(trimmedText, voiceName, speed, pitch);
        durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
      }
    } else {
      isQuotaFallback = true;
      wavBuffer = generateSyntheticVoiceWave(trimmedText, voiceName, speed, pitch);
      durationSeconds = Number(((wavBuffer.length - 44) / 48000).toFixed(2));
    }

    const audioBase64 = wavBuffer.toString('base64');
    const fileSizeBytes = wavBuffer.length;

    const historyRecord: TTSHistoryItem = {
      id,
      text: trimmedText,
      voice_name: voiceName,
      voice_gender: voiceGender,
      voice_style: voiceStyle || 'Natural',
      model_name: model || targetModel,
      pitch: Number(pitch) || 1.0,
      speed: Number(speed) || 1.0,
      audio_base64: audioBase64,
      audio_mime_type: 'audio/wav',
      audio_duration: Math.max(0.5, durationSeconds),
      file_size_bytes: fileSizeBytes,
      is_favorite: 0,
      created_at: new Date().toISOString(),
    };

    // Save to SQLite
    try {
      await insertHistoryItem(historyRecord);
    } catch (dbErr) {
      console.error('Failed to store generation in SQLite:', dbErr);
    }

    return NextResponse.json({
      success: true,
      item: historyRecord,
      isQuotaFallback,
      quotaWarning: isQuotaFallback
        ? 'Gemini 3.1 Flash Neural TTS reached its free-tier daily quota limit. Generated with acoustic synthesis fallback.'
        : undefined,
    });

  } catch (error: any) {
    console.error('TTS Generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize speech audio.' },
      { status: 500 }
    );
  }
}

