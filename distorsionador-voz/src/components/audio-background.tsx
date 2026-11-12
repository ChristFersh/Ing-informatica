import { useEffect, useRef } from 'react'
import { audioEngine } from '@/lib/browser-audio-engine'
import { bandLevels, follow, rms, waveHeight, type WaveLayer } from '@/lib/visualizer'

type Mode = 'idle' | 'recording' | 'playing'

interface Layer extends WaveLayer {
  /** Banda de frecuencias (Hz) que mueve esta capa. */
  band: [number, number]
  /** Velocidad base de la fase (rad/s). */
  speed: number
}

// De atrás hacia adelante: graves arriba y lentas, agudos abajo y rápidas.
const LAYERS: Layer[] = [
  { baseline: 0.58, cycles: 0.8, idleAmplitude: 0.03, reactiveAmplitude: 0.2, band: [60, 250], speed: 0.4 },
  { baseline: 0.68, cycles: 1.3, idleAmplitude: 0.025, reactiveAmplitude: 0.16, band: [250, 1000], speed: 0.6 },
  { baseline: 0.77, cycles: 1.9, idleAmplitude: 0.02, reactiveAmplitude: 0.12, band: [1000, 3000], speed: 0.85 },
  { baseline: 0.86, cycles: 2.6, idleAmplitude: 0.015, reactiveAmplitude: 0.09, band: [3000, 8000], speed: 1.1 },
]

const HUES: Record<Mode, number[]> = {
  idle: [230, 215, 200, 190],
  recording: [350, 8, 22, 335],
  playing: [265, 228, 192, 165],
}

/** Ondas seno de fondo: se calman en reposo, siguen el micrófono al grabar y el audio al reproducir. */
export function AudioBackground({ recording }: { recording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recordingRef = useRef(recording)

  useEffect(() => {
    recordingRef.current = recording
  }, [recording])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const phases = LAYERS.map((_, i) => i * 1.7)
    const energies = LAYERS.map(() => 0)
    const hues = [...HUES.idle]
    let activity = 0
    let spectrum: Uint8Array<ArrayBuffer> | null = null
    let waveform: Float32Array<ArrayBuffer> | null = null
    let last = performance.now()
    let raf = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      const mode: Mode = recordingRef.current ? 'recording' : audioEngine.isPlaying() ? 'playing' : 'idle'
      const analyser = audioEngine.analyser
      const sampleRate = audioEngine.sampleRate
      let bands = LAYERS.map(() => 0)
      let level = 0
      if (mode !== 'idle' && analyser && sampleRate) {
        spectrum ??= new Uint8Array(analyser.frequencyBinCount)
        waveform ??= new Float32Array(analyser.fftSize)
        analyser.getByteFrequencyData(spectrum)
        analyser.getFloatTimeDomainData(waveform)
        bands = bandLevels(spectrum, sampleRate, analyser.fftSize, LAYERS.map((layer) => layer.band))
        level = rms(waveform)
      }

      activity = follow(activity, mode === 'idle' ? 0 : 1, dt, 0.15, 0.8)
      const motion = reduceMotion.matches ? 0 : 1
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      LAYERS.forEach((layer, i) => {
        // Energía de la capa: su banda del espectro, más un empujón por el volumen total.
        const target = mode === 'idle' ? 0 : Math.min(1, bands[i] * 1.2 + level * 2)
        energies[i] = follow(energies[i], target, dt, 0.05, 0.35)
        phases[i] += dt * layer.speed * (0.3 + activity + energies[i] * 3) * motion
        hues[i] = follow(hues[i], HUES[mode][i], dt, 0.4, 0.4)

        const saturation = 20 + 60 * activity
        ctx.beginPath()
        const steps = 96
        for (let s = 0; s <= steps; s++) {
          const u = s / steps
          const y = waveHeight(u, phases[i], layer, energies[i]) * height
          if (s === 0) ctx.moveTo(0, y)
          else ctx.lineTo(u * width, y)
        }
        ctx.strokeStyle = `hsl(${hues[i]} ${saturation}% 50% / ${0.25 + 0.4 * activity})`
        ctx.lineWidth = 2 * (canvas.width / Math.max(canvas.clientWidth, 1))
        ctx.stroke()

        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        ctx.fillStyle = `hsl(${hues[i]} ${saturation}% 62% / ${0.1 + 0.08 * activity})`
        ctx.fill()
      })

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full" />
}
