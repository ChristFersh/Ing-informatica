import { describe, expect, it } from 'vitest'
import { describeMicError } from './mic-errors'

const domError = (name: string) => new DOMException('detalle técnico', name)

describe('describeMicError', () => {
  it('explica el permiso denegado', () => {
    expect(describeMicError(domError('NotAllowedError'))).toBe(
      'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.',
    )
  })

  it('explica que no hay micrófono', () => {
    expect(describeMicError(domError('NotFoundError'))).toBe('No se encontró ningún micrófono conectado.')
  })

  it('explica que el micrófono está ocupado', () => {
    expect(describeMicError(domError('NotReadableError'))).toBe(
      'El micrófono está siendo usado por otra aplicación.',
    )
  })

  it('explica que hace falta HTTPS cuando el navegador bloquea el acceso', () => {
    expect(describeMicError(domError('SecurityError'))).toBe(
      'El navegador bloqueó el micrófono: abre la página en HTTPS o en localhost.',
    )
  })

  it('cae en un mensaje genérico con el detalle del error', () => {
    expect(describeMicError(new Error('algo raro'))).toBe('No se pudo usar el micrófono: algo raro')
    expect(describeMicError('texto suelto')).toBe('No se pudo usar el micrófono: texto suelto')
  })
})
