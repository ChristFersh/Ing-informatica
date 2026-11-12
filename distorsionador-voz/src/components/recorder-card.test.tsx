import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { RecorderStatus } from '@/hooks/use-recorder'
import { RecorderCard } from './recorder-card'

const render = (status: RecorderStatus) =>
  renderToStaticMarkup(
    <RecorderCard status={status} original={null} error={null} onStart={() => {}} onStop={() => {}} />,
  )

/** El primer <button> del HTML, con sus atributos y su texto. */
const firstButton = (html: string) => html.match(/<button[^>]*>[\s\S]*?<\/button>/)?.[0] ?? ''

describe('RecorderCard', () => {
  it('mientras pide permiso deshabilita el botón y lo explica', () => {
    const button = firstButton(render('requesting'))

    expect(button).toContain('disabled=""')
    expect(button).toContain('Pidiendo permiso…')
  })

  it('en reposo deja el botón Grabar habilitado', () => {
    const button = firstButton(render('idle'))

    expect(button).not.toContain('disabled=""')
    expect(button).toContain('Grabar')
  })
})
