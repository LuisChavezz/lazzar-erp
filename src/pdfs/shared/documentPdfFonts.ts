/**
 * Fuentes de la plantilla base de documentos PDF (EC-858, EC-958).
 *
 * La Helvetica estándar de react-pdf solo codifica WinAnsi: cualquier otro
 * carácter que llegue del backend (una flecha en `observaciones`, "≥", "Œ"…)
 * desaparecía del PDF sin aviso. La base usa Arimo (SIL OFL 1.1, archivos y
 * licencia en `public/fonts/pdf/`), con las mismas métricas que Arial/Helvetica
 * para que tablas y tarjetas conserven sus anchos. Los símbolos que Arimo no
 * tiene (✓, ⇒, ★, ①, ⚠…) salen de `PdfSymbolsFallback`, un subconjunto de
 * fuentes Noto con las métricas verticales de Arimo (EC-958): los estilos piden
 * la pila `DOCUMENT_PDF_FONT_STACK` y textkit elige fuente por carácter. Los
 * emoji no los cubre ninguna: `stripPdfEmoji` los quita antes de renderizar.
 *
 * Dónde y cuándo se registran: en el navegador, justo antes de cada PDF,
 * `renderPdfBlob` usa `documentPdfFontLoader`, que descarga los archivos (a la
 * vez que los chunks), registra las dos familias juntas y reintenta tras un
 * fallo sin recargar (EC-942); así no pesa en ninguna pantalla. En Node (las
 * pruebas que maquetan un PDF real) no hay servidor que los sirva: se registran
 * aquí, al importar, por ruta de disco. El PDF de cotización (estilos propios,
 * fuera de la base) también usa la pila, vía `withDocumentPdfFont` y
 * `DOCUMENT_PDF_FONT_STACK` en `QuotePdfStyles.ts` (EC-892); el de factura pasó
 * a la base (EC-859).
 */
import { Font } from "@react-pdf/renderer";
import {
  DOCUMENT_PDF_FONT_FAMILY,
  DOCUMENT_PDF_FONT_FILES,
  DOCUMENT_PDF_FONT_STACK,
  documentPdfFontRegistrations,
} from "./documentPdfFontLoader";

export { DOCUMENT_PDF_FONT_FAMILY, DOCUMENT_PDF_FONT_STACK };

if (typeof window === "undefined") {
  documentPdfFontRegistrations(
    (index) => `${process.cwd()}/public/fonts/pdf/${DOCUMENT_PDF_FONT_FILES[index].file}`,
  ).forEach((registration) => Font.register(registration));
}

type PdfStyleEntry = { fontFamily?: string | string[] };

/**
 * Pasa una hoja de estilos de Helvetica a la pila de la base: `Helvetica` →
 * Arimo normal y `Helvetica-Bold` → Arimo en negritas, las dos con el respaldo
 * de símbolos detrás. La usan `DocumentPdfStyles` y `QuotePdfStyles` (EC-892),
 * que parten de `basePdfStyles`, así que esa hoja compartida no cambia.
 */
export function withDocumentPdfFont<Styles extends Record<string, PdfStyleEntry>>(styles: Styles): Styles {
  return Object.fromEntries(
    Object.entries(styles).map(([name, style]) => {
      if (style.fontFamily === "Helvetica-Bold") {
        return [name, { ...style, fontFamily: DOCUMENT_PDF_FONT_STACK, fontWeight: "bold" }];
      }
      if (style.fontFamily === "Helvetica") {
        return [name, { ...style, fontFamily: DOCUMENT_PDF_FONT_STACK }];
      }
      return [name, style];
    }),
  ) as Styles;
}
