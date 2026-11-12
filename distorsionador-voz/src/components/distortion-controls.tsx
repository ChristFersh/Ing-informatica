import type { CSSProperties } from 'react'
import { Formula } from '@/components/formula'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { DistortionParams } from '@/lib/distortion'
import { PARAM_COLORS, formulaTex } from '@/lib/formula'

interface ParamSliderProps {
  id: string
  symbol: string
  name: string
  color: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
  onCommit: (value: number) => void
}

function ParamSlider(props: ParamSliderProps) {
  const { id, symbol, name, color, hint, value, min, max, step, display, onChange, onCommit } = props

  return (
    <div className="space-y-2" style={{ '--param': color } as CSSProperties}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          <span className="font-serif text-base font-semibold italic text-(--param)">{symbol}</span>
          {name}
        </Label>
        <span className="font-mono text-sm tabular-nums text-(--param)">{display}</span>
      </div>
      <Slider
        id={id}
        aria-label={`${symbol}: ${name}`}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit(v)}
        className="**:data-[slot=slider-range]:bg-(--param) **:data-[slot=slider-thumb]:border-(--param)"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

interface DistortionControlsProps {
  params: DistortionParams
  sampleRate: number | null
  onChange: (params: DistortionParams) => void
  /** Recibe el valor final al soltar el slider (con teclado llega en el mismo tick que onChange). */
  onCommit: (params: DistortionParams) => void
}

export function DistortionControls({ params, sampleRate, onChange, onCommit }: DistortionControlsProps) {
  const { carrierHz, drive, mix } = params

  return (
    <Card className="bg-card/80 backdrop-blur-md">
      <CardHeader>
        <CardTitle>2. Ajusta la distorsión</CardTitle>
        <CardDescription>
          Cada muestra x[n] de tu voz pasa por esta función. Encima de cada letra, su valor actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-background/70 px-3 py-4">
          <Formula tex={formulaTex(params, sampleRate)} />
        </div>

        <ParamSlider
          id="carrier"
          symbol="f"
          name="Frecuencia de la portadora"
          color={PARAM_COLORS.carrierHz}
          hint="Modulación en anillo. Valores bajos (30–80 Hz) dan voz de robot; altos, voz metálica."
          value={carrierHz}
          min={0}
          max={1000}
          step={1}
          display={`${carrierHz} Hz`}
          onChange={(v) => onChange({ ...params, carrierHz: v })}
          onCommit={(v) => onCommit({ ...params, carrierHz: v })}
        />
        <ParamSlider
          id="drive"
          symbol="k"
          name="Intensidad del seno"
          color={PARAM_COLORS.drive}
          hint="sin(k·x) dobla la onda: más k, más armónicos y voz más áspera."
          value={drive}
          min={0.5}
          max={12}
          step={0.1}
          display={drive.toFixed(1)}
          onChange={(v) => onChange({ ...params, drive: v })}
          onCommit={(v) => onCommit({ ...params, drive: v })}
        />
        <ParamSlider
          id="mix"
          symbol="m"
          name="Mezcla"
          color={PARAM_COLORS.mix}
          hint="0 = voz original, 1 = solo la señal distorsionada."
          value={mix}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(mix * 100)} %`}
          onChange={(v) => onChange({ ...params, mix: v })}
          onCommit={(v) => onCommit({ ...params, mix: v })}
        />
      </CardContent>
    </Card>
  )
}
