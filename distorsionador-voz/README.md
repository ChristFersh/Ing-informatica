# Distorsionador de voz

App web (Vite + React + shadcn/ui) que graba tu voz y la distorsiona con una función
trigonométrica. Todo el cálculo corre en el navegador: el audio nunca sale del equipo.

**Pruébala:** https://christfersh.github.io/distorsionador-voz/

## La función

```
y[n] = (1 − m) · x[n]  +  m · sin(k · x[n]) · sin(2π · f · n / fs)
```

| Símbolo | Qué es | Rango en la app |
|---|---|---|
| `x[n]` | muestra n de la grabación, entre −1 y 1 | — |
| `n` | índice de la muestra (el tiempo es `n / fs` segundos) | — |
| `fs` | frecuencia de muestreo (44100 o 48000 Hz) | la del navegador |
| `k` | intensidad del seno (*drive*) | 0.5 – 12 |
| `f` | frecuencia de la portadora | 0 – 1000 Hz |
| `m` | mezcla: 0 = voz original, 1 = solo distorsión | 0 – 1 |

- **`sin(k · x[n])` — waveshaping.** El seno "dobla" la onda: aplana los picos y agrega
  armónicos. Con `k` grande la voz suena áspera.
- **`sin(2π · f · n / fs)` — modulación en anillo.** Multiplicar la voz por un tono puro
  desplaza sus frecuencias ±f. Con `f` entre 30 y 80 Hz suena a robot; más alto, metálica.
- **No satura:** si `|x| ≤ 1`, entonces `|y| ≤ (1 − m) + m = 1`.

Implementación: [`src/lib/distortion.ts`](src/lib/distortion.ts).

En la app se muestra como **una sola fórmula** (`src/lib/formula.ts`, con KaTeX): cada parte con
su nombre debajo (voz original, forma de onda, portadora) y cada parámetro con su valor actual
encima, en el color de su slider. Al mover un slider cambia el número sobre su letra.

## Fondo animado

Detrás de la interfaz hay 4 ondas seno en capas (`src/components/audio-background.tsx`,
matemática en `src/lib/visualizer.ts`). En reposo casi no se mueven; **al grabar** siguen al
micrófono (tonos rojos) y **al reproducir** siguen al audio que suena (tonos lila/azul/cian).

Cada capa dibuja, para cada posición horizontal `u ∈ [0, 1]`:

```
y(u) = base + A · [ sin(2π·c·u + φ) + ½·sin(2π·1.7c·u − 1.3φ) ] / 1.5
A    = A_reposo + A_reactiva · E
```

- `c` ondulaciones a lo ancho; `φ` fase que avanza con el tiempo (la onda viaja).
- Sumar dos senos de frecuencias no múltiplas da una forma orgánica que no se repite igual.
- `E` (energía, 0 a 1) sale del sonido: un `AnalyserNode` hace la FFT y cada capa escucha
  una banda (graves 60–250 Hz, medios 250–1000, 1–3 kHz, 3–8 kHz).
  El bin de la FFT de una frecuencia es `round(f · fftSize / fs)`.
- Nivel de volumen: `RMS = √( Σ x[n]² / N )` (una senoidal de amplitud A da A/√2).
- Para que no tiemble, `E` se suaviza: `E ← E + (objetivo − E)·(1 − e^(−dt/τ))`, con τ corto
  al subir (reacciona rápido) y largo al bajar (cae despacio).
- La fase avanza `φ ← φ + dt · velocidad · (0.3 + actividad + 3E)`: más sonido, más rápido.
- El micrófono va al analizador pero **no** a los parlantes, para que no haya acople.
- Con "reducir movimiento" activado en el sistema, las ondas no viajan (solo cambian de altura).

## Cómo correrlo

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm test     # pruebas de la función, el WAV, el grabador, el motor de audio y el fondo animado
```

El micrófono solo funciona en `localhost` o HTTPS.

**Despliegue:** cada push a `main` corre `.github/workflows/deploy.yml`: instala con pnpm,
corre las pruebas, compila (`base: './'` en Vite, para servir bajo `/distorsionador-voz/`) y
publica `dist/` en GitHub Pages (HTTPS, así que el micrófono funciona).

## Flujo

1. `MediaRecorder` graba el micrófono → `Blob` (webm/ogg/mp4 según navegador).
2. `AudioContext.decodeAudioData` lo pasa a muestras PCM; se mezcla a mono.
3. `distortVoice` aplica la fórmula muestra por muestra.
4. `encodeWav` arma un WAV de 16 bits para reproducirlo en `<audio>`.

## Arquitectura (decidida al crear el proyecto)

- **Capas simples:**
  - `src/lib/` — lógica pura, sin navegador, con pruebas (`*.test.ts`): `distortion`,
    `wav`, `channels`, `mic-errors`, `recorder`, `audio-engine`, `visualizer`, `formula`.
    `decode-audio.ts` y `browser-audio-engine.ts` son las únicas que tocan Web Audio real.
  - `src/hooks/` — `use-recorder` (MediaRecorder + permisos de micrófono).
  - `src/components/` — UI; `ui/` es código generado por shadcn.
- **Stack:** TypeScript + Vitest.
- **Datos:** solo en memoria; nada se guarda ni se envía. Al recargar se pierde la grabación.
- **Repo:** subcarpeta de `informatica-proyectos`.
