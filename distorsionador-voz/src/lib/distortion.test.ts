import { describe, expect, it } from 'vitest'
import { distortSample, distortVoice, type DistortionParams } from './distortion'

const FULL: DistortionParams = { carrierHz: 2, drive: Math.PI / 2, mix: 1 }

describe('distortSample: y[n] = (1 − m)·x[n] + m·sin(k·x[n])·sin(2π·f·n / fs)', () => {
  // fs = 8 y f = 2 ⇒ portadora sin(π·n/2): n=0 → 0, n=1 → 1, n=2 → 0, n=3 → −1
  // k = π/2 y x = 1 ⇒ sin(k·x) = 1
  it('sigue la portadora cuando la mezcla es total', () => {
    expect(distortSample(1, 0, 8, FULL)).toBeCloseTo(0, 10)
    expect(distortSample(1, 1, 8, FULL)).toBeCloseTo(1, 10)
    expect(distortSample(1, 2, 8, FULL)).toBeCloseTo(0, 10)
    expect(distortSample(1, 3, 8, FULL)).toBeCloseTo(-1, 10)
  })

  it('aplica el seno sobre la muestra (waveshaping) antes de modular', () => {
    // x = 0.5, k = π ⇒ sin(π/2) = 1; n = 1 ⇒ portadora = 1
    expect(distortSample(0.5, 1, 8, { carrierHz: 2, drive: Math.PI, mix: 1 })).toBeCloseTo(1, 10)
    // x = 0.25, k = 2 ⇒ sin(0.5)
    expect(distortSample(0.25, 1, 8, { carrierHz: 2, drive: 2, mix: 1 })).toBeCloseTo(Math.sin(0.5), 10)
  })

  it('mezcla original y distorsionada en proporción (1 − m) y m', () => {
    // m = 0.25, x = 1, n = 1 ⇒ 0.75·1 + 0.25·1·1 = 1
    // m = 0.25, x = 1, n = 3 ⇒ 0.75·1 + 0.25·1·(−1) = 0.5
    const params = { ...FULL, mix: 0.25 }
    expect(distortSample(1, 1, 8, params)).toBeCloseTo(1, 10)
    expect(distortSample(1, 3, 8, params)).toBeCloseTo(0.5, 10)
  })

  it('con mezcla 0 devuelve la muestra original', () => {
    expect(distortSample(0.37, 5, 44100, { ...FULL, mix: 0 })).toBe(0.37)
  })
})

describe('distortVoice', () => {
  it('devuelve una señal nueva del mismo largo sin modificar la original', () => {
    const input = Float32Array.from([0.1, -0.2, 0.3, -0.4])
    const copy = Float32Array.from(input)

    const output = distortVoice(input, 8, FULL)

    expect(output).not.toBe(input)
    expect(output).toHaveLength(input.length)
    expect(input).toEqual(copy)
  })

  it('aplica la fórmula muestra por muestra usando el índice como tiempo', () => {
    const input = Float32Array.from([1, 1, 1, 1])
    const output = distortVoice(input, 8, FULL)

    expect(Array.from(output)).toEqual(
      [0, 1, 0, -1].map((v) => expect.closeTo(v, 6)),
    )
  })

  it('con mezcla 0 la salida es idéntica a la entrada', () => {
    const input = Float32Array.from([0.5, -0.25, 0.125, 0.9])
    expect(distortVoice(input, 48000, { carrierHz: 80, drive: 6, mix: 0 })).toEqual(input)
  })

  it('el silencio sigue siendo silencio', () => {
    const output = distortVoice(new Float32Array(64), 48000, { carrierHz: 80, drive: 6, mix: 1 })
    expect(output.every((v) => v === 0)).toBe(true)
  })

  it('no satura: si |x| ≤ 1 entonces |y| ≤ 1', () => {
    const n = 2000
    const input = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.37) * (i % 2 ? 1 : -1))
    for (const mix of [0, 0.3, 0.7, 1]) {
      const output = distortVoice(input, 48000, { carrierHz: 123, drive: 9, mix })
      expect(Math.max(...output.map(Math.abs))).toBeLessThanOrEqual(1)
    }
  })

  it('rechaza parámetros fuera de rango', () => {
    const input = new Float32Array(4)
    expect(() => distortVoice(input, 0, FULL)).toThrow(RangeError)
    expect(() => distortVoice(input, 8, { ...FULL, mix: 1.5 })).toThrow(RangeError)
    expect(() => distortVoice(input, 8, { ...FULL, mix: -0.1 })).toThrow(RangeError)
    expect(() => distortVoice(input, 8, { ...FULL, carrierHz: -1 })).toThrow(RangeError)
    expect(() => distortVoice(input, 8, { ...FULL, drive: Number.NaN })).toThrow(RangeError)
  })
})
