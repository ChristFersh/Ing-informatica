import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { PARAM_COLORS, formulaTex } from './formula'

/** Falla si el TeX no compila: así el test protege lo que se ve en pantalla. */
const render = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: 'error' })

/** Símbolo pintado con su valor actual encima, como lo arma la fórmula. */
const symbolWithValue = (color: string, value: string, symbol: string) =>
  `\\overset{\\textcolor{${color}}{${value}}}{\\textcolor{${color}}{${symbol}}}`

const PARAMS = { carrierHz: 60, drive: 3, mix: 0.7 }

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

  it('el valor sigue al slider (redondeado como en pantalla)', () => {
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
