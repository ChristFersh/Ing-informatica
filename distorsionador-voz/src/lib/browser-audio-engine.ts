import { createAudioEngine } from './audio-engine'

/** Motor de audio único de la app (el AudioContext real se crea en el primer clic). */
export const audioEngine = createAudioEngine<HTMLMediaElement, MediaStream>(() => new AudioContext())
