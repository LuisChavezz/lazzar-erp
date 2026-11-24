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
import type { Picking } from "@/src/features/picking/interfaces/picking.interface";
import { PickingPdfDocument } from "@/src/pdfs/PickingPdfDocument";
import { layoutPdfPages, layoutPdfTexts, type PdfLayoutText } from "./support/pdfLayout";

/**
 * Cómo se parten los renglones de la tabla base (EC-891). Por omisión react-pdf
 * separa en sílabas al partir un renglón aunque la palabra quepa entera en el
 * siguiente: el encabezado "En esta orden" de la OB salía "En esta or-/den".
 * Encabezados y celdas se parten entre palabras; una celda separa en sílabas
 * solo la palabra que no cabe entera en su columna (EC-952). Como
 * `document-pdf-table-page-break.spec.ts`, MAQUETA un documento real: la
 * separación la decide `@react-pdf/layout`.
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

/** Las celdas de texto cuyo contenido (sin los guiones de corte) incluye alguna de esas palabras. */
const cellsWith = (texts: PdfLayoutText[], words: string[]) =>
  texts.filter((text) => {
    const content = text.lines.map((line) => line.text.replace(/-\s*$/, "")).join("");
    return words.some((word) => content.includes(word));
  });

/** Celdas con un renglón que termina partiendo una palabra ("MAN-"), como texto. */
const hyphenated = (cells: PdfLayoutText[]) =>
  cells
    .filter((cell) => cell.lines.some((line) => /\p{L}-\s*$/u.test(line.text)))
    .map((cell) => cell.lines.map((line) => line.text.trim()).join(" / "));

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

test.describe("Celdas de la tabla base al partir renglones (EC-952)", () => {
  // Nombres reales: con la separación por omisión, la columna Producto del
  // surtido (~87 pt) los dejaba en "CAMISA MAN-" / "GA LARGA DF" y "PLAYERA POLO
  // MAN-" / "GA CORTA CA-" / "BALLERO PIQUE", aunque cada palabra cabe entera.
  const NAMES = ["CAMISA MANGA LARGA DF PESCADOR", "PLAYERA POLO MANGA CORTA CABALLERO PIQUE"];

  test("una celda de texto se parte entre palabras cuando cada palabra cabe en su columna", async () => {
    test.setTimeout(60_000);
    const picking = {
      id: 1,
      folio: "PICK-000001",
      estado: "SURTIDA",
      prioridad: "NORMAL",
      picking_detalle: NAMES.map((name, index) => ({
        id: index + 1,
        sku: "10012-100-2XCH",
        producto_nombre: name,
        producto_variante_nombre: null,
        color_nombre: "MARINO",
        talla_nombre: "M",
        ubicacion_nombre: "CF-05-05-06",
        cantidad_solicitada: "12",
        cantidad_asignada: "12",
        cantidad_surtida: "12",
        diferencia: "0",
        estado: "SURTIDA",
      })),
    } as unknown as Picking;
    const texts = await layoutPdfTexts(createElement(PickingPdfDocument, { picking, company: { name: "EMPRESA", rfc: null } }));
    // Las dos celdas se parten en renglones, pero ninguna palabra queda cortada.
    const cells = cellsWith(texts, ["PESCADOR", "PIQUE"]);
    expect(cells).toHaveLength(2);
    for (const cell of cells) expect(cell.lines.length).toBeGreaterThan(1);
    expect(hyphenated(cells)).toEqual([]);
  });

  test("el texto y la línea secundaria de una celda compuesta también se parten entre palabras", async () => {
    test.setTimeout(60_000);
    // En la columna Bordado de la OB (~177 pt) salían "…REFLEJANTE CA-" /
    // "BALLERO" en el texto y en la línea secundaria, y "…CABALLERO MEZ-" /
    // "CLILLA" en una de las dos.
    const texts = await layoutPdfTexts(
      documentWith(
        ["OVEROL INDUSTRIAL CON REFLEJANTE CABALLERO", "PANTALON CARGO GABARDINA CABALLERO MEZCLILLA"].map((texto) => ({
          talla: "M",
          texto,
        })),
      ),
    );
    // Dos filas, cada una con su texto y su línea secundaria.
    const cells = cellsWith(texts, ["CABALLERO"]);
    expect(cells).toHaveLength(4);
    expect(hyphenated(cells)).toEqual([]);
  });
});
