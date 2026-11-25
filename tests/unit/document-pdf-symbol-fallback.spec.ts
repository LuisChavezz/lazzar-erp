import { expect, test } from "@playwright/test";
import { createElement, type ComponentType } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";
import {
  DocumentPdfLayout,
  PdfCellText,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  type DocumentPdfLayoutProps,
  type PdfColumn,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { stripPdfEmojiDeep } from "@/src/pdfs/shared/stripPdfEmoji";
import { PdfRenderListenerContext, toReactElement } from "./support/pwJsx";
import { pdfPageTexts } from "./support/pdfLayout";

/**
 * Respaldo de símbolos de los PDF (EC-958): Arimo no tiene ✓, ⇒, ★ ni ①, y
 * antes desaparecían sin aviso. Con la pila `[Arimo, PdfSymbolsFallback]` se
 * imprimen, también en negritas, y un renglón que lleva un símbolo mide lo
 * mismo que uno que no (las métricas verticales del respaldo son las de
 * Arimo). Los emoji los quita `stripPdfEmojiDeep` (en la app, dentro de
 * `renderPdfBlobWith`). Maqueta documentos reales con react-pdf.
 */

const SIMBOLOS = "✓ ⇒ ★ ① ⚠";
const NOTAS = `Revisado ${SIMBOLOS} entregar 🚚 hoy 👍🏽.`;

type Row = { texto: string; bold: string };
const COLUMNS: PdfColumn<Row>[] = [
  { id: "texto", header: "Texto", flex: 3, cell: (row) => row.texto },
  { id: "bold", header: "Negritas", flex: 1, cell: (row) => createElement(PdfCellText as ComponentType<{ bold?: boolean }>, { bold: true }, row.bold) },
];

const baseDocument = ({ notas, rows }: { notas: string; rows: Row[] }) =>
  createElement(
    DocumentPdfLayout,
    {
      company: { name: "EMPRESA ✓", rfc: "EMP010101AAA" },
      descriptor: { type: "TR", id: 1, folio: "TR-1", cancelled: false },
      title: "Traspaso entre almacenes",
    } as DocumentPdfLayoutProps,
    createElement(PdfInfoCard, { key: "datos", title: "DATOS", items: [{ label: "Producto", value: "Camisa ⇒ azul ★" }] }),
    createElement(PdfLineItemsTable<Row>, { key: "tabla", title: "PARTIDAS", rows, columns: COLUMNS, emptyMessage: "-" }),
    createElement(PdfNotes, { key: "notas", text: notas }),
  );

const render = async (document: unknown) =>
  renderToBuffer(toReactElement(document) as Parameters<typeof renderToBuffer>[0]);

type LayoutNode = { type?: string; lines?: { string: string; box?: { height: number } }[]; children?: LayoutNode[] };

/** Alto de cada renglón maquetado, por texto. */
const lineHeights = async (document: unknown) => {
  let layout: LayoutNode | undefined;
  await renderToBuffer(
    createElement(
      PdfRenderListenerContext,
      { value: ({ _INTERNAL__LAYOUT__DATA_: data }: { _INTERNAL__LAYOUT__DATA_?: unknown }) => void (layout = data as LayoutNode) },
      toReactElement(document),
    ) as Parameters<typeof renderToBuffer>[0],
  );
  const heights = new Map<string, number>();
  const walk = (node: LayoutNode) => {
    node.lines?.forEach((line) => heights.set(line.string.trim(), line.box?.height ?? 0));
    node.children?.forEach(walk);
  };
  if (layout) walk(layout);
  return heights;
};

test.describe("respaldo de símbolos en la plantilla base", () => {
  test("imprime ✓, ⇒, ★, ① y ⚠ en texto libre y en negritas, y quita los emoji", async () => {
    test.setTimeout(60_000);
    const props = stripPdfEmojiDeep({ notas: NOTAS, rows: [{ texto: "Renglón ① ok", bold: "B ✓ ★" }] });
    const pdf = await render(baseDocument(props));

    const raw = pdf.toString("latin1");
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+PdfSymbolsFallback-Regular/);
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Arimo-Bold/);
    const [pagina] = pdfPageTexts(pdf);
    for (const fragmento of [
      `Revisado ${SIMBOLOS} entregar  hoy .`,
      "Camisa ⇒ azul ★",
      "Renglón ① ok",
      "B ✓ ★",
      "EMPRESA ✓",
    ]) {
      expect(pagina).toContain(fragmento);
    }
  });

  test("un renglón con símbolos mide lo mismo que uno sin ellos, en normal y en negritas", async () => {
    test.setTimeout(60_000);
    const heights = await lineHeights(
      baseDocument({
        notas: "Sin símbolos aquí.",
        rows: [
          { texto: "Plano normal", bold: "Plano" },
          { texto: "Con ✓ ⇒ ★ ①", bold: "Con ✓ ★" },
        ],
      }),
    );
    for (const texto of ["Plano normal", "Con ✓ ⇒ ★ ①", "Plano", "Con ✓ ★"]) {
      expect(heights.get(texto), texto).toBeGreaterThan(0);
    }
    expect(heights.get("Con ✓ ⇒ ★ ①")).toBe(heights.get("Plano normal"));
    expect(heights.get("Con ✓ ★")).toBe(heights.get("Plano"));
  });
});

const QUOTE = {
  id: 958,
  cliente: 5,
  cliente_razon_social: "EMPRESA ✓ Norte",
  cliente_nombre: "Ana Pérez",
  estatus_label: "Borrador",
  created_at: "2026-11-20T10:00:00Z",
  oc: "OC-1 ⇒ 2",
  forma_pago: "PUE",
  observaciones: NOTAS,
  iva: "16.00",
  gran_total: "116.00",
  anticipo: "0.00",
  detalles: [
    {
      id: 1,
      producto: 10,
      producto_nombre: "Camisa ★ manga larga",
      precio_unitario: "100.00",
      tallas: [{ talla_nombre: "M", cantidad: 1, sku: "CAM-M" }],
    },
  ],
} as unknown as QuoteById;

test.describe("respaldo de símbolos en la cotización", () => {
  test("imprime los símbolos con el respaldo y quita los emoji", async () => {
    test.setTimeout(60_000);
    const quote = stripPdfEmojiDeep(QUOTE);
    const pdf = await render(createElement(QuotePdfDocument, { quote, model: buildQuotePdfModel(quote, "MXN") }));

    expect(pdf.toString("latin1")).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+PdfSymbolsFallback-Regular/);
    const texto = pdfPageTexts(pdf).join("\n");
    for (const fragmento of [`Revisado ${SIMBOLOS} entregar  hoy .`, "Camisa ★ manga larga", "EMPRESA ✓ Norte", "OC-1 ⇒ 2"]) {
      expect(texto).toContain(fragmento);
    }
  });
});
