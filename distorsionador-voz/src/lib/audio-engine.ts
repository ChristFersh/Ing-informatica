export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown
  disconnect(): void
}

export interface AnalyserLike extends AudioNodeLike {
  fftSize: number
  smoothingTimeConstant: number
  readonly frequencyBinCount: number
  getByteFrequencyData(array: Uint8Array): void
  getFloatTimeDomainData(array: Float32Array): void
}

export interface PlayableLike {
  readonly paused: boolean
  readonly ended: boolean
  readonly isConnected: boolean
}

export interface AudioContextLike<E, S> {
  readonly state: string
  readonly sampleRate: number
  readonly destination: AudioNodeLike
  resume(): Promise<void>
  createAnalyser(): AnalyserLike
  createMediaElementSource(element: E): AudioNodeLike
  createMediaStreamSource(stream: S): AudioNodeLike
}

export interface AudioEngine<E, S> {
  readonly analyser: AnalyserLike | null
  readonly sampleRate: number | null
  resume(): void
  attachElement(element: E): void
  attachStream(stream: S): void
  detachStream(): void
  isPlaying(): boolean
}

type CreateContext<E, S> = () => AudioContextLike<E, S>

/**
 * Enruta el audio hacia un único AnalyserNode que lee el fondo animado.
 *
 *   <audio> ──► analizador          micrófono ──► analizador
 *          └──► parlantes                         (nunca a parlantes: evita el acople)
 *
 * El AudioContext se crea recién en el primer uso, que siempre ocurre tras un clic
 * (Grabar o ▶), porque los navegadores no dejan sonar un contexto creado antes.
 */
export const createAudioEngine = <E extends PlayableLike, S>(createContext: CreateContext<E, S>): AudioEngine<E, S> => {
  let graph: { context: AudioContextLike<E, S>; analyser: AnalyserLike } | null = null
  let streamSource: AudioNodeLike | null = null
  // Un <audio> solo admite un createMediaElementSource en toda su vida: guardamos el nodo.
  const elementSources = new WeakMap<E, AudioNodeLike>()
  const elements = new Set<E>()

  const ensureGraph = () => {
    if (!graph) {
      const context = createContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      graph = { context, analyser }
    }
    return graph
  }

  const resume = () => {
    const { context } = ensureGraph()
    // 'suspended' (política de autoplay) o 'interrupted' (Safari tras una llamada o bloquear la pantalla).
    if (context.state !== 'running' && context.state !== 'closed') {
      context.resume().catch(() => {})
    }
  }

  const detachStream = () => {
    streamSource?.disconnect()
    streamSource = null
  }

  return {
    get analyser() {
      return graph?.analyser ?? null
    },
    get sampleRate() {
      return graph?.context.sampleRate ?? null
    },
    resume,
    attachElement(element) {
      const { context, analyser } = ensureGraph()
      if (!elementSources.has(element)) {
        const source = context.createMediaElementSource(element)
        source.connect(analyser)
        source.connect(context.destination)
        elementSources.set(element, source)
      }
      elements.add(element)
      resume()
    },
    attachStream(stream) {
      const { context, analyser } = ensureGraph()
      detachStream()
      streamSource = context.createMediaStreamSource(stream)
      streamSource.connect(analyser)
    },
    detachStream,
    isPlaying() {
      for (const element of elements) {
        if (!element.isConnected) {
          elements.delete(element)
        } else if (!element.paused && !element.ended) {
          return true
        }
      }
      return false
    },
  }
}
