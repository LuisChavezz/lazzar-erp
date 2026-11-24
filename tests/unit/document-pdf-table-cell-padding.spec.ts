import { expect, test } from "@playwright/test";
import { createElement, type ComponentType } from "react";
import { Text, View } from "@react-pdf/renderer";
import { BASE_PDF_COLORS } from "@/src/pdfs/shared/BasePdfColors";
import { basePdfStyles } from "@/src/pdfs/shared/BasePdfStyles";
import { documentPdfStyles } from "@/src/pdfs/shared/DocumentPdfStyles";
import {
  PdfCellText,
  PdfLineItemsTable,
  type PdfColumn,
  type PdfLineItemsTableProps,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { elementsOf, paddingOf, stylesOf, type TreeElement } from "./support/pdfElementTree";

/**
 * Margen lateral de las celdas de la tabla base (EC-891). Sin él, el texto de
 * una columna que llena la suya tocaba el de la siguiente (la razón social y el
 * RFC del PEDIDO de la OP 2026-OP-00028 salían como "…SA DE CVDMS050731LX7").
 * El margen va en la caja de cada celda —encabezado, celda de texto y celda
 * compuesta— y la fila baja su propio relleno para que los extremos sigan a
 * 8 pt del borde. Se recorre el árbol que devuelve `PdfLineItemsTable`, sin
 * maquetarlo, como las demás pruebas de PDF.
 */

type Row = { razon: string; rfc: string };

const COLUMNS: PdfColumn<Row>[] = [
  { id: "razon", header: "Razón social", flex: 3, cell: (row) => row.razon },
  { id: "rfc", header: "RFC", flex: 1.6, align: "right", bold: true, cell: (row) => row.rfc },
  {
    id: "compuesta",
    header: "Compuesta",
    flex: 2,
    // `children` va como argumento; en el tipo de `PdfCellText` es obligatorio.
    cell: (row) => createElement(PdfCellText as ComponentType<{ bold?: boolean }>, { bold: true }, row.razon),
  },
];

const ROWS: Row[] = [{ razon: "COMERCIALIZADORA SA DE CV", rfc: "DMS050731LX7" }];

const CELL_BOX = documentPdfStyles.tableCellBox;

function tableTree() {
  const props: PdfLineItemsTableProps<Row> = { title: "PEDIDO", rows: ROWS, columns: COLUMNS, emptyMessage: "-" };
  const elements = elementsOf(PdfLineItemsTable(props));
  const header = elements.find((element) => stylesOf(element).includes(documentPdfStyles.tableHeader)) as TreeElement;
  const row = elements.find((element) => stylesOf(element).includes(documentPdfStyles.tableRow)) as TreeElement;
  const cellsOf = (parent: TreeElement) => [parent.props.children].flat().filter(Boolean) as TreeElement[];
  return { header, row, headerCells: cellsOf(header), rowCells: cellsOf(row) };
}

test.describe("Margen lateral de las celdas de la tabla base (EC-891)", () => {
  test("cada celda lleva 3 pt por lado y la fila 5, para 6 pt entre columnas y 8 en los extremos", () => {
    expect(CELL_BOX).toMatchObject({ paddingHorizontal: 3 });
    expect(documentPdfStyles.tableHeader).toMatchObject({ paddingHorizontal: 5 });
    expect(documentPdfStyles.tableRow).toMatchObject({ paddingHorizontal: 5 });
  });

  test("las celdas del encabezado llevan el margen", () => {
    const { headerCells } = tableTree();
    expect(headerCells.map((cell) => cell.props.children)).toEqual(["Razón social", "RFC", "Compuesta"]);
    for (const cell of headerCells) {
      expect(cell.type).toBe(Text);
      expect(stylesOf(cell)).toContain(CELL_BOX);
      expect(paddingOf(cell)).toBe(3);
    }
  });

  test("las celdas de texto y las compuestas del renglón llevan el margen", () => {
    const { rowCells } = tableTree();
    const [razon, rfc, compuesta] = rowCells;

    for (const cell of [razon, rfc]) {
      expect(cell.type).toBe(Text);
      expect(stylesOf(cell)).toContain(CELL_BOX);
      expect(paddingOf(cell)).toBe(3);
    }

    // La celda compuesta pinta su contenido dentro de un `View`: el margen va
    // en ese `View`, una sola vez, y no en el `PdfCellText` de adentro.
    expect(compuesta.type).toBe(View);
    expect(stylesOf(compuesta)).toContain(CELL_BOX);
    expect(paddingOf(compuesta)).toBe(3);
    const inner = [compuesta.props.children].flat() as TreeElement[];
    expect(inner).toHaveLength(1);
    expect(inner[0].type).toBe(PdfCellText);
  });

  test("ninguna columna conserva un relleno propio que se sume al margen", () => {
    const { headerCells, rowCells } = tableTree();
    for (const cell of [...headerCells, ...rowCells]) {
      for (const style of stylesOf(cell)) {
        if (typeof style !== "object" || style === null) continue;
        expect(style).not.toHaveProperty("paddingLeft");
        expect(style).not.toHaveProperty("paddingRight");
      }
    }
  });

  test("la base compartida con cotización y factura no cambia", () => {
    const base = basePdfStyles(BASE_PDF_COLORS);
    expect(base.tableHeader.paddingHorizontal).toBe(8);
    expect(base.tableRow.paddingHorizontal).toBe(8);
    expect(base.tableCell).not.toHaveProperty("paddingHorizontal");
    expect(base.tableCellBold).not.toHaveProperty("paddingHorizontal");
  });
});
