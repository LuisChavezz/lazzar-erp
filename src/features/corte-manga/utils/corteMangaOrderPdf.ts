/**
 * Identidad del PDF de la orden de corte de manga (EC-857). Módulo puro, sin
 * React ni `@react-pdf/renderer`, para probarlo en `tests/unit/`.
 */
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { isWorkOrderTerminal } from "@/src/utils/workOrderStatusEdit";
import type { CorteMangaOrder, CorteMangaOrderLine } from "../interfaces/corte-manga-order.interface";

/**
 * Identidad de una OCM para su PDF. La CANCELADA (7) se sigue pudiendo
 * consultar y lleva la marca de la base, sin motivo (la OCM no lo guarda). Una
 * OCM dada de baja responde 404 y no llega aquí.
 */
export const corteMangaOrderPdfDescriptor = (
  order: Pick<CorteMangaOrder, "id" | "folio_ocm" | "estatus_corte">,
): DocumentPdfDescriptor => ({
  type: "OCM",
  id: order.id,
  folio: order.folio_ocm,
  cancelled: isWorkOrderTerminal(order.estatus_corte),
});

/**
 * "Total piezas" como lo muestra la página: `cantidad_cubierta` del backend y,
 * solo si la respuesta no la trae, la suma de los renglones (descartando
 * cantidades no finitas, el mismo criterio que la página y el listado).
 */
export const corteMangaTotalPiezas = (
  order: Pick<CorteMangaOrder, "cantidad_cubierta"> & { detalles: Pick<CorteMangaOrderLine, "cantidad">[] },
): number =>
  order.cantidad_cubierta ??
  order.detalles.reduce((acc, linea) => (Number.isFinite(linea.cantidad) ? acc + linea.cantidad : acc), 0);
