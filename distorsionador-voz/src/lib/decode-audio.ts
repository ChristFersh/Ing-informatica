import { toMono } from './channels'

export interface MonoAudio {
  samples: Float32Array
  sampleRate: number
}

/** Decodifica la grabación (webm/ogg/mp4) a muestras PCM mono en el navegador. */
export async function decodeRecording(blob: Blob): Promise<MonoAudio> {
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
    return { samples: toMono(channels), sampleRate: buffer.sampleRate }
  } finally {
    void context.close()
  }
}
