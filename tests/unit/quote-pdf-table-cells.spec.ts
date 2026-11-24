import { expect, test } from "@playwright/test";
import { Text } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";
import { pdfStyles } from "@/src/pdfs/QuotePdfStyles";
import { elementsOf, paddingOf, stylesOf, type TreeElement } from "./support/pdfElementTree";
import { layoutPdfPages, layoutPdfTexts } from "./support/pdfLayout";

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
});

/**
 * Cómo se parten los renglones del producto (EC-952). Por omisión react-pdf
 * separa en sílabas aunque la palabra quepa entera en el renglón siguiente: en
 * la cotización #308 "BLUSA RAYAS GRUESAS DAMA MANGA LARGA" salía
 * "…DAMA MAN-" / "GA LARGA". Las palabras se parten solo si no caben enteras
 * en su columna. MAQUETA la cotización real: la decisión es de
 * `@react-pdf/layout`, no de los estilos.
 */
const layoutQuote = (quote: QuoteById) =>
  layoutPdfPages(QuotePdfDocument({ quote, model: buildQuotePdfModel(quote, "MXN") }));

test.describe("Renglones del producto en el PDF de cotización (EC-952)", () => {
  test("se parte entre palabras cuando la palabra cabe en el renglón siguiente", async () => {
    test.setTimeout(60_000);
    // Con los anchos de la tabla, la separación por omisión deja
    // "…CORTA CA-" / "BALLERO PIQUE" e "…IMPER-" / "MEABLE UNISEX".
    const [page] = await layoutQuote(quoteWith("PLAYERA POLO MANGA CORTA CABALLERO PIQUE", "10878012XC"));
    expect(page).toContain("CABALLERO");
    expect(page).not.toMatch(/CA-\s*BALLERO/);
    const [other] = await layoutQuote(quoteWith("CHAMARRA ROMPEVIENTOS IMPERMEABLE UNISEX", "10878012XC"));
    expect(other).toContain("IMPERMEABLE");
    expect(other).not.toMatch(/IMPER-\s*MEABLE/);
  });

  test("una palabra más ancha que su columna se sigue partiendo en vez de salirse", async () => {
    test.setTimeout(60_000);
    const word = "ELECTROENCEFALOGRAFISTAINTERCONTINENTALES";
    const quote = quoteWith(`CAMISA ${word}`, "10878012XC");
    const [page] = await layoutQuote(quote);
    expect(page).not.toContain(word);
    expect(page).toMatch(/ELECTRO\w*-/);
    expect(page).toContain("10878012XC");

    // Partida no basta: cada renglón de la celda debe caber en su columna
    // (ancho de la celda menos su relleno), o el pedazo invadiría la del SKU.
    const texts = await layoutPdfTexts(QuotePdfDocument({ quote, model: buildQuotePdfModel(quote, "MXN") }));
    const cell = texts.find((text) => text.lines.map((line) => line.text).join("").includes("ELECTRO"));
    expect(cell, "la celda del producto").toBeDefined();
    expect(cell!.lines.length).toBeGreaterThan(1);
    for (const line of cell!.lines) {
      expect(line.width, `"${line.text}" debe caber en ${cell!.contentWidth.toFixed(1)} pt`).toBeLessThanOrEqual(
        cell!.contentWidth + 0.01,
      );
    }
  });
});
