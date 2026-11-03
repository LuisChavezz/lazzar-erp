/**
 * Renderiza un documento de `@react-pdf/renderer` a `Blob`, cargando la
 * librería Y el documento con `import()` dinámico.
 *
 * Única implementación del patrón de EC-695 que comparten los generadores
 * `*PdfBlob` (cotización, factura, orden de compra y reportes de inventario).
 * Cada documento importa los primitivos de react-pdf de forma estática (y sus
 * estilos, `StyleSheet`), así que importarlo arriba en el generador metía la
 * librería entera (~1.5 MB) en el chunk inicial de cada pantalla que ofrece
 * el PDF, aunque nadie lo generara (EC-700). Así solo se descarga al generar
 * uno.
 *
 * `loadDocument` es una función que hace el `import()` del documento en el
 * propio generador: la ruta tiene que quedar LITERAL en quien llama para que
 * el bundler pueda partir ese chunk. Recibir la ruta como string lo impediría.
 *
 * Si falla la DESCARGA de un chunk (red caída, o un deploy nuevo que ya no
 * sirve los chunks de la versión cargada en la pestaña), se lanza un error
 * con un mensaje legible en vez del "Failed to load chunk …" del bundler;
 * el original queda en `cause`. Cualquier otro error —al evaluar el módulo o
 * al renderizar el PDF— se propaga tal cual.
 */
import type { ComponentType } from "react";

export const PDF_GENERATOR_LOAD_ERROR_MESSAGE =
  "No se pudo cargar el generador de PDF. Recarga la página e intenta de nuevo.";

// Turbopack y webpack marcan así el fallo al descargar un chunk de un `import()`.
const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error && error.name === "ChunkLoadError";

export async function renderPdfBlob<P extends object>(
  loadDocument: () => Promise<ComponentType<P>>,
  props: P,
): Promise<Blob> {
  let renderer: typeof import("@react-pdf/renderer");
  let PdfDocument: ComponentType<P>;

  try {
    [renderer, PdfDocument] = await Promise.all([
      import("@react-pdf/renderer"),
      loadDocument(),
    ]);
  } catch (error) {
    if (isChunkLoadError(error)) {
      throw new Error(PDF_GENERATOR_LOAD_ERROR_MESSAGE, { cause: error });
    }
    throw error;
  }

  return renderer.pdf(<PdfDocument {...props} />).toBlob();
}
