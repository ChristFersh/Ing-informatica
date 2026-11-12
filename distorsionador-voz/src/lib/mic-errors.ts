const MESSAGES: Record<string, string> = {
  NotAllowedError: 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.',
  NotFoundError: 'No se encontró ningún micrófono conectado.',
  NotReadableError: 'El micrófono está siendo usado por otra aplicación.',
  SecurityError: 'El navegador bloqueó el micrófono: abre la página en HTTPS o en localhost.',
}

/** Traduce los errores de getUserMedia/MediaRecorder a un mensaje para el usuario. */
export function describeMicError(error: unknown): string {
  if (error instanceof Error && MESSAGES[error.name]) return MESSAGES[error.name]
  const detail = error instanceof Error ? error.message : String(error)
  return `No se pudo usar el micrófono: ${detail}`
}
