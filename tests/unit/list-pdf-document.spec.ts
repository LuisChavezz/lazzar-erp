import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ListPdfDocument, type ListPdfDocumentProps } from "@/src/pdfs/ListPdfDocument";
import type { DocumentPdfFontLoader } from "@/src/pdfs/shared/documentPdfFontLoader";
import type { ListExportColumn } from "@/src/utils/listExport";
import { compactListPdfProps, listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";
import { renderPdfBlobWith, type PdfRenderer } from "@/src/utils/renderPdfBlob";
import { toReactElement } from "./support/pwJsx";
import { pdfPageTexts } from "./support/pdfLayout";

/**
 * PDF de los listados exportados (EC-959): `ListPdfDocument`, en Arimo con el
 * respaldo de símbolos (EC-958) y sin emoji. Maqueta el documento real con
 * react-pdf; en Node las fuentes se registran por ruta de disco
 * (`documentPdfFonts`).
 */

type Row = { folio: string; nota: string };
const COLUMNS: ListExportColumn<Row>[] = [
  { header: "Folio", weight: 1, text: (r) => r.folio },
  { header: "Nota ✓", weight: 3, text: (r) => r.nota },
];
const NOW = new Date(2026, 10, 25, 12);

const SIMBOLOS = "Revisado ✓ ≥ 10 → almacén “citado” ‘x’ Œuvre";

const render = async (props: ListPdfDocumentProps) =>
  renderToBuffer(toReactElement(createElement(ListPdfDocument, props)) as Parameters<typeof renderToBuffer>[0]);

/** El de la app (`renderPdfBlobWith`) con el renderer real; las fuentes ya están registradas en Node. */
const NODE_FONTS: DocumentPdfFontLoader = { download: async () => [], register: () => {} };

const renderLikeTheApp = async (props: ListPdfDocumentProps) => {
  const blob = await renderPdfBlobWith(
    async () => (await import("@react-pdf/renderer")) as unknown as PdfRenderer,
    async () => (p: ListPdfDocumentProps) => toReactElement(ListPdfDocument(p)) as ReturnType<typeof ListPdfDocument>,
    props,
    NODE_FONTS,
  );
  return Buffer.from(await blob.arrayBuffer());
};

test.describe("PDF de un listado exportado", () => {
  test("imprime ✓, ≥, flechas, comillas tipográficas y Œ en Arimo, y quita los emoji", async () => {
    test.setTimeout(60_000);
    const rows = [
      { folio: "PCK-1", nota: SIMBOLOS },
      { folio: "PCK-2 🚚", nota: "Entrega 🚚 hoy 👍🏽" },
    ];
    const pdf = await renderLikeTheApp(compactListPdfProps({ columns: COLUMNS, title: "Surtidos 📦" }, rows, NOW));

    const raw = pdf.toString("latin1");
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Arimo-Regular/);
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Arimo-Bold/);
    expect(raw).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+PdfSymbolsFallback-Regular/);
    expect(raw).not.toMatch(/\/BaseFont\s*\/Helvetica/);

    const [pagina] = pdfPageTexts(pdf);
    for (const fragmento of [SIMBOLOS, "Entrega hoy", "PCK-2", "Nota ✓", "Surtidos", "ERP LAZZAR · WMS"]) {
      expect(pagina).toContain(fragmento);
    }
    for (const emoji of ["🚚", "👍", "📦"]) expect(pagina).not.toContain(emoji);
  });

  for (const variant of ["compact", "standard"] as const) {
    test(`la fila de cabeceras se repite en cada página (${variant})`, async () => {
      test.setTimeout(60_000);
      const rows = Array.from({ length: 90 }, (_, i) => ({ folio: `F-${i + 1}`, nota: `Renglón ${i + 1}` }));
      const props =
        variant === "compact"
          ? compactListPdfProps({ columns: COLUMNS, title: "Surtidos" }, rows, NOW)
          : standardListPdfProps({
              title: "Reporte de Clientes",
              columns: [
                { header: "Folio", width: "25.0%" },
                { header: "Nota ✓", width: "75.0%" },
              ],
              rows: rows.map((r) => [r.folio, r.nota]),
              now: NOW,
            });
      const paginas = pdfPageTexts(await render(props));
      expect(paginas.length).toBeGreaterThan(1);
      for (const [i, pagina] of paginas.entries()) {
        expect(pagina, `página ${i + 1}`).toContain("Nota ✓");
        expect(pagina, `página ${i + 1}`).toContain(`Página ${i + 1} de ${paginas.length}`);
      }
      // El encabezado del reporte no se repite: solo la fila de cabeceras.
      expect(paginas[1]).not.toContain("Exportado:");
    });
  }

  test("la variante standard lleva el total general, la fila de totales y los importes", async () => {
    test.setTimeout(60_000);
    const props = standardListPdfProps({
      title: "Reporte de Cotizaciones",
      columns: [
        { header: "Cliente", width: "60.0%" },
        { header: "Importe", width: "40.0%", align: "right", bold: true },
      ],
      rows: [["CLIENTE ✓", "$1,000.00 MXN"]],
      totalRow: { cells: ["Total", "$1,000.00 MXN"], valueIndex: 1 },
      extraMeta: [{ label: "Total general:", value: "$1,000.00 MXN" }],
      now: NOW,
    });
    const [pagina] = pdfPageTexts(await render(props));
    for (const fragmento of [
      "ERP LAZZAR",
      "Reporte de Cotizaciones",
      "Registros:",
      "Total general:",
      "CLIENTE ✓",
      "Total",
      "1 registro — Generado con ERP Lazzar",
    ]) {
      expect(pagina).toContain(fragmento);
    }
  });
});

test.describe("props del PDF de un listado", () => {
  test("los anchos son el porcentaje del peso con los decimales pedidos", () => {
    expect(listPdfWidths([1, 3], 2)).toEqual(["25.00%", "75.00%"]);
    expect(listPdfWidths([1.8, 1, 1.2], 1)).toEqual(["45.0%", "25.0%", "30.0%"]);
  });

  test("compact: marca WMS, conteo por defecto o el de `summary`, celdas con el texto del Excel", () => {
    const rows = [{ folio: "A", nota: "x" }];
    const props = compactListPdfProps({ columns: COLUMNS, title: "Surtidos" }, rows, NOW);
    expect(props.variant).toBe("compact");
    expect(props.brand).toBe("ERP LAZZAR · WMS");
    expect(props.meta.map((m) => m.value)).toEqual([expect.stringContaining("2026"), "1 registro"]);
    expect(props.columns).toEqual([
      { header: "Folio", width: "25.00%" },
      { header: "Nota ✓", width: "75.00%" },
    ]);
    expect(props.rows).toEqual([["A", "x"]]);
    expect(props.footer).toBe("Generado con ERP Lazzar");
    const summary = compactListPdfProps({ columns: COLUMNS, title: "S", summary: () => "1 surtido" }, rows, NOW);
    expect(summary.meta[1]).toEqual({ value: "1 surtido" });
  });

  test("standard: marca, Exportado, Registros y pie con el conteo", () => {
    const props = standardListPdfProps({ title: "T", columns: [], rows: [[], []], now: NOW });
    expect(props.brand).toBe("ERP LAZZAR");
    expect(props.meta.map((m) => m.label)).toEqual(["Exportado:", "Registros:"]);
    expect(props.meta[1].value).toBe("2");
    expect(props.footer).toBe("2 registros — Generado con ERP Lazzar");
  });
});
