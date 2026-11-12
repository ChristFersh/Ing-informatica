/**
 * Matemática del fondo animado. Funciones puras: el canvas solo las dibuja.
 */

/** Una capa de onda del fondo. Alturas en fracción de la altura del canvas (0 = arriba, 1 = abajo). */
export interface WaveLayer {
  /** Altura de la línea de reposo. */
  baseline: number
  /** Cuántas ondulaciones caben a lo ancho. */
  cycles: number
  /** Amplitud cuando no hay sonido. */
  idleAmplitude: number
  /** Amplitud extra con energía = 1. */
  reactiveAmplitude: number
}

/** Nivel de volumen: raíz del promedio de los cuadrados (RMS). Una senoidal de amplitud A da A/√2. */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

/** Índice del bin de la FFT que corresponde a `hz`. Cada bin mide sampleRate / fftSize Hz. */
export function frequencyToBin(hz: number, sampleRate: number, fftSize: number): number {
  const bin = Math.round((hz * fftSize) / sampleRate)
  return Math.min(Math.max(bin, 0), fftSize / 2 - 1)
}

/** Energía de cada banda [desde, hasta] en Hz: promedio de sus bins (0–255) normalizado a [0, 1]. */
export function bandLevels(
  spectrum: Uint8Array,
  sampleRate: number,
  fftSize: number,
  bands: Array<[number, number]>,
): number[] {
  return bands.map(([lo, hi]) => {
    const from = frequencyToBin(lo, sampleRate, fftSize)
    const to = frequencyToBin(hi, sampleRate, fftSize)
    let sum = 0
    for (let i = from; i <= to; i++) sum += spectrum[i]
    return sum / (to - from + 1) / 255
  })
}

/**
 * Suavizado exponencial: se acerca a `target` recorriendo 1 − e^(−dt/τ) del camino.
 * τ = `attack` si sube (reacciona rápido) o `release` si baja (cae despacio).
 */
export function follow(current: number, target: number, dt: number, attack: number, release: number): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

/**
 * Altura de la onda en la posición horizontal u ∈ [0, 1]:
 *
 *   y(u) = base + A · [ sin(2π·c·u + φ) + ½·sin(2π·1.7c·u − 1.3φ) ] / 1.5
 *   A    = A_reposo + A_reactiva · energía
 *
 * Sumar dos senos de frecuencias no múltiplas da una forma orgánica que no se repite igual.
 * La fase φ avanza con el tiempo (la onda viaja) y la energía del sonido agranda A.
 */
export function waveHeight(u: number, phase: number, layer: WaveLayer, energy: number): number {
  const e = Math.min(Math.max(energy, 0), 1)
  const amplitude = layer.idleAmplitude + layer.reactiveAmplitude * e
  const angle = 2 * Math.PI * layer.cycles * u
  const shape = (Math.sin(angle + phase) + 0.5 * Math.sin(1.7 * angle - 1.3 * phase)) / 1.5
  return layer.baseline + amplitude * shape
}
