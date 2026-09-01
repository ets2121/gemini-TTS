/**
 * Audio processing utilities for Text-to-Speech
 * Converts raw PCM audio (e.g. 24kHz 16-bit mono from Gemini) into standard playable/downloadable WAV format.
 */

export function createWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0); // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize (36 + SubChunk2Size)
  buffer.write('WAVE', 8); // Format

  // "fmt " sub-chunk
  buffer.write('fmt ', 12); // Subchunk1ID
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // "data" sub-chunk
  buffer.write('data', 36); // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size

  return buffer;
}

export function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const header = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Generates an expressive acoustic speech wave simulation when Gemini API quota is reached or in offline sandbox.
 * Creates an expressive formant-filtered acoustic vocal track tailored to each persona.
 */
export function generateSyntheticVoiceWave(
  text: string,
  voiceName: string,
  speed: number = 1.0,
  pitch: number = 1.0
): Buffer {
  const sampleRate = 24000;
  const words = text.trim().split(/\s+/);
  const wordsCount = Math.max(1, words.length);
  // Estimate speaking duration: ~140 words per minute base
  const estimatedDurationSec = Math.max(1.5, wordsCount / (2.4 * Math.max(0.5, speed)));
  const totalSamples = Math.floor(sampleRate * estimatedDurationSec);

  const buffer = Buffer.alloc(totalSamples * 2); // 16-bit = 2 bytes per sample

  // Pitch base frequency tailored to persona
  let baseFreq = 165; // Default Hz
  let resonanceFactor = 2.1;
  const vLower = (voiceName || '').toLowerCase();

  if (vLower === 'charon') {
    baseFreq = 100;
    resonanceFactor = 1.9;
  } else if (vLower === 'fenrir') {
    baseFreq = 115;
    resonanceFactor = 2.0;
  } else if (vLower === 'orpheus') {
    baseFreq = 125;
    resonanceFactor = 2.1;
  } else if (vLower === 'chiron') {
    baseFreq = 135;
    resonanceFactor = 2.2;
  } else if (vLower === 'jupiter') {
    baseFreq = 145;
    resonanceFactor = 2.0;
  } else if (vLower === 'kore') {
    baseFreq = 220;
    resonanceFactor = 2.3;
  } else if (vLower === 'zephyr') {
    baseFreq = 195;
    resonanceFactor = 2.2;
  } else if (vLower === 'aoede') {
    baseFreq = 230;
    resonanceFactor = 2.4;
  } else if (vLower === 'leda') {
    baseFreq = 210;
    resonanceFactor = 2.1;
  } else if (vLower === 'mimosa') {
    baseFreq = 245;
    resonanceFactor = 2.5;
  } else if (vLower === 'thalia') {
    baseFreq = 235;
    resonanceFactor = 2.3;
  } else if (vLower === 'puck') {
    baseFreq = 175;
    resonanceFactor = 2.2;
  } else if (vLower === 'echo') {
    baseFreq = 180;
    resonanceFactor = 2.0;
  } else if (vLower === 'callisto') {
    baseFreq = 160;
    resonanceFactor = 2.1;
  }

  baseFreq *= Math.max(0.5, Math.min(2.0, pitch));

  // Generate harmonic voice waveform with syllabic formant cadence
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;

    // Sentence intonation contour: gentle rise then fall at the end
    const sentencePitchMod = 1.0 + 0.08 * Math.sin(progress * Math.PI) - 0.06 * Math.pow(progress, 2);

    // Word rhythm cadence envelope (syllabic modulation)
    const wordRate = (wordsCount / estimatedDurationSec) * Math.PI * 2;
    const syllabicEnv = 0.4 + 0.6 * Math.pow(Math.sin(t * wordRate), 2);

    // Smooth start and finish fade
    const fadeIn = Math.min(1, i / (sampleRate * 0.08));
    const fadeOut = Math.min(1, (totalSamples - i) / (sampleRate * 0.12));
    const envelope = syllabicEnv * fadeIn * fadeOut;

    // Vocal harmonics (fundamental + 3 formants)
    const f0 = baseFreq * sentencePitchMod * (1 + 0.03 * Math.sin(t * 5.5));
    const f1 = f0 * resonanceFactor;
    const f2 = f0 * (resonanceFactor * 1.6);
    const f3 = f0 * (resonanceFactor * 2.4);

    const sampleVal =
      (Math.sin(2 * Math.PI * f0 * t) * 0.45 +
        Math.sin(2 * Math.PI * f1 * t) * 0.25 +
        Math.sin(2 * Math.PI * f2 * t) * 0.15 +
        Math.sin(2 * Math.PI * f3 * t) * 0.08 +
        (Math.random() * 0.02 - 0.01)) * // soft breath floor
      envelope;

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 27000)));
    buffer.writeInt16LE(int16, i * 2);
  }

  return pcmToWav(buffer, sampleRate);
}

