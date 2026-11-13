/**
 * Piezas de una orden de corte de manga, como las muestran la página de
 * detalle y el PDF de la orden (una sola regla para ambos). Sin React.
 */
import type { CorteMangaOrder, CorteMangaOrderLine } from "../interfaces/corte-manga-order.interface";

/**
 * "Total piezas": `cantidad_cubierta` del backend y, solo si la respuesta no la
 * trae, la suma de los renglones (descartando cantidades no finitas, el mismo
 * criterio que el listado).
 *
 * Tipos (nucleo-erp `main`): `cantidad_cubierta` es un ENTERO
 * (`OrdenCorteMangaService.cobertura_por_orden`: `floor(Σ cantidad + EPS)`,
 * topado por lo contratado) y `detalles[].cantidad` es un `FloatField` (número
 * en el JSON, p. ej. `2.0`), así que la suma de respaldo puede traer decimales.
 */
export const corteMangaTotalPiezas = (
  order: Pick<CorteMangaOrder, "cantidad_cubierta"> & { detalles: Pick<CorteMangaOrderLine, "cantidad">[] },
): number =>
  order.cantidad_cubierta ??
  order.detalles.reduce((acc, linea) => (Number.isFinite(linea.cantidad) ? acc + linea.cantidad : acc), 0);

/**
 * Piezas ENTERAS de la orden, para el avance (`WorkOrderAvancesSection`): el
 * mismo total con el piso aplicado. Con `cantidad_cubierta` (ya entero) no
 * cambia nada; solo redondea hacia abajo la suma de respaldo.
 */
export const corteMangaPiezasOrden = (order: Parameters<typeof corteMangaTotalPiezas>[0]): number =>
  Math.floor(corteMangaTotalPiezas(order));
