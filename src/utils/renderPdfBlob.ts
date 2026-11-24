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
 * bundler; el original queda en `cause`. Lo mismo si falla la descarga de la
 * fuente del PDF (`isPdfFontLoadError`): la Arimo de `/fonts/pdf`, que se
 * registra justo antes de renderizar (`ensureDocumentPdfFonts`, EC-942) y se
 * vuelve a pedir en el siguiente intento, sin recargar la página. Cualquier
 * otro error —al evaluar el módulo o al renderizar el PDF— se propaga tal cual.
 *
 * La lógica vive en `renderPdfBlobWith`, que además recibe de dónde cargar el
 * renderer: lo usan las pruebas unitarias con uno falso. Los generadores usan
 * `renderPdfBlob`, que carga `@react-pdf/renderer`.
 */
import { createElement, type ComponentType, type ReactElement } from "react";
// Solo el tipo: no mete la librería en el chunk de quien importa este módulo.
import type { DocumentProps } from "@react-pdf/renderer";
// Sin `@react-pdf/*`: recibe el `Font` del renderer ya cargado.
import {
  ensureDocumentPdfFonts,
  PdfFontLoadError,
  type PdfFontRegistry,
} from "@/src/pdfs/shared/documentPdfFontLoader";
import { isChunkLoadError } from "./isChunkLoadError";

export const PDF_GENERATOR_LOAD_ERROR_MESSAGE =
  "No se pudo cargar el generador de PDF. Recarga la página e intenta de nuevo.";

/** Sin recargar: el siguiente intento vuelve a descargar la fuente (EC-942). */
export const PDF_FONT_LOAD_ERROR_MESSAGE = "No se pudo cargar la fuente del PDF. Intenta de nuevo.";

/**
 * ¿Falló la descarga de la fuente? La nuestra (`ensureDocumentPdfFonts`)
 * lanza `PdfFontLoadError` por cualquier fallo: sin red, una respuesta que no
 * es `ok` o una que no es una fuente. Las otras dos ramas cubren a react-pdf si
 * llegara a pedir una fuente por su cuenta: sin red, `fetch` lanza un
 * `TypeError` cuyo texto depende del navegador (Chrome "Failed to fetch", o
 * "network error" si la descarga se corta a medias; Firefox "NetworkError when
 * attempting to fetch resource."; Safari "Load failed"), y si llega otra cosa
 * fontkit lanza "Unknown font format". Las imágenes que fallan no llegan aquí:
 * react-pdf las omite sin lanzar.
 */
export const isPdfFontLoadError = (error: unknown): boolean =>
  error instanceof PdfFontLoadError ||
  (error instanceof Error &&
    ((error instanceof TypeError && /failed to fetch|network ?error|load failed/i.test(error.message)) ||
      error.message === "Unknown font format"));

const toPdfFontLoadError = (error: unknown): unknown =>
  isPdfFontLoadError(error) ? new Error(PDF_FONT_LOAD_ERROR_MESSAGE, { cause: error }) : error;

/** Lo único que se usa de `@react-pdf/renderer` (misma firma que su `pdf` y su `Font`). */
export interface PdfRenderer {
  pdf(element: ReactElement<DocumentProps>): { toBlob(): Promise<Blob> };
  Font: PdfFontRegistry;
}

export function renderPdfBlob<P extends object>(
  loadDocument: () => Promise<ComponentType<P>>,
  props: P,
): Promise<Blob> {
  return renderPdfBlobWith(() => import("@react-pdf/renderer"), loadDocument, props);
}

/**
 * `renderPdfBlob` con el renderer (y el registro de la fuente) inyectables,
 * para las pruebas unitarias.
 */
export async function renderPdfBlobWith<P extends object>(
  loadRenderer: () => Promise<PdfRenderer>,
  loadDocument: () => Promise<ComponentType<P>>,
  props: P,
  ensureFonts: (font: PdfFontRegistry) => Promise<void> = ensureDocumentPdfFonts,
): Promise<Blob> {
  const [renderer, PdfDocument] = await Promise.all([loadRenderer(), loadDocument()]).catch(
    (error: unknown) => {
      throw isChunkLoadError(error)
        ? new Error(PDF_GENERATOR_LOAD_ERROR_MESSAGE, { cause: error })
        : error;
    },
  );

  // Antes de renderizar: si falla, no se registra nada y el siguiente intento
  // la vuelve a descargar.
  await ensureFonts(renderer.Font).catch((error: unknown) => {
    throw toPdfFontLoadError(error);
  });

  // Cada documento de `src/pdfs/` es un componente cuya raíz es `<Document>`,
  // pero su elemento lleva SUS props, no las de `Document`; el tipo no puede
  // expresar esa relación (con JSX se perdía igual, como `JSX.Element`).
  return renderer
    .pdf(createElement(PdfDocument, props) as ReactElement<DocumentProps>)
    .toBlob()
    .catch((error: unknown) => {
      throw toPdfFontLoadError(error);
    });
}
