import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Converts a WAV ArrayBuffer or Uint8Array to an MP3 Blob.
 * Handles 16-bit Mono or Stereo PCM WAV data.
 */
export function convertWavToMp3(wavData: ArrayBuffer | Uint8Array, kbps: number = 192): Blob {
  const arrayBuffer = wavData instanceof Uint8Array ? wavData.buffer.slice(wavData.byteOffset, wavData.byteOffset + wavData.byteLength) : wavData;
  const dataView = new DataView(arrayBuffer);

  // Validate RIFF header
  const riff = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  );
  const wave = String.fromCharCode(
    dataView.getUint8(8),
    dataView.getUint8(9),
    dataView.getUint8(10),
    dataView.getUint8(11)
  );

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Invalid WAV file format');
  }

  // Parse fmt subchunk
  let offset = 12;
  let channels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = 0;

  while (offset < dataView.byteLength - 8) {
    const chunkId = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    );
    const chunkSize = dataView.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      // AudioFormat = dataView.getUint16(offset + 8, true);
      channels = dataView.getUint16(offset + 10, true);
      sampleRate = dataView.getUint32(offset + 12, true);
      bitsPerSample = dataView.getUint16(offset + 22, true);
      offset += 8 + chunkSize;
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataLength = chunkSize;
      break;
    } else {
      offset += 8 + chunkSize;
    }
  }

  if (dataLength === 0) {
    dataLength = dataView.byteLength - dataOffset;
  }

  // Extract PCM samples as Int16Array
  const sampleCount = Math.floor(dataLength / (bitsPerSample / 8));
  const samples = new Int16Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const bytePos = dataOffset + i * 2;
    if (bytePos + 1 < dataView.byteLength) {
      samples[i] = dataView.getInt16(bytePos, true);
    }
  }

  // Initialize MP3 Encoder
  const mp3Encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  if (channels === 1) {
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }
  } else {
    // Stereo: de-interleave into left and right channels
    const leftSamples = new Int16Array(Math.floor(samples.length / 2));
    const rightSamples = new Int16Array(Math.floor(samples.length / 2));
    for (let i = 0; i < leftSamples.length; i++) {
      leftSamples[i] = samples[i * 2];
      rightSamples[i] = samples[i * 2 + 1];
    }

    for (let i = 0; i < leftSamples.length; i += sampleBlockSize) {
      const leftChunk = leftSamples.subarray(i, i + sampleBlockSize);
      const rightChunk = rightSamples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }
  }

  const mp3End = mp3Encoder.flush();
  if (mp3End && mp3End.length > 0) {
    mp3Data.push(new Uint8Array(mp3End));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Converts a base64 WAV string to an MP3 Blob
 */
export function base64WavToMp3Blob(base64Wav: string, kbps: number = 192): Blob {
  const binaryString = atob(base64Wav);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return convertWavToMp3(bytes.buffer, kbps);
}
