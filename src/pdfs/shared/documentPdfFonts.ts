/**
 * Fuente de la plantilla base de documentos PDF (EC-858).
 *
 * La Helvetica estándar de react-pdf solo codifica WinAnsi: cualquier otro
 * carácter que llegue del backend (una flecha en `observaciones`, "≥", "Œ"…)
 * desaparecía del PDF sin aviso. La base usa Arimo (SIL OFL 1.1, archivos y
 * licencia en `public/fonts/pdf/`), con las mismas métricas que Arial/Helvetica
 * para que tablas y tarjetas conserven sus anchos. No cubre emoji ni ✓.
 *
 * Solo se REGISTRA aquí; react-pdf descarga el archivo al generar un PDF, así
 * que no pesa en ninguna pantalla. Los PDF de cotización y factura (estilos
 * propios, fuera de la base) siguen en Helvetica.
 */
import { Font } from "@react-pdf/renderer";

/** Familia de la base; los estilos la usan con `fontWeight` normal o `"bold"`. */
export const DOCUMENT_PDF_FONT_FAMILY = "Arimo";

/**
 * Donde están los archivos: en el navegador, la URL de `public/`; en Node (las
 * pruebas que maquetan un PDF real), la misma carpeta en disco, porque ahí no
 * hay servidor que la sirva.
 */
export const documentPdfFontBaseUrl = (): string =>
  typeof window === "undefined" ? `${process.cwd()}/public/fonts/pdf` : "/fonts/pdf";

/** Registra los dos pesos de la base. */
function registerDocumentPdfFonts(baseUrl: string): void {
  Font.register({
    family: DOCUMENT_PDF_FONT_FAMILY,
    fonts: [
      { src: `${baseUrl}/Arimo-Regular.ttf`, fontWeight: "normal" },
      { src: `${baseUrl}/Arimo-Bold.ttf`, fontWeight: "bold" },
    ],
  });
}

registerDocumentPdfFonts(documentPdfFontBaseUrl());

type PdfStyleEntry = { fontFamily?: string | string[] };

/**
 * Pasa una hoja de estilos de Helvetica a la fuente de la base: `Helvetica` →
 * Arimo normal y `Helvetica-Bold` → Arimo en negritas. La usa
 * `DocumentPdfStyles`, que parte de `basePdfStyles` (compartida con cotización
 * y factura, que siguen en Helvetica), así que el cambio queda solo en la base.
 */
export function withDocumentPdfFont<Styles extends Record<string, PdfStyleEntry>>(styles: Styles): Styles {
  return Object.fromEntries(
    Object.entries(styles).map(([name, style]) => {
      if (style.fontFamily === "Helvetica-Bold") {
        return [name, { ...style, fontFamily: DOCUMENT_PDF_FONT_FAMILY, fontWeight: "bold" }];
      }
      if (style.fontFamily === "Helvetica") {
        return [name, { ...style, fontFamily: DOCUMENT_PDF_FONT_FAMILY }];
      }
      return [name, style];
    }),
  ) as Styles;
}
