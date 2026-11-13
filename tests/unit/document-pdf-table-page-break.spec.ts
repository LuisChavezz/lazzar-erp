import { expect, test } from "@playwright/test";
import { createElement } from "react";
import {
  DocumentPdfLayout,
  PdfLineItemsTable,
  type DocumentPdfLayoutProps,
  type PdfColumn,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { layoutPdfPages } from "./support/pdfLayout";

/**
 * Salto de página de las tablas de la plantilla base (EC-857): el título de una
 * tabla no puede quedar solo al pie de una página con sus renglones en la
 * siguiente. A diferencia de las demás pruebas de PDF —que recorren el árbol
 * de elementos sin maquetarlo—, esta MAQUETA el documento con react-pdf
 * (`renderToBuffer`) y lee el texto de cada página del PDF resultante: la
 * regla vive en `@react-pdf/layout` (`minPresenceAhead` y el `View` vacío que
 * va antes del título), así que solo un layout real la prueba.
 */

type Row = { texto: string };

const COLUMNS: PdfColumn<Row>[] = [{ id: "texto", header: "Texto", flex: 1, cell: (row) => row.texto }];

/** Página (0-based) donde aparece el texto; -1 si no está. */
const pageOf = (pages: string[], text: string) => pages.findIndex((page) => page.includes(text));

const documentWith = (fillerRows: number) =>
  createElement(
    DocumentPdfLayout,
    // Los hijos van como argumentos; `children` es obligatorio en el tipo.
    {
      company: { name: "EMPRESA", rfc: null },
      descriptor: { type: "OP", id: 1, folio: "2026-OP-1", cancelled: false },
      title: "Prueba",
    } as DocumentPdfLayoutProps,
    createElement(PdfLineItemsTable<Row>, {
      title: "RELLENO",
      rows: Array.from({ length: fillerRows }, (_, index) => ({ texto: `relleno${index}fin` })),
      columns: COLUMNS,
      emptyMessage: "-",
    }),
    createElement(PdfLineItemsTable<Row>, {
      title: "TITULOOBJETIVO",
      rows: [{ texto: "PRIMERRENGLON" }, { texto: "SEGUNDORENGLON" }],
      columns: COLUMNS,
      emptyMessage: "-",
    }),
  );

test.describe("PdfLineItemsTable al cambiar de página", () => {
  test("el título de una tabla queda en la misma página que su primer renglón", async () => {
    test.setTimeout(120_000);
    // Se recorre el relleno renglón por renglón para que en alguno de los
    // casos el título caiga justo al pie de la primera página.
    let titleMovedWithItsRows = false;
    for (let fillerRows = 20; fillerRows <= 32; fillerRows += 1) {
      const pages = await layoutPdfPages(documentWith(fillerRows));
      const titlePage = pageOf(pages, "TITULOOBJETIVO");
      const firstRowPage = pageOf(pages, "PRIMERRENGLON");
      const lastFillerPage = pageOf(pages, `relleno${fillerRows - 1}fin`);
      expect(titlePage, `relleno de ${fillerRows} renglones`).toBeGreaterThanOrEqual(0);
      expect(titlePage, `relleno de ${fillerRows} renglones`).toBe(firstRowPage);
      // El caso que importa: el relleno terminó en la primera página y aun así
      // el título pasó a la segunda, junto con su renglón.
      if (lastFillerPage === 0 && titlePage === 1) titleMovedWithItsRows = true;
    }
    expect(titleMovedWithItsRows, "ningún caso dejó el título al pie de la página").toBe(true);
  });
});
