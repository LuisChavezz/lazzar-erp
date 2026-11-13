import { expect, test } from "@playwright/test";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { DOCUMENT_PDF_TYPES } from "@/src/pdfs/shared/documentPdfModel";

/**
 * Nombre del archivo de un documento PDF (EC-855): `<TIPO>-<folio>.pdf`, con
 * el folio saneado, sin repetir el código si el folio ya empieza con
 * `<TIPO>-`, y `<TIPO>-ID<id>.pdf` sin folio. Corren con `npm run test:unit`.
 */

test.describe("documentPdfFileName", () => {
  test("arma <TIPO>-<folio>.pdf con un folio ya seguro", () => {
    expect(documentPdfFileName("FAC", "A_123.2026", 7)).toBe("FAC-A_123.2026.pdf");
  });

  test("no repite el código si el folio ya empieza con <TIPO>-", () => {
    expect(documentPdfFileName("OC", "OC-00010-2026", 7)).toBe("OC-00010-2026.pdf");
    expect(documentPdfFileName("PED", "PED-00140-2026", 7)).toBe("PED-00140-2026.pdf");
  });

  test("antepone el código si el folio trae otro prefijo", () => {
    expect(documentPdfFileName("OC", "O-00002", 7)).toBe("OC-O-00002.pdf");
    expect(documentPdfFileName("PED", "P-00140-2026", 7)).toBe("PED-P-00140-2026.pdf");
    // Empieza con las letras del código, pero no con "<TIPO>-".
    expect(documentPdfFileName("OC", "OCM-15", 7)).toBe("OC-OCM-15.pdf");
    expect(documentPdfFileName("OC", "OC00010", 7)).toBe("OC-OC00010.pdf");
    // El código es fijo en mayúsculas: un folio en minúsculas no cuenta.
    expect(documentPdfFileName("OC", "oc-00010", 7)).toBe("OC-oc-00010.pdf");
  });

  test("la recepción reconoce sus tres series (RC, RT, RZ); los demás tipos, solo su código", () => {
    expect(documentPdfFileName("RC", "RC-00031", 7)).toBe("RC-00031.pdf");
    expect(documentPdfFileName("RC", "RT-00011", 7)).toBe("RT-00011.pdf");
    expect(documentPdfFileName("RC", "RZ-00001", 7)).toBe("RZ-00001.pdf");
    expect(documentPdfFileName("OC", "RT-00011", 7)).toBe("OC-RT-00011.pdf");
    expect(documentPdfFileName("PED", "RC-00031", 7)).toBe("PED-RC-00031.pdf");
  });

  test("producción: el segmento de tipo en medio del folio también cuenta (EC-857)", () => {
    // Formatos reales de la BD (2026-11-13).
    expect(documentPdfFileName("OP", "2026-OP-00016", 7)).toBe("2026-OP-00016.pdf");
    expect(documentPdfFileName("OP", "OP-P-00010-2026", 7)).toBe("OP-P-00010-2026.pdf");
    expect(documentPdfFileName("OP", "OP-E2715058", 7)).toBe("OP-E2715058.pdf");
    expect(documentPdfFileName("OB", "2026-OB-00032", 7)).toBe("2026-OB-00032.pdf");
    expect(documentPdfFileName("OR", "2026-OR-00001", 7)).toBe("2026-OR-00001.pdf");
    // La OCM se reconoce por su segmento CM (y por su código).
    expect(documentPdfFileName("OCM", "2026-CM-00006", 7)).toBe("2026-CM-00006.pdf");
    expect(documentPdfFileName("OCM", "OCM-15", 7)).toBe("OCM-15.pdf");
    // El segmento de OTRO tipo no cuenta, ni un tramo que solo lo contiene.
    expect(documentPdfFileName("OB", "2026-OP-00016", 7)).toBe("OB-2026-OP-00016.pdf");
    expect(documentPdfFileName("OP", "2026-CM-00006", 7)).toBe("OP-2026-CM-00006.pdf");
    expect(documentPdfFileName("OC", "2026-OCX-1", 7)).toBe("OC-2026-OCX-1.pdf");
  });

  test("los demás formatos reales siguen igual", () => {
    expect(documentPdfFileName("OC", "OC-1-126", 7)).toBe("OC-1-126.pdf");
    expect(documentPdfFileName("OC", "OC-00001-2026", 7)).toBe("OC-00001-2026.pdf");
    expect(documentPdfFileName("OC", "O-1-209", 7)).toBe("OC-O-1-209.pdf");
    expect(documentPdfFileName("PED", "P-00009-2026", 7)).toBe("PED-P-00009-2026.pdf");
    expect(documentPdfFileName("PED", "QA249-QA-000001", 7)).toBe("PED-QA249-QA-000001.pdf");
    expect(documentPdfFileName("RC", "RT-00001", 7)).toBe("RT-00001.pdf");
  });

  test("picking y packing reconocen sus series PICK y PACK; el traspaso, TR (EC-858)", () => {
    // Folios reales de la BD (2026-11-12).
    expect(documentPdfFileName("PCK", "PICK-000038", 7)).toBe("PICK-000038.pdf");
    expect(documentPdfFileName("PAK", "PACK-000017", 7)).toBe("PACK-000017.pdf");
    expect(documentPdfFileName("TR", "TR-00033", 7)).toBe("TR-00033.pdf");
    // Su propio código también cuenta; otra serie lleva el código delante.
    expect(documentPdfFileName("PCK", "PCK-1", 7)).toBe("PCK-1.pdf");
    expect(documentPdfFileName("PCK", "PK-A-000001", 7)).toBe("PCK-PK-A-000001.pdf");
    // La serie de uno no vale para el otro.
    expect(documentPdfFileName("PAK", "PICK-000038", 7)).toBe("PAK-PICK-000038.pdf");
    expect(documentPdfFileName("PCK", "PACK-000017", 7)).toBe("PCK-PACK-000017.pdf");
    expect(documentPdfFileName("PCK", null, 5)).toBe("PCK-ID5.pdf");
  });

  test("un folio que es solo el segmento lleva el código delante", () => {
    expect(documentPdfFileName("OP", "OP", 7)).toBe("OP-OP.pdf");
  });

  test("compara el prefijo DESPUÉS de sanear el folio", () => {
    expect(documentPdfFileName("OC", "OC/2026/15", 7)).toBe("OC-2026-15.pdf");
    expect(documentPdfFileName("OC", " OC 00010 ", 7)).toBe("OC-00010.pdf");
    expect(documentPdfFileName("TR", " /TR-9/ ", 7)).toBe("TR-9.pdf");
  });

  test("convierte / en guion", () => {
    expect(documentPdfFileName("OC", "A/2026/15", 7)).toBe("OC-A-2026-15.pdf");
  });

  test("convierte espacios en guion y junta los repetidos", () => {
    expect(documentPdfFileName("PED", "P  2026 / 15", 7)).toBe("PED-P-2026-15.pdf");
  });

  test("convierte cualquier otro carácter inseguro en guion", () => {
    expect(documentPdfFileName("NC", 'a\\b:c*d?e"f<g>h|i', 7)).toBe("NC-a-b-c-d-e-f-g-h-i.pdf");
    expect(documentPdfFileName("POL", "Póliza#1", 7)).toBe("POL-P-liza-1.pdf");
  });

  test("recorta los guiones y puntos de las orillas", () => {
    expect(documentPdfFileName("TR", "..TR9..", 7)).toBe("TR-TR9.pdf");
    expect(documentPdfFileName("TR", "-A9-", 7)).toBe("TR-A9.pdf");
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
      expect(documentPdfFileName(type, `${type}-1`, 3)).toBe(`${type}-1.pdf`);
      expect(documentPdfFileName(type, null, 3)).toBe(`${type}-ID3.pdf`);
    }
  });
});
