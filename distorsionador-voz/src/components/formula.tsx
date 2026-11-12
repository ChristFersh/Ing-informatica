import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** Ecuación con tipografía matemática (KaTeX). Incluye MathML para lectores de pantalla. */
export function Formula({ tex }: { tex: string }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: true, throwOnError: false }), [tex])

  return (
    <div
      className="overflow-x-auto overflow-y-hidden py-1 text-[0.95rem] sm:text-xl [&_.katex-display]:my-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
