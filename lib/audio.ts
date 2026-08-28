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
 * Generates an acoustic speech wave simulation when Gemini API key is not configured or in offline sandbox.
 * Creates an expressive formant-filtered acoustic vocal track.
 */
export function generateSyntheticVoiceWave(text: string, voiceName: string, speed: number = 1.0, pitch: number = 1.0): Buffer {
  const sampleRate = 24000;
  const words = text.trim().split(/\s+/);
  const wordsCount = Math.max(1, words.length);
  // Estimate speaking duration: ~150 words per minute base
  const estimatedDurationSec = Math.max(1.2, (wordsCount / (2.5 * speed)));
  const totalSamples = Math.floor(sampleRate * estimatedDurationSec);

  const buffer = Buffer.alloc(totalSamples * 2); // 16-bit = 2 bytes per sample

  // Pitch base frequency
  let baseFreq = 160; // Neutral default Hz
  const vLower = (voiceName || '').toLowerCase();
  if (vLower.includes('charon') || vLower.includes('fenrir') || vLower.includes('deep')) {
    baseFreq = 110;
  } else if (vLower.includes('kore') || vLower.includes('zephyr') || vLower.includes('soft')) {
    baseFreq = 220;
  } else if (vLower.includes('aoede') || vLower.includes('puck') || vLower.includes('bright')) {
    baseFreq = 190;
  }
  baseFreq *= pitch;

  // Generate harmonic voice waveform with formant cadence
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;

    // Word rhythm cadence envelope (syllabic modulation)
    const wordRate = (wordsCount / estimatedDurationSec) * Math.PI * 2;
    const syllabicEnv = 0.5 + 0.5 * Math.sin(t * wordRate);
    
    // Smooth start and finish fade
    const fadeIn = Math.min(1, i / (sampleRate * 0.05));
    const fadeOut = Math.min(1, (totalSamples - i) / (sampleRate * 0.1));
    const envelope = syllabicEnv * fadeIn * fadeOut;

    // Vocal harmonics (fundamental + 2 formants)
    const f0 = baseFreq * (1 + 0.05 * Math.sin(t * 4));
    const f1 = f0 * 2.1;
    const f2 = f0 * 3.4;

    const sampleVal = (
      Math.sin(2 * Math.PI * f0 * t) * 0.5 +
      Math.sin(2 * Math.PI * f1 * t) * 0.25 +
      Math.sin(2 * Math.PI * f2 * t) * 0.15 +
      (Math.random() * 0.03 - 0.015) // subtle natural breath noise
    ) * envelope;

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 28000)));
    buffer.writeInt16LE(int16, i * 2);
  }

  return pcmToWav(buffer, sampleRate);
}
