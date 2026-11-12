import { Mic, Square } from 'lucide-react'
import { BlobAudio } from '@/components/blob-audio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { RecorderStatus } from '@/hooks/use-recorder'

interface RecorderCardProps {
  status: RecorderStatus
  original: Blob | null
  error: string | null
  onStart: () => void
  onStop: () => void
}

export function RecorderCard({ status, original, error, onStart, onStop }: RecorderCardProps) {
  const isRecording = status === 'recording'
  const isRequesting = status === 'requesting'

  return (
    <Card className="bg-card/80 backdrop-blur-md">
      <CardHeader>
        <CardTitle>1. Graba tu voz</CardTitle>
        <CardDescription>El audio no sale de tu navegador.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <Button variant="destructive" onClick={onStop}>
              <Square /> Detener
            </Button>
          ) : (
            <Button onClick={onStart} disabled={isRequesting}>
              <Mic /> {isRequesting ? 'Pidiendo permiso…' : original ? 'Grabar de nuevo' : 'Grabar'}
            </Button>
          )}
          {isRecording && (
            <Badge variant="secondary" className="gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-red-500" /> Grabando…
            </Badge>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {original && !isRecording && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Original</p>
            <BlobAudio blob={original} label="Grabación original" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
