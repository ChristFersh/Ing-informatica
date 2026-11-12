import { describe, expect, it } from 'vitest'
import { createAudioEngine, type AnalyserLike, type AudioContextLike, type AudioNodeLike } from './audio-engine'

class FakeNode implements AudioNodeLike {
  readonly connectedTo: AudioNodeLike[] = []
  disconnectCalls = 0
  connect(destination: AudioNodeLike) {
    this.connectedTo.push(destination)
  }
  disconnect() {
    this.disconnectCalls++
    this.connectedTo.length = 0
  }
}

class FakeAnalyser extends FakeNode implements AnalyserLike {
  fftSize = 32
  smoothingTimeConstant = 0
  get frequencyBinCount() {
    return this.fftSize / 2
  }
  getByteFrequencyData() {}
  getFloatTimeDomainData() {}
}

class FakeElement {
  paused = true
  ended = false
  isConnected = true
}

class FakeStream {}

class FakeContext implements AudioContextLike<FakeElement, FakeStream> {
  state = 'suspended'
  readonly sampleRate = 48000
  readonly destination = new FakeNode()
  resumeCalls = 0
  readonly analysers: FakeAnalyser[] = []
  readonly elementSources: FakeNode[] = []
  readonly streamSources: FakeNode[] = []

  resume() {
    this.resumeCalls++
    this.state = 'running'
    return Promise.resolve()
  }
  createAnalyser() {
    const analyser = new FakeAnalyser()
    this.analysers.push(analyser)
    return analyser
  }
  createMediaElementSource() {
    const source = new FakeNode()
    this.elementSources.push(source)
    return source
  }
  createMediaStreamSource() {
    const source = new FakeNode()
    this.streamSources.push(source)
    return source
  }
}

/** Safari: resume() puede rechazar (contexto 'interrupted', documento inactivo). */
class RejectingContext extends FakeContext {
  resume() {
    this.resumeCalls++
    return Promise.reject(new Error('resume() rechazado'))
  }
}

function setup(createContext: () => FakeContext = () => new FakeContext()) {
  const contexts: FakeContext[] = []
  const engine = createAudioEngine(() => {
    const context = createContext()
    contexts.push(context)
    return context
  })
  const context = () => {
    expect(contexts).toHaveLength(1)
    return contexts[0]
  }
  return { engine, contexts, context }
}

describe('createAudioEngine', () => {
  it('no crea el AudioContext hasta que se usa (el navegador lo exige tras un gesto)', () => {
    const { engine, contexts } = setup()
    expect(contexts).toHaveLength(0)
    expect(engine.analyser).toBeNull()
    expect(engine.sampleRate).toBeNull()
  })

  it('resume() crea un solo contexto con su analizador y lo reanuda solo si hace falta', () => {
    const { engine, contexts, context } = setup()
    engine.resume()
    engine.resume()

    expect(contexts).toHaveLength(1)
    expect(context().resumeCalls).toBe(1)
    expect(engine.analyser).toBe(context().analysers[0])
    expect(engine.analyser?.fftSize).toBe(2048)
    expect(engine.sampleRate).toBe(48000)
  })

  it('un reproductor suena por los parlantes y además pasa por el analizador', () => {
    const { engine, context } = setup()
    engine.attachElement(new FakeElement())

    expect(context().elementSources).toHaveLength(1)
    const [source] = context().elementSources
    expect(source.connectedTo[0]).toBe(context().analysers[0])
    expect(source.connectedTo[1]).toBe(context().destination)
    // Guarda: el analizador es un sumidero. Si saliera a los parlantes, el <audio> sonaría dos veces.
    expect(context().analysers[0].connectedTo).toEqual([])
    expect(context().resumeCalls).toBe(1)
  })

  it('conecta cada reproductor una sola vez (Web Audio no permite repetir)', () => {
    const { engine, context } = setup()
    const element = new FakeElement()
    engine.attachElement(element)
    engine.attachElement(element)

    expect(context().elementSources).toHaveLength(1)
  })

  it('el micrófono va al analizador pero no a los parlantes (sin acople)', () => {
    const { engine, context } = setup()
    engine.attachStream(new FakeStream())

    expect(context().streamSources).toHaveLength(1)
    const [source] = context().streamSources
    expect(source.connectedTo).toHaveLength(1)
    expect(source.connectedTo[0]).toBe(context().analysers[0])
    // Guarda: tampoco por la vía indirecta micrófono → analizador → parlantes.
    expect(context().analysers[0].connectedTo).toEqual([])
  })

  it('un micrófono nuevo desconecta el anterior, y detachStream lo suelta', () => {
    const { engine, context } = setup()
    engine.attachStream(new FakeStream())
    engine.attachStream(new FakeStream())
    expect(context().streamSources).toHaveLength(2)
    const [first, second] = context().streamSources
    expect(first.disconnectCalls).toBe(1)
    expect(second.disconnectCalls).toBe(0)

    engine.detachStream()
    expect(second.disconnectCalls).toBe(1)
  })

  it('isPlaying refleja si algún reproductor conectado está sonando', () => {
    const { engine } = setup()
    const a = new FakeElement()
    const b = new FakeElement()
    expect(engine.isPlaying()).toBe(false)

    engine.attachElement(a)
    engine.attachElement(b)
    expect(engine.isPlaying()).toBe(false)

    b.paused = false
    expect(engine.isPlaying()).toBe(true)

    b.ended = true
    expect(engine.isPlaying()).toBe(false)
  })

  it('ignora reproductores que ya no están en la página', () => {
    const { engine } = setup()
    const element = new FakeElement()
    engine.attachElement(element)
    element.paused = false
    element.isConnected = false

    expect(engine.isPlaying()).toBe(false)
  })

  it('si el navegador vuelve a suspender el contexto, el siguiente ▶ lo reanuda (si no, el audio queda mudo)', () => {
    const { engine, context } = setup()
    const element = new FakeElement()
    engine.attachElement(element)
    context().state = 'suspended'

    engine.attachElement(element)
    expect(context().resumeCalls).toBe(2)
  })

  it("también reanuda el estado 'interrupted' de Safari, pero no uno cerrado", () => {
    const { engine, context } = setup()
    engine.resume()

    context().state = 'interrupted'
    engine.resume()
    expect(context().resumeCalls).toBe(2)

    context().state = 'closed'
    engine.resume()
    expect(context().resumeCalls).toBe(2)
  })

  // Guarda (caracterización): sin el .catch de resume(), Vitest corta la corrida con "Unhandled Rejection".
  it('si resume() rechaza, no deja una promesa rechazada sin manejar', async () => {
    const { engine, context } = setup(() => new RejectingContext())

    expect(() => engine.resume()).not.toThrow()
    // Un turno del event loop: es cuando Node avisa de los rechazos que nadie manejó.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(context().resumeCalls).toBe(1)
  })
})
