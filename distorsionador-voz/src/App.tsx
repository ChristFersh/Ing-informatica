import { useEffect, useMemo, useState } from 'react'
import { BlobAudio } from '@/components/blob-audio'
import { DistortionControls } from '@/components/distortion-controls'
import { AudioBackground } from '@/components/audio-background'
import { RecorderCard } from '@/components/recorder-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRecorder } from '@/hooks/use-recorder'
import { decodeRecording, type MonoAudio } from '@/lib/decode-audio'
import { distortVoice, type DistortionParams } from '@/lib/distortion'
import { encodeWav } from '@/lib/wav'

const DEFAULT_PARAMS: DistortionParams = { carrierHz: 60, drive: 3, mix: 1 }

interface Decoded {
  source: Blob
  audio: MonoAudio | null
  error: string | null
}

export default function App() {
  const recorder = useRecorder()
  const [decoded, setDecoded] = useState<Decoded | null>(null)
  // `params` sigue al slider en vivo; `applied` cambia al soltarlo, así no recalculamos en cada píxel.
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [applied, setApplied] = useState(DEFAULT_PARAMS)

  useEffect(() => {
    const source = recorder.recording
    if (!source) return
    let cancelled = false
    decodeRecording(source)
      .then((audio) => {
        if (!cancelled) setDecoded({ source, audio, error: null })
      })
      .catch(() => {
        if (!cancelled) {
          setDecoded({ source, audio: null, error: 'No se pudo procesar la grabación. Intenta grabar de nuevo.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [recorder.recording])

  // Solo vale el resultado de la grabación actual (evita mostrar la anterior mientras decodifica).
  const current = decoded?.source === recorder.recording ? decoded : null
  const audio = current?.audio ?? null

  const distorted = useMemo(() => {
    if (!audio) return null
    const samples = distortVoice(audio.samples, audio.sampleRate, applied)
    return new Blob([encodeWav(samples, audio.sampleRate)], { type: 'audio/wav' })
  }, [audio, applied])

  return (
    <main className="relative min-h-svh">
      <AudioBackground recording={recorder.status === 'recording'} />
      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Distorsionador de voz</h1>
          <p className="text-sm text-muted-foreground">
            Graba, ajusta la función y escucha el resultado. Todo el cálculo corre en tu navegador.
          </p>
        </header>

        <RecorderCard
          status={recorder.status}
          original={recorder.recording}
          error={recorder.error ?? current?.error ?? null}
          onStart={recorder.start}
          onStop={recorder.stop}
        />

        <DistortionControls
          params={params}
          sampleRate={audio?.sampleRate ?? null}
          onChange={setParams}
          onCommit={setApplied}
        />

        <Card className="bg-card/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle>3. Escucha el resultado</CardTitle>
            <CardDescription>
              {distorted ? 'Voz distorsionada con los valores de arriba.' : 'Primero graba algo en el paso 1.'}
            </CardDescription>
          </CardHeader>
          {distorted && (
            <CardContent>
              <BlobAudio blob={distorted} label="Voz distorsionada" />
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  )
}
