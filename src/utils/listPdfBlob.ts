/**
 * PDF de un listado exportado (EC-959): `ListPdfDocument` por `renderPdfBlob`,
 * con el documento y `@react-pdf/renderer` en carga diferida (EC-695). De ahí
 * salen la fuente Arimo con su respaldo de símbolos (EC-958), el reintento de
 * la fuente tras un fallo (EC-942) y la limpieza de emoji de las props.
 *
 * Los errores (fuente, chunk, render) se propagan con el mensaje legible de
 * `renderPdfBlob`; quien exporta los deja llegar a `useServerExport`, que los
 * muestra en su toast.
 */
// Solo el tipo: no mete el documento ni react-pdf en el chunk de quien exporta.
import type { ListPdfDocumentProps, ListPdfMetaItem } from "@/src/pdfs/ListPdfDocument";
import { stripPdfEmoji } from "@/src/pdfs/shared/stripPdfEmoji";
import type { ListExportColumn } from "./listExport";
import { renderPdfBlob } from "./renderPdfBlob";

/**
 * Quita los emoji de cada texto que imprime el listado, celda por celda.
 * `stripPdfEmojiDeep` (dentro de `renderPdfBlob`) deja intacto un string que
 * es solo una URL, porque en los documentos puede ser el `src` de una imagen;
 * en un listado nunca lo es, y una celda "https://tienda.mx/🛒" perdería el
 * emoji sin aviso (caería a Helvetica).
 */
export const stripListPdfEmoji = (props: ListPdfDocumentProps): ListPdfDocumentProps => ({
  ...props,
  rows: props.rows.map((cells) => cells.map(stripPdfEmoji)),
  meta: props.meta.map((item) => ({ ...item, value: stripPdfEmoji(item.value) })),
  totalRow: props.totalRow && { ...props.totalRow, cells: props.totalRow.cells.map(stripPdfEmoji) },
});

export const generateListPdfBlob = (props: ListPdfDocumentProps): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/ListPdfDocument").then((m) => m.ListPdfDocument),
    stripListPdfEmoji(props),
  );

/**
 * Ancho de cada columna como porcentaje de su peso relativo, con `digits`
 * decimales ("12.5%").
 */
export const listPdfWidths = (weights: readonly number[], digits: number): string[] => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => `${((weight / total) * 100).toFixed(digits)}%`);
};

/** Fecha del encabezado: "25 de noviembre de 2026". */
export const listPdfExportDate = (now: Date): string =>
  now.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

const registros = (count: number) => `${count} registro${count === 1 ? "" : "s"}`;

/**
 * Props de la variante `standard` (los `use*PdfExport` de Ventas y Compras):
 * marca "ERP LAZZAR", "Exportado" y "Registros" en el encabezado (más
 * `extraMeta`) y "N registros — Generado con ERP Lazzar" en el pie.
 */
export const standardListPdfProps = ({
  extraMeta = [],
  now,
  ...props
}: Pick<ListPdfDocumentProps, "title" | "columns" | "rows" | "totalRow"> & {
  now: Date;
  extraMeta?: ListPdfMetaItem[];
}): ListPdfDocumentProps => ({
  ...props,
  variant: "standard",
  brand: "ERP LAZZAR",
  meta: [
    { label: "Exportado:", value: listPdfExportDate(now) },
    { label: "Registros:", value: String(props.rows.length) },
    ...extraMeta,
  ],
  footer: `${registros(props.rows.length)} — Generado con ERP Lazzar`,
});

/**
 * Props de la variante `compact` (los listados de WMS, `useListExport`): marca
 * "ERP LAZZAR · WMS", "Exportado" y el conteo (`summary`, por defecto "N
 * registros") en el encabezado y "Generado con ERP Lazzar" en el pie. Las
 * celdas son el `text` de cada columna, el mismo del Excel.
 */
export const compactListPdfProps = <T>(
  {
    columns,
    title,
    summary,
  }: { columns: readonly ListExportColumn<T>[]; title: string; summary?: (rows: T[]) => string },
  rows: T[],
  now: Date,
): ListPdfDocumentProps => {
  const widths = listPdfWidths(
    columns.map((c) => c.weight),
    2,
  );
  return {
    variant: "compact",
    brand: "ERP LAZZAR · WMS",
    title,
    meta: [
      { label: "Exportado:", value: listPdfExportDate(now) },
      { value: summary ? summary(rows) : registros(rows.length) },
    ],
    columns: columns.map((c, i) => ({ header: c.header, width: widths[i] })),
    rows: rows.map((row) => columns.map((c) => c.text(row))),
    footer: "Generado con ERP Lazzar",
  };
};
