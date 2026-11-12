import type { DistortionParams } from './distortion'

/** Color de cada parámetro: el mismo en la fórmula y en la etiqueta de su slider. */
export const PARAM_COLORS: Record<keyof DistortionParams, string> = {
  carrierHz: '#7c3aed', // f · violeta
  drive: '#ea580c', // k · naranja
  mix: '#0d9488', // m · verde azulado
}

const paint = (param: keyof DistortionParams, tex: string) => `\\textcolor{${PARAM_COLORS[param]}}{${tex}}`

/** El símbolo del parámetro con su valor actual encima, ambos en el color de su slider. */
const withValue = (param: keyof DistortionParams, symbol: string, value: string) =>
  `\\overset{${paint(param, value)}}{${paint(param, symbol)}}`

const brace = (tex: string, label: string) => `\\underbrace{${tex}}_{\\text{${label}}}`

/**
 * Una sola fórmula que explica y aplica a la vez:
 *   y[n] = (1 − m)·x[n] + m·sin(k·x[n])·sin(2π·f·n / fs)
 * cada parte con su nombre debajo y cada parámetro con su valor actual encima
 * (m como fracción con 2 decimales, k con 1 decimal, f entero).
 * En tres líneas para que quepa en el celular.
 */
export function formulaTex({ carrierHz, drive, mix }: DistortionParams, sampleRate: number | null): string {
  const m = withValue('mix', 'm', mix.toFixed(2))
  const k = withValue('drive', 'k', drive.toFixed(1))
  const f = withValue('carrierHz', 'f', String(carrierHz))
  const fs = sampleRate === null ? 'f_s' : `\\overset{${sampleRate}}{f_s}`

  const original = `(1-${m})\\,x[n]`
  const shaped = `${m}\\,\\sin\\big(${k}\\,x[n]\\big)`
  const carrier = `\\sin\\!\\left(\\dfrac{2\\pi\\,${f}\\,n}{${fs}}\\right)`
  return [
    '\\begin{aligned}',
    `y[n] &= ${brace(original, 'voz original')} \\\\[0.6em]`,
    `&\\quad + ${brace(shaped, 'forma de onda')} \\\\[0.6em]`,
    `&\\qquad\\quad \\cdot ${brace(carrier, 'portadora')}`,
    '\\end{aligned}',
  ].join('\n')
}
