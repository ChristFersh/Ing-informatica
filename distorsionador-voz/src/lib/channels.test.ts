import { describe, expect, it } from 'vitest'
import { toMono } from './channels'

describe('toMono', () => {
  it('promedia los canales muestra por muestra', () => {
    const left = Float32Array.from([1, 0.5, -1])
    const right = Float32Array.from([0, 0.5, 1])
    expect(Array.from(toMono([left, right]))).toEqual([0.5, 0.5, 0])
  })

  it('con un solo canal devuelve una copia', () => {
    const only = Float32Array.from([0.25, -0.75])
    const mono = toMono([only])
    expect(mono).toEqual(only)
    expect(mono).not.toBe(only)
  })

  it('sin canales devuelve una señal vacía', () => {
    expect(toMono([])).toHaveLength(0)
  })
})
