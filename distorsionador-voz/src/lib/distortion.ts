/**
 * Distorsionador de voz trigonométrico.
 *
 *   y[n] = (1 − m) · x[n]  +  m · sin(k · x[n]) · sin(2π · f · n / fs)
 *
 *   x[n] muestra original en [-1, 1]      n  índice de la muestra
 *   k    "drive": dobla la onda con seno   f  frecuencia de la portadora (Hz)
 *   m    mezcla: 0 = original, 1 = todo    fs frecuencia de muestreo (Hz)
 *
 * - sin(k · x) es un waveshaper: comprime los picos y agrega armónicos (voz áspera).
 * - sin(2π·f·n/fs) es una modulación en anillo: multiplica la voz por un tono
 *   puro y desplaza sus frecuencias (voz metálica / de robot).
 * - Si |x| ≤ 1 entonces |y| ≤ (1 − m) + m = 1: la salida nunca satura.
 */
export interface DistortionParams {
  /** f: frecuencia de la portadora en Hz (modulación en anillo). */
  carrierHz: number
  /** k: ganancia dentro del seno, sin(k · x). */
  drive: number
  /** m: mezcla entre la señal original (0) y la distorsionada (1). */
  mix: number
}

function assertParams(sampleRate: number, { carrierHz, drive, mix }: DistortionParams): void {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`sampleRate debe ser > 0 (recibido ${sampleRate})`)
  }
  if (!Number.isFinite(carrierHz) || carrierHz < 0) {
    throw new RangeError(`carrierHz debe ser ≥ 0 (recibido ${carrierHz})`)
  }
  if (!Number.isFinite(drive) || drive < 0) {
    throw new RangeError(`drive debe ser ≥ 0 (recibido ${drive})`)
  }
  if (!Number.isFinite(mix) || mix < 0 || mix > 1) {
    throw new RangeError(`mix debe estar en [0, 1] (recibido ${mix})`)
  }
}

/** Aplica la fórmula a una sola muestra x[n]. */
export function distortSample(x: number, n: number, sampleRate: number, params: DistortionParams): number {
  const { carrierHz, drive, mix } = params
  if (mix === 0) return x
  const shaped = Math.sin(drive * x)
  const carrier = Math.sin((2 * Math.PI * carrierHz * n) / sampleRate)
  return (1 - mix) * x + mix * shaped * carrier
}

/** Aplica la fórmula a toda la grabación. Devuelve una señal nueva; no toca la original. */
export function distortVoice(input: Float32Array, sampleRate: number, params: DistortionParams): Float32Array {
  assertParams(sampleRate, params)
  const output = new Float32Array(input.length)
  for (let n = 0; n < input.length; n++) {
    output[n] = distortSample(input[n], n, sampleRate, params)
  }
  return output
}
