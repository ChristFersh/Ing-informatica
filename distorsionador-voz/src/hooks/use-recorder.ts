import { useCallback, useEffect, useRef, useState } from 'react'
import { audioEngine } from '@/lib/browser-audio-engine'
import { createRecorder, INITIAL_RECORDER_STATE, type Recorder, type RecorderState } from '@/lib/recorder'

export type { RecorderStatus } from '@/lib/recorder'

/** Adaptador React de `createRecorder`: le inyecta las APIs del navegador y refleja su estado. */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>(INITIAL_RECORDER_STATE)
  const recorderRef = useRef<Recorder | null>(null)

  // Se crea en el efecto (no en el render) para que el desmontaje simulado de StrictMode no deje
  // una grabadora ya liberada. Al desmontar se liberan el micrófono y cualquier permiso pendiente.
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices
    const recorder = createRecorder<MediaStream>({
      getUserMedia: mediaDevices?.getUserMedia ? (constraints) => mediaDevices.getUserMedia(constraints) : undefined,
      createMediaRecorder: (stream) => new MediaRecorder(stream),
      onChange: setState,
      // El fondo animado escucha el micrófono mientras se graba.
      onStream: (stream) => (stream ? audioEngine.attachStream(stream) : audioEngine.detachStream()),
    })
    recorderRef.current = recorder
    return () => {
      recorder.dispose()
      recorderRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    // Dentro del clic: el navegador solo deja arrancar el AudioContext tras un gesto del usuario.
    audioEngine.resume()
    void recorderRef.current?.start()
  }, [])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
  }, [])

  return { ...state, start, stop }
}
