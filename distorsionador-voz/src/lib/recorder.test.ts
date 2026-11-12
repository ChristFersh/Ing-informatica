import { describe, expect, it, vi } from 'vitest'
import { createRecorder, type MediaRecorderLike, type RecorderState } from './recorder'

class FakeTrack {
  stopCalls = 0
  stop() {
    this.stopCalls++
  }
}

class FakeStream {
  readonly tracks = [new FakeTrack(), new FakeTrack()]
  getTracks() {
    return this.tracks
  }
}

/** Imita MediaRecorder: los eventos los dispara el test, como haría el navegador. */
class FakeMediaRecorder implements MediaRecorderLike {
  readonly mimeType = 'audio/webm'
  ondataavailable: MediaRecorderLike['ondataavailable'] = null
  onstop: MediaRecorderLike['onstop'] = null
  startCalls = 0
  stopCalls = 0
  failOnStart = false

  start() {
    this.startCalls++
    if (this.failOnStart) throw new DOMException('no se pudo iniciar', 'InvalidStateError')
  }
  stop() {
    this.stopCalls++
  }
  emitData(data: Blob) {
    this.ondataavailable?.({ data } as BlobEvent) // BlobEvent no existe en node; solo se lee `data`.
  }
  emitStop() {
    this.onstop?.(new Event('stop'))
  }
}

function setup() {
  const streams: FakeStream[] = []
  const recorders: FakeMediaRecorder[] = []
  const states: RecorderState[] = []
  const streamEvents: Array<FakeStream | null> = []
  const pendingRequests: Array<(stream: FakeStream) => void> = []
  const failNext = { constructor: false, start: false }

  const getUserMedia = vi.fn(() => new Promise<FakeStream>((resolve) => pendingRequests.push(resolve)))

  const recorder = createRecorder({
    getUserMedia,
    createMediaRecorder: () => {
      if (failNext.constructor) {
        failNext.constructor = false
        throw new ReferenceError('MediaRecorder is not defined')
      }
      const fake = new FakeMediaRecorder()
      fake.failOnStart = failNext.start
      failNext.start = false
      recorders.push(fake)
      return fake
    },
    onChange: (state) => states.push(state),
    onStream: (stream) => streamEvents.push(stream),
  })

  /** El usuario concede el permiso: resuelve la petición de micrófono más antigua. */
  const grant = () => {
    const stream = new FakeStream()
    streams.push(stream)
    pendingRequests.shift()?.(stream)
    return stream
  }

  return {
    recorder,
    getUserMedia,
    streams,
    recorders,
    states,
    streamEvents,
    failNext,
    grant,
    pendingCount: () => pendingRequests.length,
    lastState: () => states.at(-1),
    trackStops: () => streams.flatMap((stream) => stream.tracks.map((track) => track.stopCalls)),
  }
}

describe('createRecorder', () => {
  it("pasa a 'requesting' mientras espera el permiso y a 'recording' al concederlo", async () => {
    const t = setup()

    const started = t.recorder.start()
    expect(t.lastState()?.status).toBe('requesting')

    t.grant()
    await started
    expect(t.lastState()?.status).toBe('recording')
    expect(t.recorders[0].startCalls).toBe(1)
  })

  it('un doble clic en Grabar pide el micrófono una sola vez y Detener lo apaga del todo', async () => {
    const t = setup()

    const first = t.recorder.start()
    const second = t.recorder.start()
    expect(t.getUserMedia).toHaveBeenCalledTimes(1)

    while (t.pendingCount() > 0) t.grant()
    await Promise.all([first, second])
    expect(t.recorders).toHaveLength(1)

    t.recorder.stop()
    t.recorders.filter((r) => r.stopCalls > 0).forEach((r) => r.emitStop())
    expect(t.trackStops()).toEqual([1, 1])
  })

  it('al detener entrega un Blob con los trozos grabados, apaga el micrófono y vuelve a idle', async () => {
    // Caracterización: comportamiento que ya tenía el hook.
    const t = setup()
    const started = t.recorder.start()
    t.grant()
    await started
    const [mediaRecorder] = t.recorders

    mediaRecorder.emitData(new Blob(['ho']))
    mediaRecorder.emitData(new Blob([]))
    mediaRecorder.emitData(new Blob(['la']))
    t.recorder.stop()
    expect(mediaRecorder.stopCalls).toBe(1)

    mediaRecorder.emitStop()
    const state = t.lastState()
    expect(state?.status).toBe('idle')
    expect(state?.recording?.type).toBe('audio/webm')
    expect(await state?.recording?.text()).toBe('hola')
    expect(t.trackStops()).toEqual([1, 1])
  })

  it('si falla el constructor de MediaRecorder, apaga el micrófono y explica el error', async () => {
    const t = setup()
    t.failNext.constructor = true

    const started = t.recorder.start()
    t.grant()
    await started

    expect(t.trackStops()).toEqual([1, 1])
    expect(t.lastState()).toEqual({
      status: 'idle',
      recording: null,
      error: 'No se pudo usar el micrófono: MediaRecorder is not defined',
    })
  })

  it('si falla recorder.start(), apaga el micrófono y se puede volver a grabar', async () => {
    const t = setup()
    t.failNext.start = true

    const failed = t.recorder.start()
    t.grant()
    await failed
    expect(t.trackStops()).toEqual([1, 1])
    expect(t.lastState()?.status).toBe('idle')

    const retried = t.recorder.start()
    t.grant()
    await retried
    expect(t.lastState()).toMatchObject({ status: 'recording', error: null })

    t.recorder.stop()
    expect(t.recorders.map((r) => r.stopCalls)).toEqual([0, 1])
  })

  it('si el grabador se detiene solo (micrófono desconectado), Detener ya no lo toca', async () => {
    const t = setup()
    const started = t.recorder.start()
    t.grant()
    await started

    t.recorders[0].emitStop()
    expect(t.lastState()?.status).toBe('idle')

    t.recorder.stop()
    expect(t.recorders[0].stopCalls).toBe(0)
  })

  it('dispose() mientras graba apaga el micrófono', async () => {
    // Caracterización: el hook ya lo hacía al desmontar.
    const t = setup()
    const started = t.recorder.start()
    t.grant()
    await started

    t.recorder.dispose()
    expect(t.trackStops()).toEqual([1, 1])
  })

  it('tras dispose() no emite más estados', async () => {
    const t = setup()
    const started = t.recorder.start()
    t.grant()
    await started
    const emitted = t.states.length

    t.recorder.dispose()
    t.recorders[0].emitStop()
    expect(t.states).toHaveLength(emitted)
  })

  it('dispose() con el permiso pendiente: al concederlo apaga el micrófono y no crea grabador', async () => {
    const t = setup()
    const started = t.recorder.start()

    t.recorder.dispose()
    t.grant()
    await started

    expect(t.trackStops()).toEqual([1, 1])
    expect(t.recorders).toHaveLength(0)
  })

  it('sin navigator.mediaDevices.getUserMedia explica que hace falta HTTPS', async () => {
    // Caracterización: el chequeo que hacía el hook.
    const states: RecorderState[] = []
    const recorder = createRecorder({
      getUserMedia: undefined,
      createMediaRecorder: () => new FakeMediaRecorder(),
      onChange: (state) => states.push(state),
    })

    await recorder.start()

    expect(states.at(-1)).toEqual({
      status: 'idle',
      recording: null,
      error: 'El navegador bloqueó el micrófono: abre la página en HTTPS o en localhost.',
    })
  })

  describe('onStream (para que el fondo escuche el micrófono)', () => {
    it('anuncia el stream al empezar a grabar y null al terminar', async () => {
      const t = setup()
      const started = t.recorder.start()
      const stream = t.grant()
      await started
      expect(t.streamEvents).toEqual([stream])

      t.recorder.stop()
      t.recorders[0].emitStop()
      expect(t.streamEvents).toEqual([stream, null])
    })

    it('si falla el arranque no anuncia ningún stream', async () => {
      const t = setup()
      t.failNext.constructor = true
      const started = t.recorder.start()
      t.grant()
      await started
      expect(t.streamEvents).toEqual([])
    })

    it('dispose() grabando anuncia null una sola vez, aunque luego llegue onstop', async () => {
      const t = setup()
      const started = t.recorder.start()
      const stream = t.grant()
      await started

      t.recorder.dispose()
      t.recorders[0].emitStop()
      expect(t.streamEvents).toEqual([stream, null])
    })
  })
})
