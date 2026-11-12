import { describeMicError } from './mic-errors'

export type RecorderStatus = 'idle' | 'requesting' | 'recording'

export interface RecorderState {
  status: RecorderStatus
  recording: Blob | null
  error: string | null
}

export const INITIAL_RECORDER_STATE: RecorderState = { status: 'idle', recording: null, error: null }

/** Lo mínimo de MediaStream / MediaRecorder que usa la grabadora (permite fakes en los tests). */
export interface TrackLike {
  stop(): void
}
export interface StreamLike {
  getTracks(): TrackLike[]
}
export interface MediaRecorderLike {
  readonly mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null
  onstop: ((event: Event) => void) | null
  start(): void
  stop(): void
}

export interface RecorderDeps<S extends StreamLike> {
  /** `undefined` cuando el navegador no expone `navigator.mediaDevices.getUserMedia`. */
  getUserMedia: ((constraints: MediaStreamConstraints) => Promise<S>) | undefined
  createMediaRecorder: (stream: S) => MediaRecorderLike
  onChange: (state: RecorderState) => void
  /** Avisa el stream del micrófono mientras se graba, y `null` al terminar. */
  onStream?: (stream: S | null) => void
}

export interface Recorder {
  start(): Promise<void>
  stop(): void
  dispose(): void
}

const stopTracks = (stream: StreamLike) => stream.getTracks().forEach((track) => track.stop())

/**
 * Graba el micrófono. Todo queda en memoria del navegador.
 * Invariante: como mucho una petición de micrófono o una grabación a la vez, y todo stream
 * obtenido termina con sus tracks parados (al detener, al fallar o tras `dispose()`).
 */
export function createRecorder<S extends StreamLike>(deps: RecorderDeps<S>): Recorder {
  let state = INITIAL_RECORDER_STATE
  let current: { recorder: MediaRecorderLike; stream: S } | null = null
  let disposed = false
  let announced: S | null = null

  /** Avisa el stream activo solo cuando cambia (evita un `null` doble tras dispose + onstop). */
  const announce = (stream: S | null) => {
    if (stream === announced) return
    announced = stream
    deps.onStream?.(stream)
  }

  const update = (patch: Partial<RecorderState>) => {
    if (disposed) return
    state = { ...state, ...patch }
    deps.onChange(state)
  }

  return {
    async start() {
      // Guarda síncrona: 'requesting' se fija antes del primer await, así un doble clic no abre dos micrófonos.
      if (disposed || state.status !== 'idle') return
      update({ status: 'requesting', error: null })

      let stream: S | undefined
      try {
        if (!deps.getUserMedia) throw new DOMException('mediaDevices no disponible', 'SecurityError')
        stream = await deps.getUserMedia({ audio: true })
        if (disposed) {
          stopTracks(stream)
          return
        }

        const recordedStream = stream
        const recorder = deps.createMediaRecorder(recordedStream)
        const chunks: Blob[] = []

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onstop = () => {
          stopTracks(recordedStream)
          current = null // también si se detuvo solo (p. ej. micrófono desconectado)
          announce(null)
          update({ status: 'idle', recording: new Blob(chunks, { type: recorder.mimeType }) })
        }

        recorder.start()
        current = { recorder, stream: recordedStream }
        announce(recordedStream)
        update({ status: 'recording' })
      } catch (err) {
        if (stream) stopTracks(stream)
        current = null
        update({ status: 'idle', error: describeMicError(err) })
      }
    },

    stop() {
      const recorder = current?.recorder
      current = null
      recorder?.stop()
    },

    dispose() {
      disposed = true
      if (current) stopTracks(current.stream)
      announce(null)
    },
  }
}
