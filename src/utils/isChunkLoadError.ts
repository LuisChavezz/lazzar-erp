/**
 * ¿Es el fallo al DESCARGAR un chunk de un `import()` dinámico? Turbopack y
 * webpack lo lanzan con `name === "ChunkLoadError"` (red caída, o un deploy
 * nuevo que ya no sirve los chunks de la versión cargada en la pestaña).
 *
 * Un error al evaluar el módulo ya descargado conserva su propio `name`, así
 * que no entra aquí: es un bug, no algo que se arregle recargando.
 */
export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && error.name === "ChunkLoadError";
