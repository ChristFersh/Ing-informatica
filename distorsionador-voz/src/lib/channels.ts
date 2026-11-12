/** Mezcla varios canales en uno promediando muestra por muestra. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0)
    return new Float32Array(0)

  const length = channels[0].length
  const mono = new Float32Array(length)

  for (const channel of channels) {
    for (let i = 0; i < length; i++)
      mono[i] += channel[i] / channels.length
  }
  return mono
}
