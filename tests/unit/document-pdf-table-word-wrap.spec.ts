import { expect, test } from "@playwright/test";
import { createElement, type ComponentType } from "react";
import { View } from "@react-pdf/renderer";
import {
  DocumentPdfLayout,
  PdfCellCaption,
  PdfCellText,
  PdfLineItemsTable,
  type DocumentPdfLayoutProps,
  type PdfColumn,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { layoutPdfPages } from "./support/pdfLayout";

/**
 * Cómo se parten los renglones de la tabla base (EC-891). Por omisión react-pdf
 * separa en sílabas al partir un renglón aunque la palabra quepa entera en el
 * siguiente: el encabezado "En esta orden" de la OB salía "En esta or-/den".
 * Los encabezados se parten solo entre palabras; las celdas conservan la
 * separación para que un dato más ancho que su columna no se salga sobre la de
 * al lado. Como `document-pdf-table-page-break.spec.ts`, MAQUETA un documento
 * real: la separación la decide `@react-pdf/layout`.
 *
 * Las columnas copian la tabla de prendas de la OB (anchos de EC-891), donde
 * "En esta orden" no cabe en un renglón pero "orden" sí.
 */

type Row = { talla: string; texto: string };

// `children` va como argumento; en el tipo de estos componentes es obligatorio.
const boldText = (value: string) =>
  createElement(PdfCellText as ComponentType<{ bold?: boolean }>, { bold: true }, value);
const caption = (value: string) => createElement(PdfCellCaption as ComponentType, null, value);

const COLUMNS: PdfColumn<Row>[] = [
  { id: "talla", header: "Talla", flex: 0.6, bold: true, cell: (row) => row.talla },
  { id: "sku", header: "SKU", flex: 1.45, cell: () => "10012-100-2XCH" },
  {
    id: "bordado",
    header: "Bordado",
    flex: 3.2,
    // Compuesta: un texto y una línea secundaria, cada uno en su caja angosta.
    cell: (row) => createElement(View, null, boldText(row.texto), caption(row.texto)),
  },
  { id: "cantidad", header: "En esta orden", flex: 0.7, align: "right", bold: true, cell: () => "12,500" },
  { id: "programado", header: "Programado", flex: 1, align: "right", cell: () => "12,500" },
  { id: "pedido", header: "Pedido", flex: 0.7, align: "right", cell: () => "12,500" },
  { id: "pendiente", header: "Pendiente", flex: 0.85, align: "right", cell: () => "12,500" },
];

const documentWith = (rows: Row[]) =>
  createElement(
    DocumentPdfLayout,
    {
      company: { name: "EMPRESA", rfc: null },
      descriptor: { type: "OB", id: 1, folio: "2026-OB-1", cancelled: false },
      title: "Prueba",
    } as DocumentPdfLayoutProps,
    createElement(PdfLineItemsTable<Row>, { key: "tabla", title: "PRENDAS", rows, columns: COLUMNS, emptyMessage: "-" }),
  );

test.describe("PdfLineItemsTable al partir renglones", () => {
  test("un encabezado que no cabe en un renglón pasa la palabra entera al siguiente", async () => {
    test.setTimeout(60_000);
    const [page] = await layoutPdfPages(documentWith([{ talla: "2XCH", texto: "A" }]));
    // El texto de la página va sin separadores entre renglones.
    expect(page).toContain("orden");
    expect(page).not.toMatch(/or-\s*den/);
    // Los números y el SKU salen enteros.
    expect(page).toContain("10012-100-2XCH");
    expect(page).toContain("12,500");
  });

  test("un dato más ancho que su columna se parte en vez de salirse de ella", async () => {
    test.setTimeout(60_000);
    // Un color real de la BD en la columna más angosta: entero mediría más que
    // la columna e invadiría la del SKU.
    const [page] = await layoutPdfPages(documentWith([{ talla: "MARINO/AMARILLO/REY", texto: "A" }]));
    expect(page).not.toContain("MARINO/AMARILLO/REY");
    expect(page).toContain("10012-100-2XCH");
  });
});
