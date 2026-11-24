/**
 * Fuente de la plantilla base de documentos PDF (EC-858).
 *
 * La Helvetica estándar de react-pdf solo codifica WinAnsi: cualquier otro
 * carácter que llegue del backend (una flecha en `observaciones`, "≥", "Œ"…)
 * desaparecía del PDF sin aviso. La base usa Arimo (SIL OFL 1.1, archivos y
 * licencia en `public/fonts/pdf/`), con las mismas métricas que Arial/Helvetica
 * para que tablas y tarjetas conserven sus anchos. No cubre emoji ni ✓.
 *
 * Dónde y cuándo se registra: en el navegador, justo antes de cada PDF,
 * `renderPdfBlob` llama a `ensureDocumentPdfFonts` (`documentPdfFontLoader`),
 * que descarga los archivos y reintenta tras un fallo sin recargar (EC-942);
 * así no pesa en ninguna pantalla. En Node (las pruebas que maquetan un PDF
 * real) no hay servidor que los sirva: se registran aquí, al importar, por
 * ruta de disco. El PDF de cotización (estilos propios, fuera de la base)
 * también usa Arimo, vía `withDocumentPdfFont` en `QuotePdfStyles.ts`
 * (EC-892); el de factura pasó a la base (EC-859).
 */
import { Font } from "@react-pdf/renderer";
import { DOCUMENT_PDF_FONT_FAMILY, DOCUMENT_PDF_FONT_FILES } from "./documentPdfFontLoader";

export { DOCUMENT_PDF_FONT_FAMILY };

if (typeof window === "undefined") {
  Font.register({
    family: DOCUMENT_PDF_FONT_FAMILY,
    fonts: DOCUMENT_PDF_FONT_FILES.map(({ file, fontWeight }) => ({
      src: `${process.cwd()}/public/fonts/pdf/${file}`,
      fontWeight,
    })),
  });
}

type PdfStyleEntry = { fontFamily?: string | string[] };

/**
 * Pasa una hoja de estilos de Helvetica a la fuente de la base: `Helvetica` →
 * Arimo normal y `Helvetica-Bold` → Arimo en negritas. La usan
 * `DocumentPdfStyles` y `QuotePdfStyles` (EC-892), que parten de
 * `basePdfStyles`, así que esa hoja compartida no cambia.
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
