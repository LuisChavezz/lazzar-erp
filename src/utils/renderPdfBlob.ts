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
 * Si falla la DESCARGA de un chunk (`isChunkLoadError`), se lanza un error con
 * un mensaje legible propio del PDF en vez del "Failed to load chunk …" del
 * bundler; el original queda en `cause`. Cualquier otro error —al evaluar el
 * módulo o al renderizar el PDF— se propaga tal cual.
 *
 * `loadRenderer` solo existe para las pruebas unitarias (un renderer falso);
 * los generadores nunca lo pasan.
 */
import { createElement, type ComponentType, type ReactElement } from "react";
// Solo el tipo: no mete la librería en el chunk de quien importa este módulo.
import type { DocumentProps } from "@react-pdf/renderer";
import { isChunkLoadError } from "./isChunkLoadError";

export const PDF_GENERATOR_LOAD_ERROR_MESSAGE =
  "No se pudo cargar el generador de PDF. Recarga la página e intenta de nuevo.";

/** Lo único que se usa de `@react-pdf/renderer` (misma firma que su `pdf`). */
export interface PdfRenderer {
  pdf(element: ReactElement<DocumentProps>): { toBlob(): Promise<Blob> };
}

export async function renderPdfBlob<P extends object>(
  loadDocument: () => Promise<ComponentType<P>>,
  props: P,
  loadRenderer: () => Promise<PdfRenderer> = () => import("@react-pdf/renderer"),
): Promise<Blob> {
  const [renderer, PdfDocument] = await Promise.all([loadRenderer(), loadDocument()]).catch(
    (error: unknown) => {
      throw isChunkLoadError(error)
        ? new Error(PDF_GENERATOR_LOAD_ERROR_MESSAGE, { cause: error })
        : error;
    },
  );

  // Cada documento de `src/pdfs/` es un componente cuya raíz es `<Document>`,
  // pero su elemento lleva SUS props, no las de `Document`; el tipo no puede
  // expresar esa relación (con JSX se perdía igual, como `JSX.Element`).
  return renderer.pdf(createElement(PdfDocument, props) as ReactElement<DocumentProps>).toBlob();
}
