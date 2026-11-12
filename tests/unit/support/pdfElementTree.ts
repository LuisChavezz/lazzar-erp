import { PdfInfoCard, PdfLineItemsTable, type PdfColumn, type PdfInfoItem } from "@/src/pdfs/shared/DocumentPdfLayout";
import { visiblePdfColumns } from "@/src/pdfs/shared/documentPdfModel";

/** Elemento del árbol de un documento PDF, sin renderizar. */
export type TreeElement = { type: unknown; props: Record<string, unknown> };

/**
 * Todos los elementos del árbol (sin renderizar), recorriendo `props.children`.
 * Se reconocen por forma (`type` + `props`) y no con `isValidElement`: el
 * runner transforma el JSX del documento con otro runtime cuyo `$$typeof` no
 * coincide con el de `react`.
 */
export function elementsOf(node: unknown): TreeElement[] {
  if (Array.isArray(node)) return node.flatMap(elementsOf);
  if (node === null || typeof node !== "object" || !("type" in node) || !("props" in node)) return [];
  const element = node as TreeElement;
  return [element, ...elementsOf(element.props.children)];
}

/** Columnas visibles (como las pinta `PdfLineItemsTable`) y filas de la tabla con ese título. */
export function pdfTable<Row>(elements: TreeElement[], title: string) {
  const table = elements.find(
    (element) => element.type === PdfLineItemsTable && element.props.title === title,
  );
  if (!table) throw new Error(`No hay tabla "${title}" en el documento`);
  const { columns, rows } = table.props as { columns: PdfColumn<Row>[]; rows: Row[] };
  return { columns: visiblePdfColumns(columns, rows), rows };
}

/** Renglones de la tarjeta de datos con ese título. */
export function pdfCardItems(elements: TreeElement[], title: string): PdfInfoItem[] {
  const card = elements.find((element) => element.type === PdfInfoCard && element.props.title === title);
  if (!card) throw new Error(`No hay tarjeta "${title}" en el documento`);
  return card.props.items as PdfInfoItem[];
}
