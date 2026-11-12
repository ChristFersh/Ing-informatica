import { useEffect, useRef } from 'react'
import { audioEngine } from '@/lib/browser-audio-engine'

/** Reproductor <audio> para un Blob en memoria. Crea la URL temporal y la libera al cambiar o desmontar. */
export function BlobAudio({ blob, label }: { blob: Blob; label: string }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return (
    <audio
      ref={ref}
      controls
      aria-label={label}
      className="w-full"
      // Al darle ▶ (un gesto del usuario) se conecta al analizador que mueve el fondo.
      onPlay={(event) => audioEngine.attachElement(event.currentTarget)}
    />
  )
}
