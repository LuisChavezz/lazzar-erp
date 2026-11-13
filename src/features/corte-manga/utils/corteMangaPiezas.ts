/**
 * Piezas de una orden de corte de manga, como las muestran la página de
 * detalle y el PDF de la orden (una sola regla para ambos). Sin React.
 */
import type { CorteMangaOrder, CorteMangaOrderLine } from "../interfaces/corte-manga-order.interface";

/**
 * "Total piezas": `cantidad_cubierta` del backend y, solo si la respuesta no la
 * trae, la suma de los renglones (descartando cantidades no finitas, el mismo
 * criterio que el listado).
 */
export const corteMangaTotalPiezas = (
  order: Pick<CorteMangaOrder, "cantidad_cubierta"> & { detalles: Pick<CorteMangaOrderLine, "cantidad">[] },
): number =>
  order.cantidad_cubierta ??
  order.detalles.reduce((acc, linea) => (Number.isFinite(linea.cantidad) ? acc + linea.cantidad : acc), 0);
