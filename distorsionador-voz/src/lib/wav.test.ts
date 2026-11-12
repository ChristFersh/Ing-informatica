import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

const text = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from(new Uint8Array(view.buffer, offset, length)))

describe('encodeWav (PCM 16 bits, mono)', () => {
  it('escribe una cabecera RIFF/WAVE válida', () => {
    const view = new DataView(encodeWav(new Float32Array(10), 44100))

    expect(view.byteLength).toBe(44 + 10 * 2)
    expect(text(view, 0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(36 + 10 * 2)
    expect(text(view, 8, 4)).toBe('WAVE')
    expect(text(view, 12, 4)).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16) // tamaño del bloque fmt
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(44100) // sample rate
    expect(view.getUint32(28, true)).toBe(44100 * 2) // byte rate
    expect(view.getUint16(32, true)).toBe(2) // block align
    expect(view.getUint16(34, true)).toBe(16) // bits por muestra
    expect(text(view, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(10 * 2)
  })

  it('convierte muestras [-1, 1] a enteros de 16 bits y recorta lo que se pasa', () => {
    const samples = Float32Array.from([0, 1, -1, 0.5, -0.5, 2, -2])
    const view = new DataView(encodeWav(samples, 8000))
    const pcm = Array.from({ length: samples.length }, (_, i) => view.getInt16(44 + i * 2, true))

    expect(pcm).toEqual([0, 32767, -32768, 16384, -16384, 32767, -32768])
  })
})
