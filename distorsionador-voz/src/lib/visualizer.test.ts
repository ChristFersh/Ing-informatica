import { describe, expect, it } from 'vitest'
import { bandLevels, follow, frequencyToBin, rms, waveHeight, type WaveLayer } from './visualizer'

describe('rms (nivel de volumen)', () => {
  it('el silencio da 0', () => {
    expect(rms(new Float32Array(128))).toBe(0)
  })

  it('una señal vacía da 0 (no NaN)', () => {
    expect(rms(new Float32Array(0))).toBe(0)
  })

  it('una señal constante da su valor absoluto', () => {
    expect(rms(Float32Array.from([-0.5, -0.5, -0.5]))).toBeCloseTo(0.5, 6)
  })

  it('una senoidal de amplitud A da A/√2', () => {
    const n = 1000
    const sine = Float32Array.from({ length: n }, (_, i) => 0.8 * Math.sin((2 * Math.PI * 10 * i) / n))
    expect(rms(sine)).toBeCloseTo(0.8 / Math.SQRT2, 3)
  })
})

describe('frequencyToBin', () => {
  it('convierte Hz al índice del bin de la FFT', () => {
    // 1000 · 2048 / 48000 = 42.67 → 43
    expect(frequencyToBin(1000, 48000, 2048)).toBe(43)
  })

  it('recorta al rango de bins válidos [0, fftSize/2 − 1]', () => {
    expect(frequencyToBin(30000, 48000, 2048)).toBe(1023)
    expect(frequencyToBin(-5, 48000, 2048)).toBe(0)
  })
})

describe('bandLevels', () => {
  // fftSize 16 y fs 1600 ⇒ 8 bins de 100 Hz: el bin i corresponde a i·100 Hz
  const spectrum = Uint8Array.from([255, 255, 0, 0, 51, 102, 0, 0])

  it('promedia los bins de cada banda y normaliza a [0, 1]', () => {
    const levels = bandLevels(spectrum, 1600, 16, [
      [0, 100],
      [400, 500],
      [600, 700],
    ])
    expect(levels[0]).toBeCloseTo(1, 6)
    expect(levels[1]).toBeCloseTo(0.3, 6) // (51 + 102) / 2 / 255
    expect(levels[2]).toBe(0)
  })
})

describe('follow (suavizado ataque/liberación)', () => {
  it('sin tiempo transcurrido no cambia', () => {
    expect(follow(0.4, 1, 0, 0.1, 1)).toBe(0.4)
  })

  it('sube con la constante de ataque', () => {
    // dt = τ ⇒ recorre 1 − e^(−1) ≈ 63 % del camino
    expect(follow(0, 1, 0.1, 0.1, 1)).toBeCloseTo(1 - Math.exp(-1), 6)
  })

  it('baja con la constante de liberación', () => {
    expect(follow(1, 0, 0.1, 0.1, 1)).toBeCloseTo(Math.exp(-0.1), 6)
  })

  it('con constante 0 salta directo al objetivo', () => {
    expect(follow(0, 0.7, 0, 0, 0)).toBe(0.7)
  })
})

describe('waveHeight (onda de cada capa del fondo)', () => {
  const layer: WaveLayer = { baseline: 0.6, cycles: 1.5, idleAmplitude: 0.02, reactiveAmplitude: 0.15 }
  const xs = Array.from({ length: 400 }, (_, i) => i / 399)
  const maxDeviation = (phase: number, energy: number) =>
    Math.max(...xs.map((u) => Math.abs(waveHeight(u, phase, layer, energy) - layer.baseline)))

  it('en u = 0 y fase 0 pasa exactamente por la línea base', () => {
    expect(waveHeight(0, 0, layer, 0.5)).toBe(layer.baseline)
  })

  it('en reposo oscila poco, sin pasar la amplitud de reposo', () => {
    const deviation = maxDeviation(0.3, 0)
    expect(deviation).toBeGreaterThan(0.3 * layer.idleAmplitude)
    expect(deviation).toBeLessThanOrEqual(layer.idleAmplitude)
  })

  it('con energía la onda crece, sin pasar la amplitud total', () => {
    const quiet = maxDeviation(0.3, 0)
    const loud = maxDeviation(0.3, 1)
    expect(loud).toBeGreaterThan(3 * quiet)
    expect(loud).toBeLessThanOrEqual(layer.idleAmplitude + layer.reactiveAmplitude)
  })

  it('la energía se recorta a [0, 1]', () => {
    expect(waveHeight(0.37, 0.8, layer, 5)).toBe(waveHeight(0.37, 0.8, layer, 1))
    expect(waveHeight(0.37, 0.8, layer, -2)).toBe(waveHeight(0.37, 0.8, layer, 0))
  })

  it('cambiar la fase desplaza la onda (así se mueve)', () => {
    const moved = xs.some((u) => Math.abs(waveHeight(u, 0, layer, 1) - waveHeight(u, 1, layer, 1)) > 0.01)
    expect(moved).toBe(true)
  })
})
