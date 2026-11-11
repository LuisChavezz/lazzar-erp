import { expect, test } from "@playwright/test";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { DOCUMENT_PDF_TYPES } from "@/src/pdfs/shared/documentPdfModel";

/**
 * Nombre del archivo de un documento PDF (EC-855): `<TIPO>-<folio>.pdf`, con
 * el folio saneado y `<TIPO>-ID<id>.pdf` sin folio. Corren con
 * `npm run test:unit`.
 */

test.describe("documentPdfFileName", () => {
  test("arma <TIPO>-<folio>.pdf con un folio ya seguro", () => {
    expect(documentPdfFileName("OC", "OC-00012", 7)).toBe("OC-OC-00012.pdf");
    expect(documentPdfFileName("FAC", "A_123.2026", 7)).toBe("FAC-A_123.2026.pdf");
  });

  test("convierte / en guion", () => {
    expect(documentPdfFileName("OC", "OC/2026/15", 7)).toBe("OC-OC-2026-15.pdf");
  });

  test("convierte espacios en guion y junta los repetidos", () => {
    expect(documentPdfFileName("PED", "PED  2026 / 15", 7)).toBe("PED-PED-2026-15.pdf");
  });

  test("convierte cualquier otro carácter inseguro en guion", () => {
    expect(documentPdfFileName("NC", 'a\\b:c*d?e"f<g>h|i', 7)).toBe("NC-a-b-c-d-e-f-g-h-i.pdf");
    expect(documentPdfFileName("POL", "Póliza#1", 7)).toBe("POL-P-liza-1.pdf");
  });

  test("recorta los guiones y puntos de las orillas", () => {
    expect(documentPdfFileName("TR", " /TR-9/ ", 7)).toBe("TR-TR-9.pdf");
    expect(documentPdfFileName("TR", "..TR9..", 7)).toBe("TR-TR9.pdf");
  });

  test("sin folio usa <TIPO>-ID<id>.pdf", () => {
    expect(documentPdfFileName("OC", null, 42)).toBe("OC-ID42.pdf");
    expect(documentPdfFileName("OC", undefined, 42)).toBe("OC-ID42.pdf");
    expect(documentPdfFileName("OC", "", 42)).toBe("OC-ID42.pdf");
    expect(documentPdfFileName("OC", "   ", 42)).toBe("OC-ID42.pdf");
  });

  test("un folio que no deja nada tras sanearlo cae al id", () => {
    expect(documentPdfFileName("OC", "///", 42)).toBe("OC-ID42.pdf");
  });

  test("acepta cada código de tipo", () => {
    expect([...DOCUMENT_PDF_TYPES]).toEqual([
      "PED", "OC", "RC", "OP", "OB", "OR", "OCM", "PCK", "PAK", "TR",
      "FAC", "FP", "NC", "COB", "PAG", "POL",
    ]);
    for (const type of DOCUMENT_PDF_TYPES) {
      expect(documentPdfFileName(type, "X-1", 3)).toBe(`${type}-X-1.pdf`);
      expect(documentPdfFileName(type, null, 3)).toBe(`${type}-ID3.pdf`);
    }
  });
});
