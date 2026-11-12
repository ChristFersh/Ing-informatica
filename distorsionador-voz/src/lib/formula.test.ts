import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { PARAM_COLORS, formulaTex } from './formula'

/** Falla si el TeX no compila: así el test protege lo que se ve en pantalla. */
const render = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: 'error' })

/** Símbolo pintado con su valor actual encima, como lo arma la fórmula. */
const symbolWithValue = (color: string, value: string, symbol: string) =>
  `\\overset{\\textcolor{${color}}{${value}}}{\\textcolor{${color}}{${symbol}}}`

const PARAMS = { carrierHz: 60, drive: 3, mix: 0.7 }

/**
 * Deja la ecuación desnuda: quita alineación, llaves con nombre y espaciado, y reduce cada
 * parámetro decorado (valor encima + color) a su símbolo. Un símbolo sin su valor NO se reduce.
 */
const skeleton = (tex: string) =>
  tex
    .replace(/\\(begin|end)\{aligned\}/g, '')
    .replace(/\\\\\[[^\]]*\]/g, '')
    .replace(/\\underbrace\{/g, '')
    .replace(/\}_\{\\text\{[^}]*\}\}/g, '')
    .replace(/\\overset\{\\textcolor\{[^}]*\}\{[^}]*\}\}\{\\textcolor\{[^}]*\}\{([^}]*)\}\}/g, '$1')
    .replace(/\\overset\{\d+\}\{f_s\}/g, 'f_s')
    .replace(/\\(qquad|quad|big|left|right|[,!])/g, '')
    .replace(/[&\s]/g, '')

/** y[n] = (1 − m)·x[n] + m·sin(k·x[n])·sin(2π·f·n / fs): la de distortion.ts y el README. */
const CANONICAL = 'y[n] = (1-m) x[n] + m \\sin(k x[n]) \\cdot \\sin(\\dfrac{2 \\pi f n}{f_s})'.replace(/\s/g, '')

const count = (tex: string, piece: string) => tex.split(piece).length - 1

describe('formulaTex (una sola fórmula: partes nombradas + valores actuales)', () => {
  it('compila en KaTeX, con y sin frecuencia de muestreo', () => {
    expect(() => render(formulaTex(PARAMS, 44100))).not.toThrow()
    expect(() => render(formulaTex(PARAMS, null))).not.toThrow()
  })

  it('es una sola ecuación, no la general y la sustituida por separado', () => {
    expect(formulaTex(PARAMS, 44100).match(/y\[n\]/g)).toHaveLength(1)
  })

  it('nombra cada parte con una llave', () => {
    const tex = formulaTex(PARAMS, 44100)
    expect(tex).toContain('_{\\text{voz original}}')
    expect(tex).toContain('_{\\text{forma de onda}}')
    expect(tex).toContain('_{\\text{portadora}}')
  })

  it('muestra cada parámetro con su valor actual encima, en el color de su slider', () => {
    const tex = formulaTex(PARAMS, 44100)
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.mix, '0.70', 'm'))
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.drive, '3.0', 'k'))
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.carrierHz, '60', 'f'))
  })

  // Guarda (caracterización): formulaTex ya era correcta; el rojo se demostró contra mutantes.
  it('sin decoraciones es la ecuación canónica, con y sin frecuencia de muestreo', () => {
    expect(skeleton(formulaTex(PARAMS, 44100))).toBe(CANONICAL)
    expect(skeleton(formulaTex(PARAMS, null))).toBe(CANONICAL)
  })

  // Guarda (caracterización): m aparece dos veces en la ecuación y las dos llevan su valor.
  it('cada aparición de un parámetro lleva su valor: m dos veces, k y f una', () => {
    const tex = formulaTex(PARAMS, 44100)
    expect(count(tex, symbolWithValue(PARAM_COLORS.mix, '0.70', 'm'))).toBe(2)
    expect(count(tex, symbolWithValue(PARAM_COLORS.drive, '3.0', 'k'))).toBe(1)
    expect(count(tex, symbolWithValue(PARAM_COLORS.carrierHz, '60', 'f'))).toBe(1)
  })

  it('el valor sigue al slider: m como fracción con 2 decimales, k con 1 decimal, f entero', () => {
    const tex = formulaTex({ carrierHz: 125, drive: 7.25, mix: 0.3 }, 44100)
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.mix, '0.30', 'm'))
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.drive, '7.3', 'k'))
    expect(tex).toContain(symbolWithValue(PARAM_COLORS.carrierHz, '125', 'f'))
  })

  it('con grabación muestra la frecuencia de muestreo sobre f_s; sin grabación deja solo el símbolo', () => {
    expect(formulaTex(PARAMS, 44100)).toContain('\\overset{44100}{f_s}')
    const withoutRecording = formulaTex(PARAMS, null)
    expect(withoutRecording).toContain('{f_s}')
    expect(withoutRecording).not.toContain('\\overset{44100}')
    expect(withoutRecording).not.toContain('null')
  })
})
