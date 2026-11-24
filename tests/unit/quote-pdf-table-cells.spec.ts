import { expect, test } from "@playwright/test";
import { Text } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";
import { pdfStyles } from "@/src/pdfs/QuotePdfStyles";
import { BASE_PDF_COLORS } from "@/src/pdfs/shared/BasePdfColors";
import { basePdfStyles } from "@/src/pdfs/shared/BasePdfStyles";
import { elementsOf, type TreeElement } from "./support/pdfElementTree";

/**
 * Celdas de la tabla de productos del PDF de cotización (EC-952). La cotización
 * arma su propia tabla y no recibió el margen lateral que EC-891 dio a la base:
 * en la cotización #308 el producto llegaba hasta la columna SKU
 * ("…PESCADOR10878012XC").
 */

const quoteWith = (productName: string, sku: string) =>
  ({
    id: 952,
    cliente: 5,
    cliente_razon_social: "EMPRESA",
    cliente_nombre: "Ana",
    estatus_label: "Borrador",
    created_at: "2026-11-20T10:00:00Z",
    iva: "16.00",
    gran_total: "116.00",
    anticipo: "0.00",
    detalles: [
      {
        id: 1,
        producto: 10,
        producto_nombre: productName,
        precio_unitario: "100.00",
        tallas: [{ talla_nombre: "XC", cantidad: 1, sku }],
      },
    ],
  }) as unknown as QuoteById;

const QUOTE = quoteWith("CAMISA MANGA LARGA DF PESCADOR", "10878012XC");

/** Los estilos de un elemento, aplanados en un arreglo. */
const stylesOf = (element: TreeElement): unknown[] => [element.props.style].flat(Infinity);

/** `paddingHorizontal` efectivo: el último estilo que lo declara gana. */
const paddingOf = (element: TreeElement): unknown =>
  stylesOf(element)
    .filter((style): style is { paddingHorizontal: number } =>
      typeof style === "object" && style !== null && "paddingHorizontal" in style,
    )
    .at(-1)?.paddingHorizontal;

function tableTree(quote: QuoteById = QUOTE) {
  const elements = elementsOf(QuotePdfDocument({ quote, model: buildQuotePdfModel(quote, "MXN") }));
  const withStyle = (style: unknown) =>
    elements.find((element) => stylesOf(element).includes(style)) as TreeElement;
  const cellsOf = (parent: TreeElement) => [parent.props.children].flat().filter(Boolean) as TreeElement[];
  return {
    headerCells: cellsOf(withStyle(pdfStyles.tableHeader)),
    rowCells: cellsOf(withStyle(pdfStyles.tableRow)),
  };
}

test.describe("Margen lateral de las celdas del PDF de cotización (EC-952)", () => {
  test("cada celda lleva 3 pt por lado y la fila 5, como la base (EC-891)", () => {
    expect(pdfStyles.tableCellBox).toMatchObject({ paddingHorizontal: 3 });
    expect(pdfStyles.tableHeader).toMatchObject({ paddingHorizontal: 5 });
    expect(pdfStyles.tableRow).toMatchObject({ paddingHorizontal: 5 });
  });

  test("las cinco celdas del encabezado y del renglón llevan el margen", () => {
    const { headerCells, rowCells } = tableTree();
    expect(headerCells.map((cell) => cell.props.children)).toEqual([
      "Producto",
      "SKU",
      "Pzas.",
      "Precio u.",
      "Subtotal",
    ]);
    expect(rowCells).toHaveLength(5);
    for (const cell of [...headerCells, ...rowCells]) {
      expect(cell.type).toBe(Text);
      expect(stylesOf(cell)).toContain(pdfStyles.tableCellBox);
      expect(paddingOf(cell)).toBe(3);
    }
  });

  test("la base compartida no cambia: el ajuste vive en los estilos de la cotización", () => {
    const base = basePdfStyles(BASE_PDF_COLORS);
    expect(base.tableHeader.paddingHorizontal).toBe(8);
    expect(base.tableRow.paddingHorizontal).toBe(8);
  });
});
