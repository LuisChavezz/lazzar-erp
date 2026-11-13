import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DocumentPdfLayout,
  PdfInfoCard,
  PdfNotes,
  type DocumentPdfLayoutProps,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { pdfPageTexts } from "./support/pdfLayout";
import { toReactElement } from "./support/pwJsx";

/**
 * Fuente de la plantilla base (EC-858): la Helvetica estándar solo codifica
 * WinAnsi y borraba sin aviso cualquier otro carácter del backend. Con Arimo
 * incrustada, una flecha o "≥" en observaciones o en un nombre se imprimen.
 * Maqueta un documento real con react-pdf y lee su texto (`pdfPageTexts`).
 */

const TEXTO = "Traslado PT → APARTADOS ≥ 2 piezas · “urgente” – Œuvre ½";

const documento = () =>
  createElement(
    DocumentPdfLayout,
    {
      company: { name: "EMPRESA Ñandú", rfc: "EMP010101AAA" },
      descriptor: { type: "TR", id: 1, folio: "TR-1", cancelled: true, cancelledLabel: "FALLIDA" },
      title: "Traspaso entre almacenes",
    } as DocumentPdfLayoutProps,
    createElement(PdfInfoCard, { key: "datos", title: "DATOS", items: [{ label: "Producto", value: "Camisa → azul" }] }),
    createElement(PdfNotes, { key: "notas", text: TEXTO }),
  );

test.describe("fuente de la plantilla base", () => {
  test("incrusta Arimo e imprime los caracteres fuera de WinAnsi", async () => {
    test.setTimeout(60_000);
    const pdf = await renderToBuffer(toReactElement(documento()) as Parameters<typeof renderToBuffer>[0]);
    expect(pdf.toString("latin1")).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Arimo/);
    expect(pdf.toString("latin1")).not.toContain("/BaseFont /Helvetica");
    const [pagina] = pdfPageTexts(pdf);
    for (const fragmento of ["PT → APARTADOS", "≥ 2", "“urgente”", "– Œuvre ½", "Camisa → azul", "EMPRESA Ñandú", "FALLIDA"]) {
      expect(pagina).toContain(fragmento);
    }
  });
});
