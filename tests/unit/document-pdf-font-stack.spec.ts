import { expect, test } from "@playwright/test";
import { pdfStyles } from "@/src/pdfs/QuotePdfStyles";
import { documentPdfStyles } from "@/src/pdfs/shared/DocumentPdfStyles";
import { listPdfStyles } from "@/src/pdfs/ListPdfDocument";
import { DOCUMENT_PDF_FONT_STACK } from "@/src/pdfs/shared/documentPdfFontLoader";

/**
 * EC-958: los símbolos que Arimo no tiene (✓, ⇒, ★…) solo se imprimen si el
 * estilo pide la pila `[Arimo, PdfSymbolsFallback]`. Un estilo que nombre a
 * Arimo sola (o a Helvetica, que `withDocumentPdfFont` no tradujo) los vuelve
 * a borrar sin aviso, así que cada `fontFamily` de las hojas de la base y de la
 * cotización tiene que ser la pila, en una copia propia (la compartida está
 * congelada).
 */

// Los listados exportados (EC-959) ponen la pila en la página y la heredan.
const SHEETS = {
  cotización: pdfStyles,
  base: documentPdfStyles,
  "listado compact": listPdfStyles.compact,
  "listado standard": listPdfStyles.standard,
} as const;

for (const [nombre, sheet] of Object.entries(SHEETS)) {
  test(`cada fontFamily de la hoja ${nombre} es la pila de fuentes`, () => {
    const entries = Object.entries(sheet as Record<string, { fontFamily?: unknown }>).filter(
      ([, style]) => style.fontFamily !== undefined,
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, style] of entries) {
      expect(style.fontFamily, name).toEqual([...DOCUMENT_PDF_FONT_STACK]);
      expect(style.fontFamily, name).not.toBe(DOCUMENT_PDF_FONT_STACK);
    }
  });
}

test("las hojas de alineación del listado no nombran otra familia", () => {
  for (const [name, style] of Object.entries(listPdfStyles.columnStyles as Record<string, { fontFamily?: unknown }>)) {
    if (style.fontFamily !== undefined) expect(style.fontFamily, name).toEqual([...DOCUMENT_PDF_FONT_STACK]);
  }
});

test("la pila compartida está congelada", () => {
  expect(Object.isFrozen(DOCUMENT_PDF_FONT_STACK)).toBe(true);
});
